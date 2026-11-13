import { StorageGate } from './storage-settings';
import './phase25.css';
import './compact.css';
import './office.css';
import './gui-scale.css';
import './accessibility.css';
import { Projects } from './projects';
import { useEffect, useLayoutEffect, useState } from 'react';
import { locales, translate, type MessageKey } from '@koxora/i18n';
import { Mark } from '@koxora/ui';
import { readPreferences, writePreferences, systemLocale } from './preferences';
export function Studio() {
  const [preferences, setPreferences] = useState(() =>
    readPreferences({ getItem: (key) => localStorage.getItem(key) }),
  );
  const [storageFailed, setStorageFailed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [systemLanguage, setSystemLanguage] = useState(() =>
    systemLocale(navigator.languages),
  );
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const locale =
    preferences.locale === 'system' ? systemLanguage : preferences.locale;
  const theme =
    preferences.theme === 'system'
      ? systemDark
        ? 'dark'
        : 'light'
      : preferences.theme;
  const t = (key: MessageKey) => translate(locale, key);
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      '--ui-scale',
      String(preferences.guiScale / 100),
    );
    document.documentElement.dataset.uiScale = String(preferences.guiScale);
    document.documentElement.dataset.accessibility = String(
      preferences.accessibility,
    );
    document.documentElement.lang = locale;
    document.documentElement.dir = locales[locale].direction;
    document.documentElement.dataset.theme = theme;
    document.title = translate(locale, 'app.title');
  }, [preferences, locale, theme]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => setSystemDark(media.matches);
    const updateLanguage = () =>
      setSystemLanguage(systemLocale(navigator.languages));
    media.addEventListener('change', updateTheme);
    window.addEventListener('languagechange', updateLanguage);
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      media.removeEventListener('change', updateTheme);
      window.removeEventListener('languagechange', updateLanguage);
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
    <div
      className="studio-shell"
      data-accessibility={preferences.accessibility}
      data-ui-narrow={viewportWidth < (1000 * preferences.guiScale) / 100}
      data-ui-small={viewportWidth < (650 * preferences.guiScale) / 100}
    >
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
        <span className="office-window-caption">{t('office.windowTitle')}</span>
      </header>
      {storageFailed && (
        <div className="notification error" role="alert">
          {t('storage.unavailable')}
        </div>
      )}
      <StorageGate
        locale={locale}
        onLocale={(locale) => updatePreferences({ ...preferences, locale })}
      >
        <Projects
          locale={locale}
          localePreference={preferences.locale}
          theme={preferences.theme}
          guiScale={preferences.guiScale}
          accessibility={preferences.accessibility}
          onGuiScale={(guiScale) =>
            updatePreferences({ ...preferences, guiScale })
          }
          onAccessibility={(accessibility) =>
            updatePreferences({ ...preferences, accessibility })
          }
          onLocale={(locale) => updatePreferences({ ...preferences, locale })}
          onTheme={(theme) => updatePreferences({ ...preferences, theme })}
        />
      </StorageGate>
    </div>
  );
}
