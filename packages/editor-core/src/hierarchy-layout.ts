import type { Page } from '@koxora/project';
import { readConnectionEndpoints } from './connections';
import { isDrawing } from './interaction';
import { unionBounds, type Scene, type SceneNode } from './scene';
import { geometryBounds, shapeCenter, type Geometry } from './shapes';
import { intersects, MAX_COORDINATE, type Bounds } from './viewport';

export type HierarchyLayoutResult =
  | { ok: true; geometries: Record<string, Geometry> }
  | { ok: false; reason: 'selection' | 'structure' | 'occupied' | 'bounds' };

const horizontalGap = 48;
const verticalGap = 64;

interface Branch {
  node: SceneNode;
  children: Branch[];
  depth: number;
  span: number;
  childSpan: number;
  centerX: number;
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

function blocked(rows: Bounds[][], obstacles: SceneNode[]) {
  const rowBounds = rows.map((row) => unionBounds(row)!);
  const layout = unionBounds(rowBounds)!;
  return obstacles.some(({ bounds }) => {
    if (!intersects(layout, bounds)) return false;
    const firstRow = firstMatching(
      rowBounds,
      (row) => row.y + row.height >= bounds.y,
    );
    for (let depth = firstRow; depth < rows.length; depth++) {
      const row = rowBounds[depth];
      if (row.y > bounds.y + bounds.height) break;
      if (!intersects(row, bounds)) continue;
      const boxes = rows[depth];
      const firstBox = firstMatching(
        boxes,
        (box) => box.x + box.width >= bounds.x,
      );
      for (let i = firstBox; i < boxes.length; i++) {
        const box = boxes[i];
        if (box.x > bounds.x + bounds.width) break;
        if (intersects(box, bounds)) return true;
      }
    }
    return false;
  });
}

/** Propose a geometry-only layout for one selected, directed tree. */
export function hierarchyGeometries(
  scene: Scene,
  page: Pick<Page, 'connections'>,
  selectedIds: readonly string[],
): HierarchyLayoutResult {
  const selected = new Set(selectedIds);
  for (const edge of page.connections) selected.delete(edge.id);
  const branches = new Map<string, Branch>();
  const obstacles: SceneNode[] = [];
  for (const node of scene.nodes) {
    if (!selected.has(node.id)) {
      obstacles.push(node);
      continue;
    }
    if (!node.editable || isDrawing(node.kind) || node.kind === 'freehand')
      return { ok: false, reason: 'selection' };
    branches.set(node.id, {
      node,
      children: [],
      depth: 0,
      span: node.bounds.width,
      childSpan: 0,
      centerX: shapeCenter(node.geometry).x,
    });
  }
  if (branches.size < 2 || branches.size !== selected.size)
    return { ok: false, reason: 'selection' };

  const editableEdges = new Set(
    scene.connections.filter((edge) => edge.editable).map((edge) => edge.id),
  );
  const hasParent = new Set<string>();
  for (const edge of page.connections) {
    if (!editableEdges.has(edge.id)) continue;
    const ends = readConnectionEndpoints(edge);
    if (!ends || !('nodeId' in ends.source) || !('nodeId' in ends.target))
      continue;
    const from = branches.get(ends.source.nodeId);
    const to = branches.get(ends.target.nodeId);
    if (!from || !to) continue;
    if (from === to || hasParent.has(to.node.id))
      return { ok: false, reason: 'structure' };
    from.children.push(to);
    hasParent.add(to.node.id);
  }
  const roots = [...branches.values()].filter(
    ({ node }) => !hasParent.has(node.id),
  );
  if (roots.length !== 1) return { ok: false, reason: 'structure' };

  const [root] = roots;
  const ordered = [root];
  const heights: number[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const { children, depth, node } = ordered[i];
    heights[depth] = Math.max(heights[depth] ?? 0, node.bounds.height);
    children.sort(
      (a, b) => a.centerX - b.centerX || (a.node.id < b.node.id ? -1 : 1),
    );
    for (const child of children) {
      child.depth = depth + 1;
      ordered.push(child);
    }
  }
  if (ordered.length !== branches.size)
    return { ok: false, reason: 'structure' };

  // Reserve one horizontal interval for each whole subtree, even for mixed sizes.
  for (let i = ordered.length - 1; i >= 0; i--) {
    const branch = ordered[i];
    if (!branch.children.length) continue;
    branch.childSpan =
      branch.children.reduce((sum, child) => sum + child.span, 0) +
      (branch.children.length - 1) * horizontalGap;
    branch.span = Math.max(branch.span, branch.childSpan);
  }

  const top = [root.node.bounds.y];
  const rows: Bounds[][] = [[root.node.bounds]];
  for (let depth = 1; depth < heights.length; depth++) {
    top.push(top[depth - 1] + heights[depth - 1] + verticalGap);
    rows.push([]);
  }
  const changes: [string, Geometry][] = [];
  for (const branch of ordered) {
    let left = branch.centerX - branch.childSpan / 2;
    for (const child of branch.children) {
      child.centerX = left + child.span / 2;
      left += child.span + horizontalGap;
    }
    if (branch === root) continue;
    const { node, depth, centerX } = branch;
    const x = centerX - node.geometry.width / 2;
    const y = top[depth] + (node.bounds.height - node.geometry.height) / 2;
    if (
      ![x, y].every(
        (value) => Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE,
      )
    )
      return { ok: false, reason: 'bounds' };
    const geometry = { ...node.geometry, x, y };
    rows[depth].push(geometryBounds(geometry, node.style.strokeWidth / 2));
    if (x !== node.geometry.x || y !== node.geometry.y)
      changes.push([node.id, geometry]);
  }
  if (blocked(rows, obstacles)) return { ok: false, reason: 'occupied' };
  return { ok: true, geometries: Object.fromEntries(changes) };
}
