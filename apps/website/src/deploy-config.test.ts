import { describe, expect, it } from 'vitest';
import {
  acceptLanguageDepth,
  acceptLanguagePatterns,
  renderApacheAliases,
  renderApacheProxy,
  renderApacheStatic,
  renderNginx,
} from './deploy-config';
import { languageCookieName, localeFromAcceptLanguage } from './language';
import { defaultLocale, locales, redirects } from './routes';
import { site } from './site';
// The real values come from the hosting contract in `scripts/hosting.mjs`,
// which the page emitter passes in. What matters here is that every header
// and every rule reaches each configuration, so a representative set is
// enough and keeps this test independent of the contract's own wording.
const headers = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'sha256-x'",
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
const cacheRules = [
  { prefix: '/assets/', value: 'public, max-age=31536000, immutable' },
  { prefix: '/images/', value: 'public, max-age=86400, must-revalidate' },
];
const documentCacheControl = 'public, max-age=0, must-revalidate';
const input = {
  locales,
  defaultLocale,
  redirects: redirects(),
  headers,
  cacheRules,
  documentCacheControl,
  languageCookieName,
};
const nginx = renderNginx({ ...input, listenPort: 8080 });
const apache = renderApacheStatic(input);
const aliases = renderApacheAliases({
  canonicalOrigin: site.origin,
  aliasHosts: site.aliasHosts,
  status: site.aliasRedirectStatus,
  passThroughPrefixes: site.aliasPassThroughPrefixes,
});
const proxy = renderApacheProxy({
  canonicalHost: new URL(site.origin).host,
  containerHost: site.container.host,
  containerPort: site.container.port,
  passThroughPrefixes: site.aliasPassThroughPrefixes,
});
/**
 * What a web server does with the generated patterns: take the first one that
 * matches. The patterns are emitted as text for NGINX and for Apache, and are
 * executed here, so their meaning is tested rather than their spelling.
 */
function serverDecision(header: string): string | null {
  for (const { locale, pattern } of acceptLanguagePatterns(locales))
    if (new RegExp(pattern, 'i').test(header)) return locale;
  return null;
}
describe('the language patterns a web server gets', () => {
  it('agrees with the authoritative algorithm on what a browser sends', () => {
    // Real browsers write the list in descending quality, which is the one
    // case both have to agree on.
    const headers = [
      'de',
      'de-DE,de;q=0.9',
      'de-DE,de;q=0.9,en;q=0.8,en-US;q=0.7',
      'de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7',
      'de-CH,de;q=0.9,fr;q=0.8',
      'en-US,en;q=0.9',
      'en-GB,en;q=0.9,de;q=0.8',
      'en',
      'fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7',
      'fr-FR,fr;q=0.9,en;q=0.8,de;q=0.7',
      'nl-NL,nl;q=0.9,de-DE;q=0.8',
      'de-DE,de;q=0.9,en-GB;q=0.8,en;q=0.7,fr;q=0.6',
    ];
    for (const header of headers)
      expect(serverDecision(header), header).toBe(
        localeFromAcceptLanguage(header),
      );
  });
  it('takes the earliest supported entry, not the language listed first here', () => {
    expect(serverDecision('fr,en;q=0.9,de;q=0.8')).toBe('en');
    expect(serverDecision('fr,de;q=0.9,en;q=0.8')).toBe('de');
    expect(serverDecision('cs,sk;q=0.9,pl;q=0.8,de;q=0.7')).toBe('de');
  });
  it('matches regional variants and nothing that merely contains a language', () => {
    for (const header of ['de-DE', 'de-AT', 'de-CH', 'DE-de'])
      expect(serverDecision(header), header).toBe('de');
    for (const header of ['gsw-de', 'den', 'ende', 'fr', '*', ''])
      expect(serverDecision(header), header).toBeNull();
  });
  it('looks further into the list than any browser writes', () => {
    expect(acceptLanguageDepth).toBeGreaterThanOrEqual(8);
    const long = [...Array(acceptLanguageDepth - 1).fill('fr'), 'de'].join(',');
    expect(serverDecision(long)).toBe('de');
  });
});
describe('the container configuration', () => {
  it('keeps every redirect relative so no reader is sent to the container', () => {
    expect(nginx).toContain('absolute_redirect off;');
    expect(nginx).toContain('port_in_redirect off;');
    for (const line of nginx.split('\n'))
      if (/^\s*(return|rewrite)\s/.test(line))
        expect(line, line).not.toMatch(/127\.0\.0\.1|localhost|:\d{4}/);
  });
  it('negotiates the one address that names no language, and only that one', () => {
    expect(nginx).toContain('map $uri $koxora_root_redirect {');
    expect(nginx).toMatch(/"\/" "\/\$koxora_root_language\/";/);
    expect(nginx).toContain('return 302 $koxora_root_redirect;');
    // A permanent redirect of a negotiated address would outlive the reason.
    expect(nginx).not.toMatch(/return 30[18] \$koxora_root_redirect/);
  });
  it('reads a stored choice only from this site own cookie and only as a bare locale', () => {
    for (const locale of locales)
      expect(nginx).toContain(
        `"~*(?:^|;)\\s*${languageCookieName}=${locale}\\s*(?:;|$)" "${locale}";`,
      );
    // A request header is read only as the source of a map, which can answer
    // nothing but the values written above. No redirect, no header and no
    // served path is ever built from one directly.
    for (const line of nginx.split('\n')) {
      if (/^\s*map \$http_[a-z_]+ \$koxora_/.test(line)) continue;
      expect(line, line).not.toMatch(/\$http_|\$arg_|\$cookie_/);
    }
  });
  it('never stores the negotiated answer and says what it depends on', () => {
    expect(nginx).toMatch(/"\/" "no-store";/);
    expect(nginx).toMatch(/"\/" "Cookie, Accept-Language";/);
    expect(nginx).toContain('add_header Vary $koxora_vary always;');
  });
  it('serves every redirect of the route table with its query string', () => {
    for (const entry of redirects()) {
      const withoutSlash = entry.from.replace(/\/$/, '');
      for (const from of [entry.from, withoutSlash])
        expect(nginx, from).toContain(
          `location = ${from} { return ${entry.status} "${entry.to}$is_args$args"; }`,
        );
    }
  });
  it('sets the headers once, so no location can lose the inherited set', () => {
    const serverBody = nginx.slice(nginx.indexOf('server {'));
    const locationStart = serverBody.indexOf('\n    location ');
    const beforeLocations = serverBody.slice(0, locationStart);
    for (const name of Object.keys(headers))
      expect(beforeLocations, name).toContain(`add_header ${name} "`);
    expect(serverBody.slice(locationStart)).not.toContain('add_header');
  });
  it('answers a not-found address in the language it was requested under', () => {
    for (const locale of locales) {
      expect(nginx).toContain(`location /${locale}/ {`);
      expect(nginx).toContain(`error_page 404 /${locale}/404.html;`);
    }
    expect(nginx).toContain('error_page 404 /404.html;');
    // A plain prefix, not ^~: the trailing-slash rule is a regex location and
    // has to keep winning over it.
    expect(nginx).not.toContain('location ^~');
  });
  it('keeps build artefacts and dot files unreachable and answers liveness', () => {
    expect(nginx).toContain('(^|/)(?!\\.well-known/)[._]');
    expect(nginx).toContain('location = /healthz {');
    expect(nginx).toContain('return 200 "ok\\n";');
  });
  it('binds the port the deployment publishes', () => {
    expect(nginx).toContain('listen 8080;');
    expect(renderNginx({ ...input, listenPort: 9999 })).toContain(
      'listen 9999;',
    );
  });
});
describe('the canonical host redirects', () => {
  it('sends every alias to the configured origin and nothing else', () => {
    for (const host of site.aliasHosts) {
      expect(aliases).toContain(`ServerName ${host}`);
      for (const port of [80, 443])
        expect(aliases, `${host}:${port}`).toContain(`<VirtualHost *:${port}>`);
    }
    expect(aliases).toContain(`"${site.origin}/$1"`);
    expect(site.aliasHosts).not.toContain(new URL(site.origin).host);
  });
  it('never builds the target out of the request', () => {
    for (const token of ['%{HTTP_HOST}', '%{SERVER_NAME}', '%{HTTP:Host}'])
      expect(aliases, token).not.toContain(token);
  });
  it('keeps certificate issuance and mail autodiscovery on the alias host', () => {
    for (const prefix of site.aliasPassThroughPrefixes) {
      expect(aliases, prefix).toContain(
        prefix.replace(/^\//, '').replace(/\./g, '\\.'),
      );
      expect(proxy, prefix).toContain(`ProxyPass ${prefix} !`);
    }
    // The exclusion has to precede the catch-all, or the catch-all wins.
    expect(
      proxy.indexOf('ProxyPass /.well-known/acme-challenge/ !'),
    ).toBeLessThan(proxy.indexOf('ProxyPass / http://'));
  });
  it('uses a permanent code and documents the temporary rollout', () => {
    expect(site.aliasRedirectStatus).toBe(308);
    expect(aliases).toContain(`RedirectMatch ${site.aliasRedirectStatus} `);
    expect(aliases).toContain('302');
  });
  it('forwards to the container address the deployment publishes', () => {
    expect(proxy).toContain(
      `ProxyPass / http://${site.container.host}:${site.container.port}/`,
    );
    expect(proxy).toContain('ProxyPreserveHost On');
    // The container owns the headers; a second set here would silently win.
    expect(proxy).not.toContain('Header always set');
  });
});
describe('the fragment for serving the files without a container', () => {
  it('prefers a stored choice over the request languages', () => {
    const cookieRule = apache.indexOf('HTTP_COOKIE');
    const headerRule = apache.indexOf('HTTP:Accept-Language');
    expect(cookieRule).toBeGreaterThan(-1);
    expect(cookieRule).toBeLessThan(headerRule);
    // The unconditional fallback is the last of the three, so it only ever
    // applies when neither a stored choice nor a request language did.
    expect(
      apache.lastIndexOf(`RewriteRule ^/?$ /${defaultLocale}/`),
    ).toBeGreaterThan(apache.lastIndexOf('HTTP:Accept-Language'));
  });
  it('still carries every header, redirect and localized not-found document', () => {
    for (const name of Object.keys(headers))
      expect(apache, name).toContain(`Header always set ${name} "`);
    for (const entry of redirects())
      expect(apache, entry.from).toContain(`" "${entry.to}"`);
    for (const locale of locales)
      expect(apache).toContain(`ErrorDocument 404 /${locale}/404.html`);
  });
  it('never stores the negotiated root', () => {
    expect(apache).toContain('Header always set Cache-Control "no-store"');
    expect(apache).toContain(
      'Header always set Vary "Cookie, Accept-Language"',
    );
  });
});
