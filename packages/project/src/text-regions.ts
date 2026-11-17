import { isRichText, plainText, type RichText } from './rich-text';

/** Portable text regions are declarative data; no embedded markup or resources execute. */
export const TEXT_REGIONS_KEY = 'org.koxora.text-regions';
export const TEXT_REGIONS_FEATURE = 'element-text-regions-v1';
export const ADVANCED_TEXT_REGIONS_FEATURE = 'advanced-text-regions-v1';
export const TABLE_CALCULATION_FEATURE = 'table-layout-formulas-v1';
export const MAX_REGION_TITLE = 4096;
export const MAX_TABLE_ROWS = 20;
export const MAX_TABLE_COLUMNS = 12;
export const MAX_TABLE_CELL_TEXT = 1024;
export const MAX_TABLE_TEXT = 32768;
export type ContainerTextRegions = {
  version: 1;
  type: 'container';
  title: string;
  titleRichText?: RichText;
};
export type TableMerge = {
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
};
export type TableTextRegions = {
  version: 1;
  type: 'table';
  cells: string[][];
  headerRow: boolean;
  cellRichText?: (RichText | null)[][];
  merges?: TableMerge[];
  columnWidths?: number[];
  rowHeights?: number[];
  formulas?: boolean;
};
export type TextRegions = ContainerTextRegions | TableTextRegions;

export function hasTableCalculations(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return (
    data.version === 1 &&
    ['columnWidths', 'rowHeights', 'formulas'].some(
      (key) => data[key] !== undefined,
    )
  );
}

/** Older region readers must reject advanced semantics rather than flatten them. */
export function hasAdvancedTextRegions(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    ['titleRichText', 'cellRichText', 'merges'].some(
      (key) => v[key] !== undefined,
    )
  );
}

/** Known fields are bounded; compatible optional fields can survive a read/write cycle. */
export function isTextRegions(
  value: unknown,
  kind: string,
): value is TextRegions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || v.type !== kind) return false;
  if (kind === 'container')
    return (
      typeof v.title === 'string' &&
      v.title.length <= MAX_REGION_TITLE &&
      (v.titleRichText === undefined ||
        (isRichText(v.titleRichText) &&
          plainText(v.titleRichText) === v.title)) &&
      v.cellRichText === undefined &&
      v.merges === undefined &&
      !hasTableCalculations(v)
    );
  if (
    kind !== 'table' ||
    typeof v.headerRow !== 'boolean' ||
    !Array.isArray(v.cells) ||
    v.titleRichText !== undefined
  )
    return false;
  if (!v.cells.length || v.cells.length > MAX_TABLE_ROWS) return false;
  let columns = 0,
    length = 0;
  for (const row of v.cells) {
    if (!Array.isArray(row) || !row.length || row.length > MAX_TABLE_COLUMNS)
      return false;
    if (!columns) columns = row.length;
    if (row.length !== columns) return false;
    for (const cell of row) {
      if (typeof cell !== 'string' || cell.length > MAX_TABLE_CELL_TEXT)
        return false;
      length += cell.length;
      if (length > MAX_TABLE_TEXT) return false;
    }
  }
  for (const [key, size] of [
    ['columnWidths', columns],
    ['rowHeights', v.cells.length],
  ] as const) {
    const values = v[key];
    if (
      values !== undefined &&
      (!Array.isArray(values) ||
        values.length !== size ||
        values.some(
          (n) =>
            typeof n !== 'number' || !Number.isFinite(n) || n < 1 || n > 10000,
        ))
    )
      return false;
  }
  if (v.formulas !== undefined && typeof v.formulas !== 'boolean') return false;
  if (v.cellRichText !== undefined) {
    if (
      !Array.isArray(v.cellRichText) ||
      v.cellRichText.length !== v.cells.length
    )
      return false;
    for (let row = 0; row < v.cells.length; row++) {
      const rich = v.cellRichText[row];
      if (!Array.isArray(rich) || rich.length !== columns) return false;
      for (let column = 0; column < columns; column++) {
        const cell = rich[column];
        if (
          cell !== null &&
          (!isRichText(cell) || plainText(cell) !== v.cells[row][column])
        )
          return false;
      }
    }
  }
  if (v.merges !== undefined) {
    if (!Array.isArray(v.merges) || v.merges.length > v.cells.length * columns)
      return false;
    const occupied = new Set<number>();
    for (const raw of v.merges) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
      const merge = raw as TableMerge;
      if (
        Object.keys(merge).some(
          (key) => !['row', 'column', 'rowSpan', 'columnSpan'].includes(key),
        ) ||
        ![merge.row, merge.column, merge.rowSpan, merge.columnSpan].every(
          Number.isSafeInteger,
        ) ||
        merge.row < 0 ||
        merge.column < 0 ||
        merge.rowSpan < 1 ||
        merge.columnSpan < 1 ||
        merge.rowSpan * merge.columnSpan < 2 ||
        merge.row + merge.rowSpan > v.cells.length ||
        merge.column + merge.columnSpan > columns
      )
        return false;
      for (let r = merge.row; r < merge.row + merge.rowSpan; r++)
        for (let c = merge.column; c < merge.column + merge.columnSpan; c++) {
          const key = r * columns + c;
          if (occupied.has(key)) return false;
          occupied.add(key);
          if (r !== merge.row || c !== merge.column) {
            if (v.cells[r][c] !== '') return false;
            if (
              Array.isArray(v.cellRichText) &&
              (v.cellRichText[r] as unknown[])[c] !== null
            )
              return false;
          }
        }
    }
  }
  return true;
}
