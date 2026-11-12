import { InfoDisclosure } from './info-disclosure';
import { useContext, useEffect, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import { safeExternalUrl, type Project } from '@koxora/project';
import {
  buildScene,
  type LinkTarget,
  type LinkState,
} from '@koxora/editor-core';
import { NavigationContext } from './navigation-context';
export function LinkFields({
  project,
  value,
  initial,
  locale,
  onChange,
}: {
  project: Project;
  value: LinkTarget | null;
  initial: LinkState;
  locale: string;
  onChange: (value: LinkTarget | null) => void;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const navigation = useContext(NavigationContext);
  const [remote, setRemote] = useState<Project | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const remoteId = value?.type === 'project' ? value.projectId : null;
  const load = navigation?.loadProject;
  useEffect(() => {
    let active = true;
    if (!remoteId || !load) return;
    void load(remoteId)
      .then((value) => {
        if (active) {
          setRemote(value);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) {
          setRemote(null);
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [remoteId, load, loadVersion]);
  const destination =
    value?.type === 'project'
      ? remote?.manifest.projectId === value.projectId
        ? remote
        : null
      : project;
  const pages = destination?.documents.flatMap((d) => d.pages) ?? [];
  const page =
    value && value.type !== 'url'
      ? pages.find((p) => p.id === value.pageId)
      : undefined;
  const missing = !!value && value.type !== 'url' && !!value.pageId && !page;
  const projects =
    navigation?.projects.filter(
      (p) => p.id !== project.manifest.projectId && p.title !== null,
    ) ?? [];
  const targetScene = page
    ? buildScene(page, [
        ...(destination?.themes.flatMap((theme) => theme.styles) ?? []),
        ...(destination?.documents.flatMap((doc) => doc.styles) ?? []),
      ])
    : null;
  const elements = targetScene
    ? [...targetScene.nodes, ...targetScene.connections].map((item) => ({
        id: item.id,
        label: item.label || item.id,
      }))
    : [];
  function setPage(pageId: string) {
    if (value?.type === 'project')
      onChange({
        type: 'project',
        projectId: value.projectId,
        ...(pageId ? { pageId } : {}),
      });
    else if (value?.type === 'element')
      onChange({ type: 'element', pageId, elementId: '' });
    else onChange({ type: 'page', pageId });
  }
  return (
    <fieldset className="element-links">
      <legend>{t('links.heading')}</legend>
      {initial.state === 'unsupported' ? (
        <p role="status">{t('links.unsupported')}</p>
      ) : (
        <>
          <label>
            {t('links.type')}
            <select
              aria-label={t('links.type')}
              value={value?.type ?? 'none'}
              onChange={(event) => {
                const type = event.target.value;
                onChange(
                  type === 'url'
                    ? { type, url: '' }
                    : type === 'page'
                      ? { type, pageId: project.documents[0].pages[0].id }
                      : type === 'element'
                        ? {
                            type,
                            pageId: project.documents[0].pages[0].id,
                            elementId: '',
                          }
                        : type === 'project'
                          ? { type, projectId: projects[0]?.id ?? '' }
                          : null,
                );
              }}
            >
              <option value="none">{t('links.none')}</option>
              <option value="url">{t('links.url')}</option>
              <option value="page">{t('links.page')}</option>
              <option value="element">{t('links.element')}</option>
              <option value="project">{t('links.project')}</option>
            </select>
          </label>
          {value?.type === 'url' && (
            <label>
              {t('links.address')}
              <input
                aria-label={t('links.address')}
                type="text"
                inputMode="url"
                required
                maxLength={2048}
                value={value.url}
                onChange={(event) =>
                  onChange({ type: 'url', url: event.target.value })
                }
              />

              {!!value.url && !safeExternalUrl(value.url) && (
                <span role="alert">{t('links.invalid')}</span>
              )}
            </label>
          )}
          {value?.type === 'project' && (
            <label>
              {t('links.targetProject')}
              <select
                aria-label={t('links.targetProject')}
                value={value.projectId}
                onChange={(event) => {
                  setRemote(null);
                  setFailed(false);
                  setLoadVersion((version) => version + 1);
                  onChange({ type: 'project', projectId: event.target.value });
                }}
              >
                {!projects.some((p) => p.id === value.projectId) && (
                  <option value={value.projectId}>
                    {value.projectId
                      ? t('links.targetMissing')
                      : t('links.chooseProject')}
                  </option>
                )}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>

              {(!projects.length || failed) && (
                <span role="status">{t('links.targetMissing')}</span>
              )}
            </label>
          )}
          {value && value.type !== 'url' && (
            <label>
              {t('links.destination')}
              <select
                aria-label={t('links.destination')}
                value={value.pageId ?? ''}
                disabled={!destination}
                onChange={(event) => setPage(event.target.value)}
              >
                {value.type === 'project' && (
                  <option value="">{t('links.projectHome')}</option>
                )}
                {missing && (
                  <option value={value.pageId}>
                    {t('links.targetMissing')}
                  </option>
                )}
                {destination?.documents.map((d) => (
                  <optgroup key={d.id} label={d.title}>
                    {d.pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {missing && <span role="alert">{t('links.missing')}</span>}
            </label>
          )}
          {(value?.type === 'element' || value?.type === 'project') && (
            <label>
              {t('links.targetElement')}
              <select
                aria-label={t('links.targetElement')}
                value={value.elementId ?? ''}
                disabled={!page}
                onChange={(event) => {
                  const id = event.target.value;
                  if (value.type === 'element')
                    onChange({ ...value, elementId: id });
                  else
                    onChange({
                      type: 'project',
                      projectId: value.projectId,
                      ...(value.pageId ? { pageId: value.pageId } : {}),
                      ...(id ? { elementId: id } : {}),
                    });
                }}
              >
                <option value="">
                  {t(
                    value.type === 'element'
                      ? 'links.chooseElement'
                      : 'links.pageOnly',
                  )}
                </option>
                {value.elementId &&
                  !elements.some((e) => e.id === value.elementId) && (
                    <option value={value.elementId}>
                      {t('links.missing')}
                    </option>
                  )}
                {elements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {value && (
            <button
              className="button compact"
              type="button"
              onClick={() => onChange(null)}
            >
              {t('links.remove')}
            </button>
          )}
          <InfoDisclosure
            className="field-help compact-help"
            title={t('controls.help')}
          >
            <p>{t('links.help')}</p>
            {value?.type === 'url' && <p>{t('links.externalHelp')}</p>}
            {value?.type === 'project' && (
              <>
                <p>{t('links.localProjects')}</p>
                <p>{t('links.locateHelp')}</p>
              </>
            )}
          </InfoDisclosure>
        </>
      )}
    </fieldset>
  );
}
