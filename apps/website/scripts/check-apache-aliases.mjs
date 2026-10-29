#!/usr/bin/env node
/**
 * Runs the generated canonical-domain redirects against a real Apache and asks
 * it what it answers.
 *
 * This is the one part of Issue #31 that website code can actually prove.
 * Nothing in this repository can redirect a request for `koxora.de`, because
 * such a request never reaches the website container: it arrives at whatever
 * terminates TLS for that name, which is the host's Apache or a content
 * network. What the repository can do is generate those rules and demonstrate,
 * before an operator installs anything, that they do what the runbook says -
 * that the target is a fixed origin and not the request's own `Host`, that the
 * path and the query survive, that the root stays the root so the canonical
 * host negotiates the language, and that certificate issuance and mail
 * autoconfiguration are answered locally rather than redirected away.
 *
 * A `RedirectMatch` with a negative lookahead is exactly the kind of line that
 * reads correctly and behaves otherwise, so reading it is not evidence.
 *
 * It runs against a local Apache where there is one, and in the official
 * `httpd` image where there is a Docker daemon instead. Without either it
 * skips loudly, so it never becomes a check that passes by doing nothing.
 * TLS is deliberately not part of this: the certificates are the operator's
 * half, and the generated smoke tests check them on the real hosts.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const here = resolve(import.meta.dirname, '..');
const server = await import(resolve(here, 'dist-ssr/entry-server.js')).catch(
  () => null,
);
if (!server) {
  console.log(
    'SKIP: no rendered server bundle; run pnpm website:build before this check',
  );
  process.exit(0);
}
const localBinary = ['/usr/sbin/apache2', '/usr/sbin/httpd'].find((path) =>
  existsSync(path),
);
const localModules = [
  '/usr/lib/apache2/modules',
  '/usr/lib64/httpd/modules',
  '/usr/local/apache2/modules',
].find((path) => existsSync(path));
const docker = (
  spawnSync('sh', ['-c', 'command -v docker'], { encoding: 'utf8' }).stdout ??
  ''
).trim();
const dockerReady =
  docker &&
  spawnSync(docker, ['info', '--format', '{{.ServerVersion}}'], {
    encoding: 'utf8',
  }).status === 0;
const mode =
  localBinary && localModules ? 'local' : dockerReady ? 'docker' : null;
if (!mode) {
  console.log(
    'SKIP: the generated alias redirects were not executed. No Apache binary ' +
      `(apache2=${localBinary ?? 'missing'} modules=${localModules ?? 'missing'}) ` +
      'and no reachable Docker daemon to run the httpd image in.',
  );
  process.exit(0);
}

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
const httpPort = await freePort();
const tlsPort = await freePort();
const canonicalOrigin = server.site.origin;
const canonicalHost = new URL(canonicalOrigin).host;
const aliasHosts = server.site.aliasHosts;
const passThroughPrefixes = server.site.aliasPassThroughPrefixes;
const status = server.site.aliasRedirectStatus;
// The same function the deployment file comes from, rendered on ports this
// check may bind. Nothing here edits the generated text.
const aliases = server.renderApacheAliases({
  canonicalOrigin,
  aliasHosts,
  status,
  passThroughPrefixes,
  ports: [httpPort, tlsPort],
});
const prefix = mkdtempSync(join(tmpdir(), 'koxora-aliases-'));
const modules = mode === 'local' ? localModules : '/usr/local/apache2/modules';
/**
 * The modules this check needs, loaded only where they are not already there.
 *
 * Which modules a build compiles in and which it ships as a file differs
 * between distributions: Debian's Apache has `unixd` built in and refuses a
 * `LoadModule` for it, while the official image ships it as a file. The
 * `<IfModule !name>` guard is Apache's own answer to that, and a module whose
 * file does not exist is left out rather than named.
 */
function loadModules() {
  const needed = [
    ['mpm_event_module', 'mod_mpm_event.so'],
    ['authz_core_module', 'mod_authz_core.so'],
    ['alias_module', 'mod_alias.so'],
    ['unixd_module', 'mod_unixd.so'],
    ['log_config_module', 'mod_log_config.so'],
  ];
  // Nothing here serves a file whose type matters: the alias hosts answer a
  // redirect and the canonical stand-in answers for itself. Leaving mod_mime
  // out keeps this independent of where a distribution keeps its type table.

  return needed
    .filter(([, file]) => mode === 'docker' || existsSync(join(modules, file)))
    .map(
      ([name, file]) =>
        `<IfModule !${name}>\n  LoadModule ${name} ${join(modules, file)}\n</IfModule>`,
    )
    .join('\n');
}
// The canonical host is served by a first virtual host that answers 200. It
// stands in for the reverse proxy to the website container and makes two
// things visible: a loop, if an alias rule ever matched the canonical name,
// and a pass-through path, which has to be answered rather than redirected.
const main = `ServerName ${canonicalHost}
ServerRoot "${mode === 'local' ? prefix : '/usr/local/apache2'}"
PidFile "${prefix}/httpd.pid"
ErrorLog "${prefix}/error.log"
CustomLog "${prefix}/access.log" common
${loadModules()}
${mode === 'local' ? 'User www-data\nGroup www-data' : 'User daemon\nGroup daemon'}
Listen ${httpPort}
Listen ${tlsPort}
DocumentRoot "${prefix}/www"
<Directory "${prefix}/www">
  Require all granted
</Directory>

# The canonical host, standing in for the reverse proxy to the container.
<VirtualHost *:${httpPort}>
  ServerName ${canonicalHost}
  DocumentRoot "${prefix}/www"
</VirtualHost>
<VirtualHost *:${tlsPort}>
  ServerName ${canonicalHost}
  DocumentRoot "${prefix}/www"
</VirtualHost>

${aliases}
`;
writeFileSync(join(prefix, 'httpd.conf'), main, 'utf8');
spawnSync('mkdir', ['-p', join(prefix, 'www', '.well-known', 'autoconfig')]);
writeFileSync(join(prefix, 'www', 'index.html'), 'canonical\n', 'utf8');
// Something to find at a pass-through path, so "answered locally" is a 200
// rather than only "not a redirect".
writeFileSync(
  join(prefix, 'www', '.well-known', 'autoconfig', 'probe'),
  'local\n',
  'utf8',
);
chmodSync(prefix, 0o755);

let child;
const container = 'koxora-apache-aliases-check';
function stop() {
  if (mode === 'docker') spawnSync(docker, ['rm', '-f', container]);
  else if (child) child.kill('SIGTERM');
}
function configTest() {
  return mode === 'local'
    ? spawnSync(localBinary, ['-f', join(prefix, 'httpd.conf'), '-t'], {
        encoding: 'utf8',
      })
    : spawnSync(
        docker,
        [
          'run',
          '--rm',
          '-v',
          `${prefix}:${prefix}`,
          '--entrypoint',
          'httpd',
          'httpd:2.4',
          '-f',
          join(prefix, 'httpd.conf'),
          '-t',
        ],
        { encoding: 'utf8' },
      );
}
const test = configTest();
if (test.status !== 0) {
  console.error('FAIL: Apache rejected the generated alias configuration');
  console.error(test.stderr || test.stdout);
  rmSync(prefix, { recursive: true, force: true });
  process.exit(1);
}
let startupLog = '';
if (mode === 'local') {
  child = spawn(
    localBinary,
    ['-f', join(prefix, 'httpd.conf'), '-D', 'FOREGROUND'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      startupLog += String(chunk);
    });
} else {
  spawnSync(docker, ['rm', '-f', container]);
  const started = spawnSync(
    docker,
    [
      'run',
      '-d',
      '--name',
      container,
      '--network',
      'host',
      '-v',
      `${prefix}:${prefix}`,
      '--entrypoint',
      'httpd',
      'httpd:2.4',
      '-f',
      join(prefix, 'httpd.conf'),
      '-D',
      'FOREGROUND',
    ],
    { encoding: 'utf8' },
  );
  if (started.status !== 0) {
    console.error('FAIL: the httpd container did not start');
    console.error(started.stderr || started.stdout);
    rmSync(prefix, { recursive: true, force: true });
    process.exit(1);
  }
}

/** One request, one answer, no redirect followed. */
function ask(path, { host, port, method = 'GET' } = {}) {
  return new Promise((answered, failed) => {
    const call = request(
      { host: '127.0.0.1', port, path, method, headers: { host } },
      (response) => {
        response.resume();
        response.on('end', () =>
          answered({
            status: response.statusCode,
            location: response.headers.location ?? null,
          }),
        );
      },
    );
    call.on('error', failed);
    call.end();
  });
}
const failures = [];
let checks = 0;
function expect(name, actual, expectedValue) {
  checks += 1;
  const same =
    expectedValue instanceof RegExp
      ? expectedValue.test(String(actual))
      : actual === expectedValue;
  if (!same) failures.push(`${name}: expected ${expectedValue}, got ${actual}`);
}
try {
  let answering = false;
  for (let attempt = 0; attempt < 100 && !answering; attempt += 1) {
    try {
      await ask('/', { host: canonicalHost, port: httpPort });
      answering = true;
    } catch {
      await new Promise((done) => setTimeout(done, 100));
    }
  }
  // A server that never answers is the failure, reported as one rather than
  // raised as a connection error from the next request.
  expect('Apache answered at all', answering, true);
  if (!answering)
    throw new Error(
      `Apache did not answer on ${httpPort}\n${startupLog}${readFileSync(
        join(prefix, 'error.log'),
        'utf8',
      )}`,
    );
  for (const host of aliasHosts)
    for (const port of [httpPort, tlsPort]) {
      const where = `${host}:${port === httpPort ? 'http' : 'https'}`;
      // The path and the query survive the hop, which is what makes a deep
      // link keep working.
      const deep = await ask('/de/funktionen/?ref=example&a=b', { host, port });
      expect(`${where} deep link status`, deep.status, status);
      expect(
        `${where} deep link target`,
        deep.location,
        `${canonicalOrigin}/de/funktionen/?ref=example&a=b`,
      );
      // The root stays the root, so the canonical host is the one that
      // decides the language. A redirect straight to /en/ here would serve
      // one reader's language to the next.
      const rootAnswer = await ask('/', { host, port });
      expect(`${where} root status`, rootAnswer.status, status);
      expect(
        `${where} root target`,
        rootAnswer.location,
        `${canonicalOrigin}/`,
      );
      // HEAD answers as GET does: a crawler and a monitor both ask that way.
      const head = await ask('/en/features/', { host, port, method: 'HEAD' });
      expect(`${where} HEAD status`, head.status, status);
      expect(
        `${where} HEAD target`,
        head.location,
        `${canonicalOrigin}/en/features/`,
      );
      // Certificate issuance and mail autoconfiguration stay on this host.
      for (const passThrough of passThroughPrefixes) {
        const local = await ask(`${passThrough}probe`, { host, port });
        expect(
          `${where} ${passThrough} is answered locally`,
          local.status >= 300 && local.status < 400,
          false,
        );
        expect(`${where} ${passThrough} target`, local.location, null);
      }
      // The target never comes from the request, so no Host header can make
      // this an open redirect. The name below resolves to the same virtual
      // host and must not appear in the answer.
      const forged = await ask('/en/features/', {
        host: `${host}.evil.invalid`,
        port,
      });
      expect(
        `${where} forged host target`,
        String(forged.location ?? ''),
        new RegExp(
          `^${canonicalOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/|^$`,
        ),
      );
      expect(
        `${where} forged host is not echoed`,
        String(forged.location ?? '').includes('evil.invalid'),
        false,
      );
    }
  // No alias rule may match the canonical host: that is what a loop is.
  const canonical = await ask('/en/features/', {
    host: canonicalHost,
    port: httpPort,
  });
  expect('the canonical host is not redirected', canonical.location, null);
  // The stand-in root holds no pages, so a 404 here is the right answer and
  // the point is only that it is not a 3xx somewhere else.
  expect(
    'the canonical host answers for itself',
    canonical.status >= 300 && canonical.status < 400,
    false,
  );
  // And no alias is also the canonical name, which would be the same loop
  // written in the configuration instead of produced by it.
  expect(
    'no alias is the canonical host',
    aliasHosts.includes(canonicalHost),
    false,
  );
} finally {
  if (failures.length && mode === 'docker') {
    const logs = spawnSync(docker, ['logs', '--tail', '30', container], {
      encoding: 'utf8',
    });
    console.error(`httpd log:\n${logs.stdout}${logs.stderr}`);
  }
  stop();
  rmSync(prefix, { recursive: true, force: true });
}
if (failures.length) {
  console.error(`FAIL: ${failures.length} of ${checks} alias checks failed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `PASS: ${checks} checks against a real Apache (${mode}) with the generated ` +
    `alias rules: every one of ${aliasHosts.length} names answers ${status} to ` +
    `${canonicalOrigin}, keeping the path and the query.`,
);
