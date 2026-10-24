import { createCatalog, localeMetadata } from '@koxora/i18n/catalog';
import { en, type WebsiteMessageKey } from './messages/en';
import { de } from './messages/de';
import { defaultLocale, type Locale } from '../routes';
// The website keeps its own resources so that marketing copy never ships in
// the studio bundle. Fallback, placeholder syntax and locale handling are
// shared with the application catalog through `@koxora/i18n/catalog`.
export const catalog = createCatalog<WebsiteMessageKey>({
  defaultLocale,
  base: en,
  locales: {
    // Labels and direction come from the application locale registry, so a
    // new language is named in one place only.
    en: { ...localeMetadata.en!, messages: en },
    de: { ...localeMetadata.de!, messages: de },
  },
});
export type MessageKey = WebsiteMessageKey;
export type Translate = (
  key: WebsiteMessageKey,
  values?: Record<string, string | number>,
) => string;
export function translator(locale: Locale): Translate {
  return (key, values) => catalog.translate(locale, key, values);
}
export function formatDate(locale: Locale, isoDate: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
