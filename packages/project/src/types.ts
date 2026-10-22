export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json | undefined };
export interface Extensible {
  [key: string]: Json | undefined;
  extensions: { [namespace: string]: Json };
}
export interface Resource extends Extensible {
  size: number;
  sha256: string;
  mediaType: string;
  required: boolean;
}
export interface Manifest extends Extensible {
  format: 'koxora-project';
  formatVersion: string;
  schemaVersion: string;
  minReaderVersion: string;
  minSchemaReaderVersion: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  locale: string;
  direction: 'ltr' | 'rtl' | 'auto';
  requiredFeatures: string[];
  documentsIndex: string;
  datasetsIndex: string;
  assetsIndex: string;
  themesIndex: string;
  templatesIndex: string;
  previewsIndex: string;
  resources: { [path: string]: Resource };
}
export interface Point {
  [key: string]: Json;
  x: number;
  y: number;
}
export interface Layer extends Extensible {
  id: string;
  title: string;
  visible: boolean;
  locked: boolean;
  parentId?: string;
}
export interface Style extends Extensible {
  id: string;
  properties: { [key: string]: Json };
  parentId?: string;
}
export interface Node extends Extensible {
  id: string;
  kind: string;
  layerId: string;
  geometry: {
    [key: string]: Json;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
  content: { [key: string]: Json };
  metadata: { [key: string]: Json };
  styleId?: string;
  assetIds: string[];
  dataBindings: { datasetId: string; fieldId: string }[];
}
export interface Connection extends Extensible {
  id: string;
  sourceId: string;
  targetId: string;
  layerId: string;
  relationType: string;
  waypoints: Point[];
  styleId?: string;
}
export interface Relationship extends Extensible {
  id: string;
  sourceId: string;
  targetId: string;
  kind: string;
  metadata: { [key: string]: Json };
}
export interface Page extends Extensible {
  id: string;
  title: string;
  size: { [key: string]: Json; width: number; height: number };
  viewport: { [key: string]: Json; x: number; y: number; zoom: number };
  layers: Layer[];
  nodes: Node[];
  connections: Connection[];
  relationships: Relationship[];
  layout: { [key: string]: Json };
  presentation: { [key: string]: Json };
}
export interface DomainModel extends Extensible {
  namespace: string;
  schemaVersion: string;
  required: boolean;
  references: string[];
  data: { [key: string]: Json };
}
export interface Action extends Extensible {
  id: string;
  targetId: string;
  trigger: string;
  operation: string;
  parameters: { [key: string]: Json };
}
export interface Animation extends Extensible {
  id: string;
  targetId: string;
  duration: number;
  easing: string;
  keyframes: { time: number; properties: { [key: string]: Json } }[];
}
export interface Document extends Extensible {
  id: string;
  schemaVersion: string;
  type: string;
  title: string;
  locale: string;
  pages: Page[];
  styles: Style[];
  domainModels: DomainModel[];
  actions: Action[];
  animations: Animation[];
}
export interface Field extends Extensible {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  nullable: boolean;
}
export interface Dataset extends Extensible {
  id: string;
  schemaVersion: string;
  title: string;
  fields: Field[];
  rows: { [fieldId: string]: Json }[];
  source: { [key: string]: Json };
}
export interface Asset extends Extensible {
  id: string;
  path: string;
  sha256: string;
  size: number;
  mediaType: string;
}
export interface Preview extends Asset {
  documentId: string;
}
export interface Theme extends Extensible {
  id: string;
  schemaVersion: string;
  title: string;
  tokens: { [key: string]: Json };
  styles: Style[];
}
export interface Template extends Extensible {
  id: string;
  schemaVersion: string;
  title: string;
  document: Document;
}
export interface Index extends Extensible {
  schemaVersion: string;
  items: (Extensible & { id: string; path: string })[];
}
export const COLLECTIONS = [
  'documents',
  'datasets',
  'assets',
  'themes',
  'templates',
  'previews',
] as const;
export type Collection = (typeof COLLECTIONS)[number];
export interface Project {
  manifest: Manifest;
  documents: Document[];
  datasets: Dataset[];
  assets: Asset[];
  themes: Theme[];
  templates: Template[];
  previews: Preview[];
  indexes: Record<Collection, Index>;
  /** Binary assets/previews and opaque optional archive entries; never filesystem paths. */
  files: Record<string, Uint8Array>;
}
