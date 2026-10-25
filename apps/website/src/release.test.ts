import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { site } from './site';
/**
 * The release pipeline, as text.
 *
 * A workflow cannot be run here, so what is asserted is what a reviewer
 * would otherwise have to check by eye and what would be expensive to
 * discover during a release: that it cannot start by itself, that a person
 * stands between it and the public host, that a tag is never reused, and
 * that no credential is written down.
 */
const root = resolve(import.meta.dirname, '../../..');
const workflowPath = resolve(root, '.github/workflows/website-release.yml');
const workflow = readFileSync(workflowPath, 'utf8');
describe('a release never starts on its own', () => {
  it('runs only when a person dispatches it', () => {
    expect(workflow).toContain('workflow_dispatch:');
    // A push to main must not publish anything. Merging is a review step,
    // not a release decision.
    expect(workflow).not.toMatch(/^on:[\s\S]*?^\s{2}push:/m);
    expect(workflow).not.toMatch(/^\s{2}schedule:/m);
    expect(workflow).not.toMatch(/^\s{2}release:/m);
  });
  it('builds without deploying unless deploying was asked for', () => {
    // Building an image is safe and repeatable; putting it on the public
    // host is the part that needs a decision, so they are separate.
    expect(workflow).toContain('if: inputs.deploy');
    expect(workflow).toMatch(/deploy:\s*\n\s+description:/);
    expect(workflow).toMatch(/default: false/);
  });
  it('lets only one release run at a time', () => {
    expect(workflow).toContain('group: website-release');
    expect(workflow).toContain('cancel-in-progress: false');
  });
});
describe('a person stands between the pipeline and the public host', () => {
  it('puts the deployment behind a protected environment', () => {
    // The environment carries the required reviewers and the host secrets.
    expect(workflow).toContain('environment: website-production');
  });
  it('stops at the first step when that environment is not set up', () => {
    expect(workflow).toContain('The website-production environment is missing');
    expect(workflow).toContain('docs/development/website-release.md');
  });
  it('pins the host key instead of trusting whatever answers', () => {
    expect(workflow).toContain('known_hosts');
    expect(workflow).toContain('secrets.WEBSITE_KNOWN_HOSTS');
    expect(workflow).toContain('BatchMode=yes');
    // Accepting an unknown host key would let a changed DNS answer take the
    // deployment, the key and the registry token with it.
    expect(workflow).not.toContain('StrictHostKeyChecking=no');
    expect(workflow).not.toContain('UserKnownHostsFile=/dev/null');
  });
});
describe('nothing secret is written down', () => {
  it('names every credential as a secret and never as a value', () => {
    for (const name of [
      'WEBSITE_HOST',
      'WEBSITE_USER',
      'WEBSITE_SSH_KEY',
      'WEBSITE_KNOWN_HOSTS',
    ])
      expect(workflow, name).toContain(`secrets.${name}`);
    // No key material, no host name, no token, anywhere in the file.
    expect(workflow).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
    expect(workflow).not.toMatch(/ssh-(rsa|ed25519) AAAA/);
    expect(workflow).not.toMatch(/\broot@/);
    // The loopback address is the published port on the host and belongs
    // here; any other address would be a host name written into the file.
    for (const [address] of workflow.matchAll(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g))
      expect(address, address).toBe('127.0.0.1');
  });
  it('removes the key from the runner even when the deployment fails', () => {
    expect(workflow).toContain('Forget the key');
    expect(workflow).toMatch(/if: always\(\)\n\s+run: shred/);
  });
  it('asks for no more permission than it uses', () => {
    expect(workflow).toMatch(/^permissions:\n\s+contents: read$/m);
    expect(workflow).toContain('packages: write');
    // Writing to the repository is not something a release needs.
    expect(workflow).not.toContain('contents: write');
  });
});
describe('the image a release produces', () => {
  it('is tagged with the revision, and never with a moving tag', () => {
    expect(workflow).toContain('tag="$image:$REVISION"');
    expect(workflow).not.toMatch(/:latest\b/);
    expect(workflow).not.toContain('--tag "$image:stable"');
  });
  it('is cut from main, not from an arbitrary branch', () => {
    expect(workflow).toContain('git merge-base --is-ancestor');
  });
  it('is checked again at the revision being released', () => {
    // An earlier run proves an earlier commit. A release is not the moment
    // to assume they are the same.
    for (const command of ['pnpm check', 'pnpm audit --audit-level high'])
      expect(workflow, command).toContain(command);
    expect(workflow).toContain('pnpm website:nginx');
  });
  it('is run and asked for a page before it is published', () => {
    expect(workflow).toContain('docker run --rm --detach --name release-check');
    expect(workflow).toContain('/healthz');
    // The language decision is the one behaviour that cannot be checked by
    // reading the file, so the release asks the running container for it.
    expect(workflow).toContain('Accept-Language: de-DE,de;q=0.9');
    expect(workflow.indexOf('release-check')).toBeLessThan(
      workflow.indexOf('docker push'),
    );
  });
  it('records what it built, and keeps it', () => {
    expect(workflow).toContain('build-info.json');
    expect(workflow).toContain('org.opencontainers.image.revision');
    expect(workflow).toContain('retention-days: 30');
  });
});
describe('the deployment, and what happens when it goes wrong', () => {
  it('verifies the new container beside the running one before swapping', () => {
    expect(workflow).toContain('koxora-website-next');
    // A second port on the loopback address, used only for the check and
    // released again before the swap.
    expect(workflow).toContain(
      `--publish 127.0.0.1:9403:${site.container.listenPort}`,
    );
    expect(workflow).toContain('nothing was swapped');
  });
  it('puts the previous image back when the new one does not answer', () => {
    expect(workflow).toContain('rolling back');
    expect(workflow).toContain('The previous image is running again');
    // The previous image is read from the running container before anything
    // changes, so a rollback needs no build and no registry.
    expect(workflow).toMatch(/previous="\$\(docker inspect/);
  });
  it('keeps the published port and the container confinement', () => {
    expect(workflow).toContain(
      `--publish 127.0.0.1:${site.container.port}:${site.container.listenPort}`,
    );
    for (const flag of [
      '--read-only',
      '--tmpfs /tmp',
      '--cap-drop ALL',
      '--security-opt no-new-privileges:true',
      '--restart unless-stopped',
    ])
      expect(workflow, flag).toContain(flag);
  });
  it('checks the public address afterwards, not just the container', () => {
    expect(workflow).toContain('https://koxora.app/en/');
    expect(workflow).toContain('https://koxora.app/sitemap.xml');
  });
});
describe('it releases the website and nothing else', () => {
  it('builds the website image and touches no other deployment', () => {
    expect(workflow).toContain('deploy/website/Dockerfile');
    expect(workflow).toContain('koxora-website');
    for (const other of ['studio-desktop', 'studio-web', 'koxora-contact'])
      expect(workflow, other).not.toContain(other);
  });
  it('uses only actions this repository already pins, at the same commit', () => {
    const pinned = new Map<string, string>();
    for (const file of readdirSync(resolve(root, '.github/workflows')))
      for (const match of readFileSync(
        resolve(root, '.github/workflows', file),
        'utf8',
      ).matchAll(/uses:\s*([^\s@]+)@([0-9a-f]{40})/g))
        if (file !== 'website-release.yml') pinned.set(match[1]!, match[2]!);
    const used = [...workflow.matchAll(/uses:\s*([^\s@]+)@([0-9a-f]{40})/g)];
    expect(used.length).toBeGreaterThan(0);
    for (const [, action, sha] of used) {
      // An unpinned action, or one at a different commit than the rest of
      // the repository trusts, is a supply-chain decision in disguise.
      expect(pinned.get(action!), `${action} is not pinned elsewhere`).toBe(
        sha,
      );
    }
    // Every `uses:` must carry a full commit, never a tag or a branch.
    const all = [...workflow.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]!);
    for (const entry of all) expect(entry, entry).toMatch(/@[0-9a-f]{40}$/);
  });
});
