import {
  COLLECTIONS,
  type Project,
  type Manifest,
  type Index,
  type Document,
  type Page,
  type Resource,
  type Asset,
  type Preview,
  type Json,
  type Collection,
} from './types';
import {
  DEFAULT_LIMITS,
  canonical,
  check,
  limits,
  parseJson,
  ProjectError,
  record,
  sha256,
  id,
  type ResourceLimits,
} from './validation';
import { validateProject } from './schema';
import { readZip, writeZip } from './zip';
import { parseProject as parseLegacy } from './legacy';
export * from './types';
export { DEFAULT_LIMITS, ProjectError, sha256, isId } from './validation';
export type { ResourceLimits, ErrorCode } from './validation';
export { validateProject } from './schema';
export const CURRENT_VERSION = '1.0.0';
export const MAX_BYTES = DEFAULT_LIMITS.archiveBytes;
const encoder = new TextEncoder();
const PREFIX = 'koxora-zip:';
export function synchronizeIndexes(project: Project): Project {
  const indexes = { ...project.indexes };
  for (const name of COLLECTIONS) {
    const old = indexes[name] ?? {
      schemaVersion: CURRENT_VERSION,
      items: [],
      extensions: {},
    };
    const oldItems = new Map(old.items.map((item) => [item.id, item]));
    const binary = name === 'assets' || name === 'previews';
    indexes[name] = {
      ...old,
      items: project[name].map((item) => ({
        ...oldItems.get(item.id),
        ...(binary ? item : {}),
        extensions: binary
          ? item.extensions
          : (oldItems.get(item.id)?.extensions ?? {}),
        id: item.id,
        path: binary ? (item as Asset).path : `${name}/${item.id}.json`,
      })),
    };
  }
  return { ...project, indexes };
}
export function createProject(
  title: string,
  makeId: () => string,
  now: string,
): Project {
  const page: Page = {
    id: makeId(),
    title,
    size: { width: 1920, height: 1080 },
    viewport: { x: 0, y: 0, zoom: 1 },
    layers: [
      { id: makeId(), title, visible: true, locked: false, extensions: {} },
    ],
    nodes: [],
    connections: [],
    relationships: [],
    layout: {},
    presentation: {},
    extensions: {},
  };
  const doc: Document = {
    id: makeId(),
    schemaVersion: CURRENT_VERSION,
    type: 'flowchart',
    title,
    locale: 'en',
    pages: [page],
    styles: [],
    domainModels: [],
    actions: [],
    animations: [],
    extensions: {},
  };
  const manifest: Manifest = {
    format: 'koxora-project',
    formatVersion: CURRENT_VERSION,
    schemaVersion: CURRENT_VERSION,
    minReaderVersion: CURRENT_VERSION,
    minSchemaReaderVersion: CURRENT_VERSION,
    projectId: makeId(),
    title,
    createdAt: now,
    updatedAt: now,
    locale: 'en',
    direction: 'auto',
    requiredFeatures: ['documents', 'pages', 'nodes', 'connections', 'layers'],
    documentsIndex: 'documents/index.json',
    datasetsIndex: 'datasets/index.json',
    assetsIndex: 'assets/index.json',
    themesIndex: 'themes/index.json',
    templatesIndex: 'templates/index.json',
    previewsIndex: 'previews/index.json',
    resources: {},
    extensions: {},
  };
  const project = synchronizeIndexes({
    manifest,
    documents: [doc],
    datasets: [],
    assets: [],
    themes: [],
    templates: [],
    previews: [],
    indexes: {} as Record<Collection, Index>,
    files: {},
  });
  validateProject(project);
  return project;
}
export async function exportProject(
  project: Project,
  options: Partial<ResourceLimits> = {},
): Promise<Uint8Array> {
  const budget = limits(options);
  validateProject(project, budget);
  const files: Record<string, Uint8Array> = Object.fromEntries(
    Object.entries(project.files).map(([path, bytes]) => [
      path,
      new Uint8Array(bytes),
    ]),
  );
  const required = new Set<string>();
  function put(path: string, value: unknown) {
    check(!Object.hasOwn(files, path), path, 'reservedEntry');
    const bytes = encoder.encode(canonical(value, budget));
    check(bytes.length <= budget.jsonBytes, path, 'jsonBytes', 'tooLarge');
    files[path] = bytes;
    required.add(path);
  }
  const indexed = synchronizeIndexes(project);
  for (const name of COLLECTIONS) {
    const index = indexed.indexes[name];
    put(`${name}/index.json`, index);
    if (name !== 'assets' && name !== 'previews')
      for (const item of project[name]) put(`${name}/${item.id}.json`, item);
  }
  const binaryByPath = new Map<string, Asset>();
  const hashes = new Map<string, string>();
  for (const asset of [...project.assets, ...project.previews]) {
    if (!hashes.has(asset.path))
      hashes.set(asset.path, await sha256(files[asset.path]));
    const previous = binaryByPath.get(asset.path);
    check(
      !previous || previous.mediaType === asset.mediaType,
      asset.path,
      'assetMediaType',
    );
    binaryByPath.set(asset.path, asset);
    check(
      files[asset.path]?.length === asset.size &&
        hashes.get(asset.path) === asset.sha256,
      asset.path,
      'assetHash',
      'integrity',
    );
    required.add(asset.path);
  }
  check(
    !Object.hasOwn(files, 'manifest.json'),
    'manifest.json',
    'reservedEntry',
  );
  for (const path of Object.keys(project.manifest.resources))
    check(Object.hasOwn(files, path), path, 'missingResource');
  const resources: Record<string, Resource> = {};
  for (const path of Object.keys(files).sort()) {
    const old = project.manifest.resources[path];
    check(
      !old?.required || required.has(path),
      path,
      'requiredResource',
      'unsupported',
    );
    const binary = binaryByPath.get(path);
    resources[path] = {
      ...old,
      extensions: old?.extensions ?? {},
      size: files[path].length,
      sha256: hashes.get(path) ?? (await sha256(files[path])),
      mediaType:
        binary?.mediaType ??
        old?.mediaType ??
        (path.endsWith('.json')
          ? 'application/json'
          : 'application/octet-stream'),
      required: old?.required ?? required.has(path),
    };
  }
  files['manifest.json'] = encoder.encode(
    canonical({ ...project.manifest, resources }, budget),
  );
  check(
    files['manifest.json'].length <= budget.jsonBytes,
    'manifest.json',
    'jsonBytes',
    'tooLarge',
  );
  return writeZip(files, budget);
}
export async function importProject(
  bytes: Uint8Array,
  options: Partial<ResourceLimits> = {},
): Promise<Project> {
  const budget = limits(options),
    files = await readZip(bytes, budget);
  check(
    Object.hasOwn(files, 'manifest.json'),
    'manifest.json',
    'missingManifest',
  );
  const values = { left: budget.values };
  const parseEntry = (entry: Uint8Array, path: string) =>
    parseJson(entry, path, budget, values);
  const manifest = parseEntry(
    files['manifest.json'],
    'manifest.json',
  ) as Manifest;
  record(manifest, 'manifest.json');
  record(manifest.resources, 'manifest.json.resources');
  const known = new Set<string>(['manifest.json']);
  for (const path of Object.keys(files)) {
    if (path === 'manifest.json') continue;
    const descriptor = manifest.resources[path];
    record(descriptor, `manifest.resources.${path}`);
    check(
      descriptor.size === files[path].length &&
        descriptor.sha256 === (await sha256(files[path])),
      path,
      'resourceHash',
      'integrity',
    );
  }
  for (const path of Object.keys(manifest.resources))
    check(
      path !== 'manifest.json' && Object.hasOwn(files, path),
      path,
      'missingResource',
      'integrity',
    );
  const indexes = {} as Record<Collection, Index>,
    collections: Partial<Record<Collection, unknown[]>> = {};
  for (const name of COLLECTIONS) {
    const indexPath = `${name}/index.json`;
    check(
      manifest[`${name}Index`] === indexPath,
      `manifest.${name}Index`,
      'indexPath',
    );
    check(Object.hasOwn(files, indexPath), indexPath, 'missingIndex');
    known.add(indexPath);
    const index = parseEntry(files[indexPath], indexPath) as Index;
    record(index, indexPath);
    check(Array.isArray(index.items), indexPath, 'indexItems');
    indexes[name] = index;
    const seenIds = new Set<string>();
    // Preflight identities before parsing any referenced payload. Duplicate references
    // must not amplify one bounded JSON entry into unbounded object allocations.
    for (const [i, item] of index.items.entries()) {
      const path = `${indexPath}.items[${i}]`;
      record(item, path);
      id(item.id, `${path}.id`);
      check(!seenIds.has(item.id), path, 'duplicateIndexId');
      seenIds.add(item.id);
    }
    collections[name] = index.items.map((item, i) => {
      record(item, `${indexPath}.items[${i}]`);
      if (name === 'assets' || name === 'previews') {
        check(
          typeof item.path === 'string' && Object.hasOwn(files, item.path),
          indexPath,
          'resource',
        );
        known.add(item.path);
        return item;
      }
      check(
        item.path === `${name}/${item.id}.json` &&
          Object.hasOwn(files, item.path),
        indexPath,
        'documentPath',
      );
      known.add(item.path);
      const value = parseEntry(files[item.path], item.path);
      record(value, item.path);
      check(value.id === item.id, item.path, 'indexId');
      return value;
    });
  }
  for (const [path, descriptor] of Object.entries(manifest.resources))
    check(
      known.has(path) || descriptor.required === false,
      path,
      'requiredResource',
      'unsupported',
    );
  const binaryPaths = new Set(
    (collections.assets as Asset[])
      .concat(collections.previews as Preview[])
      .map((asset) => asset.path),
  );
  const project = {
    manifest,
    ...collections,
    indexes,
    files: Object.fromEntries(
      Object.entries(files).filter(
        ([path]) => binaryPaths.has(path) || !known.has(path),
      ),
    ),
  };
  validateProject(project, budget);
  for (const asset of [...project.assets, ...project.previews])
    check(
      asset.sha256 === manifest.resources[asset.path].sha256 &&
        asset.size === manifest.resources[asset.path].size &&
        asset.mediaType === manifest.resources[asset.path].mediaType,
      asset.path,
      'assetIndex',
      'integrity',
    );
  return project;
}
export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768)
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}
export function decodeBase64(source: string, max = MAX_BYTES): Uint8Array {
  check(
    source.length <= Math.ceil(max / 3) * 4 &&
      source.length % 4 === 0 &&
      !/[^A-Za-z0-9+/]/.test(source.replace(/={1,2}$/, '')),
    '$snapshot',
    'base64',
    'invalid',
  );
  return Uint8Array.from(atob(source), (char) => char.charCodeAt(0));
}
/** Local snapshots store exactly the native ZIP bytes, encoded for the existing CAS transport. */
export async function serializeProject(project: Project): Promise<string> {
  return PREFIX + encodeBase64(await exportProject(project));
}
export async function parseProject(snapshot: string): Promise<Project> {
  if (snapshot.startsWith(PREFIX))
    return importProject(decodeBase64(snapshot.slice(PREFIX.length)));
  return importLegacyJson(snapshot);
}
export interface Migration {
  from: string;
  to: string;
  migrate: (input: unknown) => Promise<unknown>;
}
export async function migrate(
  input: unknown,
  from: string,
  to: string,
  steps: readonly Migration[],
): Promise<unknown> {
  let value = structuredClone(input),
    version = from;
  const seen = new Set<string>();
  while (version !== to) {
    check(!seen.has(version), '$migration', 'cycle', 'unsupported');
    seen.add(version);
    const step = steps.find((item) => item.from === version);
    check(
      step && step.to !== version,
      '$migration',
      'missingStep',
      'unsupported',
    );
    value = await step.migrate(structuredClone(value));
    version = step.to;
  }
  return value;
}
/** Explicit migration of this PR's never-released JSON draft; normal file import only accepts ZIP. */
export async function importLegacyJson(source: string): Promise<Project> {
  let legacy: ReturnType<typeof parseLegacy>;
  try {
    legacy = parseLegacy(source);
  } catch {
    throw new ProjectError('invalid', '$legacy', 'legacyJson');
  }
  const seed = legacy.projectId;
  async function derived(label: string) {
    const hex = await sha256(encoder.encode(`${seed}/${label}`));
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }
  const result = await migrate(legacy, 'json-draft/1.0.0', 'zip/1.0.0', [
    {
      from: 'json-draft/1.0.0',
      to: 'zip/1.0.0',
      migrate: async () => {
        const project = createProject(
          legacy.title,
          () => crypto.randomUUID(),
          legacy.createdAt,
        );
        project.manifest.projectId = legacy.projectId;
        project.manifest.updatedAt = legacy.updatedAt;
        project.manifest.extensions['org.koxora.legacy-source'] =
          legacy as unknown as Json;
        project.documents[0].id = await derived('document');
        project.documents[0].pages = await Promise.all(
          legacy.pages.map(async (page, i) => {
            const layerId = await derived(`layer/${i}`);
            return {
              id: page.id,
              title: page.title,
              size: { width: 1920, height: 1080 },
              viewport: { x: 0, y: 0, zoom: 1 },
              layers: [
                {
                  id: layerId,
                  title: page.title,
                  locked: false,
                  visible: true,
                  extensions: {},
                },
              ],
              nodes: page.nodes.map((node) => ({
                id: node.id,
                kind: node.kind,
                layerId,
                geometry: {
                  x: node.x,
                  y: node.y,
                  width: 100,
                  height: 60,
                  rotation: 0,
                },
                content: {},
                metadata: {},
                assetIds: [],
                dataBindings: [],
                extensions: {
                  'org.koxora.legacy-node': node as unknown as Json,
                },
              })),
              connections: page.connections.map((edge) => ({
                id: edge.id,
                sourceId: edge.sourceId,
                targetId: edge.targetId,
                layerId,
                relationType: 'connection',
                waypoints: [],
                extensions: {
                  'org.koxora.legacy-connection': edge as unknown as Json,
                },
              })),
              relationships: [],
              layout: {},
              presentation: {},
              extensions: { 'org.koxora.legacy-page': page as unknown as Json },
            };
          }),
        );
        return synchronizeIndexes(project);
      },
    },
  ]);
  validateProject(result);
  return result;
}
