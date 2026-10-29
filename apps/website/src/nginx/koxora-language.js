/**
 * Language negotiation inside the website container.
 *
 * This is the NGINX half of the algorithm documented in
 * `apps/website/src/language.ts`, written for the njs module because neither
 * a `map` nor a rewrite condition can compare quality values. It implements
 * the same order, including quality values and the `q=0` refusal, so the
 * server, the browser and the reference server reach the same answer for
 * every request rather than only for the headers a browser happens to send.
 *
 * It is plain JavaScript on purpose: njs runs it directly, and
 * `apps/website/src/nginx/koxora-language.test.ts` imports this very file and
 * compares it against the TypeScript implementation over a generated matrix,
 * so the two cannot drift apart unnoticed.
 *
 * Nothing here throws. A handler that fails leaves the variable empty, and an
 * empty language would send a reader to `//`, so every step is defensive and
 * the fallback is returned whenever anything is unusable.
 */
var SUPPORTED = ['en', 'de'];
var FALLBACK = 'en';
var COOKIE_NAME = 'koxora_language';
/** The primary subtag, when it is a language this site has. */
function primaryLocale(tag) {
  var primary = String(tag === null || tag === undefined ? '' : tag)
    .trim()
    .toLowerCase()
    .split('-')[0];
  return SUPPORTED.indexOf(primary) < 0 ? null : primary;
}
/** An explicit choice is stored as the bare locale and nothing else. */
function storedLocale(value) {
  var normalized = String(value === null || value === undefined ? '' : value)
    .trim()
    .toLowerCase();
  return SUPPORTED.indexOf(normalized) < 0 ? null : normalized;
}
/**
 * `Accept-Language` in the order a server must consider it: by descending
 * quality, and within one quality by the order the browser wrote it. A `q=0`
 * entry is a refusal and is dropped; a malformed quality is ignored rather
 * than trusted, so a crafted header cannot reorder the list.
 */
function parseAcceptLanguage(header) {
  var entries = [];
  var parts = String(
    header === null || header === undefined ? '' : header,
  ).split(',');
  for (var index = 0; index < parts.length; index++) {
    var fields = parts[index].split(';');
    var tag = fields[0].trim();
    if (!tag) continue;
    var quality = 1;
    for (var field = 1; field < fields.length; field++) {
      var match = /^\s*q\s*=\s*(\d(?:\.\d{0,3})?)\s*$/i.exec(fields[field]);
      if (match) quality = Number(match[1]);
    }
    if (!(quality > 0)) continue;
    entries.push({ tag: tag, quality: quality, position: index });
  }
  entries.sort(function (left, right) {
    return left.quality === right.quality
      ? left.position - right.position
      : right.quality - left.quality;
  });
  return entries;
}
function localeFromAcceptLanguage(header) {
  var entries = parseAcceptLanguage(header);
  for (var index = 0; index < entries.length; index++) {
    var locale = primaryLocale(entries[index].tag);
    if (locale) return locale;
  }
  return null;
}
/**
 * Reads the stored choice out of a `Cookie` header. Only this site's own
 * cookie is read, and only a value that is exactly one of this site's
 * languages counts, so a crafted cookie cannot produce a target of its own.
 */
function localeFromCookieHeader(header) {
  var pairs = String(
    header === null || header === undefined ? '' : header,
  ).split(';');
  for (var index = 0; index < pairs.length; index++) {
    var pair = pairs[index];
    var separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() !== COOKIE_NAME) continue;
    var raw = pair.slice(separator + 1).trim();
    var value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch (error) {
      // A value that is not valid percent encoding is used as written; it
      // only ever has to match one of two known words. njs has no optional
      // catch binding, so the parameter is named and left alone.
    }
    var locale = storedLocale(value);
    if (locale) return locale;
  }
  return null;
}
/** The documented order: stored choice, browser languages, fallback. */
function negotiate(cookie, acceptLanguage) {
  var stored = localeFromCookieHeader(cookie);
  if (stored) return stored;
  var browser = localeFromAcceptLanguage(acceptLanguage);
  if (browser) return browser;
  return FALLBACK;
}
/**
 * The `js_set` handler. It is read only where the configuration builds the
 * redirect of the address that names no language, so it costs nothing on any
 * other request.
 */
function rootLanguage(request) {
  try {
    return negotiate(
      request.headersIn['Cookie'],
      request.headersIn['Accept-Language'],
    );
  } catch (error) {
    return FALLBACK;
  }
}
// njs supports a default export only, so everything the configuration and the
// parity test reach for hangs off this one object.
export default {
  rootLanguage: rootLanguage,
  negotiate: negotiate,
  constants: {
    supported: SUPPORTED,
    fallback: FALLBACK,
    cookieName: COOKIE_NAME,
  },
};
