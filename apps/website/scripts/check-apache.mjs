#!/usr/bin/env node
/**
 * Runs the generated Apache configuration, with PHP-FPM behind it, and asks
 * it questions.
 *
 * The contact endpoint is reached through a generated Apache fragment: one
 * `ProxyPass … !` that keeps the submission path away from the website
 * container, one `Alias` onto a single PHP file, and one `<Directory>` that
 * denies everything in that directory except that file. Every one of those is
 * a line that is either right or quietly wrong, and reading it proves
 * nothing: an `Alias` after a catch-all never fires, a `<Files>` section in
 * the wrong place grants too much, and a handler that is not scoped hands
 * every similarly named file to PHP.
 *
 * So this starts a real Apache with the real generated fragment and a real
 * PHP-FPM pool running the real endpoint, and checks what actually answers.
 * It is skipped, loudly, where Apache or PHP-FPM is missing, so it never
 * turns into a check that silently passes by doing nothing.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const apache = ['/usr/sbin/apache2', '/usr/sbin/httpd'].find((path) =>
  existsSync(path),
);
const fpm = [
  '/usr/sbin/php-fpm8.4',
  '/usr/sbin/php-fpm8.3',
  '/usr/sbin/php-fpm',
].find((path) => existsSync(path));
const modules = ['/usr/lib/apache2/modules'].find((path) => existsSync(path));
if (!apache || !fpm || !modules) {
  process.stdout.write(
    `SKIP: the Apache contact routing was not executed. apache2=${apache ?? 'missing'} php-fpm=${fpm ?? 'missing'} modules=${modules ?? 'missing'}\n`,
  );
  process.exit(0);
}

const port = 8411;
const containerPort = 9452;
// Apache refuses to serve as root, and it is right to. Where these checks
// run as root — a container, continuous integration — they use the web
// server's own unprivileged account, which is what production uses too.
const account =
  typeof process.getuid === 'function' && process.getuid() === 0
    ? 'www-data'
    : userInfo().username;
const prefix = mkdtempSync(join(tmpdir(), 'koxora-apache-'));
const contactRoot = join(prefix, 'contact');
const stateDirectory = join(prefix, 'state');
const documentRoot = join(prefix, 'www');
const fpmSocket = join(prefix, 'fpm.sock');
let apacheProcess;
let fpmProcess;
let container;
const failures = [];
let checks = 0;

/**
 * Sends a request line verbatim.
 *
 * `fetch` resolves `..` in a path before it ever reaches the network, so it
 * cannot test what a server does with a traversal attempt. This can: the
 * bytes on the wire are the bytes given here.
 */
function rawRequest(target, host, requestPort) {
  return new Promise((done, failed) => {
    const socket = connect(requestPort, host, () => {
      socket.write(
        `GET ${target} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`,
      );
    });
    let answer = '';
    socket.setTimeout(5000, () => socket.destroy(new Error('timed out')));
    socket.on('data', (chunk) => {
      answer += String(chunk);
    });
    socket.on('error', failed);
    socket.on('close', () => done(answer));
  });
}

function readIfPresent(path) {
  try {
    return `\n${path}: ${readFileSync(path, 'utf8').trim()}`;
  } catch {
    return '';
  }
}

function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

try {
  // The endpoint, where an operator would put it: outside every document
  // root, with only `public/contact.php` meant to be reachable.
  spawnSync('cp', ['-r', join(root, 'apps/contact-php'), contactRoot], {
    stdio: 'inherit',
  });
  mkdirSync(stateDirectory, { recursive: true });
  mkdirSync(documentRoot, { recursive: true });
  // A file in the real document root, so a request that is *not* the contact
  // path can be told apart from one that is.
  writeFileSync(join(documentRoot, 'index.html'), 'the website container\n');
  // A second file beside the endpoint, to prove the directory rules deny
  // everything that is not the one allowed file.
  writeFileSync(join(contactRoot, 'public/secret.txt'), 'must not be served\n');
  writeFileSync(
    join(contactRoot, 'public/other.php'),
    '<?php echo "must not run";\n',
  );

  // A stand-in for the website container, so the checks can tell a path that
  // reaches PHP from one that reaches the static site. Without it, "the
  // contact path is handled by PHP" would be indistinguishable from "every
  // path is broken".
  container = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end(`the website container answered ${request.url}\n`);
  });
  await new Promise((ready) =>
    container.listen(containerPort, '127.0.0.1', ready),
  );

  const script = join(contactRoot, 'public/contact.php');
  process.env.KOXORA_SITE_CONTAINER_PORT = String(containerPort);
  process.env.KOXORA_SITE_CONTACT_ENDPOINT = '/api/contact';
  process.env.KOXORA_SITE_CONTACT_SCRIPT = script;
  process.env.KOXORA_SITE_CONTACT_FPM = `unix:${fpmSocket}|fcgi://localhost`;
  const server = await import('../src/deploy-config.ts');
  const { site } = await import('../src/site.ts');
  if (site.contactHandler.script !== script)
    throw new Error('the script path was rejected by the site configuration');

  const fragment = server.renderApacheProxy({
    canonicalHost: new URL(site.origin).host,
    containerHost: site.container.host,
    containerPort: site.container.port,
    passThroughPrefixes: site.aliasPassThroughPrefixes,
    contactHandler: {
      path: site.contactEndpoint,
      script: site.contactHandler.script,
      fpm: site.contactHandler.fpm,
    },
  });
  // Everything the generated fragment needs around it, and nothing it
  // contains. The fragment is included verbatim: what is tested is the file
  // the emitter writes, not a copy of it.
  writeFileSync(join(prefix, 'koxora-contact.conf'), fragment);
  writeFileSync(
    join(prefix, 'httpd.conf'),
    `ServerName koxora.test
Listen 127.0.0.1:${port}
# The account is this harness's own, so it can run wherever the checks run.
# The generated fragment deliberately contains no User directive: on the
# production host Apache already runs as its own account and TinyCP owns that
# decision.
User ${account}
Group ${account}
PidFile ${prefix}/httpd.pid
ErrorLog ${prefix}/error.log
CustomLog ${prefix}/access.log common
DocumentRoot ${documentRoot}
LoadModule mpm_event_module ${modules}/mod_mpm_event.so
LoadModule authz_core_module ${modules}/mod_authz_core.so
LoadModule alias_module ${modules}/mod_alias.so
LoadModule dir_module ${modules}/mod_dir.so
LoadModule mime_module ${modules}/mod_mime.so
LoadModule headers_module ${modules}/mod_headers.so
LoadModule proxy_module ${modules}/mod_proxy.so
LoadModule proxy_http_module ${modules}/mod_proxy_http.so
LoadModule proxy_fcgi_module ${modules}/mod_proxy_fcgi.so
TypesConfig /etc/mime.types
<Directory ${documentRoot}>
  Require all granted
</Directory>
Include ${prefix}/koxora-contact.conf
`,
  );

  // The settings an operator would put in the pool, including the ones that
  // keep the password out of a process listing.
  writeFileSync(
    join(prefix, 'fpm.conf'),
    `[global]
pid = ${prefix}/fpm.pid
error_log = ${prefix}/fpm.log
daemonize = no
[koxora]
user = ${account}
group = ${account}
listen = ${fpmSocket}
listen.owner = ${account}
pm = static
pm.max_children = 4
; Only this one script may ever be executed by this pool.
security.limit_extensions = .php
env[KOXORA_CONTACT_ENABLED] = "false"
env[KOXORA_CONTACT_ALLOWED_ORIGINS] = "https://koxora.app"
env[KOXORA_CONTACT_RECIPIENT] = "hello@koxora.app"
env[KOXORA_CONTACT_SENDER] = "website@koxora.app"
env[KOXORA_CONTACT_SMTP_HOST] = "mail.invalid"
env[KOXORA_CONTACT_SMTP_USER] = "website@koxora.app"
env[KOXORA_CONTACT_SMTP_PASSWORD] = "not-a-real-password"
env[KOXORA_CONTACT_STATE_DIR] = "${stateDirectory}"
`,
  );

  // The unprivileged account has to be able to walk into the temporary
  // directory and write the rate-limit state, exactly as it would on the host.
  if (account !== userInfo().username) {
    spawnSync('chown', ['-R', `${account}:${account}`, prefix], {
      stdio: 'inherit',
    });
    spawnSync('chmod', ['755', prefix], { stdio: 'inherit' });
  }

  const syntax = spawnSync(apache, ['-f', join(prefix, 'httpd.conf'), '-t'], {
    encoding: 'utf8',
  });
  check(
    'the generated fragment is accepted by Apache',
    syntax.status === 0,
    `${syntax.stdout ?? ''}${syntax.stderr ?? ''}`.trim(),
  );
  if (syntax.status !== 0)
    throw new Error(
      `Apache rejected the configuration: ${`${syntax.stdout ?? ''}${syntax.stderr ?? ''}`.trim()}`,
    );

  fpmProcess = spawn(fpm, ['-y', join(prefix, 'fpm.conf'), '-F'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  apacheProcess = spawn(
    apache,
    ['-f', join(prefix, 'httpd.conf'), '-D', 'FOREGROUND'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  // Whatever either process complains about belongs in the failure message,
  // not in a log file inside a directory this script deletes.
  let noise = '';
  for (const process_ of [apacheProcess, fpmProcess])
    for (const stream of [process_.stdout, process_.stderr])
      stream?.on('data', (chunk) => {
        noise += String(chunk);
      });

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15000;
  for (;;) {
    try {
      // The contact path, not the root: it is the one that proves Apache and
      // PHP-FPM are both up and talking to each other.
      const probe = await fetch(`${base}/api/contact`);
      if (probe.status === 405) break;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline)
      throw new Error(
        `Apache did not start. ${noise.trim()}${readIfPresent(join(prefix, 'error.log'))}${readIfPresent(join(prefix, 'fpm.log'))}`,
      );
    await new Promise((done) => setTimeout(done, 150));
  }

  const ask = async (path, options = {}) => fetch(`${base}${path}`, options);

  // 1. Every other path still reaches the website container, so the contact
  //    rule narrowed nothing it should not have.
  for (const path of ['/', '/en/', '/de/kontakt/', '/api/other']) {
    const response = await ask(path);
    const body = await response.text();
    check(
      `the website container still answers ${path}`,
      response.status === 200 && body.includes('the website container'),
      `status ${response.status}`,
    );
  }

  // 2. The contact path reaches PHP rather than the container. A GET is the
  //    cheapest proof: only the endpoint answers 405 with Allow: POST.
  const get = await ask('/api/contact');
  check(
    'a GET reaches the PHP endpoint',
    get.status === 405,
    `status ${get.status}`,
  );
  check(
    'it names the one method it accepts',
    get.headers.get('allow') === 'POST',
  );

  // 3. A JSON submission is validated by the server, not by the browser.
  const invalid = await ask('/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://koxora.app',
    },
    body: JSON.stringify({
      email: 'nope',
      category: 'invoice',
      subject: 'Hi',
      message: 'Short.',
    }),
  });
  check('an invalid submission is refused', invalid.status === 400);
  const invalidBody = await invalid.json();
  check(
    'every problem is reported at once',
    invalidBody.errors?.length === 4,
    JSON.stringify(invalidBody),
  );

  // 4. A header injection attempt is refused through the real stack.
  const injection = await ask('/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://koxora.app',
    },
    body: JSON.stringify({
      name: 'Alex',
      email: 'alex@example.org',
      category: 'bug',
      subject: 'Hello\r\nBcc: victim@example.net',
      message: 'This is a long enough message body to pass the minimum length.',
    }),
  });
  const injectionBody = await injection.json();
  check(
    'a header injection attempt is refused',
    injection.status === 400 &&
      injectionBody.errors?.[0]?.problem === 'controlCharacter',
    JSON.stringify(injectionBody),
  );

  // 5. A cross-site submission is refused.
  const foreign = await ask('/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://evil.example.net',
    },
    body: JSON.stringify({ subject: 'x' }),
  });
  check('a cross-site submission is refused', foreign.status === 403);

  // 6. A valid submission while delivery is switched off says so honestly
  //    rather than claiming the message was sent.
  const disabled = await ask('/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://koxora.app',
    },
    body: JSON.stringify({
      name: 'Alex',
      email: 'alex@example.org',
      category: 'support',
      subject: 'A question about project files',
      message: 'I would like to know how the project archive format works.',
    }),
  });
  const disabledBody = await disabled.json();
  check(
    'a switched-off endpoint never claims delivery',
    disabled.status === 503 && disabledBody.status === 'undelivered',
    `${disabled.status} ${JSON.stringify(disabledBody)}`,
  );

  // 7. A form post without JavaScript is redirected to a page on the site,
  //    and the target comes from configuration rather than the request.
  const form = await ask('/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://koxora.app',
    },
    body: new URLSearchParams({
      name: 'Alex',
      email: 'alex@example.org',
      category: 'support',
      subject: 'A question about project files',
      message: 'I would like to know how the project archive format works.',
      locale: 'de',
    }).toString(),
    redirect: 'manual',
  });
  check(
    'a form post is redirected',
    form.status === 303,
    `status ${form.status}`,
  );
  check(
    'to the German problem page, from configuration',
    form.headers.get('location') === 'https://koxora.app/de/kontakt/problem/',
    String(form.headers.get('location')),
  );

  // 8. The answer carries the headers that keep it out of a cache and out of
  //    a frame.
  check(
    'the answer is not cached',
    get.headers.get('cache-control') === 'no-store',
  );
  check(
    'the answer is not sniffed',
    get.headers.get('x-content-type-options') === 'nosniff',
  );

  // 9. Nothing else in that directory is reachable. This is the one that
  //    reading the configuration cannot settle.
  for (const path of [
    '/api/contact/secret.txt',
    '/api/contact/other.php',
    '/api/contact/',
  ]) {
    const response = await ask(path);
    check(
      `nothing else is served from the endpoint directory (${path})`,
      response.status === 403 || response.status === 404,
      `status ${response.status}`,
    );
  }

  // 9b. Traversal, sent verbatim rather than through a client that would
  //     tidy the path up first. What matters is not the status but that no
  //     byte of the endpoint's own source or settings comes back.
  for (const target of [
    '/api/contact/../src/Config.php',
    '/api/contact/..%2fsrc%2fConfig.php',
    '/api/contact%2f..%2fsrc%2fMailer.php',
    '/api/contact/../../composer.json',
    '/api/contact/../vendor/autoload.php',
  ]) {
    const answer = await rawRequest(target, '127.0.0.1', port);
    check(
      `a traversal attempt returns no source (${target})`,
      !answer.includes('<?php') &&
        !answer.includes('KOXORA_CONTACT_SMTP_PASSWORD') &&
        !answer.includes('ConfigurationError') &&
        !answer.includes('symfony/mailer'),
      answer.split('\r\n')[0] ?? '',
    );
  }

  // 10. The endpoint's own source is not downloadable through the alias.
  const source = await ask('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', origin: 'https://koxora.app' },
    body: 'nothing',
  });
  const sourceText = await source.text();
  check(
    'the PHP source is never sent to a client',
    !sourceText.includes('<?php') &&
      !sourceText.includes('KOXORA_CONTACT_SMTP_PASSWORD'),
    sourceText.slice(0, 120),
  );
  check('an unknown content type is refused', source.status === 415);

  // 11. No setting leaks into an answer.
  check(
    'no configured value appears in an answer',
    !sourceText.includes('not-a-real-password') &&
      !sourceText.includes(stateDirectory),
  );
} finally {
  container?.close();
  for (const process_ of [apacheProcess, fpmProcess]) process_?.kill('SIGTERM');
  await new Promise((done) => setTimeout(done, 300));
  for (const process_ of [apacheProcess, fpmProcess]) process_?.kill('SIGKILL');
  rmSync(prefix, { recursive: true, force: true });
}

if (failures.length > 0) {
  process.stderr.write(`FAIL: ${failures.length} of ${checks} checks\n`);
  for (const failure of failures) process.stderr.write(`  - ${failure}\n`);
  process.exit(1);
}
const version = spawnSync(apache, ['-v'], { encoding: 'utf8' }).stdout ?? '';
process.stdout.write(
  `PASS: ${checks} checks against ${version.split('\n')[0]?.replace('Server version: ', '').trim()} with PHP-FPM and the generated contact routing\n`,
);
