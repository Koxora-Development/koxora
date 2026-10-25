import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderNginx, renderNginxMain } from './deploy-config';
import { locales, redirects } from './routes';
import { languageCookieName } from './language';
import { site } from './site';
/**
 * The container of the running deployment, as this repository now describes
 * it. Nothing here needs a Docker daemon: these are the properties that must
 * hold for the image to be the one the Product Owner already runs, and for a
 * release to fail at build time rather than at deployment time.
 */
const root = resolve(import.meta.dirname, '../../..');
const dockerfile = readFileSync(
  resolve(root, 'deploy/website/Dockerfile'),
  'utf8',
);
const compose = readFileSync(
  resolve(root, 'deploy/website/compose.yaml'),
  'utf8',
);
const emitter = readFileSync(
  resolve(root, 'apps/website/scripts/emit-site.mjs'),
  'utf8',
);
const containerDoc = readFileSync(
  resolve(root, 'docs/development/website-container.md'),
  'utf8',
);
/** The stage that ends up in production, without the one that builds. */
const runtimeStage = dockerfile.slice(
  dockerfile.lastIndexOf('\nFROM ', dockerfile.indexOf('AS runtime')),
);
const nginx = renderNginx({
  locales,
  redirects: redirects(),
  defaultLocale: 'en',
  headers: { 'X-Content-Type-Options': 'nosniff' },
  cacheRules: [],
  documentCacheControl: 'public, max-age=0, must-revalidate',
  languageCookieName,
  listenPort: 8080,
});
describe('the runtime image', () => {
  it('contains no Node toolchain', () => {
    // The site is rendered in the first stage. Anything that could run the
    // renderer in production would be a tool an attacker finds, not a feature.
    for (const token of ['node:', 'corepack', 'pnpm', 'npm ', 'yarn'])
      expect(runtimeStage, token).not.toContain(token);
    expect(runtimeStage).toContain('FROM nginx:');
  });
  it('installs the module the language decision needs', () => {
    expect(runtimeStage).toContain('nginx-module-njs');
  });
  it('proves the configuration inside the image', () => {
    // `nginx -t` in the build is what turns a rejected configuration or a
    // missing module into a failed build instead of a failed deployment.
    expect(runtimeStage).toContain('RUN nginx -t');
    expect(runtimeStage.indexOf('nginx-module-njs')).toBeLessThan(
      runtimeStage.indexOf('RUN nginx -t'),
    );
  });
  it('copies exactly the files the page emitter writes', () => {
    const copied = [
      'nginx-koxora-main.conf',
      'nginx-koxora-website.conf',
      'nginx-koxora-language.js',
      'build-info.json',
    ];
    for (const name of copied) {
      expect(runtimeStage, name).toContain(name);
      // A file the Dockerfile copies but the build never writes would make
      // the image build fail on the server and nowhere else.
      expect(emitter, name).toContain(name);
    }
  });
  it('places each file where the generated configuration expects it', () => {
    // The fragment is included from the main file, and the main file names the
    // module path; both have to match where the image puts them.
    expect(runtimeStage).toContain('/etc/nginx/nginx.conf');
    expect(renderNginxMain()).toContain('include /etc/nginx/conf.d/*.conf;');
    expect(runtimeStage).toContain('/etc/nginx/conf.d/koxora-website.conf');
    expect(nginx).toContain(
      'js_import koxora from /etc/nginx/njs/koxora-language.js;',
    );
    expect(runtimeStage).toContain('/etc/nginx/njs/koxora-language.js');
    expect(runtimeStage).toContain('/usr/share/nginx/html/');
    expect(nginx).toContain('root /usr/share/nginx/html;');
  });
  it('listens on the port the compose file maps, and answers the healthcheck the configuration serves', () => {
    expect(runtimeStage).toContain(`EXPOSE ${site.container.listenPort}`);
    expect(nginx).toContain(`listen ${site.container.listenPort};`);
    expect(runtimeStage).toContain(
      `http://127.0.0.1:${site.container.listenPort}/healthz`,
    );
    expect(nginx).toContain('location = /healthz {');
  });
  it('pins its base images instead of following a moving tag', () => {
    expect(dockerfile).toMatch(/ARG NODE_VERSION=\d+\.\d+\.\d+/);
    expect(dockerfile).toMatch(/ARG NGINX_VERSION=\d+\.\d+/);
    // The repository's own pinned Node version, so the image and continuous
    // integration build with the same one.
    const pinned = readFileSync(resolve(root, '.node-version'), 'utf8').trim();
    expect(dockerfile).toContain(`ARG NODE_VERSION=${pinned}`);
  });
});
describe('the compose file', () => {
  it('publishes the loopback address only, on the port the proxy uses', () => {
    expect(compose).toContain(
      `'127.0.0.1:\${KOXORA_WEBSITE_PORT:-${site.container.port}}:${site.container.listenPort}'`,
    );
    // Any other published address would make the container reachable from
    // outside the host, which the deployment does not want.
    const published = [...compose.matchAll(/^\s+- '([^']*:\d+)'/gm)].map(
      (match) => match[1]!,
    );
    for (const entry of published)
      expect(entry, entry).toMatch(/^127\.0\.0\.1:/);
  });
  it('verifies a new image on a port no permanent service holds', () => {
    // The side-by-side check starts a second container while the first one
    // keeps serving, so it cannot use a port a permanent service binds.
    // 9402 is the website the public Apache proxies to; binding it would
    // fail the release instead of verifying it. The contact endpoint of
    // Website W2.2 binds no port at all: it runs under PHP-FPM, which
    // Apache reaches over its own socket, so 9403 is free for this check.
    const reserved = new Map([
      [site.container.port, 'the website the public proxy forwards to'],
    ]);
    const held = reserved.get(site.container.verificationPort);
    expect(held, `the verification port is ${held}`).toBeUndefined();
    // The documented command and the compose comment must use that port, so
    // an operator following either does not collide with a running service.
    expect(containerDoc).toContain(
      `KOXORA_WEBSITE_PORT=${site.container.verificationPort}`,
    );
    expect(compose).toContain(
      `KOXORA_WEBSITE_PORT=${site.container.verificationPort}`,
    );
    // And neither may still point at a reserved one.
    for (const port of reserved.keys()) {
      expect(containerDoc).not.toContain(`KOXORA_WEBSITE_PORT=${port}`);
      expect(compose).not.toContain(`KOXORA_WEBSITE_PORT=${port}`);
    }
  });
  it('keeps the container unprivileged and without a writable layer', () => {
    expect(compose).toContain('read_only: true');
    expect(compose).toContain('no-new-privileges:true');
    expect(compose).toContain('- ALL');
    expect(compose).toContain('- /tmp');
    // The configuration must agree: everything it writes goes to /tmp.
    expect(renderNginxMain()).toMatch(/pid \/tmp\//);
  });
  it('names a tag per release, so a rollback is naming the previous one', () => {
    expect(compose).toContain(
      'image: koxora-website:${KOXORA_WEBSITE_TAG:-local}',
    );
    expect(compose).not.toContain(':latest');
  });
  it('carries the deployment inputs the build records', () => {
    for (const name of [
      'KOXORA_SITE_ORIGIN',
      'KOXORA_SITE_EDITOR_URL',
      'KOXORA_SITE_INDEXABLE',
      'KOXORA_SITE_PUBLISHED',
      'KOXORA_SITE_CONTENT_DATE',
    ]) {
      expect(compose, name).toContain(name);
      expect(dockerfile, name).toContain(name);
    }
  });
});
