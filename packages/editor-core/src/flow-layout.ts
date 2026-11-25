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

const crossGap = 48;
const rankGap = 80;

interface Step {
  node: SceneNode;
  incoming: Step[];
  outgoing: Step[];
  finishedAt: number;
  rank: number;
  crossCenter: number;
}

function connected(steps: readonly Step[]): boolean {
  const reached = new Set([steps[0]]);
  for (const step of reached) {
    for (const neighbour of step.incoming) reached.add(neighbour);
    for (const neighbour of step.outgoing) reached.add(neighbour);
  }
  return reached.size === steps.length;
}

/** Reverse DFS finish order is topological once edges to ancestors are omitted. */
function rankSteps(entries: readonly Step[]): void {
  const seen = new Set<Step>();
  const finished: Step[] = [];
  for (const entry of entries) {
    if (seen.has(entry)) continue;
    seen.add(entry);
    const stack = [{ step: entry, child: 0 }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const next = frame.step.outgoing[frame.child++];
      if (!next) {
        frame.step.finishedAt = finished.length;
        finished.push(frame.step);
        stack.pop();
      } else if (!seen.has(next)) {
        seen.add(next);
        stack.push({ step: next, child: 0 });
      }
    }
  }
  for (let i = finished.length - 1; i >= 0; i--) {
    const source = finished[i];
    for (const target of source.outgoing) {
      if (target.finishedAt < source.finishedAt)
        target.rank = Math.max(target.rank, source.rank + 1);
    }
  }
}

export function flowGeometries(
  scene: Scene,
  page: Pick<Page, 'connections'>,
  ids: readonly string[],
  direction: LayoutDirection = 'top-down',
): DiagramLayoutResult {
  const selection = readLayoutSelection(scene, page, ids);
  if (!selection.ok) return selection;
  const { crossAxis, rankAxis, crossSize, rankSize } = layoutAxes(direction);
  const byId = new Map<string, Step>(
    [...selection.nodes].map(([id, node]) => [
      id,
      {
        node,
        incoming: [],
        outgoing: [],
        finishedAt: -1,
        rank: 0,
        crossCenter: shapeCenter(node.bounds)[crossAxis],
      },
    ]),
  );
  for (const { sourceId, targetId } of selection.edges) {
    const source = byId.get(sourceId)!;
    const target = byId.get(targetId)!;
    source.outgoing.push(target);
    target.incoming.push(source);
  }
  const steps = [...byId.values()];
  if (!connected(steps)) return { ok: false, reason: 'structure' };

  const compareOrder = (a: Step, b: Step) =>
    a.node.paintOrder - b.node.paintOrder ||
    (a.node.id < b.node.id ? -1 : a.node.id > b.node.id ? 1 : 0);
  const compareCross = (a: Step, b: Step) =>
    a.crossCenter - b.crossCenter || compareOrder(a, b);
  // Stacking order survives layout and keeps the same return edges on reapply.
  steps.sort(compareOrder);
  for (const step of steps) step.outgoing.sort(compareOrder);
  const starts = steps.filter((step) => !step.incoming.length);
  rankSteps([...starts, ...steps]);

  const ranks: Step[][] = [];
  for (const step of steps) (ranks[step.rank] ??= []).push(step);
  const [anchor] = [...(starts.length ? starts : ranks[0])].sort(compareCross);
  const rankSizes = ranks.map((rank) =>
    rank.reduce(
      (largest, { node }) => Math.max(largest, node.bounds[rankSize]),
      0,
    ),
  );
  const rankStarts = [anchor.node.bounds[rankAxis]];
  for (let i = 1; i < ranks.length; i++)
    rankStarts[i] = rankStarts[i - 1] + rankSizes[i - 1] + rankGap;

  const rows = ranks.map((rank, index): LayoutPlacement[] => {
    rank.sort(compareCross);
    const anchorIndex = rank.indexOf(anchor);
    const preceding = anchorIndex < 0 ? rank : rank.slice(0, anchorIndex);
    const extent = preceding.reduce(
      (length, { node }) => length + node.bounds[crossSize] + crossGap,
      0,
    );
    let offset =
      anchor.crossCenter -
      (anchorIndex < 0
        ? (extent - crossGap) / 2
        : extent + anchor.node.bounds[crossSize] / 2);
    return rank.map((step) => {
      const width = step.node.bounds[crossSize];
      const placement = {
        node: step.node,
        crossCenter: offset + width / 2,
        rankStart: rankStarts[index],
        anchored: step === anchor,
      };
      offset += width + crossGap;
      return placement;
    });
  });
  return finishLayout(rows, selection.obstacles, direction);
}
