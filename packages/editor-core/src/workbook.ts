import {
  createProject,
  synchronizeIndexes,
  validateProject,
  type Project,
  type Page,
} from '@koxora/project';
import { EditError } from './editing';
import { selectPage, activePageId } from './project-view';
import { STACK_KEY, readStackOrder } from './stacking';

export type WorkbookCommand =
  | { type: 'newPage'; documentId: string; title: string }
  | { type: 'newDocument'; title: string }
  | { type: 'renameDocument'; documentId: string; title: string }
  | { type: 'moveDocument'; documentId: string; index: number }
  | { type: 'deleteDocument'; documentId: string }
  | { type: 'renamePage'; pageId: string; title: string }
  | { type: 'duplicatePage'; pageId: string; title: string }
  | { type: 'deletePage'; pageId: string }
  | { type: 'movePage'; pageId: string; documentId: string; index: number };
export class WorkbookError extends Error {
  constructor(
    public code:
      'lastPage' | 'lastDocument' | 'references' | 'invalid' | 'historyLimit',
  ) {
    super(code);
  }
}
function title(value: string) {
  const v = value.trim();
  if (
    !v ||
    v.length > 1024 ||
    Array.from(v).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw new WorkbookError('invalid');
  return v;
}
function pageIds(page: Page) {
  return [
    page.id,
    ...page.layers.map((x) => x.id),
    ...page.nodes.map((x) => x.id),
    ...page.connections.map((x) => x.id),
    ...page.relationships.map((x) => x.id),
  ];
}
/** Page operations retain stable IDs. A duplicate remaps known identities, never arbitrary opaque JSON. */
export function applyWorkbook(
  project: Project,
  command: WorkbookCommand,
  makeId: () => string,
  now: string,
): Project {
  let documents = project.documents;
  let selected: { documentId: string; pageId: string } | undefined;
  if (command.type === 'newDocument') {
    const doc = createProject(title(command.title), makeId, now).documents[0];
    documents = [...documents, doc];
    selected = { documentId: doc.id, pageId: doc.pages[0].id };
  } else if (command.type === 'newPage') {
    const doc = documents.find((d) => d.id === command.documentId);
    if (!doc) throw new WorkbookError('invalid');
    const page = createProject(title(command.title), makeId, now).documents[0]
      .pages[0];
    documents = documents.map((d) =>
      d === doc ? { ...d, pages: [...d.pages, page] } : d,
    );
    selected = { documentId: doc.id, pageId: page.id };
  } else if (command.type === 'renameDocument') {
    if (!documents.some((d) => d.id === command.documentId))
      throw new WorkbookError('invalid');
    documents = documents.map((d) =>
      d.id === command.documentId ? { ...d, title: title(command.title) } : d,
    );
  } else if (command.type === 'moveDocument') {
    const doc = documents.find((d) => d.id === command.documentId);
    if (
      !doc ||
      !Number.isInteger(command.index) ||
      command.index < 0 ||
      command.index >= documents.length
    )
      throw new WorkbookError('invalid');
    documents = documents.filter((d) => d !== doc);
    documents.splice(command.index, 0, doc);
  } else if (command.type === 'deleteDocument') {
    if (documents.length === 1) throw new WorkbookError('lastDocument');
    const doc = documents.find((d) => d.id === command.documentId);
    if (!doc) throw new WorkbookError('invalid');
    const ids = new Set([
      doc.id,
      ...doc.pages.flatMap(pageIds),
      ...doc.styles.map((s) => s.id),
    ]);
    if (
      documents.some(
        (d) =>
          d !== doc &&
          (d.domainModels.some((m) => m.references.some((id) => ids.has(id))) ||
            d.actions.some(
              (a) =>
                ids.has(a.targetId) ||
                Object.values(a.parameters).some(
                  (v) => typeof v === 'string' && ids.has(v),
                ),
            ) ||
            d.animations.some((a) => ids.has(a.targetId)) ||
            d.pages.some((p) =>
              p.relationships.some(
                (r) => ids.has(r.sourceId) || ids.has(r.targetId),
              ),
            )),
      )
    )
      throw new WorkbookError('references');
    documents = documents.filter((d) => d !== doc);
    if (doc.pages.some((p) => p.id === activePageId(project)))
      selected = {
        documentId: documents[0].id,
        pageId: documents[0].pages[0].id,
      };
  } else {
    const source = documents.find((d) =>
      d.pages.some((p) => p.id === command.pageId),
    );
    const page = source?.pages.find((p) => p.id === command.pageId);
    if (!source || !page) throw new WorkbookError('invalid');
    const ids = new Set(pageIds(page));
    if (command.type === 'renamePage') {
      documents = documents.map((d) =>
        d !== source
          ? d
          : {
              ...d,
              pages: d.pages.map((p) =>
                p === page ? { ...p, title: title(command.title) } : p,
              ),
            },
      );
    } else if (command.type === 'duplicatePage') {
      // Specialized semantic models cannot safely be inferred for a copied page.
      if (
        documents.some((d) =>
          d.domainModels.some((m) => m.references.some((id) => ids.has(id))),
        )
      )
        throw new WorkbookError('references');
      const map = new Map(pageIds(page).map((id) => [id, makeId()]));
      const mapped = (id: string) => map.get(id) ?? id;
      const copy: Page = {
        ...page,
        extensions: {
          ...page.extensions,
          ...(readStackOrder(page)
            ? {
                [STACK_KEY]: {
                  version: 1,
                  ids: readStackOrder(page)!.map(mapped),
                },
              }
            : {}),
        },
        id: mapped(page.id),
        title: title(command.title),
        layers: page.layers.map((l) => ({
          ...l,
          id: mapped(l.id),
          ...(l.parentId ? { parentId: mapped(l.parentId) } : {}),
        })),
        nodes: page.nodes.map((n) => ({
          ...n,
          id: mapped(n.id),
          layerId: mapped(n.layerId),
        })),
        connections: page.connections.map((e) => ({
          ...e,
          id: mapped(e.id),
          layerId: mapped(e.layerId),
          sourceId: mapped(e.sourceId),
          targetId: mapped(e.targetId),
        })),
        relationships: page.relationships.map((r) => ({
          ...r,
          id: mapped(r.id),
          sourceId: mapped(r.sourceId),
          targetId: mapped(r.targetId),
        })),
      };
      const nodes = new Set(page.nodes.map((n) => n.id));
      documents = documents.map((d) =>
        d !== source
          ? d
          : {
              ...d,
              pages: d.pages.flatMap((p) => (p === page ? [p, copy] : [p])),
              actions: [
                ...d.actions,
                ...documents
                  .flatMap((doc) => doc.actions)
                  .filter((a) => nodes.has(a.targetId))
                  .map((a) => ({
                    ...a,
                    id: makeId(),
                    targetId: mapped(a.targetId),
                    parameters: {
                      ...a.parameters,
                      ...(typeof a.parameters.pageId === 'string'
                        ? { pageId: mapped(a.parameters.pageId) }
                        : {}),
                      ...(typeof a.parameters.nodeId === 'string'
                        ? { nodeId: mapped(a.parameters.nodeId) }
                        : {}),
                    },
                  })),
              ],
              animations: [
                ...d.animations,
                ...documents
                  .flatMap((doc) => doc.animations)
                  .filter((a) => nodes.has(a.targetId))
                  .map((a) => ({
                    ...a,
                    id: makeId(),
                    targetId: mapped(a.targetId),
                  })),
              ],
            },
      );
      selected = { documentId: source.id, pageId: copy.id };
    } else if (command.type === 'deletePage') {
      if (source.pages.length === 1) throw new WorkbookError('lastPage');
      // Protect declared semantic references, actions, animations and cross-page relationships.
      if (
        documents.some(
          (d) =>
            d.domainModels.some((m) =>
              m.references.some((id) => ids.has(id)),
            ) ||
            d.actions.some(
              (a) =>
                ids.has(a.targetId) ||
                Object.values(a.parameters).some(
                  (v) => typeof v === 'string' && ids.has(v),
                ),
            ) ||
            d.animations.some((a) => ids.has(a.targetId)) ||
            d.pages.some(
              (p) =>
                p !== page &&
                p.relationships.some(
                  (r) => ids.has(r.sourceId) || ids.has(r.targetId),
                ),
            ),
        )
      )
        throw new WorkbookError('references');
      documents = documents.map((d) =>
        d !== source ? d : { ...d, pages: d.pages.filter((p) => p !== page) },
      );
      const index = source.pages.indexOf(page);
      if (page.id === activePageId(project))
        selected = {
          documentId: source.id,
          pageId: source.pages[index ? index - 1 : 1].id,
        };
    } else {
      const target = documents.find((d) => d.id === command.documentId);
      if (
        !target ||
        !Number.isInteger(command.index) ||
        command.index < 0 ||
        command.index > target.pages.length
      )
        throw new WorkbookError('invalid');
      if (target !== source && source.pages.length === 1)
        throw new WorkbookError('lastPage');
      if (
        target !== source &&
        documents.some((d) =>
          d.domainModels.some((m) => m.references.some((id) => ids.has(id))),
        )
      )
        throw new WorkbookError('references');
      documents = documents.map((d) => {
        if (d !== source && d !== target) return d;
        const pages = d.pages.filter((p) => p !== page);
        if (d === target)
          pages.splice(Math.min(command.index, pages.length), 0, page);
        return { ...d, pages };
      });
      // Action/animation ownership is retained: v1 targets are project-scoped.
      selected = { documentId: target.id, pageId: page.id };
    }
  }
  if (JSON.stringify(documents) === JSON.stringify(project.documents))
    return project;
  let next = synchronizeIndexes({
    ...project,
    documents,
    manifest: {
      ...project.manifest,
      updatedAt: new Date(
        Math.max(Date.parse(now), Date.parse(project.manifest.updatedAt)),
      ).toISOString(),
    },
  });
  if (selected) next = selectPage(next, selected.documentId, selected.pageId);
  try {
    validateProject(next);
  } catch (error) {
    if (error instanceof EditError) throw error;
    throw new WorkbookError('references');
  }
  return next;
}
