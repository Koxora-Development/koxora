import {
  containerHeaderHeight,
  containerTextBoxes,
  rotatePoint,
} from './shapes';
import {
  tableCellAnchor,
  tableCellSpan,
  type TableTextRegions,
  type TextRegionTarget,
} from './text-regions';
import type { SceneNode } from './scene';
import type { Bounds, Point } from './viewport';

export interface TableCellBox {
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
  box: Bounds;
}

type RegionNode = Pick<SceneNode, 'kind' | 'geometry' | 'textRegions'>;

/** Positive portable weights scale with the table's outer geometry. */
export function tableAxisOffsets(
  weights: readonly number[] | undefined,
  count: number,
  size: number,
): number[] {
  const values = weights ?? Array.from({ length: count }, () => 100);
  const total = values.reduce((sum, value) => sum + value, 0);
  const offsets = [0];
  for (const value of values)
    offsets.push(offsets.at(-1)! + (value / total) * size);
  offsets[offsets.length - 1] = size;
  return offsets;
}

/** Visible anchor cells own the full rectangle of each rectangular merge. */
export function tableCellBoxes(
  value: TableTextRegions,
  width: number,
  height: number,
): TableCellBox[] {
  const rows = value.cells.length,
    columns = value.cells[0].length;
  const xs = tableAxisOffsets(value.columnWidths, columns, width),
    ys = tableAxisOffsets(value.rowHeights, rows, height);
  const result: TableCellBox[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const anchor = tableCellAnchor(value, row, column);
      if (anchor.row !== row || anchor.column !== column) continue;
      const span = tableCellSpan(value, row, column);
      result.push({
        row,
        column,
        rowSpan: span.rowSpan,
        columnSpan: span.columnSpan,
        box: {
          x: xs[column],
          y: ys[row],
          width: xs[column + span.columnSpan] - xs[column],
          height: ys[row + span.rowSpan] - ys[row],
        },
      });
    }
  }
  return result;
}

/** Text glyphs remain readable: flips move region positions rather than their glyphs. */
export function mirroredTextBox(node: RegionNode, raw: Bounds): Bounds | null {
  const g = node.geometry;
  const box = { ...raw };
  if (g.flipX === true) box.x = g.width - box.x - box.width;
  if (g.flipY === true) box.y = g.height - box.y - box.height;
  const x = Math.max(0, box.x),
    y = Math.max(0, box.y);
  const width = Math.max(0, Math.min(g.width, box.x + box.width) - x);
  const height = Math.max(0, Math.min(g.height, box.y + box.height) - y);
  return width && height ? { x, y, width, height } : null;
}

/** Local mirrored content rectangle, shared by rendering and direct text editing. */
export function textRegionBox(
  node: RegionNode,
  target: TextRegionTarget,
): Bounds | null {
  const g = node.geometry;
  if (node.kind === 'container') {
    if (target.type === 'table-cell') return null;
    return mirroredTextBox(
      node,
      containerTextBoxes(g.width, g.height)[
        target.type === 'container-title' ? 'title' : 'body'
      ],
    );
  }
  if (
    node.kind !== 'table' ||
    node.textRegions?.type !== 'table' ||
    target.type !== 'table-cell'
  )
    return null;
  const value = node.textRegions;
  if (
    !Number.isInteger(target.row) ||
    !Number.isInteger(target.column) ||
    target.row < 0 ||
    target.row >= value.cells.length ||
    target.column < 0 ||
    target.column >= value.cells[0].length
  )
    return null;
  const anchor = tableCellAnchor(value, target.row, target.column);
  const cell = tableCellBoxes(value, g.width, g.height).find(
    (cell) => cell.row === anchor.row && cell.column === anchor.column,
  );
  if (!cell) return null;
  const paddingX = Math.min(6, cell.box.width * 0.1),
    paddingY = Math.min(4, cell.box.height * 0.1);
  return mirroredTextBox(node, {
    x: cell.box.x + paddingX,
    y: cell.box.y + paddingY,
    width: Math.max(0, cell.box.width - paddingX * 2),
    height: Math.max(0, cell.box.height - paddingY * 2),
  });
}

/** Whole-cell hit testing includes empty text and canonicalizes covered merged cells. */
export function textRegionAt(
  node: RegionNode,
  worldPoint: Point,
): TextRegionTarget | null {
  const g = node.geometry;
  if (g.width <= 0 || g.height <= 0) return null;
  const point = rotatePoint(
    worldPoint,
    { x: g.x + g.width / 2, y: g.y + g.height / 2 },
    -g.rotation,
  );
  let x = point.x - g.x,
    y = point.y - g.y;
  // Rotation round trips can place an exact boundary a few floating-point units outside.
  const tolerance = 1e-7;
  if (
    x < -tolerance ||
    x > g.width + tolerance ||
    y < -tolerance ||
    y > g.height + tolerance
  )
    return null;
  x = Math.max(0, Math.min(g.width, x));
  y = Math.max(0, Math.min(g.height, y));
  if (g.flipX === true) x = g.width - x;
  if (g.flipY === true) y = g.height - y;
  if (node.kind === 'container')
    return {
      type:
        y <= containerHeaderHeight(g.height)
          ? 'container-title'
          : 'container-body',
    };
  if (node.kind !== 'table' || node.textRegions?.type !== 'table') return null;
  const value = node.textRegions;
  const xs = tableAxisOffsets(
      value.columnWidths,
      value.cells[0].length,
      g.width,
    ),
    ys = tableAxisOffsets(value.rowHeights, value.cells.length, g.height);
  const locate = (offsets: number[], point: number) =>
    Math.min(
      offsets.length - 2,
      Math.max(0, offsets.findIndex((boundary) => boundary > point) - 1),
    );
  const row = y >= g.height ? value.cells.length - 1 : locate(ys, y),
    column = x >= g.width ? value.cells[0].length - 1 : locate(xs, x);
  return { type: 'table-cell', ...tableCellAnchor(value, row, column) };
}
