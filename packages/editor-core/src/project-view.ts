import type { Json, Page, Project } from '@koxora/project';
import { normalizeCamera, type Camera } from './viewport';
export const CANVAS_KEY = 'org.koxora.canvas';
export const WORKSPACE_KEY = 'org.koxora.workspace';
export interface GridSettings {
  visible: boolean;
  snap: boolean;
  spacing: number;
}
export interface CanvasState {
  camera: Camera;
  grid: GridSettings;
}
const object = (value: Json | undefined): Record<string, Json> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : null;
function compatible(value: Json | undefined): boolean {
  return value === undefined || object(value)?.version === 1;
}
export function readCanvas(
  page: Page,
): CanvasState & { writable: boolean; adjusted: boolean } {
  const settings = object(page.presentation[CANVAS_KEY]);
  const camera = normalizeCamera(page.viewport);
  const spacing = settings?.spacing;
  return {
    camera,
    grid: {
      visible: typeof settings?.visible === 'boolean' ? settings.visible : true,
      snap: typeof settings?.snap === 'boolean' ? settings.snap : false,
      spacing:
        typeof spacing === 'number' &&
        spacing >= 1 &&
        spacing <= 1024 &&
        Number.isFinite(spacing)
          ? spacing
          : 24,
    },
    writable: compatible(page.presentation[CANVAS_KEY]),
    adjusted:
      camera.x !== page.viewport.x ||
      camera.y !== page.viewport.y ||
      camera.zoom !== page.viewport.zoom,
  };
}
export function activePageId(project: Project): string {
  const settings = object(project.manifest.extensions[WORKSPACE_KEY]);
  const document =
    settings?.version === 1
      ? project.documents.find((doc) => doc.id === settings.documentId)
      : undefined;
  return (
    document?.pages.find((page) => page.id === settings?.pageId)?.id ??
    project.documents[0].pages[0].id
  );
}
function updated(
  project: Project,
  documents = project.documents,
  extensions = project.manifest.extensions,
): Project {
  return {
    ...project,
    documents,
    manifest: {
      ...project.manifest,
      extensions,
      updatedAt: new Date(
        Math.max(Date.now(), Date.parse(project.manifest.updatedAt)),
      ).toISOString(),
    },
  };
}
export function selectPage(
  project: Project,
  documentId: string,
  pageId: string,
): Project {
  if (
    !project.documents.some(
      (doc) =>
        doc.id === documentId && doc.pages.some((page) => page.id === pageId),
    )
  )
    return project;
  const old = project.manifest.extensions[WORKSPACE_KEY];
  if (!compatible(old)) return project;
  const fields = object(old);
  if (fields?.documentId === documentId && fields?.pageId === pageId)
    return project;
  return updated(project, project.documents, {
    ...project.manifest.extensions,
    [WORKSPACE_KEY]: { ...fields, version: 1, documentId, pageId },
  });
}
export function writeCanvas(
  project: Project,
  documentId: string,
  pageId: string,
  state: CanvasState,
): Project {
  const document = project.documents.find((doc) => doc.id === documentId);
  const page = document?.pages.find((page) => page.id === pageId);
  if (!page || !readCanvas(page).writable) return project;
  const current = readCanvas(page);
  if (
    current.camera.x === state.camera.x &&
    current.camera.y === state.camera.y &&
    current.camera.zoom === state.camera.zoom &&
    current.grid.visible === state.grid.visible &&
    current.grid.snap === state.grid.snap &&
    current.grid.spacing === state.grid.spacing
  )
    return project;
  const camera = normalizeCamera(state.camera);
  const spacing = state.grid.spacing;
  if (!(Number.isFinite(spacing) && spacing >= 1 && spacing <= 1024))
    throw new RangeError('Invalid grid spacing');
  return updated(
    project,
    project.documents.map((doc) =>
      doc.id !== documentId
        ? doc
        : {
            ...doc,
            pages: doc.pages.map((item) =>
              item.id !== pageId
                ? item
                : {
                    ...item,
                    viewport:
                      current.camera.x === state.camera.x &&
                      current.camera.y === state.camera.y &&
                      current.camera.zoom === state.camera.zoom
                        ? item.viewport
                        : { ...item.viewport, ...camera },
                    presentation: {
                      ...item.presentation,
                      [CANVAS_KEY]: {
                        ...object(item.presentation[CANVAS_KEY]),
                        version: 1,
                        ...state.grid,
                      },
                    },
                  },
            ),
          },
    ),
  );
}
