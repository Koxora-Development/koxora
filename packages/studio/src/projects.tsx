import { InfoDisclosure } from './info-disclosure';
import { StartPage } from './start-page';
import { WorkbenchControls } from './workbench-controls';
import { WorkbookTabs } from './workbook-tabs';
import { StorageSettings } from './storage-settings';
import { OfficeMenubar, type OfficeMenuItem } from './office-menu';
import { OfficeSettings } from './office-settings';
import { AppImageIntegration } from './appimage-integration';
import type { GuiScale, Theme } from './preferences';
import { NativeOpen } from './native-open';
import { NavigationContext } from './navigation-context';
import { ProjectTree, type ProjectAction } from './project-tree';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import { Dialog, Icon } from '@koxora/ui';
import { ProjectNameField } from './project-title';
import {
  Canvas,
  type CanvasHandle,
  type CanvasCommand,
  type CanvasCommandState,
} from './canvas';
import {
  activePageId,
  shapeKinds,
  layerStates,
  buildScene,
  type LinkTarget,
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
export function Projects({
  locale,
  theme,
  guiScale,
  onGuiScale,
  onLocale,
  onTheme,
}: {
  locale: string;
  theme: Theme;
  guiScale: GuiScale;
  onGuiScale: (scale: GuiScale) => void;
  onLocale: (locale: string) => void;
  onTheme: (theme: Theme) => void;
}) {
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
  const [trash, setTrash] = useState<ProjectSummary[]>([]);
  const navigationLock = useRef(false);
  const [navigationBusy, setNavigationBusy] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [items, setItems] = useState<ProjectSummary[]>([]),
    [operation, setOperation] = useState<Operation | null>('loading');
  const [view, setView] = useState<'dashboard' | 'workspace'>('dashboard'),
    [pageId, setPageId] = useState<string | null>(null);
  const [dropped, setDropped] = useState<File[]>([]);
  const dropRunning = useRef(false);
  const [dropFailed, setDropFailed] = useState(false);
  const [dropCopy, setDropCopy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [navigatorVisible, setNavigatorVisible] = useState(
    () => window.innerWidth >= 1000,
  );
  const [propertyDraft, setPropertyDraft] = useState(false);
  const [commandState, setCommandState] = useState<CanvasCommandState>(() => ({
    selected: 0,
    canPaste: false,
    propertiesVisible: window.innerWidth >= 1000,
    objectsVisible: false,
  }));
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    const update = () =>
      setDialogOpen(!!document.querySelector('dialog[open]'));
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    update();
    return () => observer.disconnect();
  }, []);
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
  const nameRef = useRef<HTMLInputElement>(null);
  const session = useRef(0);
  const [history] = useState(() => new StudioHistory());
  const [loadVersion, setLoadVersion] = useState(0);
  const canvasRef = useRef<CanvasHandle>(null);
  const [queuedExport, setQueuedExport] = useState<string | null>(null);
  const [queuedFollow, setQueuedFollow] = useState<{
    sourceId: string;
    target: Exclude<LinkTarget, { type: 'url' } | { type: 'page' }>;
  } | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    id: string;
    nonce: number;
  } | null>(null);
  const [missingTarget, setMissingTarget] = useState(false);
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
      if (navigationLock.current) return;
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
    if (navigationLock.current) return false;
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
    if (canvasRef.current && !canvasRef.current.prepare()) return false;
    if (navigationLock.current) return false;
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
      setFocusTarget(null);
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
    if (canvasRef.current && !canvasRef.current.prepare()) return false;
    if (navigationLock.current) return false;
    setFocusTarget(null);
    setView('workspace');
    setNavigatorOpen(false);
    const current = snapshot();
    if (current) setProject(selectPage(current, documentId, id));
    setPageId(id);
    setPendingNavigation(false);
    return true;
  }
  function workbook(command: WorkbookCommand): boolean {
    if (canvasRef.current && !canvasRef.current.prepare()) return false;
    if (navigationLock.current) return false;
    const current = snapshot();
    if (!current) return false;
    try {
      const next = history.workbook(
        current,
        command,
        () => crypto.randomUUID(),
        new Date().toISOString(),
      );
      setFocusTarget(null);
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
    if (navigationLock.current) return false;
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
  const refresh = useCallback(async () => {
    const listed = await repository.list();
    setItems(
      listed.sort((a, b) =>
        (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
      ),
    );
    setTrash(await repository.list(true));
  }, [repository]);
  useEffect(() => {
    let active = true;
    void repository
      .list()
      .then(async (items) => {
        const deleted = await repository.list(true);
        if (active) setTrash(deleted);
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
    if (focusVersion > 0) (nameRef.current ?? titleRef.current)?.focus();
  }, [focusVersion]);
  useEffect(() => {
    if (!dirty && !propertyDraft) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, propertyDraft]);
  const save = useCallback(async () => {
    if (
      !project ||
      operation ||
      (canvasRef.current && !canvasRef.current.prepare())
    )
      return;
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
      importing ||
      propertyDraft
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
    propertyDraft,
  ]);
  function replace(action: () => void) {
    if (canvasRef.current && !canvasRef.current.prepare()) return;
    const current = snapshot();
    if (dirty || current !== saved)
      setConfirmation({ message: 'project.discard', action });
    else action();
  }
  function enter(next: Project) {
    setFocusTarget(null);
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
  async function preserveAndRun(action: () => Promise<void>): Promise<boolean> {
    if (
      busy ||
      navigationLock.current ||
      (canvasRef.current && !canvasRef.current.prepare())
    )
      return false;
    // Flush focused field/text drafts before freezing mutations for navigation.
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    navigationLock.current = true;
    setNavigationBusy(true);
    setOperation('saving');
    setError(null);
    try {
      const current = snapshot();
      if (current && (current !== saved || token === null)) {
        const next = await repository.save(current, token);
        setToken(next);
        setSaved(current);
      }
      await action();
      await refresh();
      return true;
    } catch (error) {
      report(error);
      return false;
    } finally {
      navigationLock.current = false;
      setNavigationBusy(false);
      setOperation(null);
    }
  }
  function followTarget(
    target: Exclude<LinkTarget, { type: 'url' } | { type: 'page' }>,
  ) {
    const sourceId = projectRef.current?.manifest.projectId;
    if (sourceId && operation === 'saving' && !navigationLock.current) {
      setQueuedFollow({ sourceId, target });
      return;
    }
    void preserveAndRun(async () => {
      const current = snapshot();
      if (!current) return;
      const external =
        target.type === 'project' &&
        target.projectId !== current.manifest.projectId;
      let destination: Project;
      let destinationToken: string | null = token;
      try {
        if (external && target.type === 'project') {
          const result = await repository.open(target.projectId);
          destination = result.project;
          destinationToken = result.token;
        } else destination = current;
        const id = target.pageId ?? activePageId(destination);
        const doc = destination.documents.find((d) =>
          d.pages.some((p) => p.id === id),
        );
        const page = doc?.pages.find((p) => p.id === id);
        if (!doc || !page) throw new ProjectError('missing');
        if (target.elementId) {
          const scene = buildScene(page, [
            ...destination.themes.flatMap((t) => t.styles),
            ...destination.documents.flatMap((d) => d.styles),
          ]);
          if (
            ![...scene.nodes, ...scene.connections].some(
              (item) => item.id === target.elementId,
            )
          )
            throw new ProjectError('missing');
        }
        if (external) {
          enter(destination);
          setSaved(destination);
          setToken(destinationToken);
        }
        setProject(selectPage(destination, doc.id, page.id));
        setPageId(page.id);
        setView('workspace');
        setNavigatorOpen(false);
        setPendingNavigation(false);
        setFocusTarget(
          target.elementId ? { id: target.elementId, nonce: Date.now() } : null,
        );
        setNotice(t('links.navigated', { page: page.title }));
      } catch (error) {
        setMissingTarget(true);
        throw error;
      }
    });
  }
  const resumeFollow = useEffectEvent(() => {
    if (
      !queuedFollow ||
      busy ||
      navigationBusy ||
      dialogOpen ||
      propertyDraft ||
      (canvasRef.current && !canvasRef.current.prepare())
    )
      return;
    setQueuedFollow(null);
    if (projectRef.current?.manifest.projectId === queuedFollow.sourceId)
      followTarget(queuedFollow.target);
  });
  useEffect(() => {
    if (
      !queuedFollow ||
      busy ||
      navigationBusy ||
      dialogOpen ||
      propertyDraft ||
      (canvasRef.current && !canvasRef.current.prepare())
    )
      return;
    const timer = window.setTimeout(() => resumeFollow(), 0);
    return () => window.clearTimeout(timer);
  }, [queuedFollow, busy, navigationBusy, dialogOpen, propertyDraft]);
  function openFromTree(id: string) {
    if (id === projectRef.current?.manifest.projectId) {
      setFocusTarget(null);
      setView('workspace');
      return;
    }
    void preserveAndRun(async () => {
      const result = await repository.open(id);
      enter(result.project);
      setSaved(result.project);
      setToken(result.token);
      setNavigatorOpen(false);
    });
  }
  function createFromTree() {
    void preserveAndRun(async () => {
      create();
      setNavigatorOpen(false);
    });
  }
  async function prepareProjectPurge(id: string) {
    if (
      busy ||
      navigationLock.current ||
      projectRef.current?.manifest.projectId === id ||
      (canvasRef.current && !canvasRef.current.prepare())
    )
      throw new ProjectError('conflict');
    const removed = await repository.preparePurge(id);
    return { token: removed.token, title: removed.project.manifest.title };
  }
  async function projectAction(
    action: ProjectAction,
    id: string,
    title?: string,
    expected?: string,
  ): Promise<boolean> {
    if (action === 'rename') return renameStored(id, title ?? '');
    return preserveAndRun(async () => {
      if (action === 'purge') {
        if (projectRef.current?.manifest.projectId === id)
          throw new ProjectError('conflict');
        if (!expected) throw new ProjectError('conflict');
        await repository.purge(id, expected);
        return;
      }
      const opened = await repository.open(id, false, action === 'restore');
      if (action === 'duplicate') {
        // Identities inside a project are project-scoped. A new project UUID copies its complete archive without guessing opaque references.
        const copy = {
          ...opened.project,
          manifest: {
            ...opened.project.manifest,
            projectId: crypto.randomUUID(),
            title: t('tabs.copyName', { name: opened.project.manifest.title }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
        const next = await repository.save(copy, null);
        enter(copy);
        setSaved(copy);
        setToken(next);
      } else {
        await repository.setDeleted(id, opened.token, action === 'delete');
        if (
          action === 'delete' &&
          projectRef.current?.manifest.projectId === id
        ) {
          history.clear();
          session.current += 1;
          setLoadVersion(session.current);
          setFocusTarget(null);
          setProject(null);
          setSaved(null);
          setToken(null);
          setPageId(null);
          setPendingNavigation(false);
          setExpanded(false);
          setNavigatorOpen(false);
          setView('dashboard');
        }
      }
    });
  }
  async function importBytes(bytes: Uint8Array, copy: boolean, reopen = false) {
    const imported = await importProject(bytes);
    if (copy) imported.manifest.projectId = crypto.randomUUID();
    if (reopen && !copy) {
      // Reopening the same unmodified portable file is idempotent. A changed
      // archive with an existing ID must still require explicit import-as-copy.
      try {
        const stored = await repository.open(imported.manifest.projectId);
        const original = await exportProject(stored.project);
        const incoming = await exportProject(imported);
        if (
          original.length === incoming.length &&
          original.every((b, i) => b === incoming[i])
        ) {
          enter(stored.project);
          setSaved(stored.project);
          setToken(stored.token);
          return;
        }
      } catch (error) {
        if (!(error instanceof ProjectError && error.code === 'missing'))
          throw error;
      }
    }
    const next = await repository.save(imported, null);
    setImporting(false);
    enter(imported);
    setSaved(imported);
    setToken(next);
    await refresh();
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setOperation('importing');
    setError(null);
    try {
      if (file.size > MAX_BYTES) throw new ProjectError('tooLarge');
      await importBytes(new Uint8Array(await file.arrayBuffer()), asCopy);
    } catch (error) {
      report(error);
    } finally {
      setOperation(null);
    }
  }
  useEffect(() => {
    if (
      dropFailed ||
      propertyDraft ||
      dialogOpen ||
      missingTarget ||
      settingsOpen ||
      !dropped.length ||
      busy ||
      importing ||
      confirmation ||
      dropRunning.current ||
      native
    )
      return;
    dropRunning.current = true;
    const file = dropped[0];
    void preserveAndRun(async () => {
      if (file.size > MAX_BYTES) throw new ProjectError('tooLarge');
      await importBytes(
        new Uint8Array(await file.arrayBuffer()),
        dropCopy,
        true,
      );
    })
      .then((ok) => {
        if (ok) {
          setDropped((current) => current.slice(1));
          setDropCopy(false);
        } else setDropFailed(true);
      })
      .finally(() => {
        dropRunning.current = false;
      });
  });
  async function exportFile() {
    if (!project || (canvasRef.current && !canvasRef.current.prepare())) return;
    if (operation === 'saving' && !navigationLock.current) {
      setQueuedExport(project.manifest.projectId);
      return;
    }
    if (busy || navigationLock.current) return;
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
  const resumeExport = useEffectEvent(() => {
    if (
      !queuedExport ||
      busy ||
      navigationLock.current ||
      dialogOpen ||
      propertyDraft ||
      (canvasRef.current && !canvasRef.current.prepare())
    )
      return;
    setQueuedExport(null);
    if (projectRef.current?.manifest.projectId === queuedExport)
      void exportFile();
  });
  useEffect(() => {
    if (!queuedExport || busy || navigationBusy || dialogOpen || propertyDraft)
      return;
    const timer = window.setTimeout(() => resumeExport(), 0);
    return () => window.clearTimeout(timer);
  }, [queuedExport, busy, navigationBusy, dialogOpen, propertyDraft]);
  const projectDetails = project && (
    <InfoDisclosure
      className="office-project-details"
      title={t('workspace.details')}
    >
      <dl className="project-properties">
        <div>
          <dt>{t('workspace.documents')}</dt>
          <dd>{project.documents.length}</dd>
        </div>
        <div>
          <dt>{t('workspace.pages')}</dt>
          <dd>
            {project.documents.reduce((n, doc) => n + doc.pages.length, 0)}
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
              replace(() => void open(project.manifest.projectId, true)),
          })
        }
      >
        <Icon name="refresh" />
        {t('project.recover')}
      </button>
    </InfoDisclosure>
  );
  function storageChanged() {
    setQueuedFollow(null);
    setQueuedExport(null);
    setFocusTarget(null);
    setMissingTarget(false);
    setNotice(null);
    history.clear();
    session.current += 1;
    setLoadVersion(session.current);
    setProject(null);
    setSaved(null);
    setToken(null);
    setPageId(null);
    setPendingNavigation(false);
    setView('dashboard');
    setExpanded(false);
    setPropertyDraft(false);
  }
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
  const navigation = (
    <ProjectTree
      project={project}
      saved={saved}
      pageId={pageId}
      items={items}
      trash={trash}
      busy={busy}
      locked={
        propertyDraft || navigationBusy || (busy && operation !== 'saving')
      }
      locale={locale}
      error={error}
      onOpen={openFromTree}
      onCreate={createFromTree}
      onSelect={switchPage}
      onCommand={workbook}
      onProjectAction={projectAction}
      onPreparePurge={prepareProjectPurge}
      onHistory={travel}
    />
  );
  const unavailable =
    !project || navigationBusy || (busy && operation !== 'saving');
  const selected = commandState.selected;
  const command = (action: CanvasCommand) => () =>
    canvasRef.current?.run(action);
  const openImport = () =>
    replace(() => {
      setError(null);
      setImporting(true);
    });
  const menus: {
    label: string;
    disabled?: boolean;
    items: OfficeMenuItem[];
  }[] = [
    {
      label: t('office.menu.file'),
      items: [
        {
          label: t('project.create'),
          action: () => replace(create),
          disabled: busy || propertyDraft,
          shortcut: '',
        },
        {
          label: t('project.import'),
          action: openImport,
          disabled: busy || propertyDraft,
        },
        {
          label: t('office.recent'),
          children: items.slice(0, 12).map((item) => ({
            label: item.title ?? t('project.unreadable'),
            action: () => openFromTree(item.id),
            disabled: busy || propertyDraft,
          })),
          disabled: !items.length,
        },
        { label: '', separator: true },
        {
          label: t('project.save'),
          action: () => void save(),
          disabled: !project || busy || propertyDraft,
          shortcut: 'Ctrl+S',
        },
        {
          label: t(native ? 'export.saveAs' : 'project.export'),
          action: () => void exportFile(),
          disabled: unavailable || propertyDraft,
          shortcut: 'Ctrl+Shift+S',
        },
        { label: '', separator: true },
        { label: t('office.settings'), action: () => setSettingsOpen(true) },
      ],
    },
    {
      label: t('office.menu.edit'),
      disabled: !project,
      items: [
        {
          label: t('editing.undo'),
          action: command('undo'),
          disabled:
            unavailable ||
            propertyDraft ||
            !activePage ||
            !activeDocument ||
            !project ||
            !history.status(project, activeDocument.id, activePage.id).undo,
          shortcut: 'Ctrl+Z',
        },
        {
          label: t('editing.redo'),
          action: command('redo'),
          disabled:
            unavailable ||
            propertyDraft ||
            !activePage ||
            !activeDocument ||
            !project ||
            !history.status(project, activeDocument.id, activePage.id).redo,
          shortcut: 'Ctrl+Y',
        },
        { label: '', separator: true },
        {
          label: t('editing.copy'),
          action: command('copy'),
          disabled: unavailable || !selected || propertyDraft,
          shortcut: 'Ctrl+C',
        },
        {
          label: t('editing.paste'),
          action: command('paste'),
          disabled: unavailable || !commandState.canPaste || propertyDraft,
          shortcut: 'Ctrl+V',
        },
        {
          label: t('editing.duplicate'),
          action: command('duplicate'),
          disabled: unavailable || !selected || propertyDraft,
          shortcut: 'Ctrl+D',
        },
        {
          label: t('editing.delete'),
          action: command('delete'),
          disabled: unavailable || !selected || propertyDraft,
          shortcut: 'Del',
        },
        {
          label: t('office.selectAll'),
          action: command('selectAll'),
          disabled: unavailable || propertyDraft,
          shortcut: 'Ctrl+A',
        },
      ],
    },
    {
      label: t('office.menu.view'),
      items: [
        {
          label: t('tree.heading'),
          checked: navigatorVisible,
          action: () => setNavigatorVisible((value) => !value),
        },
        {
          label: t('format.objects'),
          checked: commandState.objectsVisible,
          action: () => canvasRef.current?.toggleObjects(),
          disabled: !project,
        },
        {
          label: t('office.properties'),
          checked: commandState.propertiesVisible,
          action: () => canvasRef.current?.toggleProperties(),
          disabled: !project,
        },
        { label: '', separator: true },
        {
          label: t('canvas.zoomIn'),
          action: () => canvasRef.current?.zoom('in'),
          disabled: !project,
        },
        {
          label: t('canvas.zoomOut'),
          action: () => canvasRef.current?.zoom('out'),
          disabled: !project,
        },
        {
          label: t('canvas.reset'),
          action: () => canvasRef.current?.zoom('reset'),
          disabled: !project,
        },
        {
          label: t('canvas.fit'),
          action: () => canvasRef.current?.zoom('fit'),
          disabled: !project,
        },
        {
          label: t(expanded ? 'canvas.restore' : 'canvas.expand'),
          checked: expanded,
          action: () => {
            if (!canvasRef.current || canvasRef.current.prepare())
              setExpanded((value) => !value);
          },
          disabled: !project,
        },
      ],
    },
    {
      label: t('office.menu.insert'),
      disabled: !project,
      items: [...shapeKinds, 'freehand' as const].map((kind) => ({
        label: t(`shape.${kind}`),
        action: () => canvasRef.current?.tool(kind),
        disabled:
          unavailable ||
          propertyDraft ||
          !activePage ||
          !activePage.layers.some(
            (layer) => layerStates(activePage.layers).get(layer.id)?.editable,
          ),
      })),
    },
    {
      label: t('office.menu.format'),
      disabled: !project,
      items: [
        {
          label: t('diagram.properties'),
          action: command('properties'),
          disabled: unavailable || !selected,
        },
        {
          label: t('rich.edit'),
          action: command('text'),
          disabled: unavailable || selected !== 1 || propertyDraft,
        },
        {
          label: t('stack.heading'),
          disabled: unavailable || !selected || propertyDraft,
          children: (['forward', 'backward', 'front', 'back'] as const).map(
            (action) => ({
              label: t(`stack.${action}`),
              action: command(action),
            }),
          ),
        },
        {
          label: t('format.align'),
          disabled: unavailable || selected < 2 || propertyDraft,
          children: (
            [
              'left',
              'center',
              'right',
              'top',
              'middle',
              'bottom',
              'horizontal',
              'vertical',
            ] as const
          ).map((action) => ({
            label: t(`editing.align.${action}` as MessageKey),
            action: command(action),
            preview: (active) =>
              canvasRef.current?.preview(active ? action : null),
          })),
        },
        {
          label: t('arrange.tidy'),
          action: command('tidy'),
          preview: (active) =>
            canvasRef.current?.preview(active ? 'tidy' : null),
          disabled: unavailable || selected < 2 || propertyDraft,
        },
      ],
    },
    {
      label: t('office.menu.help'),
      items: [
        {
          label: t('canvas.help'),
          action: () => canvasRef.current?.showHelp(),
          disabled: !project,
          shortcut: 'F1',
        },
      ],
    },
  ];
  return (
    <div
      className={`application-body office-application ${navigatorVisible ? '' : 'navigator-hidden'}`}
      onKeyDown={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 's' &&
          !event.defaultPrevented &&
          !(event.target as HTMLElement).closest('dialog')
        ) {
          event.preventDefault();
          if (event.shiftKey) void exportFile();
          else void save();
        }
      }}
      onDragOver={(event) => {
        if (!native && event.dataTransfer.types.includes('Files'))
          event.preventDefault();
      }}
      onDrop={(event) => {
        if (native || !event.dataTransfer.files.length) return;
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        if (dropped.length + files.length > 32) {
          setError('opening.tooMany');
          return;
        }
        setDropped((current) => [...current, ...files]);
      }}
    >
      <OfficeMenubar label={t('office.menu.label')} menus={menus} />
      <header
        className={`office-quickbar ${project && view === 'workspace' ? 'workspace-header' : ''}`}
        role="toolbar"
        aria-label={t('office.fileTools')}
      >
        <button
          className="office-tool-button"
          aria-label={t('project.create')}
          title={t('project.create')}
          disabled={busy || propertyDraft}
          onClick={() => replace(create)}
        >
          <Icon name="plus" />
        </button>
        <button
          className="office-tool-button"
          aria-label={t('project.import')}
          title={t('project.import')}
          disabled={busy || propertyDraft}
          onClick={openImport}
        >
          <Icon name="import" />
        </button>
        <button
          className="office-tool-button"
          aria-label={t('project.save')}
          title={`${t('project.save')} · Ctrl+S`}
          disabled={!project || busy || propertyDraft}
          onClick={() => void save()}
        >
          <Icon name="save" />
        </button>
        <button
          className="office-tool-button"
          aria-label={t(native ? 'export.saveAs' : 'project.export')}
          title={t(native ? 'export.saveAs' : 'project.export')}
          disabled={unavailable || propertyDraft}
          onClick={() => void exportFile()}
        >
          <Icon name="export" />
        </button>
        <span className="office-toolbar-divider" />
        <button
          className="office-tool-button"
          aria-label={t('editing.undo')}
          title={t('editing.undo')}
          disabled={
            unavailable ||
            propertyDraft ||
            !activePage ||
            !activeDocument ||
            !project ||
            !history.status(project, activeDocument.id, activePage.id).undo
          }
          onClick={command('undo')}
        >
          <Icon name="undo" />
        </button>
        <button
          className="office-tool-button"
          aria-label={t('editing.redo')}
          title={t('editing.redo')}
          disabled={
            unavailable ||
            propertyDraft ||
            !activePage ||
            !activeDocument ||
            !project ||
            !history.status(project, activeDocument.id, activePage.id).redo
          }
          onClick={command('redo')}
        >
          <Icon name="redo" />
        </button>
        <span className="office-toolbar-divider" />
        <WorkbenchControls
          locale={locale}
          expanded={false}
          navigator={navigatorVisible}
          properties={commandState.propertiesVisible}
          objects={commandState.objectsVisible}
          disabled={!project}
          onNavigator={() => setNavigatorVisible((value) => !value)}
          onProperties={() => canvasRef.current?.toggleProperties()}
          onObjects={() => canvasRef.current?.toggleObjects()}
          onExpand={() => {
            if (canvasRef.current?.prepare()) setExpanded(true);
          }}
        />
        {project && view === 'workspace' && (
          <div className="office-document-name">
            <h1 className="sr-only">{project.manifest.title}</h1>
            <ProjectNameField
              inputRef={nameRef}
              title={project.manifest.title}
              locale={locale}
              disabled={busy || propertyDraft}
              onRename={renameActive}
            />
          </div>
        )}
        <p
          className={`save-status ${dirty || propertyDraft ? 'pending' : ''}`}
          aria-live="polite"
        >
          {propertyDraft
            ? t('office.unapplied')
            : operation
              ? t(`operation.${operation}`)
              : project
                ? t(dirty ? 'project.unsaved' : 'project.saved')
                : t('status.local')}
        </p>
        <button
          className="office-tool-button"
          aria-label={t('office.settings')}
          title={t('office.settings')}
          onClick={() => setSettingsOpen(true)}
        >
          <Icon name="settings" />
        </button>
      </header>
      {native && (
        <NativeOpen
          invoke={native.invoke}
          locale={locale}
          error={error}
          paused={
            busy ||
            propertyDraft ||
            importing ||
            !!confirmation ||
            navigationBusy ||
            settingsOpen ||
            missingTarget
          }
          onError={(code) => {
            setError(
              code === 'tooMany'
                ? 'opening.tooMany'
                : code === 'tooLarge'
                  ? 'project.error.tooLarge'
                  : code === 'invalid'
                    ? 'project.error.invalid'
                    : 'project.error.storage',
            );
          }}
          onOpen={(bytes, copy) =>
            preserveAndRun(async () => {
              await importBytes(bytes, copy, true);
            })
          }
        />
      )}
      {dropFailed && (
        <Dialog
          title={t('opening.failed')}
          onCancel={() => {
            setDropped((current) => current.slice(1));
            setDropFailed(false);
            setDropCopy(false);
          }}
        >
          <p>{dropped[0]?.name}</p>
          {error && <p role="alert">{t(error)}</p>}
          <p>{t('opening.help')}</p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={dropCopy}
              onChange={(event) => setDropCopy(event.target.checked)}
            />
            {t('project.asCopy')}
          </label>
          <div className="dialog-actions">
            <button
              className="button"
              onClick={() => {
                setDropped((current) => current.slice(1));
                setDropFailed(false);
                setDropCopy(false);
              }}
            >
              {t('project.cancel')}
            </button>
            <button
              className="button primary"
              onClick={() => setDropFailed(false)}
            >
              {t('opening.retry')}
            </button>
          </div>
        </Dialog>
      )}
      {missingTarget && (
        <Dialog
          title={t('links.targetMissing')}
          onCancel={() => setMissingTarget(false)}
        >
          <p role="alert">{t('links.locateHelp')}</p>
          <div className="dialog-actions">
            <button className="button" onClick={() => setMissingTarget(false)}>
              {t('project.cancel')}
            </button>
            <button
              className="button primary"
              onClick={() => {
                setMissingTarget(false);
                setError(null);
                setImporting(true);
              }}
            >
              {t('links.locate')}
            </button>
          </div>
        </Dialog>
      )}
      <aside
        className="project-sidebar"
        aria-label={t('tree.heading')}
        hidden={!navigatorVisible}
      >
        <div className="sidebar-label">{t('nav.studio')}</div>
        <button
          className={`nav-item ${view === 'dashboard' ? 'selected' : ''}`}
          aria-current={view === 'dashboard' ? 'page' : undefined}
          onClick={() => {
            if (canvasRef.current && !canvasRef.current.prepare()) return;
            snapshot();
            setView('dashboard');
            setFocusVersion((n) => n + 1);
          }}
        >
          <Icon name="grid" />
          {t('project.recent')}
          <span className="count">{items.length}</span>
        </button>
        {!expanded && navigation}
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
            {native ? (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => {
                  setImporting(false);
                  setOperation('opening');
                  void native
                    .invoke('project_open_choose', {
                      title: t('project.import'),
                      filter: t('export.fileType'),
                      asCopy,
                    })
                    .catch(report)
                    .finally(() => setOperation(null));
                }}
              >
                {t('import.choose')}
              </button>
            ) : (
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
            )}
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
          <StartPage
            project={project}
            items={items}
            busy={busy}
            operation={operation}
            locale={locale}
            native={!!native}
            titleRef={titleRef}
            onCreate={() => replace(create)}
            onImport={openImport}
            onRefresh={() => {
              setOperation('loading');
              void refresh()
                .catch(report)
                .finally(() => setOperation(null));
            }}
            onOpen={(id) => replace(() => void open(id))}
            onRecover={(id) =>
              setConfirmation({
                message: 'project.recoverConfirm',
                action: () => replace(() => void open(id, true)),
              })
            }
            onRename={renameStored}
          />
        ) : (
          <>
            <div className="workspace-layout">
              {activePage && activeDocument && (
                <div
                  className={`canvas-workbook ${expanded ? 'canvas-workbook-expanded' : ''}`}
                  inert={navigationBusy}
                  role={expanded ? 'dialog' : undefined}
                  aria-modal={expanded ? true : undefined}
                  aria-label={t('workspace.canvas')}
                >
                  <NavigationContext.Provider
                    value={{
                      projects: items,
                      busy: busy && operation !== 'saving',
                      loadProject: async (id) => {
                        const current = projectRef.current;
                        return current?.manifest.projectId === id
                          ? current
                          : (await repository.open(id)).project;
                      },
                      follow: followTarget,
                    }}
                  >
                    <Canvas
                      expanded={expanded}
                      navigatorOpen={navigatorOpen}
                      onNavigate={() => setNavigatorOpen(true)}
                      onExpanded={setExpanded}
                      key={`${loadVersion}:${project.manifest.projectId}:${activePage.id}`}
                      ref={canvasRef}
                      project={project}
                      projectDetails={projectDetails}
                      onPropertyDraft={setPropertyDraft}
                      onCommandState={setCommandState}
                      focusTarget={navigationBusy ? null : focusTarget}
                      onTargetApplied={() => setFocusTarget(null)}
                      onFollowPage={(id) => {
                        const doc = projectRef.current?.documents.find((d) =>
                          d.pages.some((p) => p.id === id),
                        );
                        if (
                          !doc ||
                          navigationLock.current ||
                          (canvasRef.current && !canvasRef.current.prepare())
                        )
                          return false;
                        switchPage(doc.id, id);
                        setNotice(
                          t('links.navigated', {
                            page: doc.pages.find((p) => p.id === id)!.title,
                          }),
                        );
                        requestAnimationFrame(() =>
                          document
                            .querySelector<HTMLElement>('.interactive-canvas')
                            ?.focus(),
                        );
                        return true;
                      }}
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
                  </NavigationContext.Provider>
                  <WorkbookTabs
                    documents={project.documents}
                    document={activeDocument}
                    pageId={activePage.id}
                    locale={locale}
                    locked={
                      propertyDraft ||
                      navigationBusy ||
                      (busy && operation !== 'saving')
                    }
                    onSelect={switchPage}
                    onRename={(pageId, title) =>
                      workbook({ type: 'renamePage', pageId, title })
                    }
                    onCreate={() =>
                      workbook({
                        type: 'newPage',
                        documentId: activeDocument.id,
                        title: t('tabs.newPageName', {
                          number: activeDocument.pages.length + 1,
                        }),
                      })
                    }
                  />
                  {expanded && navigatorOpen && (
                    <Dialog
                      className="office-navigator-dialog"
                      title={t('tree.heading')}
                      onCancel={() => setNavigatorOpen(false)}
                    >
                      {navigation}
                    </Dialog>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
      {settingsOpen && (
        <OfficeSettings
          locale={locale}
          theme={theme}
          guiScale={guiScale}
          onGuiScale={onGuiScale}
          onLocale={onLocale}
          onTheme={onTheme}
          blocked={propertyDraft}
          busy={settingsBusy}
          onClose={() => setSettingsOpen(false)}
          storage={
            native ? (
              <StorageSettings
                embedded
                locale={locale}
                run={preserveAndRun}
                onChanged={storageChanged}
                onBusyChange={setSettingsBusy}
              />
            ) : undefined
          }
          integration={
            native ? (
              <AppImageIntegration locale={locale} invoke={native.invoke} />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
