import type { Node, Page } from '@koxora/project';
import { type Bounds, type Point, snapPoint, intersects } from './viewport';
import { rotatePoint, shapeCenter, type Geometry } from './shapes';
import { type Scene, unionBounds } from './scene';

export const MIN_SIZE = 8;
export const LINE_KEY = 'org.koxora.line';
export const isDrawing = (kind: string) => kind === 'line' || kind === 'arrow';
export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw';
export const resizeHandles: ResizeHandle[] = ['nw', 'ne', 'se', 'sw'];
export function handlePoint(g: Geometry, handle: ResizeHandle): Point {
  return rotatePoint(
    {
      x: g.x + (handle.endsWith('e') ? g.width : 0),
      y: g.y + (handle.startsWith('s') ? g.height : 0),
    },
    shapeCenter(g),
    g.rotation,
  );
}
/** Keep the opposite corner fixed in world space, including for rotated shapes. */
export function resizeGeometry(
  g: Geometry,
  handle: ResizeHandle,
  point: Point,
  aspect = false,
): Geometry {
  const opposite = { nw: 'se', ne: 'sw', se: 'nw', sw: 'ne' } as const;
  const fixed = handlePoint(g, opposite[handle]);
  const local = rotatePoint(point, fixed, -g.rotation);
  const sx = handle.endsWith('e') ? 1 : -1,
    sy = handle.startsWith('s') ? 1 : -1;
  let width = Math.max(MIN_SIZE, (local.x - fixed.x) * sx);
  let height = Math.max(MIN_SIZE, (local.y - fixed.y) * sy);
  if (aspect) {
    const scale = Math.max(
      width / g.width,
      height / g.height,
      MIN_SIZE / g.width,
      MIN_SIZE / g.height,
    );
    width = g.width * scale;
    height = g.height * scale;
  }
  const center = rotatePoint(
    { x: fixed.x + (sx * width) / 2, y: fixed.y + (sy * height) / 2 },
    fixed,
    g.rotation,
  );
  return {
    ...g,
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
}
/** Lines are real drawing nodes in the existing node collection, never fake connector endpoints. */
export function lineGeometry(
  start: Point,
  end: Point,
  fixed: 'start' | 'end' = 'start',
): Geometry {
  const width = Math.max(
    MIN_SIZE,
    Math.hypot(end.x - start.x, end.y - start.y),
  );
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const center =
    fixed === 'start'
      ? {
          x: start.x + (Math.cos(angle) * width) / 2,
          y: start.y + (Math.sin(angle) * width) / 2,
        }
      : {
          x: end.x - (Math.cos(angle) * width) / 2,
          y: end.y - (Math.sin(angle) * width) / 2,
        };
  return {
    x: center.x - width / 2,
    y: center.y - 0.5,
    width,
    height: 1,
    rotation: (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
  };
}
export function lineEndpoints(g: Geometry): [Point, Point] {
  const c = shapeCenter(g);
  return [
    rotatePoint({ x: g.x, y: c.y }, c, g.rotation),
    rotatePoint({ x: g.x + g.width, y: c.y }, c, g.rotation),
  ];
}
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function marqueeSelection(scene: Scene, box: Bounds): string[] {
  return [...scene.nodes, ...scene.connections]
    .filter((n) => n.editable && intersects(n.bounds, box))
    .map((n) => n.id);
}
export function toggleSelection(
  selected: readonly string[],
  id: string,
  additive: boolean,
): string[] {
  return additive
    ? selected.includes(id)
      ? selected.filter((n) => n !== id)
      : [...selected, id]
    : [id];
}
export function movedGeometries(
  nodes: Node[],
  delta: Point,
  spacing: number,
  snap: boolean,
): Record<string, Geometry> {
  if (!nodes.length) return {};
  const anchor = nodes[0].geometry;
  const target = snapPoint(
    { x: anchor.x + delta.x, y: anchor.y + delta.y },
    spacing,
    snap,
  );
  return Object.fromEntries(
    nodes.map((n) => [
      n.id,
      {
        ...n.geometry,
        x: n.geometry.x + target.x - anchor.x,
        y: n.geometry.y + target.y - anchor.y,
      },
    ]),
  );
}
export type Alignment =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'horizontal'
  | 'vertical';
export function alignedGeometries(
  scene: Scene,
  ids: readonly string[],
  mode: Alignment,
): Record<string, Geometry> {
  const nodes = scene.nodes.filter((n) => n.editable && ids.includes(n.id));
  const bounds = unionBounds(nodes.map((n) => n.bounds));
  if (!bounds || nodes.length < 2) return {};
  const horizontal = ['left', 'center', 'right', 'horizontal'].includes(mode);
  const axis = horizontal ? 'x' : 'y',
    dimension = horizontal ? 'width' : 'height';
  const distribute = mode === 'horizontal' || mode === 'vertical';
  if (distribute && nodes.length < 3) return {};
  nodes.sort((a, b) => a.bounds[axis] - b.bounds[axis]);
  const gap =
    (bounds[dimension] -
      nodes.reduce((sum, n) => sum + n.bounds[dimension], 0)) /
    (nodes.length - 1);
  let cursor = bounds[axis];
  return Object.fromEntries(
    nodes.map((n) => {
      const offset =
        mode === 'right' || mode === 'bottom'
          ? bounds[dimension] - n.bounds[dimension]
          : mode === 'center' || mode === 'middle'
            ? (bounds[dimension] - n.bounds[dimension]) / 2
            : 0;
      const target = distribute ? cursor : bounds[axis] + offset;
      cursor += n.bounds[dimension] + gap;
      return [
        n.id,
        { ...n.geometry, [axis]: n.geometry[axis] + target - n.bounds[axis] },
      ];
    }),
  );
}
/** A cheap immutable preview; validation and history happen only on pointer release. */
export function previewGeometry(
  page: Page,
  geometries: Record<string, Geometry>,
): Page {
  return {
    ...page,
    nodes: page.nodes.map((n) =>
      geometries[n.id] ? { ...n, geometry: geometries[n.id] } : n,
    ),
  };
}
