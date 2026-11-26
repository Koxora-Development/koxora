import {
  CURRENT_VERSION,
  DEFAULT_LIMITS,
  type Dataset,
  type Json,
} from '@koxora/project';

export const MAX_DELIMITED_BYTES = 2 * 1024 * 1024;
const maxRows = 5_000;
const maxColumns = 128;
const maxCells = 100_000;
const maxCellLength = 16_384;
const maxNameLength = 4_096;
const delimiters = [',', ';', '\t'] as const;

export type Delimiter = (typeof delimiters)[number];
export type DelimitedEncoding =
  'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252';
export type EditableType = 'string' | 'number' | 'boolean' | 'date';
export interface DelimitedSheet {
  delimiter: Delimiter;
  encoding: DelimitedEncoding;
  rows: string[][];
}

export class DelimitedDataError extends Error {
  constructor(
    public readonly code:
      'empty' | 'encoding' | 'syntax' | 'columns' | 'limit' | 'value' | 'title',
    public readonly row?: number,
    public readonly column?: number,
  ) {
    super(code);
  }
}

function decode(bytes: Uint8Array, allowWindows1252: boolean) {
  let encoding: DelimitedEncoding = 'utf-8';
  let bom = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bom = 3;
  else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le';
    bom = 2;
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf-16be';
    bom = 2;
  }

  let text: string;
  try {
    text = new TextDecoder(encoding, { fatal: true, ignoreBOM: true }).decode(
      bytes.subarray(bom),
    );
  } catch {
    if (bom || !allowWindows1252) throw new DelimitedDataError('encoding');
    encoding = 'windows-1252';
    text = new TextDecoder(encoding).decode(bytes);
  }
  if (text.includes('\0')) throw new DelimitedDataError('encoding');
  return { text, encoding };
}

type Candidate =
  | {
      delimiter: Delimiter;
      separators: number;
      rows: string[][];
      error?: never;
    }
  | {
      delimiter: Delimiter;
      separators: number;
      error: DelimitedDataError;
      rows?: never;
    };

/** Track unquoted separators even for an invalid candidate, so ragged input cannot turn into one column. */
function readRecords(text: string, delimiter: Delimiter): Candidate {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let state: 'start' | 'plain' | 'quoted' | 'closed' = 'start';
  let cells = 0;
  let separators = 0;

  function append(character: string) {
    if (field.length >= maxCellLength)
      throw new DelimitedDataError('limit', rows.length + 1, row.length + 1);
    field += character;
  }

  function finishField() {
    if (row.length >= maxColumns || cells >= maxCells)
      throw new DelimitedDataError('limit', rows.length + 1, row.length + 1);
    row.push(field);
    cells++;
    field = '';
    state = 'start';
  }

  function finishRecord() {
    // Physically empty lines have no fields. Quoted empty values and trailing fields are retained.
    if (row.length === 0 && state === 'start') return;
    finishField();
    if (rows.length >= maxRows)
      throw new DelimitedDataError('limit', rows.length + 1);
    rows.push(row);
    row = [];
  }

  try {
    for (let i = 0; i < text.length; i++) {
      const character = text[i];
      if (state === 'quoted') {
        if (character !== '"') append(character);
        else if (text[i + 1] === '"') {
          append('"');
          i++;
        } else state = 'closed';
      } else if (character === delimiter) {
        separators++;
        finishField();
      } else if (character === '\r' || character === '\n') {
        finishRecord();
        if (character === '\r' && text[i + 1] === '\n') i++;
      } else if (character === '"' && state === 'start') state = 'quoted';
      else {
        if (state === 'closed' || character === '"')
          throw new DelimitedDataError(
            'syntax',
            rows.length + 1,
            row.length + 1,
          );
        append(character);
        state = 'plain';
      }
    }
    if (state === 'quoted')
      throw new DelimitedDataError('syntax', rows.length + 1, row.length + 1);
    finishRecord();
    if (rows.length === 0) throw new DelimitedDataError('empty');
    const width = rows[0].length;
    const mismatch = rows.findIndex((record) => record.length !== width);
    if (mismatch !== -1)
      throw new DelimitedDataError(
        'columns',
        mismatch + 1,
        Math.min(width, rows[mismatch].length) + 1,
      );
    return { delimiter, separators, rows };
  } catch (error) {
    if (!(error instanceof DelimitedDataError)) throw error;
    return { delimiter, separators, error };
  }
}

export function parseDelimited(
  bytes: Uint8Array,
  delimiter?: Delimiter,
  options?: { allowWindows1252?: boolean },
): DelimitedSheet {
  if (bytes.byteLength > MAX_DELIMITED_BYTES)
    throw new DelimitedDataError('limit');
  const { text, encoding } = decode(bytes, options?.allowWindows1252 !== false);
  if (delimiter !== undefined) {
    const result = readRecords(text, delimiter);
    if (result.error) throw result.error;
    return { delimiter, encoding, rows: result.rows };
  }

  const candidates = delimiters.map((candidate) =>
    readRecords(text, candidate),
  );
  const valid = candidates.filter((candidate) => candidate.rows !== undefined);
  const multi = valid.filter((candidate) => candidate.rows[0].length > 1);
  multi.sort((a, b) => b.rows[0].length - a.rows[0].length);
  const separatedError = candidates
    .filter((candidate) => candidate.error && candidate.separators > 0)
    .sort((a, b) => b.separators - a.separators)[0];
  const best = multi[0] ?? (separatedError ? undefined : valid[0]);
  if (!best)
    throw (
      separatedError?.error ??
      candidates[0].error ??
      new DelimitedDataError('syntax')
    );
  return { delimiter: best.delimiter, encoding, rows: best.rows };
}

const decimal = /^[+-]?(?:(?:0|[1-9]\d*)(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i;
const groupedComma = /^[+-]?[1-9]\d{0,2},\d{3}$/;

function parseNumber(value: string, delimiter: Delimiter): number | undefined {
  let normalized = value;
  if (value.includes(',')) {
    if (delimiter === ',' || value.includes('.') || groupedComma.test(value))
      return undefined;
    normalized = value.replace(',', '.');
  }
  if (!decimal.test(normalized)) return undefined;
  const number = Number(normalized);
  if (
    !Number.isFinite(number) ||
    (Number.isInteger(number) && !Number.isSafeInteger(number))
  )
    return undefined;
  const significant = normalized
    .split(/e/i)[0]
    .replace(/[^0-9]/g, '')
    .replace(/^0+|0+$/g, '');
  if (number === 0 && significant) return undefined;
  if (significant.length > 15 && /[.e]/i.test(normalized)) return undefined;
  return number === 0 ? 0 : number;
}

function typedValue(
  raw: string,
  type: EditableType,
  delimiter: Delimiter,
): Json | undefined {
  if (raw === '') return null;
  if (type === 'string') return raw;
  const value = raw.trim();
  if (type === 'number') return parseNumber(value, delimiter);
  if (type === 'boolean' && /^(true|false)$/i.test(value))
    return value.toLowerCase() === 'true';
  if (type === 'date' && /^\d{4}-\d\d-\d\d$/.test(value)) {
    const stamp = Date.parse(value);
    if (
      Number.isFinite(stamp) &&
      new Date(stamp).toISOString().slice(0, 10) === value
    )
      return value;
  }
  return undefined;
}

function inferType(
  rows: string[][],
  column: number,
  delimiter: Delimiter,
): EditableType {
  let inferred: EditableType | undefined;
  const types = ['number', 'boolean', 'date'] as const;
  for (const row of rows) {
    const value = row[column];
    if (value === '') continue;
    const current =
      inferred ??
      types.find((type) => typedValue(value, type, delimiter) !== undefined);
    if (!current || typedValue(value, current, delimiter) === undefined)
      return 'string';
    inferred = current;
  }
  return inferred ?? 'string';
}

export function describeDelimited(
  sheet: DelimitedSheet,
  header: boolean,
  fallbackName: (index: number) => string,
): { fields: { name: string; type: EditableType }[]; rows: string[][] } {
  const rows = header ? sheet.rows.slice(1) : sheet.rows;
  const fields = sheet.rows[0].map((label, column) => {
    const name = (header && label.trim()) || fallbackName(column).trim();
    if (!name || name.length > maxNameLength)
      throw new DelimitedDataError('limit', header ? 1 : undefined, column + 1);
    return { name, type: inferType(rows, column, sheet.delimiter) };
  });
  return { fields, rows };
}

export function createDelimitedDataset(
  sheet: DelimitedSheet,
  options: {
    title: string;
    header: boolean;
    types?: readonly EditableType[];
    fallbackName: (index: number) => string;
    makeId: () => string;
  },
): Dataset {
  const title = options.title.trim();
  if (
    !title ||
    title.length > maxNameLength ||
    Array.from(title).some(
      (value) => value.charCodeAt(0) < 32 || value.charCodeAt(0) === 127,
    )
  )
    throw new DelimitedDataError('title');
  const description = describeDelimited(
    sheet,
    options.header,
    options.fallbackName,
  );
  if (!description.rows.length) throw new DelimitedDataError('empty');
  if (options.types && options.types.length !== description.fields.length)
    throw new DelimitedDataError('value');
  const id = options.makeId();
  const fields = description.fields.map(({ name, type }, column) => ({
    id: options.makeId(),
    name,
    type: options.types?.[column] ?? type,
    nullable: description.rows.some((row) => row[column] === ''),
    extensions: {},
  }));
  const rows = description.rows.map((row, index) =>
    Object.fromEntries(
      fields.map((field, column) => {
        const value = typedValue(row[column], field.type, sheet.delimiter);
        if (value === undefined)
          throw new DelimitedDataError(
            'value',
            index + (options.header ? 2 : 1),
            column + 1,
          );
        return [field.id, value];
      }),
    ),
  );
  const dataset: Dataset = {
    id,
    schemaVersion: CURRENT_VERSION,
    title,
    fields,
    rows,
    source: {
      format: sheet.delimiter === '\t' ? 'tsv' : 'csv',
      encoding: sheet.encoding,
      delimiter: sheet.delimiter,
      header: options.header,
    },
    extensions: {},
  };
  if (
    new TextEncoder().encode(JSON.stringify(dataset)).byteLength >
    DEFAULT_LIMITS.jsonBytes
  )
    throw new DelimitedDataError('limit');
  return dataset;
}
