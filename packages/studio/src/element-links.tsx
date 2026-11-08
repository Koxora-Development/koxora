import { translate, type MessageKey } from '@koxora/i18n';
import { safeExternalUrl, type Project } from '@koxora/project';
import { type LinkTarget, type LinkState } from '@koxora/editor-core';

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
  const pages = project.documents.flatMap((d) => d.pages);
  const missing =
    value?.type === 'page' && !pages.some((p) => p.id === value.pageId);
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
                      ? { type, pageId: pages[0].id }
                      : null,
                );
              }}
            >
              <option value="none">{t('links.none')}</option>
              <option value="url">{t('links.url')}</option>
              <option value="page">{t('links.page')}</option>
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
              <span className="field-help">{t('links.externalHelp')}</span>
              {!!value.url && !safeExternalUrl(value.url) && (
                <span role="alert">{t('links.invalid')}</span>
              )}
            </label>
          )}
          {value?.type === 'page' && (
            <label>
              {t('links.destination')}
              <select
                aria-label={t('links.destination')}
                value={value.pageId}
                onChange={(event) =>
                  onChange({ type: 'page', pageId: event.target.value })
                }
              >
                {missing && (
                  <option value={value.pageId}>{t('links.missing')}</option>
                )}
                {project.documents.map((d) => (
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
          {value && (
            <button
              className="button compact"
              type="button"
              onClick={() => onChange(null)}
            >
              {t('links.remove')}
            </button>
          )}
          <p className="field-help">{t('links.help')}</p>
        </>
      )}
    </fieldset>
  );
}
