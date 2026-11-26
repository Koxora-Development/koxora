import { expect, it } from 'vitest';
import {
  createProject,
  DATA_CHART_FEATURE,
  DATA_CHART_KEY,
  exportProject,
  importProject,
  readChartBindings,
  readChartConfig,
  synchronizeIndexes,
  validateProject,
  withDataChartFeature,
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

it('requires the chart feature and preserves live bindings and optional data in an archive', async () => {
  const { project, chart, datasetId, categoryFieldId, valueFieldId } =
    chartFixture();
  await expect(
    exportProject(synchronizeIndexes(project)),
  ).rejects.toMatchObject({ code: 'invalid', reason: 'feature' });

  const marked = withDataChartFeature(project);
  expect(marked.manifest.requiredFeatures).toContain(DATA_CHART_FEATURE);
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
    type: 'column',
    palette: 'warm',
  });
  expect(reopened.datasets).toEqual(project.datasets);
  expect(await exportProject(reopened)).toEqual(archive);
});

it('marks template-only charts and keeps future chart profiles opaque', async () => {
  const { project, chart, id, now } = chartFixture();
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
  chart.extensions[DATA_CHART_KEY] = { version: 2, axes: ['future'] };
  chart.dataBindings = [];
  chart.content = { title: { text: 'Future' } };
  const marked = withDataChartFeature(project);
  expect(marked.manifest.requiredFeatures).toContain(DATA_CHART_FEATURE);
  const archive = await exportProject(synchronizeIndexes(marked));
  const reopened = await importProject(archive);
  const reopenedChart = reopened.templates[0].document.pages[0].nodes[0];
  expect(readChartConfig(reopenedChart)).toBeNull();
  expect(reopenedChart).toEqual(chart);
  expect(await exportProject(reopened)).toEqual(archive);
});

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
