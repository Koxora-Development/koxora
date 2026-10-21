import { useCallback, useEffect, useRef, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  createProject,
  MAX_BYTES,
  parseProject,
  ProjectError,
  serializeProject,
  type Project,
} from '@koxora/project';
import {
  IndexedDbStore,
  NativeStore,
  ProjectRepository,
  type Invoke,
} from '@koxora/persistence';
const native = (
  window as unknown as { __TAURI__?: { core: { invoke: Invoke } } }
).__TAURI__?.core;
function Confirmation({
  message,
  confirm,
  cancel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="project-confirmation"
      onCancel={onCancel}
    >
      <p id="project-confirmation">{message}</p>
      <div className="project-actions">
        <button type="button" onClick={onCancel}>
          {cancel}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </dialog>
  );
}
export function Projects({ locale }: { locale: string }) {
  const t = (key: MessageKey) => translate(locale, key);
  const [repository] = useState(
    () =>
      new ProjectRepository(
        native ? new NativeStore(native.invoke) : new IndexedDbStore(),
      ),
  );
  const [project, setProject] = useState<Project | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [saved, setSaved] = useState<Project | null>(null);
  const [items, setItems] = useState<{ id: string; title: string | null }[]>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [asCopy, setAsCopy] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    message: MessageKey;
    action: () => void;
  } | null>(null);
  const dirty = project !== saved;
  function report(error: unknown) {
    setError(
      `project.error.${error instanceof ProjectError ? error.code : 'storage'}`,
    );
  }
  const refresh = useCallback(async () => {
    setItems(await repository.list());
  }, [repository]);
  useEffect(() => {
    let active = true;
    void repository
      .list()
      .then((items) => {
        if (active) setItems(items);
      })
      .catch((error) => {
        if (active) report(error);
      });
    return () => {
      active = false;
    };
  }, [repository]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = useCallback(async () => {
    if (!project || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await repository.save(project, token);
      setToken(next);
      setSaved(project);
      await refresh();
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  }, [project, busy, repository, token, refresh]);
  useEffect(() => {
    if (!dirty || !project || busy || error || confirmation) return;
    const timer = window.setTimeout(() => {
      void save();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [dirty, project, busy, error, save, confirmation]);
  function replace(action: () => void) {
    if (dirty) setConfirmation({ message: 'project.discard', action });
    else action();
  }
  function create() {
    setProject(
      createProject(
        t('project.untitled'),
        () => crypto.randomUUID(),
        new Date().toISOString(),
      ),
    );
    setSaved(null);
    setToken(null);
    setError(null);
    setExportPath(null);
  }
  async function open(id: string, previous = false) {
    setBusy(true);
    setError(null);
    try {
      const result = await repository.open(id, previous);
      setProject(result.project);
      setSaved(previous ? null : result.project);
      setToken(result.token);
      setExportPath(null);
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      if (file.size > MAX_BYTES) throw new ProjectError('tooLarge');
      const imported = parseProject(
        new TextDecoder('utf-8', { fatal: true }).decode(
          await file.arrayBuffer(),
        ),
      );
      if (asCopy) imported.projectId = crypto.randomUUID();
      // A duplicate identity is never silently replaced. Import must commit before switching views.
      const next = await repository.save(imported, null);
      setProject(imported);
      setSaved(imported);
      setToken(next);
      setExportPath(null);
      await refresh();
    } catch (error) {
      report(error instanceof TypeError ? new ProjectError('invalid') : error);
    } finally {
      setBusy(false);
    }
  }
  async function exportFile() {
    if (!project) return;
    setBusy(true);
    setError(null);
    setExportPath(null);
    try {
      const text = serializeProject(project);
      if (native) {
        setExportPath(
          await native.invoke<string>('project_export', {
            id: project.projectId,
            text,
          }),
        );
      } else {
        const url = URL.createObjectURL(
          new Blob([text], { type: 'application/json' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `koxora-${project.projectId}.koxora`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="project-panel">
      {confirmation && (
        <Confirmation
          message={t(confirmation.message)}
          confirm={t('project.confirm')}
          cancel={t('project.cancel')}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            const action = confirmation.action;
            setConfirmation(null);
            action();
          }}
        />
      )}
      <div className="project-actions">
        <button type="button" disabled={busy} onClick={() => replace(create)}>
          {t('project.create')}
        </button>
        <label>
          {t('project.import')}
          <input
            type="file"
            accept=".koxora"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) replace(() => void importFile(file));
            }}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={asCopy}
            disabled={busy}
            onChange={(event) => setAsCopy(event.target.checked)}
          />
          {t('project.asCopy')}
        </label>
      </div>
      {project && (
        <div className="project-editor">
          <label>
            {t('project.name')}
            <input
              value={project.title}
              maxLength={1024}
              disabled={busy}
              onChange={(event) => {
                setError(null);
                setProject({
                  ...project,
                  title: event.target.value,
                  updatedAt: new Date(
                    Math.max(Date.now(), Date.parse(project.updatedAt)),
                  ).toISOString(),
                });
              }}
            />
          </label>
          <p aria-live="polite">
            {t(
              busy
                ? 'project.saving'
                : dirty
                  ? 'project.unsaved'
                  : 'project.saved',
            )}
          </p>
          <div className="project-actions">
            <button type="button" disabled={busy} onClick={() => void save()}>
              {t('project.save')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void exportFile()}
            >
              {t('project.export')}
            </button>
          </div>
          <p>{t('project.canvasLater')}</p>
        </div>
      )}
      {error && <p role="alert">{t(error)}</p>}
      {exportPath && (
        <p>{translate(locale, 'project.exported', { path: exportPath })}</p>
      )}
      <h3>{t('project.recent')}</h3>
      <button
        type="button"
        disabled={busy}
        onClick={() => void refresh().catch(report)}
      >
        {t('project.refresh')}
      </button>
      <ul className="project-list">
        {items.map((item) => (
          <li key={item.id}>
            <span dir="auto">{item.title ?? t('project.unreadable')}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => replace(() => void open(item.id))}
            >
              {t('project.open')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirmation({
                  message: 'project.recoverConfirm',
                  action: () => replace(() => void open(item.id, true)),
                });
              }}
            >
              {t('project.recover')}
            </button>
          </li>
        ))}
      </ul>
      <p>{t('project.backup')}</p>
    </div>
  );
}
