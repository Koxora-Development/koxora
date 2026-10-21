/** Synthetic, deterministic interoperability fixture. No real user data. */
import { createProject, sha256, synchronizeIndexes } from './index';
import type { Document, Node, Json } from './types';
export async function richFixture() {
  let sequence = 0;
  const id = () =>
    `00000000-0000-4000-8000-${(++sequence).toString().padStart(12, '0')}`;
  const project = createProject(
    'Überblick 世界 مرحبا',
    id,
    '2026-10-21T00:00:00.000Z',
  );
  project.manifest.locale = 'de';
  project.manifest.extensions['org.example.plugin'] = {
    version: 3,
    opaque: ['世界', null, true],
  };
  project.manifest.futureOptional = { preserve: true };
  const bytes = Uint8Array.from(
    atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5ZkAAAAASUVORK5CYII=',
    ),
    (char) => char.charCodeAt(0),
  );
  const hash = await sha256(bytes);
  const asset = {
    id: id(),
    path: `assets/${hash}`,
    sha256: hash,
    size: bytes.length,
    mediaType: 'image/png',
    extensions: {},
  };
  project.assets.push(asset);
  project.files[asset.path] = bytes;
  const field = {
    id: id(),
    name: 'Label',
    type: 'string' as const,
    nullable: false,
    extensions: {},
  };
  const dataset = {
    id: id(),
    schemaVersion: '1.0.0',
    title: 'Synthetic data',
    fields: [field],
    rows: [{ [field.id]: '世界' }],
    source: { kind: 'embedded' },
    extensions: {},
  };
  project.datasets.push(dataset);
  const style = { id: id(), properties: { fill: '#112233' }, extensions: {} };
  project.themes.push({
    id: id(),
    schemaVersion: '1.0.0',
    title: 'Fixture theme',
    tokens: { accent: '#112233' },
    styles: [style],
    extensions: {},
  });
  for (const kind of ['mindmap', 'flowchart', 'uml', 'er']) {
    const doc: Document = structuredClone(project.documents[0]);
    doc.id = id();
    doc.type = kind;
    doc.title = kind;
    doc.locale = 'ar';
    const page = doc.pages[0];
    page.id = id();
    page.layers[0].id = id();
    page.layout = { algorithm: 'manual', direction: 'rtl' };
    page.presentation = { background: '#ffffff' };
    const node = (): Node => ({
      id: id(),
      kind: 'rectangle',
      layerId: page.layers[0].id,
      geometry: { x: 10, y: 20, width: 100, height: 60, rotation: 0 },
      content: { text: 'مرحبا 世界' },
      metadata: { 'org.example.role': 'entity' },
      styleId: style.id,
      assetIds: [asset.id],
      dataBindings: [{ datasetId: dataset.id, fieldId: field.id }],
      extensions: { 'org.example.node': { unknown: 42 } },
    });
    page.nodes = [node(), node()];
    const [a, b] = page.nodes.map((item) => item.id);
    page.connections = [
      {
        id: id(),
        sourceId: a,
        targetId: b,
        layerId: page.layers[0].id,
        relationType: 'directed',
        waypoints: [{ x: 40, y: 50 }],
        extensions: {},
      },
    ];
    page.relationships = [
      {
        id: id(),
        sourceId: a,
        targetId: b,
        kind: 'depends-on',
        metadata: {},
        extensions: {},
      },
    ];
    const data: { [key: string]: Json } =
      kind === 'mindmap'
        ? { roots: [a], parents: { [a]: null, [b]: a } }
        : kind === 'flowchart'
          ? { starts: [a], ends: [b] }
          : kind === 'uml'
            ? {
                classifiers: [
                  {
                    nodeId: a,
                    kind: 'class',
                    attributes: ['name: String'],
                    operations: ['save()'],
                  },
                ],
              }
            : (() => {
                const sourceFieldId = id(),
                  targetFieldId = id();
                return {
                  entities: [
                    {
                      nodeId: a,
                      fields: [
                        {
                          id: sourceFieldId,
                          name: 'id',
                          dataType: 'integer',
                          primaryKey: true,
                          nullable: false,
                        },
                      ],
                    },
                    {
                      nodeId: b,
                      fields: [
                        {
                          id: targetFieldId,
                          name: 'parent',
                          dataType: 'integer',
                          primaryKey: false,
                          nullable: false,
                        },
                      ],
                    },
                  ],
                  relations: [
                    {
                      connectionId: page.connections[0].id,
                      sourceFieldId,
                      targetFieldId,
                    },
                  ],
                };
              })();
    doc.domainModels = [
      {
        namespace: `org.koxora.${kind}`,
        schemaVersion: '1.0.0',
        required: true,
        references: [a, b],
        data,
        extensions: {},
      },
      {
        namespace: 'org.example.future',
        schemaVersion: '9.0.0',
        required: false,
        references: [a],
        data: { uninterpreted: ['x'] },
        extensions: {},
      },
    ];
    doc.actions = [
      {
        id: id(),
        targetId: a,
        trigger: 'click',
        operation: 'navigate',
        parameters: { pageId: page.id },
        extensions: {},
      },
    ];
    doc.animations = [
      {
        id: id(),
        targetId: a,
        duration: 1000,
        easing: 'linear',
        keyframes: [
          { time: 0, properties: { opacity: 0 } },
          { time: 1000, properties: { opacity: 1 } },
        ],
        extensions: {},
      },
    ];
    project.documents.push(doc);
  }
  const extra = structuredClone(project.documents[0].pages[0]);
  extra.id = id();
  extra.layers[0].id = id();
  project.documents[0].pages.push(extra);
  const template = structuredClone(project.documents[0]);
  template.id = id();
  template.pages = [structuredClone(extra)];
  template.pages[0].id = id();
  template.pages[0].layers[0].id = id();
  project.templates.push({
    id: id(),
    schemaVersion: '1.0.0',
    title: 'Empty template',
    document: template,
    extensions: {},
  });
  const previewId = id();
  project.previews.push({
    ...asset,
    id: previewId,
    path: `previews/${previewId}`,
    documentId: project.documents[0].id,
  });
  project.files[`previews/${previewId}`] = bytes.slice();
  project.files['extensions/org.example.plugin/state.bin'] = Uint8Array.from([
    0, 255, 1, 42,
  ]);
  return synchronizeIndexes(project);
}
