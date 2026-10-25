import {
  RICH_TEXT_KEY,
  readRichText,
  isRichText,
  plainText,
  richTextJson,
  formatRichText,
  type RichText,
} from './rich-text';
import {
  validateProject,
  type Project,
  type Node,
  type Connection,
  type Page,
} from '@koxora/project';
import { isDrawing, LINE_KEY, MIN_SIZE, movedGeometries } from './interaction';
import type { Geometry } from './shapes';
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
  | { type: 'format'; ids: string[]; patch: Partial<Appearance> }
  | { type: 'richText'; id: string; value: RichText }
  | {
      type: 'insert';
      id: string;
      kind: ShapeKind;
      position: Point;
      layerId: string;
      text?: string;
      geometry?: Geometry;
      snap?: boolean;
    }
  | {
      type: 'connect';
      id: string;
      sourceId: string;
      targetId: string;
      layerId: string;
      options: ConnectionOptions;
    }
  | {
      type: 'move';
      ids: string[];
      delta: Point;
      spacing: number;
      snap: boolean;
    }
  | { type: 'transform'; geometries: Record<string, Geometry> }
  | { type: 'delete'; ids: string[] }
  | {
      type: 'duplicate';
      ids: string[];
      idMap: Record<string, string>;
      offset: Point;
    }
  | {
      type: 'paste';
      nodes: Node[];
      connections: Connection[];
      idMap: Record<string, string>;
      offset: Point;
      layerId: string;
    }
  | {
      type: 'updateNode';
      richText?: RichText;
      id: string;
      text: string;
      style: Appearance;
      geometry?: Geometry;
      startArrow?: boolean;
      endArrow?: boolean;
    }
  | {
      type: 'updateConnection';
      richText?: RichText;
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
  if (item.extensions[RICH_TEXT_KEY] !== undefined && !readRichText(item))
    throw new EditError('unsupported');
  if ('kind' in item) {
    const n = item as Node;
    if (
      !isShapeKind(n.kind) ||
      !editableExtension(n.extensions[ELEMENT_KEY]) ||
      (isDrawing(n.kind) &&
        (!editableExtension(n.extensions[LINE_KEY]) ||
          ['startArrow', 'endArrow'].some((k) => {
            const v = jsonObject(n.extensions[LINE_KEY])[k];
            return v !== undefined && typeof v !== 'boolean';
          }))) ||
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
/** Shared eligibility for pointer/keyboard linking, target hints and committed commands. */
export function connectionError(
  page: Pick<Page, 'nodes' | 'connections' | 'layers'>,
  sourceId: string,
  targetId: string | null,
  layerId: string,
  arrow: boolean,
): EditError['code'] | null {
  const layers = layerStates(page.layers);
  if (!layers.get(layerId)?.editable) return 'layer';
  for (const id of [sourceId, ...(targetId ? [targetId] : [])]) {
    const node = page.nodes.find((n) => n.id === id);
    if (!node || isDrawing(node.kind)) return 'endpoint';
    if (!layers.get(node.layerId)?.editable) return 'layer';
    try {
      assertEditableElement(node);
    } catch {
      return 'unsupported';
    }
  }
  if (targetId === sourceId) return 'endpoint';
  if (
    targetId &&
    page.connections.some(
      (c) =>
        (c.sourceId === sourceId && c.targetId === targetId) ||
        (!arrow && c.sourceId === targetId && c.targetId === sourceId),
    )
  )
    return 'duplicate';
  return null;
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
  if (command.type === 'richText' || command.type === 'format') {
    const ids = new Set(command.type === 'format' ? command.ids : [command.id]);
    const items = [...nodes, ...connections].filter((item) => ids.has(item.id));
    if (!items.length || items.length !== ids.size)
      throw new EditError('endpoint');
    for (const item of items) {
      editable(item.layerId);
      assertEditableElement(item);
    }
    if (command.type === 'richText' && !isRichText(command.value))
      throw new EditError('invalid');
    const update = <T extends Node | Connection>(item: T): T => {
      if (!ids.has(item.id)) return item;
      const key = 'kind' in item ? ELEMENT_KEY : CONNECTION_KEY;
      const old = resolveAppearance(item, styles, key);
      const ext = jsonObject(item.extensions[key]);
      if (command.type === 'richText') {
        const value = plainText(command.value);
        return {
          ...item,
          ...('kind' in item
            ? { content: { ...(item as Node).content, text: value } }
            : {}),
          extensions: {
            ...item.extensions,
            ...(key === CONNECTION_KEY
              ? { [key]: { ...ext, version: 1, label: value } }
              : {}),
            [RICH_TEXT_KEY]: richTextJson(command.value),
          },
        };
      }
      if (Object.keys(command.patch).some((k) => !Object.hasOwn(old, k)))
        throw new EditError('invalid');
      const patch = { ...command.patch };
      // Fill/corners are meaningless for text, drawings and semantic edges.
      if (
        !('kind' in item) ||
        ['text', 'line', 'arrow'].includes(String(item.kind))
      ) {
        delete patch.fill;
        delete patch.cornerRadius;
      }
      if ('kind' in item && item.kind === 'text') {
        delete patch.stroke;
        delete patch.strokeWidth;
      }
      if (!Object.keys(patch).length) return item;
      const desired = { ...old, ...patch };
      style(desired);
      const rich = readRichText(item);
      return {
        ...item,
        extensions: {
          ...item.extensions,
          [key]: { ...updateAppearance(item, key, desired, old), version: 1 },
          ...(rich
            ? { [RICH_TEXT_KEY]: richTextJson(formatRichText(rich, patch)) }
            : {}),
        },
      };
    };
    nodes = nodes.map(update);
    connections = connections.map(update);
  } else if (command.type === 'insert') {
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
      command.snap ?? grid.snap,
    );
    if (command.geometry)
      assertGeometry(command.geometry, isDrawing(command.kind));
    const created: Node = {
      id: command.id,
      kind: command.kind,
      layerId: command.layerId,
      geometry: command.geometry ?? {
        ...p,
        width: def.width,
        height: def.height,
        rotation: 0,
      },
      content: { text: command.text ?? '' },
      metadata: {},
      assetIds: [],
      dataBindings: [],
      extensions: { [ELEMENT_KEY]: { version: 1 } },
    };
    nodes = [...nodes, created];
  } else if (command.type === 'connect') {
    const error = connectionError(
      page,
      command.sourceId,
      command.targetId,
      command.layerId,
      command.options.arrow,
    );
    if (error) throw new EditError(error);
    options(command.options);
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
  } else if (command.type === 'transform' || command.type === 'move') {
    const geometries =
      command.type === 'move'
        ? movedGeometries(
            command.ids.map(node),
            command.delta,
            command.spacing,
            command.snap,
          )
        : command.geometries;
    for (const [id, geometry] of Object.entries(geometries)) {
      const n = node(id);
      assertGeometry(
        geometry,
        isDrawing(n.kind),
        geometry.width !== n.geometry.width ||
          geometry.height !== n.geometry.height,
      );
    }
    nodes = nodes.map((n) =>
      geometries[n.id]
        ? { ...n, geometry: { ...n.geometry, ...geometries[n.id] } }
        : n,
    );
  } else if (command.type === 'delete') {
    const removed = new Set(command.ids);
    for (const id of removed) {
      const n = nodes.find((n) => n.id === id);
      if (n) node(id);
      else {
        const edge = connections.find((e) => e.id === id);
        if (!edge) throw new EditError('endpoint');
        editable(edge.layerId);
        assertEditableElement(edge);
      }
    }
    for (const edge of connections) {
      if (removed.has(edge.sourceId) || removed.has(edge.targetId)) {
        editable(edge.layerId);
        assertEditableElement(edge);
        removed.add(edge.id);
      }
    }
    // Specialized references are protected, never silently rewritten or cascaded.
    for (const d of project.documents) {
      if (
        d.domainModels.some((m) =>
          m.references.some((id) => removed.has(id)),
        ) ||
        d.actions.some(
          (a) =>
            removed.has(a.targetId) ||
            (typeof a.parameters.nodeId === 'string' &&
              removed.has(a.parameters.nodeId)),
        ) ||
        d.animations.some((a) => removed.has(a.targetId)) ||
        d.pages.some((p) =>
          p.relationships.some(
            (r) => removed.has(r.sourceId) || removed.has(r.targetId),
          ),
        )
      )
        throw new EditError('unsupported');
    }
    nodes = nodes.filter((n) => !removed.has(n.id));
    connections = connections.filter((e) => !removed.has(e.id));
  } else if (command.type === 'duplicate' || command.type === 'paste') {
    const clipboard =
      command.type === 'paste' ? command : copyElements(page, command.ids);
    if (command.type === 'paste') editable(command.layerId);
    if (![command.offset.x, command.offset.y].every(Number.isFinite))
      throw new EditError('invalid');
    const ids = new Set(clipboard.nodes.map((n) => n.id));
    const copyId = (id: string) => {
      if (!command.idMap[id]) throw new EditError('invalid');
      return command.idMap[id];
    };
    const copiedNodes = clipboard.nodes.map((n) => {
      assertEditableElement(n);
      if (command.type === 'duplicate') editable(n.layerId);
      const geometry = {
        ...n.geometry,
        x: n.geometry.x + command.offset.x,
        y: n.geometry.y + command.offset.y,
      };
      assertGeometry(geometry, isDrawing(n.kind), false);
      return {
        ...n,
        id: copyId(n.id),
        layerId: command.type === 'paste' ? command.layerId : n.layerId,
        geometry,
      };
    });
    const copiedEdges = clipboard.connections.map((e) => {
      assertEditableElement(e);
      if (command.type === 'duplicate') editable(e.layerId);
      if (!ids.has(e.sourceId) || !ids.has(e.targetId))
        throw new EditError('endpoint');
      return {
        ...e,
        id: copyId(e.id),
        sourceId: copyId(e.sourceId),
        targetId: copyId(e.targetId),
        layerId: command.type === 'paste' ? command.layerId : e.layerId,
        waypoints: e.waypoints.map((p) => ({
          ...p,
          x: p.x + command.offset.x,
          y: p.y + command.offset.y,
        })),
      };
    });
    nodes = [...nodes, ...copiedNodes];
    connections = [...connections, ...copiedEdges];
  } else if (command.type === 'updateNode') {
    const n = node(command.id);
    text(command.text);
    if (
      command.richText &&
      (!isRichText(command.richText) ||
        plainText(command.richText) !== command.text)
    )
      throw new EditError('invalid');
    if (!command.richText && readRichText(n) && command.text !== n.content.text)
      throw new EditError('unsupported');
    if (command.geometry)
      assertGeometry(
        command.geometry,
        isDrawing(n.kind),
        command.geometry.width !== n.geometry.width ||
          command.geometry.height !== n.geometry.height,
      );
    if (
      [command.startArrow, command.endArrow].some(
        (v) => v !== undefined && typeof v !== 'boolean',
      )
    )
      throw new EditError('invalid');
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
            geometry: command.geometry
              ? { ...item.geometry, ...command.geometry }
              : item.geometry,
            content: { ...item.content, text: command.text },
            extensions: {
              ...item.extensions,
              ...(command.richText
                ? { [RICH_TEXT_KEY]: richTextJson(command.richText) }
                : {}),
              ...(isDrawing(item.kind) &&
              (command.startArrow !== undefined ||
                command.endArrow !== undefined)
                ? {
                    [LINE_KEY]: {
                      ...jsonObject(item.extensions[LINE_KEY]),
                      version: 1,
                      ...(command.startArrow !== undefined
                        ? { startArrow: command.startArrow }
                        : {}),
                      ...(command.endArrow !== undefined
                        ? { endArrow: command.endArrow }
                        : {}),
                    },
                  }
                : {}),
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
    if (
      command.richText &&
      (!isRichText(command.richText) ||
        plainText(command.richText) !== command.options.label)
    )
      throw new EditError('invalid');
    if (
      !command.richText &&
      readRichText(edge) &&
      command.options.label !== readConnection(edge).label
    )
      throw new EditError('unsupported');
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
              ...(command.richText
                ? { [RICH_TEXT_KEY]: richTextJson(command.richText) }
                : {}),
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

export function assertGeometry(
  g: Geometry,
  line = false,
  minimum = true,
): void {
  if (
    ![g.x, g.y, g.width, g.height, g.rotation].every(
      (v) => Number.isFinite(v) && Math.abs(v) <= 1e12,
    ) ||
    g.width < (minimum ? MIN_SIZE : 0) ||
    g.height < (minimum ? (line ? 1 : MIN_SIZE) : 0)
  )
    throw new EditError('invalid');
}
export function copyElements(
  page: Page,
  selected: readonly string[],
): { nodes: Node[]; connections: Connection[] } {
  const ids = new Set(selected),
    layers = layerStates(page.layers);
  const nodes = page.nodes.filter((n) => ids.has(n.id));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const connections = page.connections.filter(
    (e) =>
      ids.has(e.id) || (nodeIds.has(e.sourceId) && nodeIds.has(e.targetId)),
  );
  for (const item of [...nodes, ...connections]) {
    if (!layers.get(item.layerId)?.editable) throw new EditError('layer');
    assertEditableElement(item);
  }
  if (
    !nodes.length ||
    connections.some(
      (e) => !nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId),
    )
  )
    throw new EditError('endpoint');
  return { nodes, connections };
}
export function renameProject(
  project: Project,
  name: string,
  now: string,
): Project {
  const title = name.trim();
  if (
    !title ||
    title.length > 1024 ||
    Array.from(title).some(
      (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
    )
  )
    throw new EditError('invalid');
  if (title === project.manifest.title) return project;
  const next = {
    ...project,
    manifest: {
      ...project.manifest,
      title,
      updatedAt: new Date(
        Math.max(Date.parse(now), Date.parse(project.manifest.updatedAt)),
      ).toISOString(),
    },
  };
  validateProject(next);
  return next;
}
