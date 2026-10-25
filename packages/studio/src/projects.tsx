import { PageTabs } from './page-tabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import { Dialog, Icon } from '@koxora/ui';
import { ProjectTitle, ProjectNameField } from './project-title';
import { Canvas, type CanvasHandle } from './canvas';
import {
  activePageId,
  StudioHistory,
  WorkbookError,
  type WorkbookCommand,
  renameProject,
  EditError,
  type EditCommand,
  selectPage,
  writeCanvas,
  type CanvasState,
} from '@koxora/editor-core';
import {
  createProject,
  MAX_BYTES,
  importProject,
  exportProject,
  ProjectError,
  type Project,
} from '@koxora/project';
import {
  IndexedDbStore,
  NativeStore,
  ProjectRepository,
  type Invoke,
  type ProjectSummary,
} from '@koxora/persistence';
const native = (
  window as unknown as { __TAURI__?: { core: { invoke: Invoke } } }
).__TAURI__?.core;
type Operation = 'loading' | 'opening' | 'saving' | 'importing' | 'exporting';
export function Projects({ locale }: { locale: string }) {
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    translate(locale, key, values);
  const [repository] = useState(
    () =>
      new ProjectRepository(
        native ? new NativeStore(native.invoke) : new IndexedDbStore(),
      ),
  );
  const [project, setProjectState] = useState<Project | null>(null),
    [saved, setSaved] = useState<Project | null>(null),
    [token, setToken] = useState<string | null>(null);
  const projectRef = useRef<Project | null>(null);
  const setProject = useCallback(
    (next: Project | null | ((current: Project | null) => Project | null)) => {
      const value =
        typeof next === 'function' ? next(projectRef.current) : next;
      projectRef.current = value;
      setProjectState(value);
    },
    [],
  );
  const [items, setItems] = useState<ProjectSummary[]>([]),
    [operation, setOperation] = useState<Operation | null>('loading');
  const [view, setView] = useState<'dashboard' | 'workspace'>('dashboard'),
    [pageId, setPageId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false),
    [asCopy, setAsCopy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null),
    [errorPath, setErrorPath] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    message: MessageKey;
    action: () => void;
  } | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const session = useRef(0);
  const [history] = useState(() => new StudioHistory());
  const [loadVersion, setLoadVersion] = useState(0);
  const canvasRef = useRef<CanvasHandle>(null);
  const [pendingNavigation, setPendingNavigation] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dirty = project !== saved || pendingNavigation,
    busy = operation !== null;
  const activeDocument =
    project?.documents.find((doc) =>
      doc.pages.some((page) => page.id === pageId),
    ) ?? project?.documents[0];
  const activePage =
    activeDocument?.pages.find((page) => page.id === pageId) ??
    activeDocument?.pages[0];
  const styleSources = [
    ...(project?.themes.map((theme) => theme.styles) ?? []),
    ...(project?.documents.map((doc) => doc.styles) ?? []),
  ];
  const [styleCache, setStyleCache] = useState(() => ({
    sources: styleSources,
    styles: styleSources.flat(),
  }));
  if (
    styleSources.length !== styleCache.sources.length ||
    styleSources.some((source, i) => source !== styleCache.sources[i])
  ) {
    setStyleCache({ sources: styleSources, styles: styleSources.flat() });
  }
  const renderStyles = styleCache.styles;
  const snapshot = useCallback(() => {
    const project = projectRef.current;
    if (!project || !activeDocument || !activePage || view !== 'workspace')
      return project;
    const state = canvasRef.current?.snapshot();
    const next = state
      ? writeCanvas(project, activeDocument.id, activePage.id, state)
      : project;
    if (next !== project) setProject(next);
    return next;
  }, [activeDocument, activePage, view, setProject]);
  const commitCanvas = useCallback(
    (state: CanvasState) => {
      const projectId = project?.manifest.projectId;
      const documentId = activeDocument?.id,
        id = activePage?.id;
      setProject((current) =>
        current &&
        session.current === loadVersion &&
        current.manifest.projectId === projectId &&
        documentId &&
        id
          ? writeCanvas(current, documentId, id, state)
          : current,
      );
    },
    [
      project?.manifest.projectId,
      activeDocument?.id,
      activePage?.id,
      loadVersion,
      setProject,
    ],
  );
  function edit(command: EditCommand): boolean {
    if (
      !project ||
      !activeDocument ||
      !activePage ||
      session.current !== loadVersion
    )
      return false;
    try {
      const current = snapshot() ?? project;
      const next = history.execute(
        current,
        activeDocument.id,
        activePage.id,
        command,
        new Date().toISOString(),
      );
      setProject(next);
      setError(null);
      setPendingNavigation(false);
      return true;
    } catch (error) {
      setError(
        `diagram.error.${error instanceof EditError ? error.code : 'invalid'}`,
      );
      setErrorPath(null);
      return false;
    }
  }
  function travel(direction: 'undo' | 'redo'): boolean {
    if (
      !project ||
      !activeDocument ||
      !activePage ||
      session.current !== loadVersion
    )
      return false;
    try {
      const current = snapshot() ?? project;
      const next = history.travel(
        current,
        activeDocument.id,
        activePage.id,
        direction,
        new Date().toISOString(),
      );
      if (next === current) return false;
      setProject(next);
      setPageId(activePageId(next));
      setError(null);
      setPendingNavigation(false);
      return true;
    } catch {
      setError('diagram.error.invalid');
      return false;
    }
  }
  function switchPage(documentId: string, id: string) {
    const current = snapshot();
    if (current) setProject(selectPage(current, documentId, id));
    setPageId(id);
    setPendingNavigation(false);
  }
  function workbook(command: WorkbookCommand): boolean {
    const current = snapshot();
    if (!current) return false;
    try {
      const next = history.workbook(
        current,
        command,
        () => crypto.randomUUID(),
        new Date().toISOString(),
      );
      setProject(next);
      setPageId(activePageId(next));
      setPendingNavigation(false);
      setError(null);
      return true;
    } catch (error) {
      setError(
        `tabs.error.${error instanceof WorkbookError ? error.code : 'invalid'}`,
      );
      setErrorPath(null);
      return false;
    }
  }
  function renameActive(title: string): boolean {
    if (!project) return false;
    try {
      setProject(
        renameProject(snapshot() ?? project, title, new Date().toISOString()),
      );
      setError(null);
      return true;
    } catch {
      setError('editing.invalidName');
      return false;
    }
  }
  async function renameStored(id: string, title: string): Promise<boolean> {
    if (project?.manifest.projectId === id) {
      if (!renameActive(title)) return false;
      setItems((items) =>
        items.map((item) =>
          item.id === id ? { ...item, title: title.trim() } : item,
        ),
      );
      return true;
    }
    setOperation('saving');
    try {
      const opened = await repository.open(id);
      const next = renameProject(
        opened.project,
        title,
        new Date().toISOString(),
      );
      await repository.save(next, opened.token);
      await refresh();
      setError(null);
      return true;
    } catch (error) {
      report(error);
      return false;
    } finally {
      setOperation(null);
    }
  }
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  function report(error: unknown) {
    setError(
      `project.error.${error instanceof ProjectError ? error.code : 'storage'}`,
    );
    setErrorPath(
      error instanceof ProjectError && error.path !== '$' ? error.path : null,
    );
  }
  const refresh = useCallback(
    async () =>
      setItems(
        (await repository.list()).sort((a, b) =>
          (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
        ),
      ),
    [repository],
  );
  useEffect(() => {
    let active = true;
    void repository
      .list()
      .then((items) => {
        if (active)
          setItems(
            items.sort((a, b) =>
              (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
            ),
          );
      })
      .catch((error) => {
        if (active) report(error);
      })
      .finally(() => {
        if (active) setOperation(null);
      });
    return () => {
      active = false;
    };
  }, [repository]);
  useEffect(() => {
    if (focusVersion > 0) titleRef.current?.focus();
  }, [focusVersion]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = useCallback(async () => {
    if (!project || operation) return;
    const current = snapshot();
    if (!current) return;
    setOperation('saving');
    setError(null);
    try {
      const next = await repository.save(current, token);
      setToken(next);
      setSaved(current);
      await refresh();
    } catch (error) {
      report(error);
    } finally {
      setOperation(null);
    }
  }, [project, operation, repository, token, refresh, snapshot]);
  useEffect(() => {
    if (
      !dirty ||
      pendingNavigation ||
      !project ||
      busy ||
      error ||
      confirmation ||
      importing
    )
      return;
    const timer = window.setTimeout(() => void save(), 600);
    return () => window.clearTimeout(timer);
  }, [
    dirty,
    pendingNavigation,
    project,
    busy,
    error,
    save,
    confirmation,
    importing,
  ]);
  function replace(action: () => void) {
    const current = snapshot();
    if (dirty || current !== saved)
      setConfirmation({ message: 'project.discard', action });
    else action();
  }
  function enter(next: Project) {
    history.clear();
    session.current += 1;
    setLoadVersion(session.current);
    setProject(next);
    setPageId(activePageId(next));
    setPendingNavigation(false);
    setView('workspace');
    setFocusVersion((n) => n + 1);
    setNotice(null);
  }
  function create() {
    const next = createProject(
      t('project.untitled'),
      () => crypto.randomUUID(),
      new Date().toISOString(),
    );
    enter(next);
    setSaved(null);
    setToken(null);
    setError(null);
  }
  async function open(id: string, previous = false) {
    setOperation('opening');
    setError(null);
    setNotice(null);
    try {
      const result = await repository.open(id, previous);
      enter(result.project);
      setSaved(previous ? null : result.project);
      setToken(result.token);
    } catch (error) {
      report(error);
    } finally {
      setOperation(null);
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setOperation('importing');
    setError(null);
    try {
      if (file.size > MAX_BYTES) throw new ProjectError('tooLarge');
      const imported = await importProject(
        new Uint8Array(await file.arrayBuffer()),
      );
      if (asCopy) imported.manifest.projectId = crypto.randomUUID();
      const next = await repository.save(imported, null);
      setImporting(false);
      enter(imported);
      setSaved(imported);
      setToken(next);
      await refresh();
    } catch (error) {
      report(error);
    } finally {
      setOperation(null);
    }
  }
  async function exportFile() {
    if (!project) return;
    const current = snapshot();
    if (!current) return;
    setOperation('exporting');
    setError(null);
    setNotice(null);
    try {
      const bytes = await exportProject(current);
      if (native) {
        const path = await native.invoke<string | null>('project_export', {
          suggestedName: project.manifest.title,
          bytes: Array.from(bytes),
          labels: {
            title: t('export.dialogTitle'),
            filter: t('export.fileType'),
            overwriteTitle: t('export.overwriteTitle'),
            overwriteMessage: t('export.overwriteMessage'),
            overwrite: t('export.replace'),
            cancel: t('project.cancel'),
          },
        });
        setNotice(
          path ? t('project.exported', { path }) : t('export.cancelled'),
        );
      } else {
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: 'application/zip' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `koxora-${project.manifest.projectId}.koxora`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        setNotice(t('export.downloaded'));
      }
    } catch (error) {
      report(
        typeof error === 'string'
          ? new ProjectError(error === 'conflict' ? 'conflict' : 'storage')
          : error,
      );
    } finally {
      setOperation(null);
    }
  }
  const actions = (
    <>
      <button
        className="button primary"
        disabled={busy}
        onClick={() => replace(create)}
      >
        <Icon name="plus" />
        {t('project.create')}
      </button>
      <button
        className="button"
        disabled={busy}
        onClick={() =>
          replace(() => {
            setError(null);
            setImporting(true);
          })
        }
      >
        <Icon name="import" />
        {t('project.import')}
      </button>
    </>
  );
  const errorMessage = error && (
    <div className="notification error" role="alert">
      <strong>{t('feedback.attention')}</strong>
      <span>
        {t(error)}
        {errorPath && <> {t('project.error.location', { path: errorPath })}</>}
      </span>
      <button
        className="icon-button"
        aria-label={t('feedback.dismiss')}
        onClick={() => setError(null)}
      >
        <Icon name="close" />
      </button>
    </div>
  );
  return (
    <div className="application-body">
      <aside className="project-sidebar">
        <div className="sidebar-label">{t('nav.studio')}</div>
        <button
          className={`nav-item ${view === 'dashboard' ? 'selected' : ''}`}
          aria-current={view === 'dashboard' ? 'page' : undefined}
          onClick={() => {
            snapshot();
            setView('dashboard');
            setFocusVersion((n) => n + 1);
          }}
        >
          <Icon name="grid" />
          {t('project.recent')}
          <span className="count">{items.length}</span>
        </button>
        {project && (
          <>
            <div className="sidebar-label spaced">{t('workspace.active')}</div>
            <button
              className={`nav-item project-nav ${view === 'workspace' ? 'selected' : ''}`}
              onClick={() => {
                setView('workspace');
                setFocusVersion((n) => n + 1);
              }}
              aria-current={view === 'workspace' ? 'page' : undefined}
            >
              <Icon name="file" />
              <span dir="auto">{project.manifest.title}</span>
            </button>
            {view === 'workspace' && (
              <details className="project-outline">
                <summary>{t('tabs.overview')}</summary>
                <nav
                  className="document-navigation"
                  aria-label={t('workspace.documents')}
                >
                  {project.documents.map((doc) => (
                    <div key={doc.id}>
                      <p dir="auto">{doc.title}</p>
                      {doc.pages.map((page, index) => (
                        <button
                          key={page.id}
                          className={`page-nav ${activePage?.id === page.id ? 'selected' : ''}`}
                          aria-current={
                            activePage?.id === page.id ? 'page' : undefined
                          }
                          onClick={() => {
                            const current = snapshot();
                            if (current)
                              setProject(selectPage(current, doc.id, page.id));
                            setPageId(page.id);
                            setPendingNavigation(false);
                          }}
                        >
                          <span className="page-number">{index + 1}</span>
                          <span dir="auto">{page.title}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </nav>
              </details>
            )}
          </>
        )}
        <div className="sidebar-bottom">
          <Icon name="shield" />
          <strong>{t('status.local')}</strong>
          <p>{t('dashboard.localNote')}</p>
        </div>
      </aside>
      <main
        id="workspace"
        tabIndex={-1}
        className={
          view === 'workspace' && project ? 'workspace-main' : 'dashboard-main'
        }
        aria-busy={busy}
      >
        {confirmation && (
          <Dialog
            title={t('confirmation.title')}
            onCancel={() => setConfirmation(null)}
          >
            <p>{t(confirmation.message)}</p>
            <div className="dialog-actions">
              <button className="button" onClick={() => setConfirmation(null)}>
                {t('project.cancel')}
              </button>
              <button
                className="button primary"
                onClick={() => {
                  const action = confirmation.action;
                  setConfirmation(null);
                  action();
                }}
              >
                {t('project.confirm')}
              </button>
            </div>
          </Dialog>
        )}
        {importing && (
          <Dialog
            title={t('project.import')}
            onCancel={() => {
              if (!busy) setImporting(false);
            }}
          >
            <p>{t('import.description')}</p>
            {errorMessage}
            <label className="import-drop">
              <Icon name="import" />
              <strong>{t('import.choose')}</strong>
              <input
                type="file"
                accept=".koxora"
                aria-label={t('project.import')}
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void importFile(file);
                }}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={asCopy}
                disabled={busy}
                onChange={(e) => setAsCopy(e.target.checked)}
              />
              {t('project.asCopy')}
            </label>
            <div className="dialog-actions">
              <button
                className="button"
                disabled={busy}
                onClick={() => setImporting(false)}
              >
                {t('project.cancel')}
              </button>
            </div>
          </Dialog>
        )}
        {!importing && errorMessage}
        <div className="announcements" aria-live="polite" aria-atomic="true">
          {operation ? t(`operation.${operation}`) : notice}
        </div>
        {notice && !busy && (
          <div className="notification success" role="status">
            <Icon name="check" />
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label={t('feedback.dismiss')}
              onClick={() => setNotice(null)}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        {view === 'dashboard' || !project ? (
          <>
            <div className="dashboard-heading">
              <div>
                <p className="eyebrow">{t('dashboard.eyebrow')}</p>
                <h1 ref={titleRef} tabIndex={-1}>
                  {t('dashboard.title')}
                </h1>
                <p className="subtitle">{t('dashboard.description')}</p>
              </div>
              <div className="action-row">{actions}</div>
            </div>
            <section
              className="projects-section"
              aria-labelledby="projects-title"
            >
              <div className="section-heading">
                <h2 id="projects-title">
                  {t('project.recent')} <span>{items.length}</span>
                </h2>
                <button
                  className="button subtle"
                  disabled={busy}
                  onClick={() => {
                    setOperation('loading');
                    void refresh()
                      .catch(report)
                      .finally(() => setOperation(null));
                  }}
                >
                  <Icon name="refresh" />
                  {t('project.refresh')}
                </button>
              </div>
              {operation && (
                <p className="loading-line" role="status">
                  <span className="spinner" />
                  {t(`operation.${operation}`)}
                </p>
              )}
              {!items.length && !busy ? (
                <div className="dashboard-empty">
                  <div className="empty-symbol">
                    <Icon name="layers" />
                  </div>
                  <h2>{t('dashboard.emptyTitle')}</h2>
                  <p>{t('dashboard.emptyDescription')}</p>
                  <span className="local-hint">
                    <Icon name="shield" />
                    {t('workspace.note')}
                  </span>
                </div>
              ) : (
                <ul className="project-grid">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`project-card ${project?.manifest.projectId === item.id ? 'active' : ''}`}
                    >
                      <div className="project-cover" aria-hidden="true">
                        <Icon name="layers" />
                        <span className="cover-line one" />
                        <span className="cover-line two" />
                      </div>
                      <div className="card-body">
                        <div className="card-title">
                          <ProjectTitle
                            title={
                              project?.manifest.projectId === item.id
                                ? project.manifest.title
                                : (item.title ?? t('project.unreadable'))
                            }
                            locale={locale}
                            disabled={busy || item.title === null}
                            onRename={(name) => renameStored(item.id, name)}
                          />
                          {project?.manifest.projectId === item.id && (
                            <span className="badge">
                              {t('workspace.activeBadge')}
                            </span>
                          )}
                        </div>
                        <p className="card-meta">
                          {item.title !== null
                            ? t('project.structure', {
                                documents: item.documents ?? 0,
                                pages: item.pages ?? 0,
                              })
                            : t('project.recoveryAvailable')}
                        </p>
                        {item.updatedAt && (
                          <p className="card-date">
                            <Icon name="clock" />
                            {date(item.updatedAt)}
                          </p>
                        )}
                        <div className="card-actions">
                          <button
                            className="button open-button"
                            disabled={busy}
                            onClick={() => replace(() => void open(item.id))}
                          >
                            {t('project.open')}
                            <Icon name="arrow" />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={t('project.recover')}
                            title={t('project.recover')}
                            disabled={busy}
                            onClick={() =>
                              setConfirmation({
                                message: 'project.recoverConfirm',
                                action: () =>
                                  replace(() => void open(item.id, true)),
                              })
                            }
                          >
                            <Icon name="refresh" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="dashboard-footnote">
              <Icon name="shield" />
              <p>{t('project.backup')}</p>
            </div>
          </>
        ) : (
          <>
            <header className="workspace-header">
              <div>
                <p className="eyebrow">{t('nav.workspace')}</p>
                <ProjectTitle
                  title={project.manifest.title}
                  locale={locale}
                  disabled={busy}
                  onRename={renameActive}
                  heading="h1"
                  titleRef={titleRef}
                />
                <p
                  className={`save-status ${dirty ? 'pending' : ''}`}
                  aria-live="polite"
                >
                  <Icon name={dirty ? 'clock' : 'check'} />
                  {operation
                    ? t(`operation.${operation}`)
                    : t(dirty ? 'project.unsaved' : 'project.saved')}
                </p>
              </div>
              <div className="action-row">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  <Icon name="check" />
                  {t('project.save')}
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void exportFile()}
                >
                  <Icon name="export" />
                  {t(native ? 'export.saveAs' : 'project.export')}
                </button>
                <button
                  className="icon-button"
                  aria-label={t('project.import')}
                  title={t('project.import')}
                  disabled={busy}
                  onClick={() =>
                    replace(() => {
                      setError(null);
                      setImporting(true);
                    })
                  }
                >
                  <Icon name="import" />
                </button>
                <button
                  className="icon-button"
                  aria-label={t('project.create')}
                  title={t('project.create')}
                  disabled={busy}
                  onClick={() => replace(create)}
                >
                  <Icon name="plus" />
                </button>
              </div>
            </header>
            <div className="workspace-layout">
              {activePage && activeDocument && (
                <div
                  className={`canvas-workbook ${expanded ? 'canvas-workbook-expanded' : ''}`}
                  onKeyDown={(event) => {
                    if (
                      event.defaultPrevented ||
                      !(event.ctrlKey || event.metaKey) ||
                      !(event.target instanceof Element) ||
                      !event.target.closest('.workbook') ||
                      event.target.closest('input,select,dialog')
                    )
                      return;
                    const key = event.key.toLowerCase();
                    if (key === 'z' || key === 'y') {
                      event.preventDefault();
                      travel(key === 'y' || event.shiftKey ? 'redo' : 'undo');
                    }
                  }}
                  role={expanded ? 'dialog' : undefined}
                  aria-modal={expanded ? true : undefined}
                  aria-label={t('workspace.canvas')}
                >
                  <Canvas
                    expanded={expanded}
                    onExpanded={setExpanded}
                    key={`${loadVersion}:${project.manifest.projectId}:${activePage.id}`}
                    ref={canvasRef}
                    page={activePage}
                    styles={renderStyles}
                    onEdit={edit}
                    history={history.status(
                      project,
                      activeDocument.id,
                      activePage.id,
                    )}
                    onHistory={travel}
                    documentTitle={activeDocument.title}
                    locale={locale}
                    onCommit={commitCanvas}
                    onPending={setPendingNavigation}
                  />
                  <PageTabs
                    errorMessage={error}
                    project={project}
                    saved={saved}
                    pageId={activePage.id}
                    locale={locale}
                    onSelect={switchPage}
                    onCommand={workbook}
                  />
                </div>
              )}
              <aside className="inspector" aria-label={t('workspace.details')}>
                <h2>{t('workspace.details')}</h2>
                <ProjectNameField
                  title={project.manifest.title}
                  locale={locale}
                  disabled={busy}
                  onRename={renameActive}
                />
                <dl className="project-properties">
                  <div>
                    <dt>{t('workspace.documents')}</dt>
                    <dd>{project.documents.length}</dd>
                  </div>
                  <div>
                    <dt>{t('workspace.pages')}</dt>
                    <dd>
                      {project.documents.reduce(
                        (n, doc) => n + doc.pages.length,
                        0,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('workspace.datasets')}</dt>
                    <dd>{project.datasets.length}</dd>
                  </div>
                  <div>
                    <dt>{t('workspace.assets')}</dt>
                    <dd>{project.assets.length}</dd>
                  </div>
                </dl>
                <div className="inspector-section">
                  <h3>{t('workspace.updated')}</h3>
                  <p>{date(project.manifest.updatedAt)}</p>
                  <h3>{t('workspace.created')}</h3>
                  <p>{date(project.manifest.createdAt)}</p>
                </div>
                <div className="storage-note">
                  <Icon name="shield" />
                  <h3>{t('workspace.autosaveTitle')}</h3>
                  <p>{t('workspace.autosaveDescription')}</p>
                </div>
                <button
                  className="button recovery-button"
                  disabled={busy || !token}
                  onClick={() =>
                    setConfirmation({
                      message: 'project.recoverConfirm',
                      action: () =>
                        replace(
                          () => void open(project.manifest.projectId, true),
                        ),
                    })
                  }
                >
                  <Icon name="refresh" />
                  {t('project.recover')}
                </button>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
