import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createProject,
  migrateProject,
  parseProject,
  ProjectError,
  serializeProject,
  validateProject,
  MAX_BYTES,
  type Project,
} from './legacy';
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function sample() {
  let n = 0;
  return createProject(
    'Überblick 世界 مرحبا',
    () => id(++n),
    '2026-10-20T00:00:00.000Z',
  );
}
function rejects(value: unknown, code = 'invalid') {
  expect(() => validateProject(value)).toThrow(
    new ProjectError(code as ProjectError['code']),
  );
}
describe('project format', () => {
  it('matches the v1 golden file and round trips deterministically', () => {
    const golden = readFileSync(
      new URL('../fixtures/legacy-json-v1.json', import.meta.url),
      'utf8',
    );
    expect(serializeProject(sample())).toBe(golden);
    expect(serializeProject(parseProject(golden))).toBe(golden);
  });
  it('retains optional future fields at every level, graph data and mindmap pages', () => {
    const project = sample();
    project.schemaVersion = '1.2.0';
    project.extensions = {
      'example.custom': {
        text: '<script>alert(1)</script>',
        array: [true, null, '世界'],
      },
    };
    project.future = { value: 4 };
    const page = project.pages[0];
    page.type = 'mindmap';
    page.future = [1, 2];
    page.nodes = [
      { id: id(3), kind: 'topic', x: 1, y: 2, extensions: { custom: false } },
      {
        id: id(4),
        kind: 'future-shape',
        x: -2,
        y: 0,
        extensions: {},
        content: 'مرحبا',
      },
    ];
    page.connections = [
      {
        id: id(5),
        sourceId: id(3),
        targetId: id(4),
        extensions: { custom: 'retained' },
      },
    ];
    expect(parseProject(serializeProject(project))).toEqual(project);
  });
  it.each(['2.0.0', '0.1.0'])('rejects unsupported schema %s', (version) => {
    const p = sample();
    p.schemaVersion = version;
    rejects(p, 'unsupported');
  });
  it('rejects newer minimum readers and required features', () => {
    const p = sample();
    p.minReaderVersion = '1.1.0';
    rejects(p, 'unsupported');
    p.minReaderVersion = '1.0.0';
    p.requiredFeatures.push('unknown');
    rejects(p, 'unsupported');
  });
  it('rejects invalid IDs, duplicate IDs and dangling references', () => {
    const p = sample();
    p.pages[0].id = p.projectId;
    rejects(p);
    p.pages[0].id = 'not-an-id';
    rejects(p);
    p.pages[0].id = id(2);
    p.pages[0].connections = [
      { id: id(3), sourceId: id(4), targetId: id(4), extensions: {} },
    ];
    rejects(p);
  });
  it('rejects corrupt, duplicate-key, oversized, executable and non-JSON inputs', () => {
    for (const text of [
      '',
      '{',
      'PK\x03\x04',
      '{"format":"wrong","format":"koxora-project"}',
      '{"__proto__":{}}',
    ])
      expect(() => parseProject(text)).toThrow(ProjectError);
    expect(() => parseProject(' '.repeat(MAX_BYTES + 1))).toThrow(
      new ProjectError('tooLarge'),
    );
    const p = sample();
    p.extra = Infinity;
    rejects(p);
    p.extra = (() => 1) as unknown as string;
    rejects(p);
    p.extra = new Date() as unknown as string;
    rejects(p);
    p.extra = p;
    rejects(p, 'tooLarge');
  });
  it.each(['', '2026-02-30T00:00:00.000Z', 'yesterday'])(
    'rejects invalid timestamps %s',
    (date) => {
      const p = sample();
      p.createdAt = date;
      rejects(p);
    },
  );
  it('validates empty names, version syntax, geometry, and depth', () => {
    const p = sample();
    p.title = '  ';
    rejects(p);
    p.title = 'Valid';
    p.schemaVersion = '01.0.0';
    rejects(p);
    p.schemaVersion = '1.0.0';
    p.pages[0].nodes = [
      { id: id(3), kind: 'box', x: NaN, y: 0, extensions: {} },
    ];
    rejects(p);
  });
  it('migrates a copy through explicit steps and validates the result', () => {
    const old = {
      ...sample(),
      schemaVersion: '0.9.0',
      minReaderVersion: '0.9.0',
    };
    const migration = {
      from: '0.9.0',
      to: '1.0.0',
      migrate: (input: unknown) => ({
        ...(input as Project),
        schemaVersion: '1.0.0',
        minReaderVersion: '1.0.0',
      }),
    };
    expect(migrateProject(old, [migration])).toEqual(sample());
    expect(old.schemaVersion).toBe('0.9.0');
    expect(() => migrateProject(old)).toThrow(new ProjectError('unsupported'));
    expect(() =>
      migrateProject(old, [{ ...migration, migrate: () => ({}) }]),
    ).toThrow(ProjectError);
    expect(() => migrateProject(old, [{ ...migration, to: '0.8.0' }])).toThrow(
      ProjectError,
    );
  });
  it('round trips a deterministic set of generated graphs', () => {
    for (let count = 0; count < 40; count++) {
      const p = sample();
      p.pages[0].nodes = Array.from({ length: count }, (_, i) => ({
        id: id(i + 3),
        kind: 'box',
        x: i ? i * -3.14 : 0,
        y: i,
        extensions: { seed: count },
      }));
      expect(parseProject(serializeProject(p))).toEqual(p);
    }
  });
});
it('rejects unsafe integers in unknown extensions instead of rounding them silently', () => {
  const raw = serializeProject(sample()).replace(
    '"extensions": {}',
    '"extensions": {"externalId": 9007199254740993}',
  );
  expect(() => parseProject(raw)).toThrow(new ProjectError('invalid'));
});
