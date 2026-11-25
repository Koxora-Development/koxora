import { isSwimlaneKind } from '@koxora/project';
import type { Scene } from './scene';
import {
  geometryBounds,
  rotatePoint,
  swimlaneHeaderBox,
  type Geometry,
} from './shapes';

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
