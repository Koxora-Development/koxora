import { useId, type Ref } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import { Icon } from '@koxora/ui';
import type { Project } from '@koxora/project';
import type { ProjectSummary } from '@koxora/persistence';
import { ProjectTitle } from './project-title';
import './start-page.css';

export interface StartPageProps {
  project: Project | null;
  items: ProjectSummary[];
  busy: boolean;
  operation:
    'loading' | 'opening' | 'saving' | 'importing' | 'exporting' | null;
  locale: string;
  native: boolean;
  titleRef?: Ref<HTMLHeadingElement>;
  onCreate: () => void;
  onImport: () => void;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  onRecover: (id: string) => void;
  onRename: (id: string, title: string) => boolean | Promise<boolean>;
}

/** The local library starts projects; templates are an honest future entry point. */
export function StartPage({
  project,
  items,
  busy,
  operation,
  locale,
  native,
  titleRef,
  onCreate,
  onImport,
  onRefresh,
  onOpen,
  onRecover,
  onRename,
}: StartPageProps) {
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    translate(locale, key, values);
  const libraryId = useId();
  const templatesId = useId();
  const dates = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return (
    <div className="studio-start">
      <header className="start-heading dashboard-heading">
        <div>
          <p className="start-local-note">
            <Icon name="shield" />
            {t('start.localNote')}
          </p>
          <h1 ref={titleRef} tabIndex={-1}>
            {t('start.library')}
          </h1>
          <p className="start-description">{t('start.libraryDescription')}</p>
        </div>
        <div className="start-actions">
          <button className="button primary" disabled={busy} onClick={onCreate}>
            <Icon name="plus" />
            {t('start.blank')}
          </button>
          <button className="button" disabled={busy} onClick={onImport}>
            <Icon name="import" />
            {t('start.openFile')}
          </button>
        </div>
      </header>
      <div className="start-content">
        <section className="start-library" aria-labelledby={libraryId}>
          <div className="start-section-heading">
            <h2 id={libraryId}>
              {t('project.recent')}
              <span className="start-count">
                {new Intl.NumberFormat(locale).format(items.length)}
              </span>
            </h2>
            <button
              className="button subtle"
              aria-label={t('project.refresh')}
              title={t('project.refresh')}
              disabled={busy}
              onClick={onRefresh}
            >
              <Icon name="refresh" />
              {t('project.refresh')}
            </button>
          </div>
          {operation && (
            <p className="start-loading" role="status">
              <span className="spinner" />
              {t(`operation.${operation}`)}
            </p>
          )}
          {!items.length && !busy ? (
            <div className="start-empty">
              <Icon name="file" />
              <div>
                <h3>{t('dashboard.emptyTitle')}</h3>
                <p>{t('dashboard.emptyDescription')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="start-list-columns" aria-hidden="true">
                <span>{t('project.name')}</span>
                <span>{t('start.updated')}</span>
                <span />
              </div>
              <ul className="start-project-list">
                {items.map((item) => {
                  const active = project?.manifest.projectId === item.id;
                  const updated = item.updatedAt
                    ? new Date(item.updatedAt)
                    : null;
                  return (
                    <li
                      key={item.id}
                      className={`project-card start-project-row ${active ? 'active' : ''}`}
                    >
                      <div className="start-project-main">
                        <span className="start-project-icon" aria-hidden="true">
                          <Icon name="file" />
                        </span>
                        <div className="start-project-copy">
                          <ProjectTitle
                            title={
                              active && project
                                ? project.manifest.title
                                : (item.title ?? t('project.unreadable'))
                            }
                            locale={locale}
                            disabled={busy || item.title === null}
                            onRename={(title) => onRename(item.id, title)}
                          />
                          <p className="card-meta">
                            {item.title !== null
                              ? t('project.structure', {
                                  documents: item.documents ?? 0,
                                  pages: item.pages ?? 0,
                                })
                              : t('project.recoveryAvailable')}
                            {active && (
                              <span className="badge">
                                {t('workspace.activeBadge')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="start-project-date">
                        {updated && Number.isFinite(updated.getTime()) && (
                          <time dateTime={updated.toISOString()}>
                            <span className="sr-only">
                              {t('start.updated')}{' '}
                            </span>
                            {dates.format(updated)}
                          </time>
                        )}
                      </div>
                      <div className="start-row-actions">
                        <button
                          className="button open-button"
                          disabled={busy}
                          onClick={() => onOpen(item.id)}
                        >
                          {t('project.open')}
                          <Icon name="arrow" />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t('project.recover')}
                          title={t('project.recover')}
                          disabled={busy}
                          onClick={() => onRecover(item.id)}
                        >
                          <Icon name="refresh" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {!native && <p className="start-drop-note">{t('opening.drop')}</p>}
          <details className="start-help">
            <summary>{t('controls.help')}</summary>
            <p>{t('project.backup')}</p>
            <p>{t('workspace.note')}</p>
          </details>
        </section>
        <aside className="start-templates" aria-labelledby={templatesId}>
          <div className="start-templates-heading">
            <Icon name="grid" />
            <h2 id={templatesId}>{t('start.templates')}</h2>
          </div>
          <p className="start-planned">{t('start.templatesPlanned')}</p>
          <p>{t('start.templatesDescription')}</p>
        </aside>
      </div>
    </div>
  );
}
