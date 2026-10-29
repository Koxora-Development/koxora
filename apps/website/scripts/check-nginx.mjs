// Runs the generated container configuration against a real NGINX and asserts
// what it is supposed to do. Regular expressions executed in a unit test prove
// their own meaning; only NGINX proves that NGINX accepts the file, loads the
// njs module, and answers the way the deployment guide says it does.
//
// It builds nothing: run `pnpm website:build` first. Without an NGINX binary
// and the njs module it reports what is missing and exits 0, so a developer
// machine without them is not blocked; the continuous integration job installs
// both and a failure there is a real failure.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cacheRules,
  documentCacheControl,
  securityHeaders,
} from './hosting.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = resolve(root, process.env.KOXORA_SITE_DIR ?? 'dist');
const njsSource = resolve(root, 'src/nginx/koxora-language.js');
const prefix = resolve(root, 'node_modules/.cache/koxora/nginx-check');
function locate(candidates, override) {
  if (override) return existsSync(override) ? override : null;
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}
function skip(reason) {
  console.log(`SKIP: ${reason}`);
  process.exit(0);
}
const binary =
  process.env.KOXORA_NGINX_BIN ??
  (
    spawnSync('sh', ['-c', 'command -v nginx'], { encoding: 'utf8' }).stdout ??
    ''
  ).trim();
if (!binary) skip('no nginx binary on PATH; install nginx to run this check');
const jsModule = locate(
  [
    '/usr/lib/nginx/modules/ngx_http_js_module.so',
    '/usr/lib64/nginx/modules/ngx_http_js_module.so',
    '/etc/nginx/modules/ngx_http_js_module.so',
  ],
  process.env.KOXORA_NGINX_JS_MODULE,
);
if (!jsModule)
  skip(
    'the njs module (ngx_http_js_module.so) was not found; the language decision cannot be tested without it',
  );
const mimeTypes = locate(
  ['/etc/nginx/mime.types', '/usr/local/nginx/conf/mime.types'],
  process.env.KOXORA_NGINX_MIME_TYPES,
);
if (!mimeTypes) skip('no mime.types found next to the nginx installation');
if (!existsSync(join(siteRoot, 'index.html')))
  skip(`no built site in ${siteRoot}; run pnpm website:build first`);
const server = await import(resolve(root, 'dist-ssr/entry-server.js'));
async function freePort() {
  return new Promise((ready, failed) => {
    const probe = createServer();
    probe.on('error', failed);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => ready(port));
    });
  });
}
const port = await freePort();
// The same hashes the pages are emitted with; the policy has to pin both.
const headers = securityHeaders(
  [server.themeScript, server.languageGatewayScript].map((text) =>
    createHash('sha256').update(text).digest('base64'),
  ),
  server.consentPolicyExtras(),
);
const site = server.renderNginx({
  locales: server.locales,
  defaultLocale: server.defaultLocale,
  redirects: server.redirects(),
  headers,
  cacheRules,
  documentCacheControl,
  languageCookieName: server.languageCookieName,
  listenPort: port,
  root: siteRoot,
  njsModulePath: join(prefix, 'njs/koxora-language.js'),
  // This environment has no usable /dev/stderr, so the logs go to files and
  // a failure can quote them.
  accessLog: join(prefix, 'logs/access.log'),
  errorLog: join(prefix, 'logs/error.log warn'),
});
const main = server.renderNginxMain({
  loadModulePath: jsModule,
  includeGlob: join(prefix, 'conf.d/*.conf'),
  mimeTypesPath: mimeTypes,
  temporaryDirectory: join(prefix, 'tmp'),
  accessLog: join(prefix, 'logs/access.log'),
  errorLog: join(prefix, 'logs/error.log warn'),
});
await rm(prefix, { recursive: true, force: true });
for (const directory of ['conf.d', 'njs', 'tmp', 'logs'])
  await mkdir(join(prefix, directory), { recursive: true });
await writeFile(join(prefix, 'nginx.conf'), `daemon off;\n${main}`, 'utf8');
await writeFile(join(prefix, 'conf.d/koxora-website.conf'), site, 'utf8');
await cp(njsSource, join(prefix, 'njs/koxora-language.js'));
const test = spawnSync(binary, ['-p', prefix, '-c', 'nginx.conf', '-t'], {
  encoding: 'utf8',
});
if (test.status !== 0) {
  console.error('FAIL: nginx rejected the generated configuration');
  console.error(test.stderr || test.stdout);
  process.exit(1);
}
const child = spawn(binary, ['-p', prefix, '-c', 'nginx.conf'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
for (const stream of [child.stdout, child.stderr])
  stream.on('data', (chunk) => {
    serverLog += String(chunk);
  });
function ask(path, { method = 'GET', headers: requestHeaders = {} } = {}) {
  return new Promise((answered, failed) => {
    const call = request(
      { host: '127.0.0.1', port, path, method, headers: requestHeaders },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          answered({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    call.on('error', failed);
    call.end();
  });
}
async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await ask('/healthz');
      return;
    } catch {
      await new Promise((done) => setTimeout(done, 100));
    }
  }
  throw new Error(`nginx did not answer on port ${port}\n${serverLog}`);
}
const failures = [];
let checks = 0;
function expect(name, actual, expected) {
  checks += 1;
  const same =
    expected instanceof RegExp
      ? expected.test(String(actual))
      : actual === expected;
  if (!same) failures.push(`${name}: expected ${expected}, got ${actual}`);
}
try {
  await waitForServer();
  // 1. The language of the address that names no language, quality values and
  //    refusals included. These are the cases a map cannot decide.
  const negotiations = [
    ['de', '/de/'],
    ['de-DE,de;q=0.9,en;q=0.8', '/de/'],
    ['de-AT,de;q=0.9', '/de/'],
    ['de-CH', '/de/'],
    ['en-US,en;q=0.9', '/en/'],
    ['en-GB,en;q=0.9,de;q=0.8', '/en/'],
    ['fr-FR,fr;q=0.9', '/en/'],
    ['', '/en/'],
    // The quality value decides, not the order written.
    ['en;q=0.5,de;q=0.9', '/de/'],
    ['de;q=0.5,en;q=0.9', '/en/'],
    ['en,de;q=1.0', '/en/'],
    ['fr,en;q=0.3,de;q=0.7', '/de/'],
    // A refused language is not a preference.
    ['de;q=0,en', '/en/'],
    ['de;q=0,en;q=0,fr;q=0.5', '/en/'],
    ['en;q=0,de;q=0.1', '/de/'],
    // Equal quality falls back to the order the browser wrote.
    ['en;q=0.8,de;q=0.8', '/en/'],
    ['de;q=0.8,en;q=0.8', '/de/'],
    // A malformed quality is ignored rather than trusted.
    ['de;q=x,en;q=0.9', '/de/'],
    // A region that looks like a language is not a language.
    ['gsw-de', '/en/'],
    ['*', '/en/'],
    ['de-DE;q=0.123,en;q=0.122', '/de/'],
  ];
  for (const [acceptLanguage, target] of negotiations) {
    const answer = await ask('/', {
      headers: { 'accept-language': acceptLanguage },
    });
    expect(`/ [${acceptLanguage}] status`, answer.status, 302);
    expect(`/ [${acceptLanguage}] location`, answer.headers.location, target);
  }
  // 2. The stored choice outranks the browser, in both directions, and a
  //    value this site never writes is ignored.
  for (const [cookie, acceptLanguage, target] of [
    ['koxora_language=de', 'en-US,en;q=0.9', '/de/'],
    ['koxora_language=en', 'de-DE,de;q=0.9', '/en/'],
    ['a=1; koxora_language=de; b=2', 'en-US', '/de/'],
    ['koxora_language=fr', 'de-DE', '/de/'],
    ['koxora_language=de-DE', 'en-US', '/en/'],
    ['koxora_language=%2f%2fevil.example', 'de-DE', '/de/'],
    ['koxora_language_other=de', 'en-US', '/en/'],
  ]) {
    const answer = await ask('/', {
      headers: { cookie, 'accept-language': acceptLanguage },
    });
    expect(`/ [${cookie}] location`, answer.headers.location, target);
  }
  // 3. The negotiated answer is never stored, and says what it depends on.
  const negotiated = await ask('/', { headers: { 'accept-language': 'de' } });
  expect('/ cache-control', negotiated.headers['cache-control'], 'no-store');
  expect('/ vary', negotiated.headers.vary, /Cookie/);
  expect('/ vary', negotiated.headers.vary, /Accept-Language/);
  expect(
    '/ carries the security headers',
    negotiated.headers['content-security-policy'],
    headers['Content-Security-Policy'],
  );
  // 4. The query string survives every redirect.
  expect(
    '/ keeps the query',
    (await ask('/?ref=example&a=b', { headers: { 'accept-language': 'de' } }))
      .headers.location,
    '/de/?ref=example&a=b',
  );
  expect(
    'alias keeps the query',
    (await ask('/features/?ref=example')).headers.location,
    '/en/features/?ref=example',
  );
  expect(
    'trailing slash keeps the query',
    (await ask('/en/features?ref=example')).headers.location,
    '/en/features/?ref=example',
  );
  // 5. The redirect table and the trailing slash.
  for (const [from, to] of [
    ['/features/', '/en/features/'],
    ['/features', '/en/features/'],
    ['/funktionen/', '/de/funktionen/'],
    ['/de/legal-notice/', '/de/impressum/'],
    ['/impressum/', '/de/impressum/'],
    ['/en/features', '/en/features/'],
    ['/de/funktionen', '/de/funktionen/'],
  ]) {
    const answer = await ask(from);
    expect(`${from} status`, answer.status, 301);
    expect(`${from} location`, answer.headers.location, to);
  }
  // 6. No reader is ever sent to the container's own address.
  for (const path of ['/', '/features', '/en/features', '/features/']) {
    const answer = await ask(path, { headers: { 'accept-language': 'de' } });
    expect(
      `${path} relative location`,
      /127\.0\.0\.1|localhost|:\d+/.test(String(answer.headers.location ?? '')),
      false,
    );
  }
  // 7. Pages, languages and localized not-found documents.
  for (const [path, marker] of [
    ['/en/', 'lang="en"'],
    ['/de/', 'lang="de"'],
    ['/en/features/', 'lang="en"'],
    ['/de/funktionen/', 'lang="de"'],
  ]) {
    const answer = await ask(path);
    expect(`${path} status`, answer.status, 200);
    expect(`${path} language`, answer.body.includes(marker), true);
  }
  for (const [path, language] of [
    ['/de/nothing-here/', 'lang="de"'],
    ['/en/nothing-here/', 'lang="en"'],
    ['/nothing-here/', 'lang="en"'],
  ]) {
    const answer = await ask(path);
    expect(`${path} status`, answer.status, 404);
    expect(`${path} language`, answer.body.includes(language), true);
  }
  // 8. Build artefacts stay unreachable; the well-known directory does not.
  for (const path of [
    '/.vite/manifest.json',
    '/_headers',
    '/en/.hidden',
    '/.env',
  ])
    expect(`${path} status`, (await ask(path)).status, 404);
  const security = await ask('/.well-known/security.txt');
  expect('security.txt status', security.status, 200);
  expect('security.txt body', security.body, /Contact: mailto:/);
  // 9. Cache rules per kind of file.
  const page = await ask('/en/');
  expect(
    'page cache-control',
    page.headers['cache-control'],
    documentCacheControl,
  );
  for (const rule of cacheRules) {
    const asset = await ask(`${rule.prefix}does-not-exist`);
    // A missing file still shows which rule the prefix is under.
    expect(
      `${rule.prefix} cache-control`,
      asset.headers['cache-control'],
      rule.value,
    );
  }
  // 10. Every security header on an ordinary answer.
  for (const [name, value] of Object.entries(headers))
    expect(`page ${name}`, page.headers[name.toLowerCase()], value);
  // 11. Liveness, and a HEAD request behaving like a GET.
  const health = await ask('/healthz');
  expect('healthz status', health.status, 200);
  expect('healthz body', health.body.trim(), 'ok');
  const head = await ask('/', {
    method: 'HEAD',
    headers: { 'accept-language': 'de-DE,de;q=0.9' },
  });
  expect('HEAD / status', head.status, 302);
  expect('HEAD / location', head.headers.location, '/de/');
  // 12. The gateway document is still reachable by its own name.
  const gateway = await ask('/index.html');
  expect('gateway status', gateway.status, 200);
  expect('gateway is not indexed', gateway.body, /noindex/);
} finally {
  child.kill('SIGTERM');
  await new Promise((done) => child.once('exit', done));
}
if (failures.length) {
  console.error(`FAIL: ${failures.length} of ${checks} checks failed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  if (serverLog.trim()) console.error(`nginx log:\n${serverLog}`);
  process.exit(1);
}
const version = spawnSync(binary, ['-v'], { encoding: 'utf8' });
console.log(
  `PASS: ${checks} checks against ${(version.stderr || version.stdout).trim()} with the generated configuration`,
);
