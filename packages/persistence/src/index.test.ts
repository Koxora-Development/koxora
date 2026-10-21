import { expect, it } from 'vitest';
import { createProject, ProjectError } from '@koxora/project';
import {
  IndexedDbStore,
  NativeStore,
  ProjectRepository,
  type SnapshotStore,
} from './index';
class MemoryStore implements SnapshotStore {
  data = new Map<string, string>();
  fail = false;
  async keys() {
    return [...this.data.keys()];
  }
  async read(id: string) {
    return this.data.get(id) ?? null;
  }
  async write(id: string, expected: string | null, value: string) {
    if (this.fail) throw new ProjectError('storage');
    if ((this.data.get(id) ?? null) !== expected)
      throw new ProjectError('conflict');
    this.data.set(id, value);
  }
}
function setup() {
  const store = new MemoryStore();
  return {
    store,
    repo: new ProjectRepository(store),
    project: createProject(
      'First',
      () => crypto.randomUUID(),
      '2026-10-20T00:00:00.000Z',
    ),
  };
}
it('creates, lists, reopens and retains one previous version without degrading it on redundant save', async () => {
  const { repo, project } = setup();
  const first = await repo.save(project, null);
  project.title = 'Second';
  const second = await repo.save(project, first);
  expect(await repo.save(project, second)).toBe(second);
  expect((await repo.open(project.projectId)).project.title).toBe('Second');
  expect((await repo.open(project.projectId, true)).project.title).toBe(
    'First',
  );
  expect(await repo.list()).toEqual([
    { id: project.projectId, title: 'Second' },
  ]);
});
it('failed and conflicting writes retain the committed version', async () => {
  const { repo, store, project } = setup();
  const token = await repo.save(project, null);
  project.title = 'Other tab';
  await repo.save(project, token);
  await expect(
    repo.save({ ...project, title: 'Stale tab' }, token),
  ).rejects.toThrow(new ProjectError('conflict'));
  store.fail = true;
  await expect(repo.save(project, null)).rejects.toThrow(
    new ProjectError('storage'),
  );
  expect((await repo.open(project.projectId)).project.title).toBe('Other tab');
});
it('recovers a corrupt current document explicitly and preserves the corrupt source', async () => {
  const { repo, store, project } = setup();
  const first = await repo.save(project, null);
  project.title = 'Second';
  const second = await repo.save(project, first);
  const data = JSON.parse(second);
  data.current = '{';
  store.data.set(project.projectId, JSON.stringify(data));
  await expect(repo.open(project.projectId)).rejects.toThrow(ProjectError);
  expect(await repo.list()).toEqual([{ id: project.projectId, title: null }]);
  const recovered = await repo.open(project.projectId, true);
  await repo.save(recovered.project, recovered.token);
  expect((await repo.open(project.projectId)).project.title).toBe('First');
  expect(JSON.parse(store.data.get(project.projectId)!).previous).toBe('{');
});
it('does not fall back silently on unsupported data, malformed envelopes or missing backup', async () => {
  const { repo, store, project } = setup();
  await repo.save(project, null);
  await expect(repo.open(project.projectId, true)).rejects.toThrow(
    new ProjectError('missing'),
  );
  store.data.set(project.projectId, 'null');
  await expect(repo.open(project.projectId)).rejects.toThrow(
    new ProjectError('invalid'),
  );
  await expect(repo.open('missing')).rejects.toThrow(
    new ProjectError('missing'),
  );
});
it('translates unavailable browser storage and native failures to stable error codes', async () => {
  const browser = new IndexedDbStore(() => {
    throw new Error('disabled');
  });
  await expect(browser.keys()).rejects.toThrow(new ProjectError('storage'));
  const native = new NativeStore(async () => {
    throw 'conflict';
  });
  await expect(native.write('id', null, '')).rejects.toThrow(
    new ProjectError('conflict'),
  );
  const failed = new NativeStore(async () => {
    throw new Error('disk full');
  });
  await expect(failed.read('id')).rejects.toThrow(new ProjectError('storage'));
});
it('preserves unsupported current data when explicitly recovering an older save', async () => {
  const { repo, store, project } = setup();
  const first = await repo.save(project, null);
  const future = JSON.parse(first);
  const document = JSON.parse(future.current);
  document.schemaVersion = '2.0.0';
  document.future = 'must survive';
  future.previous = future.current;
  future.current = JSON.stringify(document);
  store.data.set(project.projectId, JSON.stringify(future));
  const recovered = await repo.open(project.projectId, true);
  const next = await repo.save(recovered.project, recovered.token);
  expect(JSON.parse(next).previous).toBe(future.current);
});
it('uses an explicit native generation backup when the envelope is corrupt, preserving original bytes', async () => {
  const { repo, store, project } = setup();
  const good = await repo.save(project, null);
  const withBackup: SnapshotStore = {
    keys: () => store.keys(),
    read: (id) => store.read(id),
    write: (id, expected, next) => store.write(id, expected, next),
    readPrevious: async () => good,
  };
  store.data.set(project.projectId, '{broken');
  const nativeRepo = new ProjectRepository(withBackup);
  const recovered = await nativeRepo.open(project.projectId, true);
  const next = await nativeRepo.save(recovered.project, recovered.token);
  expect(JSON.parse(next).recoverySource).toBe('{broken');
  expect((await nativeRepo.open(project.projectId)).project).toEqual(project);
});
it('isolates unreadable records while still listing healthy projects', async () => {
  const { repo, store, project } = setup();
  await repo.save(project, null);
  const mixed: SnapshotStore = {
    keys: async () => [project.projectId, 'unreadable'],
    read: async (id) => {
      if (id === 'unreadable') throw new ProjectError('storage');
      return store.read(id);
    },
    write: (...args) => store.write(...args),
  };
  expect(await new ProjectRepository(mixed).list()).toEqual([
    { id: project.projectId, title: 'First' },
    { id: 'unreadable', title: null },
  ]);
});
