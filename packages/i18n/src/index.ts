import en from './locales/en.json';
import de from './locales/de.json';
export type MessageKey = keyof typeof en;
export type Messages = Partial<Record<MessageKey, string>>;
export interface LocaleDefinition {
  label: string;
  direction: 'ltr' | 'rtl';
  messages: Messages;
}
export const locales: Record<string, LocaleDefinition> = {
  en: { label: 'English', direction: 'ltr', messages: en },
  de: { label: 'Deutsch', direction: 'ltr', messages: de },
};
export const defaultLocale = 'en';
export function resolveLocale(value: unknown, registry = locales): string {
  return typeof value === 'string' && Object.hasOwn(registry, value)
    ? value
    : defaultLocale;
}
export function translate(
  locale: string,
  key: MessageKey,
  values: Record<string, string | number> = {},
  registry = locales,
): string {
  const message =
    registry[resolveLocale(locale, registry)]?.messages[key] ?? en[key];
  if (!message) throw new Error(`Missing English translation: ${key}`);
  return message.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!Object.hasOwn(values, name))
      throw new Error(`Missing interpolation: ${name}`);
    return String(values[name]);
  });
}
export function plural(
  locale: string,
  key: 'demo.items',
  count: number,
): string {
  const category = new Intl.PluralRules(resolveLocale(locale)).select(count);
  const candidate = `${key}.${category}` as MessageKey;
  const resourceKey = Object.hasOwn(en, candidate)
    ? candidate
    : (`${key}.other` as MessageKey);
  return translate(locale, resourceKey, {
    count: new Intl.NumberFormat(resolveLocale(locale)).format(count),
  });
}
export function formatDate(locale: string, date: Date): string {
  return new Intl.DateTimeFormat(resolveLocale(locale), {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
}
