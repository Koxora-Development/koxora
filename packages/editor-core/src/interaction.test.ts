import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
  type Project,
} from '@koxora/project';
import { richFixture } from '../../project/src/fixture';
import {
  CommandHistory,
  applyEdit,
  DEFAULT_APPEARANCE,
  DEFAULT_CONNECTION,
  ELEMENT_KEY,
  LINE_KEY,
  buildScene,
  pickNode,
  marqueeSelection,
  toggleSelection,
  movedGeometries,
  resizeGeometry,
  handlePoint,
  lineGeometry,
  lineEndpoints,
  alignedGeometries,
  transformScene,
  copyElements,
  renameProject,
  writeCanvas,
  readCanvas,
  type EditCommand,
} from './index';
const now = '2026-10-23T12:00:00.000Z';
function session(
  initial = createProject('Editing', () => crypto.randomUUID(), now),
  history = new CommandHistory(),
) {
  let project = initial;
  const documentId = project.documents[0].id,
    pageId = project.documents[0].pages[0].id;
  const run = (command: EditCommand) =>
    (project = history.execute(project, documentId, pageId, command, now));
  return {
    get project() {
      return project;
    },
    get page() {
      return project.documents[0].pages[0];
    },
    history,
    documentId,
    pageId,
    run,
    travel(direction: 'undo' | 'redo') {
      project = history.travel(project, documentId, pageId, direction, now);
      return project;
    },
    insert(kind: 'rectangle' | 'arrow' | 'text' = 'rectangle', x = 0) {
      const id = crypto.randomUUID();
      run({
        type: 'insert',
        id,
        kind,
        layerId: project.documents[0].pages[0].layers[0].id,
        position: { x, y: 0 },
      });
      return id;
    },
    status() {
      return history.status(project, documentId, pageId);
    },
  };
}
describe('selection and transforms', () => {
  it('toggles selection, excludes hidden, locked and future elements, and uses actual rotated contours', () => {
    const s = session();
    const a = s.insert(),
      b = s.insert('rectangle', 300),
      c = s.insert('rectangle', 600);
    s.page.nodes[1].extensions[ELEMENT_KEY] = { version: 2 };
    s.page.layers.push({
      id: crypto.randomUUID(),
      title: 'Locked',
      locked: true,
      visible: true,
      extensions: {},
    });
    s.page.nodes[2].layerId = s.page.layers[1].id;
    const scene = buildScene(s.page);
    expect(
      marqueeSelection(scene, { x: -500, y: -500, width: 1500, height: 1000 }),
    ).toEqual([a]);
    expect(pickNode(scene, { x: 300, y: 0 })).toBeUndefined();
    expect(pickNode(scene, { x: 600, y: 0 })).toBeUndefined();
    expect(toggleSelection([a, b], b, true)).toEqual([a]);
    expect(toggleSelection([a], c, true)).toEqual([a, c]);
    expect(toggleSelection([a], b, false)).toEqual([b]);
    s.page.layers[0].visible = false;
    expect(buildScene(s.page).nodes.map((n) => n.id)).toEqual([c]);
  });
  it('snaps one shared movement delta and preserves relative offsets without mutating source', () => {
    const s = session();
    s.insert();
    s.insert('rectangle', 257);
    const before = structuredClone(s.page.nodes);
    const result = movedGeometries(s.page.nodes, { x: 35, y: 27 }, 24, true);
    expect(Math.abs(result[before[0].id].x % 24)).toBe(0);
    expect(result[before[1].id].x - result[before[0].id].x).toBe(
      before[1].geometry.x - before[0].geometry.x,
    );
    expect(s.page.nodes).toEqual(before);
    const bypass = movedGeometries(s.page.nodes, { x: 35, y: 27 }, 24, false);
    expect(bypass[before[0].id].x - before[0].geometry.x).toBe(35);
  });
  it.each([0, 30, 90, 177])(
    'keeps the opposite corner fixed at rotation %s with aspect ratio and minimum dimensions',
    (rotation) => {
      const g = { x: 10, y: 20, width: 160, height: 80, rotation };
      const fixed = handlePoint(g, 'nw');
      const target = handlePoint({ ...g, width: 320, height: 160 }, 'se');
      const resized = resizeGeometry(g, 'se', target, true);
      expect(handlePoint(resized, 'nw').x).toBeCloseTo(fixed.x);
      expect(handlePoint(resized, 'nw').y).toBeCloseTo(fixed.y);
      expect(resized.width / resized.height).toBeCloseTo(2);
      const minimum = resizeGeometry(g, 'se', fixed);
      expect(minimum.width).toBeGreaterThanOrEqual(8);
      expect(minimum.height).toBeGreaterThanOrEqual(8);
    },
  );
  it('keeps independent line endpoints and fixed minimum endpoints stable', () => {
    const a = { x: -20, y: 30 },
      b = { x: 200, y: -75 };
    const [first, last] = lineEndpoints(lineGeometry(a, b));
    expect(first.x).toBeCloseTo(a.x);
    expect(first.y).toBeCloseTo(a.y);
    expect(last.x).toBeCloseTo(b.x);
    expect(last.y).toBeCloseTo(b.y);
    expect(
      lineEndpoints(lineGeometry({ x: 0, y: 0 }, { x: 2, y: 0 }))[0].x,
    ).toBeCloseTo(0);
    expect(
      lineEndpoints(lineGeometry({ x: 0, y: 0 }, { x: 2, y: 0 }, 'end'))[1].x,
    ).toBeCloseTo(2);
  });
  it('aligns and distributes while preserving geometry and reuses unchanged preview entries', () => {
    const s = session();
    const ids = [
      s.insert(),
      s.insert('rectangle', 210),
      s.insert('rectangle', 700),
    ];
    const scene = buildScene(s.page);
    const aligned = alignedGeometries(scene, ids, 'left');
    expect(new Set(Object.values(aligned).map((g) => g.x)).size).toBe(1);
    const distributed = alignedGeometries(scene, ids, 'horizontal');
    expect(distributed[ids[1]].x - distributed[ids[0]].x).toBeCloseTo(
      distributed[ids[2]].x - distributed[ids[1]].x,
    );
    const moved = { [ids[0]]: { ...s.page.nodes[0].geometry, x: 800 } };
    const preview = transformScene(scene, s.page, moved);
    expect(preview.nodes[1]).toBe(scene.nodes[1]);
    expect(preview.nodes[0]).not.toBe(scene.nodes[0]);
    expect(s.page.nodes[0].geometry.x).not.toBe(800);
  });
});
describe('reversible document commands', () => {
  it('undoes/redoes insertion, text/style, movement, resizing, line editing, connectors and deletion atomically', () => {
    const s = session();
    const snapshots: Project[] = [s.project];
    const a = s.insert();
    snapshots.push(s.project);
    const b = s.insert('text', 300);
    snapshots.push(s.project);
    s.run({
      type: 'updateNode',
      id: a,
      text: 'Grüße 世界',
      style: { ...DEFAULT_APPEARANCE, fill: '#123456' },
    });
    snapshots.push(s.project);
    s.run({
      type: 'transform',
      geometries: movedGeometries(s.page.nodes, { x: 72, y: 48 }, 24, true),
    });
    snapshots.push(s.project);
    s.run({
      type: 'transform',
      geometries: {
        [a]: { ...s.page.nodes[0].geometry, width: 250, height: 180 },
      },
    });
    snapshots.push(s.project);
    const line = s.insert('arrow', 450);
    snapshots.push(s.project);
    s.run({
      type: 'updateNode',
      id: line,
      text: 'Free',
      style: DEFAULT_APPEARANCE,
      startArrow: true,
      endArrow: true,
      geometry: lineGeometry({ x: 400, y: 120 }, { x: 600, y: 180 }),
    });
    snapshots.push(s.project);
    const edge = crypto.randomUUID();
    s.run({
      type: 'connect',
      id: edge,
      sourceId: a,
      targetId: b,
      layerId: s.page.layers[0].id,
      options: DEFAULT_CONNECTION,
    });
    snapshots.push(s.project);
    s.run({
      type: 'updateConnection',
      id: edge,
      options: { ...DEFAULT_CONNECTION, label: 'Attached', routing: 'curved' },
      style: DEFAULT_APPEARANCE,
    });
    snapshots.push(s.project);
    s.run({ type: 'delete', ids: [a] });
    snapshots.push(s.project);
    expect(s.page.connections).toHaveLength(0);
    expect(s.status().undo).toBe(snapshots.length - 1);
    for (let i = snapshots.length - 2; i >= 0; i--) {
      expect(s.travel('undo').documents).toEqual(snapshots[i].documents);
      validateProject(s.project);
    }
    for (let i = 1; i < snapshots.length; i++) {
      expect(s.travel('redo').documents).toEqual(snapshots[i].documents);
      validateProject(s.project);
    }
  });
  it('does not record previews or no-ops and discards redo after a new edit', () => {
    const s = session();
    const id = s.insert();
    for (let i = 0; i < 100; i++)
      transformScene(
        buildScene(s.page),
        s.page,
        movedGeometries(s.page.nodes, { x: i, y: i }, 24, true),
      );
    expect(s.status().undo).toBe(1);
    s.run({
      type: 'transform',
      geometries: { [id]: { ...s.page.nodes[0].geometry } },
    });
    expect(s.status().undo).toBe(1);
    s.run({
      type: 'transform',
      geometries: { [id]: { ...s.page.nodes[0].geometry, x: 200 } },
    });
    expect(s.status().undo).toBe(2);
    s.travel('undo');
    expect(s.status().redo).toBe(1);
    s.insert('arrow');
    expect(s.status().redo).toBe(0);
  });
  it('duplicates internal connections with new identities and independent appearance', () => {
    const s = session();
    const a = s.insert(),
      b = s.insert('rectangle', 300),
      e = crypto.randomUUID();
    s.run({
      type: 'connect',
      id: e,
      sourceId: a,
      targetId: b,
      layerId: s.page.layers[0].id,
      options: DEFAULT_CONNECTION,
    });
    const idMap = Object.fromEntries(
      [a, b, e].map((id) => [id, crypto.randomUUID()]),
    );
    const before = s.project;
    s.run({ type: 'duplicate', ids: [a, b], idMap, offset: { x: 24, y: 24 } });
    expect(s.page.nodes).toHaveLength(4);
    expect(s.page.connections[1]).toMatchObject({
      id: idMap[e],
      sourceId: idMap[a],
      targetId: idMap[b],
    });
    expect(s.travel('undo').documents).toEqual(before.documents);
    const copied = copyElements(s.page, [a, b]);
    s.run({ type: 'delete', ids: [a, b] });
    s.run({
      type: 'paste',
      ...copied,
      idMap,
      offset: { x: 48, y: 48 },
      layerId: s.page.layers[0].id,
    });
    expect(s.page.nodes).toHaveLength(2);
    expect(s.page.connections[0].sourceId).toBe(idMap[a]);
  });
  it('rejects invalid geometry and identity reuse without changing the document or history', () => {
    const s = session();
    const id = s.insert();
    const original = s.project;
    for (const width of [0, -1, Infinity, NaN])
      expect(() =>
        s.run({
          type: 'transform',
          geometries: { [id]: { ...s.page.nodes[0].geometry, width } },
        }),
      ).toThrow();
    expect(() =>
      s.run({
        type: 'duplicate',
        ids: [id],
        idMap: { [id]: id },
        offset: { x: 24, y: 24 },
      }),
    ).toThrow();
    expect(s.project).toBe(original);
    expect(s.status().undo).toBe(1);
  });
  it('moves and duplicates small imported geometry without silently enlarging it', () => {
    const s = session();
    const id = s.insert();
    s.page.nodes[0].geometry = {
      x: 10,
      y: 20,
      width: 2,
      height: 3,
      rotation: 30,
    };
    s.history.clear();
    validateProject(s.project);
    const original = structuredClone(s.page.nodes);
    s.run({
      type: 'move',
      ids: [id],
      delta: { x: 12, y: 18 },
      spacing: 24,
      snap: false,
    });
    expect(s.page.nodes[0].geometry).toEqual({
      ...original[0].geometry,
      x: 22,
      y: 38,
    });
    const cloneId = crypto.randomUUID();
    s.run({
      type: 'duplicate',
      ids: [id],
      idMap: { [id]: cloneId },
      offset: { x: 24, y: 24 },
    });
    expect(s.page.nodes[1].geometry).toEqual({
      ...original[0].geometry,
      x: 46,
      y: 62,
    });
    s.travel('undo');
    s.travel('undo');
    expect(s.page.nodes).toEqual(original);
  });
  it('protects locked incident edges, specialized references and future-version objects', () => {
    const s = session();
    const a = s.insert(),
      b = s.insert('rectangle', 300),
      e = crypto.randomUUID();
    s.run({
      type: 'connect',
      id: e,
      sourceId: a,
      targetId: b,
      layerId: s.page.layers[0].id,
      options: DEFAULT_CONNECTION,
    });
    s.page.layers.push({
      id: crypto.randomUUID(),
      title: 'Locked',
      locked: true,
      visible: true,
      extensions: {},
    });
    s.page.connections[0].layerId = s.page.layers[1].id;
    expect(() => s.run({ type: 'delete', ids: [a] })).toThrow();
    s.page.layers[1].locked = false;
    s.project.documents[0].domainModels.push({
      namespace: 'org.example.future',
      schemaVersion: '1.0.0',
      required: false,
      references: [a],
      data: {},
      extensions: {},
    });
    expect(() => s.run({ type: 'delete', ids: [a] })).toThrow();
    s.page.nodes[1].extensions[ELEMENT_KEY] = { version: 2 };
    expect(() =>
      s.run({
        type: 'transform',
        geometries: { [b]: { ...s.page.nodes[1].geometry, x: 500 } },
      }),
    ).toThrow();
  });
  it('isolates project/page histories and retains current camera/title through undo', () => {
    const s = session();
    s.insert();
    const second = session(undefined, s.history);
    second.insert('arrow');
    expect(second.travel('undo').documents[0].pages[0].nodes).toHaveLength(0);
    expect(s.status().undo).toBe(1);
    const page = structuredClone(s.page);
    page.id = crypto.randomUUID();
    page.nodes = [];
    page.layers[0].id = crypto.randomUUID();
    s.project.documents[0].pages.push(page);
    const other = s.history.execute(
      s.project,
      s.documentId,
      page.id,
      {
        type: 'insert',
        id: crypto.randomUUID(),
        kind: 'text',
        position: { x: 0, y: 0 },
        layerId: page.layers[0].id,
      },
      now,
    );
    const renamed = renameProject(other, 'Renamed', now);
    const moved = writeCanvas(renamed, s.documentId, s.pageId, {
      ...readCanvas(s.page),
      camera: { x: 400, y: 20, zoom: 2 },
    });
    const result = s.history.travel(moved, s.documentId, s.pageId, 'undo', now);
    expect(result.manifest.title).toBe('Renamed');
    expect(result.documents[0].pages[0].viewport.x).toBe(400);
    expect(result.documents[0].pages[1].nodes).toHaveLength(1);
    s.history.clear();
    expect(s.status()).toEqual({ undo: 0, redo: 0 });
  });
  it('bounds retained entries and bytes', () => {
    const s = session(undefined, new CommandHistory(2));
    s.insert();
    s.insert();
    s.insert();
    expect(s.status().undo).toBe(2);
    s.travel('undo');
    s.travel('undo');
    expect(s.page.nodes).toHaveLength(1);
    const tiny = session(undefined, new CommandHistory(100, 1));
    tiny.insert();
    expect(tiny.status().undo).toBe(0);
  });
  it('round trips standalone arrows and renamed rich projects without changing opaque resources', async () => {
    const original = await richFixture();
    const s = session(original);
    const id = s.insert('arrow');
    s.run({
      type: 'updateNode',
      id,
      text: 'Independent',
      style: DEFAULT_APPEARANCE,
      startArrow: true,
      endArrow: true,
    });
    const renamed = renameProject(s.project, 'New title 世界', now);
    const result = await importProject(await exportProject(renamed));
    expect(result.manifest.projectId).toBe(original.manifest.projectId);
    expect(result.manifest.extensions).toEqual(original.manifest.extensions);
    expect(result.files).toEqual(original.files);
    expect(result.assets).toEqual(original.assets);
    expect(result.documents.slice(1)).toEqual(original.documents.slice(1));
    expect(
      result.documents[0].pages[0].nodes.at(-1)?.extensions[LINE_KEY],
    ).toMatchObject({ version: 1, startArrow: true, endArrow: true });
    expect(() => renameProject(result, '  ', now)).toThrow();
    expect(() => renameProject(result, 'bad\nname', now)).toThrow();
  });
  it('keeps routed imported waypoints when moving endpoints', () => {
    const s = session();
    const a = s.insert(),
      b = s.insert('rectangle', 300),
      e = crypto.randomUUID();
    s.run({
      type: 'connect',
      id: e,
      sourceId: a,
      targetId: b,
      layerId: s.page.layers[0].id,
      options: { ...DEFAULT_CONNECTION, routing: 'curved' },
    });
    s.page.connections[0].waypoints = [{ x: 100, y: -100, custom: 'keep' }];
    const scene = buildScene(s.page);
    const geometries = { [a]: { ...s.page.nodes[0].geometry, y: 200 } };
    const preview = transformScene(scene, s.page, geometries);
    expect(preview.connections[0].path).not.toBe(scene.connections[0].path);
    const result = applyEdit(
      s.project,
      s.documentId,
      s.pageId,
      { type: 'transform', geometries },
      now,
    );
    expect(result.documents[0].pages[0].connections[0].waypoints).toEqual([
      { x: 100, y: -100, custom: 'keep' },
    ]);
    expect(preview.connections[0].path).toBe(
      buildScene(result.documents[0].pages[0]).connections[0].path,
    );
  });
});
