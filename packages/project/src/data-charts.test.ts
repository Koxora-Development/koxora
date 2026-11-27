import { expect, it } from 'vitest';
import {
  chartProfileVersion,
  createProject,
  DATA_CHART_FEATURE,
  DATA_CHART_KEY,
  DATA_CHART_TYPES_FEATURE,
  exportProject,
  importProject,
  readChartBindings,
  readChartConfig,
  synchronizeIndexes,
  validateProject,
  withDataChartFeature,
  type Json,
  type Node,
} from './index';

function chartFixture() {
  let sequence = 0;
  const id = () =>
    `00000000-0000-4000-8000-${(++sequence).toString().padStart(12, '0')}`;
  const now = '2026-11-26T00:00:00.000Z';
  const project = createProject('Studio charts', id, now);
  const datasetId = id();
  const categoryFieldId = id();
  const valueFieldId = id();
  const dataset = {
    id: datasetId,
    schemaVersion: '1.0.0',
    title: 'Survey results',
    fields: [
      {
        id: categoryFieldId,
        name: 'Category',
        type: 'string' as const,
        nullable: false,
        extensions: {},
      },
      {
        id: valueFieldId,
        name: 'Count',
        type: 'number' as const,
        nullable: false,
        extensions: {},
      },
    ],
    rows: [{ [categoryFieldId]: 'Ärzteteam', [valueFieldId]: 37 }],
    source: { kind: 'embedded' },
    extensions: {},
  };
  const page = project.documents[0].pages[0];
  const chart: Node = {
    id: id(),
    kind: 'data-chart',
    layerId: page.layers[0].id,
    geometry: { x: 10, y: 20, width: 460, height: 300, rotation: 0 },
    content: { text: 'Teilnahme' },
    metadata: {},
    assetIds: [],
    dataBindings: [
      { datasetId, fieldId: categoryFieldId },
      { datasetId, fieldId: valueFieldId },
    ],
    extensions: {
      [DATA_CHART_KEY]: { version: 1, type: 'column', palette: 'warm' },
      'org.example.chart': { keep: ['perspective', 1] },
    },
  };
  page.nodes.push(chart);
  project.datasets.push(dataset);
  return { project, chart, datasetId, categoryFieldId, valueFieldId, id, now };
}

it.each(['column', 'line'] as const)(
  'preserves v1 %s charts and their live bindings in an archive',
  async (type) => {
    const { project, chart, datasetId, categoryFieldId, valueFieldId } =
      chartFixture();
    expect(chartProfileVersion(type)).toBe(1);
    chart.extensions[DATA_CHART_KEY] = { version: 1, type, palette: 'warm' };
    await expect(
      exportProject(synchronizeIndexes(project)),
    ).rejects.toMatchObject({ code: 'invalid', reason: 'feature' });

    const marked = withDataChartFeature(project);
    expect(marked.manifest.requiredFeatures).toContain(DATA_CHART_FEATURE);
    expect(marked.manifest.requiredFeatures).not.toContain(
      DATA_CHART_TYPES_FEATURE,
    );
    expect(project.manifest.requiredFeatures).not.toContain(DATA_CHART_FEATURE);
    expect(withDataChartFeature(marked)).toBe(marked);
    const archive = await exportProject(synchronizeIndexes(marked));
    const reopened = await importProject(archive);
    const reopenedChart = reopened.documents[0].pages[0].nodes[0];
    expect(reopenedChart).toEqual(chart);
    expect(readChartBindings(reopenedChart)).toEqual({
      datasetId,
      categoryFieldId,
      valueFieldId,
    });
    expect(readChartConfig(reopenedChart)).toEqual({
      type,
      palette: 'warm',
    });
    expect(reopened.datasets).toEqual(project.datasets);
    expect(await exportProject(reopened)).toEqual(archive);
  },
);

function moveChartToTemplate({
  project,
  id,
  now,
}: ReturnType<typeof chartFixture>) {
  const [document] = project.documents;
  project.documents = createProject('Empty', id, now).documents;
  expect(withDataChartFeature(project)).toBe(project);
  project.templates.push({
    id: id(),
    schemaVersion: '1.0.0',
    title: 'Chart template',
    document,
    extensions: {},
  });
}

it.each([
  ['area', 'document'],
  ['pie', 'template'],
] as const)(
  'requires both features for a v2 %s chart in a %s',
  async (type, location) => {
    const fixture = chartFixture();
    const { project, chart } = fixture;
    if (location === 'template') moveChartToTemplate(fixture);
    const v1 = withDataChartFeature(project);
    expect(chartProfileVersion(type)).toBe(2);
    chart.extensions[DATA_CHART_KEY] = {
      version: 2,
      type,
      palette: 'ocean',
      extra: { keep: true },
    };

    await expect(exportProject(synchronizeIndexes(v1))).rejects.toMatchObject({
      code: 'invalid',
      reason: 'feature',
    });
    const marked = withDataChartFeature(v1);
    expect(marked.manifest).toEqual(withDataChartFeature(project).manifest);
    expect(marked.manifest.requiredFeatures).toEqual(
      expect.arrayContaining([DATA_CHART_FEATURE, DATA_CHART_TYPES_FEATURE]),
    );
    expect(withDataChartFeature(marked)).toBe(marked);
    const archive = await exportProject(synchronizeIndexes(marked));
    const reopened = await importProject(archive);
    const document =
      location === 'template'
        ? reopened.templates[0].document
        : reopened.documents[0];
    const reopenedChart = document.pages[0].nodes[0];
    expect(reopenedChart).toEqual(chart);
    expect(readChartConfig(reopenedChart)).toEqual({ type, palette: 'ocean' });
    expect(await exportProject(reopened)).toEqual(archive);
  },
);

it.each<[string, Json]>([
  ['bare v2', { version: 2, axes: ['future'] }],
  ['v2 column', { version: 2, type: 'column', palette: 'warm' }],
  ['v2 line', { version: 2, type: 'line', palette: 'warm' }],
  ['unrecognized v2', { version: 2, type: 'future', palette: 'warm' }],
  ['v3 area', { version: 3, type: 'area', palette: 'warm', axes: ['future'] }],
])('keeps template-only %s chart profiles opaque', async (_name, profile) => {
  const fixture = chartFixture();
  const { project, chart } = fixture;
  moveChartToTemplate(fixture);
  chart.extensions[DATA_CHART_KEY] = profile;
  chart.dataBindings = [];
  chart.content = { title: { text: 'Future' } };
  const marked = withDataChartFeature(project);
  expect(marked.manifest.requiredFeatures).toContain(DATA_CHART_FEATURE);
  expect(marked.manifest.requiredFeatures).not.toContain(
    DATA_CHART_TYPES_FEATURE,
  );
  const archive = await exportProject(synchronizeIndexes(marked));
  const reopened = await importProject(archive);
  const reopenedChart = reopened.templates[0].document.pages[0].nodes[0];
  expect(readChartConfig(reopenedChart)).toBeNull();
  expect(reopenedChart).toEqual(chart);
  expect(await exportProject(reopened)).toEqual(archive);
});

it('preserves an opaque v2 chart beside a supported v2 chart', async () => {
  const { project, chart, id } = chartFixture();
  chart.extensions[DATA_CHART_KEY] = {
    version: 2,
    type: 'area',
    palette: 'warm',
  };
  const opaque: Node = {
    ...chart,
    id: id(),
    content: { title: { text: 'Future' } },
    dataBindings: [],
    extensions: {
      ...chart.extensions,
      [DATA_CHART_KEY]: { version: 2, axes: ['future'] },
    },
  };
  project.documents[0].pages[0].nodes.push(opaque);
  const marked = withDataChartFeature(project);
  expect(marked.manifest.requiredFeatures).toContain(DATA_CHART_TYPES_FEATURE);
  const archive = await exportProject(synchronizeIndexes(marked));
  const reopened = await importProject(archive);
  const nodes = reopened.documents[0].pages[0].nodes;
  expect(nodes).toEqual([chart, opaque]);
  expect(nodes.map(readChartConfig)).toEqual([
    { type: 'area', palette: 'warm' },
    null,
  ]);
  expect(await exportProject(reopened)).toEqual(archive);
});

it.each([
  [1, 'area', 'studio'],
  [1, 'pie', 'studio'],
  [2, 'area', 'unrecognized'],
  [2, 'pie', 'unrecognized'],
] as const)(
  'rejects unsupported v%s chart configuration %s with palette %s',
  (version, type, palette) => {
    const { project, chart } = chartFixture();
    chart.extensions[DATA_CHART_KEY] = { version, type, palette };
    expect(readChartConfig(chart)).toBeNull();
    expect(() =>
      validateProject(synchronizeIndexes(withDataChartFeature(project))),
    ).toThrow(
      expect.objectContaining({ code: 'invalid', reason: 'chartConfig' }),
    );
  },
);

it.each<[string, (fixture: ReturnType<typeof chartFixture>) => void]>([
  ['chartBindings', ({ chart }) => chart.dataBindings.pop()],
  [
    'chartBindings',
    ({ chart }) => (chart.dataBindings[1] = { ...chart.dataBindings[0] }),
  ],
  [
    'chartBindings',
    ({ chart, id, project }) => {
      const dataset = structuredClone(project.datasets[0]);
      dataset.id = id();
      dataset.fields = dataset.fields.map((field) => ({ ...field, id: id() }));
      dataset.rows = [];
      project.datasets.push(dataset);
      chart.dataBindings[1] = {
        datasetId: dataset.id,
        fieldId: dataset.fields[1].id,
      };
    },
  ],
  [
    'datasetReference',
    ({ chart, id }) => (chart.dataBindings[1].fieldId = id()),
  ],
  ['chartValueField', ({ chart }) => chart.dataBindings.reverse()],
  [
    'chartCategoryField',
    ({ project }) => (project.datasets[0].fields[0].type = 'json'),
  ],
  [
    'chartConfig',
    ({ chart }) => {
      chart.extensions[DATA_CHART_KEY] = {
        version: 1,
        type: 'column',
        palette: 'unrecognized',
      };
    },
  ],
])('rejects malformed v1 charts with %s', (reason, change) => {
  const fixture = chartFixture();
  change(fixture);
  expect(() =>
    validateProject(synchronizeIndexes(withDataChartFeature(fixture.project))),
  ).toThrow(expect.objectContaining({ code: 'invalid', reason }));
});
