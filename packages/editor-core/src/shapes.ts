import type {
  Json,
  Node,
  Layer,
  Style,
  ConnectionAnchor,
} from '@koxora/project';
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
  'document',
  'database',
  'cloud',
  'note',
  'predefined-process',
  'trapezoid',
  'pentagon',
  'octagon',
  'chevron',
  'cross',
  'table',
  'kite',
  'heptagon',
  'nonagon',
  'decagon',
  'star-4',
  'star-5',
  'star-6',
  'star-8',
  'star-12',
  'block-arrow-right',
  'block-arrow-left',
  'block-arrow-up',
  'block-arrow-down',
  'block-arrow-both',
  'block-arrow-vertical',
  'notched-arrow',
  'manual-input',
  'manual-operation',
  'offpage',
  'delay',
  'display',
  'internal-storage',
  'speech-bubble',
  'speech-bubble-right',
  'burst',
  'shield',
  'bookmark',
  'ribbon',
  'ticket',
  'house',
  'factory',
  'envelope',
  'monitor',
  'laptop',
  'phone',
  'server',
  'network-switch',
  'router',
  'wireless-router',
  'access-point',
  'firewall',
  'server-rack',
  'blade-server',
  'workstation',
  'printer',
  'tablet',
  'ip-phone',
  'satellite',
  'antenna',
  'load-balancer',
  'gateway',
  'network-hub',
  'patch-panel',
  'ethernet-port',
  'cloud-network',
  'cloud-server',
  'storage-array',
  'nas',
  'hard-drive',
  'ssd',
  'usb-drive',
  'memory',
  'cpu',
  'lock',
  'key',
  'shield-check',
  'camera',
  'video-camera',
  'folder',
  'block-arrow-four-way',
  'block-arrow-three-way',
  'block-arrow-up-right',
  'block-arrow-down-right',
  'block-arrow-pentagon',
  'striped-arrow',
  'wide-chevron',
  'junction',
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
  textColor: 'auto',
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
    textColor:
      properties.textColor === 'auto'
        ? 'auto'
        : color(properties.textColor, d.textColor),
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
  rayBoundary?: (toward: Point, width: number, height: number) => Point;
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
export function containerHeaderHeight(height: number): number {
  return Math.min(40, height * 0.3);
}
export function containerTextBoxes(width: number, height: number) {
  const header = containerHeaderHeight(height);
  return {
    title: {
      x: 10,
      y: 3,
      width: Math.max(1, width - 20),
      height: Math.max(1, header - 6),
    },
    body: {
      x: 10,
      y: header + 6,
      width: Math.max(1, width - 20),
      height: Math.max(1, height - header - 12),
    },
  };
}
function polygon(
  vertices: Point[],
): Pick<ShapeDefinition, 'path' | 'contains' | 'rayBoundary'> {
  return {
    rayBoundary(toward, w, h) {
      const center = { x: w / 2, y: h / 2 };
      const direction = { x: toward.x - center.x, y: toward.y - center.y };
      let last = 0;
      for (let i = 0; i < vertices.length; i++) {
        const a = { x: vertices[i].x * w, y: vertices[i].y * h };
        const next = vertices[(i + 1) % vertices.length];
        const edge = { x: next.x * w - a.x, y: next.y * h - a.y };
        const offset = { x: a.x - center.x, y: a.y - center.y };
        const cross = direction.x * edge.y - direction.y * edge.x;
        if (Math.abs(cross) < 1e-12) continue;
        const distance = (offset.x * edge.y - offset.y * edge.x) / cross;
        const along = (offset.x * direction.y - offset.y * direction.x) / cross;
        // Outermost intersection keeps an arriving connector outside concave flares.
        if (distance >= 0 && along >= -1e-12 && along <= 1 + 1e-12)
          last = Math.max(last, distance);
      }
      return {
        x: center.x + direction.x * last,
        y: center.y + direction.y * last,
      };
    },
    path: (w, h) =>
      vertices
        .map((p, i) => `${i ? 'L' : 'M'} ${p.x * w} ${p.y * h}`)
        .join(' ') + ' Z',
    contains(p, w, h) {
      if (!w || !h) return false;
      const q = { x: p.x / w, y: p.y / h };
      let inside = false;
      for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i],
          b = vertices[(i + 1) % vertices.length];
        const cross = (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x);
        if (
          Math.abs(cross) < 1e-12 &&
          q.x >= Math.min(a.x, b.x) - 1e-12 &&
          q.x <= Math.max(a.x, b.x) + 1e-12 &&
          q.y >= Math.min(a.y, b.y) - 1e-12 &&
          q.y <= Math.max(a.y, b.y) + 1e-12
        )
          return true;
        if (
          a.y > q.y !== b.y > q.y &&
          q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x
        )
          inside = !inside;
      }
      return inside;
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
/** A sampled contour is shared by drawing and picking, including the cloud's concave scallops. */
function cloudContour(): Point[] {
  const vertices: Point[] = [{ x: 0.2, y: 0.9 }];
  const curves = [
    [0.05, 0.9, 0, 0.78, 0, 0.64],
    [0, 0.48, 0.1, 0.4, 0.22, 0.4],
    [0.2, 0.22, 0.34, 0.08, 0.5, 0.08],
    [0.65, 0.08, 0.76, 0.18, 0.79, 0.31],
    [0.92, 0.28, 1, 0.4, 1, 0.52],
    [1, 0.6, 0.97, 0.67, 0.92, 0.71],
    [0.99, 0.83, 0.9, 0.95, 0.79, 0.95],
  ];
  for (const [ax, ay, bx, by, x, y] of curves) {
    const start = vertices.at(-1)!;
    for (let step = 1; step <= 12; step++) {
      const t = step / 12,
        u = 1 - t;
      vertices.push({
        x:
          u ** 3 * start.x +
          3 * u ** 2 * t * ax +
          3 * u * t ** 2 * bx +
          t ** 3 * x,
        y:
          u ** 3 * start.y +
          3 * u ** 2 * t * ay +
          3 * u * t ** 2 * by +
          t ** 3 * y,
      });
    }
  }
  return vertices;
}
/** Scale only trusted built-in M/L/H/V/Q/C path coordinates; imported paths never enter here. */
function iconPath(source: string, width: number, height: number): string {
  let command = '',
    index = 0;
  return source.replace(/[MLHVQCZ]|-?(?:\d+\.?\d*|\.\d+)/g, (token) => {
    if (/^[A-Z]$/.test(token)) {
      command = token;
      index = 0;
      return token;
    }
    const scale =
      command === 'H'
        ? width
        : command === 'V'
          ? height
          : index++ % 2
            ? height
            : width;
    return String(Number(token) * scale);
  });
}
/** A single outer contour drives picking and connection boundaries; detail strokes stay inside it. */
function deviceSymbol(
  outline: readonly (readonly [number, number])[],
  details: string,
  label: readonly [number, number, number, number] = [0.16, 0.36, 0.68, 0.28],
  width = 192,
  height = 128,
): ShapeDefinition {
  const contour = polygon(outline.map(([x, y]) => ({ x, y })));
  return {
    width,
    height,
    contains: contour.contains,
    rayBoundary: contour.rayBoundary,
    path: (w, h, r) => contour.path(w, h, r) + ' ' + iconPath(details, w, h),
    labelBox: (w, h) => ({
      x: label[0] * w,
      y: label[1] * h,
      width: label[2] * w,
      height: label[3] * h,
    }),
  };
}
const deviceBox = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
] as const;
const deviceChamfer = [
  [0.08, 0],
  [0.92, 0],
  [1, 0.12],
  [1, 0.88],
  [0.92, 1],
  [0.08, 1],
  [0, 0.88],
  [0, 0.12],
] as const;
const deviceOval = Array.from(
  { length: 48 },
  (_, i) =>
    [
      0.5 + Math.cos((i * Math.PI) / 24) * 0.5,
      0.5 + Math.sin((i * Math.PI) / 24) * 0.5,
    ] as const,
);
const deviceShield = [
  [0.05, 0],
  [0.95, 0],
  [0.9, 0.65],
  [0.5, 1],
  [0.1, 0.65],
] as const;

/** Trusted built-in registry; imported kind strings never load code. */
export const shapeRegistry: Readonly<Record<ShapeKind, ShapeDefinition>> = {
  'network-switch': deviceSymbol(
    deviceBox,
    'M .07 .12 H .93 V .24 H .07 Z M .08 .76 H .23 V .9 H .08 Z M .28 .76 H .43 V .9 H .28 Z M .48 .76 H .63 V .9 H .48 Z M .68 .76 H .83 V .9 H .68 Z M .9 .77 V .9',
  ),
  router: deviceSymbol(
    deviceOval,
    'M .12 .5 H .3 M .24 .43 L .3 .5 L .24 .57 M .88 .5 H .7 M .76 .43 L .7 .5 L .76 .57 M .5 .08 V .27 M .44 .21 L .5 .27 L .56 .21 M .5 .92 V .73 M .44 .79 L .5 .73 L .56 .79',
    [0.32, 0.35, 0.36, 0.3],
    176,
    144,
  ),
  'wireless-router': deviceSymbol(
    deviceChamfer,
    'M .1 .68 H .9 M .13 .82 H .23 M .3 .82 H .4 M .47 .82 H .57 M .28 .26 Q .5 .02 .72 .26 M .37 .31 Q .5 .17 .63 .31 M .46 .35 Q .5 .31 .54 .35',
    [0.16, 0.4, 0.68, 0.22],
  ),
  'access-point': deviceSymbol(
    deviceOval,
    'M .2 .31 Q .5 -.02 .8 .31 M .29 .39 Q .5 .15 .71 .39 M .39 .46 Q .5 .34 .61 .46 M .48 .52 H .52 M .35 .84 H .65',
    [0.24, 0.59, 0.52, 0.18],
    144,
    144,
  ),
  firewall: deviceSymbol(
    deviceBox,
    'M 0 .2 H 1 M 0 .8 H 1 M .25 0 V .2 M .75 0 V .2 M .5 .8 V 1 M .12 .31 H .23 M .12 .43 H .23 M .12 .55 H .23 M .12 .67 H .23 M .79 .31 V .67',
    [0.3, 0.32, 0.42, 0.32],
    176,
    144,
  ),
  'server-rack': deviceSymbol(
    deviceBox,
    'M .1 0 V 1 M .9 0 V 1 M .1 .15 H .9 M .1 .3 H .9 M .1 .7 H .9 M .1 .85 H .9 M .2 .07 H .7 M .2 .22 H .7 M .2 .77 H .7 M .2 .92 H .7 M .8 .05 V .1 M .8 .2 V .25 M .8 .75 V .8 M .8 .9 V .95',
    [0.2, 0.36, 0.6, 0.28],
    144,
    208,
  ),
  'blade-server': deviceSymbol(
    deviceChamfer,
    'M .08 .18 H .92 M .08 .3 H .92 M .2 .7 V .94 M .4 .7 V .94 M .6 .7 V .94 M .8 .7 V .94 M .09 .82 H .91',
    [0.16, 0.37, 0.68, 0.26],
    192,
    144,
  ),
  workstation: deviceSymbol(
    [
      [0, 0],
      [0.72, 0],
      [0.72, 0.24],
      [1, 0.24],
      [1, 1],
      [0, 1],
    ],
    'M .06 .08 H .64 V .7 H .06 Z M .19 .85 H .51 M .35 .7 V .85 M .77 .32 H .92 V .91 H .77 Z M .8 .41 H .89 M .8 .49 H .89 M .8 .77 H .86',
    [0.12, 0.2, 0.46, 0.36],
    192,
    152,
  ),
  printer: deviceSymbol(
    [
      [0.2, 0],
      [0.8, 0],
      [0.8, 0.22],
      [1, 0.22],
      [1, 0.83],
      [0.8, 0.83],
      [0.8, 1],
      [0.2, 1],
      [0.2, 0.83],
      [0, 0.83],
      [0, 0.22],
      [0.2, 0.22],
    ],
    'M .2 .22 H .8 M .18 .67 H .82 M .2 .83 V .67 M .8 .83 V .67 M .3 .78 H .7 M .3 .88 H .6 M .83 .35 H .91',
    [0.12, 0.34, 0.65, 0.25],
    176,
    144,
  ),
  tablet: deviceSymbol(
    [
      [0.05, 0],
      [0.95, 0],
      [1, 0.06],
      [1, 0.94],
      [0.95, 1],
      [0.05, 1],
      [0, 0.94],
      [0, 0.06],
    ],
    'M .09 .08 H .91 V .84 H .09 Z M .42 .93 H .58',
    [0.16, 0.25, 0.68, 0.4],
    160,
    192,
  ),
  'ip-phone': deviceSymbol(
    [
      [0.08, 0],
      [0.27, 0],
      [0.27, 0.12],
      [0.9, 0.12],
      [1, 0.87],
      [0.93, 1],
      [0.07, 1],
      [0, 0.87],
    ],
    'M .08 .15 H .22 V .8 H .08 Z M .34 .22 H .8 V .5 H .34 Z M .36 .64 H .48 M .57 .64 H .69 M .78 .64 H .87 M .36 .78 H .48 M .57 .78 H .69 M .78 .78 H .89',
    [0.36, 0.27, 0.4, 0.18],
    160,
    144,
  ),
  satellite: deviceSymbol(
    [
      [0, 0.25],
      [0.35, 0.25],
      [0.35, 0.05],
      [0.65, 0.05],
      [0.65, 0.25],
      [1, 0.25],
      [1, 0.75],
      [0.65, 0.75],
      [0.65, 0.95],
      [0.35, 0.95],
      [0.35, 0.75],
      [0, 0.75],
    ],
    'M .16 .25 V .75 M .84 .25 V .75 M 0 .5 H .28 M .72 .5 H 1 M .39 .13 H .61 M .39 .87 H .61',
    [0.39, 0.32, 0.22, 0.36],
    208,
    128,
  ),
  antenna: deviceSymbol(
    [
      [0.5, 0],
      [1, 1],
      [0, 1],
    ],
    'M .5 .12 V .27 M .4 .34 Q .5 .18 .6 .34 M .3 .72 H .7 M .2 .9 H .8 M .2 .9 L .61 .48 M .8 .9 L .39 .48',
    [0.42, 0.4, 0.16, 0.25],
    144,
    192,
  ),
  'load-balancer': deviceSymbol(
    deviceChamfer,
    'M .08 .5 H .22 M .78 .5 H .92 M .26 .23 H .45 M .26 .77 H .45 M .55 .23 H .74 M .55 .77 H .74 M .31 .18 L .26 .23 L .31 .28 M .69 .72 L .74 .77 L .69 .82 M .16 .3 V .7 M .84 .3 V .7',
    [0.27, 0.37, 0.46, 0.26],
  ),
  gateway: deviceSymbol(
    [
      [0.1, 0],
      [0.9, 0],
      [1, 0.15],
      [1, 0.85],
      [0.9, 1],
      [0.1, 1],
      [0, 0.85],
      [0, 0.15],
    ],
    'M .18 .2 H .82 V .8 H .18 Z M .07 .5 H .18 M .82 .5 H .93 M .26 .1 H .74 M .26 .9 H .74',
    [0.27, 0.34, 0.46, 0.32],
    168,
    144,
  ),
  'network-hub': deviceSymbol(
    deviceOval,
    'M .5 .06 V .22 M .94 .5 H .78 M .5 .94 V .78 M .06 .5 H .22 M .2 .2 L .3 .3 M .8 .2 L .7 .3 M .8 .8 L .7 .7 M .2 .8 L .3 .7',
    [0.32, 0.35, 0.36, 0.3],
    144,
    144,
  ),
  'patch-panel': deviceSymbol(
    deviceBox,
    'M .08 .1 V .9 M .92 .1 V .9 M .17 .12 H .32 V .31 H .17 Z M .42 .12 H .57 V .31 H .42 Z M .67 .12 H .82 V .31 H .67 Z M .17 .69 H .32 V .88 H .17 Z M .42 .69 H .57 V .88 H .42 Z M .67 .69 H .82 V .88 H .67 Z',
    [0.17, 0.39, 0.65, 0.22],
    208,
    96,
  ),
  'ethernet-port': deviceSymbol(
    [
      [0.1, 0],
      [0.9, 0],
      [1, 0.12],
      [1, 1],
      [0, 1],
      [0, 0.12],
    ],
    'M .18 .18 H .82 V .7 H .65 V .85 H .35 V .7 H .18 Z M .29 .18 V .32 M .43 .18 V .32 M .57 .18 V .32 M .71 .18 V .32',
    [0.25, 0.39, 0.5, 0.22],
    144,
    128,
  ),
  'cloud-network': deviceSymbol(
    [
      [0, 0.4],
      [0.08, 0.2],
      [0.28, 0.2],
      [0.36, 0],
      [0.68, 0],
      [0.79, 0.18],
      [0.94, 0.2],
      [1, 0.4],
      [0.96, 0.73],
      [0.83, 0.82],
      [0.17, 0.82],
      [0.04, 0.7],
    ],
    'M .2 .26 L .5 .15 L .8 .28 M .2 .26 L .23 .63 M .8 .28 L .76 .63 M .23 .63 H .76 M .5 .15 V .28',
    [0.32, 0.36, 0.36, 0.24],
    208,
    144,
  ),
  'cloud-server': deviceSymbol(
    [
      [0, 0.36],
      [0.08, 0.18],
      [0.28, 0.18],
      [0.36, 0],
      [0.68, 0],
      [0.79, 0.16],
      [0.94, 0.18],
      [1, 0.38],
      [0.96, 0.78],
      [0.83, 0.92],
      [0.17, 0.92],
      [0.04, 0.76],
    ],
    'M .22 .25 H .78 V .77 H .22 Z M .22 .41 H .78 M .3 .32 H .38 M .3 .68 H .38',
    [0.42, 0.48, 0.28, 0.2],
    208,
    144,
  ),
  'storage-array': deviceSymbol(
    deviceBox,
    'M 0 .22 H 1 M 0 .78 H 1 M .13 .06 V .16 M .28 .06 V .16 M .43 .06 V .16 M .58 .06 V .16 M .73 .06 V .16 M .88 .06 V .16 M .13 .84 V .94 M .28 .84 V .94 M .43 .84 V .94 M .58 .84 V .94 M .73 .84 V .94 M .88 .84 V .94',
    [0.12, 0.34, 0.76, 0.32],
    208,
    112,
  ),
  nas: deviceSymbol(
    deviceChamfer,
    'M .14 .1 H .86 V .24 H .14 Z M .14 .76 H .86 V .9 H .14 Z M .25 .13 V .21 M .45 .13 V .21 M .65 .13 V .21 M .25 .79 V .87 M .45 .79 V .87 M .65 .79 V .87',
    [0.16, 0.36, 0.68, 0.28],
    168,
    176,
  ),
  'hard-drive': deviceSymbol(
    deviceChamfer,
    'M .2 .68 Q .05 .42 .25 .2 Q .5 -.02 .75 .2 Q .95 .4 .8 .65 M .38 .24 Q .5 .12 .62 .24 M .38 .76 L .8 .4 L .87 .49 L .52 .84 Z M .1 .91 H .3 M .7 .91 H .9',
    [0.25, 0.35, 0.5, 0.25],
    144,
    176,
  ),
  ssd: deviceSymbol(
    [
      [0.08, 0],
      [0.92, 0],
      [1, 0.1],
      [1, 0.9],
      [0.92, 1],
      [0.08, 1],
      [0, 0.9],
      [0, 0.1],
    ],
    'M .13 .12 H .87 V .28 H .13 Z M .14 .76 H .75 M .22 .84 V .96 M .36 .84 V .96 M .5 .84 V .96 M .64 .84 V .96 M .86 .77 V .91',
    [0.16, 0.36, 0.68, 0.28],
    160,
    128,
  ),
  'usb-drive': deviceSymbol(
    [
      [0.28, 0],
      [0.72, 0],
      [0.72, 0.28],
      [0.9, 0.28],
      [1, 0.4],
      [1, 0.9],
      [0.9, 1],
      [0.1, 1],
      [0, 0.9],
      [0, 0.4],
      [0.1, 0.28],
      [0.28, 0.28],
    ],
    'M .28 .28 H .72 M .38 .07 V .18 M .62 .07 V .18 M .2 .85 H .8',
    [0.16, 0.45, 0.68, 0.26],
    104,
    176,
  ),
  memory: deviceSymbol(
    [
      [0, 0.05],
      [1, 0.05],
      [1, 0.8],
      [0.88, 0.8],
      [0.88, 1],
      [0.58, 1],
      [0.58, 0.85],
      [0.48, 0.85],
      [0.48, 1],
      [0.12, 1],
      [0.12, 0.8],
      [0, 0.8],
    ],
    'M .12 .15 H .31 V .3 H .12 Z M .4 .15 H .59 V .3 H .4 Z M .68 .15 H .87 V .3 H .68 Z M .2 .88 V .98 M .32 .88 V .98 M .7 .88 V .98 M .8 .88 V .98',
    [0.12, 0.4, 0.76, 0.26],
    208,
    104,
  ),
  cpu: deviceSymbol(
    deviceBox,
    'M .2 .2 H .8 V .8 H .2 Z M .32 0 V .14 M .5 0 V .14 M .68 0 V .14 M .32 .86 V 1 M .5 .86 V 1 M .68 .86 V 1 M 0 .32 H .14 M 0 .5 H .14 M 0 .68 H .14 M .86 .32 H 1 M .86 .5 H 1 M .86 .68 H 1',
    [0.3, 0.35, 0.4, 0.3],
    144,
    144,
  ),
  lock: deviceSymbol(
    [
      [0.25, 0],
      [0.75, 0],
      [0.88, 0.12],
      [0.88, 0.32],
      [1, 0.32],
      [1, 1],
      [0, 1],
      [0, 0.32],
      [0.12, 0.32],
      [0.12, 0.12],
    ],
    'M .12 .32 H .88 M .3 .31 V .16 H .7 V .31 M .46 .8 H .54 V .91 H .46 Z',
    [0.15, 0.43, 0.7, 0.24],
    144,
    160,
  ),
  key: deviceSymbol(
    [
      [0, 0.16],
      [0.16, 0],
      [0.38, 0],
      [0.54, 0.16],
      [0.54, 0.36],
      [1, 0.36],
      [1, 0.8],
      [0.16, 0.8],
      [0, 0.64],
    ],
    'M .14 .23 H .32 V .47 H .14 Z M .7 .8 V .62 H .82 V .8 M .9 .8 V .62',
    [0.55, 0.4, 0.4, 0.16],
    192,
    112,
  ),
  'shield-check': deviceSymbol(
    deviceShield,
    'M .22 .3 L .42 .48 L .77 .12',
    [0.24, 0.54, 0.52, 0.16],
    144,
    168,
  ),
  camera: deviceSymbol(
    [
      [0, 0.2],
      [0.25, 0.2],
      [0.32, 0],
      [0.68, 0],
      [0.75, 0.2],
      [1, 0.2],
      [1, 1],
      [0, 1],
    ],
    'M .16 .32 H .29 M .36 .4 Q .5 .27 .64 .4 Q .78 .55 .64 .7 Q .5 .83 .36 .7 Q .22 .55 .36 .4 M .35 .88 H .65',
    [0.39, 0.43, 0.22, 0.24],
    176,
    144,
  ),
  'video-camera': deviceSymbol(
    [
      [0, 0.12],
      [0.68, 0.12],
      [0.68, 0.34],
      [1, 0.08],
      [1, 0.92],
      [0.68, 0.66],
      [0.68, 0.88],
      [0, 0.88],
    ],
    'M .68 .34 V .66 M .12 .24 H .46 M .12 .76 H .46',
    [0.1, 0.36, 0.48, 0.28],
    192,
    112,
  ),
  folder: deviceSymbol(
    [
      [0, 0],
      [0.38, 0],
      [0.48, 0.2],
      [1, 0.2],
      [1, 1],
      [0, 1],
    ],
    'M 0 .2 H .48 M .08 .86 H .92',
    [0.12, 0.36, 0.76, 0.32],
    192,
    136,
  ),
  'block-arrow-four-way': deviceSymbol(
    [
      [0.5, 0],
      [0.3, 0.2],
      [0.4, 0.2],
      [0.4, 0.4],
      [0.2, 0.4],
      [0.2, 0.3],
      [0, 0.5],
      [0.2, 0.7],
      [0.2, 0.6],
      [0.4, 0.6],
      [0.4, 0.8],
      [0.3, 0.8],
      [0.5, 1],
      [0.7, 0.8],
      [0.6, 0.8],
      [0.6, 0.6],
      [0.8, 0.6],
      [0.8, 0.7],
      [1, 0.5],
      [0.8, 0.3],
      [0.8, 0.4],
      [0.6, 0.4],
      [0.6, 0.2],
      [0.7, 0.2],
    ],
    '',
    [0.43, 0.43, 0.14, 0.14],
    176,
    176,
  ),
  'block-arrow-three-way': deviceSymbol(
    [
      [0.5, 0],
      [0.27, 0.26],
      [0.4, 0.26],
      [0.4, 0.45],
      [0.25, 0.45],
      [0.25, 0.32],
      [0, 0.58],
      [0.25, 0.84],
      [0.25, 0.71],
      [0.75, 0.71],
      [0.75, 0.84],
      [1, 0.58],
      [0.75, 0.32],
      [0.75, 0.45],
      [0.6, 0.45],
      [0.6, 0.26],
      [0.73, 0.26],
    ],
    '',
    [0.43, 0.47, 0.14, 0.2],
    192,
    144,
  ),
  'block-arrow-up-right': deviceSymbol(
    [
      [0, 0.72],
      [0.28, 1],
      [0.65, 0.63],
      [0.85, 0.83],
      [1, 0],
      [0.17, 0.15],
      [0.37, 0.35],
    ],
    '',
    [0.34, 0.4, 0.24, 0.18],
    160,
    160,
  ),
  'block-arrow-down-right': deviceSymbol(
    [
      [0, 0.28],
      [0.28, 0],
      [0.65, 0.37],
      [0.85, 0.17],
      [1, 1],
      [0.17, 0.85],
      [0.37, 0.65],
    ],
    '',
    [0.34, 0.42, 0.24, 0.18],
    160,
    160,
  ),
  'block-arrow-pentagon': deviceSymbol(
    [
      [0, 0],
      [0.64, 0],
      [1, 0.5],
      [0.64, 1],
      [0, 1],
    ],
    '',
    [0.13, 0.27, 0.52, 0.46],
    176,
    112,
  ),
  'striped-arrow': deviceSymbol(
    [
      [0.14, 0.18],
      [0.62, 0.18],
      [0.62, 0],
      [1, 0.5],
      [0.62, 1],
      [0.62, 0.82],
      [0.14, 0.82],
    ],
    'M .23 .18 V .82 M .32 .18 V .82',
    [0.38, 0.33, 0.3, 0.34],
    192,
    112,
  ),
  'wide-chevron': deviceSymbol(
    [
      [0, 0],
      [0.65, 0],
      [1, 0.5],
      [0.65, 1],
      [0, 1],
      [0.2, 0.5],
    ],
    '',
    [0.29, 0.32, 0.4, 0.36],
    176,
    112,
  ),

  kite: {
    width: 144,
    height: 160,
    labelBox: (w, h) => ({
      x: w * 0.34,
      y: h * 0.3,
      width: w * 0.32,
      height: h * 0.3,
    }),
    ...polygon([
      { x: 0.5, y: 0 },
      { x: 1, y: 0.35 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.35 },
    ]),
  },
  heptagon: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0.5, y: 0.0 },
      { x: 0.890916, y: 0.188255 },
      { x: 0.987464, y: 0.61126 },
      { x: 0.716942, y: 0.950484 },
      { x: 0.283058, y: 0.950484 },
      { x: 0.012536, y: 0.61126 },
      { x: 0.109084, y: 0.188255 },
    ]),
  },
  nonagon: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0.5, y: 0.0 },
      { x: 0.821394, y: 0.116978 },
      { x: 0.992404, y: 0.413176 },
      { x: 0.933013, y: 0.75 },
      { x: 0.67101, y: 0.969846 },
      { x: 0.32899, y: 0.969846 },
      { x: 0.066987, y: 0.75 },
      { x: 0.007596, y: 0.413176 },
      { x: 0.178606, y: 0.116978 },
    ]),
  },
  decagon: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0.5, y: 0.0 },
      { x: 0.793893, y: 0.095492 },
      { x: 0.975528, y: 0.345492 },
      { x: 0.975528, y: 0.654508 },
      { x: 0.793893, y: 0.904508 },
      { x: 0.5, y: 1.0 },
      { x: 0.206107, y: 0.904508 },
      { x: 0.024472, y: 0.654508 },
      { x: 0.024472, y: 0.345492 },
      { x: 0.206107, y: 0.095492 },
    ]),
  },
  'star-4': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.38,
      y: h * 0.4,
      width: w * 0.24,
      height: h * 0.2,
    }),
    ...polygon([
      { x: 0.5, y: 0.0 },
      { x: 0.662635, y: 0.337365 },
      { x: 1.0, y: 0.5 },
      { x: 0.662635, y: 0.662635 },
      { x: 0.5, y: 1.0 },
      { x: 0.337365, y: 0.662635 },
      { x: 0.0, y: 0.5 },
      { x: 0.337365, y: 0.337365 },
    ]),
  },
  'star-5': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.38,
      y: h * 0.4,
      width: w * 0.24,
      height: h * 0.2,
    }),
    ...polygon([
      { x: 0.5, y: 0.0 },
      { x: 0.635191, y: 0.313926 },
      { x: 0.975528, y: 0.345492 },
      { x: 0.718743, y: 0.571074 },
      { x: 0.793893, y: 0.904508 },
      { x: 0.5, y: 0.73 },
      { x: 0.206107, y: 0.904508 },
      { x: 0.281257, y: 0.571074 },
      { x: 0.024472, y: 0.345492 },
      { x: 0.364809, y: 0.313926 },
    ]),
  },
  'star-6': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.38,
      y: h * 0.4,
      width: w * 0.24,
      height: h * 0.2,
    }),
    ...polygon([
      { x: 0.5, y: 0.0 },
      { x: 0.615, y: 0.300814 },
      { x: 0.933013, y: 0.25 },
      { x: 0.73, y: 0.5 },
      { x: 0.933013, y: 0.75 },
      { x: 0.615, y: 0.699186 },
      { x: 0.5, y: 1.0 },
      { x: 0.385, y: 0.699186 },
      { x: 0.066987, y: 0.75 },
      { x: 0.27, y: 0.5 },
      { x: 0.066987, y: 0.25 },
      { x: 0.385, y: 0.300814 },
    ]),
  },
  'star-8': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.38,
      y: h * 0.4,
      width: w * 0.24,
      height: h * 0.2,
    }),
    ...polygon([
      { x: 0.5, y: 0.0 },
      { x: 0.588017, y: 0.287508 },
      { x: 0.853553, y: 0.146447 },
      { x: 0.712492, y: 0.411983 },
      { x: 1.0, y: 0.5 },
      { x: 0.712492, y: 0.588017 },
      { x: 0.853553, y: 0.853553 },
      { x: 0.588017, y: 0.712492 },
      { x: 0.5, y: 1.0 },
      { x: 0.411983, y: 0.712492 },
      { x: 0.146447, y: 0.853553 },
      { x: 0.287508, y: 0.588017 },
      { x: 0.0, y: 0.5 },
      { x: 0.287508, y: 0.411983 },
      { x: 0.146447, y: 0.146447 },
      { x: 0.411983, y: 0.287508 },
    ]),
  },
  'star-12': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.38,
      y: h * 0.4,
      width: w * 0.24,
      height: h * 0.2,
    }),
    ...polygon([
      { x: 0.5, y: 0.0 },
      { x: 0.559528, y: 0.277837 },
      { x: 0.75, y: 0.066987 },
      { x: 0.662635, y: 0.337365 },
      { x: 0.933013, y: 0.25 },
      { x: 0.722163, y: 0.440472 },
      { x: 1.0, y: 0.5 },
      { x: 0.722163, y: 0.559528 },
      { x: 0.933013, y: 0.75 },
      { x: 0.662635, y: 0.662635 },
      { x: 0.75, y: 0.933013 },
      { x: 0.559528, y: 0.722163 },
      { x: 0.5, y: 1.0 },
      { x: 0.440472, y: 0.722163 },
      { x: 0.25, y: 0.933013 },
      { x: 0.337365, y: 0.662635 },
      { x: 0.066987, y: 0.75 },
      { x: 0.277837, y: 0.559528 },
      { x: 0.0, y: 0.5 },
      { x: 0.277837, y: 0.440472 },
      { x: 0.066987, y: 0.25 },
      { x: 0.337365, y: 0.337365 },
      { x: 0.25, y: 0.066987 },
      { x: 0.440472, y: 0.277837 },
    ]),
  },
  'block-arrow-right': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.12,
      y: h * 0.35,
      width: w * 0.45,
      height: h * 0.3,
    }),
    ...polygon([
      { x: 0, y: 0.3 },
      { x: 0.6, y: 0.3 },
      { x: 0.6, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.6, y: 1 },
      { x: 0.6, y: 0.7 },
      { x: 0, y: 0.7 },
    ]),
  },
  'block-arrow-left': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.43,
      y: h * 0.35,
      width: w * 0.45,
      height: h * 0.3,
    }),
    ...polygon([
      { x: 1, y: 0.3 },
      { x: 0.4, y: 0.3 },
      { x: 0.4, y: 0 },
      { x: 0, y: 0.5 },
      { x: 0.4, y: 1 },
      { x: 0.4, y: 0.7 },
      { x: 1, y: 0.7 },
    ]),
  },
  'block-arrow-up': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.35,
      y: h * 0.5,
      width: w * 0.3,
      height: h * 0.4,
    }),
    ...polygon([
      { x: 0.3, y: 1 },
      { x: 0.3, y: 0.4 },
      { x: 0, y: 0.4 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0.4 },
      { x: 0.7, y: 0.4 },
      { x: 0.7, y: 1 },
    ]),
  },
  'block-arrow-down': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.35,
      y: h * 0.1,
      width: w * 0.3,
      height: h * 0.4,
    }),
    ...polygon([
      { x: 0.3, y: 0 },
      { x: 0.3, y: 0.6 },
      { x: 0, y: 0.6 },
      { x: 0.5, y: 1 },
      { x: 1, y: 0.6 },
      { x: 0.7, y: 0.6 },
      { x: 0.7, y: 0 },
    ]),
  },
  'block-arrow-both': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.36,
      width: w * 0.44,
      height: h * 0.28,
    }),
    ...polygon([
      { x: 0, y: 0.5 },
      { x: 0.25, y: 0 },
      { x: 0.25, y: 0.3 },
      { x: 0.75, y: 0.3 },
      { x: 0.75, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.75, y: 1 },
      { x: 0.75, y: 0.7 },
      { x: 0.25, y: 0.7 },
      { x: 0.25, y: 1 },
    ]),
  },
  'block-arrow-vertical': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.36,
      y: h * 0.3,
      width: w * 0.28,
      height: h * 0.4,
    }),
    ...polygon([
      { x: 0.5, y: 0 },
      { x: 0, y: 0.25 },
      { x: 0.3, y: 0.25 },
      { x: 0.3, y: 0.75 },
      { x: 0, y: 0.75 },
      { x: 0.5, y: 1 },
      { x: 1, y: 0.75 },
      { x: 0.7, y: 0.75 },
      { x: 0.7, y: 0.25 },
      { x: 1, y: 0.25 },
    ]),
  },
  'notched-arrow': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.6, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.6, y: 1 },
      { x: 0.6, y: 0.8 },
      { x: 0, y: 0.8 },
      { x: 0.2, y: 0.5 },
    ]),
  },
  'manual-input': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0.25 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]),
  },
  'manual-operation': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.75, y: 1 },
      { x: 0.25, y: 1 },
    ]),
  },
  offpage: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.65 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.65 },
    ]),
  },
  delay: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 0.0 },
      { x: 0.565263, y: 0.004278 },
      { x: 0.62941, y: 0.017037 },
      { x: 0.691342, y: 0.03806 },
      { x: 0.75, y: 0.066987 },
      { x: 0.804381, y: 0.103323 },
      { x: 0.853553, y: 0.146447 },
      { x: 0.896677, y: 0.195619 },
      { x: 0.933013, y: 0.25 },
      { x: 0.96194, y: 0.308658 },
      { x: 0.982963, y: 0.37059 },
      { x: 0.995722, y: 0.434737 },
      { x: 1.0, y: 0.5 },
      { x: 0.995722, y: 0.565263 },
      { x: 0.982963, y: 0.62941 },
      { x: 0.96194, y: 0.691342 },
      { x: 0.933013, y: 0.75 },
      { x: 0.896677, y: 0.804381 },
      { x: 0.853553, y: 0.853553 },
      { x: 0.804381, y: 0.896677 },
      { x: 0.75, y: 0.933013 },
      { x: 0.691342, y: 0.96194 },
      { x: 0.62941, y: 0.982963 },
      { x: 0.565263, y: 0.995722 },
      { x: 0.5, y: 1.0 },
      { x: 0, y: 1 },
    ]),
  },
  display: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0.5 },
      { x: 0.2, y: 0 },
      { x: 0.65, y: 0 },
      { x: 0.65, y: 0.0 },
      { x: 0.695684, y: 0.004278 },
      { x: 0.740587, y: 0.017037 },
      { x: 0.783939, y: 0.03806 },
      { x: 0.825, y: 0.066987 },
      { x: 0.863067, y: 0.103323 },
      { x: 0.897487, y: 0.146447 },
      { x: 0.927674, y: 0.195619 },
      { x: 0.953109, y: 0.25 },
      { x: 0.973358, y: 0.308658 },
      { x: 0.988074, y: 0.37059 },
      { x: 0.997006, y: 0.434737 },
      { x: 1.0, y: 0.5 },
      { x: 0.997006, y: 0.565263 },
      { x: 0.988074, y: 0.62941 },
      { x: 0.973358, y: 0.691342 },
      { x: 0.953109, y: 0.75 },
      { x: 0.927674, y: 0.804381 },
      { x: 0.897487, y: 0.853553 },
      { x: 0.863067, y: 0.896677 },
      { x: 0.825, y: 0.933013 },
      { x: 0.783939, y: 0.96194 },
      { x: 0.740587, y: 0.982963 },
      { x: 0.695684, y: 0.995722 },
      { x: 0.65, y: 1.0 },
      { x: 0.2, y: 1 },
    ]),
  },
  'internal-storage': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]),
    path: (w, h) =>
      polygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]).path(w, h, 0) + ` M ${w * 0.16} 0 V ${h} M 0 ${h * 0.2} H ${w}`,
  },
  'speech-bubble': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.75 },
      { x: 0.45, y: 0.75 },
      { x: 0.2, y: 1 },
      { x: 0.2, y: 0.75 },
      { x: 0, y: 0.75 },
    ]),
  },
  'speech-bubble-right': {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0.75 },
      { x: 0.55, y: 0.75 },
      { x: 0.8, y: 1 },
      { x: 0.8, y: 0.75 },
      { x: 1, y: 0.75 },
    ]),
  },
  burst: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0.5, y: 0.0 },
      { x: 0.619707, y: 0.171108 },
      { x: 0.821394, y: 0.116978 },
      { x: 0.803109, y: 0.325 },
      { x: 0.992404, y: 0.413176 },
      { x: 0.844683, y: 0.560777 },
      { x: 0.933013, y: 0.75 },
      { x: 0.724976, y: 0.768116 },
      { x: 0.67101, y: 0.969846 },
      { x: 0.5, y: 0.85 },
      { x: 0.32899, y: 0.969846 },
      { x: 0.275024, y: 0.768116 },
      { x: 0.066987, y: 0.75 },
      { x: 0.155317, y: 0.560777 },
      { x: 0.007596, y: 0.413176 },
      { x: 0.196891, y: 0.325 },
      { x: 0.178606, y: 0.116978 },
      { x: 0.380293, y: 0.171108 },
    ]),
  },
  shield: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.9, y: 0.65 },
      { x: 0.5, y: 1 },
      { x: 0.1, y: 0.65 },
    ]),
  },
  bookmark: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0.5, y: 0.72 },
      { x: 0, y: 1 },
    ]),
  },
  ribbon: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.83, y: 0.5 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0.17, y: 0.5 },
    ]),
  },
  ticket: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.3 },
      { x: 0.85, y: 0.5 },
      { x: 1, y: 0.7 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0.7 },
      { x: 0.15, y: 0.5 },
      { x: 0, y: 0.3 },
    ]),
  },
  house: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.28,
      y: h * 0.32,
      width: w * 0.44,
      height: h * 0.36,
    }),
    ...polygon([
      { x: 0, y: 0.4 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0.4 },
      { x: 0.85, y: 0.4 },
      { x: 0.85, y: 1 },
      { x: 0.15, y: 1 },
      { x: 0.15, y: 0.4 },
    ]),
  },
  factory: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.15,
      y: h * 0.48,
      width: w * 0.7,
      height: h * 0.4,
    }),
    ...polygon([
      { x: 0, y: 0.35 },
      { x: 0.3, y: 0.1 },
      { x: 0.3, y: 0.35 },
      { x: 0.6, y: 0.1 },
      { x: 0.6, y: 0.35 },
      { x: 0.8, y: 0.35 },
      { x: 0.8, y: 0 },
      { x: 0.92, y: 0 },
      { x: 0.92, y: 0.35 },
      { x: 1, y: 0.35 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]),
  },
  envelope: {
    width: 160,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.2,
      y: h * 0.65,
      width: w * 0.6,
      height: h * 0.25,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]),
    path: (w, h) =>
      polygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]).path(w, h, 0) + ` M 0 0 L ${w * 0.5} ${h * 0.55} L ${w} 0`,
  },
  monitor: {
    width: 192,
    height: 144,
    labelBox: (w, h) => ({
      x: w * 0.12,
      y: h * 0.15,
      width: w * 0.76,
      height: h * 0.4,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.75 },
      { x: 0.6, y: 0.75 },
      { x: 0.6, y: 0.9 },
      { x: 0.8, y: 0.9 },
      { x: 0.8, y: 1 },
      { x: 0.2, y: 1 },
      { x: 0.2, y: 0.9 },
      { x: 0.4, y: 0.9 },
      { x: 0.4, y: 0.75 },
      { x: 0, y: 0.75 },
    ]),
    path: (w, h) =>
      polygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0.75 },
        { x: 0.6, y: 0.75 },
        { x: 0.6, y: 0.9 },
        { x: 0.8, y: 0.9 },
        { x: 0.8, y: 1 },
        { x: 0.2, y: 1 },
        { x: 0.2, y: 0.9 },
        { x: 0.4, y: 0.9 },
        { x: 0.4, y: 0.75 },
        { x: 0, y: 0.75 },
      ]).path(w, h, 0) +
      ` M ${w * 0.08} ${h * 0.08} H ${w * 0.92} V ${h * 0.65} H ${w * 0.08} Z`,
  },
  laptop: {
    width: 192,
    height: 120,
    labelBox: (w, h) => ({
      x: w * 0.25,
      y: h * 0.2,
      width: w * 0.5,
      height: h * 0.3,
    }),
    ...polygon([
      { x: 0.1, y: 0 },
      { x: 0.9, y: 0 },
      { x: 0.9, y: 0.75 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0.1, y: 0.75 },
    ]),
    path: (w, h) =>
      polygon([
        { x: 0.1, y: 0 },
        { x: 0.9, y: 0 },
        { x: 0.9, y: 0.75 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0.1, y: 0.75 },
      ]).path(w, h, 0) +
      ` M ${w * 0.1} ${h * 0.75} H ${w * 0.9} M ${w * 0.2} ${h * 0.1} H ${w * 0.8} V ${h * 0.6} H ${w * 0.2} Z`,
  },
  phone: {
    width: 88,
    height: 160,
    labelBox: (w, h) => ({
      x: w * 0.3,
      y: h * 0.25,
      width: w * 0.4,
      height: h * 0.45,
    }),
    ...polygon([
      { x: 0.15, y: 0 },
      { x: 0.85, y: 0 },
      { x: 0.85, y: 1 },
      { x: 0.15, y: 1 },
    ]),
    path: (w, h) =>
      polygon([
        { x: 0.15, y: 0 },
        { x: 0.85, y: 0 },
        { x: 0.85, y: 1 },
        { x: 0.15, y: 1 },
      ]).path(w, h, 0) +
      ` M ${w * 0.25} ${h * 0.15} H ${w * 0.75} V ${h * 0.8} H ${w * 0.25} Z M ${w * 0.4} ${h * 0.9} H ${w * 0.6}`,
  },
  server: {
    width: 120,
    height: 192,
    labelBox: (w, h) => ({
      x: w * 0.4,
      y: h * 0.38,
      width: w * 0.4,
      height: h * 0.2,
    }),
    ...polygon([
      { x: 0.1, y: 0 },
      { x: 0.9, y: 0 },
      { x: 0.9, y: 1 },
      { x: 0.1, y: 1 },
    ]),
    path: (w, h) =>
      polygon([
        { x: 0.1, y: 0 },
        { x: 0.9, y: 0 },
        { x: 0.9, y: 1 },
        { x: 0.1, y: 1 },
      ]).path(w, h, 0) +
      ` M ${w * 0.1} ${h / 3} H ${w * 0.9} M ${w * 0.1} ${(h * 2) / 3} H ${w * 0.9} M ${w * 0.2} ${h * 0.16} H ${w * 0.35} M ${w * 0.2} ${h * 0.5} H ${w * 0.35} M ${w * 0.2} ${h * 0.84} H ${w * 0.35}`,
  },
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
  junction: {
    width: 16,
    height: 16,
    labelBox: (w, h) => {
      const side = Math.min(w, h) / 2;
      return {
        x: (w - side) / 2,
        y: (h - side) / 2,
        width: side,
        height: side,
      };
    },
    path: (w, h) => {
      const radius = Math.min(w, h) / 2;
      return `M ${w / 2 - radius} ${h / 2} A ${radius} ${radius} 0 1 0 ${w / 2 + radius} ${h / 2} A ${radius} ${radius} 0 1 0 ${w / 2 - radius} ${h / 2} Z`;
    },
    contains: (p, w, h) =>
      Math.hypot(p.x - w / 2, p.y - h / 2) <= Math.min(w, h) / 2,
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
  container: {
    width: 320,
    height: 240,
    container: true,
    ...rounded,
    labelBox: (width, height) => containerTextBoxes(width, height).body,
    path(w, h, radius) {
      const y = containerHeaderHeight(h);
      const r = Math.min(radius, w / 2, h / 2);
      const inset = y < r ? r * (1 - Math.sqrt(y / r)) ** 2 : 0;
      return `${rounded.path(w, h, radius)} M ${inset} ${y} H ${w - inset}`;
    },
  },
  table: {
    width: 360,
    height: 210,
    ...box,
    path: (w, h) =>
      `${box.path(w, h, 0)} M 0 ${h / 3} H ${w} M 0 ${(h * 2) / 3} H ${w} M ${w / 3} 0 V ${h} M ${(w * 2) / 3} 0 V ${h}`,
  },
  document: {
    width: 176,
    height: 136,
    labelBox: (width, height) => ({
      x: width * 0.1,
      y: height * 0.1,
      width: width * 0.8,
      height: height * 0.55,
    }),
    path: (w, h) =>
      `M 0 0 H ${w} V ${h * 0.88} Q ${w * 0.75} ${h * 0.72} ${w * 0.5} ${h * 0.88} Q ${w * 0.25} ${h * 1.04} 0 ${h * 0.88} Z`,
    contains(p, w, h) {
      if (w <= 0 || h <= 0 || p.x < 0 || p.x > w || p.y < 0) return false;
      const x = p.x / w;
      const wave =
        x >= 0.5
          ? -0.32 * (2 * x - 1) * (2 - 2 * x)
          : 0.32 * (2 * x) * (1 - 2 * x);
      return p.y <= h * (0.88 + wave);
    },
  },
  database: {
    width: 160,
    height: 136,
    labelBox: (width, height) => ({
      x: width * 0.1,
      y: height * 0.28,
      width: width * 0.8,
      height: height * 0.46,
    }),
    path(w, h) {
      const r = h * 0.16;
      return `M 0 ${r} A ${w / 2} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${w / 2} ${r} 0 0 1 0 ${h - r} Z M 0 ${r} A ${w / 2} ${r} 0 0 0 ${w} ${r} A ${w / 2} ${r} 0 0 1 0 ${r}`;
    },
    contains(p, w, h) {
      if (w <= 0 || h <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h)
        return false;
      const r = h * 0.16;
      if (p.y >= r && p.y <= h - r) return true;
      const cy = p.y < r ? r : h - r;
      return ((p.x - w / 2) / (w / 2)) ** 2 + ((p.y - cy) / r) ** 2 <= 1;
    },
  },
  cloud: {
    width: 200,
    height: 136,
    labelBox: (width, height) => ({
      x: width * 0.18,
      y: height * 0.4,
      width: width * 0.64,
      height: height * 0.3,
    }),
    ...polygon(cloudContour()),
  },
  note: {
    width: 160,
    height: 136,
    labelBox: (width, height) => ({
      x: width * 0.1,
      y: height * 0.28,
      width: width * 0.8,
      height: height * 0.6,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 0.75, y: 0 },
      { x: 1, y: 0.25 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]),
    path: (w, h) =>
      `M 0 0 H ${w * 0.75} L ${w} ${h * 0.25} V ${h} H 0 Z M ${w * 0.75} 0 V ${h * 0.25} H ${w} H ${w * 0.75} V 0`,
  },
  'predefined-process': {
    width: 192,
    height: 96,
    ...box,
    labelBox: (width, height) => ({
      x: width * 0.18,
      y: height * 0.1,
      width: width * 0.64,
      height: height * 0.8,
    }),
    path: (w, h) =>
      `M 0 0 H ${w} V ${h} H 0 Z M ${w * 0.12} 0 V ${h} M ${w * 0.88} 0 V ${h}`,
  },
  trapezoid: {
    width: 176,
    height: 104,
    labelBox: (width, height) => ({
      x: width * 0.25,
      y: height * 0.1,
      width: width * 0.5,
      height: height * 0.8,
    }),
    ...polygon([
      { x: 0.25, y: 0 },
      { x: 0.75, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]),
  },
  pentagon: {
    width: 144,
    height: 136,
    labelBox: (width, height) => ({
      x: width * 0.23,
      y: height * 0.38,
      width: width * 0.54,
      height: height * 0.5,
    }),
    ...polygon([
      { x: 0.5, y: 0 },
      { x: 1, y: 0.38 },
      { x: 0.82, y: 1 },
      { x: 0.18, y: 1 },
      { x: 0, y: 0.38 },
    ]),
  },
  octagon: {
    width: 144,
    height: 144,
    labelBox: (width, height) => ({
      x: width * 0.22,
      y: height * 0.22,
      width: width * 0.56,
      height: height * 0.56,
    }),
    ...polygon([
      { x: 0.3, y: 0 },
      { x: 0.7, y: 0 },
      { x: 1, y: 0.3 },
      { x: 1, y: 0.7 },
      { x: 0.7, y: 1 },
      { x: 0.3, y: 1 },
      { x: 0, y: 0.7 },
      { x: 0, y: 0.3 },
    ]),
  },
  chevron: {
    width: 192,
    height: 104,
    labelBox: (width, height) => ({
      x: width * 0.32,
      y: height * 0.18,
      width: width * 0.4,
      height: height * 0.64,
    }),
    ...polygon([
      { x: 0, y: 0 },
      { x: 0.72, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.72, y: 1 },
      { x: 0, y: 1 },
      { x: 0.28, y: 0.5 },
    ]),
  },
  cross: {
    width: 160,
    height: 160,
    labelBox: (width, height) => ({
      x: width * 0.33,
      y: height * 0.33,
      width: width * 0.34,
      height: height * 0.34,
    }),
    ...polygon([
      { x: 0.33, y: 0 },
      { x: 0.67, y: 0 },
      { x: 0.67, y: 0.33 },
      { x: 1, y: 0.33 },
      { x: 1, y: 0.67 },
      { x: 0.67, y: 0.67 },
      { x: 0.67, y: 1 },
      { x: 0.33, y: 1 },
      { x: 0.33, y: 0.67 },
      { x: 0, y: 0.67 },
      { x: 0, y: 0.33 },
      { x: 0.33, y: 0.33 },
    ]),
  },
};
/** Reflect in element-local axes, before rotation. Reflection is its own inverse. */
export function reflectPoint(p: Point, g: Geometry): Point {
  const c = shapeCenter(g);
  return {
    x: g.flipX === true ? 2 * c.x - p.x : p.x,
    y: g.flipY === true ? 2 * c.y - p.y : p.y,
  };
}
export function containsShape(
  kind: string,
  g: Geometry,
  p: Point,
  radius = 16,
): boolean {
  const local = reflectPoint(rotatePoint(p, shapeCenter(g), -g.rotation), g);
  return (
    isShapeKind(kind) ? shapeRegistry[kind] : shapeRegistry.rectangle
  ).contains({ x: local.x - g.x, y: local.y - g.y }, g.width, g.height, radius);
}
/** Polygon contours use their outermost ray intersection; curved convex contours retain bounded search. */
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
  const definition = isShapeKind(kind)
    ? shapeRegistry[kind]
    : shapeRegistry.rectangle;
  if (definition.rayBoundary) {
    const local = reflectPoint(rotatePoint(toward, c, -g.rotation), g);
    const boundary = definition.rayBoundary(
      { x: local.x - g.x, y: local.y - g.y },
      g.width,
      g.height,
    );
    return rotatePoint(
      reflectPoint({ x: boundary.x + g.x, y: boundary.y + g.y }, g),
      c,
      g.rotation,
    );
  }
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
export type Anchor = ConnectionAnchor;
export function anchorPoint(
  node: Pick<Node, 'kind' | 'geometry'>,
  toward: Point,
  anchor: Anchor = 'auto',
  radius = 16,
): Point {
  const c = shapeCenter(node.geometry);
  if (node.kind === 'junction') return c;
  const directions = {
    north: { x: 0, y: -1 },
    east: { x: 1, y: 0 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
  };
  const d =
    typeof anchor === 'object'
      ? {
          x: (anchor.x - 0.5) * node.geometry.width,
          y: (anchor.y - 0.5) * node.geometry.height,
        }
      : anchor === 'auto'
        ? null
        : directions[anchor];
  return boundaryPoint(
    node.kind,
    node.geometry,
    d
      ? rotatePoint(
          reflectPoint({ x: c.x + d.x, y: c.y + d.y }, node.geometry),
          c,
          node.geometry.rotation,
        )
      : toward,
    radius,
  );
}

export interface ConnectionPort {
  anchor: Anchor;
  point: Point;
}
/** Candidate density may change with size; saved anchors never depend on this list. */
export function connectionPortsForNode(
  node: Pick<Node, 'kind' | 'geometry'>,
  radius = 16,
): ConnectionPort[] {
  const center = shapeCenter(node.geometry);
  if (node.kind === 'junction') return [{ anchor: 'auto', point: center }];
  if (['line', 'arrow', 'freehand'].includes(node.kind)) return [];
  const anchors: Anchor[] = ['north', 'east', 'south', 'west'];
  const { width, height } = node.geometry;
  if (node.kind === 'triangle') {
    const vertices = [
      { x: 0.5, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const divisions = Math.min(
      8,
      2 + 2 * Math.floor(Math.max(width, height) / 300),
    );
    for (let edge = 0; edge < vertices.length; edge++) {
      const a = vertices[edge],
        b = vertices[(edge + 1) % vertices.length];
      for (let step = 0; step < divisions; step++) {
        const t = step / divisions;
        anchors.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
  } else if (
    node.kind === 'ellipse' ||
    node.kind.startsWith('star-') ||
    node.kind === 'diamond'
  ) {
    const base = node.kind.startsWith('star-') ? 8 : 4;
    const count = Math.min(
      24,
      base + 4 * Math.floor(Math.max(width, height) / 220),
    );
    for (let index = 0; index < count; index++) {
      const angle = (index / count) * 2 * Math.PI;
      anchors.push({
        x: 0.5 + Math.cos(angle) / 2,
        y: 0.5 + Math.sin(angle) / 2,
      });
    }
  } else {
    // Symmetric side positions give wide tables and equipment useful spaced ports.
    const offsets = (size: number) => {
      const divisions = Math.min(8, 2 + 2 * Math.floor(size / 220));
      return Array.from(
        { length: divisions - 1 },
        (_, index) => (index + 1) / divisions,
      );
    };
    for (const x of offsets(width)) anchors.push({ x, y: 0 }, { x, y: 1 });
    for (const y of offsets(height)) anchors.push({ x: 0, y }, { x: 1, y });
    if (node.kind === 'hexagon')
      anchors.push(
        { x: 0.25, y: 0 },
        { x: 0.75, y: 0 },
        { x: 0.25, y: 1 },
        { x: 0.75, y: 1 },
      );
  }
  const ports: ConnectionPort[] = [];
  for (const anchor of anchors) {
    const point = anchorPoint(node, center, anchor, radius);
    if (
      !ports.some(
        (port) =>
          Math.hypot(port.point.x - point.x, port.point.y - point.y) < 1e-6,
      )
    )
      ports.push({ anchor, point });
  }
  return ports;
}
