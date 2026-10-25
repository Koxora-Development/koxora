// Generic message catalog used by surfaces that keep their own resources,
// such as the public website. The application catalog in `index.ts` stays the
// single source for the studio interface; both share the same placeholder
// syntax, fallback rule and locale registry contract.
/**
 * Registry metadata of the locales this project supports, kept apart from the
 * message resources so every surface names a language in one place only.
 */
export const localeMetadata: Record<
  string,
  { label: string; direction: 'ltr' | 'rtl' }
> = {
  en: { label: 'English', direction: 'ltr' },
  de: { label: 'Deutsch', direction: 'ltr' },
};
export interface CatalogLocale<Key extends string> {
  label: string;
  direction: 'ltr' | 'rtl';
  messages: Partial<Record<Key, string>>;
}
export interface CatalogOptions<Key extends string> {
  defaultLocale: string;
  /** Complete resources of the default locale; also the fallback source. */
  base: Record<Key, string>;
  locales: Record<string, CatalogLocale<Key>>;
}
export interface Catalog<Key extends string> {
  readonly defaultLocale: string;
  readonly locales: string[];
  label(locale: string): string;
  direction(locale: string): 'ltr' | 'rtl';
  resolve(locale: string): string;
  translate(
    locale: string,
    key: Key,
    values?: Record<string, string | number>,
  ): string;
  /** Keys without an own translation; empty for a complete locale. */
  missing(locale: string): Key[];
}
export function interpolate(
  message: string,
  values: Record<string, string | number>,
): string {
  return message.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!Object.hasOwn(values, name))
      throw new Error(`Missing interpolation: ${name}`);
    return String(values[name]);
  });
}
export function createCatalog<Key extends string>({
  defaultLocale,
  base,
  locales,
}: CatalogOptions<Key>): Catalog<Key> {
  if (!Object.hasOwn(locales, defaultLocale))
    throw new Error(`Unregistered default locale: ${defaultLocale}`);
  const resolve = (locale: string) =>
    Object.hasOwn(locales, locale) ? locale : defaultLocale;
  return {
    defaultLocale,
    locales: Object.keys(locales),
    label: (locale) => locales[resolve(locale)]!.label,
    direction: (locale) => locales[resolve(locale)]!.direction,
    resolve,
    translate(locale, key, values = {}) {
      const message = locales[resolve(locale)]!.messages[key] || base[key];
      if (!message) throw new Error(`Missing default translation: ${key}`);
      return interpolate(message, values);
    },
    missing: (locale) =>
      (Object.keys(base) as Key[]).filter(
        (key) => !locales[resolve(locale)]!.messages[key],
      ),
  };
}
