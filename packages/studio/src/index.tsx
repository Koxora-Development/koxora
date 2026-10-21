import { Projects } from './projects';
import { useEffect, useState } from 'react';
import { locales, translate, type MessageKey } from '@koxora/i18n';
import { FeatureCard, Mark } from '@koxora/ui';
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
      <aside className="sidebar">
        <a className="brand" href="#workspace">
          <span className="brand-mark">
            <Mark />
          </span>
          <span>
            {t('app.name')}
            <small>{t('app.subtitle')}</small>
          </span>
        </a>
        <nav aria-label={t('nav.workspace')}>
          {(['workspace', 'foundation', 'preferences'] as const).map(
            (item, i) => (
              <a key={item} href={`#${item}`}>
                <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                {t(`nav.${item}`)}
              </a>
            ),
          )}
        </nav>
        <p className="local-label">
          <span className="status-dot" />
          {t('status.local')}
        </p>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span>{t('nav.workspace')}</span>
          <span className="connection" role="status">
            <span className="status-dot" />
            {t(online ? 'status.online' : 'status.offline')}
          </span>
        </header>
        <main id="workspace" tabIndex={-1}>
          <section className="hero">
            <p className="eyebrow">{t('hero.eyebrow')}</p>
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.description')}</p>
          </section>
          <section
            className="workspace-section"
            aria-labelledby="workspace-title"
          >
            <div className="section-heading">
              <h2 id="workspace-title">{t('workspace.title')}</h2>
              <span className="badge">{t('workspace.badge')}</span>
            </div>
            <Projects locale={preferences.locale} />
            <p className="workspace-note">{t('workspace.note')}</p>
          </section>
          <section id="foundation" aria-labelledby="foundation-title">
            <h2 id="foundation-title">{t('foundation.title')}</h2>
            <div className="feature-grid">
              {(['shared', 'local', 'open'] as const).map((item, i) => (
                <FeatureCard
                  key={item}
                  index={i + 1}
                  title={t(`foundation.${item}.title`)}
                >
                  {t(`foundation.${item}.description`)}
                </FeatureCard>
              ))}
            </div>
          </section>
          <section
            id="preferences"
            className="preferences"
            aria-labelledby="preferences-title"
          >
            <div>
              <h2 id="preferences-title">{t('preferences.title')}</h2>
              <p>{t('preferences.description')}</p>
            </div>
            <div className="preference-controls">
              <label>
                {t('preferences.language')}
                <select
                  value={preferences.locale}
                  onChange={(event) =>
                    updatePreferences({
                      ...preferences,
                      locale: event.target.value,
                    })
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
                {t('preferences.theme')}
                <select
                  value={preferences.theme}
                  onChange={(event) =>
                    updatePreferences({
                      ...preferences,
                      theme: event.target.value as Theme,
                    })
                  }
                >
                  <option value="light">{t('theme.light')}</option>
                  <option value="dark">{t('theme.dark')}</option>
                </select>
              </label>
            </div>
            {storageFailed && <p role="alert">{t('storage.unavailable')}</p>}
          </section>
          <footer>{t('footer.milestone')}</footer>
        </main>
      </div>
    </div>
  );
}
