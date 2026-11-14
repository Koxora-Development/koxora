/** Portable text regions are declarative data; no embedded markup or resources execute. */
export const TEXT_REGIONS_KEY = 'org.koxora.text-regions';
export const TEXT_REGIONS_FEATURE = 'element-text-regions-v1';
export const MAX_REGION_TITLE = 4096;
export const MAX_TABLE_ROWS = 20;
export const MAX_TABLE_COLUMNS = 12;
export const MAX_TABLE_CELL_TEXT = 1024;
export const MAX_TABLE_TEXT = 32768;
export type ContainerTextRegions = {
  version: 1;
  type: 'container';
  title: string;
};
export type TableTextRegions = {
  version: 1;
  type: 'table';
  cells: string[][];
  headerRow: boolean;
};
export type TextRegions = ContainerTextRegions | TableTextRegions;

/** Known fields are bounded; compatible optional fields can survive a read/write cycle. */
export function isTextRegions(
  value: unknown,
  kind: string,
): value is TextRegions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || v.type !== kind) return false;
  if (kind === 'container')
    return typeof v.title === 'string' && v.title.length <= MAX_REGION_TITLE;
  if (
    kind !== 'table' ||
    typeof v.headerRow !== 'boolean' ||
    !Array.isArray(v.cells)
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
  return true;
}
