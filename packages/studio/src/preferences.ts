import { locales, resolveLocale } from '@koxora/i18n';
export type Theme = 'light' | 'dark' | 'system';
export function systemLocale(languages: readonly string[]): string {
  for (const language of languages) {
    const code = language.toLowerCase().split('-')[0];
    if (Object.hasOwn(locales, code)) return code;
  }
  return 'en';
}
export const guiScales = [100, 125, 150, 175, 200] as const;
export type GuiScale = (typeof guiScales)[number];
export function resolveGuiScale(value: unknown): GuiScale {
  return typeof value === 'number' && guiScales.some((scale) => scale === value)
    ? (value as GuiScale)
    : 100;
}
export interface Preferences {
  locale: string;
  theme: Theme;
  guiScale: GuiScale;
  accessibility: boolean;
}
export const preferenceKey = 'koxora.preferences.v1';
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function readPreferences(
  storage: Pick<PreferenceStorage, 'getItem'>,
): Preferences {
  try {
    const value: unknown = JSON.parse(storage.getItem(preferenceKey) ?? 'null');
    if (typeof value === 'object' && value !== null) {
      const data = value as Record<string, unknown>;
      return {
        locale:
          data.locale === 'system' ? 'system' : resolveLocale(data.locale),
        theme:
          data.theme === 'system'
            ? 'system'
            : data.theme === 'dark'
              ? 'dark'
              : 'light',
        guiScale: resolveGuiScale(data.guiScale),
        accessibility: data.accessibility === true,
      };
    }
  } catch {
    /* Unavailable or corrupt storage must not prevent guest startup. */
  }
  return { locale: 'en', theme: 'light', guiScale: 100, accessibility: false };
}
export function writePreferences(
  storage: Pick<PreferenceStorage, 'setItem'>,
  preferences: Preferences,
): boolean {
  try {
    storage.setItem(preferenceKey, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
