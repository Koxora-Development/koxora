import type { Document, Field, Node, Project } from './types';

export const DATA_CHART_KIND = 'data-chart';
export const DATA_CHART_KEY = 'org.koxora.chart';
export const DATA_CHART_FEATURE = 'data-charts-v1';

export const chartTypes = ['column', 'line'] as const;
export const chartPalettes = ['studio', 'ocean', 'warm'] as const;
export type ChartType = (typeof chartTypes)[number];
export type ChartPalette = (typeof chartPalettes)[number];
export interface ChartConfig {
  type: ChartType;
  palette: ChartPalette;
}

export function isChartCategoryField(field: Field): boolean {
  return field.type !== 'json';
}

export function readChartConfig(node: Node): ChartConfig | null {
  const profile = node.extensions[DATA_CHART_KEY];
  if (
    node.kind !== DATA_CHART_KIND ||
    !profile ||
    typeof profile !== 'object' ||
    Array.isArray(profile) ||
    profile.version !== 1
  )
    return null;
  const type = chartTypes.find((type) => type === profile.type);
  const palette = chartPalettes.find((palette) => palette === profile.palette);
  return type && palette ? { type, palette } : null;
}

export function readChartBindings(node: Node) {
  const [category, value] = node.dataBindings;
  if (
    node.dataBindings.length !== 2 ||
    category.datasetId !== value.datasetId ||
    category.fieldId === value.fieldId
  )
    return null;
  return {
    datasetId: category.datasetId,
    categoryFieldId: category.fieldId,
    valueFieldId: value.fieldId,
  };
}

export function withDataChartFeature(project: Project): Project {
  const { manifest } = project;
  if (manifest.requiredFeatures.includes(DATA_CHART_FEATURE)) return project;
  const hasChart = (document: Document) =>
    document.pages.some((page) =>
      page.nodes.some((node) => node.kind === DATA_CHART_KIND),
    );
  if (
    !project.documents.some(hasChart) &&
    !project.templates.some((template) => hasChart(template.document))
  )
    return project;
  return {
    ...project,
    manifest: {
      ...manifest,
      requiredFeatures: [...manifest.requiredFeatures, DATA_CHART_FEATURE],
    },
  };
}
