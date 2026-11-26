import {
  documentDelta,
  restoreDocuments,
  type DocumentDelta,
} from './document-delta';
import {
  exportProject,
  ProjectError,
  synchronizeIndexes,
  validateProject,
  type Dataset,
  type Index,
  type Project,
  type Resource,
} from '@koxora/project';
import { applyEdit, type EditCommand } from './editing';
import { applyWorkbook, WorkbookError, type WorkbookCommand } from './workbook';
import { activePageId, selectPage } from './project-view';
interface DocumentEntry {
  delta: DocumentDelta;
  beforePage: string;
  afterPage: string;
  bytes: number;
}
interface DatasetDelta {
  operation: 'add' | 'remove';
  index: number;
  dataset: Dataset;
  indexItem?: Index['items'][number];
  resource?: Resource;
}
type Entry = DocumentEntry | { dataset: DatasetDelta; bytes: number };
interface EditGroup {
  id: string;
  documentId: string;
  pageId: string;
  at: number;
}
export type GroupedEditCommand = EditCommand & { historyGroup?: string };

function applyDatasetDelta(
  project: Project,
  change: DatasetDelta,
  undo: boolean,
  now: string,
): Project {
  const { dataset, index, indexItem, resource } = change;
  const path = `datasets/${dataset.id}.json`;
  const add = (change.operation === 'add') !== undo;
  const datasets = [...project.datasets];
  const resources = { ...project.manifest.resources };
  let indexes = project.indexes;
  if (add) {
    if (
      index > datasets.length ||
      datasets.some((item) => item.id === dataset.id) ||
      Object.hasOwn(project.files, path) ||
      Object.hasOwn(resources, path)
    )
      throw new WorkbookError('invalid');
    datasets.splice(index, 0, dataset);
    if (resource) resources[path] = resource;
    if (indexItem) {
      const datasetIndex = indexes.datasets;
      indexes = {
        ...indexes,
        datasets: {
          ...datasetIndex,
          items: [...datasetIndex.items, indexItem],
        },
      };
    }
  } else {
    if (JSON.stringify(datasets[index]) !== JSON.stringify(dataset))
      throw new WorkbookError('invalid');
    datasets.splice(index, 1);
    delete resources[path];
  }
  const next = synchronizeIndexes({
    ...project,
    datasets,
    indexes,
    manifest: {
      ...project.manifest,
      resources,
      updatedAt: new Date(
        Math.max(Date.parse(now), Date.parse(project.manifest.updatedAt)),
      ).toISOString(),
    },
  });
  try {
    validateProject(next);
  } catch (error) {
    if (
      !add &&
      error instanceof ProjectError &&
      (error.reason === 'datasetReference' || error.reason === 'reference')
    )
      throw new WorkbookError('references');
    throw error;
  }
  return next;
}

/** Group IDs describe one live field/session; this metadata never enters project data. */
export function groupEdit<T extends EditCommand>(
  command: T,
  historyGroup: string,
): T & { historyGroup: string } {
  return { ...command, historyGroup };
}
/** Chronological workbook history: deleting a page and its earlier edits can both be undone.
 * Binary resources are never retained. Camera changes do not consume history entries.
 */
export class StudioHistory {
  private undo: Entry[] = [];
  private redo: Entry[] = [];
  private projectId = '';
  private group: (EditGroup & { entry: DocumentEntry }) | null = null;
  constructor(
    readonly maxEntries = 100,
    readonly maxBytes = 16 * 1024 * 1024,
  ) {}
  clear() {
    this.undo = [];
    this.redo = [];
    this.projectId = '';
    this.group = null;
  }
  status(_project?: Project, _documentId?: string, _pageId?: string) {
    void _project;
    void _documentId;
    void _pageId;
    return { undo: this.undo.length, redo: this.redo.length };
  }
  private append(projectId: string, entry: Entry | null, replace = false) {
    if (entry && entry.bytes > this.maxBytes)
      throw new WorkbookError('historyLimit');
    if (this.projectId !== projectId) this.clear();
    this.projectId = projectId;
    this.redo = [];
    this.group = null;
    if (replace) this.undo.pop();
    // Editing a field back to its original value leaves no artificial undo step.
    if (entry) this.undo.push(entry);
    while (
      this.undo.length > this.maxEntries ||
      this.undo.reduce((n, e) => n + e.bytes, 0) > this.maxBytes
    )
      this.undo.shift();
  }
  private record(
    before: Project,
    after: Project,
    beforePage: string,
    afterPage: string,
    group?: EditGroup,
  ): Project {
    const last = this.undo.at(-1);
    const previous = last && 'delta' in last ? last : undefined;
    const coalesce =
      group &&
      this.group &&
      previous === this.group.entry &&
      this.projectId === before.manifest.projectId &&
      group.id === this.group.id &&
      group.documentId === this.group.documentId &&
      group.pageId === this.group.pageId &&
      group.at >= this.group.at &&
      group.at - this.group.at <= 1500;
    let delta = documentDelta(before.documents, after.documents);
    if (!delta.length) {
      // Even a no-op command from another control ends a contiguous typing group.
      if (!coalesce) this.group = null;
      return before;
    }
    let replace = false;
    if (coalesce && previous) {
      try {
        const original = restoreDocuments(
          before.documents,
          previous.delta,
          true,
        );
        delta = documentDelta(original, after.documents);
        replace = true;
      } catch {
        // An externally changed field cannot be folded into an older baseline.
      }
    }
    const entry: DocumentEntry = {
      delta,
      beforePage: replace ? previous!.beforePage : beforePage,
      afterPage,
      bytes: JSON.stringify(delta).length * 2,
    };
    this.append(
      before.manifest.projectId,
      delta.length ? entry : null,
      replace,
    );
    this.group =
      group && this.undo.at(-1) === entry ? { ...group, entry } : null;
    return after;
  }
  execute(
    project: Project,
    documentId: string,
    pageId: string,
    command: GroupedEditCommand,
    now: string,
  ) {
    return this.record(
      project,
      applyEdit(project, documentId, pageId, command, now),
      pageId,
      pageId,
      typeof command.historyGroup === 'string' &&
        command.historyGroup.length > 0 &&
        command.historyGroup.length <= 256
        ? {
            id: command.historyGroup,
            documentId,
            pageId,
            at: Date.parse(now),
          }
        : undefined,
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
  async addDataset(
    project: Project,
    dataset: Dataset,
    now: string,
    canCommit?: () => boolean,
  ): Promise<Project> {
    const change: DatasetDelta = {
      operation: 'add',
      index: project.datasets.length,
      dataset: structuredClone(dataset),
    };
    const next = applyDatasetDelta(project, change, false, now);
    const entry: Entry = {
      dataset: change,
      bytes: JSON.stringify(change).length * 2,
    };
    if (entry.bytes > this.maxBytes) throw new WorkbookError('historyLimit');
    await exportProject(next);
    if (canCommit && !canCommit()) throw new ProjectError('conflict');
    this.append(project.manifest.projectId, entry);
    return next;
  }
  removeDataset(project: Project, id: string, now: string): Project {
    const index = project.datasets.findIndex((dataset) => dataset.id === id);
    if (index === -1) return project;
    const change: DatasetDelta = {
      operation: 'remove',
      index,
      dataset: project.datasets[index],
      indexItem: project.indexes.datasets.items.find((item) => item.id === id),
      resource: project.manifest.resources[`datasets/${id}.json`],
    };
    const next = applyDatasetDelta(project, change, false, now);
    this.append(project.manifest.projectId, {
      dataset: change,
      bytes: JSON.stringify(change).length * 2,
    });
    return next;
  }
  travel(
    project: Project,
    _documentId: string,
    _pageId: string,
    direction: 'undo' | 'redo',
    now: string,
  ): Project {
    this.group = null;
    if (this.projectId !== project.manifest.projectId) return project;
    const from = direction === 'undo' ? this.undo : this.redo,
      to = direction === 'undo' ? this.redo : this.undo;
    const entry = from.at(-1);
    if (!entry) return project;
    if ('dataset' in entry) {
      const next = applyDatasetDelta(
        project,
        entry.dataset,
        direction === 'undo',
        now,
      );
      from.pop();
      to.push(entry);
      return next;
    }
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
