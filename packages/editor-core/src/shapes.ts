import type { Json, Node, Layer, Style } from '@koxora/project';
import type { Bounds, Point } from './viewport';

export const ELEMENT_KEY = 'org.koxora.element';
export const CONNECTION_KEY = 'org.koxora.connection';
export const MAX_TEXT = 4096;
export const shapeKinds = [
  'rectangle',
  'rounded-rectangle',
  'ellipse',
  'diamond',
  'triangle',
  'hexagon',
  'parallelogram',
  'text',
  'container',
  'line',
  'arrow',
] as const;
export type ShapeKind = (typeof shapeKinds)[number];
export type Geometry = Node['geometry'];
/** Only local, fixed font stacks cross the rendering boundary. Stored values are tokens. */
export const FONT_FAMILIES = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  arial: 'Arial, Helvetica, "Liberation Sans", sans-serif',
  helvetica: 'Helvetica, Arial, "Liberation Sans", sans-serif',
  verdana: 'Verdana, Geneva, "DejaVu Sans", sans-serif',
  tahoma: 'Tahoma, Verdana, "DejaVu Sans", sans-serif',
  trebuchet: '"Trebuchet MS", "Gill Sans", "DejaVu Sans", sans-serif',
  segoe: '"Segoe UI", "Helvetica Neue", "Liberation Sans", sans-serif',
  calibri: 'Calibri, Carlito, "Helvetica Neue", "Liberation Sans", sans-serif',
  georgia: 'Georgia, "DejaVu Serif", serif',
  times: '"Times New Roman", Times, "Liberation Serif", serif',
  cambria: 'Cambria, Caladea, "DejaVu Serif", serif',
  garamond:
    'Garamond, "Palatino Linotype", Palatino, "Liberation Serif", serif',
  palatino:
    '"Palatino Linotype", Palatino, "Book Antiqua", "DejaVu Serif", serif',
  courier: '"Courier New", Courier, "Liberation Mono", monospace',
  consolas: 'Consolas, Menlo, "DejaVu Sans Mono", monospace',
  menlo: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
  dejavu: '"DejaVu Sans", Verdana, sans-serif',
  liberation: '"Liberation Sans", Arial, Helvetica, sans-serif',
} as const;
export interface Appearance {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  textColor: string;
  fontSize: number;
  fontFamily: keyof typeof FONT_FAMILIES;
  fontWeight: 400 | 700;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  align: 'left' | 'center' | 'right';
  cornerRadius: number;
}
export const DEFAULT_APPEARANCE: Appearance = {
  fill: '#ede9fe',
  stroke: '#7c3aed',
  strokeWidth: 2,
  opacity: 1,
  textColor: '#18243d',
  fontSize: 16,
  fontFamily: 'sans',
  fontWeight: 400,
  fontStyle: 'normal',
  textDecoration: 'none',
  align: 'center',
  cornerRadius: 16,
};
export const jsonObject = (v: Json | undefined): Record<string, Json> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, Json>)
    : {};
export function editableExtension(v: Json | undefined): boolean {
  return v === undefined || jsonObject(v).version === 1;
}
export function isShapeKind(kind: string): kind is ShapeKind {
  return shapeKinds.includes(kind as ShapeKind);
}
const number = (
  v: Json | undefined,
  fallback: number,
  min: number,
  max: number,
) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
    ? v
    : fallback;
const color = (v: Json | undefined, fallback: string) =>
  typeof v === 'string' && /^(#[0-9a-f]{6}|none)$/i.test(v) ? v : fallback;
/** Imported styles are data, never CSS declarations, URLs or executable markup. */
export function readAppearance(
  properties: Record<string, Json> = {},
): Appearance {
  const d = DEFAULT_APPEARANCE;
  return {
    fill: color(properties.fill, d.fill),
    stroke: color(properties.stroke, d.stroke),
    strokeWidth: number(properties.strokeWidth, d.strokeWidth, 0, 32),
    opacity: number(properties.opacity, d.opacity, 0, 1),
    textColor: color(properties.textColor, d.textColor),
    fontSize: number(properties.fontSize, d.fontSize, 8, 96),
    fontFamily:
      typeof properties.fontFamily === 'string' &&
      Object.hasOwn(FONT_FAMILIES, properties.fontFamily)
        ? (properties.fontFamily as Appearance['fontFamily'])
        : d.fontFamily,
    fontWeight: properties.fontWeight === 700 ? 700 : 400,
    fontStyle: properties.fontStyle === 'italic' ? 'italic' : 'normal',
    textDecoration:
      properties.textDecoration === 'underline' ? 'underline' : 'none',
    align:
      typeof properties.align === 'string' &&
      ['left', 'center', 'right'].includes(properties.align)
        ? (properties.align as Appearance['align'])
        : d.align,
    cornerRadius: number(properties.cornerRadius, d.cornerRadius, 0, 128),
  };
}
type StyledElement = { styleId?: string; extensions: Record<string, Json> };
/** Cache inherited known properties once per scene, bounded independently of optional unknown style data. */
export function appearanceResolver(styles: Style[] = []) {
  const byId = new Map(styles.map((s) => [s.id, s]));
  const cache = new Map<string, Record<string, Json>>();
  const known = (properties: Record<string, Json>) =>
    Object.fromEntries(
      Object.keys(DEFAULT_APPEARANCE)
        .filter((k) => Object.hasOwn(properties, k))
        .map((k) => [k, properties[k]]),
    );
  return (item: StyledElement, key = ELEMENT_KEY): Appearance => {
    const chain: Style[] = [],
      seen = new Set<string>();
    let id = item.styleId;
    while (id && !cache.has(id) && !seen.has(id)) {
      seen.add(id);
      const s = byId.get(id);
      if (!s) break;
      chain.push(s);
      id = s.parentId;
    }
    let properties: Record<string, Json> = { ...(id ? cache.get(id) : {}) };
    for (const s of chain.reverse()) {
      properties = { ...properties, ...known(s.properties) };
      cache.set(s.id, properties);
    }
    const extension = jsonObject(item.extensions[key]);
    return readAppearance({
      ...properties,
      ...(extension.version === 1 ? known(jsonObject(extension.style)) : {}),
    });
  };
}
export function resolveAppearance(
  item: StyledElement,
  styles: Style[] = [],
  key = ELEMENT_KEY,
): Appearance {
  return appearanceResolver(styles)(item, key);
}
export function layerStates(
  layers: Layer[],
): Map<string, { visible: boolean; editable: boolean; order: number }> {
  const byId = new Map(layers.map((l) => [l.id, l]));
  const result = new Map<
    string,
    { visible: boolean; editable: boolean; order: number }
  >();
  const orders = new Map(layers.map((l, i) => [l.id, i]));
  for (const layer of layers) {
    const path: Layer[] = [],
      seen = new Set<string>();
    let id: string | undefined = layer.id;
    let visible = true,
      editable = true;
    while (id) {
      const known = result.get(id);
      if (known) {
        visible = known.visible;
        editable = known.editable;
        break;
      }
      const next = byId.get(id);
      if (!next || seen.has(id)) {
        visible = false;
        editable = false;
        break;
      }
      seen.add(id);
      path.push(next);
      id = next.parentId;
    }
    for (const next of path.reverse()) {
      visible = visible && next.visible;
      editable = editable && visible && !next.locked;
      result.set(next.id, { visible, editable, order: orders.get(next.id)! });
    }
  }
  return result;
}
export function shapeCenter(g: Bounds): Point {
  return { x: g.x + g.width / 2, y: g.y + g.height / 2 };
}
export function rotatePoint(p: Point, center: Point, degrees: number): Point {
  const a = ((degrees % 360) * Math.PI) / 180,
    x = p.x - center.x,
    y = p.y - center.y;
  return {
    x: center.x + x * Math.cos(a) - y * Math.sin(a),
    y: center.y + x * Math.sin(a) + y * Math.cos(a),
  };
}
export function geometryBounds(g: Geometry, padding = 0): Bounds {
  const a = ((g.rotation % 360) * Math.PI) / 180;
  const width =
    Math.abs(g.width * Math.cos(a)) + Math.abs(g.height * Math.sin(a));
  const height =
    Math.abs(g.width * Math.sin(a)) + Math.abs(g.height * Math.cos(a));
  return {
    x: g.x + (g.width - width) / 2 - padding,
    y: g.y + (g.height - height) / 2 - padding,
    width: width + padding * 2,
    height: height + padding * 2,
  };
}
export interface ShapeDefinition {
  labelBox?: (width: number, height: number) => Bounds;
  width: number;
  height: number;
  container?: boolean;
  path: (width: number, height: number, radius: number) => string;
  contains: (
    point: Point,
    width: number,
    height: number,
    radius: number,
  ) => boolean;
}
function polygon(
  vertices: Point[],
): Pick<ShapeDefinition, 'path' | 'contains'> {
  return {
    path: (w, h) =>
      vertices
        .map((p, i) => `${i ? 'L' : 'M'} ${p.x * w} ${p.y * h}`)
        .join(' ') + ' Z',
    contains(p, w, h) {
      if (!w || !h) return false;
      const q = { x: p.x / w, y: p.y / h };
      let sign = 0;
      for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i],
          b = vertices[(i + 1) % vertices.length];
        const cross = (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x);
        if (Math.abs(cross) < 1e-9) continue;
        if (sign && Math.sign(cross) !== sign) return false;
        sign = Math.sign(cross);
      }
      return true;
    },
  };
}
const box = polygon([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]);
const rounded: Pick<ShapeDefinition, 'path' | 'contains'> = {
  path(w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
  },
  contains(p, w, h, r) {
    if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) return false;
    r = Math.min(r, w / 2, h / 2);
    if (!r) return true;
    // Match the quadratic corner, not an unrelated circular approximation.
    const x = Math.min(p.x, w - p.x),
      y = Math.min(p.y, h - p.y);
    return x >= r || y >= r || Math.sqrt(x / r) + Math.sqrt(y / r) >= 1;
  },
};
/** Trusted built-in registry; imported kind strings never load code. */
export const shapeRegistry: Readonly<Record<ShapeKind, ShapeDefinition>> = {
  line: {
    width: 160,
    height: 1,
    path: (w, h) => `M 0 ${h / 2} L ${w} ${h / 2}`,
    contains: (p, w, h) => p.x >= 0 && p.x <= w && Math.abs(p.y - h / 2) <= 4,
  },
  arrow: {
    width: 160,
    height: 1,
    path: (w, h) => `M 0 ${h / 2} L ${w} ${h / 2}`,
    contains: (p, w, h) => p.x >= 0 && p.x <= w && Math.abs(p.y - h / 2) <= 4,
  },
  rectangle: { width: 160, height: 88, ...box },
  'rounded-rectangle': { width: 160, height: 88, ...rounded },
  ellipse: {
    labelBox: (width, height) => ({
      x: width * 0.15,
      y: height * 0.15,
      width: width * 0.7,
      height: height * 0.7,
    }),
    width: 128,
    height: 128,
    path: (w, h) =>
      `M 0 ${h / 2} A ${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2} A ${w / 2} ${h / 2} 0 1 0 0 ${h / 2} Z`,
    contains: (p, w, h) =>
      w > 0 &&
      h > 0 &&
      ((p.x - w / 2) / (w / 2)) ** 2 + ((p.y - h / 2) / (h / 2)) ** 2 <= 1,
  },
  diamond: {
    labelBox: (width, height) => ({
      x: width * 0.25,
      y: height * 0.25,
      width: width * 0.5,
      height: height * 0.5,
    }),
    width: 160,
    height: 120,
    ...polygon([
      { x: 0.5, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.5 },
    ]),
  },
  triangle: {
    labelBox: (width, height) => ({
      x: width * 0.25,
      y: height * 0.5,
      width: width * 0.5,
      height: height * 0.4,
    }),
    width: 144,
    height: 120,
    ...polygon([
      { x: 0.5, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]),
  },
  hexagon: {
    labelBox: (width, height) => ({
      x: width * 0.25,
      y: height * 0.1,
      width: width * 0.5,
      height: height * 0.8,
    }),
    width: 176,
    height: 96,
    ...polygon([
      { x: 0.25, y: 0 },
      { x: 0.75, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.75, y: 1 },
      { x: 0.25, y: 1 },
      { x: 0, y: 0.5 },
    ]),
  },
  parallelogram: {
    labelBox: (width, height) => ({
      x: width * 0.2,
      y: height * 0.1,
      width: width * 0.6,
      height: height * 0.8,
    }),
    width: 176,
    height: 88,
    ...polygon([
      { x: 0.2, y: 0 },
      { x: 1, y: 0 },
      { x: 0.8, y: 1 },
      { x: 0, y: 1 },
    ]),
  },
  text: { width: 200, height: 88, ...box },
  container: { width: 320, height: 240, container: true, ...rounded },
};
export function containsShape(
  kind: string,
  g: Geometry,
  p: Point,
  radius = 16,
): boolean {
  const local = rotatePoint(p, shapeCenter(g), -g.rotation);
  return (
    isShapeKind(kind) ? shapeRegistry[kind] : shapeRegistry.rectangle
  ).contains({ x: local.x - g.x, y: local.y - g.y }, g.width, g.height, radius);
}
/** Ray/convex-boundary intersection also works for rotated shapes and future convex registry entries. */
export function boundaryPoint(
  kind: string,
  g: Geometry,
  toward: Point,
  radius = 16,
): Point {
  const c = shapeCenter(g),
    dx = toward.x - c.x,
    dy = toward.y - c.y;
  const length = Math.hypot(dx, dy);
  if (!length || !g.width || !g.height) return c;
  let lo = 0,
    hi = Math.hypot(g.width, g.height);
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const p = { x: c.x + (dx / length) * mid, y: c.y + (dy / length) * mid };
    if (containsShape(kind, g, p, radius)) lo = mid;
    else hi = mid;
  }
  return { x: c.x + (dx / length) * lo, y: c.y + (dy / length) * lo };
}
export type Anchor = 'auto' | 'north' | 'east' | 'south' | 'west';
export function anchorPoint(
  node: Pick<Node, 'kind' | 'geometry'>,
  toward: Point,
  anchor: Anchor = 'auto',
  radius = 16,
): Point {
  const c = shapeCenter(node.geometry);
  const directions = {
    north: { x: 0, y: -1 },
    east: { x: 1, y: 0 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
  };
  const d = anchor === 'auto' ? null : directions[anchor];
  return boundaryPoint(
    node.kind,
    node.geometry,
    d
      ? rotatePoint({ x: c.x + d.x, y: c.y + d.y }, c, node.geometry.rotation)
      : toward,
    radius,
  );
}
