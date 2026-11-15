import { describe, expect, it } from 'vitest';
import { createProject, type Connection, type Node } from '@koxora/project';
import {
  buildScene,
  CONNECTION_KEY,
  ELEMENT_KEY,
  FREEHAND_KEY,
  freehandGeometry,
  freehandTextBox,
  geometryBounds,
  pickNode,
  rotatePoint,
  shapeCenter,
  transformScene,
} from './index';

function fixture() {
  const project = createProject(
    'Scene endpoint review',
    () => crypto.randomUUID(),
    '2026-11-15T08:00:00.000Z',
  );
  const page = project.documents[0].pages[0];
  const makeNode = (x: number): Node => ({
    id: crypto.randomUUID(),
    kind: 'rectangle',
    layerId: page.layers[0].id,
    geometry: { x, y: 0, width: 160, height: 100, rotation: 0 },
    content: { text: '' },
    metadata: {},
    assetIds: [],
    dataBindings: [],
    extensions: { [ELEMENT_KEY]: { version: 1 } },
  });
  page.nodes = [makeNode(0), makeNode(300)];
  return {
    page,
    source: page.nodes[0],
    target: page.nodes[1],
    makeEdge: (sourceAttached = true, targetAttached = true): Connection => ({
      id: crypto.randomUUID(),
      layerId: page.layers[0].id,
      relationType: 'connection',
      waypoints: [],
      ...(sourceAttached
        ? { sourceId: page.nodes[0].id }
        : { sourcePoint: { x: -40, y: 50 } }),
      ...(targetAttached
        ? { targetId: page.nodes[1].id }
        : { targetPoint: { x: 500, y: 50 } }),
      extensions: {
        [CONNECTION_KEY]: {
          version: 1,
          routing: 'straight',
          arrow: true,
          startArrow: true,
          label: 'Route',
        },
      },
    }),
  };
}

describe('floating connection scene projection', () => {
  for (const sourceAttached of [false, true])
    for (const targetAttached of [false, true])
      it(`renders source ${sourceAttached ? 'attached' : 'floating'} and target ${targetAttached ? 'attached' : 'floating'}`, () => {
        const f = fixture();
        f.page.connections = [f.makeEdge(sourceAttached, targetAttached)];
        const scene = buildScene(f.page);
        expect(scene.connections).toHaveLength(1);
        const edge = scene.connections[0];
        expect(edge.editable).toBe(true);
        expect(edge.arrow).toBe(true);
        expect(edge.startArrow).toBe(true);
        expect(edge.points[0].x).toBeCloseTo(sourceAttached ? 160 : -40, 7);
        expect(edge.points[0].y).toBeCloseTo(50, 7);
        expect(edge.points.at(-1)!.x).toBeCloseTo(
          targetAttached ? 300 : 500,
          7,
        );
        expect(edge.points.at(-1)!.y).toBeCloseTo(50, 7);
      });

  it('requires visible attached nodes while independently floating ends stay visible', () => {
    const f = fixture();
    const hiddenLayer = {
      ...f.page.layers[0],
      id: crypto.randomUUID(),
      visible: false,
    };
    f.page.layers.push(hiddenLayer);
    f.source.layerId = hiddenLayer.id;
    f.page.connections = [f.makeEdge(true, false), f.makeEdge(false, false)];
    const scene = buildScene(f.page);
    expect(scene.connections.map((edge) => edge.id)).toEqual([
      f.page.connections[1].id,
    ]);
    f.page.layers[0].visible = false;
    expect(buildScene(f.page).connections).toEqual([]);
  });

  it('inherits attached endpoint protection without locking unrelated floating connections', () => {
    const f = fixture();
    const lockedLayer = {
      ...f.page.layers[0],
      id: crypto.randomUUID(),
      locked: true,
    };
    f.page.layers.push(lockedLayer);
    f.source.layerId = lockedLayer.id;
    f.page.connections = [f.makeEdge(true, false), f.makeEdge(false, false)];
    expect(buildScene(f.page).connections.map((edge) => edge.editable)).toEqual(
      [false, true],
    );
  });

  it('moves attached endpoints while keeping their floating counterpart fixed', () => {
    const f = fixture();
    f.page.connections = [f.makeEdge(true, false), f.makeEdge(false, false)];
    const scene = buildScene(f.page);
    const moved = transformScene(scene, f.page, {
      [f.source.id]: { ...f.source.geometry, x: 48, y: 24 },
    });
    expect(moved.connections[0].points[0]).not.toEqual(
      scene.connections[0].points[0],
    );
    expect(moved.connections[0].points.at(-1)).toEqual(
      scene.connections[0].points.at(-1),
    );
    expect(moved.connections[1]).toBe(scene.connections[1]);
  });

  it('omits ambiguous or missing endpoint previews without inventing shape references', () => {
    const f = fixture();
    const edge = f.makeEdge(false, false);
    edge.sourcePoint = undefined;
    f.page.connections = [edge];
    expect(buildScene(f.page).connections).toEqual([]);
    edge.sourceId = f.source.id;
    edge.sourcePoint = { x: 0, y: 0 };
    expect(buildScene(f.page).connections).toEqual([]);
  });

  it('includes both large arrowheads in the conservative scene bounds', () => {
    const f = fixture();
    const edge = f.makeEdge(false, false);
    edge.extensions[CONNECTION_KEY] = {
      version: 1,
      arrow: true,
      startArrow: true,
      style: { strokeWidth: 32 },
    };
    f.page.connections = [edge];
    const bounds = buildScene(f.page).connections[0].bounds;
    expect(bounds.x).toBeLessThanOrEqual(-168);
    expect(bounds.x + bounds.width).toBeGreaterThanOrEqual(628);
  });
});

describe('centered freehand text scenes', () => {
  for (const rotation of [0, 90, 135])
    it(`only expands a stroke's pick area when text exists, at ${rotation} degrees`, () => {
      const f = fixture();
      const stroke = freehandGeometry([{ x: 20, y: 20 }]);
      const node: Node = {
        ...f.source,
        kind: 'freehand',
        geometry: { ...stroke.geometry, rotation, flipX: true },
        extensions: {
          ...f.source.extensions,
          [FREEHAND_KEY]: stroke.extension,
        },
      };
      f.page.nodes = [node];
      const center = shapeCenter(node.geometry);
      const labelPoint = rotatePoint(
        { x: center.x + 48, y: center.y },
        center,
        rotation,
      );
      const empty = buildScene(f.page);
      expect(pickNode(empty, labelPoint)).toBeUndefined();
      expect(empty.nodes[0].bounds).toEqual(
        geometryBounds(node.geometry, empty.nodes[0].style.strokeWidth / 2),
      );
      node.content.text = 'Stroke label';
      const labelled = buildScene(f.page);
      expect(pickNode(labelled, labelPoint)?.id).toBe(node.id);
      const box = freehandTextBox(node.geometry);
      expect(box.x + box.width / 2).toBe(node.geometry.width / 2);
      expect(box.y + box.height / 2).toBe(node.geometry.height / 2);
      expect(labelled.nodes[0].bounds.width).toBeGreaterThan(
        empty.nodes[0].bounds.width,
      );
    });
});
