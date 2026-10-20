import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import {
  defaultLocale,
  formatDate,
  locales,
  plural,
  resolveLocale,
  translate,
  type MessageKey,
} from './index';
describe('translation contract', () => {
  it('uses English by default and rejects invalid locale identifiers', () => {
    expect(defaultLocale).toBe('en');
    for (const value of [null, 'fr', '__proto__', 'constructor', 42])
      expect(resolveLocale(value)).toBe('en');
  });
  it('requires complete, nonempty translations and matching interpolation parameters', () => {
    for (const locale of Object.values(locales)) {
      expect(Object.keys(locale.messages).sort()).toEqual(
        Object.keys(en).sort(),
      );
      for (const key of Object.keys(en) as MessageKey[]) {
        expect(locale.messages[key]?.trim().length).toBeGreaterThan(0);
        expect(locale.messages[key]?.match(/\{\w+\}/g) ?? []).toEqual(
          en[key].match(/\{\w+\}/g) ?? [],
        );
      }
    }
  });
  it('falls back to English and detects absent English keys', () => {
    const registry = { ...locales, de: { ...locales.de, messages: {} } };
    expect(translate('de', 'hero.title', {}, registry)).toBe(en['hero.title']);
    expect(() => translate('en', 'nonexistent' as MessageKey)).toThrow(
      'Missing English',
    );
  });
  it('adds a locale through resource and registry metadata alone, including direction', () => {
    const registry = {
      ...locales,
      ar: {
        label: 'العربية',
        direction: 'rtl' as const,
        messages: { 'nav.workspace': 'مساحة العمل' },
      },
    };
    expect(resolveLocale('ar', registry)).toBe('ar');
    expect(translate('ar', 'nav.workspace', {}, registry)).toBe('مساحة العمل');
    expect(translate('ar', 'app.name', {}, registry)).toBe('Koxora');
    expect(registry.ar.direction).toBe('rtl');
  });
  it('formats plurals, interpolation, numbers and dates through locale rules', () => {
    expect(plural('en', 'demo.items', 1)).toBe('1 item');
    expect(plural('de', 'demo.items', 2)).toBe('2 Einträge');
    expect(plural('de', 'demo.items', 1000)).toBe('1.000 Einträge');
    expect(formatDate('en', new Date('2026-01-02T00:00:00Z'))).toBe(
      'Jan 2, 2026',
    );
    expect(formatDate('de', new Date('2026-01-02T00:00:00Z'))).toBe(
      '02.01.2026',
    );
    expect(() => translate('en', 'demo.items.one')).toThrow(
      'Missing interpolation',
    );
  });
});
