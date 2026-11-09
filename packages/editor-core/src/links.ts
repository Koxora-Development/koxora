import {
  safeExternalUrl,
  isId,
  type Action,
  type Connection,
  type Page,
  type Project,
  type Json,
  type Node,
} from '@koxora/project';

export const LINK_KEY = 'org.koxora.link';
export const LINK_SOURCE_KEY = 'org.koxora.link-source';
export type LinkTarget =
  | { type: 'url'; url: string }
  | { type: 'page'; pageId: string }
  | { type: 'element'; pageId: string; elementId: string }
  | { type: 'project'; projectId: string; pageId?: string; elementId?: string };
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
function extendedLink(raw: Json | undefined): LinkState {
  if (raw === undefined) return { state: 'none' };
  const value = object(raw);
  if (!value || value.version !== 2) return { state: 'unsupported' };
  if (
    value.type === 'element' &&
    Object.keys(value).length === 4 &&
    isId(value.pageId) &&
    isId(value.elementId)
  )
    return {
      state: 'ready',
      target: {
        type: 'element',
        pageId: value.pageId,
        elementId: value.elementId,
      },
    };
  if (
    value.type === 'project' &&
    isId(value.projectId) &&
    Object.keys(value).every((k) =>
      ['version', 'type', 'projectId', 'pageId', 'elementId'].includes(k),
    ) &&
    (value.pageId === undefined || isId(value.pageId)) &&
    (value.elementId === undefined ||
      (isId(value.elementId) && isId(value.pageId)))
  )
    return {
      state: 'ready',
      target: {
        type: 'project',
        projectId: value.projectId,
        ...(value.pageId ? { pageId: value.pageId as string } : {}),
        ...(value.elementId ? { elementId: value.elementId as string } : {}),
      },
    };
  return { state: 'unsupported' };
}
export function connectionLink(edge: Connection): LinkState {
  const raw = edge.extensions[LINK_KEY];
  if (raw === undefined) return { state: 'none' };
  const value = object(raw);
  if (value?.version === 2) return extendedLink(raw);
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
/** Authoring validates local references; missing imported targets remain preserved/inert until followed. */
export function validLinkTarget(
  project: Project,
  target: LinkTarget | null,
): boolean {
  if (!target) return true;
  if (target.type === 'url') return !!safeExternalUrl(target.url);
  if (target.type === 'project')
    return (
      isId(target.projectId) &&
      (target.pageId === undefined || isId(target.pageId)) &&
      (target.elementId === undefined ||
        (isId(target.pageId) && isId(target.elementId)))
    );
  const page = project.documents
    .flatMap((d) => d.pages)
    .find((p) => p.id === target.pageId);
  return (
    !!page &&
    (target.type === 'page' ||
      [...page.nodes, ...page.connections].some(
        (n) => n.id === target.elementId,
      ))
  );
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
  const actions = project.documents
    .flatMap((d) => d.actions)
    .filter(
      (a) => a.targetId === id && ['url', 'navigate'].includes(a.operation),
    );
  const node = project.documents
    .flatMap((d) => d.pages)
    .flatMap((p) => p.nodes)
    .find((n) => n.id === id);
  const extended = extendedLink(node?.extensions[LINK_KEY]);
  return extended.state === 'none'
    ? actionState(actions)
    : actions.length
      ? { state: 'unsupported' }
      : extended;
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
  for (const node of page.nodes) {
    const extended = extendedLink(node.extensions[LINK_KEY]);
    if (extended.state !== 'none')
      result.set(
        node.id,
        actions.has(node.id) ? { state: 'unsupported' } : extended,
      );
  }
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
  if (!validLinkTarget(project, target)) throw new Error('invalidLink');
  const owner = project.documents.find((d) =>
    d.pages.some((p) => p.nodes.some((n) => n.id === id)),
  );
  const existing = project.documents
    .flatMap((d) => d.actions)
    .find(
      (a) => a.targetId === id && ['url', 'navigate'].includes(a.operation),
    );
  const legacy = target?.type === 'url' || target?.type === 'page';
  const replacement: Action | null = legacy
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
  function update<T extends Node | Connection>(item: T, edge: boolean): T {
    if (item.id !== id) return item;
    const extensions = { ...item.extensions };
    if (
      !edge &&
      !legacy &&
      existing &&
      Object.keys(existing.extensions).length
    ) {
      extensions[LINK_SOURCE_KEY] = {
        version: 1,
        previous: extensions[LINK_SOURCE_KEY] ?? null,
        action: existing as unknown as Json,
      };
    }
    if (!target || (legacy && !edge)) delete extensions[LINK_KEY];
    else extensions[LINK_KEY] = { version: legacy ? 1 : 2, ...target };
    return { ...item, extensions };
  }
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
      pages: d.pages.map((p) => ({
        ...p,
        nodes: p.nodes.map((n) => update(n, false)),
        connections: p.connections.map((e) => update(e, true)),
      })),
    })),
  };
}
/** Remap only known same-project targets when cloning elements/pages. Cross-project IDs stay explicit. */
export function remapElementLink<T extends Node | Connection>(
  item: T,
  ids: Record<string, string>,
): T {
  const link = extendedLink(item.extensions[LINK_KEY]);
  if (link.state !== 'ready' || link.target.type !== 'element') return item;
  const target = link.target;
  return {
    ...item,
    extensions: {
      ...item.extensions,
      [LINK_KEY]: {
        version: 2,
        ...target,
        pageId: ids[target.pageId] ?? target.pageId,
        elementId: ids[target.elementId] ?? target.elementId,
      },
    },
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
    : remapElementLink(edge, ids);
}
