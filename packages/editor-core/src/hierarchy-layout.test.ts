import { describe, expect, it } from 'vitest';
import { createProject, type Page } from '@koxora/project';
import { applyEdit } from './editing';
import { hierarchyGeometries } from './hierarchy-layout';
import { LINK_KEY } from './links';
import { buildScene } from './scene';
import { CONNECTION_KEY, type Geometry } from './shapes';
import { intersects, MAX_COORDINATE } from './viewport';

const now = '2026-11-23T12:00:00.000Z';
const id = () => crypto.randomUUID();

function addNode(page: Page, geometry: Geometry, kind = 'rectangle') {
  const node = {
    id: id(),
    kind,
    layerId: page.layers[0].id,
    geometry,
    content: { text: 'Label' },
    metadata: { 'org.example.metadata': 24 },
    assetIds: [],
    dataBindings: [],
    extensions: {},
  };
  page.nodes.push(node);
  return node;
}

function connect(page: Page, sourceId: string, targetId: string) {
  const edge = {
    id: id(),
    sourceId,
    targetId,
    layerId: page.layers[0].id,
    relationType: 'connection',
    waypoints: [{ x: 650, y: 48 }],
    extensions: {},
  };
  page.connections.push(edge);
  return edge;
}

function fixture() {
  const project = createProject('Chart', id, now);
  const [document] = project.documents;
  const [page] = document.pages;
  const root = addNode(page, {
    x: 100,
    y: -40,
    width: 100,
    height: 40,
    rotation: 0,
  });
  const left = addNode(page, {
    x: 20,
    y: -200,
    width: 70,
    height: 30,
    rotation: 0,
  });
  const right = addNode(page, {
    x: 460,
    y: -18,
    width: 110,
    height: 60,
    rotation: 0,
  });
  return { project, document, page, root, left, right };
}

describe('selected hierarchy layout', () => {
  it('preserves sibling order and arranges uneven, rotated branches without overlap', () => {
    const { project, document, page, root, left, right } = fixture();
    project.manifest.requiredFeatures.push('node-reflection-v1');
    const leafA = addNode(page, {
      x: 250,
      y: 145,
      width: 140,
      height: 70,
      rotation: 35,
      flipX: true,
    });
    const leafB = addNode(
      page,
      { x: 290, y: 114, width: 100, height: 45, rotation: 0 },
      'text',
    );
    const leafC = addNode(page, {
      x: 45,
      y: 164,
      width: 130,
      height: 45,
      rotation: 0,
    });
    const deep = addNode(page, {
      x: 220,
      y: 195,
      width: 104,
      height: 55,
      rotation: 0,
    });
    const edge = connect(page, root.id, right.id);
    connect(page, root.id, left.id);
    connect(page, left.id, leafB.id);
    connect(page, left.id, leafA.id);
    connect(page, right.id, leafC.id);
    connect(page, leafC.id, deep.id);
    page.connections[0].extensions[LINK_KEY] = {
      version: 1,
      type: 'url',
      url: 'https://example.com/',
    };
    const before = structuredClone(page);
    const selection = page.nodes
      .map(({ id }) => id)
      .reverse()
      .concat(edge.id);
    const outcome = hierarchyGeometries(buildScene(page), page, selection);
    expect(outcome).toEqual(
      hierarchyGeometries(buildScene(page), page, [...selection].reverse()),
    );
    if (!outcome.ok) throw new Error(outcome.reason);
    expect(outcome.geometries).not.toHaveProperty(root.id);
    expect(outcome.geometries[leafA.id]).toMatchObject({
      width: 140,
      height: 70,
      rotation: 35,
      flipX: true,
    });

    const updated = applyEdit(
      project,
      document.id,
      page.id,
      { type: 'transform', geometries: outcome.geometries },
      now,
    );
    const result = updated.documents[0].pages[0];
    expect(result.connections).toEqual(before.connections);
    expect(result.nodes[0]).toEqual(before.nodes[0]);
    expect(
      result.nodes.map(({ content, metadata, extensions }) => ({
        content,
        metadata,
        extensions,
      })),
    ).toEqual(
      before.nodes.map(({ content, metadata, extensions }) => ({
        content,
        metadata,
        extensions,
      })),
    );
    expect(page).toEqual(before);

    const scene = buildScene(result);
    const bounds = (id: string) =>
      scene.nodes.find((node) => node.id === id)!.bounds;
    expect(bounds(left.id).y).toBeCloseTo(bounds(right.id).y);
    expect(bounds(leafA.id).y).toBeCloseTo(bounds(leafB.id).y);
    expect(bounds(leafA.id).y).toBeCloseTo(bounds(leafC.id).y);
    expect(bounds(left.id).x).toBeLessThan(bounds(right.id).x);
    expect(bounds(leafA.id).x).toBeLessThan(bounds(leafB.id).x);
    expect(bounds(leafB.id).x).toBeLessThan(bounds(leafC.id).x);
    expect(bounds(deep.id).y).toBeGreaterThan(
      bounds(leafC.id).y + bounds(leafC.id).height,
    );
    for (const [i, node] of scene.nodes.entries())
      expect(
        scene.nodes
          .slice(i + 1)
          .some((other) => intersects(node.bounds, other.bounds)),
      ).toBe(false);
    expect(hierarchyGeometries(scene, result, selection)).toEqual({
      ok: true,
      geometries: {},
    });
  });

  it('uses stable IDs when sibling centers match', () => {
    const { page, root, left, right } = fixture();
    right.geometry.x =
      left.geometry.x + (left.geometry.width - right.geometry.width) / 2;
    connect(page, root.id, left.id);
    connect(page, root.id, right.id);
    const result = hierarchyGeometries(buildScene(page), page, [
      right.id,
      left.id,
      root.id,
    ]);
    if (!result.ok) throw new Error(result.reason);
    const [first, second] = [left.id, right.id].sort();
    expect(result.geometries[first].x).toBeLessThan(
      result.geometries[second].x,
    );
  });

  it('ignores floating, crossing, locked, hidden, and unsupported edges', () => {
    const { page, root, left, right } = fixture();
    const locked = { ...page.layers[0], id: id(), locked: true };
    const hidden = { ...page.layers[0], id: id(), visible: false };
    page.layers.push(locked, hidden);
    const junction = addNode(
      page,
      { x: 10, y: -500, width: 10, height: 10, rotation: 0 },
      'junction',
    );
    const base = connect(page, root.id, left.id);
    connect(page, left.id, junction.id);
    connect(page, left.id, right.id);
    connect(page, left.id, root.id).layerId = locked.id;
    connect(page, left.id, root.id).layerId = hidden.id;
    connect(page, left.id, root.id);
    page.connections.at(-1)!.extensions[CONNECTION_KEY] = { version: 99 };
    connect(page, left.id, root.id);
    const detached = page.connections.at(-1)!;
    delete detached.targetId;
    detached.targetPoint = { x: 28, y: 20 };

    expect(
      hierarchyGeometries(buildScene(page), page, [
        base.id,
        root.id,
        left.id,
        junction.id,
      ]).ok,
    ).toBe(true);
    base.layerId = locked.id;
    expect(
      hierarchyGeometries(buildScene(page), page, [
        base.id,
        root.id,
        left.id,
        junction.id,
      ]),
    ).toEqual({ ok: false, reason: 'structure' });
  });

  it.each([
    { name: 'detached component', edges: [[0, 1]] },
    {
      name: 'cycle',
      edges: [
        [0, 1],
        [1, 2],
        [2, 0],
      ],
    },
    {
      name: 'cycle disconnected from the root',
      edges: [
        [1, 2],
        [2, 1],
      ],
    },
    {
      name: 'multiple parents',
      edges: [
        [0, 1],
        [0, 2],
        [1, 2],
      ],
    },
    {
      name: 'parallel edges',
      edges: [
        [0, 1],
        [0, 1],
        [0, 2],
      ],
    },
    {
      name: 'self-connection',
      edges: [
        [0, 1],
        [0, 2],
        [2, 2],
      ],
    },
  ])('rejects $name without changing the page', ({ edges }) => {
    const { page } = fixture();
    const selection = page.nodes.map(({ id }) => id);
    for (const [from, to] of edges)
      connect(page, selection[from], selection[to]);
    const before = structuredClone(page);
    expect(hierarchyGeometries(buildScene(page), page, selection)).toEqual({
      ok: false,
      reason: 'structure',
    });
    expect(page).toEqual(before);
  });

  it('rejects too few selected shapes, selected drawings and noneditable nodes', () => {
    const { page, root, left, right } = fixture();
    const edge = connect(page, root.id, left.id);
    const line = addNode(
      page,
      { x: 70, y: 190, width: 90, height: 10, rotation: 0 },
      'arrow',
    );
    const locked = { ...page.layers[0], id: id(), locked: true };
    page.layers.push(locked);
    right.layerId = locked.id;
    const scene = buildScene(page);
    for (const selected of [
      [root.id, edge.id],
      [root.id, left.id, right.id],
      [root.id, left.id, line.id],
      [root.id, left.id, id()],
    ])
      expect(hierarchyGeometries(scene, page, selected)).toEqual({
        ok: false,
        reason: 'selection',
      });
  });

  it('checks transformed obstacles beyond the current viewport, including locked layers', () => {
    const { page, root, left } = fixture();
    root.geometry.y = 5000;
    connect(page, root.id, left.id);
    const selection = [root.id, left.id];
    const initial = hierarchyGeometries(buildScene(page), page, selection);
    if (!initial.ok) throw new Error(initial.reason);
    const target = initial.geometries[left.id];
    const occupied = addNode(page, {
      x: target.x + target.width + 6,
      y: target.y - 10,
      width: 8,
      height: 75,
      rotation: 90,
    });
    const obstacleLayer = { ...page.layers[0], id: id(), locked: true };
    page.layers.push(obstacleLayer);
    occupied.layerId = obstacleLayer.id;
    expect(hierarchyGeometries(buildScene(page), page, selection)).toEqual({
      ok: false,
      reason: 'occupied',
    });
    occupied.geometry.rotation = 0;
    expect(hierarchyGeometries(buildScene(page), page, selection)).toEqual(
      initial,
    );
    occupied.geometry.rotation = 90;
    obstacleLayer.visible = false;
    expect(hierarchyGeometries(buildScene(page), page, selection)).toEqual(
      initial,
    );
  });

  it.each(['x', 'y'] as const)(
    'refuses a proposed %s coordinate beyond the editing boundary',
    (axis) => {
      const { page, root, left } = fixture();
      connect(page, root.id, left.id);
      root.geometry[axis] = MAX_COORDINATE - 2;
      expect(
        hierarchyGeometries(buildScene(page), page, [root.id, left.id]),
      ).toEqual({ ok: false, reason: 'bounds' });
    },
  );
});
