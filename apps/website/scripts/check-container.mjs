// Validates the container definition as far as it can be validated without a
// Docker daemon: `docker compose config` parses and resolves the compose file
// client-side, which catches a malformed file, an unresolvable variable and a
// mistyped key. The invariants that do not need Docker at all are asserted in
// `apps/website/src/container.test.ts` and run with every `pnpm check`.
//
// Building and running the image needs a daemon. Where there is none, this
// reports what it could not do and exits 0 rather than passing quietly.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
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
if (failures.length) {
  console.error(`FAIL: ${failures.length} compose expectations not met`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
const build = spawnSync(docker, ['buildx', 'version'], { encoding: 'utf8' });
const daemon = spawnSync(docker, ['info', '--format', '{{.ServerVersion}}'], {
  encoding: 'utf8',
});
console.log(
  `PASS: the compose file resolves and holds its deployment properties (docker ${
    build.status === 0 ? 'buildx available' : 'buildx missing'
  })`,
);
if (daemon.status !== 0)
  console.log(
    'NOTE: no reachable Docker daemon, so the image was not built and not run. ' +
      'Build and healthcheck remain unproven until `docker compose ... build` runs.',
  );
