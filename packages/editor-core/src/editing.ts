import {
  validateProject,
  type Project,
  type Node,
  type Connection,
} from '@koxora/project';
import { snapPoint, type Point } from './viewport';
import { readCanvas } from './project-view';
import {
  CONNECTION_KEY,
  ELEMENT_KEY,
  MAX_TEXT,
  editableExtension,
  isShapeKind,
  jsonObject,
  layerStates,
  readAppearance,
  resolveAppearance,
  shapeRegistry,
  type Appearance,
  type ShapeKind,
} from './shapes';
import { type ConnectionOptions, readConnection } from './connections';
export type EditCommand =
  | {
      type: 'insert';
      id: string;
      kind: ShapeKind;
      position: Point;
      layerId: string;
      text?: string;
    }
  | {
      type: 'connect';
      id: string;
      sourceId: string;
      targetId: string;
      layerId: string;
      options: ConnectionOptions;
    }
  | { type: 'updateNode'; id: string; text: string; style: Appearance }
  | {
      type: 'updateConnection';
      id: string;
      options: ConnectionOptions;
      style: Appearance;
    };
export class EditError extends Error {
  constructor(
    public code: 'layer' | 'endpoint' | 'duplicate' | 'unsupported' | 'invalid',
  ) {
    super(code);
  }
}
function text(value: string) {
  if (typeof value !== 'string' || value.length > MAX_TEXT)
    throw new EditError('invalid');
}
function style(value: Appearance) {
  if (JSON.stringify(readAppearance({ ...value })) !== JSON.stringify(value)) {
    const safe = readAppearance({ ...value });
    for (const key of Object.keys(safe) as (keyof Appearance)[])
      if (safe[key] !== value[key]) throw new EditError('invalid');
  }
}
function options(value: ConnectionOptions) {
  text(value.label);
  if (
    !['straight', 'orthogonal', 'curved'].includes(value.routing) ||
    typeof value.arrow !== 'boolean' ||
    ![value.sourceAnchor, value.targetAnchor].every((a) =>
      ['auto', 'north', 'east', 'south', 'west'].includes(a),
    )
  )
    throw new EditError('invalid');
}
/** Refuse edits when rendering defaults/clipping would discard unsupported stored semantics. */
export function assertEditableElement(item: Node | Connection): void {
  if ('kind' in item) {
    const n = item as Node;
    if (
      !isShapeKind(n.kind) ||
      !editableExtension(n.extensions[ELEMENT_KEY]) ||
      (n.content.text !== undefined &&
        (typeof n.content.text !== 'string' ||
          n.content.text.length > MAX_TEXT))
    )
      throw new EditError('unsupported');
  } else {
    const e = item as Connection,
      raw = jsonObject(e.extensions[CONNECTION_KEY]);
    if (!editableExtension(e.extensions[CONNECTION_KEY]))
      throw new EditError('unsupported');
    const normalized = readConnection(e);
    for (const k of [
      'routing',
      'arrow',
      'label',
      'sourceAnchor',
      'targetAnchor',
    ] as const)
      if (raw[k] !== undefined && raw[k] !== normalized[k])
        throw new EditError('unsupported');
  }
}
function updateAppearance(
  item: Node | Connection,
  key: string,
  desired: Appearance,
  current: Appearance,
) {
  const extension = jsonObject(item.extensions[key]);
  const changes = Object.fromEntries(
    (Object.keys(current) as (keyof Appearance)[])
      .filter((k) => desired[k] !== current[k])
      .map((k) => [k, desired[k]]),
  );
  if (!Object.keys(changes).length) return extension;
  const raw = extension.style;
  if (
    raw !== undefined &&
    (raw === null || typeof raw !== 'object' || Array.isArray(raw))
  )
    throw new EditError('unsupported');
  return { ...extension, style: { ...jsonObject(raw), ...changes } };
}
/** One validated immutable transaction. IDs and time are supplied, so commands can be replayed by future history. */
export function applyEdit(
  project: Project,
  documentId: string,
  pageId: string,
  command: EditCommand,
  now: string,
): Project {
  const document = project.documents.find((d) => d.id === documentId),
    page = document?.pages.find((p) => p.id === pageId);
  if (!page || !document) throw new EditError('invalid');
  const layers = layerStates(page.layers);
  const styles = [
    ...project.themes.flatMap((t) => t.styles),
    ...project.documents.flatMap((d) => d.styles),
  ];
  const editable = (layerId: string) => {
    if (!layers.get(layerId)?.editable) throw new EditError('layer');
  };
  const node = (id: string): Node => {
    const n = page.nodes.find((n) => n.id === id);
    if (!n) throw new EditError('endpoint');
    editable(n.layerId);
    assertEditableElement(n);
    return n;
  };
  let nodes = page.nodes,
    connections = page.connections;
  if (command.type === 'insert') {
    editable(command.layerId);
    text(command.text ?? '');
    if (
      !isShapeKind(command.kind) ||
      !Number.isFinite(command.position.x) ||
      !Number.isFinite(command.position.y) ||
      Math.abs(command.position.x) > 1e12 ||
      Math.abs(command.position.y) > 1e12
    )
      throw new EditError('invalid');
    const def = shapeRegistry[command.kind],
      grid = readCanvas(page).grid;
    const p = snapPoint(
      {
        x: command.position.x - def.width / 2,
        y: command.position.y - def.height / 2,
      },
      grid.spacing,
      grid.snap,
    );
    const created: Node = {
      id: command.id,
      kind: command.kind,
      layerId: command.layerId,
      geometry: { ...p, width: def.width, height: def.height, rotation: 0 },
      content: { text: command.text ?? '' },
      metadata: {},
      assetIds: [],
      dataBindings: [],
      extensions: { [ELEMENT_KEY]: { version: 1 } },
    };
    nodes = [...nodes, created];
  } else if (command.type === 'connect') {
    editable(command.layerId);
    node(command.sourceId);
    node(command.targetId);
    options(command.options);
    if (command.sourceId === command.targetId) throw new EditError('endpoint');
    if (
      connections.some(
        (c) =>
          (c.sourceId === command.sourceId &&
            c.targetId === command.targetId) ||
          (!command.options.arrow &&
            c.sourceId === command.targetId &&
            c.targetId === command.sourceId),
      )
    )
      throw new EditError('duplicate');
    const edge: Connection = {
      id: command.id,
      sourceId: command.sourceId,
      targetId: command.targetId,
      layerId: command.layerId,
      relationType: 'connection',
      waypoints: [],
      extensions: { [CONNECTION_KEY]: { version: 1, ...command.options } },
    };
    connections = [...connections, edge];
  } else if (command.type === 'updateNode') {
    const n = node(command.id);
    text(command.text);
    style(command.style);
    if (
      typeof n.content.text !== 'undefined' &&
      typeof n.content.text !== 'string'
    )
      throw new EditError('unsupported');
    nodes = nodes.map((item) =>
      item.id !== n.id
        ? item
        : {
            ...item,
            content: { ...item.content, text: command.text },
            extensions: {
              ...item.extensions,
              [ELEMENT_KEY]: {
                ...updateAppearance(
                  item,
                  ELEMENT_KEY,
                  command.style,
                  resolveAppearance(item, styles),
                ),
                version: 1,
              },
            },
          },
    );
  } else {
    const edge = connections.find((e) => e.id === command.id);
    if (!edge) throw new EditError('endpoint');
    editable(edge.layerId);
    assertEditableElement(edge);
    options(command.options);
    style(command.style);
    connections = connections.map((e) =>
      e.id !== edge.id
        ? e
        : {
            ...e,
            waypoints:
              command.options.routing === readConnection(e).routing
                ? e.waypoints
                : [],
            extensions: {
              ...e.extensions,
              [CONNECTION_KEY]: {
                ...updateAppearance(
                  e,
                  CONNECTION_KEY,
                  command.style,
                  resolveAppearance(e, styles, CONNECTION_KEY),
                ),
                version: 1,
                ...command.options,
              },
            },
          },
    );
  }
  const next: Project = {
    ...project,
    manifest: {
      ...project.manifest,
      updatedAt: new Date(
        Math.max(Date.parse(now), Date.parse(project.manifest.updatedAt)),
      ).toISOString(),
    },
    documents: project.documents.map((d) =>
      d.id !== documentId
        ? d
        : {
            ...d,
            pages: d.pages.map((p) =>
              p.id !== pageId ? p : { ...p, nodes, connections },
            ),
          },
    ),
  };
  validateProject(next);
  return next;
}
