import { useState } from 'react';
import { Dialog } from '@koxora/ui';
import { translate, type MessageKey } from '@koxora/i18n';
import { SHORTCUT_GROUPS, isMacPlatform } from './shortcuts';

export function KeyboardShortcuts({
  locale,
  onClose,
}: {
  locale: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const mod = isMacPlatform(navigator.platform)
    ? '⌘ Cmd'
    : translate(locale, 'shortcuts.ctrl');
  const t = (key: MessageKey) => translate(locale, key, { mod });
  const groups = SHORTCUT_GROUPS.map((g) => ({
    ...g,
    entries: g.entries.filter((e) =>
      `${t(g.title)} ${t(e.keys)} ${t(e.action)}`
        .toLocaleLowerCase(locale)
        .includes(query.toLocaleLowerCase(locale)),
    ),
  })).filter((g) => g.entries.length);
  return (
    <Dialog title={t('canvas.help')} onCancel={onClose}>
      <div className="shortcut-guide">
        <p>{t('canvas.helpBody')}</p>
        <label className="field-label">
          {t('shortcuts.search')}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {groups.map((g) => (
          <section key={g.title}>
            <h3>{t(g.title)}</h3>
            <dl>
              {g.entries.map((e) => (
                <div key={e.action}>
                  <dt>
                    <kbd>{t(e.keys)}</kbd>
                  </dt>
                  <dd>{t(e.action)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        {!groups.length && <p role="status">{t('shortcuts.empty')}</p>}
        <button className="button" onClick={onClose}>
          {t('shortcuts.close')}
        </button>
      </div>
    </Dialog>
  );
}
