// Starts the real contact endpoint for the browser tests.
//
// This used to be a stand-in written in JavaScript that answered with the
// same shapes. It is now PHP's built-in server running the endpoint itself,
// so the browser tests exercise the real request parsing, the real
// validation, the real abuse controls and the real localized redirects. The
// one step a test cannot run — handing a message to a mail server — is
// replaced inside `apps/contact-php/tests/server.php`, which lives in the
// test directory and is never deployed.
//
// It is never deployed either: `pnpm website:build` does not emit it, and
// nothing outside the test server starts it.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const endpoint = resolve(root, 'apps/contact-php');
/** Whether the endpoint can be started at all, so a caller can say why not. */
export function contactEndpointAvailable() {
  const php = spawnSync('php', ['-v'], { encoding: 'utf8' });
  return (
    php.status === 0 && existsSync(resolve(endpoint, 'vendor/autoload.php'))
  );
}
export async function startContactEndpoint({
  port,
  host = '127.0.0.1',
  allowedOrigins,
  resultBase,
  perClient = 200,
  global: globalLimit = 2000,
}) {
  if (!contactEndpointAvailable())
    throw new Error(
      'The contact endpoint needs PHP and its Composer dependencies: run `composer install` in apps/contact-php.',
    );
  const state = join(tmpdir(), `koxora-contact-state-${process.pid}`);
  const outbox = join(tmpdir(), `koxora-contact-outbox-${process.pid}.json`);
  rmSync(state, { recursive: true, force: true });
  rmSync(outbox, { force: true });
  mkdirSync(state, { recursive: true });
  const php = spawn(
    'php',
    [
      '-d',
      'display_errors=0',
      '-S',
      `${host}:${port}`,
      resolve(endpoint, 'tests/server.php'),
    ],
    {
      cwd: endpoint,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        KOXORA_CONTACT_ENABLED: 'true',
        KOXORA_CONTACT_ALLOWED_ORIGINS: allowedOrigins.join(','),
        KOXORA_CONTACT_RECIPIENT: 'hello@koxora.app',
        KOXORA_CONTACT_SENDER: 'website@koxora.app',
        // Never reached: the transport is replaced in the test front
        // controller, so no connection to this host is ever attempted.
        KOXORA_CONTACT_SMTP_HOST: 'mail.invalid',
        KOXORA_CONTACT_SMTP_USER: 'website@koxora.app',
        KOXORA_CONTACT_SMTP_PASSWORD: 'not-a-real-password',
        KOXORA_CONTACT_STATE_DIR: state,
        KOXORA_CONTACT_RESULT_BASE: resultBase,
        // Generous on purpose: the suite submits the form many times across
        // three device projects. The rate-limited answer has its own test
        // that exhausts a small allowance of its own.
        KOXORA_CONTACT_RATE_PER_CLIENT: String(perClient),
        KOXORA_CONTACT_RATE_GLOBAL: String(globalLimit),
        KOXORA_CONTACT_TEST_OUTBOX: outbox,
      },
    },
  );
  let noise = '';
  for (const stream of [php.stdout, php.stderr])
    stream?.on('data', (chunk) => {
      noise += String(chunk);
    });
  php.on('exit', (code) => {
    if (code !== 0 && code !== null)
      console.error(
        `The contact endpoint exited with ${code}: ${noise.trim()}`,
      );
  });
  const base = `http://${host}:${port}`;
  const deadline = Date.now() + 15000;
  for (;;) {
    try {
      const probe = await fetch(`${base}/api/contact/health`);
      if (probe.ok) break;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) {
      php.kill('SIGKILL');
      throw new Error(`The contact endpoint did not start: ${noise.trim()}`);
    }
    await new Promise((done) => setTimeout(done, 150));
  }
  const stop = () => {
    php.kill('SIGTERM');
    rmSync(state, { recursive: true, force: true });
    rmSync(outbox, { force: true });
  };
  process.on('exit', stop);
  return { stop, outbox, origin: base };
}
