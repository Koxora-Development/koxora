import { readRichText, type RichText } from './rich-text';
import { readFreehand, freehandContains } from './freehand';
import { orderedElements } from './stacking';
import { assertEditableElement } from './editing';
import {
  isDrawing,
  lineEndpoints,
  LINE_KEY,
  segmentDistance,
} from './interaction';
import { jsonObject } from './shapes';
import type { Page, Style } from '@koxora/project';
import { intersects, type Bounds, type Point } from './viewport';
import {
  containsShape,
  geometryBounds,
  layerStates,
  MAX_TEXT,
  appearanceResolver,
  CONNECTION_KEY,
  type Appearance,
  type Geometry,
} from './shapes';
import {
  connectionPath,
  readConnection,
  type ConnectionPath,
} from './connections';
export interface SceneNode {
  id: string;
  kind: string;
  bounds: Bounds;
  geometry: Geometry;
  label: string;
  richText?: RichText;
  style: Appearance;
  editable: boolean;
  layerOrder: number;
  paintOrder: number;
  strokePoints?: Point[];
  startArrow?: boolean;
  endArrow?: boolean;
}
export interface SceneConnection extends ConnectionPath {
  id: string;
  label: string;
  richText?: RichText;
  style: Appearance;
  arrow: boolean;
  editable: boolean;
  layerOrder: number;
  paintOrder: number;
}
export interface Scene {
  nodes: SceneNode[];
  connections: SceneConnection[];
  bounds: Bounds | null;
}
export function unionBounds(bounds: Bounds[]): Bounds | null {
  if (!bounds.length) return null;
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const b of bounds) {
    x = Math.min(x, b.x);
    y = Math.min(y, b.y);
    right = Math.max(right, b.x + b.width);
    bottom = Math.max(bottom, b.y + b.height);
  }
  return { x, y, width: right - x, height: bottom - y };
}
function supported(item: Parameters<typeof assertEditableElement>[0]): boolean {
  try {
    assertEditableElement(item);
    return true;
  } catch {
    return false;
  }
}
/** Only safe, bounded geometry and declarative appearance cross into the renderer. Originals are retained. */
export function buildScene(
  page: Pick<Page, 'nodes' | 'connections' | 'layers'> &
    Partial<Pick<Page, 'extensions'>>,
  styles: Style[] = [],
): Scene {
  const layers = layerStates(page.layers);
  const appearance = appearanceResolver(styles);
  const order = new Map(orderedElements(page).map((n, i) => [n.id, i]));
  const nodes: SceneNode[] = page.nodes
    .flatMap((node) => {
      const layer = layers.get(node.layerId),
        g = node.geometry;
      if (
        !layer?.visible ||
        ![g.x, g.y, g.width, g.height, g.rotation].every(
          (n) => Number.isFinite(n) && Math.abs(n) <= 1e12,
        )
      )
        return [];
      const style = appearance(node);
      return [
        {
          id: node.id,
          richText: readRichText(node),
          kind: node.kind,
          strokePoints:
            node.kind === 'freehand' ? readFreehand(node) : undefined,
          geometry: g,
          bounds: nodeBounds(
            g,
            node.kind,
            typeof node.content.text === 'string'
              ? node.content.text.slice(0, MAX_TEXT)
              : '',
            style,
            readRichText(node),
          ),
          startArrow:
            isDrawing(node.kind) &&
            jsonObject(node.extensions[LINE_KEY]).version === 1 &&
            jsonObject(node.extensions[LINE_KEY]).startArrow === true,
          endArrow:
            isDrawing(node.kind) &&
            (jsonObject(node.extensions[LINE_KEY]).version === 1 &&
            typeof jsonObject(node.extensions[LINE_KEY]).endArrow === 'boolean'
              ? jsonObject(node.extensions[LINE_KEY]).endArrow === true
              : node.kind === 'arrow'),
          label:
            typeof node.content.text === 'string'
              ? node.content.text.slice(0, MAX_TEXT)
              : node.kind.slice(0, 120),
          style,
          editable: layer.editable && supported(node),
          layerOrder: layer.order,
          paintOrder: order.get(node.id)!,
        },
      ];
    })
    .sort((a, b) => a.paintOrder - b.paintOrder);
  const visible = new Map(nodes.map((n) => [n.id, n]));
  const byId = new Map(page.nodes.map((n) => [n.id, n]));
  const connections: SceneConnection[] = page.connections
    .flatMap((edge) => {
      const s = visible.get(edge.sourceId),
        t = visible.get(edge.targetId),
        layer = layers.get(edge.layerId);
      if (!s || !t || !layer?.visible) return [];
      const style = appearance(edge, CONNECTION_KEY),
        options = readConnection(edge);
      const path = connectionPath(
        byId.get(s.id)!,
        byId.get(t.id)!,
        options,
        edge.waypoints
          .filter((p) => Math.abs(p.x) <= 1e12 && Math.abs(p.y) <= 1e12)
          .slice(0, 2048),
        s.style.cornerRadius,
        t.style.cornerRadius,
      );
      return [
        {
          ...path,
          id: edge.id,
          richText: readRichText(edge),
          label: options.label,
          arrow: options.arrow,
          style,
          editable:
            layer.editable && s.editable && t.editable && supported(edge),
          layerOrder: layer.order,
          paintOrder: order.get(edge.id)!,
          bounds: unionBounds([
            path.bounds,
            ...(options.label
              ? [
                  connectionLabelBounds(
                    path.labelPoint,
                    options.label,
                    style,
                    readRichText(edge),
                  ),
                ]
              : []),
            {
              x:
                path.points.at(-1)!.x -
                Math.max(16, style.strokeWidth * 3 * 1.12),
              y:
                path.points.at(-1)!.y -
                Math.max(16, style.strokeWidth * 3 * 1.12),
              width: Math.max(16, style.strokeWidth * 3 * 1.12) * 2,
              height: Math.max(16, style.strokeWidth * 3 * 1.12) * 2,
            },
          ])!,
        },
      ];
    })
    .sort((a, b) => a.paintOrder - b.paintOrder);
  return {
    nodes,
    connections,
    bounds: unionBounds([
      ...nodes.map((n) => n.bounds),
      ...connections.map((c) => c.bounds),
    ]),
  };
}
export function visibleScene(scene: Scene, viewport: Bounds): Scene {
  return {
    ...scene,
    nodes: scene.nodes.filter((n) => intersects(n.bounds, viewport)),
    connections: scene.connections.filter((c) =>
      intersects(c.bounds, viewport),
    ),
  };
}
/** Topmost actual contour wins; locked/hidden layers cannot become editing targets. */
export function pickNode(
  scene: Scene,
  point: Point,
  tolerance = 6,
  editableOnly = true,
): SceneNode | undefined {
  return [...scene.nodes]
    .reverse()
    .find(
      (n) =>
        (!editableOnly || n.editable) &&
        (n.kind === 'freehand' && n.strokePoints
          ? freehandContains(
              n.strokePoints,
              n.geometry,
              point,
              tolerance + n.style.strokeWidth / 2,
            )
          : isDrawing(n.kind)
            ? segmentDistance(point, ...lineEndpoints(n.geometry)) <=
              tolerance + n.style.strokeWidth / 2
            : containsShape(n.kind, n.geometry, point, n.style.cornerRadius)),
    );
}

/** Reuse immutable scene entries and resolved styles; only moved nodes and incident routes change. */
export function transformScene(
  scene: Scene,
  page: Pick<Page, 'nodes' | 'connections'>,
  geometries: Record<string, Geometry>,
): Scene {
  const nodes = scene.nodes.map((n) =>
    geometries[n.id]
      ? {
          ...n,
          geometry: geometries[n.id],
          bounds: nodeBounds(
            geometries[n.id],
            n.kind,
            n.label,
            n.style,
            n.richText,
          ),
        }
      : n,
  );
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const originals = new Map(page.nodes.map((n) => [n.id, n]));
  const edges = new Map(page.connections.map((e) => [e.id, e]));
  const connections = scene.connections.map((e) => {
    const edge = edges.get(e.id)!;
    if (!geometries[edge.sourceId] && !geometries[edge.targetId]) return e;
    const source = byId.get(edge.sourceId)!,
      target = byId.get(edge.targetId)!;
    const path = connectionPath(
      { ...originals.get(source.id)!, geometry: source.geometry },
      { ...originals.get(target.id)!, geometry: target.geometry },
      readConnection(edge),
      edge.waypoints
        .filter((p) => Math.abs(p.x) <= 1e12 && Math.abs(p.y) <= 1e12)
        .slice(0, 2048),
      source.style.cornerRadius,
      target.style.cornerRadius,
    );
    return {
      ...e,
      ...path,
      bounds: unionBounds([
        path.bounds,
        ...(e.label
          ? [
              connectionLabelBounds(
                path.labelPoint,
                e.label,
                e.style,
                e.richText,
              ),
            ]
          : []),
        {
          x: path.points.at(-1)!.x - e.style.strokeWidth * 4,
          y: path.points.at(-1)!.y - e.style.strokeWidth * 4,
          width: e.style.strokeWidth * 8,
          height: e.style.strokeWidth * 8,
        },
      ])!,
    };
  });
  return { nodes, connections, bounds: scene.bounds };
}

function nodeBounds(
  g: Geometry,
  kind: string,
  label: string,
  style: Appearance,
  richText?: RichText,
): Bounds {
  const bounds = geometryBounds(
    g,
    isDrawing(kind)
      ? Math.max(16, style.strokeWidth * 4)
      : style.strokeWidth / 2,
  );
  if (!isDrawing(kind) || !label) return bounds;
  return unionBounds([
    bounds,
    connectionLabelBounds(
      { x: g.x + g.width / 2, y: g.y + g.height / 2 },
      label,
      style,
      richText,
    ),
  ])!;
}

/** Conservative local-font bounds, matching the renderer's wrapped label budget. */
function connectionLabelBounds(
  point: Point,
  label: string,
  style: Appearance,
  richText?: RichText,
): Bounds {
  if (richText)
    return {
      x:
        point.x -
        (style.align === 'left' ? 0 : style.align === 'right' ? 240 : 120),
      y: point.y - 24,
      width: 240,
      height: 512,
    };
  const characters = Math.min(
    label.length,
    Math.max(1, Math.floor(240 / (style.fontSize * 0.62))),
  );
  const width = characters * style.fontSize * 1.5;
  return {
    x:
      point.x -
      (style.align === 'left'
        ? 0
        : style.align === 'right'
          ? width
          : width / 2) -
      8,
    y: point.y - style.fontSize * 2,
    width: width + 16,
    height: style.fontSize * 12,
  };
}
