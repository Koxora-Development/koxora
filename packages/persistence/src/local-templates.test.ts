import { expect, it } from 'vitest';
import {
  createProject,
  parseProject,
  ProjectError,
  serializeProject,
} from '@koxora/project';
import { richFixture } from '../../project/src/fixture';
import { LocalTemplateRepository } from './index';

class MemoryTemplateStore {
  records = new Map<string, string>();

  async keys() {
    return [...this.records.keys()];
  }

  async read(id: string) {
    return this.records.get(id) ?? null;
  }

  async write(id: string, expected: string | null, value: string) {
    if ((this.records.get(id) ?? null) !== expected)
      throw new ProjectError('conflict');
    this.records.set(id, value);
  }

  async remove(id: string, expected: string) {
    if (this.records.get(id) !== expected) throw new ProjectError('conflict');
    this.records.delete(id);
  }
}

it('preserves an independent reusable snapshot with all document and asset data', async () => {
  const store = new MemoryTemplateStore();
  const project = await richFixture();
  const expected = await parseProject(await serializeProject(project));
  const id = project.manifest.projectId;
  const summary = await new LocalTemplateRepository(store).save(project);

  project.documents[1].pages[0].nodes[0].content.text = 'Changed source';
  const repository = new LocalTemplateRepository(store);
  expect(await repository.list()).toEqual([
    {
      id,
      title: expected.manifest.title,
      updatedAt: expected.manifest.updatedAt,
      documents: 5,
      pages: 6,
    },
  ]);
  expect(summary).toEqual((await repository.list())[0]);
  const opened = await repository.open(id);
  expect(opened).toEqual(expected);
  opened.documents[1].pages[0].nodes[0].content.text = 'Changed instance';
  expect(await repository.open(id)).toEqual(expected);
});

it('validates new templates, uses insert-only writes and removes only the requested record', async () => {
  const store = new MemoryTemplateStore();
  const repository = new LocalTemplateRepository(store);
  const first = createProject(
    'First',
    () => crypto.randomUUID(),
    '2026-11-22T08:00:00.000Z',
  );
  const second = createProject(
    'Second',
    () => crypto.randomUUID(),
    '2026-11-23T08:00:00.000Z',
  );
  const firstSummary = await repository.save(first);
  const secondSummary = await repository.save(second);

  first.manifest.title = 'Conflicting title';
  await expect(repository.save(first)).rejects.toMatchObject({
    code: 'conflict',
  });
  await expect(
    repository.save({ ...first, documents: [] }),
  ).rejects.toMatchObject({ code: 'invalid' });
  expect(await repository.list()).toEqual([secondSummary, firstSummary]);

  await repository.remove(firstSummary.id);
  await repository.remove(firstSummary.id);
  await expect(repository.open(firstSummary.id)).rejects.toMatchObject({
    code: 'missing',
  });
  expect(await repository.list()).toEqual([secondSummary]);
});

it('isolates damaged records and protects a concurrently replaced record from deletion', async () => {
  const store = new MemoryTemplateStore();
  const repository = new LocalTemplateRepository(store);
  const project = createProject(
    'Valid',
    () => crypto.randomUUID(),
    '2026-11-23T08:00:00.000Z',
  );
  const summary = await repository.save(project);
  const damaged = crypto.randomUUID();
  store.records.set(damaged, '{broken');
  const badDate = crypto.randomUUID();
  store.records.set(
    badDate,
    JSON.stringify({
      summary: { ...summary, id: badDate, updatedAt: 'invalid' },
      snapshot: await serializeProject(project),
    }),
  );
  expect(await repository.list()).toEqual([summary]);
  await expect(repository.open(damaged)).rejects.toMatchObject({
    code: 'invalid',
  });

  const remove = store.remove.bind(store);
  store.remove = async (id, expected) => {
    store.records.set(id, 'replacement');
    return remove(id, expected);
  };
  await expect(repository.remove(summary.id)).rejects.toMatchObject({
    code: 'conflict',
  });
  expect(await store.read(summary.id)).toBe('replacement');
});
