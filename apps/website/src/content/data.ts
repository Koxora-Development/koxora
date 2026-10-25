import type { MessageKey } from './catalog';
import { site } from '../site';
// Structured content. Every visible string is a message key, so the data
// below stays identical in every language.
export type FeatureStatus = 'available' | 'in-development' | 'planned';
export type IconName =
  | 'shapes'
  | 'canvas'
  | 'cursor'
  | 'history'
  | 'folder'
  | 'file'
  | 'offline'
  | 'text'
  | 'globe'
  | 'contrast'
  | 'keyboard'
  | 'shield'
  | 'tabs'
  | 'desktop'
  | 'template'
  | 'export'
  | 'import'
  | 'chart'
  | 'people'
  | 'cloud'
  | 'spark'
  | 'plugin'
  | 'server'
  | 'mobile';
export interface FeatureEntry {
  id: string;
  status: FeatureStatus;
  icon: IconName;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  /** Shown in the condensed home page grid. */
  highlight: boolean;
}
export const features: FeatureEntry[] = [
  {
    id: 'shapes',
    status: 'available',
    icon: 'shapes',
    titleKey: 'feature.shapes.title',
    bodyKey: 'feature.shapes.body',
    highlight: true,
  },
  {
    id: 'canvas',
    status: 'available',
    icon: 'canvas',
    titleKey: 'feature.canvas.title',
    bodyKey: 'feature.canvas.body',
    highlight: true,
  },
  {
    id: 'editing',
    status: 'available',
    icon: 'cursor',
    titleKey: 'feature.editing.title',
    bodyKey: 'feature.editing.body',
    highlight: false,
  },
  {
    id: 'history',
    status: 'available',
    icon: 'history',
    titleKey: 'feature.history.title',
    bodyKey: 'feature.history.body',
    highlight: false,
  },
  {
    id: 'projects',
    status: 'available',
    icon: 'folder',
    titleKey: 'feature.projects.title',
    bodyKey: 'feature.projects.body',
    highlight: true,
  },
  {
    id: 'files',
    status: 'available',
    icon: 'file',
    titleKey: 'feature.files.title',
    bodyKey: 'feature.files.body',
    highlight: true,
  },
  {
    id: 'offline',
    status: 'available',
    icon: 'offline',
    titleKey: 'feature.offline.title',
    bodyKey: 'feature.offline.body',
    highlight: true,
  },
  {
    id: 'typography',
    status: 'available',
    icon: 'text',
    titleKey: 'feature.typography.title',
    bodyKey: 'feature.typography.body',
    highlight: false,
  },
  {
    id: 'languages',
    status: 'available',
    icon: 'globe',
    titleKey: 'feature.languages.title',
    bodyKey: 'feature.languages.body',
    highlight: true,
  },
  {
    id: 'themes',
    status: 'available',
    icon: 'contrast',
    titleKey: 'feature.themes.title',
    bodyKey: 'feature.themes.body',
    highlight: false,
  },
  {
    id: 'keyboard',
    status: 'available',
    icon: 'keyboard',
    titleKey: 'feature.keyboard.title',
    bodyKey: 'feature.keyboard.body',
    highlight: false,
  },
  {
    id: 'recovery',
    status: 'available',
    icon: 'shield',
    titleKey: 'feature.recovery.title',
    bodyKey: 'feature.recovery.body',
    highlight: false,
  },
  {
    id: 'pages',
    status: 'in-development',
    icon: 'tabs',
    titleKey: 'feature.pages.title',
    bodyKey: 'feature.pages.body',
    highlight: true,
  },
  {
    id: 'richText',
    status: 'in-development',
    icon: 'text',
    titleKey: 'feature.richText.title',
    bodyKey: 'feature.richText.body',
    highlight: true,
  },
  {
    id: 'desktop',
    status: 'in-development',
    icon: 'desktop',
    titleKey: 'feature.desktop.title',
    bodyKey: 'feature.desktop.body',
    highlight: true,
  },
  {
    id: 'diagramTypes',
    status: 'planned',
    icon: 'template',
    titleKey: 'feature.diagramTypes.title',
    bodyKey: 'feature.diagramTypes.body',
    highlight: true,
  },
  {
    id: 'export',
    status: 'planned',
    icon: 'export',
    titleKey: 'feature.export.title',
    bodyKey: 'feature.export.body',
    highlight: true,
  },
  {
    id: 'import',
    status: 'planned',
    icon: 'import',
    titleKey: 'feature.import.title',
    bodyKey: 'feature.import.body',
    highlight: true,
  },
  {
    id: 'data',
    status: 'planned',
    icon: 'chart',
    titleKey: 'feature.data.title',
    bodyKey: 'feature.data.body',
    highlight: true,
  },
  {
    id: 'collaboration',
    status: 'planned',
    icon: 'people',
    titleKey: 'feature.collaboration.title',
    bodyKey: 'feature.collaboration.body',
    highlight: true,
  },
  {
    id: 'cloud',
    status: 'planned',
    icon: 'cloud',
    titleKey: 'feature.cloud.title',
    bodyKey: 'feature.cloud.body',
    highlight: true,
  },
  {
    id: 'ai',
    status: 'planned',
    icon: 'spark',
    titleKey: 'feature.ai.title',
    bodyKey: 'feature.ai.body',
    highlight: false,
  },
  {
    id: 'plugins',
    status: 'planned',
    icon: 'plugin',
    titleKey: 'feature.plugins.title',
    bodyKey: 'feature.plugins.body',
    highlight: false,
  },
  {
    id: 'selfHosting',
    status: 'planned',
    icon: 'server',
    titleKey: 'feature.selfHosting.title',
    bodyKey: 'feature.selfHosting.body',
    highlight: false,
  },
  {
    id: 'mobile',
    status: 'planned',
    icon: 'mobile',
    titleKey: 'feature.mobile.title',
    bodyKey: 'feature.mobile.body',
    highlight: false,
  },
];
export function featuresByStatus(status: FeatureStatus): FeatureEntry[] {
  return features.filter((entry) => entry.status === status);
}
export const featureLimitKeys: MessageKey[] = [
  'features.limits.item1',
  'features.limits.item2',
  'features.limits.item3',
  'features.limits.item4',
  'features.limits.item5',
];
export type PhaseState = 'done' | 'active' | 'planned';
export interface PhaseEntry {
  id: number;
  state: PhaseState;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}
// Mirrors docs/roadmap.md. Phase 2 is the milestone currently being built.
export const phases: PhaseEntry[] = [
  { id: 0, state: 'done', titleKey: 'phase.0.title', bodyKey: 'phase.0.body' },
  { id: 1, state: 'done', titleKey: 'phase.1.title', bodyKey: 'phase.1.body' },
  {
    id: 2,
    state: 'active',
    titleKey: 'phase.2.title',
    bodyKey: 'phase.2.body',
  },
  {
    id: 3,
    state: 'planned',
    titleKey: 'phase.3.title',
    bodyKey: 'phase.3.body',
  },
  {
    id: 4,
    state: 'planned',
    titleKey: 'phase.4.title',
    bodyKey: 'phase.4.body',
  },
  {
    id: 5,
    state: 'planned',
    titleKey: 'phase.5.title',
    bodyKey: 'phase.5.body',
  },
  {
    id: 6,
    state: 'planned',
    titleKey: 'phase.6.title',
    bodyKey: 'phase.6.body',
  },
  {
    id: 7,
    state: 'planned',
    titleKey: 'phase.7.title',
    bodyKey: 'phase.7.body',
  },
  {
    id: 8,
    state: 'planned',
    titleKey: 'phase.8.title',
    bodyKey: 'phase.8.body',
  },
];
export interface PeerEntry {
  id: string;
  nameKey: MessageKey;
  bodyKey: MessageKey;
  url: string;
}
// Named as comparison targets only. No capability claim is made about them
// anywhere on this site until the sourced comparison exists.
export const peers: PeerEntry[] = [
  {
    id: 'drawio',
    nameKey: 'peer.drawio.name',
    bodyKey: 'peer.drawio.body',
    url: 'https://www.drawio.com/',
  },
  {
    id: 'lucidchart',
    nameKey: 'peer.lucidchart.name',
    bodyKey: 'peer.lucidchart.body',
    url: 'https://www.lucidchart.com/',
  },
  {
    id: 'miro',
    nameKey: 'peer.miro.name',
    bodyKey: 'peer.miro.body',
    url: 'https://miro.com/',
  },
  {
    id: 'visio',
    nameKey: 'peer.visio.name',
    bodyKey: 'peer.visio.body',
    url: 'https://www.microsoft.com/microsoft-365/visio/flowchart-software',
  },
  {
    id: 'excalidraw',
    nameKey: 'peer.excalidraw.name',
    bodyKey: 'peer.excalidraw.body',
    url: 'https://excalidraw.com/',
  },
];
export const comparisonFocus: { titleKey: MessageKey; bodyKey: MessageKey }[] =
  [
    { titleKey: 'compare.focus1.title', bodyKey: 'compare.focus1.body' },
    { titleKey: 'compare.focus2.title', bodyKey: 'compare.focus2.body' },
    { titleKey: 'compare.focus3.title', bodyKey: 'compare.focus3.body' },
    { titleKey: 'compare.focus4.title', bodyKey: 'compare.focus4.body' },
  ];
export const comparisonMethod: { titleKey: MessageKey; bodyKey: MessageKey }[] =
  [
    {
      titleKey: 'compare.method.item1.title',
      bodyKey: 'compare.method.item1.body',
    },
    {
      titleKey: 'compare.method.item2.title',
      bodyKey: 'compare.method.item2.body',
    },
    {
      titleKey: 'compare.method.item3.title',
      bodyKey: 'compare.method.item3.body',
    },
    {
      titleKey: 'compare.method.item4.title',
      bodyKey: 'compare.method.item4.body',
    },
    {
      titleKey: 'compare.method.item5.title',
      bodyKey: 'compare.method.item5.body',
    },
  ];
export interface RepositoryDocument {
  id: string;
  labelKey: MessageKey;
  path: string;
}
const blob = `${site.repositoryUrl}/blob/main/`;
export const repositoryDocuments: RepositoryDocument[] = [
  { id: 'vision', labelKey: 'repoDoc.vision', path: 'docs/product/vision.md' },
  {
    id: 'architecture',
    labelKey: 'repoDoc.architecture',
    path: 'docs/architecture.md',
  },
  {
    id: 'format',
    labelKey: 'repoDoc.format',
    path: 'docs/architecture/project-format.md',
  },
  {
    id: 'localFirst',
    labelKey: 'repoDoc.localFirst',
    path: 'docs/architecture/local-first.md',
  },
  { id: 'decisions', labelKey: 'repoDoc.decisions', path: 'docs/decisions.md' },
  {
    id: 'roadmap',
    labelKey: 'repoDoc.roadmap',
    path: 'docs/planning/roadmap-backlog.md',
  },
  { id: 'security', labelKey: 'repoDoc.security', path: 'SECURITY.md' },
  {
    id: 'contributing',
    labelKey: 'repoDoc.contributing',
    path: 'CONTRIBUTING.md',
  },
];
export function repositoryUrl(document: RepositoryDocument): string {
  return `${blob}${document.path}`;
}
export const plannedDownloadKeys: MessageKey[] = [
  'download.planned.item1',
  'download.planned.item2',
  'download.planned.item3',
  'download.planned.item4',
  'download.planned.item5',
];
export const plannedDocsKeys: MessageKey[] = [
  'docs.planned.item1',
  'docs.planned.item2',
  'docs.planned.item3',
  'docs.planned.item4',
  'docs.planned.item5',
];
export const plannedReleaseKeys: MessageKey[] = [
  'releases.planned.item1',
  'releases.planned.item2',
  'releases.planned.item3',
  'releases.planned.item4',
];
export const noTrackingKeys: MessageKey[] = [
  'privacyPolicy.noTracking.item1',
  'privacyPolicy.noTracking.item2',
  'privacyPolicy.noTracking.item3',
  'privacyPolicy.noTracking.item4',
  'privacyPolicy.noTracking.item5',
];
// Merged studio milestones, each linked to its scope document in the
// repository. A merged milestone is explicitly not a product release.
export interface Milestone {
  id: string;
  phase: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  path: string;
}
export const milestones: Milestone[] = [
  {
    id: 'storage',
    phase: '2.1',
    titleKey: 'milestone.storage.title',
    bodyKey: 'milestone.storage.body',
    path: 'docs/development/project-storage.md',
  },
  {
    id: 'canvas',
    phase: '2.2',
    titleKey: 'milestone.canvas.title',
    bodyKey: 'milestone.canvas.body',
    path: 'docs/development/interactive-canvas.md',
  },
  {
    id: 'shapes',
    phase: '2.3',
    titleKey: 'milestone.shapes.title',
    bodyKey: 'milestone.shapes.body',
    path: 'docs/development/shapes-text-connections.md',
  },
  {
    id: 'editing',
    phase: '2.4',
    titleKey: 'milestone.editing.title',
    bodyKey: 'milestone.editing.body',
    path: 'docs/development/interactive-editing.md',
  },
];
export function milestoneUrl(milestone: Milestone): string {
  return `${blob}${milestone.path}`;
}
