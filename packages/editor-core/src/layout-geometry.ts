import type { Page } from '@koxora/project';
import { readConnectionEndpoints } from './connections';
import { isDrawing } from './interaction';
import { unionBounds, type Scene, type SceneNode } from './scene';
import { geometryBounds, type Geometry } from './shapes';
import { intersects, MAX_COORDINATE, type Bounds } from './viewport';

export type LayoutDirection = 'top-down' | 'left-right';
export type DiagramLayoutResult =
  | { ok: true; geometries: Record<string, Geometry> }
  | { ok: false; reason: 'selection' | 'structure' | 'occupied' | 'bounds' };

export interface LayoutPlacement {
  node: SceneNode;
  crossCenter: number;
  rankStart: number;
  anchored?: boolean;
}

export function layoutAxes(direction: LayoutDirection) {
  return direction === 'left-right'
    ? ({
        crossAxis: 'y',
        rankAxis: 'x',
        crossSize: 'height',
        rankSize: 'width',
      } as const)
    : ({
        crossAxis: 'x',
        rankAxis: 'y',
        crossSize: 'width',
        rankSize: 'height',
      } as const);
}

export function readLayoutSelection(
  scene: Scene,
  page: Pick<Page, 'connections'>,
  selectedIds: readonly string[],
): {
  nodes: Map<string, SceneNode>;
  edges: { sourceId: string; targetId: string }[];
  obstacles: Bounds[];
} | null {
  const selected = new Set(selectedIds);
  for (const edge of page.connections) selected.delete(edge.id);
  const nodes = new Map<string, SceneNode>();
  const obstacles: Bounds[] = [];
  for (const node of scene.nodes) {
    if (!selected.has(node.id)) {
      obstacles.push(node.bounds);
      continue;
    }
    if (!node.editable || isDrawing(node.kind) || node.kind === 'freehand')
      return null;
    nodes.set(node.id, node);
  }
  if (nodes.size < 2 || nodes.size !== selected.size) return null;

  const editableEdges = new Set(
    scene.connections.filter((edge) => edge.editable).map((edge) => edge.id),
  );
  const edges: { sourceId: string; targetId: string }[] = [];
  for (const edge of page.connections) {
    if (!editableEdges.has(edge.id)) continue;
    const ends = readConnectionEndpoints(edge);
    if (!ends || !('nodeId' in ends.source) || !('nodeId' in ends.target))
      continue;
    const { nodeId: sourceId } = ends.source;
    const { nodeId: targetId } = ends.target;
    if (nodes.has(sourceId) && nodes.has(targetId))
      edges.push({ sourceId, targetId });
  }
  return { nodes, edges, obstacles };
}

function firstMatching<T>(items: readonly T[], matches: (item: T) => boolean) {
  let start = 0;
  let end = items.length;
  while (start < end) {
    const middle = Math.floor((start + end) / 2);
    if (matches(items[middle])) end = middle;
    else start = middle + 1;
  }
  return start;
}

/** The layout places disjoint, sorted ranks with disjoint boxes inside each rank. */
function blocked(
  rows: Bounds[][],
  obstacles: readonly Bounds[],
  { crossAxis, rankAxis, crossSize, rankSize }: ReturnType<typeof layoutAxes>,
) {
  const rowBounds = rows.map((row) => unionBounds(row)!);
  const layout = unionBounds(rowBounds);
  if (!layout) return false;
  return obstacles.some((bounds) => {
    if (!intersects(layout, bounds)) return false;
    const firstRow = firstMatching(
      rowBounds,
      (row) => row[rankAxis] + row[rankSize] >= bounds[rankAxis],
    );
    for (let rank = firstRow; rank < rows.length; rank++) {
      const row = rowBounds[rank];
      if (row[rankAxis] > bounds[rankAxis] + bounds[rankSize]) break;
      if (!intersects(row, bounds)) continue;
      const boxes = rows[rank];
      const firstBox = firstMatching(
        boxes,
        (box) => box[crossAxis] + box[crossSize] >= bounds[crossAxis],
      );
      for (let i = firstBox; i < boxes.length; i++) {
        const box = boxes[i];
        if (box[crossAxis] > bounds[crossAxis] + bounds[crossSize]) break;
        if (intersects(box, bounds)) return true;
      }
    }
    return false;
  });
}

/** Convert layout coordinates back to untranslated shape geometry and check the whole proposal. */
export function finishLayout(
  placements: readonly (readonly LayoutPlacement[])[],
  obstacles: readonly Bounds[],
  direction: LayoutDirection,
): DiagramLayoutResult {
  const axes = layoutAxes(direction);
  const { crossAxis, crossSize, rankAxis } = axes;
  const rows: Bounds[][] = [];
  const changes: [string, Geometry][] = [];
  for (const rank of placements) {
    if (!rank.length) continue;
    const boxes: Bounds[] = [];
    for (const { node, crossCenter, rankStart, anchored } of rank) {
      if (anchored) {
        boxes.push(node.bounds);
        continue;
      }
      const padding = node.style.strokeWidth / 2;
      const local = geometryBounds({ ...node.geometry, x: 0, y: 0 }, padding);
      const geometry = {
        ...node.geometry,
        [crossAxis]: crossCenter - (local[crossAxis] + local[crossSize] / 2),
        [rankAxis]: rankStart - local[rankAxis],
      };
      if (
        ![geometry.x, geometry.y].every(
          (value) =>
            Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE,
        )
      )
        return { ok: false, reason: 'bounds' };
      boxes.push(geometryBounds(geometry, padding));
      if (geometry.x !== node.geometry.x || geometry.y !== node.geometry.y)
        changes.push([node.id, geometry]);
    }
    rows.push(boxes);
  }
  if (blocked(rows, obstacles, axes)) return { ok: false, reason: 'occupied' };
  return { ok: true, geometries: Object.fromEntries(changes) };
}
