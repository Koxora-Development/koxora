import { expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
} from '@koxora/project';
import {
  applyEdit,
  StudioHistory,
  buildScene,
  pickNode,
  anchorPoint,
  lineEndpoints,
  shapeCenter,
  rotatePoint,
  handlePoint,
  resizeGeometry,
  normalizedRotation,
  transformedGeometry,
  rotatedGeometries,
  DEFAULT_CONNECTION,
  ELEMENT_KEY,
  type EditCommand,
} from './index';
const now = '2026-11-12T12:00:00.000Z';
function setup() {
  let project = createProject('Transforms', () => crypto.randomUUID(), now);
  const documentId = project.documents[0].id,
    pageId = project.documents[0].pages[0].id;
  const run = (command: EditCommand) =>
    (project = applyEdit(project, documentId, pageId, command, now));
  for (const [i, kind] of (
    ['triangle', 'parallelogram', 'text', 'arrow'] as const
  ).entries())
    run({
      type: 'insert',
      id: crypto.randomUUID(),
      kind,
      position: { x: i * 250, y: 0 },
      layerId: project.documents[0].pages[0].layers[0].id,
    });
  run({
    type: 'freehand',
    id: crypto.randomUUID(),
    layerId: project.documents[0].pages[0].layers[0].id,
    points: [
      { x: 1000, y: 0 },
      { x: 1080, y: 20 },
      { x: 1010, y: 70 },
    ],
    stroke: '#123456',
    strokeWidth: 2,
  });
  return {
    get project() {
      return project;
    },
    get page() {
      return project.documents[0].pages[0];
    },
    run,
    documentId,
    pageId,
  };
}
it('normalizes negative and large angles, rejecting invalid numeric input', () => {
  expect(normalizedRotation(-450)).toBe(270);
  expect(normalizedRotation(360 * 1e6 + 37)).toBe(37);
  for (const n of [NaN, Infinity, -Infinity, 1e13])
    expect(() => normalizedRotation(n)).toThrow();
});
it('rotates each element about its center and reflects twice without losing geometry or extensions', () => {
  const s = setup();
  s.page.nodes[0].geometry.custom = { preserved: true };
  const before = structuredClone(s.page.nodes);
  s.run({
    type: 'transform',
    geometries: rotatedGeometries(s.page.nodes, 127, true),
  });
  s.page.nodes.forEach((n, i) => {
    expect(shapeCenter(n.geometry)).toEqual(shapeCenter(before[i].geometry));
    expect(n.geometry.rotation).toBe(127);
  });
  for (const action of ['flipHorizontal', 'flipVertical'] as const) {
    for (let i = 0; i < 2; i++)
      s.run({
        type: 'transform',
        geometries: Object.fromEntries(
          s.page.nodes.map((n) => [
            n.id,
            transformedGeometry(n.geometry, action),
          ]),
        ),
      });
  }
  s.page.nodes.forEach((n, i) => {
    expect(n.geometry.flipX).toBe(false);
    expect(n.geometry.flipY).toBe(false);
    expect(n.extensions).toEqual(before[i].extensions);
    expect(n.content).toEqual(before[i].content);
  });
  expect(s.page.nodes[0].geometry.custom).toEqual({ preserved: true });
});
it('matches reflected rotated contours, semantic anchors, freehand picking and line direction', () => {
  const s = setup();
  s.run({
    type: 'transform',
    geometries: Object.fromEntries(
      s.page.nodes.map((n) => [
        n.id,
        { ...n.geometry, rotation: 37, flipY: true, flipX: true },
      ]),
    ),
  });
  const n = s.page.nodes[0],
    g = n.geometry,
    c = shapeCenter(g);
  const south = anchorPoint(n, c, 'north');
  const expected = rotatePoint({ x: c.x, y: g.y + g.height }, c, 37);
  expect(south.x).toBeCloseTo(expected.x);
  expect(south.y).toBeCloseTo(expected.y);
  const scene = buildScene(s.page);
  const inside = rotatePoint(
    { x: g.x + g.width * 0.1, y: g.y + g.height * 0.1 },
    c,
    37,
  );
  expect(pickNode(scene, inside)?.id).toBe(n.id);
  const outside = rotatePoint(
    { x: g.x + g.width * 0.1, y: g.y + g.height * 0.9 },
    c,
    37,
  );
  expect(pickNode(scene, outside)).toBeUndefined();
  const stroke = s.page.nodes[4],
    sg = stroke.geometry;
  const ink = rotatePoint(
    { x: sg.x + sg.width, y: sg.y + sg.height },
    shapeCenter(sg),
    37,
  );
  expect(pickNode(scene, ink)?.id).toBe(stroke.id);
  const line = s.page.nodes[3];
  const [a, b] = lineEndpoints(line.geometry);
  expect(a.x).toBeGreaterThan(b.x);
  const fixed = handlePoint(g, 'sw');
  const resized = resizeGeometry(g, 'ne', { x: c.x + 200, y: c.y - 200 });
  expect(handlePoint(resized, 'sw').x).toBeCloseTo(fixed.x);
  expect(handlePoint(resized, 'sw').y).toBeCloseTo(fixed.y);
});
it('keeps connected semantic anchors and explicit waypoints, IDs, styles and content', () => {
  const s = setup(),
    [a, b] = s.page.nodes;
  s.run({
    type: 'connect',
    id: crypto.randomUUID(),
    layerId: a.layerId,
    sourceId: a.id,
    targetId: b.id,
    options: {
      ...DEFAULT_CONNECTION,
      sourceAnchor: 'north',
      targetAnchor: 'west',
    },
  });
  s.page.connections[0].waypoints = [{ x: 100, y: -200, custom: 'preserve' }];
  a.content.text = 'ÄÖ 日本語';
  a.extensions['org.example.extra'] = { keep: true };
  const before = structuredClone(s.page);
  s.run({
    type: 'transform',
    geometries: { [a.id]: { ...a.geometry, rotation: 90, flipY: true } },
  });
  const edge = buildScene(s.page).connections[0];
  expect(edge.points[0].x).toBeCloseTo(
    anchorPoint(s.page.nodes[0], b.geometry, 'north').x,
  );
  expect(s.page.connections).toEqual(before.connections);
  expect(s.page.nodes[0].content).toEqual(before.nodes[0].content);
  expect(s.page.nodes[0].extensions).toEqual(before.nodes[0].extensions);
});
it('rejects invalid or protected batch changes atomically', () => {
  for (const mode of ['locked', 'hidden', 'future', 'invalid'] as const) {
    const s = setup();
    const [a, b] = s.page.nodes;
    if (mode === 'future') b.extensions[ELEMENT_KEY] = { version: 99 };
    if (mode === 'locked' || mode === 'hidden') {
      const layer = {
        ...s.page.layers[0],
        id: crypto.randomUUID(),
        locked: mode === 'locked',
        visible: mode !== 'hidden',
      };
      s.page.layers.push(layer);
      b.layerId = layer.id;
    }
    const before = structuredClone(s.project);
    expect(() =>
      s.run({
        type: 'transform',
        geometries: {
          [a.id]: { ...a.geometry, rotation: 90 },
          [b.id]: { ...b.geometry, rotation: mode === 'invalid' ? NaN : 90 },
        },
      }),
    ).toThrow();
    expect(s.project).toEqual(before);
  }
});
it('round-trips mirrored mixed content and creates one undo/redo step with a legacy reader gate', async () => {
  const s = setup(),
    history = new StudioHistory();
  const after = history.execute(
    s.project,
    s.documentId,
    s.pageId,
    {
      type: 'transform',
      geometries: Object.fromEntries(
        s.page.nodes.map((n) => [
          n.id,
          { ...n.geometry, rotation: 127, flipX: true },
        ]),
      ),
    },
    now,
  );
  expect(history.status().undo).toBe(1);
  expect(after.manifest.requiredFeatures).toContain('node-reflection-v1');
  const undo = history.travel(after, s.documentId, s.pageId, 'undo', now);
  expect(undo.documents).toEqual(s.project.documents);
  const redo = history.travel(undo, s.documentId, s.pageId, 'redo', now);
  expect(redo.documents).toEqual(after.documents);
  const imported = await importProject(await exportProject(redo));
  expect(imported.documents).toEqual(after.documents);
  validateProject(imported);
  const invalid = structuredClone(after);
  invalid.manifest.requiredFeatures = invalid.manifest.requiredFeatures.filter(
    (f) => f !== 'node-reflection-v1',
  );
  expect(() => validateProject(invalid)).toThrow();
});

it('rotates valid boundary angles without overflow and rejects invalid drafts', () => {
  const s = setup();
  for (const rotation of [1e12, -1e12]) {
    const g = { ...s.page.nodes[0].geometry, rotation };
    expect(transformedGeometry(g, 'rotateRight').rotation).toBe(
      normalizedRotation(normalizedRotation(rotation) + 90),
    );
    expect(transformedGeometry(g, 'rotateLeft').rotation).toBe(
      normalizedRotation(normalizedRotation(rotation) - 90),
    );
    expect(
      rotatedGeometries([{ ...s.page.nodes[0], geometry: g }], 90, true)[
        s.page.nodes[0].id
      ].rotation,
    ).toBe(normalizedRotation(normalizedRotation(rotation) + 90));
  }
  expect(() =>
    transformedGeometry(
      { ...s.page.nodes[0].geometry, rotation: 1e13 },
      'rotateRight',
    ),
  ).toThrow();
});
