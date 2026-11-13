import type { Node } from '@koxora/project';
import { type Geometry } from './shapes';

export const transformActions = [
  'rotateLeft',
  'rotateRight',
  'flipHorizontal',
  'flipVertical',
] as const;
export type TransformAction = (typeof transformActions)[number];
export function normalizedRotation(degrees: number): number {
  if (!Number.isFinite(degrees) || Math.abs(degrees) > 1e12)
    throw new Error('Invalid rotation');
  return ((degrees % 360) + 360) % 360;
}
/** Every selected element keeps its own center; labels are never reflected. */
export function transformedGeometry(
  g: Geometry,
  action: TransformAction,
): Geometry {
  switch (action) {
    case 'rotateLeft':
      return {
        ...g,
        rotation: normalizedRotation(normalizedRotation(g.rotation) - 90),
      };
    case 'rotateRight':
      return {
        ...g,
        rotation: normalizedRotation(normalizedRotation(g.rotation) + 90),
      };
    case 'flipHorizontal':
      return { ...g, flipX: g.flipX !== true };
    case 'flipVertical':
      return { ...g, flipY: g.flipY !== true };
  }
}
export function rotatedGeometries(
  nodes: readonly Node[],
  degrees: number,
  relative = false,
): Record<string, Geometry> {
  normalizedRotation(degrees);
  return Object.fromEntries(
    nodes.map((n) => [
      n.id,
      {
        ...n.geometry,
        rotation: normalizedRotation(
          (relative ? normalizedRotation(n.geometry.rotation) : 0) +
            normalizedRotation(degrees),
        ),
      },
    ]),
  );
}
