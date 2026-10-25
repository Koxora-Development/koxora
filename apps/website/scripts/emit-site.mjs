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
written.push(await emit('index.html', server.renderRootGateway(assets)));
written.push(await emit('sitemap.xml', server.renderSitemap()));
written.push(await emit('robots.txt', server.renderRobots()));
written.push(
  await emit('.well-known/security.txt', server.renderSecurityTxt()),
);
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
const themeHash = createHash('sha256')
  .update(server.themeScript)
  .digest('base64');
for (const html of pages)
  if (!html.includes(`<script>${server.themeScript}</script>`))
    throw new Error(
      'The emitted inline script differs from the hashed text; the policy would block it.',
    );
const headers = securityHeaders(themeHash, server.consentPolicyExtras());
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
const apache = `# Generated by apps/website/scripts/emit-site.mjs. Do not edit by hand.
# Virtual host fragment for the Koxora marketing website. The browser studio is
# a separate deployment on its own host and is never served from this root.
# Regenerate and reload this file with every release: it pins the inline script
# of the build by hash.
Options -Indexes +SymLinksIfOwnerMatch
<IfModule mod_headers.c>
${Object.entries(headers)
  .map(([name, value]) => `  Header always set ${name} "${value}"`)
  .join('\n')}
${cacheRules
  .map(
    (rule) =>
      `  <LocationMatch "^${rule.prefix}">\n    Header always set Cache-Control "${rule.value}"\n  </LocationMatch>`,
  )
  .join('\n')}
  <LocationMatch "\\.html$">
    Header always set Cache-Control "${documentCacheControl}"
  </LocationMatch>
</IfModule>

DirectoryIndex index.html
ErrorDocument 404 /404.html
${server.locales
  .map(
    (locale) =>
      `<LocationMatch "^/${locale}/">\n  ErrorDocument 404 /${locale}/404.html\n</LocationMatch>`,
  )
  .join('\n')}

# Build artefacts and dot files are never public, whatever ends up in the root.
# The standard well-known directory is the one exception; it exists to be read.
RedirectMatch 404 "(^|/)(?!\\.well-known/)[._]"

<IfModule mod_rewrite.c>
  RewriteEngine On
  # Language negotiation for the root document only. In a virtual host the
  # matched path always starts with a slash, hence ^/?$ rather than ^$.
  RewriteCond %{HTTP:Accept-Language} ^de [NC]
  RewriteRule ^/?$ /de/ [R=302,L]
  RewriteRule ^/?$ /${server.defaultLocale}/ [R=302,L]
  # Add the trailing slash so every page has exactly one address. The capture
  # never starts with a slash, so the target can never become protocol-relative.
  RewriteCond %{REQUEST_URI} !\\.[a-zA-Z0-9]+$
  RewriteRule ^/?(.*[^/])$ /$1/ [R=301,L]
</IfModule>

# Both spellings are matched, so an address without its trailing slash does
# not take a second hop through the slash rule above.
${redirects
  .map((entry) => {
    const pattern = entry.from.replace(/\/$/, '').replace(/\//g, '\\/');
    return `RedirectMatch 301 "^${pattern}\\/?$" "${entry.to}"`;
  })
  .join('\n')}
`;
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
