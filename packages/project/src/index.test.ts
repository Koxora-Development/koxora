import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  createProject,
  DEFAULT_LIMITS,
  exportProject,
  importProject,
  importLegacyJson,
  migrate,
  parseProject,
  serializeProject,
  sha256,
  synchronizeIndexes,
  validateProject,
  type Project,
} from './index';
import { canonical } from './validation';
import { readZip, writeZip } from './zip';
import { richFixture } from './fixture';
const encoder = new TextEncoder();
const golden = new Uint8Array(
  readFileSync('packages/project/fixtures/complete-v1.koxora'),
);
async function modifiedManifest(
  change: (manifest: Project['manifest']) => void,
) {
  const files = await readZip(golden, DEFAULT_LIMITS);
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
  change(manifest);
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest));
  return writeZip(files, DEFAULT_LIMITS);
}
it('matches a deterministic golden archive and preserves every collection and binary byte', async () => {
  expect(await exportProject(await richFixture())).toEqual(golden);
  const project = await importProject(golden);
  expect(project.documents).toHaveLength(5);
  expect(project.documents[0].pages).toHaveLength(2);
  expect(project.datasets[0].rows[0][project.datasets[0].fields[0].id]).toBe(
    '世界',
  );
  expect(project.assets).toHaveLength(1);
  expect(project.templates).toHaveLength(1);
  expect(
    project.documents.slice(1).map((doc) => doc.domainModels[0].namespace),
  ).toEqual([
    'org.koxora.mindmap',
    'org.koxora.flowchart',
    'org.koxora.uml',
    'org.koxora.er',
  ]);
  expect(project.files['extensions/org.example.plugin/state.bin']).toEqual(
    Uint8Array.from([0, 255, 1, 42]),
  );
  expect(await exportProject(project)).toEqual(golden);
  expect(await parseProject(await serializeProject(project))).toEqual(project);
});
it('preserves future compatible versions, optional keys, index metadata and opaque resources', async () => {
  const bytes = await modifiedManifest((m) => {
    m.formatVersion = '1.3.4';
    m.schemaVersion = '1.4.5';
    m.resources['extensions/org.example.plugin/state.bin'].extensions[
      'org.example.extra'
    ] = { deep: true };
  });
  const project = await importProject(bytes);
  project.indexes.documents.items[0].extensions['org.example.index'] = [
    1,
    'kept',
  ];
  const next = await importProject(await exportProject(project));
  expect(next.indexes).toEqual(project.indexes);
  expect(next.manifest.formatVersion).toBe('1.3.4');
  expect(next.manifest.schemaVersion).toBe('1.4.5');
  expect(next.manifest.extensions).toEqual(project.manifest.extensions);
  expect(
    next.manifest.resources['extensions/org.example.plugin/state.bin'],
  ).toEqual(
    project.manifest.resources['extensions/org.example.plugin/state.bin'],
  );
  expect(next.files).toEqual(project.files);
});
it.each([
  'formatVersion',
  'schemaVersion',
  'minReaderVersion',
  'minSchemaReaderVersion',
] as const)('rejects unsupported %s before replacing content', async (key) => {
  await expect(
    importProject(
      await modifiedManifest((m) => {
        m[key] = '2.0.0';
      }),
    ),
  ).rejects.toMatchObject({ code: 'unsupported' });
});
it('rejects required unknown features and archive resources while retaining optional resources', async () => {
  await expect(
    importProject(
      await modifiedManifest((m) => {
        m.requiredFeatures.push('org.example.engine');
      }),
    ),
  ).rejects.toMatchObject({ code: 'unsupported' });
  await expect(
    importProject(
      await modifiedManifest((m) => {
        m.resources['extensions/org.example.plugin/state.bin'].required = true;
      }),
    ),
  ).rejects.toMatchObject({ code: 'unsupported' });
});
it('accepts and reexports a known required preview without weakening its requirement', async () => {
  const project = await importProject(golden);
  const path = project.previews[0].path;
  project.manifest.resources[path].required = true;
  expect(
    (await importProject(await exportProject(project))).manifest.resources[path]
      .required,
  ).toBe(true);
  project.manifest.resources[path].required = false;
  expect(
    (await importProject(await exportProject(project))).manifest.resources[path]
      .required,
  ).toBe(false);
});
it('checks SHA-256 independently of ZIP CRC and rejects missing resources', async () => {
  const files = await readZip(golden, DEFAULT_LIMITS);
  const path = Object.keys(files).find(
    (key) => key.startsWith('assets/') && !key.endsWith('.json'),
  )!;
  files[path][0] ^= 1;
  await expect(
    importProject(writeZip(files, DEFAULT_LIMITS)),
  ).rejects.toMatchObject({ code: 'integrity', path });
  delete files[path];
  await expect(
    importProject(writeZip(files, DEFAULT_LIMITS)),
  ).rejects.toMatchObject({ code: 'integrity' });
});
it.each([
  [
    'cross-page endpoint',
    (p: Project) => {
      p.documents[1].pages[0].connections[0].targetId =
        p.documents[2].pages[0].nodes[0].id;
    },
  ],
  [
    'missing dataset field',
    (p: Project) => {
      p.documents[1].pages[0].nodes[0].dataBindings[0].fieldId =
        p.manifest.projectId;
    },
  ],
  [
    'duplicate identity',
    (p: Project) => {
      p.documents[1].pages[0].nodes[1].id = p.documents[1].pages[0].nodes[0].id;
    },
  ],
  [
    'layer cycle',
    (p: Project) => {
      const layer = p.documents[0].pages[0].layers[0];
      layer.parentId = layer.id;
    },
  ],
  [
    'typed dataset row',
    (p: Project) => {
      p.datasets[0].rows[0][p.datasets[0].fields[0].id] = 10;
    },
  ],
  [
    'script URL',
    (p: Project) => {
      p.documents[1].actions[0].operation = 'url';
      p.documents[1].actions[0].parameters = { url: 'javascript:alert(1)' };
    },
  ],
  [
    'unordered keyframes',
    (p: Project) => {
      p.documents[1].animations[0].keyframes.reverse();
    },
  ],
  [
    'invalid domain root',
    (p: Project) => {
      p.documents[1].domainModels[0].data.roots = [p.manifest.projectId];
    },
  ],
  [
    'missing ER field',
    (p: Project) => {
      p.documents[4].domainModels[0].data.relations = [
        {
          connectionId: p.documents[4].pages[0].connections[0].id,
          sourceFieldId: p.manifest.projectId,
          targetFieldId: p.manifest.projectId,
        },
      ];
    },
  ],
] as const)('validates %s with a useful path', async (_name, change) => {
  const p = await richFixture();
  change(p);
  expect(() => validateProject(p)).toThrow();
  await expect(exportProject(p)).rejects.toMatchObject({
    code: 'invalid',
    path: expect.any(String),
  });
});
it('rejects unknown required domain models', async () => {
  const p = await richFixture();
  p.documents[1].domainModels[1].required = true;
  await expect(exportProject(p)).rejects.toMatchObject({ code: 'unsupported' });
});
it('preflights duplicated index references before parsing their payload', async () => {
  const files = await readZip(golden, DEFAULT_LIMITS);
  const index = JSON.parse(
    new TextDecoder().decode(files['documents/index.json']),
  );
  index.items.push(index.items[0]);
  files['documents/index.json'] = encoder.encode(JSON.stringify(index));
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
  manifest.resources['documents/index.json'].size =
    files['documents/index.json'].length;
  manifest.resources['documents/index.json'].sha256 = await sha256(
    files['documents/index.json'],
  );
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest));
  await expect(
    importProject(writeZip(files, DEFAULT_LIMITS)),
  ).rejects.toMatchObject({ reason: 'duplicateIndexId' });
});
it('validates long hierarchies in linear work and still rejects cycles', () => {
  const p = createProject(
    'Chain',
    () => crypto.randomUUID(),
    '2026-10-21T00:00:00.000Z',
  );
  const layers = p.documents[0].pages[0].layers;
  for (let i = 1; i < 10000; i++)
    layers.push({
      id: crypto.randomUUID(),
      title: 'Layer',
      visible: true,
      locked: false,
      extensions: {},
      parentId: layers[i - 1].id,
    });
  expect(() => validateProject(p)).not.toThrow();
  layers[0].parentId = layers.at(-1)!.id;
  expect(() => validateProject(p)).toThrow();
});
it('applies configurable byte, entry, depth and value budgets to imports and exports', async () => {
  for (const limits of [
    { archiveBytes: 100 },
    { expandedBytes: 100 },
    { entryBytes: 100 },
    { jsonBytes: 100 },
    { entries: 2 },
    { depth: 2 },
    { values: 10 },
  ]) {
    await expect(importProject(golden, limits)).rejects.toMatchObject({
      code: 'tooLarge',
    });
    await expect(
      exportProject(await richFixture(), limits),
    ).rejects.toMatchObject({ code: 'tooLarge' });
  }
});
it('explicitly migrates the unreleased JSON draft, preserving IDs and unknown source data', async () => {
  const source = readFileSync(
    'packages/project/fixtures/legacy-json-v1.json',
    'utf8',
  );
  const old = JSON.parse(source),
    migrated = await importLegacyJson(source);
  expect(await exportProject(migrated)).toEqual(
    new Uint8Array(
      readFileSync('packages/project/fixtures/migrated-json-v1.koxora'),
    ),
  );
  expect(migrated.manifest.projectId).toBe(old.projectId);
  expect(migrated.documents[0].pages[0].id).toBe(old.pages[0].id);
  expect(migrated.manifest.extensions['org.koxora.legacy-source']).toEqual(old);
  expect(await exportProject(await importLegacyJson(source))).toEqual(
    await exportProject(migrated),
  );
  expect(await parseProject(source)).toEqual(migrated);
  await expect(importProject(encoder.encode(source))).rejects.toMatchObject({
    code: 'invalid',
  });
});
it('migration copies input and fails on missing or cyclic routes', async () => {
  const input = { keep: 1 };
  expect(
    await migrate(input, 'a', 'c', [
      {
        from: 'a',
        to: 'b',
        migrate: async (v) => ({ ...(v as object), added: 2 }),
      },
      { from: 'b', to: 'c', migrate: async (v) => v },
    ]),
  ).toEqual({ keep: 1, added: 2 });
  expect(input).toEqual({ keep: 1 });
  await expect(migrate(input, 'a', 'c', [])).rejects.toMatchObject({
    code: 'unsupported',
  });
  await expect(
    migrate(input, 'a', 'c', [
      { from: 'a', to: 'b', migrate: async (v) => v },
      { from: 'b', to: 'a', migrate: async (v) => v },
    ]),
  ).rejects.toMatchObject({ reason: 'cycle' });
});
it('canonicalizes JSON keys while preserving array order', () => {
  expect(canonical({ b: [2, 1], a: 1 })).toBe(
    '{\n  "a": 1,\n  "b": [\n    2,\n    1\n  ]\n}\n',
  );
});
it('synchronizes indexes after a deliberate collection change', async () => {
  const p = await richFixture();
  p.documents.pop();
  const next = synchronizeIndexes(p);
  expect(next.indexes.documents.items).toHaveLength(4);
});
it('preserves immutable asset extension edits and allows shared content-addressed bytes', async () => {
  const p = await importProject(golden);
  p.assets[0] = {
    ...p.assets[0],
    extensions: { 'org.example.changed': { retained: true } },
  };
  p.assets.push({ ...p.assets[0], id: crypto.randomUUID() });
  const next = await importProject(await exportProject(synchronizeIndexes(p)));
  expect(next.assets[0].extensions).toEqual(p.assets[0].extensions);
  expect(next.assets[1].path).toBe(next.assets[0].path);
});
it('preserves optional future schemas in known domain namespaces', async () => {
  const p = await richFixture();
  const model = p.documents[1].domainModels[0];
  model.schemaVersion = '2.0.0';
  model.required = false;
  model.data = { future: 'opaque' };
  const next = await importProject(await exportProject(p));
  expect(next.documents[1].domainModels[0]).toEqual(model);
});
it('rejects duplicate mindmap roots instead of losing a forest root', async () => {
  const p = await richFixture(),
    page = p.documents[1].pages[0];
  const [a, b] = page.nodes.map((node) => node.id);
  p.documents[1].domainModels[0].data = {
    roots: [a, a],
    parents: { [a]: null, [b]: null },
  };
  expect(() => validateProject(p)).toThrow();
});
