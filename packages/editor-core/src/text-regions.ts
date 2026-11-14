import {
  isTextRegions,
  TEXT_REGIONS_KEY,
  type Node,
  type TextRegions,
  type TableTextRegions,
} from '@koxora/project';

export {
  isTextRegions,
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
} from '@koxora/project';

/** Return an independent supported view; unknown and future payloads remain opaque. */
export function readTextRegions(
  node: Pick<Node, 'kind' | 'extensions'>,
): TextRegions | null {
  const value = node.extensions[TEXT_REGIONS_KEY];
  if (!isTextRegions(value, node.kind)) return null;
  return value.type === 'container'
    ? { version: 1, type: 'container', title: value.title }
    : {
        version: 1,
        type: 'table',
        cells: value.cells.map((row) => [...row]),
        headerRow: value.headerRow,
      };
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
