import type { Page } from '@koxora/project';
import { intersects, type Bounds, type Point } from './viewport';
/** Read-only geometry adapter. Domain documents never contain renderer objects. */
export interface SceneNode {
  id: string;
  bounds: Bounds;
  geometry: Bounds & { rotation: number };
  label: string;
}
export interface SceneConnection {
  id: string;
  points: Point[];
  bounds: Bounds;
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
export function buildScene(page: Page): Scene {
  const layers = new Map(page.layers.map((layer) => [layer.id, layer]));
  const visibility = new Map<string, boolean>();
  const visible = (id: string): boolean => {
    if (visibility.has(id)) return visibility.get(id)!;
    const seen = new Set<string>();
    const path: string[] = [];
    let current: string | undefined = id;
    let result = true;
    while (current) {
      if (visibility.has(current)) {
        result = visibility.get(current)!;
        break;
      }
      if (seen.has(current)) {
        result = false;
        break;
      }
      seen.add(current);
      path.push(current);
      const layer = layers.get(current);
      if (!layer || !layer.visible) {
        result = false;
        break;
      }
      current = layer.parentId;
    }
    for (const key of path) visibility.set(key, result);
    return result;
  };
  const nodes = page.nodes
    .filter((node) => visible(node.layerId))
    .map((node): SceneNode => {
      const g = node.geometry,
        radians = (g.rotation * Math.PI) / 180;
      const width =
        Math.abs(g.width * Math.cos(radians)) +
        Math.abs(g.height * Math.sin(radians));
      const height =
        Math.abs(g.width * Math.sin(radians)) +
        Math.abs(g.height * Math.cos(radians));
      return {
        id: node.id,
        geometry: g,
        bounds: {
          x: g.x + (g.width - width) / 2,
          y: g.y + (g.height - height) / 2,
          width,
          height,
        },
        label:
          typeof node.content.text === 'string'
            ? node.content.text.slice(0, 120)
            : node.kind.slice(0, 120),
      };
    });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const center = (node: SceneNode) => ({
    x: node.geometry.x + node.geometry.width / 2,
    y: node.geometry.y + node.geometry.height / 2,
  });
  const connections = page.connections.flatMap((edge): SceneConnection[] => {
    const source = byId.get(edge.sourceId),
      target = byId.get(edge.targetId);
    if (!source || !target || !visible(edge.layerId)) return [];
    const points = [center(source), ...edge.waypoints, center(target)];
    return [
      {
        id: edge.id,
        points,
        bounds: unionBounds(
          points.map((p) => ({ ...p, width: 0, height: 0 })),
        )!,
      },
    ];
  });
  return {
    nodes,
    connections,
    bounds: unionBounds([
      ...nodes.map((n) => n.bounds),
      ...connections.map((c) => c.bounds),
    ]),
  };
}
/** Replaceable linear culling; no state or platform APIs. */
export function visibleScene(scene: Scene, viewport: Bounds): Scene {
  return {
    ...scene,
    nodes: scene.nodes.filter((node) => intersects(node.bounds, viewport)),
    connections: scene.connections.filter((edge) =>
      intersects(edge.bounds, viewport),
    ),
  };
}
