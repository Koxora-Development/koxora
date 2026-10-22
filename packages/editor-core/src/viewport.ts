/** All coordinates are CSS pixels or world units, never physical display pixels. */
export interface Point {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}
export interface Camera extends Point {
  zoom: number;
}
export interface Bounds extends Point, Size {}
export interface ZoomLimits {
  min: number;
  max: number;
}
export const ZOOM_LIMITS: ZoomLimits = { min: 0.02, max: 16 };
export const MAX_COORDINATE = 1e12;
const finite = (value: number, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
export function clampZoom(zoom: number, limits = ZOOM_LIMITS): number {
  if (!(
    limits.min > 0 &&
    limits.max >= limits.min &&
    Number.isFinite(limits.max)
  ))
    throw new RangeError('Invalid zoom limits');
  return Math.min(limits.max, Math.max(limits.min, finite(zoom, 1)));
}
export function normalizeCamera(camera: Camera, limits = ZOOM_LIMITS): Camera {
  const coordinate = (n: number) =>
    Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, finite(n)));
  return {
    x: coordinate(camera.x),
    y: coordinate(camera.y),
    zoom: clampZoom(camera.zoom, limits),
  };
}
export function worldToScreen(point: Point, camera: Camera, size: Size): Point {
  return {
    x: (point.x - camera.x) * camera.zoom + size.width / 2,
    y: (point.y - camera.y) * camera.zoom + size.height / 2,
  };
}
export function screenToWorld(point: Point, camera: Camera, size: Size): Point {
  return {
    x: (point.x - size.width / 2) / camera.zoom + camera.x,
    y: (point.y - size.height / 2) / camera.zoom + camera.y,
  };
}
export function pan(camera: Camera, delta: Point): Camera {
  return normalizeCamera({
    ...camera,
    x: camera.x - delta.x / camera.zoom,
    y: camera.y - delta.y / camera.zoom,
  });
}
/** Keep the same world point under an anchor, including when zoom hits a limit. */
export function zoomAt(
  camera: Camera,
  zoom: number,
  anchor: Point,
  size: Size,
  limits = ZOOM_LIMITS,
): Camera {
  const before = screenToWorld(anchor, camera, size);
  const nextZoom = clampZoom(zoom, limits);
  return normalizeCamera(
    {
      x: before.x - (anchor.x - size.width / 2) / nextZoom,
      y: before.y - (anchor.y - size.height / 2) / nextZoom,
      zoom: nextZoom,
    },
    limits,
  );
}
export function pinch(
  camera: Camera,
  start: [Point, Point],
  current: [Point, Point],
  size: Size,
): Camera {
  const center = (points: [Point, Point]) => ({
    x: (points[0].x + points[1].x) / 2,
    y: (points[0].y + points[1].y) / 2,
  });
  const distance = (points: [Point, Point]) =>
    Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  const a = center(start),
    b = center(current);
  return pan(
    zoomAt(
      camera,
      (camera.zoom * distance(current)) / Math.max(1, distance(start)),
      a,
      size,
    ),
    { x: b.x - a.x, y: b.y - a.y },
  );
}
export function fitBounds(
  bounds: Bounds | null,
  size: Size,
  padding = 48,
): Camera {
  if (!bounds) return { x: 0, y: 0, zoom: 1 };
  return normalizeCamera({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
    zoom: Math.min(
      Math.max(1, size.width - padding * 2) / Math.max(1, bounds.width),
      Math.max(1, size.height - padding * 2) / Math.max(1, bounds.height),
    ),
  });
}
export function visibleBounds(camera: Camera, size: Size): Bounds {
  return {
    ...screenToWorld({ x: 0, y: 0 }, camera, size),
    width: size.width / camera.zoom,
    height: size.height / camera.zoom,
  };
}
export function intersects(a: Bounds, b: Bounds): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}
export function snapPoint(
  point: Point,
  spacing: number,
  enabled = true,
  origin: Point = { x: 0, y: 0 },
): Point {
  if (!(spacing > 0 && Number.isFinite(spacing)))
    throw new RangeError('Invalid grid spacing');
  if (!enabled) return { ...point };
  return {
    x: origin.x + Math.round((point.x - origin.x) / spacing) * spacing,
    y: origin.y + Math.round((point.y - origin.y) / spacing) * spacing,
  };
}
/** Coarsen only the visible grid. Snapping always uses the configured world spacing. */
export function gridStep(spacing: number, zoom: number): number {
  if (!(spacing > 0 && zoom > 0 && Number.isFinite(spacing * zoom)))
    throw new RangeError('Invalid grid');
  return (
    spacing * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (spacing * zoom))))
  );
}
export function wheelDelta(delta: Point, mode: number, size: Size): Point {
  const scale = mode === 1 ? 16 : mode === 2 ? Math.max(1, size.height) : 1;
  return { x: finite(delta.x) * scale, y: finite(delta.y) * scale };
}
