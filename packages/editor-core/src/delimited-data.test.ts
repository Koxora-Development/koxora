import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  synchronizeIndexes,
} from '@koxora/project';
import {
  createDelimitedDataset,
  DelimitedDataError,
  describeDelimited,
  MAX_DELIMITED_BYTES,
  parseDelimited,
} from './delimited-data';

const encode = (text: string) => new TextEncoder().encode(text);
const fallbackName = (index: number) => `Column ${index + 1}`;
const makeId = () => crypto.randomUUID();

describe('local delimited files', () => {
  it('detects a semicolon-delimited file and preserves quoting, newlines and trailing cells', () => {
    const file = encode(
      '\ufeffName;Description;Amount\r\n\r\n"A;B";"Across\r\n""two"" lines";12,50\r\nC;"";\r\n',
    );
    expect(parseDelimited(file)).toEqual({
      delimiter: ';',
      encoding: 'utf-8',
      rows: [
        ['Name', 'Description', 'Amount'],
        ['A;B', 'Across\r\n"two" lines', '12,50'],
        ['C', '', ''],
      ],
    });
  });

  it('detects tabs and can override the default separator', () => {
    const tsv = parseDelimited(encode('Name\tComment\rKim\t"Embedded\ttab"'));
    expect(tsv).toEqual({
      delimiter: '\t',
      encoding: 'utf-8',
      rows: [
        ['Name', 'Comment'],
        ['Kim', 'Embedded\ttab'],
      ],
    });
    const ambiguous = encode('name;unit,value\nheight;cm,20');
    expect(parseDelimited(ambiguous).delimiter).toBe(',');
    expect(parseDelimited(ambiguous, ';').rows).toEqual([
      ['name', 'unit,value'],
      ['height', 'cm,20'],
    ]);
  });

  it.each(['utf-16le', 'utf-16be'] as const)(
    'detects %s with a byte-order mark',
    (encoding) => {
      const bytes = Buffer.from('\ufeffName\tPayment\nÄnne\t600', 'utf16le');
      if (encoding === 'utf-16be') bytes.swap16();
      expect(parseDelimited(bytes)).toEqual({
        delimiter: '\t',
        encoding,
        rows: [
          ['Name', 'Payment'],
          ['Änne', '600'],
        ],
      });
    },
  );

  it('falls back to Windows-1252 for unmarked input and can require valid UTF', () => {
    const bytes = Uint8Array.from([
      ...encode('Name;Payment\nGr'),
      0xfc,
      ...encode('n;12,50'),
    ]);
    expect(parseDelimited(bytes)).toEqual({
      delimiter: ';',
      encoding: 'windows-1252',
      rows: [
        ['Name', 'Payment'],
        ['Grün', '12,50'],
      ],
    });
    expect(() =>
      parseDelimited(bytes, undefined, { allowWindows1252: false }),
    ).toThrow(expect.objectContaining({ code: 'encoding' }));
    expect(() => parseDelimited(Uint8Array.of(0xef, 0xbb, 0xbf, 0xff))).toThrow(
      expect.objectContaining({ code: 'encoding' }),
    );
    expect(() => parseDelimited(Uint8Array.of(0xff, 0xfe, 0x61))).toThrow(
      expect.objectContaining({ code: 'encoding' }),
    );
    expect(() => parseDelimited(Uint8Array.of(0x61, 0x00, 0x62))).toThrow(
      expect.objectContaining({ code: 'encoding' }),
    );
  });

  it.each([
    ['a,b\n1', { code: 'columns', row: 2, column: 2 }],
    ['a,b\n1,2,3', { code: 'columns', row: 2, column: 3 }],
    ['a,b\n1,"2', { code: 'syntax', row: 2, column: 2 }],
    ['a,b\n1,"2"3', { code: 'syntax', row: 2, column: 2 }],
    ['a,b\n1,2"3', { code: 'syntax', row: 2, column: 2 }],
    ['\n\r\n', { code: 'empty' }],
  ])(
    'rejects malformed files with logical record and field positions',
    (input, expected) => {
      expect(() => parseDelimited(encode(input))).toThrow(
        expect.objectContaining(expected),
      );
    },
  );

  it('enforces byte, column, row, cell length and total-cell limits', () => {
    const row = Array(101).fill('a').join(',');
    for (const input of [
      new Uint8Array(MAX_DELIMITED_BYTES + 1),
      encode(Array(129).fill('a').join(',')),
      encode('a\n'.repeat(5001)),
      encode('a'.repeat(16385)),
      encode(`${row}\n`.repeat(1000)),
    ])
      expect(() => parseDelimited(input)).toThrow(
        expect.objectContaining({ code: 'limit' }),
      );
  });
});

describe('project dataset conversion', () => {
  const sheet = parseDelimited(
    encode(
      'ID;Amount;Active;Date;Precision;Empty;Literal\n0007;12,50;TrUe;2024-02-29;9007199254740993;;"=SUM(1,2)"\n0008;-3.5;FALSE;2025-03-01;0.00000012345678901234567;;+TEST()',
    ),
  );

  it('infers conservative numbers, booleans and ISO dates while preserving literal or ambiguous values', () => {
    expect(describeDelimited(sheet, true, fallbackName).fields).toEqual([
      { name: 'ID', type: 'string' },
      { name: 'Amount', type: 'number' },
      { name: 'Active', type: 'boolean' },
      { name: 'Date', type: 'date' },
      { name: 'Precision', type: 'string' },
      { name: 'Empty', type: 'string' },
      { name: 'Literal', type: 'string' },
    ]);
    for (const [raw, expected] of [
      ['1,234', 'string'],
      ['1e-400', 'string'],
      ['2024-02-30', 'string'],
      ['9007199254740991', 'number'],
      ['  ', 'string'],
    ]) {
      const sample = parseDelimited(encode(`Header;Other\n${raw};label`));
      expect(describeDelimited(sample, true, fallbackName).fields[0].type).toBe(
        expected,
      );
    }
  });

  it('saves durable field references with typed data, nulls, safe metadata and no formula execution', async () => {
    const dataset = createDelimitedDataset(sheet, {
      title: ' Requests ',
      header: true,
      fallbackName,
      makeId,
    });
    expect(dataset.source).toEqual({
      format: 'csv',
      delimiter: ';',
      encoding: 'utf-8',
      header: true,
    });
    expect(dataset.title).toBe('Requests');
    expect(dataset.fields.map((field) => field.nullable)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      false,
    ]);
    expect(dataset.fields.map((field) => dataset.rows[0][field.id])).toEqual([
      '0007',
      12.5,
      true,
      '2024-02-29',
      '9007199254740993',
      null,
      '=SUM(1,2)',
    ]);
    expect(dataset.fields.map((field) => dataset.rows[1][field.id])).toEqual([
      '0008',
      -3.5,
      false,
      '2025-03-01',
      '0.00000012345678901234567',
      null,
      '+TEST()',
    ]);
    const project = createProject(
      'Project',
      makeId,
      '2026-11-25T12:00:00.000Z',
    );
    const indexed = synchronizeIndexes({ ...project, datasets: [dataset] });
    expect(
      (await importProject(await exportProject(indexed))).datasets,
    ).toEqual([dataset]);
  });

  it('supports headerless imports, empty header names and type overrides', () => {
    const sample = parseDelimited(encode(';Value\nentry;12,50'));
    expect(describeDelimited(sample, true, fallbackName).fields[0].name).toBe(
      'Column 1',
    );
    expect(
      describeDelimited(sample, false, fallbackName).fields.map(
        (field) => field.name,
      ),
    ).toEqual(['Column 1', 'Column 2']);
    const restored = createDelimitedDataset(sample, {
      title: 'Original',
      header: true,
      types: ['string', 'string'],
      fallbackName,
      makeId,
    });
    expect(restored.rows[0][restored.fields[1].id]).toBe('12,50');
    expect(() =>
      createDelimitedDataset(sample, {
        title: 'Invalid',
        header: true,
        types: ['number', 'number'],
        fallbackName,
        makeId,
      }),
    ).toThrow(expect.objectContaining({ code: 'value', row: 2, column: 1 }));
  });

  it('rejects header-only imports and oversized encoded datasets', () => {
    const options = { title: 'Data', header: true, fallbackName, makeId };
    expect(() =>
      createDelimitedDataset(parseDelimited(encode('Header')), options),
    ).toThrow(expect.objectContaining({ code: 'empty' }));
    // Escapes can make the native dataset substantially larger than the source file.
    const sample = parseDelimited(
      encode(`Header\n${`${'\u0001'.repeat(16000)}\n`.repeat(91)}`),
      ',',
    );
    expect(() => createDelimitedDataset(sample, options)).toThrow(
      expect.objectContaining({ code: 'limit' }),
    );
    expect(() =>
      createDelimitedDataset(sheet, { ...options, title: '  ' }),
    ).toThrow(DelimitedDataError);
  });
});
