import { useRef, useState, type KeyboardEvent } from 'react';
import { Dialog } from '@koxora/ui';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Project } from '@koxora/project';
import type { ProjectSummary } from '@koxora/persistence';
import type { WorkbookCommand } from '@koxora/editor-core';
import { ContextMenu } from './context-menu';
import { menuAnchor, type MenuAnchor } from './menu-anchor';

type Row = {
  kind: 'project' | 'document' | 'page';
  id: string;
  title: string;
  parent?: string;
  level: number;
  expanded?: boolean;
  dirty?: boolean;
};
type Action =
  | 'rename'
  | 'move'
  | 'deletePage'
  | 'deleteDocument'
  | 'deleteProject'
  | 'newDocument';
export type ProjectAction = 'rename' | 'duplicate' | 'delete' | 'restore';
export function ProjectTree({
  project,
  saved,
  pageId,
  items,
  trash,
  busy,
  locale,
  error,
  onOpen,
  onCreate,
  onSelect,
  onCommand,
  onProjectAction,
  onHistory,
}: {
  project: Project | null;
  saved: Project | null;
  pageId: string | null;
  items: ProjectSummary[];
  trash: ProjectSummary[];
  busy: boolean;
  locale: string;
  error: MessageKey | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onHistory: (direction: 'undo' | 'redo') => boolean;
  onSelect: (documentId: string, pageId: string) => void;
  onCommand: (command: WorkbookCommand) => boolean;
  onProjectAction: (
    action: ProjectAction,
    id: string,
    name?: string,
  ) => Promise<boolean>;
}) {
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    translate(locale, key, values);
  const root = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState<string | null>(pageId);
  const [menu, setMenu] = useState<{ row: Row; anchor: MenuAnchor } | null>(
    null,
  );
  const [dialog, setDialog] = useState<{ action: Action; row: Row } | null>(
    null,
  );
  const [name, setName] = useState(''),
    [target, setTarget] = useState(''),
    [position, setPosition] = useState(1);
  const [failed, setFailed] = useState(false),
    [submitting, setSubmitting] = useState(false);
  const dragged = useRef<Row | null>(null);
  const branch = `${project?.manifest.projectId ?? ''}:${pageId ?? ''}`;
  const [observedBranch, setObservedBranch] = useState('');
  if (project && branch !== observedBranch) {
    setObservedBranch(branch);
    const doc = project.documents.find((d) =>
      d.pages.some((p) => p.id === pageId),
    );
    setExpanded(
      (old) =>
        new Set([...old, project.manifest.projectId, ...(doc ? [doc.id] : [])]),
    );
    setFocused(pageId ?? project.manifest.projectId);
  }
  const local = [...items];
  if (project && !local.some((p) => p.id === project.manifest.projectId))
    local.unshift({
      id: project.manifest.projectId,
      title: project.manifest.title,
    });
  const rows: Row[] = local.flatMap((item) => {
    const active = item.id === project?.manifest.projectId;
    const row: Row = {
      kind: 'project',
      id: item.id,
      title: active
        ? project!.manifest.title
        : (item.title ?? t('project.unreadable')),
      level: 1,
      expanded: active && expanded.has(item.id),
      dirty: active && project !== saved,
    };
    if (!active || !row.expanded) return [row];
    return [
      row,
      ...project!.documents.flatMap((doc, index) => {
        const old = saved?.documents.find((d) => d.id === doc.id);
        const parent: Row = {
          kind: 'document',
          id: doc.id,
          title: doc.title,
          parent: item.id,
          level: 2,
          expanded: expanded.has(doc.id),
          dirty:
            old?.title !== doc.title || saved?.documents[index]?.id !== doc.id,
        };
        return [
          parent,
          ...(parent.expanded
            ? doc.pages.map((page, index): Row => ({
                kind: 'page',
                id: page.id,
                title: page.title,
                parent: doc.id,
                level: 3,
                dirty:
                  old?.pages[index]?.id !== page.id ||
                  (old?.pages.find((p) => p.id === page.id) !== page &&
                    JSON.stringify(old?.pages.find((p) => p.id === page.id)) !==
                      JSON.stringify(page)),
              }))
            : []),
        ];
      }),
    ];
  });
  const focus = (id: string) => {
    setFocused(id);
    requestAnimationFrame(() =>
      (
        root.current?.querySelector<HTMLElement>(`[data-tree-id="${id}"]`) ??
        root.current?.querySelector<HTMLElement>(
          '[role=treeitem][aria-selected=true]',
        ) ??
        root.current?.querySelector<HTMLButtonElement>('button')
      )?.focus(),
    );
  };
  function toggle(row: Row, open = !row.expanded) {
    if (row.kind === 'project') {
      onOpen(row.id);
      if (row.id !== project?.manifest.projectId) return;
    }
    setExpanded((old) => {
      const next = new Set(old);
      if (open) next.add(row.id);
      else next.delete(row.id);
      return next;
    });
  }
  function show(action: Action, row: Row) {
    setMenu(null);
    setDialog({ action, row });
    setName(row.title);
    setFailed(false);
    setTarget(row.parent ?? '');
    setPosition(
      (project?.documents
        .find((d) => d.id === row.parent)
        ?.pages.findIndex((p) => p.id === row.id) ?? 0) + 1,
    );
  }
  function close() {
    setDialog(null);
    setFailed(false);
    const id = dialog?.row.id ?? menu?.row.id ?? pageId;
    setMenu(null);
    if (id) focus(rows.some((r) => r.id === id) ? id : (pageId ?? rows[0]?.id));
  }
  function context(row: Row, anchor: MenuAnchor) {
    setMenu({ row, anchor });
  }
  function newPage(documentId: string) {
    const doc = project?.documents.find((d) => d.id === documentId);
    if (doc)
      onCommand({
        type: 'newPage',
        documentId,
        title: t('tabs.newPageName', { number: doc.pages.length + 1 }),
      });
    setMenu(null);
  }
  function canMove(row: Row, offset: number) {
    const siblings =
      row.kind === 'document'
        ? project?.documents
        : project?.documents.find((d) => d.id === row.parent)?.pages;
    const index = siblings?.findIndex((item) => item.id === row.id) ?? -1;
    return (
      index >= 0 &&
      index + offset >= 0 &&
      index + offset < (siblings?.length ?? 0)
    );
  }
  function move(row: Row, offset: number) {
    if (!project) return;
    const doc = project.documents.find(
      (d) => d.id === (row.kind === 'document' ? row.id : row.parent),
    );
    if (!doc) return;
    if (row.kind === 'document') {
      const index = project.documents.indexOf(doc) + offset;
      if (index >= 0 && index < project.documents.length)
        onCommand({ type: 'moveDocument', documentId: doc.id, index });
    } else {
      const index = doc.pages.findIndex((p) => p.id === row.id) + offset;
      if (index >= 0 && index < doc.pages.length)
        onCommand({
          type: 'movePage',
          pageId: row.id,
          documentId: doc.id,
          index,
        });
    }
    focus(row.id);
    setMenu(null);
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, row: Row) {
    if (busy) return;
    if (
      (event.ctrlKey || event.metaKey) &&
      ['z', 'y'].includes(event.key.toLowerCase())
    ) {
      event.preventDefault();
      event.stopPropagation();
      onHistory(
        event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo',
      );
    } else if (event.key === 'F2') {
      event.preventDefault();
      show('rename', row);
    } else if (
      event.key === 'ContextMenu' ||
      (event.shiftKey && event.key === 'F10')
    ) {
      event.preventDefault();
      context(row, menuAnchor(event.currentTarget));
    } else if (
      event.altKey &&
      ['ArrowUp', 'ArrowDown'].includes(event.key) &&
      row.kind !== 'project'
    ) {
      event.preventDefault();
      move(row, event.key === 'ArrowUp' ? -1 : 1);
    } else if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const index = rows.findIndex((r) => r.id === row.id);
      focus(
        rows[
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? rows.length - 1
              : Math.max(
                  0,
                  Math.min(
                    rows.length - 1,
                    index + (event.key === 'ArrowUp' ? -1 : 1),
                  ),
                )
        ].id,
      );
    } else if (event.key === 'ArrowRight' && row.kind !== 'page') {
      event.preventDefault();
      if (!row.expanded) toggle(row, true);
      else {
        const next = rows[rows.indexOf(row) + 1];
        if (next) focus(next.id);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (row.expanded) toggle(row, false);
      else if (row.parent) focus(row.parent);
    }
  }
  const moveInvalid =
    dialog?.action === 'move' &&
    target !== dialog.row.parent &&
    project?.documents.find((d) => d.id === dialog.row.parent)?.pages.length ===
      1;
  async function submit() {
    if (!dialog || moveInvalid) return;
    const { action, row } = dialog;
    setSubmitting(true);
    let ok: boolean;
    try {
      if (action === 'rename')
        ok =
          row.kind === 'project'
            ? await onProjectAction('rename', row.id, name)
            : onCommand(
                row.kind === 'document'
                  ? { type: 'renameDocument', documentId: row.id, title: name }
                  : { type: 'renamePage', pageId: row.id, title: name },
              );
      else if (action === 'newDocument')
        ok = onCommand({ type: 'newDocument', title: name });
      else if (action === 'move')
        ok = onCommand({
          type: 'movePage',
          pageId: row.id,
          documentId: target,
          index: position - 1,
        });
      else if (action === 'deletePage')
        ok = onCommand({ type: 'deletePage', pageId: row.id });
      else if (action === 'deleteDocument')
        ok = onCommand({ type: 'deleteDocument', documentId: row.id });
      else ok = await onProjectAction('delete', row.id);
      if (ok) close();
      else setFailed(true);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="project-tree-panel" ref={root}>
      <div className="tree-heading">
        <strong>{t('tree.heading')}</strong>
        <button
          className="button compact"
          disabled={busy}
          onClick={onCreate}
          aria-label={t('tree.newProject')}
        >
          {'＋'}
        </button>
      </div>
      <div
        role="tree"
        aria-label={t('tree.heading')}
        className="project-tree"
        aria-busy={busy}
      >
        {rows.map((row) => (
          <div
            key={row.id}
            role="none"
            className="tree-row"
            style={{ paddingInlineStart: (row.level - 1) * 14 }}
            onDragOver={(e) => {
              if (dragged.current && row.kind !== 'project') {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const source = dragged.current;
              dragged.current = null;
              if (!source || !project || busy) return;
              if (source.kind === 'document' && row.kind === 'document')
                onCommand({
                  type: 'moveDocument',
                  documentId: source.id,
                  index: project.documents.findIndex((d) => d.id === row.id),
                });
              else if (source.kind === 'page' && row.kind !== 'project') {
                const doc = project.documents.find(
                  (d) =>
                    d.id === (row.kind === 'document' ? row.id : row.parent),
                );
                if (doc)
                  onCommand({
                    type: 'movePage',
                    pageId: source.id,
                    documentId: doc.id,
                    index:
                      row.kind === 'page'
                        ? doc.pages.findIndex((p) => p.id === row.id)
                        : doc.pages.length,
                  });
              }
              focus(source.id);
            }}
          >
            <button
              type="button"
              role="treeitem"
              className={`tree-item ${row.id === pageId ? 'active' : ''}`}
              data-tree-id={row.id}
              data-page-id={row.kind === 'page' ? row.id : undefined}
              aria-label={row.title}
              aria-level={row.level}
              aria-expanded={row.expanded}
              aria-selected={row.id === pageId}
              title={`${row.title}${row.dirty ? ` · ${t('project.unsaved')}` : ''}`}
              aria-disabled={busy}
              tabIndex={
                row.id ===
                (rows.some((r) => r.id === focused) ? focused : rows[0]?.id)
                  ? 0
                  : -1
              }
              draggable={row.kind !== 'project' && !busy}
              onDragStart={(e) => {
                dragged.current = row;
                e.dataTransfer.setData('text/plain', row.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                dragged.current = null;
              }}
              onFocus={() => setFocused(row.id)}
              onKeyDown={(e) => key(e, row)}
              onClick={() =>
                busy
                  ? undefined
                  : row.kind === 'page'
                    ? onSelect(row.parent!, row.id)
                    : toggle(row)
              }
              onDoubleClick={() => {
                if (!busy) show('rename', row);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!busy) context(row, menuAnchor(e.currentTarget, e));
              }}
            >
              <span aria-hidden="true" className="tree-disclosure">
                {row.kind === 'page' ? '▫' : row.expanded ? '▾' : '▸'}
              </span>
              <span dir="auto" className="tree-name">
                {row.title}
              </span>
              {row.dirty && (
                <span className="tree-dirty" aria-hidden="true">
                  •
                </span>
              )}
            </button>
            <button
              className="tree-actions"
              aria-disabled={busy}
              aria-label={t(`tree.${row.kind}Actions`, { name: row.title })}
              onClick={(e) => {
                if (!busy) context(row, menuAnchor(e.currentTarget));
              }}
            >
              {'⋯'}
            </button>
          </div>
        ))}
      </div>
      {project && (
        <div className="tree-create">
          <button
            className="button compact"
            disabled={busy}
            onClick={() => {
              const row = rows.find(
                (r) => r.id === project.manifest.projectId,
              )!;
              show('newDocument', row);
              setName(
                t('tabs.newDocumentName', {
                  number: project.documents.length + 1,
                }),
              );
            }}
          >
            {t('tabs.newDocument')}
          </button>
          <button
            className="button compact"
            disabled={busy}
            onClick={() =>
              newPage(
                project.documents.find((d) =>
                  d.pages.some((p) => p.id === pageId),
                )?.id ?? project.documents[0].id,
              )
            }
          >
            {t('tabs.newPage')}
          </button>
        </div>
      )}
      {!!trash.length && (
        <details className="project-trash">
          <summary>{t('tree.trash', { count: trash.length })}</summary>
          {trash.map((item) => (
            <div key={item.id}>
              <span dir="auto">{item.title}</span>
              <button
                className="button compact"
                disabled={busy}
                onClick={() => void onProjectAction('restore', item.id)}
              >
                {t('tree.restore')}
              </button>
            </div>
          ))}
        </details>
      )}
      {menu && (
        <ContextMenu
          anchor={menu.anchor}
          label={t(`tree.${menu.row.kind}Actions`, { name: menu.row.title })}
          onClose={() => setMenu(null)}
        >
          <button role="menuitem" onClick={() => show('rename', menu.row)}>
            {t('tabs.rename')}
          </button>
          {menu.row.kind === 'project' ? (
            <>
              <button
                role="menuitem"
                onClick={() => {
                  onOpen(menu.row.id);
                  setMenu(null);
                }}
              >
                {t('project.open')}
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  void onProjectAction('duplicate', menu.row.id);
                  setMenu(null);
                }}
              >
                {t('tabs.duplicate')}
              </button>
              <button
                role="menuitem"
                onClick={() => show('deleteProject', menu.row)}
              >
                {t('tree.deleteProject')}
              </button>
            </>
          ) : (
            <>
              <button
                role="menuitem"
                onClick={() =>
                  newPage(
                    menu.row.kind === 'document'
                      ? menu.row.id
                      : menu.row.parent!,
                  )
                }
              >
                {t('tabs.newPage')}
              </button>
              {menu.row.kind === 'page' && (
                <>
                  <button
                    role="menuitem"
                    onClick={() => {
                      onCommand({
                        type: 'duplicatePage',
                        pageId: menu.row.id,
                        title: t('tabs.copyName', { name: menu.row.title }),
                      });
                      setMenu(null);
                    }}
                  >
                    {t('tabs.duplicate')}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => show('move', menu.row)}
                  >
                    {t('tabs.move')}
                  </button>
                </>
              )}
              <button
                role="menuitem"
                disabled={!canMove(menu.row, -1)}
                onClick={() => move(menu.row, -1)}
              >
                {t('tree.moveUp')}
              </button>
              <button
                role="menuitem"
                disabled={!canMove(menu.row, 1)}
                onClick={() => move(menu.row, 1)}
              >
                {t('tree.moveDown')}
              </button>
              <button
                role="menuitem"
                onClick={() =>
                  show(
                    menu.row.kind === 'page' ? 'deletePage' : 'deleteDocument',
                    menu.row,
                  )
                }
              >
                {t(
                  menu.row.kind === 'page'
                    ? 'tabs.delete'
                    : 'tree.deleteDocument',
                )}
              </button>
            </>
          )}
        </ContextMenu>
      )}
      {dialog && (
        <Dialog
          title={t(
            dialog.action === 'rename'
              ? 'tabs.rename'
              : dialog.action === 'move'
                ? 'tabs.move'
                : dialog.action === 'newDocument'
                  ? 'tabs.newDocument'
                  : dialog.action === 'deletePage'
                    ? 'tabs.delete'
                    : dialog.action === 'deleteDocument'
                      ? 'tree.deleteDocument'
                      : 'tree.deleteProject',
          )}
          onCancel={() => {
            if (!submitting) close();
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {dialog.action.startsWith('delete') ? (
              <p>
                {t(
                  dialog.action === 'deleteProject'
                    ? 'tree.deleteProjectWarning'
                    : dialog.action === 'deleteDocument'
                      ? 'tree.deleteDocumentWarning'
                      : 'tabs.deleteWarning',
                )}
              </p>
            ) : dialog.action === 'move' ? (
              <>
                <label>
                  {t('tabs.document')}
                  <select
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value);
                      setPosition(1);
                    }}
                  >
                    {project?.documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('tabs.position')}
                  <input
                    type="number"
                    min={1}
                    max={
                      (project?.documents.find((d) => d.id === target)?.pages
                        .length ?? 1) + (target === dialog.row.parent ? 0 : 1)
                    }
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.valueAsNumber)}
                  />
                </label>
                <p className="field-help">{t('tree.sameProject')}</p>
                {moveInvalid && <p role="alert">{t('tabs.error.lastPage')}</p>}
              </>
            ) : (
              <label>
                {t('tabs.name')}
                <input
                  autoFocus
                  required
                  maxLength={1024}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {failed && <p role="alert">{t(error ?? 'tabs.error.invalid')}</p>}
            <div className="dialog-actions">
              <button
                type="button"
                className="button"
                disabled={submitting}
                onClick={close}
              >
                {t('project.cancel')}
              </button>
              <button
                className="button primary"
                disabled={submitting || !!moveInvalid}
              >
                {t(
                  dialog.action.startsWith('delete')
                    ? 'project.confirm'
                    : 'diagram.apply',
                )}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
