import { describe, expect, it } from 'vitest';
import type { Scene, SceneNode } from './scene';
import { DEFAULT_APPEARANCE, geometryBounds, type Geometry } from './shapes';
import { snapSwimlaneGeometry, snapSwimlaneMove } from './swimlanes';

function laneGeometry(x: number, y: number, rotation = 0): Geometry {
  return { x, y, width: 720, height: 160, rotation };
}

function sceneNode(
  id: string,
  geometry: Geometry,
  kind = 'swimlane-horizontal',
  layerOrder = 0,
): SceneNode {
  return {
    id,
    kind,
    geometry,
    bounds: geometryBounds(geometry),
    label: '',
    style: DEFAULT_APPEARANCE,
    editable: true,
    layerOrder,
    paintOrder: 0,
  };
}

function scene(...nodes: SceneNode[]): Scene {
  return { nodes, connections: [], bounds: null };
}

describe('swimlane seam snapping', () => {
  it('aligns horizontal starts and joins either edge without resizing', () => {
    const drawing = scene(sceneNode('target', laneGeometry(100, 200)));
    for (const [before, after] of [
      [42, 40],
      [358, 360],
    ]) {
      const proposed = { ...laneGeometry(104, before), flipY: true };
      expect(
        snapSwimlaneGeometry(drawing, 'swimlane-horizontal', proposed, 5, 0),
      ).toEqual({ ...proposed, x: 100, y: after });
    }
  });

  it('aligns vertical starts and joins either side of a visible lane', () => {
    const target = { ...laneGeometry(100, 200), width: 200, height: 550 };
    const drawing = scene({
      ...sceneNode('target', target, 'swimlane-vertical', 2),
      editable: false,
    });
    for (const [before, after] of [
      [-98, -100],
      [298, 300],
    ]) {
      const proposed = { ...target, x: before, y: 203 };
      expect(
        snapSwimlaneGeometry(drawing, 'swimlane-vertical', proposed, 5, 2),
      ).toEqual({ ...proposed, x: after, y: 200 });
    }
  });

  it('leaves unmatched orientations, layers, rotations and large offsets alone', () => {
    const proposed = laneGeometry(0, 160);
    const drawing = scene(
      sceneNode('other-layer', laneGeometry(0, 0), 'swimlane-horizontal', 1),
      sceneNode('other-orientation', laneGeometry(0, 0), 'swimlane-vertical'),
      sceneNode('rotated', laneGeometry(0, 0, 90)),
      sceneNode('too-far-on-start', laneGeometry(8, 0)),
      sceneNode('too-far-on-seam', laneGeometry(0, 8)),
    );
    expect(
      snapSwimlaneGeometry(drawing, 'swimlane-horizontal', proposed, 7, 0),
    ).toBeNull();
    const rotated = laneGeometry(0, 161, 180);
    expect(
      snapSwimlaneGeometry(
        scene(sceneNode('target', laneGeometry(0, 0))),
        'swimlane-horizontal',
        rotated,
        7,
        0,
      ),
    ).toBeNull();
  });

  it('recognizes exact off-grid seams only in the same layer', () => {
    const target = sceneNode(
      'target',
      laneGeometry(13, 7),
      'swimlane-horizontal',
      2,
    );
    const proposed = laneGeometry(13, 167);
    expect(
      snapSwimlaneGeometry(scene(target), target.kind, proposed, 8, 2),
    ).toBe(proposed);
    expect(
      snapSwimlaneGeometry(scene(target), target.kind, proposed, 8, 1),
    ).toBeNull();
    const moving = sceneNode('moving', laneGeometry(80, 100), target.kind, 2);
    const exact = { moving: proposed };
    expect(snapSwimlaneMove(scene(target, moving), exact, 8)).toBe(exact);
    expect(
      snapSwimlaneMove(scene(target, { ...moving, layerOrder: 1 }), exact, 8),
    ).toBeNull();
  });

  it('aligns mirrored headings by their right or bottom edges', () => {
    const horizontal = sceneNode('horizontal', {
      ...laneGeometry(100, 200),
      flipX: true,
    });
    const vertical = sceneNode(
      'vertical',
      {
        ...laneGeometry(100, 260),
        width: 200,
        height: 550,
        flipY: true,
      },
      'swimlane-vertical',
    );
    const proposedHorizontal = {
      ...horizontal.geometry,
      width: 600,
      x: 223,
      y: 358,
    };
    const proposedVertical = {
      ...vertical.geometry,
      height: 400,
      x: 298,
      y: 413,
    };
    const drawing = scene(horizontal, vertical);
    expect(
      snapSwimlaneGeometry(drawing, horizontal.kind, proposedHorizontal, 5, 0),
    ).toEqual({ ...proposedHorizontal, x: 220, y: 360 });
    expect(
      snapSwimlaneGeometry(drawing, vertical.kind, proposedVertical, 5, 0),
    ).toEqual({ ...proposedVertical, x: 300, y: 410 });
    expect(
      snapSwimlaneGeometry(
        drawing,
        horizontal.kind,
        laneGeometry(103, 358),
        5,
        0,
      ),
    ).toBeNull();
    expect(
      snapSwimlaneGeometry(
        drawing,
        vertical.kind,
        { ...vertical.geometry, x: 298, y: 263, flipY: false },
        5,
        0,
      ),
    ).toBeNull();
  });

  it('chooses the nearest seam and retains scene order on ties', () => {
    const first = sceneNode('first', laneGeometry(4, 3));
    const second = sceneNode('second', laneGeometry(-3, -4));
    const near = sceneNode('near', laneGeometry(1, 1));
    const proposed = laneGeometry(0, 160);
    expect(
      snapSwimlaneGeometry(
        scene(first, second),
        'swimlane-horizontal',
        proposed,
        5,
        0,
      ),
    ).toEqual({ ...proposed, x: 4, y: 163 });
    expect(
      snapSwimlaneGeometry(
        scene(first, second, near),
        'swimlane-horizontal',
        proposed,
        5,
        0,
      ),
    ).toEqual({ ...proposed, x: 1, y: 161 });
  });

  it('moves selected process steps with one lane and ignores the moving lane itself', () => {
    const moving = sceneNode('moving', laneGeometry(0, 0));
    const step = sceneNode(
      'step',
      { x: 180, y: 60, width: 80, height: 40, rotation: 15 },
      'rectangle',
    );
    const target = sceneNode('target', laneGeometry(5, -1));
    const proposed = {
      moving: laneGeometry(2, 160),
      step: { ...step.geometry, x: 182, y: 220 },
    };
    expect(snapSwimlaneMove(scene(moving, step), proposed, 5)).toBeNull();
    const snapped = snapSwimlaneMove(scene(moving, step, target), proposed, 5);
    expect(snapped).toEqual({
      moving: { ...proposed.moving, x: 5, y: 159 },
      step: { ...proposed.step, x: 185, y: 219 },
    });
    expect(snapSwimlaneMove(scene(moving, step, target), snapped!, 5)).toBe(
      snapped,
    );
    const multiple = { ...proposed, target: laneGeometry(5, 0) };
    expect(
      snapSwimlaneMove(scene(moving, step, target), multiple, 5),
    ).toBeNull();
  });
});
