// Reference static server for the generated website. It mirrors the hosting
// contract the deployment configuration describes: directory indexes, the
// redirect table, trailing-slash normalization, localized 404 responses with
// the correct status code, the cache rules and the same security headers,
// including the content security policy. The browser tests therefore run
// under the policy production uses.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { extname, join, normalize, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheControlFor, isHiddenPath, securityHeaders } from './hosting.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
const redirects = new Map(
  server.redirects().map((entry) => [entry.from, entry]),
);
const headers = securityHeaders(
  [server.themeScript, server.languageGatewayScript].map((text) =>
    createHash('sha256').update(text).digest('base64'),
  ),
  policyExtras(),
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
/**
 * Forwards one path to another local address, so the preview can answer the
 * contact endpoint the way production does: on the site's own origin, behind
 * the same host, with no cross-origin request and no CORS in sight.
 *
 * This is a preview and test convenience. In production the public Apache
 * proxies that path to the delivery container; nothing here is deployed.
 */
function forward(target, request, response) {
  const upstream = new URL(target);
  const proxied = httpRequest(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port,
      method: request.method,
      path: request.url,
      headers: { ...request.headers, host: upstream.host },
    },
    (answer) => {
      response.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(response);
    },
  );
  proxied.on('error', () => {
    if (!response.headersSent) response.writeHead(502);
    response.end();
  });
  request.pipe(proxied);
}
export function startServer({ dir, port, host = '127.0.0.1', contactProxy }) {
  return new Promise((ready, failed) => {
    const instance = createServer(async (request, response) => {
      try {
        // The request target is enough; a malformed Host header must not
        // be able to take the server down.
        const url = new URL(request.url ?? '/', 'http://localhost');
        const pathname = url.pathname;
        if (contactProxy && pathname.startsWith('/api/contact')) {
          forward(contactProxy, request, response);
          return;
        }
        if (pathname === '/') {
          // The documented negotiation: the stored choice first, then the
          // languages of the request, then the fallback. The answer depends on
          // the reader, so it is temporary, is never stored, and says on what
          // it depends.
          const { locale } = server.negotiateLocale({
            cookie: request.headers.cookie,
            acceptLanguage: request.headers['accept-language'],
          });
          response.writeHead(302, {
            location: `/${locale}/${url.search}`,
            'cache-control': 'no-store',
            vary: 'Cookie, Accept-Language',
          });
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
          response.writeHead(redirect.status, {
            location: `${redirect.to}${url.search}`,
          });
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
