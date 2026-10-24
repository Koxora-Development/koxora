// Reference static server for the generated website. It mirrors the hosting
// contract the deployment configuration describes: directory indexes, the
// redirect table, trailing-slash normalization, localized 404 responses with
// the correct status code, and cache headers per asset class.
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await import(resolve(root, 'dist-ssr/entry-server.js'));
const redirects = new Map(
  server.redirects().map((entry) => [entry.from, entry]),
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
function cacheControl(pathname) {
  if (pathname.startsWith('/assets/'))
    return 'public, max-age=31536000, immutable';
  if (pathname.startsWith('/images/'))
    return 'public, max-age=86400, must-revalidate';
  return 'public, max-age=0, must-revalidate';
}
async function resolveFile(dir, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  const candidate = join(dir, relative);
  if (!candidate.startsWith(dir)) return null;
  try {
    const info = await stat(candidate);
    if (info.isDirectory()) return null;
    return candidate;
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
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(file ? await readFile(file) : 'Not found');
}
export function startServer({ dir, port, host = '127.0.0.1' }) {
  return new Promise((ready) => {
    createServer(async (request, response) => {
      const url = new URL(
        request.url ?? '/',
        `http://${request.headers.host ?? host}`,
      );
      const pathname = url.pathname;
      const redirect = redirects.get(pathname) ?? redirects.get(`${pathname}/`);
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
      if (!file || target.split('/').some((part) => part.startsWith('.'))) {
        await notFound(dir, response, pathname);
        return;
      }
      response.writeHead(200, {
        'content-type': types.get(extname(file)) ?? 'application/octet-stream',
        'cache-control': cacheControl(pathname),
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
      });
      createReadStream(file).pipe(response);
    }).listen(port, host, () => {
      console.log(
        `Koxora website preview on http://${host}:${port}/ from ${dir}`,
      );
      ready();
    });
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  await startServer({
    dir: resolve(root, process.env.KOXORA_SITE_DIR ?? 'dist'),
    port: Number(process.env.KOXORA_SITE_PORT ?? 4175),
    host: process.env.KOXORA_SITE_HOST ?? '127.0.0.1',
  });
