import { describe, expect, it } from 'vitest';
import {
  exportProject,
  importProject,
  validateProject,
  type Project,
} from '@koxora/project';
import { richFixture } from '../../project/src/fixture';
import {
  copyTemplateProject,
  createFromTemplate,
  templateCatalog,
} from './templates';
import { applyEdit, copyElements } from './editing';
import { elementLink, LINK_KEY } from './links';
import { applyWorkbook } from './workbook';
import { StudioHistory } from './studio-history';

const now = '2026-11-13T12:00:00.000Z';
const id = () => crypto.randomUUID();
const text = (key: string) => `Example ${key.split('.').at(-1)}`;
function make(templateId: string) {
  return createFromTemplate(templateId, 'My diagram', text, id, now);
}
function identities(project: Project) {
  return [
    project.manifest.projectId,
    ...project.documents.flatMap((document) => [
      document.id,
      ...document.pages.flatMap((page) => [
        page.id,
        ...page.layers.map((layer) => layer.id),
        ...page.nodes.map((node) => node.id),
        ...page.connections.map((connection) => connection.id),
      ]),
    ]),
  ];
}

describe('simple local drawing templates', () => {
  it.each(templateCatalog)(
    'creates a portable, independently editable $id drawing',
    async (source) => {
      const project = make(source.id),
        document = project.documents[0],
        page = document.pages[0];
      validateProject(project);
      expect(document.domainModels).toEqual([]);
      expect(project.templates).toEqual([]);
      expect(project.files).toEqual({});
      expect(page.nodes).toHaveLength(source.nodes.length);
      expect(page.connections).toHaveLength(source.connections.length);
      expect(
        page.nodes.every(
          (node) =>
            typeof node.content.text === 'string' &&
            node.content.text.startsWith('Example '),
        ),
      ).toBe(true);
      const nodeIds = new Set(page.nodes.map((node) => node.id));
      for (const connection of page.connections) {
        expect(nodeIds.has(connection.sourceId!)).toBe(true);
        expect(nodeIds.has(connection.targetId!)).toBe(true);
      }
      const reader = await importProject(await exportProject(project));
      expect(reader.documents).toEqual(project.documents);
      expect(reader.manifest.title).toBe('My diagram');
      expect(reader.assets).toEqual([]);
      expect(page.viewport.zoom).toBeGreaterThan(0);
      expect(page.viewport.zoom).toBeLessThanOrEqual(1);
    },
  );

  it('assigns fresh project/document/page/layer/node/connection identities on every use', () => {
    const used = new Set<string>();
    for (const source of templateCatalog)
      for (let n = 0; n < 2; n++) {
        const projectIds = identities(make(source.id));
        expect(new Set(projectIds).size).toBe(projectIds.length);
        for (const identity of projectIds) {
          expect(used.has(identity)).toBe(false);
          expect(source.nodes.some((node) => node.id === identity)).toBe(false);
          used.add(identity);
        }
      }
  });

  it.each(templateCatalog)(
    'starts $id with non-overlapping drawing elements',
    (source) => {
      for (let i = 0; i < source.nodes.length; i++)
        for (let j = i + 1; j < source.nodes.length; j++) {
          const a = source.nodes[i],
            b = source.nodes[j];
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          ).toBe(true);
        }
    },
  );

  it('keeps template drawings unrestricted by special topic commands', () => {
    const project = make('mindmap-radial'),
      document = project.documents[0],
      page = document.pages[0];
    const selection = page.nodes.map((node) => node.id);
    const copied = copyElements(page, selection, project);
    const idMap = Object.fromEntries(
      [...copied.nodes, ...copied.connections].map((item) => [item.id, id()]),
    );
    const duplicated = applyEdit(
      project,
      document.id,
      page.id,
      {
        type: 'duplicate',
        ids: selection,
        idMap,
        offset: { x: 1000, y: 0 },
      },
      now,
    );
    expect(duplicated.documents[0].pages[0].nodes).toHaveLength(
      page.nodes.length * 2,
    );
    expect(duplicated.documents[0].pages[0].connections).toHaveLength(
      page.connections.length * 2,
    );
    const h = new StudioHistory();
    const reduced = h.execute(
      project,
      document.id,
      page.id,
      { type: 'delete', ids: [page.nodes[0].id] },
      now,
    );
    expect(reduced.documents[0].pages[0].nodes).toHaveLength(
      page.nodes.length - 1,
    );
    expect(reduced.documents[0].pages[0].connections).toHaveLength(0);
    const restored = h.travel(reduced, document.id, page.id, 'undo', now);
    expect(restored.documents).toEqual(project.documents);
    const extraPage = applyWorkbook(
      project,
      { type: 'duplicatePage', pageId: page.id, title: 'Copy' },
      id,
      now,
    );
    expect(extraPage.documents[0].pages).toHaveLength(2);
    validateProject(extraPage);
  });

  it('localizes only newly created content and leaves bundled/previous drawings unchanged', () => {
    const before = JSON.stringify(templateCatalog);
    const english = createFromTemplate(
      'mindmap-study',
      'Study',
      (key) => `English ${key}`,
      id,
      now,
    );
    const snapshot = structuredClone(english);
    const german = createFromTemplate(
      'mindmap-study',
      'Lernen',
      (key) => `Deutsch ${key}`,
      id,
      now,
    );
    expect(english).toEqual(snapshot);
    expect(english.documents[0].pages[0].nodes[0].content.text).toMatch(
      /^English /,
    );
    expect(german.documents[0].pages[0].nodes[0].content.text).toMatch(
      /^Deutsch /,
    );
    german.documents[0].pages[0].nodes[0].geometry.x += 500;
    const again = make('mindmap-study');
    expect(again.documents[0].pages[0].nodes[0].geometry.x).toBe(
      templateCatalog.find((item) => item.id === 'mindmap-study')!.nodes[0].x,
    );
    expect(JSON.stringify(templateCatalog)).toBe(before);
  });

  it('refuses unknown templates before allocating identities and validates generated content', () => {
    let allocated = 0;
    expect(() =>
      createFromTemplate(
        'unknown',
        'Test',
        text,
        () => {
          allocated++;
          return id();
        },
        now,
      ),
    ).toThrow('Unknown built-in template');
    expect(allocated).toBe(0);
    expect(() =>
      createFromTemplate(
        'mindmap-study',
        'Test',
        () => 'x'.repeat(4097),
        id,
        now,
      ),
    ).toThrow('Invalid template text');
    expect(() =>
      createFromTemplate(
        'mindmap-study',
        'Test',
        text,
        () => 'not-a-uuid',
        now,
      ),
    ).toThrow();
    expect(() =>
      createFromTemplate(
        'mindmap-study',
        'Test',
        text,
        () => '12345678-1234-4234-8234-123456789abc',
        now,
      ),
    ).toThrow();
  });
});

describe('local project template snapshots', () => {
  const copiedAt = '2026-11-23T12:00:00.000Z';

  it('copies the whole workbook and its opaque and binary data independently', async () => {
    const source = await importProject(
      await exportProject(await richFixture()),
    );
    const snapshot = copyTemplateProject(source, id, now);
    const first = copyTemplateProject(snapshot, id, copiedAt);
    const second = copyTemplateProject(snapshot, id, copiedAt);

    expect(
      new Set(
        [source, snapshot, first, second].map((p) => p.manifest.projectId),
      ).size,
    ).toBe(4);
    expect(first).toEqual({
      ...source,
      manifest: {
        ...source.manifest,
        projectId: first.manifest.projectId,
        createdAt: copiedAt,
        updatedAt: copiedAt,
      },
    });
    expect(await importProject(await exportProject(first))).toEqual(first);

    const asset = source.assets[0].path;
    first.documents[0].pages[0].title = 'First copy only';
    first.files[asset][0] = 0;
    for (const unchanged of [snapshot, second]) {
      expect(unchanged.documents).toEqual(source.documents);
      expect(unchanged.files).toEqual(source.files);
    }
  });

  it('rebases known self-project links and preserves foreign and opaque links', async () => {
    const source = await richFixture();
    const page = source.documents[1].pages[0];
    const destination = source.documents[2].pages[0];
    const [ambiguous, linkedNode] = page.nodes;
    const target = {
      type: 'project',
      projectId: source.manifest.projectId,
      pageId: destination.id,
      elementId: destination.nodes[0].id,
    } as const;
    linkedNode.extensions[LINK_KEY] = { version: 2, ...target };
    ambiguous.extensions[LINK_KEY] = { version: 2, ...target };
    page.connections[0].extensions[LINK_KEY] = {
      version: 2,
      type: 'project',
      projectId: source.manifest.projectId,
    };
    destination.nodes[1].extensions[LINK_KEY] = {
      version: 2,
      ...target,
      projectId: id(),
    };
    destination.connections[0].extensions[LINK_KEY] = {
      version: 2,
      ...target,
      future: true,
    };
    const embedded = source.templates[0].document.pages[0];
    embedded.nodes = [
      { ...linkedNode, id: id(), layerId: embedded.layers[0].id },
    ];
    const before = structuredClone(source);

    const snapshot = copyTemplateProject(source, id, now);
    const copy = copyTemplateProject(snapshot, id, copiedAt);
    const projectId = copy.manifest.projectId;
    expect(elementLink(copy, linkedNode.id)).toEqual({
      state: 'ready',
      target: { ...target, projectId },
    });
    expect(elementLink(copy, page.connections[0].id)).toEqual({
      state: 'ready',
      target: { type: 'project', projectId },
    });
    expect(
      copy.templates[0].document.pages[0].nodes[0].extensions[LINK_KEY],
    ).toEqual({ version: 2, ...target, projectId });
    expect(copy.documents[1].pages[0].nodes[0]).toEqual(ambiguous);
    expect(elementLink(copy, ambiguous.id)).toEqual({ state: 'unsupported' });
    expect(copy.documents[2].pages[0]).toEqual(destination);
    expect(source).toEqual(before);
  });

  it('rejects a generated ID already used by the source', () => {
    const source = make('mindmap-study');
    expect(() =>
      copyTemplateProject(source, () => source.manifest.projectId, copiedAt),
    ).toThrow('duplicateId');
    expect(() =>
      copyTemplateProject(source, () => source.documents[0].id, copiedAt),
    ).toThrow('duplicateId');
  });
});
