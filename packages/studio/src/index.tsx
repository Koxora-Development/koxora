import './phase25.css';
import { Projects } from './projects';
import { useEffect, useState } from 'react';
import { locales, translate, type MessageKey } from '@koxora/i18n';
import { Mark, Icon } from '@koxora/ui';
import { readPreferences, writePreferences, type Theme } from './preferences';
export function Studio() {
  const [preferences, setPreferences] = useState(() =>
    readPreferences({ getItem: (key) => localStorage.getItem(key) }),
  );
  const [storageFailed, setStorageFailed] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const t = (key: MessageKey) => translate(preferences.locale, key);
  useEffect(() => {
    document.documentElement.lang = preferences.locale;
    document.documentElement.dir = locales[preferences.locale].direction;
    document.documentElement.dataset.theme = preferences.theme;
    document.title = translate(preferences.locale, 'app.title');
  }, [preferences]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  function updatePreferences(next: typeof preferences) {
    setPreferences(next);
    setStorageFailed(
      !writePreferences(
        { setItem: (key, value) => localStorage.setItem(key, value) },
        next,
      ),
    );
  }
  return (
    <div className="studio-shell">
      <a className="skip-link" href="#workspace">
        {t('app.skip')}
      </a>
      <header className="app-header">
        <a className="brand" href="#workspace">
          <Mark />
          <span>{t('app.name')}</span>
          <span className="brand-divider" />
          <small>{t('app.subtitle')}</small>
        </a>
        <span className="connection">
          <Icon name="shield" />
          {t(online ? 'status.online' : 'status.offline')}
        </span>
        <div className="preference-controls">
          <label>
            <span>{t('preferences.language')}</span>
            <select
              value={preferences.locale}
              onChange={(e) =>
                updatePreferences({ ...preferences, locale: e.target.value })
              }
            >
              {Object.entries(locales).map(([code, locale]) => (
                <option key={code} value={code}>
                  {locale.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('preferences.theme')}</span>
            <select
              value={preferences.theme}
              onChange={(e) =>
                updatePreferences({
                  ...preferences,
                  theme: e.target.value as Theme,
                })
              }
            >
              <option value="light">{t('theme.light')}</option>
              <option value="dark">{t('theme.dark')}</option>
            </select>
          </label>
        </div>
      </header>
      {storageFailed && (
        <div className="notification error" role="alert">
          {t('storage.unavailable')}
        </div>
      )}
      <Projects locale={preferences.locale} />
    </div>
  );
}
