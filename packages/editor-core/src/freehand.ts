import type { Json, Node } from '@koxora/project';
import { jsonObject, rotatePoint, shapeCenter, type Geometry } from './shapes';
import { segmentDistance } from './interaction';
import type { Point } from './viewport';

export const FREEHAND_KEY = 'org.koxora.freehand';
export const MAX_FREEHAND_POINTS = 8192;
export function readFreehand(
  node: Pick<Node, 'extensions'>,
): Point[] | undefined {
  const value = jsonObject(node.extensions[FREEHAND_KEY]);
  if (
    value.version !== 1 ||
    Object.keys(value).some((k) => !['version', 'points'].includes(k)) ||
    !Array.isArray(value.points) ||
    !value.points.length ||
    value.points.length > MAX_FREEHAND_POINTS
  )
    return undefined;
  if (
    !value.points.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        p.every(
          (n) =>
            typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1,
        ),
    )
  )
    return undefined;
  return (value.points as number[][]).map(([x, y]) => ({ x, y }));
}
/** Store bounded coordinates relative to the node so move/resize/copy remain ordinary node operations. */
export function freehandGeometry(points: Point[]): {
  geometry: Geometry;
  extension: Json;
} {
  if (
    !points.length ||
    points.length > MAX_FREEHAND_POINTS ||
    points.some(
      (p) =>
        ![p.x, p.y].every((n) => Number.isFinite(n) && Math.abs(n) <= 1e12),
    )
  )
    throw new Error('Invalid stroke');
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const p of points) {
    left = Math.min(left, p.x);
    top = Math.min(top, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  const width = Math.max(8, right - left),
    height = Math.max(8, bottom - top);
  const x = left - (width - (right - left)) / 2,
    y = top - (height - (bottom - top)) / 2;
  return {
    geometry: { x, y, width, height, rotation: 0 },
    extension: {
      version: 1,
      points: points.map((p) => [(p.x - x) / width, (p.y - y) / height]),
    },
  };
}
export function freehandPath(points: Point[], geometry: Geometry): string {
  return (
    points
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'} ${p.x * geometry.width} ${p.y * geometry.height}`,
      )
      .join(' ') + (points.length === 1 ? ' l 0.001 0' : '')
  );
}
export function freehandContains(
  points: Point[],
  geometry: Geometry,
  point: Point,
  tolerance: number,
): boolean {
  const local = rotatePoint(point, shapeCenter(geometry), -geometry.rotation);
  const p = { x: local.x - geometry.x, y: local.y - geometry.y };
  const scaled = (q: Point) => ({
    x: q.x * geometry.width,
    y: q.y * geometry.height,
  });
  if (points.length === 1)
    return (
      segmentDistance(p, scaled(points[0]), scaled(points[0])) <= tolerance
    );
  return points.some(
    (q, i) =>
      i > 0 &&
      segmentDistance(p, scaled(points[i - 1]), scaled(q)) <= tolerance,
  );
}
