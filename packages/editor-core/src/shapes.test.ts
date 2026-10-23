import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createProject,
  importProject,
  exportProject,
  validateProject,
  type Node,
} from '@koxora/project';
import {
  applyEdit,
  DEFAULT_APPEARANCE,
  DEFAULT_CONNECTION,
  ELEMENT_KEY,
  CONNECTION_KEY,
  shapeKinds,
  shapeRegistry,
  shapeCenter,
  boundaryPoint,
  containsShape,
  anchorPoint,
  geometryBounds,
  connectionPath,
  buildScene,
  pickNode,
  readAppearance,
  layerStates,
  worldToScreen,
  screenToWorld,
  readCanvas,
  writeCanvas,
} from './index';
const now = '2026-10-22T12:00:00.000Z';
const make = () => createProject('Diagram', () => crypto.randomUUID(), now);
const node = (kind = 'rectangle', x = 0, y = 0, rotation = 0): Node => ({
  id: crypto.randomUUID(),
  kind,
  layerId: crypto.randomUUID(),
  geometry: { x, y, width: 160, height: 100, rotation },
  content: { text: '' },
  metadata: {},
  assetIds: [],
  dataBindings: [],
  extensions: {},
});
function insert(
  p = make(),
  kind: (typeof shapeKinds)[number] = 'rectangle',
  x = 0,
) {
  const d = p.documents[0],
    page = d.pages[0];
  return applyEdit(
    p,
    d.id,
    page.id,
    {
      type: 'insert',
      id: crypto.randomUUID(),
      kind,
      position: { x, y: 0 },
      layerId: page.layers[0].id,
    },
    now,
  );
}
describe('shape registry and geometry', () => {
  it.each(shapeKinds)(
    '%s has renderable geometry, rotation-safe boundary and hit detection',
    (kind) => {
      const n = node(kind, 30, -40, 37),
        c = shapeCenter(n.geometry),
        g = n.geometry;
      expect(shapeRegistry[kind].path(g.width, g.height, 16)).toMatch(/^M/);
      expect(containsShape(kind, g, c)).toBe(true);
      expect(containsShape(kind, g, { x: 10000, y: 10000 })).toBe(false);
      const p = boundaryPoint(kind, g, { x: c.x + 300, y: c.y + 120 });
      expect(
        containsShape(kind, g, {
          x: c.x + (p.x - c.x) * 0.999,
          y: c.y + (p.y - c.y) * 0.999,
        }),
      ).toBe(true);
      expect(
        containsShape(kind, g, {
          x: c.x + (p.x - c.x) * 1.001,
          y: c.y + (p.y - c.y) * 1.001,
        }),
      ).toBe(false);
      const bounds = geometryBounds(g, 2);
      expect(p.x).toBeGreaterThanOrEqual(bounds.x);
      expect(p.x).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(anchorPoint(n, c, 'east').x).toBeGreaterThan(c.x);
    },
  );
  it('matches ellipse, diamond, rotated and rounded boundary coordinates', () => {
    const n = node();
    n.geometry = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    expect(
      boundaryPoint('ellipse', n.geometry, { x: 100, y: 100 }).x,
    ).toBeCloseTo(85.355, 2);
    expect(boundaryPoint('diamond', n.geometry, { x: 100, y: 100 })).toEqual(
      expect.objectContaining({ x: expect.closeTo(75), y: expect.closeTo(75) }),
    );
    expect(
      boundaryPoint('rounded-rectangle', n.geometry, { x: 100, y: 100 }, 20).x,
    ).toBeCloseTo(95);
    n.geometry.rotation = 90;
    expect(anchorPoint(n, { x: 0, y: 0 }, 'east').y).toBeCloseTo(100);
  });
  it.each(['straight', 'orthogonal', 'curved'] as const)(
    '%s attaches to boundaries with a valid terminal tangent',
    (routing) => {
      const s = node('ellipse', 0, 0, 25),
        t = node('diamond', 400, 180, -15);
      const path = connectionPath(s, t, { ...DEFAULT_CONNECTION, routing });
      expect(path.path).not.toMatch(/NaN|Infinity/);
      expect(path.points[0]).not.toEqual(shapeCenter(s.geometry));
      expect(containsShape(s.kind, s.geometry, path.points[0])).toBe(true);
      expect(containsShape(t.kind, t.geometry, path.points.at(-1)!)).toBe(true);
      expect(Number.isFinite(path.angle)).toBe(true);
      if (routing === 'orthogonal')
        path.points
          .slice(1)
          .forEach((p, i) =>
            expect(p.x === path.points[i].x || p.y === path.points[i].y).toBe(
              true,
            ),
          );
      if (routing === 'curved') expect(path.path).toContain(' C ');
    },
  );
  it('computes arrow orientation for horizontal, vertical and reverse paths', () => {
    for (const [x, y, angle] of [
      [400, 0, 0],
      [0, 400, 90],
      [-400, 0, 180],
    ])
      expect(
        connectionPath(node(), node('rectangle', x, y), DEFAULT_CONNECTION)
          .angle,
      ).toBeCloseTo(angle);
  });
});
describe('immutable editing transactions', () => {
  it.each(shapeKinds)(
    'creates %s with stable UUID and round trips through native ZIP',
    async (kind) => {
      const p = make(),
        next = insert(p, kind);
      const n = next.documents[0].pages[0].nodes[0];
      expect(p.documents[0].pages[0].nodes).toHaveLength(0);
      expect(n.kind).toBe(kind);
      expect(
        (await importProject(await exportProject(next))).documents,
      ).toEqual(next.documents);
      expect(next.files).toBe(p.files);
      expect(next.datasets).toBe(p.datasets);
    },
  );
  it.each([0.02, 0.5, 1, 4, 16])(
    'integrates CSS coordinates and grid insertion at zoom %s',
    (zoom) => {
      let p = make();
      const d = p.documents[0],
        page = d.pages[0];
      p = writeCanvas(p, d.id, page.id, {
        camera: { x: 117, y: -235, zoom },
        grid: { visible: false, snap: true, spacing: 24 },
      });
      const camera = readCanvas(p.documents[0].pages[0]).camera;
      const screen = worldToScreen({ x: 123, y: -73 }, camera, {
        width: 700.5,
        height: 500.25,
      });
      const position = screenToWorld(screen, camera, {
        width: 700.5,
        height: 500.25,
      });
      p = applyEdit(
        p,
        d.id,
        page.id,
        {
          type: 'insert',
          id: crypto.randomUUID(),
          kind: 'rectangle',
          layerId: page.layers[0].id,
          position,
        },
        now,
      );
      expect(p.documents[0].pages[0].nodes[0].geometry).toMatchObject({
        x: 48,
        y: -120,
      });
    },
  );
  it('preserves binary assets, unknown fields, domain models and unrelated pages while editing labels/styles', async () => {
    const p = await importProject(
      new Uint8Array(
        readFileSync('packages/project/fixtures/complete-v1.koxora'),
      ),
    );
    const next = insert(p),
      d = next.documents[0],
      page = d.pages[0],
      n = page.nodes.at(-1)!;
    n.extensions['org.example.future'] = { opaque: ['✓'] };
    n.content.future = { font: 'future' };
    const text = 'Hello 世界\nGrüße <script>alert(1)</script>\nمرحبا 👩🏽‍💻';
    const edited = applyEdit(
      next,
      d.id,
      page.id,
      {
        type: 'updateNode',
        id: n.id,
        text,
        style: {
          ...DEFAULT_APPEARANCE,
          fill: '#00ffcc',
          align: 'left',
          fontSize: 20,
        },
      },
      now,
    );
    expect(next.documents[0].pages[0].nodes.at(-1)!.content.text).toBe('');
    expect(edited.documents[0].domainModels).toEqual(
      p.documents[0].domainModels,
    );
    expect(edited.documents[0].pages.slice(1)).toEqual(
      p.documents[0].pages.slice(1),
    );
    expect(edited.files).toBe(p.files);
    const reopened = await importProject(await exportProject(edited));
    expect(reopened.documents).toEqual(edited.documents);
    expect(reopened.files).toEqual(p.files);
    expect(reopened.documents[0].pages[0].nodes.at(-1)!.content).toEqual({
      text,
      future: { font: 'future' },
    });
  });
  it('creates stable connections, rejects duplicates, self-links, missing and foreign-page endpoints', async () => {
    let p = insert(insert(make()), 'diamond', 400);
    const d = p.documents[0],
      page = d.pages[0];
    const cmd = {
      type: 'connect' as const,
      id: crypto.randomUUID(),
      sourceId: page.nodes[0].id,
      targetId: page.nodes[1].id,
      layerId: page.layers[0].id,
      options: {
        ...DEFAULT_CONNECTION,
        label: 'Yes ✓',
        routing: 'orthogonal' as const,
      },
    };
    p = applyEdit(p, d.id, page.id, cmd, now);
    expect(() =>
      applyEdit(p, d.id, page.id, { ...cmd, id: crypto.randomUUID() }, now),
    ).toThrow('duplicate');
    expect(() =>
      applyEdit(p, d.id, page.id, { ...cmd, targetId: cmd.sourceId }, now),
    ).toThrow('endpoint');
    expect(() =>
      applyEdit(
        p,
        d.id,
        page.id,
        { ...cmd, targetId: crypto.randomUUID() },
        now,
      ),
    ).toThrow('endpoint');
    expect(
      (await importProject(await exportProject(p))).documents[0].pages[0]
        .connections[0],
    ).toMatchObject({
      sourceId: cmd.sourceId,
      targetId: cmd.targetId,
      extensions: { [CONNECTION_KEY]: { label: 'Yes ✓', arrow: true } },
    });
    const broken = structuredClone(p);
    broken.documents[0].pages[0].connections[0].targetId = crypto.randomUUID();
    expect(() => validateProject(broken)).toThrow();
  });
  it('inherits locked/hidden layer semantics and respects layer paint order', () => {
    const p = insert(insert()),
      d = p.documents[0],
      page = d.pages[0],
      base = page.layers[0];
    const upper = { ...base, id: crypto.randomUUID(), title: 'Upper' };
    page.layers.push(upper);
    page.nodes[0].layerId = upper.id;
    let scene = buildScene(page);
    expect(pickNode(scene, { x: 0, y: 0 })?.id).toBe(page.nodes[0].id);
    base.locked = true;
    upper.parentId = base.id;
    expect(layerStates(page.layers).get(upper.id)?.editable).toBe(false);
    expect(() =>
      applyEdit(
        p,
        d.id,
        page.id,
        {
          type: 'updateNode',
          id: page.nodes[0].id,
          text: 'x',
          style: DEFAULT_APPEARANCE,
        },
        now,
      ),
    ).toThrow('layer');
    scene = buildScene(page);
    expect(scene.nodes).toHaveLength(2);
    expect(pickNode(scene, { x: 0, y: 0 })).toBeUndefined();
    base.visible = false;
    expect(buildScene(page).nodes).toHaveLength(0);
  });
  it('does not overwrite future element namespaces and rejects invalid edits atomically', () => {
    const p = insert(),
      d = p.documents[0],
      page = d.pages[0],
      n = page.nodes[0];
    n.extensions[ELEMENT_KEY] = { version: 9, opaque: 'keep' };
    const before = structuredClone(p);
    expect(() =>
      applyEdit(
        p,
        d.id,
        page.id,
        { type: 'updateNode', id: n.id, text: 'x', style: DEFAULT_APPEARANCE },
        now,
      ),
    ).toThrow('unsupported');
    expect(p).toEqual(before);
    expect(() =>
      applyEdit(
        p,
        d.id,
        page.id,
        {
          type: 'insert',
          kind: 'rectangle',
          id: n.id,
          layerId: n.layerId,
          position: { x: 0, y: 0 },
        },
        now,
      ),
    ).toThrow();
    expect(p).toEqual(before);
  });
  it('never exposes imported CSS, HTML resources or invalid values as rendering attributes', () => {
    expect(
      readAppearance({
        fill: 'url(https://evil.example)',
        stroke: 'javascript:alert(1)',
        textColor: '<script>',
        fontSize: Infinity,
        opacity: -1,
      }),
    ).toEqual(DEFAULT_APPEARANCE);
    const p = insert(),
      page = p.documents[0].pages[0];
    page.nodes[0].content.text = '<img src=x onerror=alert(1)>';
    page.nodes[0].extensions[ELEMENT_KEY] = {
      version: 1,
      style: { fill: 'url(#x)', strokeWidth: 1e20 },
    };
    expect(buildScene(page).nodes[0].style).toEqual(DEFAULT_APPEARANCE);
    expect(buildScene(page).nodes[0].label).toBe(
      '<img src=x onerror=alert(1)>',
    );
  });
});

it('rejects lossy editing projections of oversized/future connection payloads', () => {
  let p = insert(insert(make()), 'rectangle', 400);
  const d = p.documents[0],
    page = d.pages[0];
  const id = crypto.randomUUID();
  p = applyEdit(
    p,
    d.id,
    page.id,
    {
      type: 'connect',
      id,
      sourceId: page.nodes[0].id,
      targetId: page.nodes[1].id,
      layerId: page.layers[0].id,
      options: DEFAULT_CONNECTION,
    },
    now,
  );
  const edge = p.documents[0].pages[0].connections[0];
  for (const raw of [
    { version: 1, label: 'x'.repeat(5000) },
    { version: 1, routing: 'future-spline' },
    { version: 2, label: 'future' },
  ]) {
    edge.extensions[CONNECTION_KEY] = raw;
    const before = structuredClone(p);
    expect(() =>
      applyEdit(
        p,
        d.id,
        page.id,
        {
          type: 'updateConnection',
          id,
          options: DEFAULT_CONNECTION,
          style: DEFAULT_APPEARANCE,
        },
        now,
      ),
    ).toThrow('unsupported');
    expect(p).toEqual(before);
  }
});
it('handles hostile enum objects and bounds every emitted connection label/arrow', () => {
  let p = insert(insert(make()), 'rectangle', 400);
  const d = p.documents[0],
    page = d.pages[0];
  p = applyEdit(
    p,
    d.id,
    page.id,
    {
      type: 'connect',
      id: crypto.randomUUID(),
      sourceId: page.nodes[0].id,
      targetId: page.nodes[1].id,
      layerId: page.layers[0].id,
      options: DEFAULT_CONNECTION,
    },
    now,
  );
  const model = p.documents[0].pages[0];
  model.nodes[0].extensions[ELEMENT_KEY] = {
    version: 1,
    style: { align: { toString: null, valueOf: null } },
  };
  model.connections[0].extensions[CONNECTION_KEY] = {
    version: 1,
    routing: { toString: null },
    sourceAnchor: { toString: [] },
    targetAnchor: [{ toString: null }],
    label: 'a\nb\nc\nd\ne\nf\ng\nh',
    arrow: true,
    style: { fontSize: 96, strokeWidth: 32 },
  };
  validateProject(p);
  const scene = buildScene(model),
    edge = scene.connections[0];
  expect(edge.path).not.toMatch(/NaN/);
  expect(edge.bounds.y + edge.bounds.height).toBeGreaterThan(
    edge.labelPoint.y + 9 * 96,
  );
  expect(edge.bounds.x + edge.bounds.width).toBeGreaterThanOrEqual(
    edge.points.at(-1)!.x + 96,
  );
});
it('edits only the explicitly addressed page and respects inherited styles without changing shared records', () => {
  let p = insert();
  const d = p.documents[0],
    first = d.pages[0];
  const second = {
    ...first,
    id: crypto.randomUUID(),
    nodes: [],
    connections: [],
    layers: [{ ...first.layers[0], id: crypto.randomUUID() }],
  };
  d.pages.push(second);
  p = applyEdit(
    p,
    d.id,
    second.id,
    {
      type: 'insert',
      id: crypto.randomUUID(),
      kind: 'text',
      layerId: second.layers[0].id,
      position: { x: 10, y: 10 },
      text: 'Second page',
    },
    now,
  );
  expect(p.documents[0].pages[0]).toBe(first);
  expect(p.documents[0].pages[1].nodes[0].content.text).toBe('Second page');
  const base = {
      id: crypto.randomUUID(),
      properties: { fill: '#ffffff', fontSize: 24 },
      extensions: {},
    },
    child = {
      id: crypto.randomUUID(),
      parentId: base.id,
      properties: { stroke: '#00ffff' },
      extensions: {},
    };
  first.nodes[0].styleId = child.id;
  expect(buildScene(first, [base, child]).nodes[0].style).toMatchObject({
    fill: '#ffffff',
    fontSize: 24,
    stroke: '#00ffff',
  });
});

it('label-only edits preserve unsupported style values and cross-document references', () => {
  const p = insert(),
    doc = p.documents[0],
    page = doc.pages[0],
    n = page.nodes[0];
  const raw = {
    version: 1,
    style: {
      align: { toString: null },
      fill: 'future-paint',
      extra: { keep: true },
    },
  };
  n.extensions[ELEMENT_KEY] = raw;
  const rendered = buildScene(page).nodes[0].style;
  const next = applyEdit(
    p,
    doc.id,
    page.id,
    {
      type: 'updateNode',
      id: n.id,
      text: 'Only the label changes',
      style: rendered,
    },
    now,
  );
  expect(next.documents[0].pages[0].nodes[0].extensions[ELEMENT_KEY]).toEqual(
    raw,
  );
  const foreign = make().documents[0],
    style = {
      id: crypto.randomUUID(),
      properties: { fill: '#123456', fontSize: 24 },
      extensions: {},
    };
  foreign.styles.push(style);
  p.documents.push(foreign);
  p.indexes.documents.items.push({
    id: foreign.id,
    path: `documents/${foreign.id}.json`,
    extensions: {},
  });
  delete n.extensions[ELEMENT_KEY];
  n.styleId = style.id;
  const withStyle = applyEdit(
    p,
    doc.id,
    page.id,
    {
      type: 'updateNode',
      id: n.id,
      text: 'Foreign style preserved',
      style: buildScene(page, [style]).nodes[0].style,
    },
    now,
  );
  expect(
    withStyle.documents[0].pages[0].nodes[0].extensions[ELEMENT_KEY],
  ).toEqual({ version: 1 });
  expect(withStyle.documents[1]).toBe(foreign);
});
it('an explicit routing change replaces imported waypoints, but label edits keep them', () => {
  let p = insert(insert(make()), 'rectangle', 400);
  const d = p.documents[0],
    page = d.pages[0];
  const id = crypto.randomUUID();
  p = applyEdit(
    p,
    d.id,
    page.id,
    {
      type: 'connect',
      id,
      sourceId: page.nodes[0].id,
      targetId: page.nodes[1].id,
      layerId: page.layers[0].id,
      options: DEFAULT_CONNECTION,
    },
    now,
  );
  const edge = p.documents[0].pages[0].connections[0];
  edge.waypoints = [{ x: 200, y: 100, extra: 'keep' }];
  const labelled = applyEdit(
    p,
    d.id,
    page.id,
    {
      type: 'updateConnection',
      id,
      options: { ...DEFAULT_CONNECTION, label: 'new' },
      style: DEFAULT_APPEARANCE,
    },
    now,
  );
  expect(labelled.documents[0].pages[0].connections[0].waypoints).toEqual(
    edge.waypoints,
  );
  const routed = applyEdit(
    labelled,
    d.id,
    page.id,
    {
      type: 'updateConnection',
      id,
      options: { ...DEFAULT_CONNECTION, routing: 'curved' },
      style: DEFAULT_APPEARANCE,
    },
    now,
  );
  expect(routed.documents[0].pages[0].connections[0].waypoints).toEqual([]);
  expect(edge.waypoints).toHaveLength(1);
});
it('resolves shared style chains once per scene', () => {
  const p = insert(),
    page = p.documents[0].pages[0];
  let reads = 0;
  const styles = Array.from({ length: 1000 }, (_, i) => ({
    id: crypto.randomUUID(),
    get properties() {
      reads++;
      return { fill: i % 2 ? '#ffffff' : '#000000' };
    },
    extensions: {},
  }));
  page.nodes = styles.map((s, i) => ({
    ...page.nodes[0],
    id: crypto.randomUUID(),
    styleId: s.id,
    geometry: { ...page.nodes[0].geometry, x: i * 200 },
  }));
  expect(buildScene(page, styles).nodes).toHaveLength(1000);
  expect(reads).toBeLessThanOrEqual(1000);
});
