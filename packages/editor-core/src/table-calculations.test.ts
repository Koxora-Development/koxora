import { describe, it, expect } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
  isTextRegions,
} from '@koxora/project';
import {
  evaluateTable,
  rewriteTableFormula,
  translateTableFormula,
  changeTableAxis,
  resizeTable,
  mergeTableCells,
  tableCellBoxes,
  textRegionAt,
  applyEdit,
  resolveAppearance,
  readTextRegions,
  TABLE_CALCULATION_FEATURE,
  StudioHistory,
  type TableTextRegions,
} from './index';
const table = (cells: string[][]): TableTextRegions => ({
  version: 1,
  type: 'table',
  headerRow: false,
  formulas: true,
  cells,
});
const result = (formula: string) =>
  evaluateTable(
    table([
      ['2', '3', formula],
      ['4', '6', ''],
    ]),
  )[0][2];
describe('bounded table formulas', () => {
  it.each([
    ['=A1+B1*2', '8'],
    ['=(A1+B1)*2', '10'],
    ['=-2^2', '-4'],
    ['=2^3^2', '512'],
    ['=50%*A1', '1'],
    ['=SUM(A1:B2)', '15'],
    ['=SUMME(A1:B2;1)', '16'],
    ['=AVERAGE(A1:B2)', '3.75'],
    ['=MITTELWERT(A1:B2)', '3.75'],
    ['=MIN(A1:B2)', '2'],
    ['=MAX(A1:B2)', '6'],
    ['=COUNT(A1:B2)', '4'],
    ['=ABS(-4)', '4'],
    ['=ROUND(-1.25,1)', '-1.3'],
    ['=IF(A1>1,"yes",1/0)', 'yes'],
    ['=WENN(A1<1;1/0;"no")', 'no'],
    ['=SUM(1e2,1E+2,1e-2)', '200.01'],
    ['=A1/0', '#DIV/0!'],
    ['=A99', '#REF!'],
    ['=C1', '#CYCLE!'],
    ['=SUM(A1:C1)', '#CYCLE!'],
    ['=HYPERLINK("https://example.com")', '#NAME?'],
    ['=globalThis.fetch(1)', '#ERROR!'],
    ['=1+', '#ERROR!'],
    ['=10^1000', '#NUM!'],
  ])('%s evaluates deterministically', (formula, expected) =>
    expect(result(formula)).toBe(expected),
  );
  it('recalculates dependencies, preserves literal equals text and exposes cycles', () => {
    const value = table([['2', '=A1*3', '=B1+1']]);
    expect(evaluateTable(value)[0]).toEqual(['2', '6', '7']);
    value.cells[0][0] = '4';
    expect(evaluateTable(value)[0][2]).toBe('13');
    value.cells[0][0] = '=C1';
    expect(evaluateTable(value)[0]).toEqual(['#CYCLE!', '#CYCLE!', '#CYCLE!']);
    expect(evaluateTable({ ...value, formulas: false })[0]).toEqual(
      value.cells[0],
    );
    expect(evaluateTable(table([["'=SUM(A1)"]]))[0][0]).toBe('=SUM(A1)');
  });
  it('bounds deeply nested and oversized expressions without executing code', () => {
    expect(result('=' + '('.repeat(90) + '1' + ')'.repeat(90))).toBe('#LIMIT!');
    expect(result('=' + '1+'.repeat(300) + '1')).toBe('#ERROR!');
  });
  it('preserves exponent literals, quoted references and absolute markers during structural edits', () => {
    expect(
      rewriteTableFormula('=SUM(1e2,1E+2,1e-2,A1,"A1")', 'row', 0, 1, 'insert'),
    ).toBe('=SUM(1e2,1E+2,1e-2,A2,"A1")');
    expect(rewriteTableFormula('=$A$1+B2', 'column', 0, 1, 'insert')).toBe(
      '=$B$1+C2',
    );
    expect(rewriteTableFormula('=SUM(A1:A3)', 'row', 1, 1, 'insert')).toBe(
      '=SUM(A1:A4)',
    );
    expect(rewriteTableFormula('=SUM(A1:A3)', 'row', 0, 1, 'delete')).toBe(
      '=SUM(A1:A2)',
    );
    expect(rewriteTableFormula('=A1', 'row', 0, 1, 'delete')).toBe('=#REF!');
    expect(rewriteTableFormula('=SUM(A1:A2)', 'row', 0, 2, 'delete')).toBe(
      '=SUM(#REF!)',
    );
  });
  it('copies relative references while respecting absolute row/column coordinates', () => {
    expect(translateTableFormula('=A1+$A1+A$1+$A$1+1e2', 1, 1)).toBe(
      '=B2+$A2+B$1+$A$1+1e2',
    );
    expect(translateTableFormula('=A1', -1, 0)).toBe('=#REF!');
  });
  it('retains formulas through insertion/deletion and refuses destructive formula merges', () => {
    const value = table([
      ['2', '3', '=SUM(A1:B1)'],
      ['4', '', ''],
    ]);
    const inserted = changeTableAxis(value, 'column', 0, 1, 'insert');
    expect(inserted.cells[0][3]).toBe('=SUM(B1:C1)');
    expect(evaluateTable(inserted)[0][3]).toBe('5');
    const deleted = changeTableAxis(value, 'column', 0, 1, 'delete');
    expect(deleted.cells[0][1]).toBe('=SUM(A1:A1)');
    expect(evaluateTable(deleted)[0][1]).toBe('3');
    expect(() =>
      mergeTableCells(value, { row: 0, column: 1, rowSpan: 1, columnSpan: 2 }),
    ).toThrow();
    expect(
      evaluateTable(resizeTable(table([['=A2'], ['4']]), 1, 1))[0][0],
    ).toBe('#REF!');
  });
});
describe('portable independent table sizes', () => {
  it('uses weighted cell geometry and hit testing, including merged cells and reflections', () => {
    const value = {
      ...table([
        ['A', 'B'],
        ['C', 'D'],
      ]),
      columnWidths: [100, 300],
      rowHeights: [100, 200],
    };
    expect(tableCellBoxes(value, 400, 300)[3].box).toEqual({
      x: 100,
      y: 100,
      width: 300,
      height: 200,
    });
    const node = {
      kind: 'table',
      textRegions: value,
      geometry: { x: 0, y: 0, width: 400, height: 300, rotation: 0 },
    };
    expect(textRegionAt(node, { x: 110, y: 110 })).toEqual({
      type: 'table-cell',
      row: 1,
      column: 1,
    });
    expect(
      textRegionAt(
        { ...node, geometry: { ...node.geometry, flipX: true } },
        { x: 390, y: 110 },
      ),
    ).toEqual({ type: 'table-cell', row: 1, column: 0 });
    const merged = mergeTableCells(value, {
      row: 0,
      column: 0,
      rowSpan: 1,
      columnSpan: 2,
    });
    expect(tableCellBoxes(merged, 400, 300)[0].box).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 100,
    });
  });
  it('preserves sizes through structural changes and rejects invalid metadata', () => {
    const value = {
      ...table([
        ['1', '2'],
        ['3', '4'],
      ]),
      columnWidths: [50, 150],
      rowHeights: [75, 125],
    };
    expect(
      changeTableAxis(value, 'column', 1, 1, 'insert').columnWidths,
    ).toEqual([50, 100, 150]);
    expect(changeTableAxis(value, 'row', 0, 1, 'delete').rowHeights).toEqual([
      125,
    ]);
    expect(resizeTable(value, 3, 1)).toMatchObject({
      columnWidths: [50],
      rowHeights: [75, 125, 100],
    });
    for (const columnWidths of [
      [0, 100],
      [NaN, 100],
      [10001, 1],
      [100],
      ['x', 100],
    ])
      expect(isTextRegions({ ...value, columnWidths }, 'table')).toBe(false);
  });
  it('requires a new compatibility gate and round trips through archives/history', async () => {
    const now = '2026-11-16T07:00:00.000Z';
    let project = createProject('Calculations', () => crypto.randomUUID(), now);
    const doc = project.documents[0],
      page = doc.pages[0],
      id = crypto.randomUUID();
    project = applyEdit(
      project,
      doc.id,
      page.id,
      {
        type: 'insert',
        id,
        kind: 'table',
        layerId: page.layers[0].id,
        position: { x: 0, y: 0 },
      },
      now,
    );
    const before = structuredClone(project.documents),
      history = new StudioHistory(),
      node = project.documents[0].pages[0].nodes[0];
    project = history.execute(
      project,
      doc.id,
      page.id,
      {
        type: 'updateNode',
        id,
        text: String(node.content.text),
        style: resolveAppearance(node),
        textRegions: {
          ...table([['2', '=A1*4']]),
          columnWidths: [80, 120],
          rowHeights: [100],
        },
      },
      now,
    );
    expect(project.manifest.requiredFeatures).toContain(
      TABLE_CALCULATION_FEATURE,
    );
    const reopened = await importProject(await exportProject(project));
    expect(reopened.documents).toEqual(project.documents);
    expect(
      evaluateTable(
        readTextRegions(
          reopened.documents[0].pages[0].nodes[0],
        ) as TableTextRegions,
      )[0][1],
    ).toBe('8');
    const invalid = structuredClone(project);
    invalid.manifest.requiredFeatures =
      invalid.manifest.requiredFeatures.filter(
        (f) => f !== TABLE_CALCULATION_FEATURE,
      );
    expect(() => validateProject(invalid)).toThrow();
    const undone = history.travel(project, doc.id, page.id, 'undo', now);
    expect(undone.documents).toEqual(before);
    expect(undone.manifest.requiredFeatures).toContain(
      TABLE_CALCULATION_FEATURE,
    );
    expect(
      history.travel(undone, doc.id, page.id, 'redo', now).documents,
    ).toEqual(project.documents);
  });
});

it('does not move a formula to a different merged anchor or resurrect invalid copy references', () => {
  expect(() =>
    mergeTableCells(table([['', '=A1+1']]), {
      row: 0,
      column: 0,
      rowSpan: 1,
      columnSpan: 2,
    }),
  ).toThrow();
  expect(translateTableFormula('=M1', 0, -11)).toBe('=#REF!');
});

it('propagates intermediate numeric overflow and invalid copied ranges', () => {
  expect(result('=IF(10^1000,1,0)')).toBe('#NUM!');
  expect(translateTableFormula('=SUM(A1:A3)', -1, 0)).toBe('=SUM(#REF!)');
  expect(result('=SUM(#REF!)')).toBe('#REF!');
});
