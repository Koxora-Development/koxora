import {
  validateProject,
  type Document,
  type DomainModel,
  type Node,
  type Project,
} from '@koxora/project';
import { applyEdit, assertEditableElement, EditError } from './editing';
import { DEFAULT_CONNECTION } from './connections';
import { geometryBounds, layerStates, type Geometry } from './shapes';
import type { Bounds } from './viewport';

export const MINDMAP_NAMESPACE = 'org.koxora.mindmap';
export interface MindMap {
  parents: Record<string, string | null>;
  roots: string[];
}
export type MindMapCommand =
  | {
      type: 'mindmapAdd';
      id: string;
      connectionId: string;
      parentId: string | null;
      layerId: string;
      text: string;
    }
  | { type: 'mindmapLayout' }
  | { type: 'mindmapDeleteBranch'; id: string };

/** A model is editable only when its entire forest belongs to this page. */
export function readMindMap(
  document: Document,
  pageId: string,
): MindMap | null {
  const models = document.domainModels.filter(
    (m) => m.namespace === MINDMAP_NAMESPACE,
  );
  if (models.length !== 1) return null;
  const model = models[0];
  if (model.schemaVersion !== '1.0.0') return null;
  const page = document.pages.find((p) => p.id === pageId);
  if (!page) return null;
  const raw = model.data.parents;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const roots = model.data.roots;
  if (!Array.isArray(roots) || !roots.every((id) => typeof id === 'string'))
    return null;
  const ids = new Set(page.nodes.map((n) => n.id));
  const parents: Record<string, string | null> = {};
  for (const [id, parent] of Object.entries(raw)) {
    if (!ids.has(id) || (parent !== null && typeof parent !== 'string'))
      return null;
    parents[id] = parent;
  }
  const actualRoots = Object.keys(parents).filter((id) => parents[id] === null);
  if (
    new Set(roots).size !== roots.length ||
    roots.length !== actualRoots.length ||
    roots.some((id) => parents[id] !== null)
  )
    return null;
  // Iterative marking is bounded for imported deep trees and detects cycles.
  const done = new Set<string>();
  for (const id of Object.keys(parents)) {
    let current: string | null = id;
    const path = new Set<string>();
    while (current !== null && !done.has(current)) {
      if (!Object.hasOwn(parents, current) || path.has(current)) return null;
      path.add(current);
      current = parents[current];
    }
    for (const entry of path) done.add(entry);
  }
  return { parents, roots: [...roots] };
}

function overlap(a: Bounds, b: Bounds, gap = 24): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

/** New topics avoid existing shapes without changing any manual positions. */
function insertionGeometry(nodes: Node[], parent?: Node): Geometry {
  const bounds = parent ? geometryBounds(parent.geometry) : null;
  const result: Geometry = {
    x: bounds ? bounds.x + bounds.width + 80 : 80,
    y: bounds ? bounds.y + bounds.height / 2 - 36 : 80,
    width: 180,
    height: 72,
    rotation: 0,
  };
  const obstacles = nodes
    .map((n) => geometryBounds(n.geometry))
    .sort((a, b) => a.y - b.y);
  for (const obstacle of obstacles)
    if (overlap(result, obstacle)) result.y = obstacle.y + obstacle.height + 32;
  return result;
}

/** Deterministic, iterative forest layout; no dependency or implicit execution. */
export function mindMapGeometries(
  nodes: Node[],
  map: MindMap,
): Record<string, Geometry> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>();
  // JSON object keys are canonicalized by export; node-array order survives round trips.
  for (const node of nodes) {
    const id = node.id;
    if (!Object.hasOwn(map.parents, id)) continue;
    const parent = map.parents[id];
    if (parent !== null) {
      const siblings = children.get(parent) ?? [];
      siblings.push(id);
      children.set(parent, siblings);
    }
  }
  const levels = new Map<string, number>();
  const order = [...map.roots];
  const widths: number[] = [];
  const bounds = new Map<string, Bounds>();
  for (const root of map.roots) levels.set(root, 0);
  for (let i = 0; i < order.length; i++) {
    const id = order[i],
      node = byId.get(id);
    if (!node || !Object.hasOwn(map.parents, id))
      throw new EditError('invalid');
    const box = geometryBounds(node.geometry);
    bounds.set(id, box);
    const level = levels.get(id)!;
    widths[level] = Math.max(widths[level] ?? 0, box.width);
    for (const child of children.get(id) ?? []) {
      if (levels.has(child)) throw new EditError('invalid');
      levels.set(child, level + 1);
      order.push(child);
    }
  }
  if (order.length !== Object.keys(map.parents).length)
    throw new EditError('invalid');
  if (!order.length) return {};
  const spans = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const descendants = children.get(id) ?? [];
    spans.set(
      id,
      Math.max(
        bounds.get(id)!.height,
        descendants.reduce((sum, child) => sum + spans.get(child)! + 32, -32),
      ),
    );
  }
  let originX = Infinity,
    originY = Infinity;
  for (const box of bounds.values()) {
    originX = Math.min(originX, box.x);
    originY = Math.min(originY, box.y);
  }
  const rounded = (value: number) => Math.round(value * 1e6) / 1e6;
  originX = rounded(originX);
  originY = rounded(originY);
  const xs = [originX];
  for (let i = 1; i < widths.length; i++)
    xs[i] = xs[i - 1] + widths[i - 1] + 80;
  const tops = new Map<string, number>();
  let top = originY;
  for (const root of map.roots) {
    tops.set(root, top);
    top += spans.get(root)! + 64;
  }
  const geometries: Record<string, Geometry> = {};
  for (const id of order) {
    const n = byId.get(id)!,
      box = bounds.get(id)!,
      span = spans.get(id)!,
      y = tops.get(id)!;
    geometries[id] = {
      ...n.geometry,
      x: xs[levels.get(id)!] + (box.width - n.geometry.width) / 2,
      y: y + span / 2 - n.geometry.height / 2,
    };
    const descendants = children.get(id) ?? [];
    const childSpan = descendants.reduce(
      (sum, child) => sum + spans.get(child)! + 32,
      -32,
    );
    let childTop = y + (span - childSpan) / 2;
    for (const child of descendants) {
      tops.set(child, childTop);
      childTop += spans.get(child)! + 32;
    }
  }
  // Keep generic annotations outside the rearranged topic forest.
  const forest = Object.values(geometries).map((g) => geometryBounds(g));
  const unrelated = nodes.filter((n) => !Object.hasOwn(map.parents, n.id));
  let shift = 0;
  for (const obstacle of unrelated
    .map((n) => geometryBounds(n.geometry))
    .sort((a, b) => a.y - b.y)) {
    if (forest.some((box) => overlap({ ...box, y: box.y + shift }, obstacle)))
      shift = obstacle.y + obstacle.height + 32 - originY;
  }
  if (shift)
    for (const geometry of Object.values(geometries)) geometry.y += shift;
  // Stable precision prevents floating-point drift from creating redundant history entries.
  for (const geometry of Object.values(geometries)) {
    geometry.x = rounded(geometry.x);
    geometry.y = rounded(geometry.y);
  }
  return geometries;
}

export function applyMindMap(
  project: Project,
  documentId: string,
  pageId: string,
  command: MindMapCommand,
  now: string,
): Project {
  const document = project.documents.find((d) => d.id === documentId),
    page = document?.pages.find((p) => p.id === pageId);
  if (!document || !page) throw new EditError('invalid');
  const models = document.domainModels.filter(
    (m) => m.namespace === MINDMAP_NAMESPACE,
  );
  const map = readMindMap(document, pageId);
  if (!map && (models.length || document.type !== 'mindmap'))
    throw new EditError('unsupported');
  if (!map && command.type !== 'mindmapAdd') throw new EditError('unsupported');
  const model: DomainModel = models[0] ?? {
    namespace: MINDMAP_NAMESPACE,
    schemaVersion: '1.0.0',
    required: true,
    references: [],
    data: { roots: [], parents: {} },
    extensions: {},
  };
  const parents = { ...(map?.parents ?? {}) },
    roots = [...(map?.roots ?? [])];
  const layers = layerStates(page.layers);
  const editable = (node: Node) => {
    if (!layers.get(node.layerId)?.editable) throw new EditError('layer');
    assertEditableElement(node);
    if (['line', 'arrow', 'freehand'].includes(node.kind))
      throw new EditError('unsupported');
  };
  const updateModel = (base: Project, references: string[]): Project => {
    const updated: DomainModel = {
      ...model,
      references,
      data: { ...model.data, roots, parents },
    };
    return {
      ...base,
      documents: base.documents.map((d) =>
        d.id !== documentId
          ? d
          : {
              ...d,
              domainModels: models.length
                ? d.domainModels.map((m) => (m === model ? updated : m))
                : [...d.domainModels, updated],
            },
      ),
    };
  };
  let next: Project;
  if (command.type === 'mindmapAdd') {
    let parent: Node | undefined;
    if (command.parentId !== null) {
      if (!Object.hasOwn(parents, command.parentId))
        throw new EditError('endpoint');
      parent = page.nodes.find((n) => n.id === command.parentId);
      if (!parent) throw new EditError('endpoint');
      editable(parent);
    }
    const geometry = insertionGeometry(page.nodes, parent);
    next = applyEdit(
      project,
      documentId,
      pageId,
      {
        type: 'insert',
        id: command.id,
        kind: 'rounded-rectangle',
        position: { x: geometry.x, y: geometry.y },
        geometry,
        layerId: command.layerId,
        text: command.text,
        snap: false,
      },
      now,
    );
    if (parent)
      next = applyEdit(
        next,
        documentId,
        pageId,
        {
          type: 'connect',
          id: command.connectionId,
          sourceId: parent.id,
          targetId: command.id,
          layerId: command.layerId,
          options: {
            ...DEFAULT_CONNECTION,
            arrow: false,
            routing: 'curved',
            sourceAnchor: 'east',
            targetAnchor: 'west',
          },
        },
        now,
      );
    parents[command.id] = command.parentId;
    if (command.parentId === null) roots.push(command.id);
    next = updateModel(next, [
      ...model.references,
      command.id,
      ...(parent ? [command.connectionId] : []),
    ]);
  } else if (command.type === 'mindmapLayout') {
    for (const n of page.nodes) if (Object.hasOwn(parents, n.id)) editable(n);
    for (const connection of page.connections)
      if (
        Object.hasOwn(parents, connection.sourceId) ||
        Object.hasOwn(parents, connection.targetId)
      ) {
        if (!layers.get(connection.layerId)?.editable)
          throw new EditError('layer');
        assertEditableElement(connection);
      }
    // Routing changes are not part of layout; preserve all existing connection data.
    const geometries = mindMapGeometries(page.nodes, map!);
    next = applyEdit(
      project,
      documentId,
      pageId,
      { type: 'transform', geometries },
      now,
    );
  } else {
    if (!Object.hasOwn(parents, command.id)) throw new EditError('endpoint');
    const removed = new Set<string>([command.id]);
    const children = new Map<string, string[]>();
    for (const [id, parent] of Object.entries(parents)) {
      if (parent === null) continue;
      const siblings = children.get(parent) ?? [];
      siblings.push(id);
      children.set(parent, siblings);
    }
    const pending = [command.id];
    for (let i = 0; i < pending.length; i++)
      for (const child of children.get(pending[i]) ?? []) {
        removed.add(child);
        pending.push(child);
      }
    const removedReferences = new Set(removed);
    for (const connection of page.connections)
      if (removed.has(connection.sourceId) || removed.has(connection.targetId))
        removedReferences.add(connection.id);
    for (const id of removed) delete parents[id];
    roots.splice(0, roots.length, ...roots.filter((id) => !removed.has(id)));
    const prepared = updateModel(
      project,
      model.references.filter((id) => !removedReferences.has(id)),
    );
    // Existing deletion guards protect actions, animations, relationships and other models.
    next = applyEdit(
      prepared,
      documentId,
      pageId,
      { type: 'delete', ids: [...removed] },
      now,
    );
  }
  validateProject(next);
  return next;
}
