import { isSwimlaneKind } from '@koxora/project';
import type { Scene } from './scene';
import {
  geometryBounds,
  rotatePoint,
  swimlaneHeaderBox,
  type Geometry,
} from './shapes';
import { MAX_COORDINATE, type Point } from './viewport';

export { isSwimlaneKind as isSwimlane } from '@koxora/project';

/** Measure a step in the lane's local frame, even when either shape is rotated. */
function boundsInLane(step: Geometry, lane: Geometry) {
  const offset = rotatePoint(
    {
      x: step.x - lane.x + (step.width - lane.width) / 2,
      y: step.y - lane.y + (step.height - lane.height) / 2,
    },
    { x: 0, y: 0 },
    -lane.rotation,
  );
  // Reflection changes the local center. The bounding rectangle's extents
  // are symmetric and the reflection leaves their lengths unchanged.
  const x = lane.flipX === true ? -offset.x : offset.x;
  const y = lane.flipY === true ? -offset.y : offset.y;
  return geometryBounds({
    x: x + (lane.width - step.width) / 2,
    y: y + (lane.height - step.height) / 2,
    width: step.width,
    height: step.height,
    rotation: step.rotation - lane.rotation,
  });
}

/** Return editable steps wholly inside a lane body, in the current scene order. */
export function swimlaneContents(scene: Scene, laneId: string): string[] {
  const lane = scene.nodes.find((node) => node.id === laneId);
  if (!lane?.editable || !isSwimlaneKind(lane.kind)) return [];
  const { width, height } = lane.geometry;
  const header = swimlaneHeaderBox(lane.kind, width, height);
  const left = lane.kind === 'swimlane-horizontal' ? header.width : 0;
  const top = lane.kind === 'swimlane-vertical' ? header.height : 0;
  const tolerance = 1e-7;
  return scene.nodes
    .filter((step) => {
      if (!step.editable || isSwimlaneKind(step.kind)) return false;
      const box = boundsInLane(step.geometry, lane.geometry);
      return (
        box.x >= left - tolerance &&
        box.y >= top - tolerance &&
        box.x + box.width <= width + tolerance &&
        box.y + box.height <= height + tolerance
      );
    })
    .map((step) => step.id);
}

/** Find the closest compatible seam, retaining geometry on exact alignment. */
export function snapSwimlaneGeometry(
  scene: Scene,
  kind: string,
  geometry: Geometry,
  tolerance: number,
  layerOrder: number,
  movingIds?: ReadonlySet<string>,
): Geometry | null {
  if (
    !isSwimlaneKind(kind) ||
    geometry.rotation % 360 !== 0 ||
    !Number.isFinite(tolerance) ||
    tolerance < 0
  )
    return null;

  const horizontal = kind === 'swimlane-horizontal';
  const startAxis = horizontal ? 'x' : 'y';
  const startSize = horizontal ? 'width' : 'height';
  const headingFlip = horizontal ? 'flipX' : 'flipY';
  const headingAtEnd = geometry[headingFlip] === true;
  const seamAxis = horizontal ? 'y' : 'x';
  const seamSize = horizontal ? 'height' : 'width';
  let nearest: Point | undefined;
  let distance = Infinity;
  for (const lane of scene.nodes) {
    if (
      lane.kind !== kind ||
      lane.layerOrder !== layerOrder ||
      lane.geometry.rotation % 360 !== 0 ||
      (lane.geometry[headingFlip] === true) !== headingAtEnd ||
      movingIds?.has(lane.id)
    )
      continue;
    const start =
      lane.geometry[startAxis] +
      (headingAtEnd ? lane.geometry[startSize] - geometry[startSize] : 0);
    const startOffset = start - geometry[startAxis];
    if (Math.abs(startOffset) > tolerance || Math.abs(start) > MAX_COORDINATE)
      continue;
    for (const seam of [
      lane.geometry[seamAxis] - geometry[seamSize],
      lane.geometry[seamAxis] + lane.geometry[seamSize],
    ]) {
      const seamOffset = seam - geometry[seamAxis];
      if (Math.abs(seamOffset) > tolerance || Math.abs(seam) > MAX_COORDINATE)
        continue;
      const gap = Math.hypot(startOffset, seamOffset);
      // Scene order breaks ties consistently during the entire gesture.
      if (gap >= distance) continue;
      nearest = horizontal ? { x: start, y: seam } : { x: seam, y: start };
      distance = gap;
    }
  }
  if (!nearest) return null;
  return distance === 0 ? geometry : { ...geometry, ...nearest };
}

/** Translate the entire selection by the correction of its single moving lane. */
export function snapSwimlaneMove(
  scene: Scene,
  proposed: Record<string, Geometry>,
  tolerance: number,
): Record<string, Geometry> | null {
  const moving = new Set(Object.keys(proposed));
  const lanes = scene.nodes.filter(
    (node) => moving.has(node.id) && isSwimlaneKind(node.kind),
  );
  if (lanes.length !== 1 || !lanes[0].editable) return null;

  const lane = lanes[0];
  const geometry = proposed[lane.id];
  const snapped = snapSwimlaneGeometry(
    scene,
    lane.kind,
    geometry,
    tolerance,
    lane.layerOrder,
    moving,
  );
  if (!snapped) return null;
  if (snapped === geometry) return proposed;

  const dx = snapped.x - geometry.x;
  const dy = snapped.y - geometry.y;
  const moved = Object.entries(proposed).map(
    ([id, geom]) =>
      [
        id,
        id === lane.id ? snapped : { ...geom, x: geom.x + dx, y: geom.y + dy },
      ] as const,
  );
  return moved.every(
    ([, { x, y }]) =>
      Math.abs(x) <= MAX_COORDINATE && Math.abs(y) <= MAX_COORDINATE,
  )
    ? Object.fromEntries(moved)
    : null;
}
