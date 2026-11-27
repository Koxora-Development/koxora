import { describe, expect, it } from 'vitest';
import {
  createProject,
  DATA_CHART_FEATURE,
  DATA_CHART_KEY,
  exportProject,
  importProject,
  synchronizeIndexes,
  type Dataset,
  type Field,
  type Node,
} from '@koxora/project';
import {
  buildDataChart,
  chartFields,
  MAX_CHART_ROWS,
  readChartSettings,
  suggestChartType,
} from './data-charts';
import { applyEdit } from './editing';
import { buildScene, pickNode } from './scene';
import { StudioHistory } from './studio-history';

function field(name: string, type: Field['type']): Field {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    nullable: true,
    extensions: {},
  };
}

function fixture(categoryType: Field['type'] = 'string') {
  const category = field('Month', categoryType);
  const value = field('Orders', 'number');
  const dataset: Dataset = {
    id: crypto.randomUUID(),
    schemaVersion: '1.0.0',
    title: 'Monthly orders',
    fields: [category, value],
    rows: [],
    source: { type: 'csv' },
    extensions: {},
  };
  const node: Node = {
    id: crypto.randomUUID(),
    kind: 'data-chart',
    layerId: crypto.randomUUID(),
    geometry: { x: 0, y: 0, width: 600, height: 420, rotation: 0 },
    content: { text: 'Orders by month' },
    metadata: {},
    assetIds: [],
    dataBindings: [category, value].map(({ id }) => ({
      datasetId: dataset.id,
      fieldId: id,
    })),
    extensions: {
      [DATA_CHART_KEY]: { version: 1, type: 'line', palette: 'ocean' },
    },
  };
  return { dataset, category, value, node };
}

describe('chart field suggestions', () => {
  it('excludes JSON and lets a category and value use different numeric fields', () => {
    const { dataset, category, value } = fixture();
    const secondValue = field('Returns', 'number');
    const unsupported = field('Details', 'json');
    expect(chartFields({ ...dataset, fields: [unsupported, value] })).toEqual({
      categories: [],
      values: [],
    });
    expect(
      chartFields({ ...dataset, fields: [category, unsupported] }),
    ).toEqual({
      categories: [],
      values: [],
    });
    expect(chartFields(dataset)).toEqual({
      categories: [category],
      values: [value],
    });
    expect(
      chartFields({
        ...dataset,
        fields: [...dataset.fields, secondValue, unsupported],
      }),
    ).toEqual({
      categories: [category, value, secondValue],
      values: [value, secondValue],
    });
  });

  it.each([
    ['string', 'column'],
    ['boolean', 'column'],
    ['number', 'line'],
    ['date', 'line'],
  ] as const)('suggests %s categories use %s charts', (type, expected) => {
    expect(suggestChartType(field('Category', type))).toBe(expected);
  });
});

describe('chart data projection', () => {
  it('reads the explicit chart settings and returns fresh data from the referenced source', () => {
    const { dataset, node, category, value } = fixture();
    expect(readChartSettings(node)).toEqual({
      type: 'line',
      palette: 'ocean',
      datasetId: dataset.id,
      categoryFieldId: category.id,
      valueFieldId: value.id,
      title: 'Orders by month',
    });
    const row = Object.freeze({ [category.id]: 'March', [value.id]: -12 });
    dataset.rows = [
      row,
      { [category.id]: 'February', [value.id]: null },
      { [category.id]: null, [value.id]: 0 },
      { [category.id]: 'March', [value.id]: 25.5 },
    ];
    expect(buildDataChart(node, [dataset])).toEqual({
      type: 'line',
      palette: 'ocean',
      title: 'Orders by month',
      categoryLabel: 'Month',
      valueLabel: 'Orders',
      points: [
        { label: 'March', value: -12 },
        { label: 'February', value: null },
        { label: '', value: 0 },
        { label: 'March', value: 25.5 },
      ],
      rowCount: 4,
    });

    const later = {
      ...dataset,
      fields: [category, { ...value, name: 'Units sold' }],
      rows: [{ ...row, [value.id]: 13 }, ...dataset.rows.slice(1)],
    };
    const projected = buildDataChart(node, [later]);
    expect(projected?.valueLabel).toBe('Units sold');
    expect(projected?.points[0]).toEqual({ label: 'March', value: 13 });
    expect(row[value.id]).toBe(-12);
    expect(node.content.text).toBe('Orders by month');
  });

  it('preserves scalar category labels and never plots nonfinite values', () => {
    const { dataset, node, category, value } = fixture('boolean');
    dataset.rows = [
      { [category.id]: false, [value.id]: Infinity },
      { [category.id]: true, [value.id]: -Number.MAX_VALUE },
    ];
    expect(buildDataChart(node, [dataset])?.points).toEqual([
      { label: 'false', value: null },
      { label: 'true', value: -Number.MAX_VALUE },
    ]);
  });

  it('bounds plotted rows and category labels while exposing the source row count', () => {
    const { dataset, node, category, value } = fixture();
    dataset.rows = Array.from({ length: MAX_CHART_ROWS + 5 }, (_, index) => ({
      [category.id]: String(index).padEnd(400, '-'),
      [value.id]: index,
    }));
    const chart = buildDataChart(node, [dataset]);
    expect(chart?.rowCount).toBe(MAX_CHART_ROWS + 5);
    expect(chart?.points).toHaveLength(MAX_CHART_ROWS);
    expect(chart?.points[0].label).toMatch(/^0-+…$/);
    expect(chart?.points[0].label.length).toBeLessThan(400);
    expect(chart?.points.at(-1)?.value).toBe(MAX_CHART_ROWS - 1);
    expect(dataset.rows[0][category.id]).toBe('0'.padEnd(400, '-'));
    dataset.rows[0][category.id] = `${'a'.repeat(254)}🚀 ends the label`;
    expect(buildDataChart(node, [dataset])?.points[0].label).toBe(
      `${'a'.repeat(254)}…`,
    );
  });

  it('does not project missing or incompatible data bindings', () => {
    const { dataset, node, category, value } = fixture();
    expect(buildDataChart(node, [])).toBeNull();
    expect(
      buildDataChart(node, [{ ...dataset, fields: [category] }]),
    ).toBeNull();
    expect(
      buildDataChart(node, [
        { ...dataset, fields: [{ ...category, type: 'json' }, value] },
      ]),
    ).toBeNull();
    expect(
      buildDataChart(node, [
        { ...dataset, fields: [category, { ...value, type: 'string' }] },
      ]),
    ).toBeNull();
    expect(readChartSettings({ ...node, dataBindings: [] })).toBeNull();
    expect(readChartSettings({ ...node, content: {} })).toBeNull();
    expect(readChartSettings({ ...node, kind: 'rectangle' })).toBeNull();
  });
});

describe('chart editor commands', () => {
  const now = '2026-11-26T12:00:00.000Z';

  function editor() {
    const history = new StudioHistory();
    const workbook = createProject('Workbook', () => crypto.randomUUID(), now);
    const document = workbook.documents[0];
    const page = document.pages[0];
    const { dataset, node, category, value } = fixture();
    dataset.rows = [{ [category.id]: 'March', [value.id]: -2 }];
    const project = synchronizeIndexes({ ...workbook, datasets: [dataset] });
    const insert = {
      type: 'insertChart' as const,
      id: node.id,
      layerId: page.layers[0].id,
      position: { x: 240, y: 160 },
      settings: readChartSettings(node)!,
    };
    return { history, project, document, page, dataset, insert };
  }

  it('binds scene data, rebinds the same chart, and keeps both changes in history', async () => {
    const { history, project, document, page, dataset, insert } = editor();
    const later = fixture('date');
    later.dataset.rows = [
      { [later.category.id]: '2026-11-25', [later.value.id]: 8 },
    ];
    const base = await history.addDataset(project, later.dataset, now);
    const created = history.execute(base, document.id, page.id, insert, now);
    const chartPage = created.documents[0].pages[0];
    const scene = buildScene(chartPage, [], created.datasets);
    expect(created.manifest.requiredFeatures).toContain(DATA_CHART_FEATURE);
    expect(pickNode(scene, insert.position)).toMatchObject({
      id: insert.id,
      editable: true,
      chart: { points: [{ label: 'March', value: -2 }] },
    });
    expect(() => history.removeDataset(created, dataset.id, now)).toThrow(
      'references',
    );

    const settings = {
      ...readChartSettings(later.node)!,
      title: 'November sales',
      palette: 'warm' as const,
    };
    const edited = history.execute(
      created,
      document.id,
      page.id,
      { type: 'updateChart', id: insert.id, settings },
      now,
    );
    expect(edited.documents[0].pages[0].nodes[0].geometry).toEqual(
      chartPage.nodes[0].geometry,
    );
    const undoUpdate = history.travel(
      edited,
      document.id,
      page.id,
      'undo',
      now,
    );
    expect(
      readChartSettings(undoUpdate.documents[0].pages[0].nodes[0]),
    ).toEqual(insert.settings);
    const undoInsert = history.travel(
      undoUpdate,
      document.id,
      page.id,
      'undo',
      now,
    );
    expect(undoInsert.documents[0].pages[0].nodes).toEqual([]);
    const redoInsert = history.travel(
      undoInsert,
      document.id,
      page.id,
      'redo',
      now,
    );
    const redoUpdate = history.travel(
      redoInsert,
      document.id,
      page.id,
      'redo',
      now,
    );
    const withoutOldData = history.removeDataset(redoUpdate, dataset.id, now);
    const reopened = await importProject(await exportProject(withoutOldData));
    const reopenedPage = reopened.documents[0].pages[0];
    expect(readChartSettings(reopenedPage.nodes[0])).toEqual(settings);
    expect(
      buildScene(reopenedPage, [], reopened.datasets).nodes[0].chart,
    ).toMatchObject({
      title: 'November sales',
      palette: 'warm',
      points: [{ label: '2026-11-25', value: 8 }],
    });
    expect(base.documents[0].pages[0].nodes).toEqual([]);
  });

  it('keeps history atomic on rejection and preserves bindings when duplicating a chart', () => {
    const { history, project, document, page, insert } = editor();
    expect(() =>
      history.execute(
        project,
        document.id,
        page.id,
        {
          ...insert,
          settings: {
            ...insert.settings,
            categoryFieldId: insert.settings.valueFieldId,
          },
        },
        now,
      ),
    ).toThrow();
    expect(history.status()).toEqual({ undo: 0, redo: 0 });
    expect(project.documents[0].pages[0].nodes).toEqual([]);
    const created = history.execute(project, document.id, page.id, insert, now);
    const next = applyEdit(
      created,
      document.id,
      page.id,
      {
        type: 'duplicate',
        ids: [insert.id],
        idMap: { [insert.id]: crypto.randomUUID() },
        offset: { x: 480, y: 0 },
      },
      now,
    );
    const [original, copy] = next.documents[0].pages[0].nodes;
    expect(readChartSettings(copy)).toEqual(readChartSettings(original));
    expect(copy.geometry.x).toBe(original.geometry.x + 480);
  });
});
