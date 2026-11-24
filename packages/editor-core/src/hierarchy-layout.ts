import type { Page } from '@koxora/project';
import {
  finishLayout,
  layoutAxes,
  readLayoutSelection,
  type DiagramLayoutResult,
  type LayoutDirection,
  type LayoutPlacement,
} from './layout-geometry';
import type { Scene, SceneNode } from './scene';
import { shapeCenter } from './shapes';

const siblingGap = 48;
const rankGap = 64;

interface Branch {
  node: SceneNode;
  children: Branch[];
  depth: number;
  span: number;
  childSpan: number;
  crossCenter: number;
}

/** Propose a geometry-only layout for one selected, directed tree. */
export function hierarchyGeometries(
  scene: Scene,
  page: Pick<Page, 'connections'>,
  selectedIds: readonly string[],
  direction: LayoutDirection = 'top-down',
): DiagramLayoutResult {
  const selection = readLayoutSelection(scene, page, selectedIds);
  if (!selection) return { ok: false, reason: 'selection' };
  const { crossAxis, crossSize, rankAxis, rankSize } = layoutAxes(direction);
  const branches = new Map<string, Branch>();
  for (const node of selection.nodes.values()) {
    branches.set(node.id, {
      node,
      children: [],
      depth: 0,
      span: node.bounds[crossSize],
      childSpan: 0,
      crossCenter: shapeCenter(node.geometry)[crossAxis],
    });
  }

  const hasParent = new Set<string>();
  for (const { sourceId, targetId } of selection.edges) {
    if (sourceId === targetId || hasParent.has(targetId))
      return { ok: false, reason: 'structure' };
    branches.get(sourceId)!.children.push(branches.get(targetId)!);
    hasParent.add(targetId);
  }
  const roots = [...branches.values()].filter(
    ({ node }) => !hasParent.has(node.id),
  );
  if (roots.length !== 1) return { ok: false, reason: 'structure' };

  const [root] = roots;
  const ordered = [root];
  const rankSizes: number[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const { children, depth, node } = ordered[i];
    rankSizes[depth] = Math.max(rankSizes[depth] ?? 0, node.bounds[rankSize]);
    children.sort(
      (a, b) =>
        a.crossCenter - b.crossCenter || (a.node.id < b.node.id ? -1 : 1),
    );
    for (const child of children) {
      child.depth = depth + 1;
      ordered.push(child);
    }
  }
  if (ordered.length !== branches.size)
    return { ok: false, reason: 'structure' };

  // Reserve space for each whole subtree, including divisions with mixed sizes.
  for (let i = ordered.length - 1; i >= 0; i--) {
    const branch = ordered[i];
    if (!branch.children.length) continue;
    branch.childSpan =
      branch.children.reduce((sum, child) => sum + child.span, 0) +
      (branch.children.length - 1) * siblingGap;
    branch.span = Math.max(branch.span, branch.childSpan);
  }

  const rankStarts = [root.node.bounds[rankAxis]];
  for (let depth = 1; depth < rankSizes.length; depth++)
    rankStarts.push(rankStarts[depth - 1] + rankSizes[depth - 1] + rankGap);
  const rows = rankSizes.map((): LayoutPlacement[] => []);
  for (const branch of ordered) {
    const { node, depth, crossCenter, childSpan, children } = branch;
    rows[depth].push({
      node,
      crossCenter,
      rankStart: rankStarts[depth],
      anchored: branch === root,
    });
    let cursor = crossCenter - childSpan / 2;
    for (const child of children) {
      child.crossCenter = cursor + child.span / 2;
      cursor += child.span + siblingGap;
    }
  }
  return finishLayout(rows, selection.obstacles, direction);
}
