import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readConfig } from './config';
/**
 * The container of the delivery service, as this repository describes it.
 * Nothing here needs a Docker daemon: these are the properties that must
 * hold, and the ones a review would otherwise have to check by eye.
 */
const root = resolve(import.meta.dirname, '../../..');
const dockerfile = readFileSync(
  resolve(root, 'deploy/contact/Dockerfile'),
  'utf8',
);
const compose = readFileSync(
  resolve(root, 'deploy/contact/compose.yaml'),
  'utf8',
);
const runtimeStage = dockerfile.slice(
  dockerfile.lastIndexOf('\nFROM ', dockerfile.indexOf('AS runtime')),
);
/** Every setting the service refuses to start without. */
const required = [
  'KOXORA_CONTACT_ALLOWED_ORIGINS',
  'KOXORA_CONTACT_RECIPIENT',
  'KOXORA_CONTACT_SENDER',
  'KOXORA_CONTACT_SMTP_HOST',
  'KOXORA_CONTACT_SMTP_USER',
  'KOXORA_CONTACT_SMTP_PASSWORD',
];
describe('no credential is anywhere near the repository', () => {
  it('holds no secret in the image definition or the compose file', () => {
    for (const text of [dockerfile, compose])
      for (const pattern of [
        /password\s*[:=]\s*['"]?[^$\s'"?{]/i,
        /secret\s*[:=]\s*['"]?[^$\s'"?{]/i,
        /smtp[._-]?pass/i,
      ])
        for (const line of text.split('\n')) {
          // A reference to a variable is fine; a value is not.
          if (/\$\{/.test(line) || line.trim().startsWith('#')) continue;
          expect(pattern.test(line), line).toBe(false);
        }
  });
  it('makes every required setting an unset variable with an explanation', () => {
    for (const name of required) {
      expect(compose, name).toContain(`${name}: \${${name}:?`);
      // No default: a service that starts with a guessed mailbox or a
      // guessed origin is worse than one that does not start.
      expect(compose, name).not.toContain(`${name}: \${${name}:-`);
    }
  });
  it('refuses to start without each of them', () => {
    const complete = Object.fromEntries(
      required.map((name) => [
        name,
        name.includes('ORIGINS')
          ? 'https://koxora.app'
          : name.includes('HOST')
            ? 'smtp.example.invalid'
            : name.includes('PASSWORD')
              ? 'placeholder-for-tests'
              : 'support@koxora.app',
      ]),
    );
    expect(() => readConfig(complete)).not.toThrow();
    for (const name of required)
      expect(() => readConfig({ ...complete, [name]: undefined })).toThrow();
  });
});
describe('the container it runs in', () => {
  it('is published on the loopback address only', () => {
    expect(compose).toContain(
      "'127.0.0.1:${KOXORA_CONTACT_HOST_PORT:-9403}:8081'",
    );
    const published = [...compose.matchAll(/^\s+- '([^']*:\d+)'/gm)].map(
      (match) => match[1]!,
    );
    for (const entry of published)
      expect(entry, entry).toMatch(/^127\.0\.0\.1:/);
  });
  it('runs unprivileged, read-only and as a user that is not root', () => {
    expect(compose).toContain('read_only: true');
    expect(compose).toContain('no-new-privileges:true');
    expect(compose).toContain('- ALL');
    expect(runtimeStage).toContain('USER node');
  });
  it('answers a healthcheck without reaching the mail server', () => {
    // The health endpoint says the process is up; it deliberately does not
    // open an SMTP connection, so a mail outage is not a restart loop.
    expect(runtimeStage).toContain('/api/contact/health');
    expect(compose).toContain('/api/contact/health');
  });
  it('carries a tag per release and never latest', () => {
    expect(compose).toContain(
      'image: koxora-contact:${KOXORA_CONTACT_TAG:-local}',
    );
    expect(compose).not.toContain(':latest');
  });
  it('installs only what the service needs to run', () => {
    expect(dockerfile).toContain('--filter @koxora/contact-api...');
    expect(dockerfile).toContain('--prod');
    // The website, the studio and the test tooling have no business here.
    expect(runtimeStage).not.toContain('playwright');
    expect(runtimeStage).not.toContain('apps/website/src');
  });
  it('pins the runtime version it is built on', () => {
    const pinned = readFileSync(resolve(root, '.node-version'), 'utf8').trim();
    expect(dockerfile).toContain(`ARG NODE_VERSION=${pinned}`);
  });
  it('is a separate project from the website, so each rolls back alone', () => {
    expect(compose).toContain('name: koxora-contact');
    // Nothing in the definition itself refers to the website's project,
    // container or network; a comment may name the directory on the host.
    const directives = compose
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n');
    expect(directives).not.toContain('koxora-website');
  });
});
