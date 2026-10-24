import { expect, it } from 'vitest';
import { createProject, exportProject, importProject } from '@koxora/project';
import {
  anchorPoint,
  applyEdit,
  buildScene,
  CommandHistory,
  connectionError,
  CONNECTION_KEY,
  DEFAULT_APPEARANCE,
  DEFAULT_CONNECTION,
  ELEMENT_KEY,
  readAppearance,
  transformScene,
  visibleScene,
  readConnection,
  resolveAppearance,
  type Anchor,
} from './index';
const now = '2026-10-24T12:00:00.000Z';
function fixture() {
  let project = createProject('Ports', () => crypto.randomUUID(), now);
  const d = project.documents[0],
    p = d.pages[0];
  for (const x of [-200, 200])
    project = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'insert',
        id: crypto.randomUUID(),
        kind: 'rounded-rectangle',
        position: { x, y: 0 },
        layerId: p.layers[0].id,
      },
      now,
    );
  return { project, documentId: d.id, pageId: p.id };
}
it.each(['auto', 'north', 'east', 'south', 'west'] as Anchor[])(
  '%s anchors survive rotated move/resize, history and portable round trip',
  async (anchor) => {
    let { project } = fixture();
    const d = project.documents[0],
      p = d.pages[0],
      history = new CommandHistory();
    project = history.execute(
      project,
      d.id,
      p.id,
      {
        type: 'connect',
        id: crypto.randomUUID(),
        sourceId: p.nodes[0].id,
        targetId: p.nodes[1].id,
        layerId: p.layers[0].id,
        options: {
          ...DEFAULT_CONNECTION,
          arrow: false,
          sourceAnchor: anchor,
          targetAnchor: anchor,
        },
      },
      now,
    );
    const linked = project;
    for (const routing of ['straight', 'orthogonal', 'curved'] as const) {
      const current = project.documents[0].pages[0];
      project = history.execute(
        project,
        d.id,
        p.id,
        {
          type: 'updateConnection',
          id: current.connections[0].id,
          options: { ...readConnection(current.connections[0]), routing },
          style: DEFAULT_APPEARANCE,
        },
        now,
      );
      const before = project;
      project = history.execute(
        project,
        d.id,
        p.id,
        {
          type: 'transform',
          geometries: Object.fromEntries(
            p.nodes.map((n, i) => [
              n.id,
              {
                ...n.geometry,
                x: i * 350 - 170,
                y: 80,
                width: 230,
                height: 140,
                rotation: i ? 35 : 90,
              },
            ]),
          ),
        },
        now,
      );
      const model = project.documents[0].pages[0],
        edge = buildScene(model).connections[0];
      expect(readConnection(model.connections[0])).toMatchObject({
        sourceAnchor: anchor,
        targetAnchor: anchor,
        arrow: false,
        routing,
      });
      if (anchor !== 'auto') {
        expect(edge.points[0]).toEqual(
          anchorPoint(model.nodes[0], { x: 0, y: 0 }, anchor),
        );
        expect(edge.points.at(-1)).toEqual(
          anchorPoint(model.nodes[1], { x: 0, y: 0 }, anchor),
        );
      }
      const undo = history.travel(project, d.id, p.id, 'undo', now);
      expect(undo.documents).toEqual(before.documents);
      expect(history.travel(undo, d.id, p.id, 'redo', now).documents).toEqual(
        project.documents,
      );
      // Reset geometry for the next route so every transform is a real transaction.
      project = history.execute(
        project,
        d.id,
        p.id,
        {
          type: 'transform',
          geometries: Object.fromEntries(
            p.nodes.map((n) => [n.id, n.geometry]),
          ),
        },
        now,
      );
    }
    expect(
      (await importProject(await exportProject(project))).documents,
    ).toEqual(project.documents);
    expect(
      linked.documents[0].pages[0].connections[0].extensions[CONNECTION_KEY],
    ).toMatchObject({ version: 1, sourceAnchor: anchor, targetAnchor: anchor });
  },
);
it('preflights invalid, protected and duplicate endpoints without changing the document', () => {
  const { project } = fixture(),
    d = project.documents[0],
    p = d.pages[0],
    [a, b] = p.nodes,
    layer = p.layers[0].id;
  expect(connectionError(p, a.id, null, layer, false)).toBeNull();
  expect(connectionError(p, a.id, a.id, layer, false)).toBe('endpoint');
  expect(connectionError(p, a.id, 'missing', layer, false)).toBe('endpoint');
  expect(connectionError(p, a.id, b.id, 'missing', false)).toBe('layer');
  for (const locked of [true, false]) {
    p.layers.push({
      id: crypto.randomUUID(),
      title: 'Protected',
      locked,
      visible: locked,
      extensions: {},
    });
    b.layerId = p.layers.at(-1)!.id;
    expect(connectionError(p, a.id, b.id, layer, true)).toBe('layer');
  }
  b.layerId = layer;
  b.extensions[ELEMENT_KEY] = { version: 99 };
  expect(connectionError(p, a.id, b.id, layer, true)).toBe('unsupported');
  b.extensions = {};
  b.kind = 'line';
  expect(connectionError(p, a.id, b.id, layer, true)).toBe('endpoint');
  b.kind = 'rectangle';
  const next = applyEdit(
    project,
    d.id,
    p.id,
    {
      type: 'connect',
      id: crypto.randomUUID(),
      sourceId: a.id,
      targetId: b.id,
      layerId: layer,
      options: DEFAULT_CONNECTION,
    },
    now,
  ).documents[0].pages[0];
  expect(connectionError(next, a.id, b.id, layer, true)).toBe('duplicate');
  expect(connectionError(next, b.id, a.id, layer, false)).toBe('duplicate');
  expect(connectionError(next, b.id, a.id, layer, true)).toBeNull();
  expect(p.connections).toHaveLength(0);
});
it('typography inherits, applies as one history entry and preserves unknown style data in ZIP', async () => {
  let { project } = fixture();
  const d = project.documents[0],
    p = d.pages[0],
    n = p.nodes[0];
  const base = {
    id: crypto.randomUUID(),
    properties: {
      fontFamily: 'serif',
      fontWeight: 700,
      fontStyle: 'italic',
      textDecoration: 'underline',
    },
    extensions: {},
  };
  const child = {
    id: crypto.randomUUID(),
    parentId: base.id,
    properties: { fontSize: 28 },
    extensions: {},
  };
  d.styles.push(base, child);
  n.styleId = child.id;
  n.extensions[ELEMENT_KEY] = {
    version: 1,
    style: { future: { opaque: true } },
  };
  const appearance = resolveAppearance(n, d.styles);
  expect(appearance).toMatchObject({ ...base.properties, fontSize: 28 });
  const before = project,
    history = new CommandHistory();
  project = history.execute(
    project,
    d.id,
    p.id,
    {
      type: 'updateNode',
      id: n.id,
      text: 'Hello\nGrüße',
      style: {
        ...appearance,
        fontFamily: 'mono',
        fontSize: 36,
        fontWeight: 400,
      },
    },
    now,
  );
  expect(history.status(project, d.id, p.id)).toEqual({ undo: 1, redo: 0 });
  expect(
    project.documents[0].pages[0].nodes[0].extensions[ELEMENT_KEY],
  ).toMatchObject({
    version: 1,
    style: {
      fontFamily: 'mono',
      fontSize: 36,
      fontWeight: 400,
      future: { opaque: true },
    },
  });
  expect(project.documents[0].styles).toEqual(before.documents[0].styles);
  const undone = history.travel(project, d.id, p.id, 'undo', now);
  expect(undone.documents).toEqual(before.documents);
  expect(history.travel(undone, d.id, p.id, 'redo', now).documents).toEqual(
    project.documents,
  );
  expect((await importProject(await exportProject(project))).documents).toEqual(
    project.documents,
  );
});
it('untrusted fonts never become CSS and remain intact through unrelated label edits', () => {
  const { project } = fixture(),
    d = project.documents[0],
    p = d.pages[0],
    n = p.nodes[0];
  for (const fontFamily of [
    'url(https://evil.example/font)',
    'serif; color:red',
    { toString: null },
    '__proto__',
  ]) {
    const raw = {
      fontFamily,
      fontWeight: 'bold',
      fontStyle: 'oblique',
      textDecoration: 'url(x)',
    };
    expect(readAppearance(raw)).toEqual(DEFAULT_APPEARANCE);
    n.extensions[ELEMENT_KEY] = { version: 1, style: raw };
    const edited = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'updateNode',
        id: n.id,
        text: 'Only text',
        style: resolveAppearance(n, []),
      },
      now,
    );
    expect(
      edited.documents[0].pages[0].nodes[0].extensions[ELEMENT_KEY],
    ).toEqual(n.extensions[ELEMENT_KEY]);
  }
});

it.each(['left', 'right'] as const)(
  '%s aligned connector and drawing labels remain visible beyond the path bounds',
  (align) => {
    let { project } = fixture();
    const d = project.documents[0],
      p = d.pages[0],
      edgeId = crypto.randomUUID(),
      lineId = crypto.randomUUID();
    const label = 'W'.repeat(20),
      style = { ...DEFAULT_APPEARANCE, fontSize: 20, align };
    project = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'connect',
        id: edgeId,
        sourceId: p.nodes[0].id,
        targetId: p.nodes[1].id,
        layerId: p.layers[0].id,
        options: { ...DEFAULT_CONNECTION, label },
      },
      now,
    );
    project = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'updateConnection',
        id: edgeId,
        options: { ...DEFAULT_CONNECTION, label },
        style,
      },
      now,
    );
    project = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'insert',
        id: lineId,
        kind: 'line',
        position: { x: 0, y: 0 },
        layerId: p.layers[0].id,
        geometry: { x: -5, y: -0.5, width: 10, height: 1, rotation: 0 },
        text: label,
      },
      now,
    );
    project = applyEdit(
      project,
      d.id,
      p.id,
      { type: 'updateNode', id: lineId, text: label, style },
      now,
    );
    const model = project.documents[0].pages[0],
      scene = buildScene(model);
    const viewport = {
      x: align === 'left' ? 220 : -240,
      y: -20,
      width: 10,
      height: 20,
    };
    expect(
      visibleScene(scene, viewport).connections.map((e) => e.id),
    ).toContain(edgeId);
    expect(visibleScene(scene, viewport).nodes.map((n) => n.id)).toContain(
      lineId,
    );
    const moved = transformScene(
      scene,
      model,
      Object.fromEntries(
        model.nodes.map((n) => [n.id, { ...n.geometry, x: n.geometry.x + 50 }]),
      ),
    );
    expect(
      visibleScene(moved, { ...viewport, x: viewport.x + 50 }).connections.map(
        (e) => e.id,
      ),
    ).toContain(edgeId);
    expect(
      visibleScene(moved, { ...viewport, x: viewport.x + 50 }).nodes.map(
        (n) => n.id,
      ),
    ).toContain(lineId);
  },
);
