// Validates the container definition, and then the container itself.
//
// Two halves, each skipping cleanly when its prerequisite is missing:
//
//  1. `docker compose config` parses and resolves the compose file
//     client-side, which catches a malformed file, an unresolvable variable
//     and a mistyped key. It needs the docker command only.
//  2. With a reachable daemon, the image is built and run, and the running
//     container is asked for every address the emitted pages reference. That
//     half exists because the live site answered 403 for two of the studio
//     screenshots: the files were in the repository and in the image, and the
//     server could not read them. Only an HTTP answer from the real container
//     shows that, which is why source-file existence is not what is asserted
//     here.
//
// The invariants that need no Docker at all are asserted in
// `apps/website/src/container.test.ts` and run with every `pnpm check`.
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedType, referencedAssets, typeMatches } from './assets.mjs';
const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(here, '../..');
const siteRoot = resolve(here, 'dist');
const composeFile = 'deploy/website/compose.yaml';
const docker = (
  spawnSync('sh', ['-c', 'command -v docker'], {
    encoding: 'utf8',
  }).stdout ?? ''
).trim();
if (!docker) {
  console.log('SKIP: no docker command; the compose file was not parsed');
  process.exit(0);
}
const config = spawnSync(
  docker,
  ['compose', '-f', composeFile, '--project-directory', '.', 'config'],
  { cwd: root, encoding: 'utf8' },
);
if (config.status !== 0) {
  console.error('FAIL: docker compose rejected the compose file');
  console.error(config.stderr || config.stdout);
  process.exit(1);
}
const resolved = config.stdout;
const failures = [];
function expect(name, condition) {
  if (!condition) failures.push(name);
}
// The resolved document is what Docker would act on, so these are checked
// after resolution rather than on the source text.
expect(
  'the service is published on the loopback address only',
  /host_ip:\s*127\.0\.0\.1/.test(resolved) &&
    !/host_ip:\s*(?!127\.0\.0\.1)\S/.test(resolved),
);
expect(
  'the container keeps a read-only file system',
  /read_only:\s*true/.test(resolved),
);
expect('the image carries a tag', /image:\s*koxora-website:\S+/.test(resolved));
expect('a healthcheck is defined', /healthcheck:/.test(resolved));
expect(
  'the build uses the versioned Dockerfile',
  /dockerfile:\s*deploy\/website\/Dockerfile/.test(resolved),
);
// The build context has to be bounded. Without this file `COPY . .` carries
// the whole working tree into the image, including its file modes, and a
// published file the unprivileged worker cannot read is answered with 403.
expect(
  'the build context is bounded by a .dockerignore',
  existsSync(resolve(root, '.dockerignore')),
);
if (failures.length) {
  console.error(`FAIL: ${failures.length} compose expectations not met`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
const build = spawnSync(docker, ['buildx', 'version'], { encoding: 'utf8' });
console.log(
  `PASS: the compose file resolves and holds its deployment properties (docker ${
    build.status === 0 ? 'buildx available' : 'buildx missing'
  })`,
);
const daemon = spawnSync(docker, ['info', '--format', '{{.ServerVersion}}'], {
  encoding: 'utf8',
});
if (daemon.status !== 0) {
  console.log(
    'SKIP: no reachable Docker daemon, so the image was not built and not run. ' +
      'Build and healthcheck remain unproven until `docker compose ... build` runs.',
  );
  process.exit(0);
}
if (!existsSync(resolve(siteRoot, 'index.html'))) {
  console.log(
    `SKIP: no built site in ${siteRoot}; run pnpm website:build first, so the ` +
      'addresses the pages reference are known and can be asked for.',
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The image, built and answered by.
const tag = process.env.KOXORA_WEBSITE_IMAGE ?? 'koxora-website:check';
const container = 'koxora-website-check';
function run(args, options = {}) {
  return spawnSync(docker, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
  });
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
function ask(path, { method = 'GET' } = {}) {
  return new Promise((answered, failed) => {
    const call = request(
      { host: '127.0.0.1', port, path, method },
      (response) => {
        let length = 0;
        response.on('data', (chunk) => {
          length += chunk.length;
        });
        response.on('end', () =>
          answered({
            status: response.statusCode,
            headers: response.headers,
            length,
          }),
        );
      },
    );
    call.on('error', failed);
    call.end();
  });
}
if (!process.env.KOXORA_WEBSITE_IMAGE) {
  console.log(`Building ${tag} from ${composeFile}'s Dockerfile…`);
  const built = run([
    'build',
    '-f',
    'deploy/website/Dockerfile',
    '-t',
    tag,
    '.',
  ]);
  if (built.status !== 0) {
    console.error('FAIL: the image did not build');
    console.error(built.stderr || built.stdout);
    process.exit(1);
  }
}
const port = await freePort();
run(['rm', '-f', container]);
// The same posture the compose file gives it: loopback only, read-only root,
// no capabilities. A container that needs more than that to serve a file
// would pass here and fail in production.
const started = run([
  'run',
  '-d',
  '--name',
  container,
  '--read-only',
  '--tmpfs',
  '/tmp',
  '--cap-drop',
  'ALL',
  '--security-opt',
  'no-new-privileges:true',
  '-p',
  `127.0.0.1:${port}:8080`,
  tag,
]);
if (started.status !== 0) {
  console.error('FAIL: the container did not start');
  console.error(started.stderr || started.stdout);
  process.exit(1);
}
const checks = { count: 0, failures: [] };
function assert(name, actual, expectedValue) {
  checks.count += 1;
  const same =
    expectedValue instanceof RegExp
      ? expectedValue.test(String(actual))
      : actual === expectedValue;
  if (!same)
    checks.failures.push(`${name}: expected ${expectedValue}, got ${actual}`);
}
try {
  let answering = false;
  for (let attempt = 0; attempt < 100 && !answering; attempt += 1) {
    try {
      await ask('/healthz');
      answering = true;
    } catch {
      await new Promise((done) => setTimeout(done, 100));
    }
  }
  // A container that never answers is the failure, so it is reported as one
  // rather than raised as a connection error from the next request.
  assert('the container answers at all', answering, true);
  if (answering) {
    const health = await ask('/healthz');
    assert('healthz status', health.status, 200);
    const page = await ask('/en/');
    assert('/en/ status', page.status, 200);
    // Every address the pages name, from the running container. A 403 here is
    // the regression this check exists for and fails as loudly as a 404.
    const referenced = await referencedAssets(siteRoot);
    assert('the pages reference assets at all', referenced.length > 0, true);
    for (const asset of referenced) {
      const answer = await ask(asset.path);
      assert(`${asset.path} status`, answer.status, 200);
      assert(
        `${asset.path} content-type (expected one of ${expectedType(asset.path).join(', ')}, got ${answer.headers['content-type']})`,
        typeMatches(asset.path, answer.headers['content-type']),
        true,
      );
      assert(`${asset.path} is not empty`, answer.length > 0, true);
      const head = await ask(asset.path, { method: 'HEAD' });
      assert(`HEAD ${asset.path} status`, head.status, 200);
    }
    // And the files inside the image are readable by the account the worker
    // runs as, which is what makes the answers above reproducible rather than
    // lucky. The published tree is checked in full, not sampled.
    const modes = run([
      'exec',
      container,
      'sh',
      '-c',
      'find /usr/share/nginx/html \\( -type f ! -perm -o+r \\) -o \\( -type d ! -perm -o+rx \\)',
    ]);
    assert('every published file is world-readable', modes.stdout.trim(), '');
    const healthy = run([
      'inspect',
      '--format',
      '{{.State.Health.Status}}',
      container,
    ]);
    assert(
      'the container reports itself healthy or is still starting',
      healthy.stdout.trim(),
      /^(healthy|starting)$/,
    );
  }
} finally {
  if (checks.failures.length) {
    const logs = run(['logs', '--tail', '40', container]);
    console.error(`container log:\n${logs.stdout}${logs.stderr}`);
  }
  run(['rm', '-f', container]);
}
if (checks.failures.length) {
  console.error(
    `FAIL: ${checks.failures.length} of ${checks.count} container checks failed`,
  );
  for (const failure of checks.failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `PASS: ${checks.count} checks against the running ${tag} container on docker ${daemon.stdout.trim()}`,
);
