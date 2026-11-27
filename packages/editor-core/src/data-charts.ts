import {
  isChartCategoryField,
  readChartBindings,
  readChartConfig,
  type ChartConfig,
  type ChartPalette,
  type ChartType,
  type Dataset,
  type Field,
  type Json,
  type Node,
} from '@koxora/project';

export const MAX_CHART_ROWS = 100;
const MAX_CATEGORY_LABEL_LENGTH = 256;

export const CHART_PALETTES: Readonly<Record<ChartPalette, readonly string[]>> =
  {
    studio: ['#6d28d9', '#2563eb', '#0f766e', '#be185d', '#4338ca', '#15803d'],
    ocean: ['#0369a1', '#0f766e', '#1d4ed8', '#0e7490', '#166534', '#3730a3'],
    warm: ['#c2410c', '#be123c', '#a16207', '#9d174d', '#b45309', '#9f1239'],
  };

export interface ChartSettings extends ChartConfig {
  datasetId: string;
  categoryFieldId: string;
  valueFieldId: string;
  title: string;
}

export interface DataChart extends ChartConfig {
  title: string;
  categoryLabel: string;
  valueLabel: string;
  points: { label: string; value: number | null }[];
  rowCount: number;
}

export function readChartSettings(node: Node): ChartSettings | null {
  const config = readChartConfig(node);
  const bindings = readChartBindings(node);
  const title = node.content.text;
  return config && bindings && typeof title === 'string'
    ? { ...config, ...bindings, title }
    : null;
}

export function chartFields(dataset: Dataset): {
  categories: Field[];
  values: Field[];
} {
  const categories = dataset.fields.filter(isChartCategoryField);
  const values = categories.filter((field) => field.type === 'number');
  if (categories.length < 2 || values.length === 0)
    return { categories: [], values: [] };
  return {
    categories:
      values.length === 1
        ? categories.filter((field) => field.id !== values[0].id)
        : categories,
    values,
  };
}

export function suggestChartType(category: Field): ChartType {
  return category.type === 'date' || category.type === 'number'
    ? 'line'
    : 'column';
}

function categoryLabel(value: Json | undefined): string {
  if (typeof value === 'string') {
    if (value.length <= MAX_CATEGORY_LABEL_LENGTH) return value;
    const prefix = Array.from(value.slice(0, MAX_CATEGORY_LABEL_LENGTH))
      .slice(0, -1)
      .join('');
    return `${prefix}…`;
  }
  return typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
    ? String(value)
    : '';
}

/** The saved chart holds field references; visible rows always come from the dataset. */
export function buildDataChart(
  node: Node,
  datasets: readonly Dataset[],
): DataChart | null {
  const settings = readChartSettings(node);
  if (!settings) return null;
  const dataset = datasets.find(({ id }) => id === settings.datasetId);
  const category = dataset?.fields.find(
    ({ id }) => id === settings.categoryFieldId,
  );
  const value = dataset?.fields.find(({ id }) => id === settings.valueFieldId);
  if (
    !dataset ||
    !category ||
    !isChartCategoryField(category) ||
    value?.type !== 'number'
  )
    return null;
  return {
    type: settings.type,
    palette: settings.palette,
    title: settings.title,
    categoryLabel: category.name,
    valueLabel: value.name,
    points: dataset.rows.slice(0, MAX_CHART_ROWS).map((row) => {
      const entry = row[value.id];
      return {
        label: categoryLabel(row[category.id]),
        value:
          typeof entry === 'number' && Number.isFinite(entry) ? entry : null,
      };
    }),
    rowCount: dataset.rows.length,
  };
}
