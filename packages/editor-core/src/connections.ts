import type { Connection, Node } from '@koxora/project';
import {
  anchorPoint,
  CONNECTION_KEY,
  jsonObject,
  MAX_TEXT,
  shapeCenter,
  type Anchor,
} from './shapes';
import type { Point, Bounds } from './viewport';
export type Routing = 'straight' | 'orthogonal' | 'curved';
export interface ConnectionOptions {
  routing: Routing;
  arrow: boolean;
  label: string;
  sourceAnchor: Anchor;
  targetAnchor: Anchor;
}
export const DEFAULT_CONNECTION: ConnectionOptions = {
  routing: 'straight',
  arrow: true,
  label: '',
  sourceAnchor: 'auto',
  targetAnchor: 'auto',
};
export function readConnection(edge: Connection): ConnectionOptions {
  const v = jsonObject(edge.extensions[CONNECTION_KEY]);
  const anchor = (value: unknown): Anchor =>
    typeof value === 'string' &&
    ['auto', 'north', 'east', 'south', 'west'].includes(value)
      ? (value as Anchor)
      : 'auto';
  return {
    routing:
      v.version === 1 &&
      typeof v.routing === 'string' &&
      ['straight', 'orthogonal', 'curved'].includes(v.routing)
        ? (v.routing as Routing)
        : 'straight',
    arrow: v.version === 1 && v.arrow === true,
    label:
      v.version === 1 && typeof v.label === 'string'
        ? v.label.slice(0, MAX_TEXT)
        : '',
    sourceAnchor: v.version === 1 ? anchor(v.sourceAnchor) : 'auto',
    targetAnchor: v.version === 1 ? anchor(v.targetAnchor) : 'auto',
  };
}
export function pointsBounds(points: Point[], padding = 0): Bounds {
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const p of points) {
    x = Math.min(x, p.x);
    y = Math.min(y, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  return {
    x: x - padding,
    y: y - padding,
    width: right - x + 2 * padding,
    height: bottom - y + 2 * padding,
  };
}
export interface ConnectionPath {
  path: string;
  points: Point[];
  bounds: Bounds;
  labelPoint: Point;
  angle: number;
}
export function connectionPath(
  source: Node,
  target: Node,
  options: ConnectionOptions,
  waypoints: Point[] = [],
  sourceRadius = 16,
  targetRadius = 16,
): ConnectionPath {
  const a = shapeCenter(source.geometry),
    b = shapeCenter(target.geometry);
  const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const sourceToward =
    options.routing === 'orthogonal'
      ? { x: horizontal ? b.x : a.x, y: horizontal ? a.y : b.y }
      : b;
  const targetToward =
    options.routing === 'orthogonal'
      ? { x: horizontal ? a.x : b.x, y: horizontal ? b.y : a.y }
      : a;
  const start = anchorPoint(
    source,
    waypoints[0] ?? sourceToward,
    options.sourceAnchor,
    sourceRadius,
  );
  const end = anchorPoint(
    target,
    waypoints.at(-1) ?? targetToward,
    options.targetAnchor,
    targetRadius,
  );
  let points = [start, ...waypoints, end];
  if (!waypoints.length && options.routing !== 'straight') {
    const x = (start.x + end.x) / 2,
      y = (start.y + end.y) / 2;
    points = horizontal
      ? [start, { x, y: start.y }, { x, y: end.y }, end]
      : [start, { x: start.x, y }, { x: end.x, y }, end];
  }
  const curved = options.routing === 'curved' && !waypoints.length;
  const path = curved
    ? `M ${start.x} ${start.y} C ${points[1].x} ${points[1].y} ${points[2].x} ${points[2].y} ${end.x} ${end.y}`
    : points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const previous =
    [...points]
      .reverse()
      .find((p) => Math.hypot(p.x - end.x, p.y - end.y) > 1e-8) ?? start;
  let labelPoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  if (!curved) {
    const lengths = points
      .slice(1)
      .map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    let remaining = lengths.reduce((a, b) => a + b, 0) / 2;
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i] && lengths[i] > 0) {
        const t = remaining / lengths[i];
        labelPoint = {
          x: points[i].x + (points[i + 1].x - points[i].x) * t,
          y: points[i].y + (points[i + 1].y - points[i].y) * t,
        };
        break;
      }
      remaining -= lengths[i];
    }
  }
  return {
    path,
    points,
    bounds: pointsBounds(points, 16),
    labelPoint,
    angle: (Math.atan2(end.y - previous.y, end.x - previous.x) * 180) / Math.PI,
  };
}
