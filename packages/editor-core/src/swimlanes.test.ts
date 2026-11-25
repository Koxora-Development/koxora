import { describe, expect, it } from 'vitest';
import {
  createProject,
  SWIMLANES_FEATURE,
  type Layer,
  type Node,
} from '@koxora/project';
import {
  applyEdit,
  buildScene,
  connectionError,
  connectionPortsForNode,
  flowGeometries,
  marqueeSelection,
  pickNode,
  shapeRegistry,
  swimlaneContents,
  swimlaneHeaderBox,
  type Geometry,
} from './index';

function layer(id: string, visible = true, locked = false): Layer {
  return { id, title: id, visible, locked, extensions: {} };
}

function node(
  id: string,
  kind: string,
  geometry: Partial<Geometry>,
  layerId = 'main',
): Node {
  return {
    id,
    kind,
    geometry: { x: 0, y: 0, width: 80, height: 40, rotation: 0, ...geometry },
    layerId,
    content: {},
    metadata: {},
    assetIds: [],
    dataBindings: [],
    extensions: {},
  };
}

describe('swimlane geometry', () => {
  it.each(['swimlane-horizontal', 'swimlane-vertical'] as const)(
    '%s keeps its label inside the header and exposes no connection ports',
    (kind) => {
      const definition = shapeRegistry[kind];
      const { width, height } = definition;
      const heading = swimlaneHeaderBox(kind, width, height);
      const label = definition.labelBox!(width, height);
      expect(label.x).toBeGreaterThan(heading.x);
      expect(label.y).toBeGreaterThan(heading.y);
      expect(label.x + label.width).toBeLessThan(heading.width);
      expect(label.y + label.height).toBeLessThan(heading.height);
      const divider =
        kind === 'swimlane-horizontal'
          ? `M ${heading.width} 0 V ${height}`
          : `M 0 ${heading.height} H ${width}`;
      expect(definition.path(width, height, 0)).toContain(divider);
      expect(
        connectionPortsForNode(node('lane', kind, { width, height })),
      ).toEqual([]);
    },
  );

  it('finds wholly contained editable steps in scene order', () => {
    const lane = node('lane', 'swimlane-horizontal', {
      width: 720,
      height: 160,
    });
    const scene = buildScene({
      layers: [
        layer('main'),
        layer('upper'),
        layer('locked', true, true),
        layer('hidden', false),
      ],
      connections: [],
      nodes: [
        lane,
        node('upper-step', 'rectangle', { x: 230, y: 50 }, 'upper'),
        node('main-step', 'rectangle', { x: 150, y: 20 }),
        node('heading', 'text', { x: 10, y: 20 }),
        node('over-divider', 'rectangle', { x: 110, y: 20 }),
        node('over-border', 'rectangle', { x: 700, y: 40 }),
        node('another-lane', 'swimlane-vertical', { x: 320, y: 40 }),
        node('locked-step', 'rectangle', { x: 340, y: 40 }, 'locked'),
        node('hidden-step', 'rectangle', { x: 360, y: 40 }, 'hidden'),
      ],
    });
    expect(swimlaneContents(scene, lane.id)).toEqual([
      'main-step',
      'upper-step',
    ]);
    expect(swimlaneContents(scene, 'main-step')).toEqual([]);
    expect(swimlaneContents(scene, 'unknown')).toEqual([]);
  });

  it('checks rotated steps against the lane body after reflection', () => {
    const lane = node('lane', 'swimlane-horizontal', {
      width: 200,
      height: 100,
      rotation: 90,
      flipX: true,
    });
    const scene = buildScene({
      layers: [layer('main')],
      connections: [],
      nodes: [
        lane,
        node('process', 'rectangle', {
          x: 90,
          y: 70,
          width: 20,
          height: 40,
          rotation: 90,
          flipY: true,
        }),
        node('crosses-divider', 'rectangle', {
          x: 90,
          y: 70,
          width: 20,
          height: 40,
        }),
        node('over-header', 'text', { x: 70, y: 112, width: 60, height: 24 }),
      ],
    });
    // The mirrored header starts at world y=102. The rotated step ends at
    // y=100, while the otherwise identical unrotated step ends at y=110.
    expect(swimlaneContents(scene, lane.id)).toEqual(['process']);
  });

  it('uses the top header boundary for vertical lanes', () => {
    const lane = node('lane', 'swimlane-vertical', { width: 200, height: 550 });
    const scene = buildScene({
      layers: [layer('main')],
      connections: [],
      nodes: [
        lane,
        node('process', 'rectangle', { x: 60, y: 60 }),
        node('over-header', 'rectangle', { x: 60, y: 50 }),
      ],
    });
    expect(swimlaneContents(scene, lane.id)).toEqual(['process']);
  });

  it('keeps a newly drawn lane behind the process and picks its empty body', () => {
    const page = {
      layers: [layer('main')],
      connections: [],
      nodes: [
        node('first', 'rectangle', { x: 180, y: 50 }),
        node('next', 'rectangle', { x: 400, y: 50 }),
        node('lane', 'swimlane-horizontal', { width: 720, height: 160 }),
      ],
    };
    const scene = buildScene(page);
    expect(scene.nodes.map((item) => item.id)).toEqual([
      'lane',
      'first',
      'next',
    ]);
    expect(pickNode(scene, { x: 30, y: 60 })?.id).toBe('lane');
    expect(pickNode(scene, { x: 200, y: 60 })?.id).toBe('first');
    expect(pickNode(scene, { x: 300, y: 60 })?.id).toBe('lane');
    expect(
      marqueeSelection(scene, { x: 160, y: 25, width: 120, height: 85 }),
    ).toEqual(['first']);
    expect(connectionError(page, 'first', 'lane', 'main', true)).toBe(
      'endpoint',
    );
    expect(flowGeometries(scene, page, ['first', 'next'])).toEqual({
      ok: false,
      reason: 'swimlane',
    });
  });

  it('declares the required feature when a lane is pasted into a blank drawing', () => {
    const now = '2026-11-25T00:00:00.000Z';
    const project = createProject('Lanes', () => crypto.randomUUID(), now);
    const doc = project.documents[0];
    const page = doc.pages[0];
    const laneId = crypto.randomUUID();
    const insertedId = crypto.randomUUID();
    const next = applyEdit(
      project,
      doc.id,
      page.id,
      {
        type: 'paste',
        nodes: [
          node(
            laneId,
            'swimlane-vertical',
            { width: 200, height: 550 },
            page.layers[0].id,
          ),
        ],
        connections: [],
        idMap: { [laneId]: insertedId },
        offset: { x: 10, y: 15 },
        layerId: page.layers[0].id,
      },
      now,
    );
    expect(next.manifest.requiredFeatures).toContain(SWIMLANES_FEATURE);
    expect(next.documents[0].pages[0].nodes[0]).toMatchObject({
      id: insertedId,
      geometry: { x: 10, y: 15 },
    });
  });
});
