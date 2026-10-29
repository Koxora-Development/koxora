// The hosting contract in one place: security headers, cache rules and the
// content security policy. The page emitter writes these into the Apache and
// static-platform configuration, and the reference server sends exactly the
// same values, so the browser tests run under the policy that production uses.
/**
 * `inlineScriptHashes` is every inline script the build emits, as bare
 * base64 digests. The pages carry one and the language gateway carries one,
 * and both have to be pinned or the browser blocks the one it is not told
 * about.
 */
export function contentSecurityPolicy(inlineScriptHashes, extras = {}) {
  const hashes = (
    Array.isArray(inlineScriptHashes)
      ? inlineScriptHashes
      : [inlineScriptHashes]
  ).filter(Boolean);
  const directives = {
    'default-src': ["'self'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'img-src': ["'self'"],
    'font-src': ["'self'"],
    'style-src': ["'self'"],
    'script-src': [
      "'self'",
      ...[...new Set(hashes)].map((hash) => `'sha256-${hash}'`),
    ],
    'connect-src': ["'none'"],
  };
  // An optional consent category that needs a third-party origin declares it,
  // and only an enabled category widens the policy.
  for (const [directive, sources] of Object.entries(extras)) {
    const current = directives[directive] ?? [];
    const widened = current.filter((source) => source !== "'none'");
    directives[directive] = [...new Set([...widened, ...sources])];
  }
  return [
    ...Object.entries(directives).map(
      ([directive, sources]) => `${directive} ${sources.join(' ')}`,
    ),
    'upgrade-insecure-requests',
  ].join('; ');
}
export function securityHeaders(inlineScriptHashes, extras = {}) {
  return {
    'Content-Security-Policy': contentSecurityPolicy(
      inlineScriptHashes,
      extras,
    ),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    // Without includeSubDomains: adding it binds every current and future
    // subdomain of the published domain and is the operator's decision.
    'Strict-Transport-Security': 'max-age=31536000',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}
export const cacheRules = [
  { prefix: '/assets/', value: 'public, max-age=31536000, immutable' },
  { prefix: '/images/', value: 'public, max-age=86400, must-revalidate' },
];
export const documentCacheControl = 'public, max-age=0, must-revalidate';
export function cacheControlFor(pathname) {
  return (
    cacheRules.find((rule) => pathname.startsWith(rule.prefix))?.value ??
    documentCacheControl
  );
}
/**
 * Paths that must never reach a client, whichever server is in front. The one
 * exception is the standard well-known directory, which exists to be public.
 */
export const publicDotDirectory = '.well-known';
export function isHiddenPath(pathname) {
  return pathname
    .split('/')
    .some(
      (segment) =>
        segment !== publicDotDirectory &&
        (segment.startsWith('.') || segment.startsWith('_')),
    );
}
