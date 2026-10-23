import type { Page, Style } from '@koxora/project';
import { intersects, type Bounds, type Point } from './viewport';
import {
  containsShape,
  geometryBounds,
  isShapeKind,
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
  style: Appearance;
  editable: boolean;
  layerOrder: number;
}
export interface SceneConnection extends ConnectionPath {
  id: string;
  label: string;
  style: Appearance;
  arrow: boolean;
  editable: boolean;
  layerOrder: number;
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
/** Only safe, bounded geometry and declarative appearance cross into the renderer. Originals are retained. */
export function buildScene(
  page: Pick<Page, 'nodes' | 'connections' | 'layers'>,
  styles: Style[] = [],
): Scene {
  const layers = layerStates(page.layers);
  const appearance = appearanceResolver(styles);
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
          kind: node.kind,
          geometry: g,
          bounds: geometryBounds(g, style.strokeWidth / 2),
          label:
            typeof node.content.text === 'string'
              ? node.content.text.slice(0, MAX_TEXT)
              : node.kind.slice(0, 120),
          style,
          editable: layer.editable,
          layerOrder: layer.order,
        },
      ];
    })
    .sort((a, b) => a.layerOrder - b.layerOrder);
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
      const labelBounds = {
        x: path.labelPoint.x - (options.label.length * style.fontSize) / 2,
        y: path.labelPoint.y - style.fontSize * 2,
        width: options.label.length * style.fontSize,
        height: style.fontSize * 12,
      };
      return [
        {
          ...path,
          id: edge.id,
          label: options.label,
          arrow: options.arrow,
          style,
          editable: layer.editable,
          layerOrder: layer.order,
          bounds: unionBounds([
            path.bounds,
            labelBounds,
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
    .sort((a, b) => a.layerOrder - b.layerOrder);
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
export function pickNode(scene: Scene, point: Point): SceneNode | undefined {
  return [...scene.nodes]
    .reverse()
    .find(
      (n) =>
        n.editable &&
        isShapeKind(n.kind) &&
        containsShape(n.kind, n.geometry, point, n.style.cornerRadius),
    );
}
