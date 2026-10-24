// Reference static server for the generated website. It mirrors the hosting
// contract the deployment configuration describes: directory indexes, the
// redirect table, trailing-slash normalization, localized 404 responses with
// the correct status code, the cache rules and the same security headers,
// including the content security policy. The browser tests therefore run
// under the policy production uses.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheControlFor, isHiddenPath, securityHeaders } from './hosting.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await import(resolve(root, 'dist-ssr/entry-server.js'));
const redirects = new Map(
  server.redirects().map((entry) => [entry.from, entry]),
);
const headers = securityHeaders(
  createHash('sha256').update(server.themeScript).digest('base64'),
  server.consentPolicyExtras(),
);
const types = new Map(
  Object.entries({
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
  }),
);
async function resolveFile(dir, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  // The guard runs on the decoded path, so an encoded leading dot cannot slip
  // a build artefact through.
  if (isHiddenPath(relative)) return null;
  const candidate = join(dir, relative);
  if (!candidate.startsWith(dir + sep)) return null;
  try {
    // realpath closes the symbolic-link escape that a string prefix misses.
    const real = await realpath(candidate);
    if (!real.startsWith(dir + sep)) return null;
    const info = await stat(real);
    if (info.isDirectory()) return null;
    return real;
  } catch {
    return null;
  }
}
function localeOf(pathname) {
  const segment = pathname.split('/')[1] ?? '';
  return server.locales.includes(segment) ? segment : server.defaultLocale;
}
async function notFound(dir, response, pathname) {
  const locale = localeOf(pathname);
  const file =
    (await resolveFile(dir, `/${locale}/404.html`)) ??
    (await resolveFile(dir, '/404.html'));
  response.writeHead(404, {
    ...headers,
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(file ? await readFile(file) : 'Not found');
}
export function startServer({ dir, port, host = '127.0.0.1' }) {
  return new Promise((ready, failed) => {
    const instance = createServer(async (request, response) => {
      try {
        // The request target is enough; a malformed Host header must not
        // be able to take the server down.
        const url = new URL(request.url ?? '/', 'http://localhost');
        const pathname = url.pathname;
        if (pathname === '/') {
          // The same language negotiation the generated hosting
          // configuration performs, so the preview matches production.
          const preferred = /^de/i.test(
            request.headers['accept-language'] ?? '',
          )
            ? 'de'
            : server.defaultLocale;
          response.writeHead(302, { location: `/${preferred}/` });
          response.end();
          return;
        }
        // Hidden paths are refused before any redirect, so a build artefact
        // cannot be reached through the trailing-slash rule either.
        if (isHiddenPath(decodeURIComponent(pathname))) {
          await notFound(dir, response, pathname);
          return;
        }
        const redirect =
          redirects.get(pathname) ?? redirects.get(`${pathname}/`);
        if (redirect) {
          response.writeHead(redirect.status, { location: redirect.to });
          response.end();
          return;
        }
        if (pathname !== '/' && !pathname.endsWith('/') && !extname(pathname)) {
          response.writeHead(301, { location: `${pathname}/${url.search}` });
          response.end();
          return;
        }
        const target = pathname.endsWith('/')
          ? `${pathname}index.html`
          : pathname;
        const file = await resolveFile(dir, target);
        if (!file) {
          await notFound(dir, response, pathname);
          return;
        }
        response.writeHead(200, {
          ...headers,
          'content-type':
            types.get(extname(file)) ?? 'application/octet-stream',
          'cache-control': cacheControlFor(pathname),
        });
        const stream = createReadStream(file);
        stream.on('error', () => response.destroy());
        stream.pipe(response);
      } catch (error) {
        console.error(`Request failed: ${String(error)}`);
        if (!response.headersSent) response.writeHead(400, headers);
        response.end();
      }
    });
    instance.on('error', failed);
    instance.listen(port, host, () => {
      console.log(
        `Koxora website preview on http://${host}:${port}/ from ${dir}`,
      );
      ready(instance);
    });
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  await startServer({
    dir: resolve(root, process.env.KOXORA_SITE_DIR ?? 'dist'),
    port: Number(process.env.KOXORA_SITE_PORT ?? 4175),
    host: process.env.KOXORA_SITE_HOST ?? '127.0.0.1',
  });
