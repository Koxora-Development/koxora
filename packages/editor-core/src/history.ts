import {
  validateProject,
  type Project,
  type Node,
  type Connection,
  type Page,
} from '@koxora/project';
import { applyEdit, EditError, type EditCommand } from './editing';

type Element = Node | Connection;
interface Change<T extends Element> {
  id: string;
  before?: T;
  after?: T;
  beforeIndex: number;
  afterIndex: number;
}
interface Entry {
  nodes: Change<Node>[];
  connections: Change<Connection>[];
  extensions?: { before: Page['extensions']; after: Page['extensions'] };
  bytes: number;
  sequence: number;
}
interface Branch {
  undo: Entry[];
  redo: Entry[];
}
function changes<T extends Element>(before: T[], after: T[]): Change<T>[] {
  const b = new Map(before.map((item, index) => [item.id, { item, index }]));
  const a = new Map(after.map((item, index) => [item.id, { item, index }]));
  return [...new Set([...b.keys(), ...a.keys()])].flatMap((id) => {
    const old = b.get(id),
      next = a.get(id);
    return old?.item === next?.item ||
      JSON.stringify(old?.item) === JSON.stringify(next?.item)
      ? []
      : [
          {
            id,
            before: old?.item,
            after: next?.item,
            beforeIndex: old?.index ?? -1,
            afterIndex: next?.index ?? -1,
          },
        ];
  });
}
function restore<T extends Element>(
  items: T[],
  delta: Change<T>[],
  undo: boolean,
): T[] {
  const map = new Map(items.map((item) => [item.id, item]));
  for (const change of delta) {
    const expected = undo ? change.after : change.before;
    if (JSON.stringify(map.get(change.id)) !== JSON.stringify(expected))
      throw new EditError('invalid');
  }
  const ids = new Set(delta.map((c) => c.id));
  const next = items.filter((item) => !ids.has(item.id));
  const inserted = delta
    .map((c) => ({
      item: undo ? c.before : c.after,
      index: undo ? c.beforeIndex : c.afterIndex,
    }))
    .filter((c) => c.item)
    .sort((a, b) => a.index - b.index);
  for (const c of inserted) next.splice(c.index, 0, c.item!);
  return next;
}
/** Session-only reversible document commands. Stores changed elements, never project/assets snapshots. */
export class CommandHistory {
  private branches = new Map<string, Branch>();
  private sequence = 0;
  constructor(
    readonly maxEntries = 100,
    readonly maxBytes = 16 * 1024 * 1024,
  ) {}
  private key(project: Project, documentId: string, pageId: string) {
    return `${project.manifest.projectId}:${documentId}:${pageId}`;
  }
  clear() {
    this.branches.clear();
  }
  status(project: Project, documentId: string, pageId: string) {
    const b = this.branches.get(this.key(project, documentId, pageId));
    return { undo: b?.undo.length ?? 0, redo: b?.redo.length ?? 0 };
  }
  execute(
    project: Project,
    documentId: string,
    pageId: string,
    command: EditCommand,
    now: string,
  ): Project {
    const next = applyEdit(project, documentId, pageId, command, now);
    const before = project.documents
      .find((d) => d.id === documentId)!
      .pages.find((p) => p.id === pageId)!;
    const after = next.documents
      .find((d) => d.id === documentId)!
      .pages.find((p) => p.id === pageId)!;
    const delta = {
      nodes: changes(before.nodes, after.nodes),
      connections: changes(before.connections, after.connections),
      ...(JSON.stringify(before.extensions) !== JSON.stringify(after.extensions)
        ? { extensions: { before: before.extensions, after: after.extensions } }
        : {}),
    };
    if (!delta.nodes.length && !delta.connections.length && !delta.extensions)
      return project;
    const key = this.key(project, documentId, pageId);
    const branch = this.branches.get(key) ?? { undo: [], redo: [] };
    branch.redo = [];
    const bytes = JSON.stringify(delta).length * 2;
    // A command larger than the budget is applied, but cannot leave an invalid older undo chain.
    if (bytes > this.maxBytes) branch.undo = [];
    else branch.undo.push({ ...delta, bytes, sequence: ++this.sequence });
    this.branches.set(key, branch);
    this.trim();
    return next;
  }
  private trim() {
    let entries = [...this.branches.values()].flatMap((b) => [
      ...b.undo,
      ...b.redo,
    ]);
    while (
      entries.length > this.maxEntries ||
      entries.reduce((n, e) => n + e.bytes, 0) > this.maxBytes
    ) {
      const oldest = entries.reduce((a, b) =>
        a.sequence < b.sequence ? a : b,
      );
      for (const b of this.branches.values()) {
        b.undo = b.undo.filter((e) => e !== oldest);
        // Redo is a chain: evict it together if its prerequisite is evicted.
        if (b.redo.includes(oldest)) b.redo = [];
      }
      entries = [...this.branches.values()].flatMap((b) => [
        ...b.undo,
        ...b.redo,
      ]);
    }
  }
  travel(
    project: Project,
    documentId: string,
    pageId: string,
    direction: 'undo' | 'redo',
    now: string,
  ): Project {
    const b = this.branches.get(this.key(project, documentId, pageId));
    const entry = b?.[direction].at(-1);
    if (!entry || !b) return project;
    const page = project.documents
      .find((d) => d.id === documentId)
      ?.pages.find((p) => p.id === pageId);
    if (!page) throw new EditError('invalid');
    const undo = direction === 'undo';
    if (
      entry.extensions &&
      JSON.stringify(page.extensions) !==
        JSON.stringify(undo ? entry.extensions.after : entry.extensions.before)
    )
      throw new EditError('invalid');
    const restored = {
      ...page,
      extensions: entry.extensions
        ? undo
          ? entry.extensions.before
          : entry.extensions.after
        : page.extensions,
      nodes: restore(page.nodes, entry.nodes, undo),
      connections: restore(page.connections, entry.connections, undo),
    };
    const next: Project = {
      ...project,
      manifest: {
        ...project.manifest,
        updatedAt: new Date(
          Math.max(Date.parse(now), Date.parse(project.manifest.updatedAt)),
        ).toISOString(),
      },
      documents: project.documents.map((d) =>
        d.id === documentId
          ? {
              ...d,
              pages: d.pages.map((p) => (p.id === pageId ? restored : p)),
            }
          : d,
      ),
    };
    validateProject(next);
    b[direction].pop();
    b[undo ? 'redo' : 'undo'].push(entry);
    return next;
  }
}
