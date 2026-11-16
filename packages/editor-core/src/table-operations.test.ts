import { describe, it, expect } from 'vitest';
import {
  changeTableAxis,
  formatTableSelection,
  pasteTableText,
  copyTableText,
  mergeTableCells,
  tableCellRichText,
  isTextRegions,
  type TableTextRegions,
} from './index';
const table = (): TableTextRegions => ({
  version: 1,
  type: 'table',
  headerRow: true,
  cells: [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
    ['G', 'H', 'I'],
  ],
});
describe('table structure and clipboard', () => {
  it('inserts at any row/column boundary without moving content into the wrong cells', () => {
    for (const axis of ['row', 'column'] as const)
      for (let i = 0; i <= 3; i++) {
        const value = table();
        const inserted = changeTableAxis(value, axis, i, 1, 'insert');
        expect(isTextRegions(inserted, 'table')).toBe(true);
        expect(changeTableAxis(inserted, axis, i, 1, 'delete')).toEqual(value);
        expect(value).toEqual(table());
      }
  });
  it('extends a crossed merge and preserves formatted contents when its anchor is removed', () => {
    let value = mergeTableCells(table(), {
      row: 0,
      column: 0,
      rowSpan: 2,
      columnSpan: 2,
    });
    value = formatTableSelection(
      value,
      { row: 0, column: 0, rowSpan: 1, columnSpan: 1 },
      { fontWeight: 700 },
    );
    const rich = tableCellRichText(value, 0, 0);
    const grown = changeTableAxis(value, 'row', 1, 1, 'insert');
    expect(grown.merges?.[0]).toMatchObject({ rowSpan: 3, columnSpan: 2 });
    const shrunk = changeTableAxis(grown, 'row', 0, 1, 'delete');
    expect(tableCellRichText(shrunk, 0, 0)).toEqual(rich);
    expect(shrunk.cells[0][1]).toBe('');
    const narrow = changeTableAxis(shrunk, 'column', 0, 1, 'delete');
    expect(tableCellRichText(narrow, 0, 0)).toEqual(rich);
    expect(isTextRegions(narrow, 'table')).toBe(true);
  });
  it('clips and removes merges across every valid deletion range', () => {
    const value = mergeTableCells(table(), {
      row: 0,
      column: 0,
      rowSpan: 2,
      columnSpan: 2,
    });
    for (const axis of ['row', 'column'] as const)
      for (let index = 0; index < 3; index++)
        for (let count = 1; count <= Math.min(2, 3 - index); count++) {
          const next = changeTableAxis(value, axis, index, count, 'delete');
          expect(isTextRegions(next, 'table')).toBe(true);
        }
  });
  it('rejects invalid/oversized changes and never mutates the input', () => {
    const value = table();
    for (const [index, count] of [
      [-1, 1],
      [0, 0],
      [0, NaN],
      [4, 1],
      [0, 30],
    ])
      expect(() =>
        changeTableAxis(value, 'row', index, count, 'insert'),
      ).toThrow();
    expect(() => changeTableAxis(value, 'row', 0, 3, 'delete')).toThrow();
    expect(() => pasteTableText(value, 0, 0, 'x'.repeat(1025))).toThrow();
    expect(value).toEqual(table());
  });
  it('pastes TSV atomically, grows at trailing edges and refuses overlapping merges', () => {
    const value = table();
    const next = pasteTableText(value, 2, 2, 'Hello\tWorld\r\nOne\tTwo\r\n');
    expect(next.cells).toEqual([
      ['A', 'B', 'C', ''],
      ['D', 'E', 'F', ''],
      ['G', 'H', 'Hello', 'World'],
      ['', '', 'One', 'Two'],
    ]);
    expect(tableCellRichText(next, 3, 3).paragraphs[0].runs[0].text).toBe(
      'Two',
    );
    const merged = mergeTableCells(value, {
      row: 0,
      column: 0,
      rowSpan: 2,
      columnSpan: 2,
    });
    expect(() => pasteTableText(merged, 0, 0, 'One\tTwo')).toThrow();
    expect(pasteTableText(merged, 1, 1, 'Replacement').cells[0][0]).toBe(
      'Replacement',
    );
    expect(value).toEqual(table());
  });
  it('formats whole merged ranges and preserves unrelated/unknown data', () => {
    const value = { ...table(), future: { keep: true } };
    const next = formatTableSelection(
      value,
      { row: 0, column: 0, rowSpan: 2, columnSpan: 2 },
      { align: 'left', fontWeight: 700 },
    );
    expect(tableCellRichText(next, 1, 1).paragraphs[0]).toMatchObject({
      align: 'left',
      runs: [{ text: 'E', style: { fontWeight: 700 } }],
    });
    expect(next.cells).toEqual(value.cells);
    expect(
      (changeTableAxis(next, 'column', 1, 1, 'insert') as typeof value).future,
    ).toEqual({ keep: true });
  });
});

it('round trips quoted multiline/tab/quote cells without shifting data', () => {
  const value = table();
  value.cells[0] = ['Line 1\nLine 2', 'A\tB', 'Say "hello"'];
  const tsv = copyTableText(value, {
    row: 0,
    column: 0,
    rowSpan: 3,
    columnSpan: 3,
  });
  expect(pasteTableText(table(), 0, 0, tsv).cells).toEqual(value.cells);
  expect(() => pasteTableText(table(), 0, 0, '"unterminated')).toThrow();
  expect(() => pasteTableText(table(), 0, 0, '"closed"unexpected')).toThrow();
});

it('keeps new shape labels inside their silhouettes at palette and canvas dimensions', async () => {
  const { shapeKinds, shapeRegistry } = await import('./shapes');
  for (const kind of shapeKinds.slice(22)) {
    const definition = shapeRegistry[kind];
    for (const [w, h] of [
      [26, 22],
      [160, 120],
      [320, 240],
    ]) {
      const box = definition.labelBox!(w, h);
      for (const x of [box.x, box.x + box.width])
        for (const y of [box.y, box.y + box.height])
          expect(
            definition.contains({ x, y }, w, h, 16),
            `${kind} label corner`,
          ).toBe(true);
    }
  }
});

it('accepts Windows Office multiline quoted cells with normalized rich projections', () => {
  const next = pasteTableText(table(), 0, 0, '"A\r\nB"\tC\r\nD\tE');
  expect(next.cells[0].slice(0, 2)).toEqual(['A\nB', 'C']);
  expect(next.cells[1].slice(0, 2)).toEqual(['D', 'E']);
  expect(isTextRegions(next, 'table')).toBe(true);
});

it('preserves the final blank row and column during clipboard exchange', () => {
  const value: TableTextRegions = {
    version: 1,
    type: 'table',
    headerRow: false,
    cells: [['A'], ['']],
  };
  const target: TableTextRegions = { ...value, cells: [['X'], ['Y']] };
  expect(
    pasteTableText(
      target,
      0,
      0,
      copyTableText(value, { row: 0, column: 0, rowSpan: 2, columnSpan: 1 }),
    ).cells,
  ).toEqual(value.cells);
});
