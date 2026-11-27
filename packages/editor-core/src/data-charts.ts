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
const MAX_PIE_SLICES = 6;

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

interface PieSlice {
  label: string;
  share: number;
  grouped?: true;
}

export type PieChartData =
  { status: 'negative' | 'empty' } | { status: 'ready'; slices: PieSlice[] };

export interface DataChart extends ChartConfig {
  title: string;
  categoryLabel: string;
  valueLabel: string;
  points: { label: string; value: number | null }[];
  rowCount: number;
  pie?: PieChartData;
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

function categoryLabel(value: Json): string {
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

interface ChartRow {
  category: Json;
  value: number | null;
}

function buildPieChart(rows: ChartRow[]): PieChartData {
  let maximum = 0;
  for (const { value } of rows) {
    if (value === null) continue;
    if (value < 0) return { status: 'negative' };
    maximum = Math.max(maximum, value);
  }
  if (maximum === 0) return { status: 'empty' };

  // Sum unscaled values unless scaling is needed to avoid overflow.
  const divisor = maximum > Number.MAX_VALUE / (rows.length + 1) ? maximum : 1;
  const weights = new Map<Json, number>();
  for (const { category, value } of rows) {
    if (value === null || value === 0) continue;
    weights.set(category, (weights.get(category) ?? 0) + value / divisor);
  }
  // Stable sort preserves source order for categories with equal weights.
  const ranked = [...weights].sort(([, first], [, second]) => second - first);
  const total = ranked.reduce((sum, [, weight]) => sum + weight, 0);
  const shown =
    ranked.length > MAX_PIE_SLICES ? MAX_PIE_SLICES - 1 : ranked.length;
  const slices: PieSlice[] = ranked
    .slice(0, shown)
    .map(([category, weight]) => ({
      label: categoryLabel(category),
      share: weight / total,
    }));
  if (shown < ranked.length) {
    const remainder = ranked
      .slice(shown)
      .reduce((sum, [, weight]) => sum + weight, 0);
    slices.push({ label: '', share: remainder / total, grouped: true });
  }
  return { status: 'ready', slices };
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
  const rows: ChartRow[] = dataset.rows.slice(0, MAX_CHART_ROWS).map((row) => {
    const entry = row[value.id];
    return {
      category: row[category.id] ?? null,
      value: typeof entry === 'number' && Number.isFinite(entry) ? entry : null,
    };
  });
  return {
    type: settings.type,
    palette: settings.palette,
    title: settings.title,
    categoryLabel: category.name,
    valueLabel: value.name,
    points: rows.map(({ category, value }) => ({
      label: categoryLabel(category),
      value,
    })),
    rowCount: dataset.rows.length,
    ...(settings.type === 'pie' ? { pie: buildPieChart(rows) } : {}),
  };
}
