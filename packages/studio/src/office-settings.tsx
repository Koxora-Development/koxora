import { useId, useState, type ReactNode } from 'react';
import { Dialog } from '@koxora/ui';
import { locales, translate, type MessageKey } from '@koxora/i18n';
import {
  guiScales,
  resolveGuiScale,
  type GuiScale,
  type Theme,
} from './preferences';
export function OfficeSettings({
  locale,
  localePreference,
  theme,
  guiScale,
  accessibility,
  onGuiScale,
  onAccessibility,
  onLocale,
  onTheme,
  storage,
  integration,
  blocked,
  busy,
  onClose,
}: {
  locale: string;
  localePreference: string;
  theme: Theme;
  guiScale: GuiScale;
  accessibility: boolean;
  onGuiScale: (scale: GuiScale) => void;
  onAccessibility: (enabled: boolean) => void;
  onLocale: (locale: string) => void;
  onTheme: (theme: Theme) => void;
  storage?: ReactNode;
  integration?: ReactNode;
  blocked: boolean;
  busy: boolean;
  onClose: () => void;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const [category, setCategory] = useState('general');
  const scaleHelpId = useId();
  const accessibilityHelpId = useId();
  const percentages = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  });
  const categories = ['general', ...(storage ? ['storage', 'files'] : [])];
  return (
    <Dialog
      className="office-settings-dialog"
      title={t('office.settings')}
      onCancel={() => {
        if (!busy) onClose();
      }}
    >
      <div className="office-settings-layout">
        <nav
          aria-label={t('office.settingsCategories')}
          className="office-settings-categories"
        >
          {categories.map((key) => (
            <button
              type="button"
              key={key}
              aria-current={category === key ? 'page' : undefined}
              disabled={busy || (blocked && key !== 'general')}
              onClick={() => setCategory(key)}
            >
              {t(`office.settings.${key}` as MessageKey)}
            </button>
          ))}
        </nav>
        <div className="office-settings-content">
          <section
            hidden={category !== 'general'}
            aria-label={t('office.settings.general')}
          >
            <h3>{t('office.settings.general')}</h3>
            <label>
              {t('preferences.language')}
              <select
                aria-label={t('preferences.language')}
                value={localePreference}
                onChange={(event) => onLocale(event.target.value)}
              >
                <option value="system">{t('preferences.system')}</option>
                {Object.entries(locales).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('preferences.theme')}
              <select
                aria-label={t('preferences.theme')}
                value={theme}
                onChange={(event) => onTheme(event.target.value as Theme)}
              >
                <option value="system">{t('preferences.system')}</option>
                <option value="light">{t('theme.light')}</option>
                <option value="dark">{t('theme.dark')}</option>
              </select>
            </label>
            <label>
              {t('preferences.scale')}
              <select
                aria-label={t('preferences.scale')}
                aria-describedby={scaleHelpId}
                value={guiScale}
                onChange={(event) =>
                  onGuiScale(resolveGuiScale(Number(event.target.value)))
                }
              >
                {guiScales.map((scale) => (
                  <option key={scale} value={scale}>
                    {percentages.format(scale / 100)}
                    {scale === 100 ? ` · ${t('preferences.scaleCompact')}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <p id={scaleHelpId} className="settings-note">
              {t('preferences.scaleHelp')}
            </p>
            <label className="accessibility-setting">
              <input
                type="checkbox"
                checked={accessibility}
                aria-describedby={accessibilityHelpId}
                onChange={(event) => onAccessibility(event.target.checked)}
              />
              {t('preferences.accessibility')}
            </label>
            <p id={accessibilityHelpId} className="settings-note">
              {t('preferences.accessibilityHelp')}
            </p>
            {blocked && <p role="status">{t('office.applyOrDiscard')}</p>}
          </section>
          <section
            hidden={category !== 'storage'}
            aria-label={t('office.settings.storage')}
          >
            {storage}
          </section>
          <section
            hidden={category !== 'files'}
            aria-label={t('office.settings.files')}
          >
            {integration}
          </section>
        </div>
      </div>
      <div className="dialog-actions">
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={onClose}
        >
          {t('office.close')}
        </button>
      </div>
    </Dialog>
  );
}
