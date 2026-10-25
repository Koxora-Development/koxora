import { defaultLocale, isLocale, locales, type Locale } from './routes';
/**
 * Language negotiation for the one address that has no language in it: the
 * root document. Every other address names its language, and an address that
 * names its language is always honoured, so nothing here ever runs on it.
 *
 * This module is the single definition of the algorithm. The browser applies
 * it on the gateway document with `navigator.languages`, the reference server
 * applies it to a request, and the generated hosting configuration implements
 * the same order with the means a web server has; the deployment guide names
 * the one documented difference.
 */
/** Name of the first-party cookie that carries an explicit choice. */
export const languageCookieName = 'koxora_language';
/** Mirror of the same choice, for a browser that refuses cookies. */
export const languageStorageKey = 'koxora.website.language';
/** One year, renewed on every explicit selection. */
export const languageCookieMaxAge = 31_536_000;
export type LanguageSource = 'stored' | 'browser' | 'fallback';
export interface LanguageDecision {
  locale: Locale;
  source: LanguageSource;
}
/**
 * The primary subtag of a language tag, when it is a language this site has.
 * `de-AT` and `de-CH` are German, `en-GB` is English, `*` matches nothing in
 * particular and is left to the fallback.
 */
export function primaryLocale(tag: string): Locale | null {
  const primary = tag.trim().toLowerCase().split('-')[0] ?? '';
  return isLocale(primary) ? primary : null;
}
/** An explicit choice is stored as the bare locale and nothing else. */
export function storedLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isLocale(normalized) ? normalized : null;
}
export interface AcceptLanguageEntry {
  tag: string;
  quality: number;
  position: number;
}
/**
 * `Accept-Language` in the order a server must consider it: by descending
 * quality, and within one quality by the order the browser wrote it. An
 * entry with `q=0` is explicitly refused and is dropped. A malformed quality
 * value is ignored rather than trusted, which keeps a crafted header from
 * reordering the list.
 */
export function parseAcceptLanguage(header: string): AcceptLanguageEntry[] {
  const entries: AcceptLanguageEntry[] = [];
  const parts = header.split(',');
  for (let index = 0; index < parts.length; index += 1) {
    const [rawTag, ...parameters] = parts[index]!.split(';');
    const tag = rawTag!.trim();
    if (!tag) continue;
    let quality = 1;
    for (const parameter of parameters) {
      const match = /^\s*q\s*=\s*(\d(?:\.\d{0,3})?)\s*$/i.exec(parameter);
      if (match) quality = Number(match[1]);
    }
    if (!(quality > 0)) continue;
    entries.push({ tag, quality, position: index });
  }
  return entries.sort((left, right) =>
    left.quality === right.quality
      ? left.position - right.position
      : right.quality - left.quality,
  );
}
/** The first supported language in an already ordered list of tags. */
export function localeFromTags(tags: readonly string[]): Locale | null {
  for (const tag of tags) {
    const locale = primaryLocale(tag);
    if (locale) return locale;
  }
  return null;
}
export function localeFromAcceptLanguage(
  header: string | null | undefined,
): Locale | null {
  if (!header) return null;
  return localeFromTags(parseAcceptLanguage(header).map((entry) => entry.tag));
}
/**
 * Reads the stored choice out of a `Cookie` header. Only this site's own
 * cookie is read, and only a value that is exactly one of this site's
 * languages counts, so a crafted cookie cannot produce a target of its own.
 */
export function localeFromCookieHeader(
  header: string | null | undefined,
): Locale | null {
  if (!header) return null;
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() !== languageCookieName) continue;
    const raw = pair.slice(separator + 1).trim();
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      // A value that is not valid percent encoding is used as written; it
      // only ever has to match one of two known words.
    }
    const locale = storedLocale(value);
    if (locale) return locale;
  }
  return null;
}
/**
 * The documented order: an explicit stored choice, then the languages the
 * browser asks for, then English.
 */
export function negotiateLocale({
  cookie,
  acceptLanguage,
}: {
  cookie?: string | null;
  acceptLanguage?: string | null;
}): LanguageDecision {
  const stored = localeFromCookieHeader(cookie);
  if (stored) return { locale: stored, source: 'stored' };
  const browser = localeFromAcceptLanguage(acceptLanguage);
  if (browser) return { locale: browser, source: 'browser' };
  return { locale: defaultLocale, source: 'fallback' };
}
/** `Set-Cookie` value for an explicit selection, for a server that sets it. */
export function languageCookieAttributes(secure: boolean): string {
  return [
    `Path=/`,
    `Max-Age=${languageCookieMaxAge}`,
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
/**
 * The inline script of the root gateway, applied before the first paint so no
 * localized content is ever shown in the wrong language. It implements the
 * same order as `negotiateLocale`: the stored choice first, then the browser
 * languages, which `navigator.languages` already returns in the order the
 * reader set. It is pinned in the content security policy by hash, so its
 * text and the hashed text are the same bytes.
 *
 * It is deliberately the whole gateway logic and nothing else: the document
 * itself stays a usable language-selection page for a reader without
 * JavaScript, and the hosting layer answers the same address with the same
 * decision for a reader whose browser never runs it.
 */
export const languageGatewayScript = `(function(){var S=${JSON.stringify(
  locales as readonly string[],
)};function p(v){v=String(v==null?'':v).toLowerCase().split('-')[0];return S.indexOf(v)<0?null:v}function s(v){v=String(v==null?'':v).trim().toLowerCase();return S.indexOf(v)<0?null:v}var c=null;try{var m=new RegExp('(?:^|; *)'+${JSON.stringify(
  languageCookieName,
)}+'=([^;]*)').exec(document.cookie);if(m)c=s(decodeURIComponent(m[1]))}catch(e){}if(!c)try{c=s(localStorage.getItem(${JSON.stringify(
  languageStorageKey,
)}))}catch(e){}if(!c){var l=[];try{l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language]}catch(e){}for(var i=0;i<l.length;i++){var v=p(l[i]);if(v){c=v;break}}}var t='/'+(c||${JSON.stringify(
  defaultLocale as string,
)})+'/';try{location.replace(t)}catch(e){location.href=t}})()`;
export { locales, defaultLocale };
export type { Locale };
