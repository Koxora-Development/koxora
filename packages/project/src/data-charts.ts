import type { Document, Field, Node, Project } from './types';

export const DATA_CHART_KIND = 'data-chart';
export const DATA_CHART_KEY = 'org.koxora.chart';
export const DATA_CHART_FEATURE = 'data-charts-v1';
export const DATA_CHART_TYPES_FEATURE = 'data-chart-types-v2';

export const chartTypes = ['column', 'line', 'area', 'pie'] as const;
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

export function chartProfileVersion(type: ChartType): 1 | 2 {
  return type === 'area' || type === 'pie' ? 2 : 1;
}

function chartProfile(node: Node) {
  const profile = node.extensions[DATA_CHART_KEY];
  if (
    node.kind !== DATA_CHART_KIND ||
    !profile ||
    typeof profile !== 'object' ||
    Array.isArray(profile)
  )
    return null;
  return profile;
}

/** Only explicit v2 area and pie profiles claim the expanded chart semantics. */
export function hasExpandedChartProfile(node: Node): boolean {
  const profile = chartProfile(node);
  return (
    profile?.version === 2 &&
    (profile.type === 'area' || profile.type === 'pie')
  );
}

export function readChartConfig(node: Node): ChartConfig | null {
  const profile = chartProfile(node);
  if (!profile) return null;
  const type = chartTypes.find((type) => type === profile.type);
  const palette = chartPalettes.find((palette) => palette === profile.palette);
  return type && palette && profile.version === chartProfileVersion(type)
    ? { type, palette }
    : null;
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

function hasDataChart(
  project: Project,
  matches = (node: Node) => node.kind === DATA_CHART_KIND,
): boolean {
  const hasChart = (document: Document) =>
    document.pages.some((page) => page.nodes.some(matches));
  return (
    project.documents.some(hasChart) ||
    project.templates.some((template) => hasChart(template.document))
  );
}

export function withDataChartFeature(project: Project): Project {
  const { manifest } = project;
  const hasBase = manifest.requiredFeatures.includes(DATA_CHART_FEATURE);
  const hasTypes = manifest.requiredFeatures.includes(DATA_CHART_TYPES_FEATURE);
  if (hasBase && hasTypes) return project;

  const needsTypes =
    !hasTypes && hasDataChart(project, hasExpandedChartProfile);
  const requiredFeatures = [...manifest.requiredFeatures];
  if (!hasBase && (needsTypes || hasDataChart(project)))
    requiredFeatures.push(DATA_CHART_FEATURE);
  if (needsTypes) requiredFeatures.push(DATA_CHART_TYPES_FEATURE);
  if (requiredFeatures.length === manifest.requiredFeatures.length)
    return project;
  return {
    ...project,
    manifest: { ...manifest, requiredFeatures },
  };
}
