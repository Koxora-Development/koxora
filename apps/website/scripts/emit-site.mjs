// Renders every public page to static HTML and writes the files a plain web
// server needs: pages, sitemap, robots, manifests, redirect stubs and the
// hosting configuration for Apache and for a static platform.
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cacheRules,
  documentCacheControl,
  securityHeaders,
} from './hosting.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const primaryDist = resolve(root, 'dist');
const outDir = resolve(root, process.env.KOXORA_SITE_OUT_DIR ?? 'dist');
const deployDir = resolve(
  root,
  process.env.KOXORA_SITE_DEPLOY_DIR ?? 'dist-deploy',
);
// Kept outside every directory a build step empties, so a page-only rebuild
// after a renderer build still finds it.
const manifestCopy = resolve(
  root,
  '../../node_modules/.cache/koxora/website-client-manifest.json',
);
const server = await import(resolve(root, 'dist-ssr/entry-server.js'));

// The policy is the consent configuration plus whatever the contact form
// needs, so one build cannot allow a form the policy then blocks.
function policyExtras() {
  const extras = { ...server.consentPolicyExtras() };
  for (const [directive, sources] of Object.entries(
    server.contactPolicyExtras(),
  ))
    extras[directive] = [
      ...new Set([...(extras[directive] ?? []), ...sources]),
    ];
  return extras;
}
async function loadManifest() {
  try {
    const raw = await readFile(
      resolve(root, 'dist/.vite/manifest.json'),
      'utf8',
    );
    await mkdir(dirname(manifestCopy), { recursive: true });
    await writeFile(manifestCopy, raw, 'utf8');
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(await readFile(manifestCopy, 'utf8'));
    } catch {
      throw new Error(
        'Client manifest missing; run the client build before emitting pages.',
      );
    }
  }
}
const manifest = await loadManifest();
const entry = manifest['src/client/main.ts'];
if (!entry)
  throw new Error('Client manifest entry missing; run the client build first.');
const assets = {
  js: [`/${entry.file}`],
  css: (entry.css ?? []).map((file) => `/${file}`),
};
// A manifest can outlive the files it names. Emitting pages that reference a
// missing stylesheet or bundle would produce a deployable but broken site.
for (const asset of [...assets.js, ...assets.css]) {
  const file = join(primaryDist, asset.replace(/^\//, ''));
  try {
    await stat(file);
  } catch {
    throw new Error(
      `Client asset ${asset} is missing from ${primaryDist}; run the client build again.`,
    );
  }
}
// A variant build renders its own HTML and reuses the primary client assets.
// It is emptied first so a renamed route cannot survive as an orphan.
if (outDir !== primaryDist) {
  await rm(outDir, { recursive: true, force: true });
  for (const directory of ['assets', 'images'])
    await cp(join(primaryDist, directory), join(outDir, directory), {
      recursive: true,
      force: true,
    });
}
async function emit(relativePath, content) {
  const target = join(outDir, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
  return relativePath;
}
const written = [];
const pages = [];
for (const route of server.routes)
  for (const locale of server.locales) {
    const html = server.renderRoute(route.id, locale, assets);
    pages.push(html);
    written.push(
      await emit(
        `${server.pathFor(route.id, locale)}index.html`.replace(/^\//, ''),
        html,
      ),
    );
  }
for (const locale of server.locales) {
  written.push(
    await emit(`${locale}/404.html`, server.renderNotFound(locale, assets)),
  );
  written.push(
    await emit(`${locale}/site.webmanifest`, server.renderManifest(locale)),
  );
}
written.push(
  await emit('404.html', server.renderNotFound(server.defaultLocale, assets)),
);
const gateway = server.renderRootGateway(assets);
written.push(await emit('index.html', gateway));
written.push(await emit('sitemap.xml', server.renderSitemap()));
written.push(await emit('robots.txt', server.renderRobots()));
written.push(
  await emit('.well-known/security.txt', server.renderSecurityTxt()),
);
// Nothing written for the review of this branch may reach a published site.
// The notice on the privacy policy is rendered conditionally, and this is the
// guard that catches any other wording of the same kind, wherever it appears.
if (server.site.published) {
  const leaked = [];
  for (const relativePath of written) {
    if (!relativePath.endsWith('.html')) continue;
    const html = await readFile(join(outDir, relativePath), 'utf8');
    for (const phrase of server.internalReviewPhrases)
      if (html.includes(phrase)) leaked.push(`${relativePath}: ${phrase}`);
  }
  if (leaked.length)
    throw new Error(
      `Internal review wording in a published build:\n${leaked.join('\n')}`,
    );
}
// Redirect stubs keep aliases working even on a host without rewrite rules.
// The hosting configuration below turns the same table into real redirects.
const redirects = server.redirects();
const safePath = /^\/[a-z0-9/-]*$/;
for (const entry of redirects)
  for (const value of [entry.from, entry.to])
    if (!safePath.test(value))
      throw new Error(`Unsafe path in the redirect table: ${value}`);
for (const entry of redirects)
  written.push(
    await emit(
      `${entry.from.replace(/^\//, '')}index.html`,
      `<!doctype html>\n<html lang="${entry.to.split('/')[1] ?? server.defaultLocale}"><head><meta charset="utf-8" /><title>${entry.to}</title><meta name="robots" content="noindex, follow" /><link rel="canonical" href="${server.site.origin}${entry.to}" /><meta http-equiv="refresh" content="0; url=${entry.to}" /></head><body><a href="${entry.to}">${entry.to}</a></body></html>\n`,
    ),
  );
// The policy pins the one inline script by hash, so the hashed text and the
// emitted text must be the same bytes on every page.
// The demonstration build ships one same-origin script that the consent gate
// can activate, so the browser tests exercise the real mechanism under the
// real policy. The reviewed production build contains no such file.
if (server.site.optionalConsent.length > 0)
  written.push(
    await emit('demo/optional.js', 'window.__koxoraOptionalDemo = true;\n'),
  );
const hashOf = (text) => createHash('sha256').update(text).digest('base64');
const themeHash = hashOf(server.themeScript);
const gatewayHash = hashOf(server.languageGatewayScript);
for (const html of pages)
  if (!html.includes(`<script>${server.themeScript}</script>`))
    throw new Error(
      'The emitted inline script differs from the hashed text; the policy would block it.',
    );
// The gateway carries the one script that decides the language before the
// first paint. A policy that does not pin it would leave the root address
// working only where the hosting layer redirects it.
if (!gateway.includes(`<script>${server.languageGatewayScript}</script>`))
  throw new Error(
    'The emitted gateway script differs from the hashed text; the policy would block it.',
  );
const headers = securityHeaders([themeHash, gatewayHash], policyExtras());
const csp = headers['Content-Security-Policy'];
const headerFile = {
  '/*': headers,
  ...Object.fromEntries(
    cacheRules.map((rule) => [
      `${rule.prefix}*`,
      { 'Cache-Control': rule.value },
    ]),
  ),
  '/*.html': { 'Cache-Control': documentCacheControl },
};
const configurationInput = {
  locales: server.locales,
  defaultLocale: server.defaultLocale,
  redirects,
  headers,
  cacheRules,
  documentCacheControl,
  languageCookieName: server.languageCookieName,
};
const apache = server.renderApacheStatic(configurationInput);
const nginx = server.renderNginx({
  ...configurationInput,
  listenPort: server.site.container.listenPort,
});
const nginxMain = server.renderNginxMain();
// The language decision the container runs is this file, copied rather than
// regenerated, so what the tests compare against the application algorithm is
// what the image ships.
const nginxLanguageModule = await readFile(
  resolve(root, 'src/nginx/koxora-language.js'),
  'utf8',
);
const apacheProxy = server.renderApacheProxy({
  canonicalHost: new URL(server.site.origin).host,
  containerHost: server.site.container.host,
  containerPort: server.site.container.port,
  passThroughPrefixes: server.site.aliasPassThroughPrefixes,
});
// The contact endpoint's rules are a file of their own, never part of the
// virtual host fragment above: they belong inside one HTTPS virtual host, and
// the fragment above describes the whole host. Emitted only where the form is
// actually configured, only when it posts to a path on this site rather than
// to another address, and only once the host has said where the PHP file and
// PHP-FPM actually are. Without all three there is no contact rule at all,
// rather than one pointing at a guess.
const apacheContact =
  server.site.contactEndpoint?.startsWith('/') &&
  server.site.contactHandler.script &&
  server.site.contactHandler.fpm
    ? server.renderApacheContact({
        path: server.site.contactEndpoint,
        script: server.site.contactHandler.script,
        fpm: server.site.contactHandler.fpm,
        canonicalHost: new URL(server.site.origin).host,
      })
    : null;
const apacheAliases = server.renderApacheAliases({
  canonicalOrigin: server.site.origin,
  aliasHosts: server.site.aliasHosts,
  status: server.site.aliasRedirectStatus,
  passThroughPrefixes: server.site.aliasPassThroughPrefixes,
});
const platformRedirects = [
  `/ /${server.defaultLocale}/ 302`,
  ...redirects.map((entry) => `${entry.from} ${entry.to} ${entry.status}`),
  ...redirects.map(
    (entry) => `${entry.from.replace(/\/$/, '')} ${entry.to} ${entry.status}`,
  ),
].join('\n');
await rm(deployDir, { recursive: true, force: true });
await mkdir(deployDir, { recursive: true });
await writeFile(join(deployDir, 'apache-koxora-app.conf'), apache, 'utf8');
await writeFile(join(deployDir, 'nginx-koxora-website.conf'), nginx, 'utf8');
await writeFile(join(deployDir, 'nginx-koxora-main.conf'), nginxMain, 'utf8');
await writeFile(
  join(deployDir, 'nginx-koxora-language.js'),
  nginxLanguageModule,
  'utf8',
);
await writeFile(
  join(deployDir, 'apache-koxora-proxy.conf'),
  apacheProxy,
  'utf8',
);
await writeFile(
  join(deployDir, 'apache-koxora-aliases.conf'),
  apacheAliases,
  'utf8',
);
if (apacheContact)
  await writeFile(
    join(deployDir, 'apache-koxora-contact.conf'),
    apacheContact,
    'utf8',
  );
await writeFile(
  join(deployDir, '_redirects'),
  `${platformRedirects}\n`,
  'utf8',
);
await writeFile(
  join(deployDir, '_headers'),
  `${Object.entries(headerFile)
    .map(([path, values]) =>
      [
        path,
        ...Object.entries(values).map(([name, value]) => `  ${name}: ${value}`),
      ].join('\n'),
    )
    .join('\n')}\n`,
  'utf8',
);
await writeFile(
  join(deployDir, 'build-info.json'),
  `${JSON.stringify(
    {
      origin: server.site.origin,
      editorUrl: server.site.editorUrl,
      indexable: server.site.indexable,
      published: server.site.published,
      optionalConsent: server.site.optionalConsent,
      contentDate: server.site.contentDate,
      pages: written.length,
      redirects: redirects.length,
      inlineScriptHash: `sha256-${themeHash}`,
      inlineScriptHashes: [`sha256-${themeHash}`, `sha256-${gatewayHash}`],
      aliasHosts: server.site.aliasHosts,
      aliasRedirectStatus: server.site.aliasRedirectStatus,
      languageCookie: server.languageCookieName,
      contactEndpoint: server.site.contactEndpoint,
      contactService: server.site.contactEndpoint
        ? server.site.contactService
        : null,
      container: server.site.container,
      contentSecurityPolicy: csp,
    },
    null,
    2,
  )}\n`,
  'utf8',
);
// The build manifest is a build artefact, not published content.
await rm(join(outDir, '.vite'), { recursive: true, force: true });
console.log(
  `Website: ${written.length} files in ${outDir}; deployment configuration in ${deployDir}`,
);
