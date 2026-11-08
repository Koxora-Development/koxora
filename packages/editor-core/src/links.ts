import {
  safeExternalUrl,
  isId,
  type Action,
  type Connection,
  type Page,
  type Project,
  type Json,
} from '@koxora/project';

export const LINK_KEY = 'org.koxora.link';
export type LinkTarget =
  { type: 'url'; url: string } | { type: 'page'; pageId: string };
export type LinkState =
  | { state: 'none' }
  | { state: 'unsupported' }
  | { state: 'ready'; target: LinkTarget };
export interface LinkChange {
  target: LinkTarget | null;
  actionId: string;
}
function object(
  value: Json | undefined,
): Record<string, Json | undefined> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null;
}
export function actionLink(action: Action): LinkTarget | null {
  if (
    action.trigger !== 'click' ||
    Object.keys(action).some(
      (k) =>
        ![
          'id',
          'targetId',
          'trigger',
          'operation',
          'parameters',
          'extensions',
        ].includes(k),
    ) ||
    Object.keys(action.parameters).length !== 1
  )
    return null;
  if (action.operation === 'url' && safeExternalUrl(action.parameters.url))
    return { type: 'url', url: action.parameters.url as string };
  if (action.operation === 'navigate' && isId(action.parameters.pageId))
    return { type: 'page', pageId: action.parameters.pageId };
  return null;
}
export function connectionLink(edge: Connection): LinkState {
  const raw = edge.extensions[LINK_KEY];
  if (raw === undefined) return { state: 'none' };
  const value = object(raw);
  if (value?.version !== 1 || Object.keys(value).length !== 3)
    return { state: 'unsupported' };
  if (value.type === 'url' && safeExternalUrl(value.url))
    return {
      state: 'ready',
      target: { type: 'url', url: value.url as string },
    };
  if (value.type === 'page' && isId(value.pageId))
    return { state: 'ready', target: { type: 'page', pageId: value.pageId } };
  return { state: 'unsupported' };
}
function actionState(actions: Action[]): LinkState {
  if (!actions.length) return { state: 'none' };
  const target = actions.length === 1 ? actionLink(actions[0]) : null;
  return target ? { state: 'ready', target } : { state: 'unsupported' };
}
export function elementLink(project: Project, id: string): LinkState {
  const edge = project.documents
    .flatMap((d) => d.pages)
    .flatMap((p) => p.connections)
    .find((e) => e.id === id);
  if (edge) return connectionLink(edge);
  return actionState(
    project.documents
      .flatMap((d) => d.actions)
      .filter(
        (a) => a.targetId === id && ['url', 'navigate'].includes(a.operation),
      ),
  );
}
/** Index active-page links in one pass over project actions per project revision. */
export function pageLinks(
  project: Project,
  page: Page,
): Map<string, LinkState> {
  const ids = new Set(page.nodes.map((n) => n.id)),
    actions = new Map<string, Action[]>();
  for (const d of project.documents)
    for (const a of d.actions) {
      if (!ids.has(a.targetId) || !['url', 'navigate'].includes(a.operation))
        continue;
      const list = actions.get(a.targetId) ?? [];
      list.push(a);
      actions.set(a.targetId, list);
    }
  const result = new Map(
    [...actions].map(([id, list]) => [id, actionState(list)]),
  );
  for (const edge of page.connections) {
    const link = connectionLink(edge);
    if (link.state !== 'none') result.set(edge.id, link);
  }
  return result;
}
/** Runs within an editable-element transaction. Keep unrelated fields and action order. */
export function writeElementLink(
  project: Project,
  id: string,
  change: LinkChange,
): Project {
  if (elementLink(project, id).state === 'unsupported')
    throw new Error('unsupportedLink');
  const target = change.target;
  if (
    target &&
    (target.type === 'url'
      ? !safeExternalUrl(target.url)
      : !project.documents.some((d) =>
          d.pages.some((p) => p.id === target.pageId),
        ))
  )
    throw new Error('invalidLink');
  const owner = project.documents.find((d) =>
    d.pages.some((p) => p.nodes.some((n) => n.id === id)),
  );
  const existing = project.documents
    .flatMap((d) => d.actions)
    .find(
      (a) => a.targetId === id && ['url', 'navigate'].includes(a.operation),
    );
  const replacement: Action | null = target
    ? {
        ...existing,
        id: existing?.id ?? change.actionId,
        targetId: id,
        trigger: 'click',
        operation: target.type === 'url' ? 'url' : 'navigate',
        parameters:
          target.type === 'url'
            ? { url: target.url }
            : { pageId: target.pageId },
        extensions: existing?.extensions ?? {},
      }
    : null;
  return {
    ...project,
    documents: project.documents.map((d) => ({
      ...d,
      actions: !owner
        ? d.actions
        : existing
          ? d.actions.flatMap((a) =>
              a !== existing ? [a] : replacement ? [replacement] : [],
            )
          : replacement && d === owner
            ? [...d.actions, replacement]
            : d.actions,
      pages: owner
        ? d.pages
        : d.pages.map((p) => ({
            ...p,
            connections: p.connections.map((e) => {
              if (e.id !== id) return e;
              const extensions = { ...e.extensions };
              if (target) extensions[LINK_KEY] = { version: 1, ...target };
              else delete extensions[LINK_KEY];
              return { ...e, extensions };
            }),
          })),
    })),
  };
}
export function remapConnectionLink(
  edge: Connection,
  ids: Record<string, string>,
): Connection {
  const link = connectionLink(edge);
  return link.state === 'ready' &&
    link.target.type === 'page' &&
    ids[link.target.pageId]
    ? {
        ...edge,
        extensions: {
          ...edge.extensions,
          [LINK_KEY]: {
            version: 1,
            type: 'page',
            pageId: ids[link.target.pageId],
          },
        },
      }
    : edge;
}
