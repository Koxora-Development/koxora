import {
  isTextRegions,
  type TableTextRegions,
  type TableMerge,
} from '@koxora/project';
import {
  MAX_TABLE_ROWS,
  MAX_TABLE_COLUMNS,
  normalizeTableSelection,
  tableCellAnchor,
  tableCellRichText,
  resizeTable,
  setRegionRichText,
} from './text-regions';
import {
  formatRichText,
  plainText,
  fromPlainText,
  type RichText,
} from './rich-text';

export type TableAxis = 'row' | 'column';
/** Insert at a boundary or remove a range. Surviving merged cells retain their anchor text. */
export function changeTableAxis(
  value: TableTextRegions,
  axis: TableAxis,
  index: number,
  count: number,
  action: 'insert' | 'delete',
): TableTextRegions {
  if (!isTextRegions(value, 'table')) throw new RangeError('Invalid table');
  const size = axis === 'row' ? value.cells.length : value.cells[0].length;
  const nextSize = size + (action === 'insert' ? count : -count);
  if (
    !Number.isSafeInteger(index) ||
    !Number.isSafeInteger(count) ||
    count < 1 ||
    index < 0 ||
    index > size ||
    (action === 'delete' && index + count > size) ||
    nextSize < 1 ||
    nextSize > (axis === 'row' ? MAX_TABLE_ROWS : MAX_TABLE_COLUMNS)
  )
    throw new RangeError('Table dimensions');
  const next = structuredClone(value);
  const source = Array.from({ length: nextSize }, (_, i) =>
    action === 'insert'
      ? i < index
        ? i
        : i < index + count
          ? -1
          : i - count
      : i < index
        ? i
        : i + count,
  );
  const rows = axis === 'row' ? nextSize : value.cells.length;
  const columns = axis === 'column' ? nextSize : value.cells[0].length;
  const old = (r: number, c: number) => [
    axis === 'row' ? source[r] : r,
    axis === 'column' ? source[c] : c,
  ];
  next.cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => {
      const [a, b] = old(r, c);
      return value.cells[a]?.[b] ?? '';
    }),
  );
  if (value.cellRichText)
    next.cellRichText = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: columns }, (_, c) => {
        const [a, b] = old(r, c);
        return structuredClone(value.cellRichText?.[a]?.[b] ?? null);
      }),
    );
  if (value.merges) next.merges = [];
  for (const merge of value.merges ?? []) {
    const start = merge[axis],
      length = axis === 'row' ? merge.rowSpan : merge.columnSpan;
    let position = start,
      span = length;
    if (action === 'insert') {
      if (index <= start) position += count;
      else if (index < start + length) span += count;
    } else {
      span -= Math.max(
        0,
        Math.min(start + length, index + count) - Math.max(start, index),
      );
      if (span === 0) continue;
      position =
        start >= index + count ? start - count : Math.min(start, index);
    }
    const updated = {
      ...merge,
      [axis]: position,
      [axis === 'row' ? 'rowSpan' : 'columnSpan']: span,
    };
    // A removed anchor migrates to the surviving upper-left cell, including all rich paragraphs.
    next.cells[updated.row][updated.column] =
      value.cells[merge.row][merge.column];
    if (next.cellRichText)
      next.cellRichText[updated.row][updated.column] = structuredClone(
        value.cellRichText?.[merge.row][merge.column] ?? null,
      );
    if (updated.rowSpan * updated.columnSpan > 1) next.merges!.push(updated);
  }
  if (!isTextRegions(next, 'table'))
    throw new RangeError('Invalid table operation');
  return next;
}

/** Format the complete selected range once; covered cells remain empty. */
export function formatTableSelection(
  value: TableTextRegions,
  range: TableMerge,
  patch: Parameters<typeof formatRichText>[1],
): TableTextRegions {
  const selection = normalizeTableSelection(value, range);
  let next = structuredClone(value);
  for (let r = selection.row; r < selection.row + selection.rowSpan; r++)
    for (
      let c = selection.column;
      c < selection.column + selection.columnSpan;
      c++
    ) {
      const anchor = tableCellAnchor(next, r, c);
      if (anchor.row !== r || anchor.column !== c) continue;
      next = setRegionRichText(
        next,
        { type: 'table-cell', row: r, column: c },
        formatRichText(tableCellRichText(next, r, c), patch),
      );
    }
  return next;
}

/** Quoted TSV preserves embedded tabs, quotes and multiline cell contents. */
export function copyTableText(
  value: TableTextRegions,
  range: TableMerge,
): string {
  const selection = normalizeTableSelection(value, range);
  const quote = (cell: string) =>
    /["\t\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
  return (
    value.cells
      .slice(selection.row, selection.row + selection.rowSpan)
      .map((row) =>
        row
          .slice(selection.column, selection.column + selection.columnSpan)
          .map(quote)
          .join('\t'),
      )
      .join('\n') + '\n'
  );
}
function parseTableText(text: string): string[][] {
  if (text.length > 131072) throw new RangeError('Clipboard limit');
  const rows: string[][] = [[]];
  let field = '',
    quoted = false,
    closed = false;
  const finish = () => {
    if (rows.at(-1)!.length >= MAX_TABLE_COLUMNS || field.length > 1024)
      throw new RangeError('Cell limit');
    rows.at(-1)!.push(field);
    field = '';
    closed = false;
  };
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted) {
      if (character === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += character;
    } else if (character === '\t' || character === '\n' || character === '\r') {
      finish();
      if (character !== '\t') {
        if (character === '\r' && text[i + 1] === '\n') i++;
        if (i === text.length - 1) return rows;
        if (rows.length >= MAX_TABLE_ROWS) throw new RangeError('Row limit');
        rows.push([]);
      }
    } else if (closed) throw new RangeError('Invalid quoted field');
    else if (character === '"' && field.length === 0) quoted = true;
    else field += character;
  }
  if (quoted) throw new RangeError('Unterminated quoted field');
  finish();
  return rows;
}

/** Plain TSV clipboard exchange, bounded before allocation. Rich content is never executed. */
export function pasteTableText(
  value: TableTextRegions,
  row: number,
  column: number,
  text: string,
): TableTextRegions {
  tableCellAnchor(value, row, column);
  const lines = parseTableText(text);
  const width = Math.max(...lines.map((line) => line.length));
  const range = { row, column, rowSpan: lines.length, columnSpan: width };
  if (lines.length === 1 && width === 1)
    return setRegionRichText(
      value,
      { type: 'table-cell', row, column },
      fromPlainText(lines[0][0]),
    );
  if (
    value.merges?.some(
      (m) =>
        m.row < row + lines.length &&
        row < m.row + m.rowSpan &&
        m.column < column + width &&
        column < m.column + m.columnSpan,
    )
  )
    throw new RangeError('Split merged cells before pasting a matrix');
  const next = resizeTable(
    value,
    Math.max(value.cells.length, row + range.rowSpan),
    Math.max(value.cells[0].length, column + range.columnSpan),
  );
  next.cellRichText ??= next.cells.map((cells) => cells.map(() => null));
  for (let r = 0; r < lines.length; r++)
    for (let c = 0; c < width; c++) {
      const rich: RichText = fromPlainText(lines[r][c] ?? '');
      next.cells[row + r][column + c] = plainText(rich);
      next.cellRichText[row + r][column + c] = rich;
    }
  if (!isTextRegions(next, 'table')) throw new RangeError('Table text limit');
  return next;
}
