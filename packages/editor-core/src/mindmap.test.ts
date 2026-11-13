import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
  type Project,
} from '@koxora/project';
import {
  applyEdit,
  applyWorkbook,
  copyElements,
  geometryBounds,
  MINDMAP_NAMESPACE,
  mindMapGeometries,
  readMindMap,
  StudioHistory,
  type EditCommand,
} from './index';

const now = '2026-11-13T12:00:00.000Z';
const id = () => crypto.randomUUID();
function setup() {
  let project = createProject('Topics', id, now);
  project.documents[0].type = 'mindmap';
  const documentId = project.documents[0].id,
    pageId = project.documents[0].pages[0].id,
    layerId = project.documents[0].pages[0].layers[0].id;
  const run = (command: EditCommand) =>
    (project = applyEdit(project, documentId, pageId, command, now));
  const add = (text: string, parentId: string | null = null) => {
    const nodeId = id();
    run({
      type: 'mindmapAdd',
      id: nodeId,
      connectionId: id(),
      parentId,
      text,
      layerId,
    });
    return nodeId;
  };
  return {
    get project() {
      return project;
    },
    get page() {
      return project.documents[0].pages[0];
    },
    run,
    add,
    documentId,
    pageId,
    layerId,
  };
}

describe('structured mind maps', () => {
  it('creates a portable forest with node and branch references and preserves manual positions on insertion', async () => {
    const f = setup();
    const root = f.add('Central topic 世界');
    const before = structuredClone(f.page.nodes[0].geometry);
    const child = f.add('Ideas', root);
    const childBefore = structuredClone(f.page.nodes[1].geometry);
    f.add('Risks', root);
    f.add('Second map');
    expect(f.page.nodes[0].geometry).toEqual(before);
    expect(f.page.nodes[1].geometry).toEqual(childBefore);
    expect(readMindMap(f.project.documents[0], f.pageId)).toEqual({
      roots: [root, f.page.nodes[3].id],
      parents: {
        [root]: null,
        [child]: root,
        [f.page.nodes[2].id]: root,
        [f.page.nodes[3].id]: null,
      },
    });
    expect(f.page.connections).toHaveLength(2);
    const model = f.project.documents[0].domainModels[0];
    expect(new Set(model.references)).toEqual(
      new Set([
        ...f.page.nodes.map((n) => n.id),
        ...f.page.connections.map((e) => e.id),
      ]),
    );
    const reopened = await importProject(await exportProject(f.project));
    expect(reopened.documents).toEqual(f.project.documents);
    validateProject(reopened);
  });

  it('lays out mixed-size rotated branches without overlaps and leaves unrelated annotations intact', () => {
    const f = setup();
    const root = f.add('Central');
    const children = Array.from({ length: 5 }, (_, i) =>
      f.add(`Branch ${i}`, root),
    );
    children.forEach((child, i) => {
      for (let j = 0; j < i; j++) f.add(`Leaf ${i}.${j}`, child);
    });
    f.add('Other root');
    f.page.nodes.forEach((n, i) => {
      n.geometry.width = 130 + i * 13;
      n.geometry.height = 45 + (i % 3) * 55;
      n.geometry.rotation = i % 2 ? 35 : 0;
    });
    const annotation = id();
    f.run({
      type: 'insert',
      id: annotation,
      kind: 'text',
      layerId: f.layerId,
      position: { x: 500, y: 500 },
      text: 'Keep manual position',
    });
    const fixed = structuredClone(f.page.nodes.at(-1)!);
    const before = structuredClone(f.project);
    f.run({ type: 'mindmapLayout' });
    const topics = f.page.nodes.filter((n) => n.id !== annotation);
    const boxes = topics.map((n) => geometryBounds(n.geometry));
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        expect(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
        ).toBe(true);
      }
    expect(f.page.nodes.at(-1)).toEqual(fixed);
    expect(
      topics.map((n) => [
        n.geometry.width,
        n.geometry.height,
        n.geometry.rotation,
      ]),
    ).toEqual(
      before.documents[0].pages[0].nodes
        .slice(0, -1)
        .map((n) => [n.geometry.width, n.geometry.height, n.geometry.rotation]),
    );
    const firstLayout = f.page.nodes.map((n) => n.geometry);
    f.run({ type: 'mindmapLayout' });
    expect(f.page.nodes.map((n) => n.geometry)).toEqual(firstLayout);
  });

  it('keeps sibling layout order stable after canonical archive export/import', async () => {
    const f = setup();
    const root = f.add('Root');
    for (let n = 8; n >= 1; n--)
      f.run({
        type: 'mindmapAdd',
        id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
        connectionId: id(),
        parentId: root,
        layerId: f.layerId,
        text: `Topic ${n}`,
      });
    f.run({ type: 'mindmapLayout' });
    const reopened = await importProject(await exportProject(f.project));
    const laidOut = applyEdit(
      reopened,
      f.documentId,
      f.pageId,
      {
        type: 'mindmapLayout',
      },
      now,
    );
    expect(laidOut.documents).toEqual(f.project.documents);
  });

  it('records adding, layout and subtree deletion as atomic undo/redo entries', () => {
    const f = setup();
    const root = f.add('Root');
    const child = f.add('Child', root);
    f.add('Descendant', child);
    f.add('Sibling', root);
    const h = new StudioHistory();
    let project = f.project;
    const step = (command: EditCommand) =>
      (project = h.execute(project, f.documentId, f.pageId, command, now));
    const original = structuredClone(project.documents);
    step({
      type: 'mindmapAdd',
      id: id(),
      connectionId: id(),
      parentId: root,
      layerId: f.layerId,
      text: 'New sibling',
    });
    expect(h.status().undo).toBe(1);
    project = h.travel(project, f.documentId, f.pageId, 'undo', now);
    expect(project.documents).toEqual(original);
    project = h.travel(project, f.documentId, f.pageId, 'redo', now);
    const added = structuredClone(project.documents);
    step({ type: 'mindmapLayout' });
    const laidOut = structuredClone(project.documents);
    step({ type: 'mindmapDeleteBranch', id: child });
    expect(project.documents[0].pages[0].nodes).toHaveLength(3);
    expect(
      readMindMap(project.documents[0], f.pageId)?.parents[child],
    ).toBeUndefined();
    validateProject(project);
    project = h.travel(project, f.documentId, f.pageId, 'undo', now);
    expect(project.documents).toEqual(laidOut);
    project = h.travel(project, f.documentId, f.pageId, 'undo', now);
    expect(project.documents).toEqual(added);
  });

  it('can delete the final root and start again', () => {
    const f = setup();
    const root = f.add('Root');
    f.add('Child', root);
    f.run({ type: 'mindmapDeleteBranch', id: root });
    expect(f.page.nodes).toHaveLength(0);
    expect(f.page.connections).toHaveLength(0);
    expect(readMindMap(f.project.documents[0], f.pageId)).toEqual({
      roots: [],
      parents: {},
    });
    expect(f.add('New root')).toBe(f.page.nodes[0].id);
    validateProject(f.project);
  });

  it('rejects hidden/locked descendants, branches and foreign references atomically', () => {
    for (const protection of [
      'hidden',
      'locked',
      'edge',
      'model',
      'animation',
      'relationship',
    ] as const) {
      const f = setup();
      const root = f.add('Root');
      const child = f.add('Child', root);
      const extraLayer = id();
      f.page.layers.push({
        id: extraLayer,
        title: 'Protected',
        visible: protection !== 'hidden',
        locked: protection === 'locked' || protection === 'edge',
        extensions: {},
      });
      if (protection === 'hidden' || protection === 'locked')
        f.page.nodes[1].layerId = extraLayer;
      if (protection === 'edge') f.page.connections[0].layerId = extraLayer;
      if (protection === 'model')
        f.project.documents[0].domainModels.push({
          namespace: 'org.example.future',
          schemaVersion: '9.0.0',
          required: false,
          references: [child],
          data: { opaque: child },
          extensions: {},
        });
      if (protection === 'animation')
        f.project.documents[0].animations.push({
          id: id(),
          targetId: child,
          duration: 1,
          easing: 'linear',
          keyframes: [],
          extensions: {},
        });
      if (protection === 'relationship')
        f.page.relationships.push({
          id: id(),
          sourceId: root,
          targetId: child,
          kind: 'opaque',
          metadata: {},
          extensions: {},
        });
      const before = structuredClone(f.project);
      expect(() => f.run({ type: 'mindmapDeleteBranch', id: root })).toThrow();
      expect(f.project).toEqual(before);
      if (['hidden', 'locked', 'edge'].includes(protection)) {
        expect(() => f.run({ type: 'mindmapLayout' })).toThrow();
        expect(f.project).toEqual(before);
      }
    }
  });

  it('protects ordinary delete/copy and workbook operations from flattening semantic topics', () => {
    const f = setup();
    const root = f.add('Root');
    f.add('Child', root);
    const before = structuredClone(f.project);
    expect(() => f.run({ type: 'delete', ids: [root] })).toThrow('unsupported');
    expect(() =>
      f.run({ type: 'delete', ids: [f.page.connections[0].id] }),
    ).toThrow('unsupported');
    expect(() => copyElements(f.page, [root], f.project)).toThrow(
      'unsupported',
    );
    expect(() =>
      f.run({
        type: 'paste',
        nodes: [f.page.nodes[0]],
        connections: [],
        idMap: { [root]: id() },
        offset: { x: 20, y: 20 },
        layerId: f.layerId,
      }),
    ).toThrow('unsupported');
    expect(() =>
      applyWorkbook(
        f.project,
        { type: 'duplicatePage', pageId: f.pageId, title: 'Copy' },
        id,
        now,
      ),
    ).toThrow('references');
    expect(f.project).toEqual(before);
  });

  it('protects imported semantic pages even when the optional reference list is empty', async () => {
    const f = setup();
    const root = f.add('Root');
    f.add('Child', root);
    f.project.documents[0].domainModels[0].references = [];
    let project = await importProject(await exportProject(f.project));
    project = applyWorkbook(
      project,
      {
        type: 'newPage',
        documentId: f.documentId,
        title: 'Other page',
      },
      id,
      now,
    );
    project = applyWorkbook(
      project,
      { type: 'newDocument', title: 'Other document' },
      id,
      now,
    );
    const before = structuredClone(project);
    expect(readMindMap(project.documents[0], f.pageId)?.roots).toEqual([root]);
    for (const command of [
      { type: 'duplicatePage' as const, pageId: f.pageId, title: 'Copy' },
      { type: 'deletePage' as const, pageId: f.pageId },
      {
        type: 'movePage' as const,
        pageId: f.pageId,
        documentId: project.documents[1].id,
        index: 1,
      },
    ]) {
      expect(() => applyWorkbook(project, command, id, now)).toThrow(
        'references',
      );
      expect(project).toEqual(before);
    }
    expect(() =>
      copyElements(project.documents[0].pages[0], [root], project),
    ).toThrow('unsupported');
    const reordered = applyWorkbook(
      project,
      {
        type: 'movePage',
        pageId: f.pageId,
        documentId: f.documentId,
        index: 1,
      },
      id,
      now,
    );
    expect(readMindMap(reordered.documents[0], f.pageId)?.roots).toEqual([
      root,
    ]);
    expect(reordered.documents[0].domainModels).toEqual(
      project.documents[0].domainModels,
    );
    validateProject(reordered);
  });

  it('keeps malformed, cyclic, ambiguous, future and cross-page models inert', () => {
    const f = setup();
    const root = f.add('Root');
    const child = f.add('Child', root);
    const cases: Project[] = [];
    const variant = (mutate: (project: Project) => void) => {
      const project = structuredClone(f.project);
      mutate(project);
      cases.push(project);
    };
    variant((p) => {
      p.documents[0].domainModels[0].schemaVersion = '2.0.0';
    });
    variant((p) => {
      p.documents[0].domainModels.push(
        structuredClone(p.documents[0].domainModels[0]),
      );
    });
    variant((p) => {
      p.documents[0].domainModels[0].data.parents = {
        [root]: child,
        [child]: root,
      };
    });
    variant((p) => {
      p.documents[0].domainModels[0].data.roots = [child];
    });
    variant((p) => {
      p.documents[0].domainModels[0].data.parents = {
        [root]: null,
        [child]: id(),
      };
    });
    variant((p) => {
      const second = structuredClone(p.documents[0].pages[0]);
      second.id = id();
      second.nodes = [second.nodes.pop()!];
      second.connections = [];
      p.documents[0].pages[0].nodes.pop();
      p.documents[0].pages[0].connections = [];
      p.documents[0].pages.push(second);
    });
    for (const project of cases) {
      const before = structuredClone(project);
      expect(readMindMap(project.documents[0], f.pageId)).toBeNull();
      expect(() =>
        applyEdit(
          project,
          f.documentId,
          f.pageId,
          { type: 'mindmapLayout' },
          now,
        ),
      ).toThrow('unsupported');
      expect(project).toEqual(before);
    }
  });

  it('rejects invalid endpoint, duplicate identities, excessive text and creation in another diagram type', () => {
    const f = setup();
    const root = f.add('Root');
    const before = structuredClone(f.project);
    const base = {
      type: 'mindmapAdd' as const,
      id: id(),
      connectionId: id(),
      layerId: f.layerId,
      parentId: root,
      text: 'Child',
    };
    for (const command of [
      { ...base, parentId: id() },
      { ...base, id: root },
      { ...base, text: 'x'.repeat(4097) },
      { ...base, layerId: id() },
    ])
      expect(() => f.run(command)).toThrow();
    expect(f.project).toEqual(before);
    const plain = createProject('Flowchart', id, now),
      d = plain.documents[0],
      p = d.pages[0];
    expect(() =>
      applyEdit(
        plain,
        d.id,
        p.id,
        { ...base, parentId: null, layerId: p.layers[0].id },
        now,
      ),
    ).toThrow('unsupported');
  });

  it('preserves opaque optional data and connection waypoints during layout', () => {
    const f = setup();
    const root = f.add('Root');
    f.add('Child', root);
    const model = f.project.documents[0].domainModels[0];
    model.data['org.example.keep'] = { value: 42 };
    model.extensions['org.example.keep'] = ['future'];
    f.page.nodes[1].extensions['org.example.keep'] = { value: 'untouched' };
    f.page.connections[0].waypoints = [{ x: 777, y: 888 }];
    f.run({ type: 'mindmapLayout' });
    expect(f.project.documents[0].domainModels[0]).toEqual(model);
    expect(f.page.nodes[1].extensions['org.example.keep']).toEqual({
      value: 'untouched',
    });
    expect(f.page.connections[0].waypoints).toEqual([{ x: 777, y: 888 }]);
    expect(f.project.documents[0].domainModels[0].namespace).toBe(
      MINDMAP_NAMESPACE,
    );
  });

  it('handles deep forests iteratively', () => {
    const f = setup();
    f.add('Root');
    const template = f.page.nodes[0],
      parents: Record<string, string | null> = {};
    f.page.nodes = Array.from({ length: 5000 }, (_, i) => ({
      ...structuredClone(template),
      id: id(),
      geometry: { ...template.geometry, x: i, y: i },
    }));
    f.page.nodes.forEach((n, i) => {
      parents[n.id] = i ? f.page.nodes[i - 1].id : null;
    });
    const roots = [f.page.nodes[0].id];
    f.project.documents[0].domainModels[0].data = { roots, parents };
    f.project.documents[0].domainModels[0].references = f.page.nodes.map(
      (n) => n.id,
    );
    validateProject(f.project);
    const map = readMindMap(f.project.documents[0], f.pageId)!;
    expect(map).not.toBeNull();
    const geometries = mindMapGeometries(f.page.nodes, map);
    expect(Object.keys(geometries)).toHaveLength(5000);
    expect(geometries[f.page.nodes.at(-1)!.id].x).toBeGreaterThan(1_000_000);
    f.run({ type: 'mindmapLayout' });
    validateProject(f.project);
  });
});
