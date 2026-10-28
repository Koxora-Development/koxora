import {
  documentDelta,
  restoreDocuments,
  type DocumentDelta,
} from './document-delta';
import {
  synchronizeIndexes,
  validateProject,
  type Project,
} from '@koxora/project';
import { applyEdit, type EditCommand } from './editing';
import { applyWorkbook, WorkbookError, type WorkbookCommand } from './workbook';
import { activePageId, selectPage } from './project-view';
interface Entry {
  delta: DocumentDelta;
  beforePage: string;
  afterPage: string;
  bytes: number;
}
/** Chronological workbook history: deleting a page and its earlier edits can both be undone.
 * Binary resources are never retained. Camera changes do not consume history entries.
 */
export class StudioHistory {
  private undo: Entry[] = [];
  private redo: Entry[] = [];
  private projectId = '';
  constructor(
    readonly maxEntries = 100,
    readonly maxBytes = 16 * 1024 * 1024,
  ) {}
  clear() {
    this.undo = [];
    this.redo = [];
    this.projectId = '';
  }
  status(_project?: Project, _documentId?: string, _pageId?: string) {
    void _project;
    void _documentId;
    void _pageId;
    return { undo: this.undo.length, redo: this.redo.length };
  }
  private record(
    before: Project,
    after: Project,
    beforePage: string,
    afterPage: string,
  ): Project {
    const delta = documentDelta(before.documents, after.documents);
    if (!delta.length) return before;
    const bytes = JSON.stringify(delta).length * 2;
    if (bytes > this.maxBytes) throw new WorkbookError('historyLimit');
    if (this.projectId !== before.manifest.projectId) this.clear();
    this.projectId = before.manifest.projectId;
    this.redo = [];
    this.undo.push({
      delta,
      beforePage,
      afterPage,
      bytes,
    });
    while (
      this.undo.length > this.maxEntries ||
      this.undo.reduce((n, e) => n + e.bytes, 0) > this.maxBytes
    )
      this.undo.shift();
    return after;
  }
  execute(
    project: Project,
    documentId: string,
    pageId: string,
    command: EditCommand,
    now: string,
  ) {
    return this.record(
      project,
      applyEdit(project, documentId, pageId, command, now),
      pageId,
      pageId,
    );
  }
  workbook(
    project: Project,
    command: WorkbookCommand,
    makeId: () => string,
    now: string,
  ) {
    const next = applyWorkbook(project, command, makeId, now);
    return this.record(
      project,
      next,
      activePageId(project),
      activePageId(next),
    );
  }
  travel(
    project: Project,
    _documentId: string,
    _pageId: string,
    direction: 'undo' | 'redo',
    now: string,
  ): Project {
    if (this.projectId !== project.manifest.projectId) return project;
    const from = direction === 'undo' ? this.undo : this.redo,
      to = direction === 'undo' ? this.redo : this.undo;
    const entry = from.at(-1);
    if (!entry) return project;
    const views = new Map(
      project.documents.flatMap((d) => d.pages).map((p) => [p.id, p]),
    );
    const documents = restoreDocuments(
      project.documents,
      entry.delta,
      direction === 'undo',
    ).map((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        const current = views.get(p.id);
        return current
          ? {
              ...p,
              viewport: current.viewport,
              presentation: current.presentation,
            }
          : p;
      }),
    }));
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
    const pageId = direction === 'undo' ? entry.beforePage : entry.afterPage;
    const doc = documents.find((d) => d.pages.some((p) => p.id === pageId));
    if (doc) next = selectPage(next, doc.id, pageId);
    validateProject(next);
    from.pop();
    to.push(entry);
    return next;
  }
}
