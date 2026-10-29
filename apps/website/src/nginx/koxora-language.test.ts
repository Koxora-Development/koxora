import { describe, expect, it } from 'vitest';
// The file NGINX loads, imported as it is. Nothing is rebuilt or copied in
// between, so what passes here is what the container runs.
import module from './koxora-language.js';
const { constants, negotiate } = module;
import {
  defaultLocale,
  languageCookieName,
  locales,
  negotiateLocale,
} from '../language';
const tags = [
  'de',
  'de-DE',
  'de-AT',
  'de-CH',
  'en',
  'en-GB',
  'en-US',
  'fr',
  'fr-FR',
  'ja',
  '*',
];
const qualities = [
  null,
  ';q=1',
  ';q=1.0',
  ';q=0.9',
  ';q=0.8',
  ';q=0.5',
  ';q=0.123',
  ';q=0',
  ';q=0.0',
  ';q=x',
];
function entries(): string[] {
  return tags.flatMap((tag) =>
    qualities.map((quality) => `${tag}${quality ?? ''}`),
  );
}
describe('the module NGINX loads', () => {
  it('declares the same languages, fallback and cookie as the application', () => {
    expect(constants.supported.slice().sort()).toEqual(
      [...locales].slice().sort(),
    );
    expect(constants.fallback).toBe(defaultLocale);
    expect(constants.cookieName).toBe(languageCookieName);
  });
  it('exposes the handler NGINX calls', () => {
    expect(typeof module.rootLanguage).toBe('function');
    const request = {
      headersIn: { Cookie: '', 'Accept-Language': 'de-DE,de;q=0.9' },
    };
    expect(module.rootLanguage(request)).toBe('de');
    // A request object that is missing what the handler reads must still
    // produce a usable language: an empty one would redirect to `//`.
    expect(module.rootLanguage({ headersIn: {} })).toBe(defaultLocale);
    expect(module.rootLanguage({} as never)).toBe(defaultLocale);
  });
});
describe('parity with the authoritative algorithm', () => {
  it('agrees on every single-entry header', () => {
    for (const header of entries())
      expect(negotiate('', header), header).toBe(
        negotiateLocale({ acceptLanguage: header }).locale,
      );
  });
  it('agrees on every pair of entries, quality values and refusals included', () => {
    const all = entries();
    let compared = 0;
    for (const first of all)
      for (const second of all) {
        const header = `${first},${second}`;
        expect(negotiate('', header), header).toBe(
          negotiateLocale({ acceptLanguage: header }).locale,
        );
        compared += 1;
      }
    // The matrix is the point of this test; a shrunken one would pass quietly.
    expect(compared).toBeGreaterThan(10000);
  });
  it('agrees on longer lists, including whitespace and odd spellings', () => {
    const headers = [
      'de-DE,de;q=0.9,en;q=0.8,en-US;q=0.7',
      '  de-AT ;q=0.9 ,  en-GB ;q=0.95 ',
      'fr;q=0.9,de;q=0.9,en;q=0.9',
      'de;q=0,en;q=0,fr;q=0.5',
      'de;q=0,en;q=0.1',
      'DE-DE,EN;Q=0.9',
      'en;q=0.8,de;q=0.8,fr;q=0.8',
      ',,,de,,,',
      ';q=0.9,de',
      'de;q=0.1000,en;q=0.1',
      'de;;q=0.9,en',
      'x'.repeat(200) + ',de',
      '',
      ',',
      '*;q=0.9,de;q=0.1',
    ];
    for (const header of headers)
      expect(negotiate('', header), JSON.stringify(header)).toBe(
        negotiateLocale({ acceptLanguage: header }).locale,
      );
  });
  it('agrees on the stored choice, including values that must be refused', () => {
    const values = [
      'de',
      'en',
      'DE',
      ' de ',
      'de-DE',
      'fr',
      '',
      '//evil.example',
      'https://evil.example',
      '..%2fde',
      'de%20en',
      '%E0%A4%A',
      'de;en',
    ];
    for (const value of values)
      for (const header of ['de-DE,de;q=0.9', 'en-US', 'fr', '']) {
        const cookie = `${languageCookieName}=${value}`;
        expect(negotiate(cookie, header), `${cookie} | ${header}`).toBe(
          negotiateLocale({ cookie, acceptLanguage: header }).locale,
        );
      }
  });
  it('agrees when other cookies surround this one', () => {
    const cookies = [
      `${languageCookieName}=de`,
      `a=1; ${languageCookieName}=de; b=2`,
      `${languageCookieName}_other=de`,
      `other${languageCookieName}=de`,
      `theme=dark`,
      `${languageCookieName}=de; ${languageCookieName}=en`,
      `; ${languageCookieName}=en ;`,
      `${languageCookieName}`,
      `=de`,
    ];
    for (const cookie of cookies)
      expect(negotiate(cookie, 'fr-FR,fr;q=0.9'), cookie).toBe(
        negotiateLocale({ cookie, acceptLanguage: 'fr-FR,fr;q=0.9' }).locale,
      );
  });
});
