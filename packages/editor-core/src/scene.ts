import { readRichText, type RichText } from './rich-text';
import { readFreehand, freehandContains } from './freehand';
import { orderedElements } from './stacking';
import { assertEditableElement } from './editing';
import {
  readTextRegions,
  tableTextSummary,
  type TextRegions,
} from './text-regions';
import {
  isDrawing,
  lineEndpoints,
  LINE_KEY,
  segmentDistance,
} from './interaction';
import { jsonObject } from './shapes';
import { isSwimlane } from './swimlanes';
import type { Node, Page, Style } from '@koxora/project';
import { intersects, type Bounds, type Point } from './viewport';
import {
  containsShape,
  geometryBounds,
  layerStates,
  MAX_TEXT,
  appearanceResolver,
  reflectPoint,
  rotatePoint,
  shapeCenter,
  swimlaneHeaderBox,
  CONNECTION_KEY,
  type Appearance,
  type Geometry,
} from './shapes';
import {
  connectionPath,
  readConnection,
  readConnectionEndpoints,
  type ConnectionPath,
  type EndpointMarker,
  type LineStyle,
} from './connections';
export interface SceneNode {
  id: string;
  kind: string;
  bounds: Bounds;
  geometry: Geometry;
  label: string;
  richText?: RichText;
  textRegions?: TextRegions;
  style: Appearance;
  editable: boolean;
  layerOrder: number;
  paintOrder: number;
  strokePoints?: Point[];
  startArrow?: boolean;
  endArrow?: boolean;
}
export interface SceneConnection extends ConnectionPath {
  lineStyle?: LineStyle;
  sourceMarker?: EndpointMarker;
  targetMarker?: EndpointMarker;
  id: string;
  label: string;
  richText?: RichText;
  style: Appearance;
  arrow: boolean;
  startArrow?: boolean;
  editable: boolean;
  layerOrder: number;
  paintOrder: number;
}
export interface Scene {
  nodes: SceneNode[];
  connections: SceneConnection[];
  bounds: Bounds | null;
}
/** Accessible names use authoritative regions while the body label stays separate. */
export function sceneDisplayText(node: SceneNode | SceneConnection): string {
  if ('textRegions' in node) {
    if (node.textRegions?.type === 'table')
      return tableTextSummary(node.textRegions);
    if (node.textRegions?.type === 'container')
      return [node.textRegions.title, node.label]
        .filter((value) => value.trim().length > 0)
        .join('\n')
        .slice(0, MAX_TEXT);
  }
  return node.label;
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
          textRegions: readTextRegions(node) ?? undefined,
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
      const endpoints = readConnectionEndpoints(edge),
        layer = layers.get(edge.layerId);
      if (!endpoints || !layer?.visible) return [];
      const s =
          'nodeId' in endpoints.source
            ? visible.get(endpoints.source.nodeId)
            : undefined,
        t =
          'nodeId' in endpoints.target
            ? visible.get(endpoints.target.nodeId)
            : undefined;
      if (
        ('nodeId' in endpoints.source && !s) ||
        ('nodeId' in endpoints.target && !t)
      )
        return [];
      const style = appearance(edge, CONNECTION_KEY),
        options = readConnection(edge);
      const path = connectionPath(
        s ? byId.get(s.id)! : (endpoints.source as { point: Point }).point,
        t ? byId.get(t.id)! : (endpoints.target as { point: Point }).point,
        options,
        edge.waypoints
          .filter((p) => Math.abs(p.x) <= 1e12 && Math.abs(p.y) <= 1e12)
          .slice(0, 2048),
        s?.style.cornerRadius ?? 0,
        t?.style.cornerRadius ?? 0,
      );
      return [
        {
          ...path,
          id: edge.id,
          richText: readRichText(edge),
          label: options.label,
          arrow: options.arrow,
          startArrow: options.startArrow === true,
          ...(options.lineStyle !== undefined
            ? { lineStyle: options.lineStyle }
            : {}),
          ...(options.sourceMarker !== undefined
            ? { sourceMarker: options.sourceMarker }
            : {}),
          ...(options.targetMarker !== undefined
            ? { targetMarker: options.targetMarker }
            : {}),
          style,
          editable:
            layer.editable &&
            (s?.editable ?? true) &&
            (t?.editable ?? true) &&
            supported(edge),
          layerOrder: layer.order,
          paintOrder: order.get(edge.id)!,
          bounds: edgeBounds(path, options.label, style, readRichText(edge)),
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
/** Leave the interior free for marquee selection and select a lane at its heading or border. */
function containsSwimlaneHandle(
  node: SceneNode,
  point: Point,
  tolerance: number,
) {
  if (!isSwimlane(node.kind)) return false;
  const g = node.geometry;
  const local = reflectPoint(
    rotatePoint(point, shapeCenter(g), -g.rotation),
    g,
  );
  const x = local.x - g.x;
  const y = local.y - g.y;
  const border = Math.min(x, y, g.width - x, g.height - y);
  if (border < -tolerance) return false;
  const header = swimlaneHeaderBox(node.kind, g.width, g.height);
  return border <= tolerance || (x <= header.width && y <= header.height);
}
/** Topmost actual contour wins; locked/hidden layers cannot become editing targets. */
export function pickNode(
  scene: Scene,
  point: Point,
  tolerance = 6,
  editableOnly = true,
  filter?: (node: SceneNode) => boolean,
): SceneNode | undefined {
  return [...scene.nodes]
    .reverse()
    .find(
      (n) =>
        (!editableOnly || n.editable) &&
        (!filter || filter(n)) &&
        (isSwimlane(n.kind)
          ? containsSwimlaneHandle(n, point, tolerance)
          : n.kind === 'freehand' && n.strokePoints
            ? freehandContains(
                n.strokePoints,
                n.geometry,
                point,
                tolerance + n.style.strokeWidth / 2,
              ) ||
              (!!n.label &&
                containsShape(
                  'rectangle',
                  freehandTextGeometry(n.geometry),
                  point,
                  0,
                ))
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
    if (
      !(edge.sourceId && geometries[edge.sourceId]) &&
      !(edge.targetId && geometries[edge.targetId])
    )
      return e;
    const endpoints = readConnectionEndpoints(edge);
    if (!endpoints) return e;
    const source =
        'nodeId' in endpoints.source
          ? byId.get(endpoints.source.nodeId)
          : undefined,
      target =
        'nodeId' in endpoints.target
          ? byId.get(endpoints.target.nodeId)
          : undefined;
    const sourceNode: Node | Point = source
      ? { ...originals.get(source.id)!, geometry: source.geometry }
      : (endpoints.source as { point: Point }).point;
    const targetNode: Node | Point = target
      ? { ...originals.get(target.id)!, geometry: target.geometry }
      : (endpoints.target as { point: Point }).point;
    const path = connectionPath(
      sourceNode,
      targetNode,
      readConnection(edge),
      edge.waypoints
        .filter((p) => Math.abs(p.x) <= 1e12 && Math.abs(p.y) <= 1e12)
        .slice(0, 2048),
      source?.style.cornerRadius ?? 0,
      target?.style.cornerRadius ?? 0,
    );
    return {
      ...e,
      ...path,
      bounds: edgeBounds(path, e.label, e.style, e.richText),
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
  if (kind === 'freehand' && label)
    return unionBounds([bounds, geometryBounds(freehandTextGeometry(g))])!;
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

/** A centered, bounded text field remains legible even on a dot or a narrow stroke. */
export function freehandTextBox(g: Geometry): Bounds {
  const width = Math.max(120, Math.min(240, g.width - 20));
  const height = Math.max(48, Math.min(512, g.height - 12));
  return {
    x: (g.width - width) / 2,
    y: (g.height - height) / 2,
    width,
    height,
  };
}
function freehandTextGeometry(g: Geometry): Geometry {
  const box = freehandTextBox(g);
  return {
    ...g,
    x: g.x + box.x,
    y: g.y + box.y,
    width: box.width,
    height: box.height,
  };
}

function edgeBounds(
  path: ConnectionPath,
  label: string,
  style: Appearance,
  rich?: RichText,
): Bounds {
  const padding = Math.max(16, style.strokeWidth * 4);
  return unionBounds([
    path.bounds,
    ...(label
      ? [connectionLabelBounds(path.labelPoint, label, style, rich)]
      : []),
    ...[path.points[0], path.points.at(-1)!].map((point) => ({
      x: point.x - padding,
      y: point.y - padding,
      width: padding * 2,
      height: padding * 2,
    })),
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
