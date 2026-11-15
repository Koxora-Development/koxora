import {
  isTextRegions,
  TEXT_REGIONS_KEY,
  MAX_TABLE_ROWS,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_CELL_TEXT,
  MAX_TABLE_TEXT,
  type Node,
  type TextRegions,
  type TableTextRegions,
  type TableMerge,
} from '@koxora/project';
import {
  fromPlainText,
  isRichText,
  plainText,
  readRichText,
  type RichText,
} from './rich-text';

export {
  isTextRegions,
  hasAdvancedTextRegions,
  ADVANCED_TEXT_REGIONS_FEATURE,
  TEXT_REGIONS_KEY,
  TEXT_REGIONS_FEATURE,
  MAX_REGION_TITLE,
  MAX_TABLE_ROWS,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_CELL_TEXT,
  MAX_TABLE_TEXT,
  type TextRegions,
  type ContainerTextRegions,
  type TableTextRegions,
  type TableMerge,
} from '@koxora/project';

export type TextRegionTarget =
  | { type: 'container-title' }
  | { type: 'container-body' }
  | { type: 'table-cell'; row: number; column: number };

/** Return an independent supported view; unknown optional data stays intact. */
export function readTextRegions(
  node: Pick<Node, 'kind' | 'extensions'>,
): TextRegions | null {
  const value = node.extensions[TEXT_REGIONS_KEY];
  return isTextRegions(value, node.kind) ? structuredClone(value) : null;
}

/** Existing container body text/rich text is separate and never migrated into the title. */
export function defaultTextRegions(
  node: Pick<Node, 'kind' | 'extensions'>,
): TextRegions | null {
  if (node.extensions[TEXT_REGIONS_KEY] !== undefined)
    return readTextRegions(node);
  if (node.kind === 'container')
    return { version: 1, type: 'container', title: '' };
  if (node.kind === 'table')
    return {
      version: 1,
      type: 'table',
      headerRow: true,
      cells: Array.from({ length: 3 }, () => ['', '', '']),
    };
  return null;
}

/** A bounded plain-text fallback aids object pickers; cells remain authoritative. */
export function tableTextSummary(value: TableTextRegions): string {
  return value.cells
    .map((row) => row.join('\t'))
    .join('\n')
    .trim()
    .slice(0, 4096);
}

function assertTable(value: TableTextRegions) {
  if (!isTextRegions(value, 'table')) throw new RangeError('Invalid table');
}
function assertCell(value: TableTextRegions, row: number, column: number) {
  if (
    !Number.isSafeInteger(row) ||
    !Number.isSafeInteger(column) ||
    row < 0 ||
    row >= value.cells.length ||
    column < 0 ||
    column >= value.cells[0].length
  )
    throw new RangeError('Invalid cell');
}
const overlaps = (a: TableMerge, b: TableMerge) =>
  a.row < b.row + b.rowSpan &&
  b.row < a.row + a.rowSpan &&
  a.column < b.column + b.columnSpan &&
  b.column < a.column + a.columnSpan;

/** Covered coordinates resolve to the visible cell's top-left anchor. */
export function tableCellSpan(
  value: TableTextRegions,
  row: number,
  column: number,
): TableMerge {
  assertCell(value, row, column);
  const merge = value.merges?.find(
    (m) =>
      row >= m.row &&
      row < m.row + m.rowSpan &&
      column >= m.column &&
      column < m.column + m.columnSpan,
  );
  return merge ? { ...merge } : { row, column, rowSpan: 1, columnSpan: 1 };
}
export function tableCellAnchor(
  value: TableTextRegions,
  row: number,
  column: number,
): { row: number; column: number } {
  const cell = tableCellSpan(value, row, column);
  return { row: cell.row, column: cell.column };
}

/** A rectangle always contains whole merged cells, even after shift selection. */
export function normalizeTableSelection(
  value: TableTextRegions,
  range: TableMerge,
): TableMerge {
  assertTable(value);
  if (
    ![range.row, range.column, range.rowSpan, range.columnSpan].every(
      Number.isSafeInteger,
    ) ||
    range.rowSpan < 1 ||
    range.columnSpan < 1
  )
    throw new RangeError('Invalid selection');
  assertCell(value, range.row, range.column);
  assertCell(
    value,
    range.row + range.rowSpan - 1,
    range.column + range.columnSpan - 1,
  );
  let next = { ...range };
  let changed = true;
  while (changed) {
    changed = false;
    for (const merge of value.merges ?? []) {
      if (!overlaps(next, merge)) continue;
      const row = Math.min(next.row, merge.row),
        column = Math.min(next.column, merge.column),
        bottom = Math.max(next.row + next.rowSpan, merge.row + merge.rowSpan),
        right = Math.max(
          next.column + next.columnSpan,
          merge.column + merge.columnSpan,
        );
      if (
        row !== next.row ||
        column !== next.column ||
        bottom !== next.row + next.rowSpan ||
        right !== next.column + next.columnSpan
      ) {
        next = {
          row,
          column,
          rowSpan: bottom - row,
          columnSpan: right - column,
        };
        changed = true;
      }
    }
  }
  return next;
}

export function tableCellRichText(
  value: TableTextRegions,
  row: number,
  column: number,
  align: 'left' | 'center' | 'right' = 'center',
): RichText {
  const anchor = tableCellAnchor(value, row, column);
  return structuredClone(
    value.cellRichText?.[anchor.row][anchor.column] ??
      fromPlainText(value.cells[anchor.row][anchor.column], align),
  );
}

/** Draft updates preserve unknown sibling fields and their exact plain projection. */
export function setRegionRichText<T extends TextRegions>(
  regions: T,
  target: TextRegionTarget,
  rich: RichText,
): T;
export function setRegionRichText(
  regions: TextRegions,
  target: TextRegionTarget,
  rich: RichText,
): TextRegions {
  if (!isRichText(rich)) throw new RangeError('Invalid rich text');
  const text = plainText(rich);
  const next = structuredClone(regions);
  if (target.type === 'container-title' && next.type === 'container') {
    next.title = text;
    next.titleRichText = structuredClone(rich);
  } else if (target.type === 'table-cell' && next.type === 'table') {
    if (text.length > MAX_TABLE_CELL_TEXT)
      throw new RangeError('Cell text limit');
    const { row, column } = tableCellAnchor(next, target.row, target.column);
    next.cells[row][column] = text;
    next.cellRichText ??= next.cells.map((row) => row.map(() => null));
    next.cellRichText[row][column] = structuredClone(rich);
  } else throw new RangeError('Invalid region target');
  if (!isTextRegions(next, next.type))
    throw new RangeError('Region text limit');
  return next;
}

/** Body text continues to use the existing rich-text extension. */
export function regionRichText(
  node: Node,
  target: TextRegionTarget,
  align: 'left' | 'center' | 'right' = 'center',
): RichText {
  if (target.type === 'container-body' && node.kind === 'container')
    return structuredClone(
      readRichText(node) ??
        fromPlainText(String(node.content.text ?? ''), align),
    );
  const regions = defaultTextRegions(node);
  if (target.type === 'container-title' && regions?.type === 'container')
    return structuredClone(
      regions.titleRichText ?? fromPlainText(regions.title, align),
    );
  if (target.type === 'table-cell' && regions?.type === 'table')
    return tableCellRichText(regions, target.row, target.column, align);
  throw new RangeError('Invalid region target');
}

/** Resizing clips spans at the new boundary and retains the surviving anchor contents. */
export function resizeTable(
  value: TableTextRegions,
  rows: number,
  columns: number,
): TableTextRegions {
  assertTable(value);
  if (
    !Number.isSafeInteger(rows) ||
    !Number.isSafeInteger(columns) ||
    rows < 1 ||
    rows > MAX_TABLE_ROWS ||
    columns < 1 ||
    columns > MAX_TABLE_COLUMNS
  )
    throw new RangeError('Table dimensions');
  const next = structuredClone(value);
  next.cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => value.cells[r]?.[c] ?? ''),
  );
  if (value.cellRichText)
    next.cellRichText = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: columns }, (_, c) =>
        structuredClone(value.cellRichText?.[r]?.[c] ?? null),
      ),
    );
  if (value.merges)
    next.merges = value.merges
      .filter((m) => m.row < rows && m.column < columns)
      .map((m) => ({
        ...m,
        rowSpan: Math.min(m.rowSpan, rows - m.row),
        columnSpan: Math.min(m.columnSpan, columns - m.column),
      }))
      .filter((m) => m.rowSpan * m.columnSpan > 1);
  assertTable(next);
  return next;
}

/** Combining cells retains every nonempty paragraph and its individual run styles. */
export function mergeTableCells(
  value: TableTextRegions,
  selection: TableMerge,
  align: 'left' | 'center' | 'right' = 'center',
): TableTextRegions {
  const range = normalizeTableSelection(value, selection);
  if (range.rowSpan * range.columnSpan < 2)
    throw new RangeError('Select multiple cells');
  const next = structuredClone(value);
  const paragraphs: RichText['paragraphs'] = [];
  for (let r = range.row; r < range.row + range.rowSpan; r++)
    for (let c = range.column; c < range.column + range.columnSpan; c++) {
      if (next.cells[r][c].length)
        paragraphs.push(...tableCellRichText(value, r, c, align).paragraphs);
      next.cells[r][c] = '';
      if (next.cellRichText) next.cellRichText[r][c] = null;
    }
  const rich: RichText = {
    version: 1,
    paragraphs: paragraphs.length
      ? paragraphs
      : fromPlainText('', align).paragraphs,
  };
  if (plainText(rich).length > MAX_TABLE_CELL_TEXT || !isRichText(rich))
    throw new RangeError('Cell text limit');
  next.merges = [
    ...(next.merges ?? []).filter((m) => !overlaps(m, range)),
    range,
  ].sort((a, b) => a.row - b.row || a.column - b.column);
  next.cells[range.row][range.column] = plainText(rich);
  next.cellRichText ??= next.cells.map((row) => row.map(() => null));
  next.cellRichText[range.row][range.column] = rich;
  assertTable(next);
  if (
    next.cells.flat().reduce((sum, cell) => sum + cell.length, 0) >
    MAX_TABLE_TEXT
  )
    throw new RangeError('Table text limit');
  return next;
}

/** Splitting leaves the combined content in the former merged cell's anchor. */
export function splitTableCell(
  value: TableTextRegions,
  row: number,
  column: number,
): TableTextRegions {
  assertTable(value);
  const anchor = tableCellAnchor(value, row, column);
  const next = structuredClone(value);
  next.merges = (next.merges ?? []).filter(
    (m) => m.row !== anchor.row || m.column !== anchor.column,
  );
  return next;
}

/** Names and accessible descriptions include supported regions without changing stored body text. */
export function elementDisplayText(node: Node): string {
  const body = typeof node.content.text === 'string' ? node.content.text : '';
  const regions = readTextRegions(node);
  if (regions?.type === 'table') return tableTextSummary(regions);
  if (regions?.type === 'container')
    return [regions.title, body]
      .filter((value) => value.trim().length > 0)
      .join('\n')
      .slice(0, 4096);
  return body.slice(0, 4096);
}
