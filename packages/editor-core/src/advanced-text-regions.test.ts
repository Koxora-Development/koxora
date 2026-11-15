import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
  TEXT_FONT_KEYS,
} from '@koxora/project';
import {
  ADVANCED_TEXT_REGIONS_FEATURE,
  applyEdit,
  FONT_FAMILIES,
  fromPlainText,
  isTextRegions,
  MAX_TABLE_CELL_TEXT,
  mergeTableCells,
  normalizeTableSelection,
  plainText,
  readRichText,
  readTextRegions,
  regionRichText,
  resizeTable,
  resolveAppearance,
  setRegionRichText,
  splitTableCell,
  StudioHistory,
  tableCellAnchor,
  tableCellRichText,
  TEXT_REGIONS_KEY,
  type EditCommand,
  type RichText,
  type TableTextRegions,
} from './index';

const now = '2026-11-14T19:00:00.000Z';
const id = () => crypto.randomUUID();
function table(): TableTextRegions {
  return {
    version: 1,
    type: 'table',
    cells: [
      ['Heading', 'Other heading', 'Third'],
      ['First', 'Second', 'Last'],
      ['', '', ''],
    ],
    headerRow: true,
  };
}
function styled(text: string): RichText {
  const value = fromPlainText(text, 'left');
  if (text)
    value.paragraphs[0].runs[0].style = {
      fontFamily: 'georgia',
      fontWeight: 700,
      fontStyle: 'italic',
      textColor: '#ff0000',
    };
  return value;
}
function fixture(kind: 'table' | 'container' = 'table') {
  let project = createProject('Advanced text regions', id, now);
  const doc = project.documents[0],
    page = doc.pages[0],
    nodeId = id();
  const run = (command: EditCommand) =>
    (project = applyEdit(project, doc.id, page.id, command, now));
  run({
    type: 'insert',
    id: nodeId,
    layerId: page.layers[0].id,
    kind,
    position: { x: 0, y: 0 },
    text: kind === 'container' ? 'Original body' : '',
  });
  return {
    get project() {
      return project;
    },
    get node() {
      return project.documents[0].pages[0].nodes[0];
    },
    docId: doc.id,
    pageId: page.id,
    nodeId,
    run,
  };
}

describe('advanced portable text regions', () => {
  it('uses the same trusted font IDs in project validation and rendering', () => {
    expect([...TEXT_FONT_KEYS]).toEqual(Object.keys(FONT_FAMILIES));
  });

  it('edits a title without changing the body or its formatting and guards older readers', async () => {
    const f = fixture('container');
    f.run({ type: 'richText', id: f.nodeId, value: styled('Original body') });
    const beforeBody = structuredClone(f.node);
    const title = styled('Formatted title 世界');
    f.run({
      type: 'regionText',
      id: f.nodeId,
      target: { type: 'container-title' },
      value: title,
    });
    expect(readRichText(f.node)).toEqual(readRichText(beforeBody));
    expect(f.node.content).toEqual(beforeBody.content);
    expect(regionRichText(f.node, { type: 'container-title' })).toEqual(title);
    expect(f.project.manifest.requiredFeatures).toContain(
      ADVANCED_TEXT_REGIONS_FEATURE,
    );
    const opened = await importProject(await exportProject(f.project));
    expect(opened.documents).toEqual(f.project.documents);
    const missingFeature = structuredClone(f.project);
    missingFeature.manifest.requiredFeatures =
      missingFeature.manifest.requiredFeatures.filter(
        (key) => key !== ADVANCED_TEXT_REGIONS_FEATURE,
      );
    expect(() => validateProject(missingFeature)).toThrow();
    title.paragraphs[0].runs[0].text = 'Changed outside command';
    expect(readTextRegions(f.node)).toMatchObject({
      title: 'Formatted title 世界',
    });
  });

  it('uses the original body extension for direct body editing', () => {
    const f = fixture('container');
    f.run({
      type: 'regionText',
      id: f.nodeId,
      target: { type: 'container-body' },
      value: styled('Body replacement'),
    });
    expect(f.node.content.text).toBe('Body replacement');
    expect(readTextRegions(f.node)).toMatchObject({ title: '' });
    expect(readRichText(f.node)).toEqual(styled('Body replacement'));
    expect(f.project.manifest.requiredFeatures).not.toContain(
      ADVANCED_TEXT_REGIONS_FEATURE,
    );
  });

  it('combines cell paragraphs in reading order without discarding individual run styles', () => {
    let source = setRegionRichText(
      table(),
      { type: 'table-cell', row: 0, column: 0 },
      styled('Heading'),
    );
    source = setRegionRichText(
      source,
      { type: 'table-cell', row: 1, column: 1 },
      styled('Second'),
    );
    const original = structuredClone(source);
    const merged = mergeTableCells(source, {
      row: 0,
      column: 0,
      rowSpan: 2,
      columnSpan: 2,
    });
    expect(source).toEqual(original);
    expect(merged.cells).toEqual([
      ['Heading\nOther heading\nFirst\nSecond', '', 'Third'],
      ['', '', 'Last'],
      ['', '', ''],
    ]);
    const rich = tableCellRichText(merged, 1, 1);
    expect(rich.paragraphs[0].runs[0].style).toEqual(
      styled('Heading').paragraphs[0].runs[0].style,
    );
    expect(rich.paragraphs[3].runs[0].style).toEqual(
      styled('Second').paragraphs[0].runs[0].style,
    );
    expect(plainText(rich)).toBe(merged.cells[0][0]);
    expect(merged.cellRichText?.[0][1]).toBeNull();
    expect(merged.cellRichText?.[1][0]).toBeNull();
    expect(merged.cellRichText?.[1][1]).toBeNull();
    expect(isTextRegions(merged, 'table')).toBe(true);
  });

  it.each(['left', 'right'] as const)(
    'preserves inherited %s alignment for plain and empty merged cells without replacing explicit paragraph alignment',
    (align) => {
      const source = setRegionRichText(
        table(),
        { type: 'table-cell', row: 1, column: 1 },
        styled('Second'),
      );
      source.cellRichText![1][1]!.paragraphs[0].align = 'center';
      const before = structuredClone(source);
      const merged = mergeTableCells(
        source,
        { row: 1, column: 0, rowSpan: 1, columnSpan: 3 },
        align,
      );
      const rich = tableCellRichText(merged, 1, 0);
      expect(rich.paragraphs.map((paragraph) => paragraph.align)).toEqual([
        align,
        'center',
        align,
      ]);
      expect(rich.paragraphs[1].runs[0].style).toEqual(
        source.cellRichText![1][1]!.paragraphs[0].runs[0].style,
      );
      expect(plainText(rich)).toBe('First\nSecond\nLast');
      expect(source).toEqual(before);
      const empty = mergeTableCells(
        table(),
        { row: 2, column: 0, rowSpan: 1, columnSpan: 2 },
        align,
      );
      expect(tableCellRichText(empty, 2, 0).paragraphs).toEqual([
        { align, runs: [] },
      ]);
    },
  );

  it('expands selections to whole overlapping merges and resolves covered coordinates', () => {
    const first = mergeTableCells(table(), {
      row: 0,
      column: 0,
      rowSpan: 1,
      columnSpan: 2,
    });
    const normalized = normalizeTableSelection(first, {
      row: 0,
      column: 1,
      rowSpan: 2,
      columnSpan: 2,
    });
    expect(normalized).toEqual({
      row: 0,
      column: 0,
      rowSpan: 2,
      columnSpan: 3,
    });
    expect(tableCellAnchor(first, 0, 1)).toEqual({ row: 0, column: 0 });
    const all = mergeTableCells(first, normalized);
    expect(all.merges).toEqual([normalized]);
    expect(all.cells[0][0]).toBe(
      'Heading\nOther heading\nThird\nFirst\nSecond\nLast',
    );
  });

  it('splits a covered coordinate while retaining all combined content in the anchor', () => {
    const merged = mergeTableCells(table(), {
      row: 1,
      column: 0,
      rowSpan: 1,
      columnSpan: 2,
    });
    const split = splitTableCell(merged, 1, 1);
    expect(split.merges).toEqual([]);
    expect(split.cells[1]).toEqual(['First\nSecond', '', 'Last']);
    expect(split.cellRichText?.[1][0]).toEqual(merged.cellRichText?.[1][0]);
    expect(merged.merges).toHaveLength(1);
  });

  it('clips crossing spans at resized boundaries and preserves surviving rich data', () => {
    const merged = mergeTableCells(table(), {
      row: 0,
      column: 0,
      rowSpan: 2,
      columnSpan: 2,
    });
    const smaller = resizeTable(merged, 1, 2);
    expect(smaller.merges).toEqual([
      { row: 0, column: 0, rowSpan: 1, columnSpan: 2 },
    ]);
    expect(smaller.cells[0][0]).toBe(merged.cells[0][0]);
    expect(resizeTable(smaller, 1, 1).merges).toEqual([]);
    const grown = resizeTable(smaller, 4, 4);
    expect(grown.cells[3][3]).toBe('');
    expect(grown.cellRichText?.[3][3]).toBeNull();
    expect(grown.cellRichText?.[0][0]).toEqual(smaller.cellRichText?.[0][0]);
    grown.cellRichText![0][0]!.paragraphs[0].runs[0].text = 'New';
    expect(plainText(smaller.cellRichText![0][0]!)).toBe(merged.cells[0][0]);
    expect(() => resizeTable(table(), 0, 2)).toThrow(RangeError);
    expect(() => resizeTable(table(), 2, 13)).toThrow(RangeError);
  });

  it('rejects overflowing merges without partially changing the original cells', () => {
    const source = table();
    source.cells[0][0] = 'A'.repeat(MAX_TABLE_CELL_TEXT);
    source.cells[0][1] = 'B';
    const before = structuredClone(source);
    expect(() =>
      mergeTableCells(source, {
        row: 0,
        column: 0,
        rowSpan: 1,
        columnSpan: 2,
      }),
    ).toThrow(RangeError);
    expect(source).toEqual(before);
  });

  it('rejects malformed rich projections, overlaps, hidden values and unsafe rich styles', () => {
    const valid = mergeTableCells(table(), {
      row: 0,
      column: 0,
      rowSpan: 1,
      columnSpan: 2,
    });
    for (const mutate of [
      (value: TableTextRegions) => {
        value.cells[0][1] = 'Hidden';
      },
      (value: TableTextRegions) => {
        value.cellRichText![0][1] = fromPlainText('');
      },
      (value: TableTextRegions) => {
        value.cellRichText![0][0]!.paragraphs[0].runs[0].text = 'Mismatch';
      },
      (value: TableTextRegions) => {
        value.cellRichText![0][0]!.paragraphs[0].runs[0].style.textColor =
          'url(https://example.test/unsafe)';
      },
      (value: TableTextRegions) => {
        value.cellRichText!.pop();
      },
      (value: TableTextRegions) => {
        value.merges!.push({ row: 0, column: 1, rowSpan: 2, columnSpan: 1 });
      },
      (value: TableTextRegions) => {
        value.merges![0].rowSpan = 0;
      },
      (value: TableTextRegions) => {
        value.merges![0].columnSpan = 99;
      },
    ]) {
      const invalid = structuredClone(valid);
      mutate(invalid);
      expect(isTextRegions(invalid, 'table')).toBe(false);
    }
  });

  it('keeps rich cell edits, merge transactions and history portable and atomic', async () => {
    const f = fixture();
    f.run({
      type: 'regionText',
      id: f.nodeId,
      target: { type: 'table-cell', row: 0, column: 0 },
      value: styled('First cell'),
    });
    f.run({
      type: 'regionText',
      id: f.nodeId,
      target: { type: 'table-cell', row: 0, column: 1 },
      value: styled('Second cell'),
    });
    const regions = readTextRegions(f.node) as TableTextRegions;
    const history = new StudioHistory();
    const before = structuredClone(f.project.documents);
    let project = history.execute(
      f.project,
      f.docId,
      f.pageId,
      {
        type: 'updateNode',
        id: f.nodeId,
        text: String(f.node.content.text),
        style: resolveAppearance(f.node),
        textRegions: mergeTableCells(regions, {
          row: 0,
          column: 0,
          rowSpan: 1,
          columnSpan: 2,
        }),
      },
      now,
    );
    expect(history.status().undo).toBe(1);
    const merged = structuredClone(project.documents);
    project = history.travel(project, f.docId, f.pageId, 'undo', now);
    expect(project.documents).toEqual(before);
    expect(project.manifest.requiredFeatures).toContain(
      ADVANCED_TEXT_REGIONS_FEATURE,
    );
    project = history.travel(project, f.docId, f.pageId, 'redo', now);
    expect(project.documents).toEqual(merged);
    project = applyEdit(
      project,
      f.docId,
      f.pageId,
      {
        type: 'regionText',
        id: f.nodeId,
        target: { type: 'table-cell', row: 0, column: 1 },
        value: styled('Edit through covered coordinate'),
      },
      now,
    );
    const finalNode = project.documents[0].pages[0].nodes[0];
    expect(
      regionRichText(finalNode, { type: 'table-cell', row: 0, column: 0 }),
    ).toEqual(styled('Edit through covered coordinate'));
    expect(finalNode.content.text).toBe('Edit through covered coordinate');
    expect(
      (await importProject(await exportProject(project))).documents,
    ).toEqual(project.documents);
  });

  it('applies explicit whole-element formatting to existing title and cell spans', () => {
    for (const kind of ['container', 'table'] as const) {
      const f = fixture(kind);
      const target =
        kind === 'container'
          ? ({ type: 'container-title' } as const)
          : ({ type: 'table-cell', row: 0, column: 0 } as const);
      f.run({
        type: 'regionText',
        id: f.nodeId,
        target,
        value: styled('Styled'),
      });
      f.run({
        type: 'format',
        ids: [f.nodeId],
        patch: { textColor: '#00ff00', fontStyle: 'normal', align: 'right' },
      });
      const rich = regionRichText(f.node, target);
      expect(rich.paragraphs[0].align).toBe('right');
      expect(rich.paragraphs[0].runs[0].style).toMatchObject({
        fontFamily: 'georgia',
        fontWeight: 700,
        textColor: '#00ff00',
        fontStyle: 'normal',
      });
    }
  });

  it('preserves optional sibling data through draft operations and direct edits', () => {
    const f = fixture();
    const payload = f.node.extensions[TEXT_REGIONS_KEY] as Record<
      string,
      unknown
    >;
    payload['org.example.extra'] = { inert: ['keep', 42] };
    f.run({
      type: 'regionText',
      id: f.nodeId,
      target: { type: 'table-cell', row: 0, column: 0 },
      value: styled('Edited'),
    });
    const regions = readTextRegions(f.node) as TableTextRegions;
    const result = splitTableCell(
      resizeTable(
        mergeTableCells(regions, {
          row: 0,
          column: 0,
          rowSpan: 1,
          columnSpan: 2,
        }),
        4,
        4,
      ),
      0,
      1,
    );
    expect(
      (result as TableTextRegions & Record<string, unknown>)[
        'org.example.extra'
      ],
    ).toEqual({ inert: ['keep', 42] });
  });

  it('keeps future payload versions opaque even when they use an advanced field name', async () => {
    const f = fixture();
    f.node.extensions[TEXT_REGIONS_KEY] = {
      version: 2,
      type: 'table',
      merges: ['future representation'],
    };
    validateProject(f.project);
    const opened = await importProject(await exportProject(f.project));
    expect(opened.documents).toEqual(f.project.documents);
    expect(readTextRegions(f.node)).toBeNull();
  });

  it('rejects protected or invalid direct cell edits without changing any stored data', () => {
    const f = fixture();
    const before = structuredClone(f.project);
    for (const target of [
      { type: 'table-cell', row: -1, column: 0 } as const,
      { type: 'table-cell', row: 0, column: 99 } as const,
      { type: 'container-title' } as const,
      { type: 'container-body' } as const,
    ])
      expect(() =>
        f.run({
          type: 'regionText',
          id: f.nodeId,
          target,
          value: styled('Invalid'),
        }),
      ).toThrow('invalid');
    expect(f.project).toEqual(before);
    f.project.documents[0].pages[0].layers[0].locked = true;
    expect(() =>
      f.run({
        type: 'regionText',
        id: f.nodeId,
        target: { type: 'table-cell', row: 0, column: 0 },
        value: styled('Locked'),
      }),
    ).toThrow('layer');
  });
});
