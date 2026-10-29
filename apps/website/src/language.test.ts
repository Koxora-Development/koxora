import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  languageGatewayScript,
  languageCookieAttributes,
  languageCookieName,
  languageStorageKey,
  localeFromAcceptLanguage,
  localeFromCookieHeader,
  localeFromTags,
  negotiateLocale,
  parseAcceptLanguage,
  primaryLocale,
  storedLocale,
} from './language';
describe('language tags', () => {
  it('reads the primary subtag of a regional variant', () => {
    for (const tag of ['de', 'de-DE', 'de-AT', 'de-CH', 'DE-de', ' de-DE '])
      expect(primaryLocale(tag), tag).toBe('de');
    for (const tag of ['en', 'en-US', 'en-GB', 'EN'])
      expect(primaryLocale(tag), tag).toBe('en');
  });
  it('accepts no language this site does not have', () => {
    for (const tag of ['fr', 'fr-FR', 'den', 'ende', '*', '', 'de_DE'])
      expect(primaryLocale(tag), tag).toBeNull();
  });
  it('accepts only a bare locale as a stored choice', () => {
    expect(storedLocale('de')).toBe('de');
    expect(storedLocale(' EN ')).toBe('en');
    for (const value of ['de-DE', 'fr', '/de/', 'de en', '', null, undefined])
      expect(storedLocale(value), String(value)).toBeNull();
  });
});
describe('Accept-Language', () => {
  it('orders by quality and then by the order written', () => {
    const entries = parseAcceptLanguage(
      'fr;q=0.5, de-DE;q=0.8, en-GB, da;q=0.9',
    );
    expect(entries.map((entry) => entry.tag)).toEqual([
      'en-GB',
      'da',
      'de-DE',
      'fr',
    ]);
  });
  it('drops a language the browser explicitly refuses', () => {
    expect(parseAcceptLanguage('de;q=0, en').map((e) => e.tag)).toEqual(['en']);
    expect(localeFromAcceptLanguage('de;q=0, fr')).toBeNull();
  });
  it('ignores a malformed quality instead of trusting it', () => {
    // A value that is not a quality leaves the entry at its default weight,
    // so a crafted header cannot push a language past the one listed first.
    expect(parseAcceptLanguage('de;q=x, en;q=0.9').map((e) => e.tag)).toEqual([
      'de',
      'en',
    ]);
  });
  it('picks the language of the highest quality this site has', () => {
    const cases: [string, string | null][] = [
      ['de', 'de'],
      ['de-DE,de;q=0.9,en;q=0.8', 'de'],
      ['de-AT,de-DE;q=0.9', 'de'],
      ['de-CH', 'de'],
      ['en-US,en;q=0.9', 'en'],
      ['en-GB,en', 'en'],
      // The German entry outranks the English one despite being written later.
      ['en;q=0.5,de;q=0.9', 'de'],
      // Equal quality falls back to the order the browser wrote.
      ['en;q=0.8,de;q=0.8', 'en'],
      ['fr-FR,fr;q=0.9,de;q=0.8', 'de'],
      ['fr,es', null],
      ['*', null],
      ['', null],
      // A region that looks like one of our languages is not a language.
      ['gsw-de', null],
    ];
    for (const [header, expected] of cases)
      expect(localeFromAcceptLanguage(header), header).toBe(expected);
  });
  it('reads a browser language list in the order the browser gives it', () => {
    expect(localeFromTags(['fr-FR', 'de-AT', 'en-US'])).toBe('de');
    expect(localeFromTags(['en-GB', 'de'])).toBe('en');
    expect(localeFromTags([])).toBeNull();
  });
});
describe('the stored choice in a cookie header', () => {
  it('reads this site own cookie only', () => {
    expect(localeFromCookieHeader(`${languageCookieName}=de`)).toBe('de');
    expect(
      localeFromCookieHeader(`other=de; ${languageCookieName}=en; x=1`),
    ).toBe('en');
    expect(localeFromCookieHeader('koxora_language_other=de')).toBeNull();
    expect(localeFromCookieHeader('lang=de')).toBeNull();
  });
  it('refuses a value that is not one of this site languages', () => {
    for (const value of [
      'de-DE',
      '//evil.example',
      'https://evil.example',
      '../de',
      'de%0d%0aSet-Cookie:%20x=1',
      '',
    ])
      expect(
        localeFromCookieHeader(`${languageCookieName}=${value}`),
        value,
      ).toBeNull();
  });
});
describe('the negotiation order', () => {
  it('prefers an explicit stored choice over the browser languages', () => {
    expect(
      negotiateLocale({
        cookie: `${languageCookieName}=de`,
        acceptLanguage: 'en-US,en;q=0.9',
      }),
    ).toEqual({ locale: 'de', source: 'stored' });
    expect(
      negotiateLocale({
        cookie: `${languageCookieName}=en`,
        acceptLanguage: 'de-DE,de;q=0.9',
      }),
    ).toEqual({ locale: 'en', source: 'stored' });
  });
  it('uses the browser languages when nothing is stored', () => {
    expect(negotiateLocale({ acceptLanguage: 'de-DE,de;q=0.9' })).toEqual({
      locale: 'de',
      source: 'browser',
    });
    expect(negotiateLocale({ acceptLanguage: 'en-GB' })).toEqual({
      locale: 'en',
      source: 'browser',
    });
  });
  it('falls back to English for every other request', () => {
    for (const acceptLanguage of ['fr-FR,fr;q=0.9', '*', '', null, undefined])
      expect(
        negotiateLocale({ acceptLanguage }),
        String(acceptLanguage),
      ).toEqual({ locale: 'en', source: 'fallback' });
    expect(negotiateLocale({})).toEqual({ locale: 'en', source: 'fallback' });
  });
  it('ignores an unusable stored value instead of failing', () => {
    expect(
      negotiateLocale({
        cookie: `${languageCookieName}=fr`,
        acceptLanguage: 'de',
      }),
    ).toEqual({ locale: 'de', source: 'browser' });
  });
});
describe('the cookie this site sets', () => {
  it('is first party, path wide, lax and secure over https', () => {
    const secure = languageCookieAttributes(true);
    expect(secure).toContain('Path=/');
    expect(secure).toContain('SameSite=Lax');
    expect(secure).toContain('Secure');
    expect(secure).toContain('Max-Age=31536000');
    // No domain attribute: the cookie stays on the host that set it.
    expect(secure).not.toContain('Domain');
    expect(languageCookieAttributes(false)).not.toContain('Secure');
  });
});
/**
 * The gateway script is the same decision in the browser. It runs here in a
 * sandbox with only the few globals it uses, so a change to its text is
 * checked against behaviour rather than against a string.
 */
function runGateway({
  cookie = '',
  stored = null,
  languages = [],
  cookieThrows = false,
  storageThrows = false,
}: {
  cookie?: string;
  stored?: string | null;
  languages?: string[];
  cookieThrows?: boolean;
  storageThrows?: boolean;
} = {}): string | null {
  let replaced: string | null = null;
  const sandbox = {
    document: {
      get cookie() {
        if (cookieThrows) throw new Error('blocked');
        return cookie;
      },
    },
    localStorage: {
      getItem(key: string) {
        if (storageThrows) throw new Error('blocked');
        return key === languageStorageKey ? stored : null;
      },
    },
    navigator: { languages, language: languages[0] ?? '' },
    location: {
      replace(target: string) {
        replaced = target;
      },
    },
  };
  runInNewContext(languageGatewayScript, sandbox);
  return replaced;
}
describe('the gateway script', () => {
  it('follows the stored cookie before the browser languages', () => {
    expect(
      runGateway({
        cookie: `${languageCookieName}=de`,
        languages: ['en-US', 'en'],
      }),
    ).toBe('/de/');
    expect(
      runGateway({
        cookie: `a=1; ${languageCookieName}=en; b=2`,
        languages: ['de-DE'],
      }),
    ).toBe('/en/');
  });
  it('falls back to the mirrored value where cookies are refused', () => {
    expect(
      runGateway({ cookieThrows: true, stored: 'de', languages: ['en'] }),
    ).toBe('/de/');
  });
  it('uses the browser languages in their own order', () => {
    expect(runGateway({ languages: ['fr-FR', 'de-AT', 'en-US'] })).toBe('/de/');
    expect(runGateway({ languages: ['en-GB', 'de'] })).toBe('/en/');
    expect(runGateway({ languages: ['de-CH'] })).toBe('/de/');
  });
  it('sends every other visitor to English', () => {
    expect(runGateway({ languages: ['fr', 'es'] })).toBe('/en/');
    expect(runGateway()).toBe('/en/');
    expect(runGateway({ cookieThrows: true, storageThrows: true })).toBe(
      '/en/',
    );
  });
  it('never builds a target out of a value a request supplied', () => {
    for (const value of [
      '//evil.example',
      'https://evil.example/',
      '..%2f..%2fde',
      'de%20en',
    ])
      expect(
        runGateway({ cookie: `${languageCookieName}=${value}` }),
        value,
      ).toBe('/en/');
    expect(runGateway({ stored: '//evil.example' })).toBe('/en/');
  });
});
