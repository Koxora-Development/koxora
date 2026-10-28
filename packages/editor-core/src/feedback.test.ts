import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  type Project,
} from '@koxora/project';
import {
  applyEdit,
  applyWorkbook,
  activePageId,
  selectPage,
  StudioHistory,
  buildScene,
  pickNode,
  tidyGeometries,
  readFreehand,
  FREEHAND_KEY,
  MAX_FREEHAND_POINTS,
  freehandGeometry,
  freehandContains,
  STACK_KEY,
  readStackOrder,
  copyElements,
  CommandHistory,
  orderedElements,
  DEFAULT_CONNECTION,
  resolveAppearance,
  textColor,
  contrastingColor,
  fromPlainText,
  type EditCommand,
} from './index';
const now = '2026-10-27T10:00:00.000Z';
const id = () => crypto.randomUUID();
const fresh = () => createProject('Sketchbook', id, now);
const pageOf = (p: Project) => p.documents[0].pages[0];
function edit(p: Project, command: EditCommand) {
  return applyEdit(p, p.documents[0].id, pageOf(p).id, command, now);
}
function shapes() {
  let p = fresh();
  for (const x of [0, 200, 100])
    p = edit(p, {
      type: 'insert',
      id: id(),
      kind: 'rectangle',
      position: { x, y: 0 },
      layerId: pageOf(p).layers[0].id,
    });
  return p;
}
describe('freehand portable geometry', () => {
  it('roundtrips strokes and keeps normalized samples through move, resize, copy and history', async () => {
    const p = fresh(),
      page = pageOf(p),
      history = new StudioHistory(),
      stroke = id();
    const drawn = history.execute(
      p,
      p.documents[0].id,
      page.id,
      {
        type: 'freehand',
        id: stroke,
        layerId: page.layers[0].id,
        points: [
          { x: 10, y: 20 },
          { x: 40, y: 60 },
          { x: 90, y: 20 },
        ],
        stroke: '#123456',
        strokeWidth: 4,
      },
      now,
    );
    const node = pageOf(drawn).nodes[0];
    expect(readFreehand(node)).toEqual([
      { x: 0, y: 0 },
      { x: 0.375, y: 1 },
      { x: 1, y: 0 },
    ]);
    const scene = buildScene(pageOf(drawn));
    expect(pickNode(scene, { x: 40, y: 60 })?.id).toBe(stroke);
    expect(pickNode(scene, { x: 40, y: 21 })).toBeUndefined();
    const moved = edit(drawn, {
      type: 'transform',
      geometries: {
        [stroke]: { x: 100, y: 100, width: 160, height: 80, rotation: 90 },
      },
    });
    expect(readFreehand(pageOf(moved).nodes[0])).toEqual(readFreehand(node));
    const copy = edit(moved, {
      type: 'duplicate',
      ids: [stroke],
      idMap: { [stroke]: id() },
      offset: { x: 10, y: 10 },
    });
    const loaded = await importProject(await exportProject(copy));
    expect(loaded.documents).toEqual(copy.documents);
    expect(pageOf(loaded).nodes[1].extensions[FREEHAND_KEY]).toEqual(
      node.extensions[FREEHAND_KEY],
    );
    const undone = history.travel(
      drawn,
      p.documents[0].id,
      page.id,
      'undo',
      now,
    );
    expect(pageOf(undone).nodes).toEqual([]);
    expect(
      pageOf(history.travel(undone, p.documents[0].id, page.id, 'redo', now))
        .nodes,
    ).toEqual([node]);
  });
  it('handles dots and rotated hits, rejects invalid and future strokes without changing data', () => {
    const dot = freehandGeometry([{ x: 10, y: 20 }]);
    expect(
      freehandContains([{ x: 0.5, y: 0.5 }], dot.geometry, { x: 10, y: 20 }, 1),
    ).toBe(true);
    expect(
      freehandContains(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        { x: 0, y: 0, width: 100, height: 100, rotation: 90 },
        { x: 100, y: 50 },
        1,
      ),
    ).toBe(true);
    for (const points of [
      [],
      [{ x: NaN, y: 0 }],
      Array.from({ length: MAX_FREEHAND_POINTS + 1 }, () => ({ x: 0, y: 0 })),
    ])
      expect(() => freehandGeometry(points)).toThrow();
    expect(() =>
      edit(fresh(), {
        type: 'freehand',
        id: id(),
        layerId: 'invalid',
        points: [{ x: 0, y: 0 }],
        stroke: '#000000',
        strokeWidth: 2,
      }),
    ).toThrow();
  });
  it('does not attach invisible text formatting or semantic ports to strokes', () => {
    let p = fresh();
    p = edit(p, {
      type: 'freehand',
      id: id(),
      layerId: pageOf(p).layers[0].id,
      points: [{ x: 0, y: 0 }],
      stroke: '#000000',
      strokeWidth: 2,
    });
    const stroke = pageOf(p).nodes[0];
    expect(
      pageOf(
        edit(p, {
          type: 'format',
          ids: [stroke.id],
          patch: { fontSize: 40, fill: '#ffffff', align: 'left' },
        }),
      ).nodes,
    ).toEqual([stroke]);
    expect(() =>
      edit(p, {
        type: 'richText',
        id: stroke.id,
        value: fromPlainText('hidden'),
      }),
    ).toThrow();
    stroke.extensions[FREEHAND_KEY] = { version: 2, points: [[0, 0]] };
    expect(readFreehand(stroke)).toBeUndefined();
    expect(buildScene(pageOf(p)).nodes[0].editable).toBe(false);
    expect(() => edit(p, { type: 'delete', ids: [stroke.id] })).toThrow();
  });
});
describe('unified stacking and non-overlap arrangement', () => {
  it('orders edges and nodes together, persists and remaps copied pages, and undoes atomically', async () => {
    let p = shapes();
    const d = p.documents[0],
      page = pageOf(p),
      nodes = page.nodes,
      edge = id();
    p = edit(p, {
      type: 'connect',
      id: edge,
      sourceId: nodes[0].id,
      targetId: nodes[1].id,
      layerId: page.layers[0].id,
      options: DEFAULT_CONNECTION,
    });
    const history = new StudioHistory();
    const stacked = history.execute(
      p,
      d.id,
      page.id,
      { type: 'stack', ids: [edge], action: 'front' },
      now,
    );
    const scene = buildScene(pageOf(stacked));
    expect(scene.connections[0].paintOrder).toBeGreaterThan(
      Math.max(...scene.nodes.map((n) => n.paintOrder)),
    );
    expect(orderedElements(pageOf(stacked)).at(-1)?.id).toBe(edge);
    const loaded = await importProject(await exportProject(stacked));
    expect(readStackOrder(pageOf(loaded))).toEqual(
      readStackOrder(pageOf(stacked)),
    );
    expect(
      history.travel(stacked, d.id, page.id, 'undo', now).documents,
    ).toEqual(p.documents);
    const duplicate = applyWorkbook(
      stacked,
      { type: 'duplicatePage', pageId: page.id, title: 'Copy' },
      id,
      now,
    ).documents[0].pages[1];
    expect(readStackOrder(duplicate)?.at(-1)).toBe(duplicate.connections[0].id);
    expect(
      readStackOrder(duplicate)?.some((key) =>
        readStackOrder(pageOf(stacked))!.includes(key),
      ),
    ).toBe(false);
  });
  it('preserves connector/node group order in clipboard and legacy history', () => {
    let p = shapes();
    const page = pageOf(p),
      d = p.documents[0],
      [a, b] = page.nodes;
    const edge = id();
    p = edit(p, {
      type: 'connect',
      id: edge,
      sourceId: a.id,
      targetId: b.id,
      layerId: page.layers[0].id,
      options: DEFAULT_CONNECTION,
    });
    const history = new CommandHistory();
    const stacked = history.execute(
      p,
      d.id,
      page.id,
      { type: 'stack', ids: [edge], action: 'front' },
      now,
    );
    expect(
      history.travel(stacked, d.id, page.id, 'undo', now).documents,
    ).toEqual(p.documents);
    const content = copyElements(pageOf(stacked), [a.id, b.id]);
    const idMap = Object.fromEntries(
      [...content.nodes, ...content.connections].map((n) => [n.id, id()]),
    );
    const pasted = edit(stacked, {
      type: 'paste',
      ...content,
      idMap,
      offset: { x: 20, y: 20 },
      layerId: page.layers[0].id,
    });
    expect(readStackOrder(pageOf(pasted))?.slice(-3)).toEqual([
      idMap[a.id],
      idMap[b.id],
      idMap[edge],
    ]);
    expect(() =>
      edit(stacked, {
        type: 'paste',
        ...content,
        stackIds: [edge, edge, edge],
        idMap,
        offset: { x: 20, y: 20 },
        layerId: page.layers[0].id,
      }),
    ).toThrow('invalid');
  });
  it('keeps relative group order, layer boundaries and locked records', () => {
    let p = shapes();
    const page = pageOf(p),
      [a, b, c] = page.nodes.map((n) => n.id);
    p = edit(p, { type: 'stack', ids: [a, b], action: 'forward' });
    expect(readStackOrder(pageOf(p))).toEqual([c, a, b]);
    p = edit(p, { type: 'stack', ids: [a, b], action: 'backward' });
    expect(readStackOrder(pageOf(p))).toEqual([a, b, c]);
    pageOf(p).layers[0].locked = true;
    expect(() =>
      edit(p, { type: 'stack', ids: [a], action: 'front' }),
    ).toThrow();
    pageOf(p).layers[0].locked = false;
    pageOf(p).extensions[STACK_KEY] = { version: 2, ids: [] };
    expect(() =>
      edit(p, { type: 'stack', ids: [a], action: 'front' }),
    ).toThrow();
  });
  it('avoids unselected obstacles including rotated bounds and restores the entire arrangement in one undo', () => {
    let p = shapes();
    const page = pageOf(p),
      [a, b, c] = page.nodes;
    p = edit(p, {
      type: 'transform',
      geometries: {
        [b.id]: { x: 0, y: 0, width: 160, height: 96, rotation: 45 },
      },
    });
    const scene = buildScene(pageOf(p)),
      geometry = tidyGeometries(scene, [a.id, b.id]);
    expect(Object.keys(geometry).sort()).toEqual([a.id, b.id].sort());
    const history = new StudioHistory();
    const arranged = history.execute(
      p,
      p.documents[0].id,
      page.id,
      { type: 'transform', geometries: geometry },
      now,
    );
    const boxes = buildScene(pageOf(arranged)).nodes.map((n) => n.bounds);
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
    expect(pageOf(arranged).nodes.find((n) => n.id === c.id)).toEqual(c);
    expect(
      history.travel(arranged, p.documents[0].id, page.id, 'undo', now)
        .documents,
    ).toEqual(p.documents);
  });
});
describe('navigation deletion and automatic color', () => {
  it('preserves the active page when deleting another document, protects references and the final document', () => {
    let p = applyWorkbook(
      fresh(),
      { type: 'newDocument', title: 'Other' },
      id,
      now,
    );
    const first = p.documents[0],
      second = p.documents[1];
    p = selectPage(p, first.id, first.pages[0].id);
    expect(
      activePageId(
        applyWorkbook(
          p,
          { type: 'deleteDocument', documentId: second.id },
          id,
          now,
        ),
      ),
    ).toBe(first.pages[0].id);
    first.actions.push({
      id: id(),
      targetId: first.pages[0].id,
      trigger: 'click',
      operation: 'navigate',
      parameters: { pageId: second.pages[0].id },
      extensions: {},
    });
    expect(() =>
      applyWorkbook(
        p,
        { type: 'deleteDocument', documentId: second.id },
        id,
        now,
      ),
    ).toThrow('references');
    const only = fresh();
    expect(() =>
      applyWorkbook(
        only,
        { type: 'deleteDocument', documentId: only.documents[0].id },
        id,
        now,
      ),
    ).toThrow('lastDocument');
  });
  it('resolves automatic colors against the surface without overwriting explicit values', () => {
    expect(resolveAppearance(pageOf(shapes()).nodes[0], []).textColor).toBe(
      'auto',
    );
    expect(textColor('auto')).toBe('var(--ink)');
    expect(textColor('auto', '#ffffff')).toBe('#000000');
    expect(textColor('auto', '#000000')).toBe('#ffffff');
    expect(textColor('#ffffff', '#ffffff')).toBe('#ffffff');
    expect(textColor('none')).toBe('transparent');
    expect(contrastingColor('#18243d')).toBe('#ffffff');
  });
});
