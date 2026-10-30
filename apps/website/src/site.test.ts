import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SiteConfig } from './site';
/**
 * The deployment inputs, read as a build reads them.
 *
 * `site.ts` reads the environment once, when the module loads, which is the
 * point: a release records exactly one set of values. So these load it again
 * with a different environment rather than calling a function, and what is
 * tested is what a build would actually produce.
 */
async function load(
  values: Record<string, string | undefined>,
): Promise<SiteConfig> {
  vi.resetModules();
  for (const [name, value] of Object.entries(values))
    if (value === undefined) vi.stubEnv(name, undefined as never);
    else vi.stubEnv(name, value);
  return (await import('./site')).site;
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe('the redirect code of the alias hosts', () => {
  it('is the permanent one unless a build says otherwise', async () => {
    const site = await load({ KOXORA_SITE_ALIAS_REDIRECT_STATUS: '' });
    expect(site.aliasRedirectStatus).toBe(308);
  });
  it('can be built as the temporary code of a rollout', async () => {
    // A permanent redirect is cached by browsers and by a content network and
    // is hard to take back, so a rollout starts at 302. It is a build input
    // rather than an edit to the generated file, which says not to edit it.
    for (const code of ['302', '301', '308'] as const) {
      const site = await load({ KOXORA_SITE_ALIAS_REDIRECT_STATUS: code });
      expect(site.aliasRedirectStatus, code).toBe(Number(code));
    }
  });
  it('falls back to the permanent code rather than passing a typo through', async () => {
    // An unrecognized number in a generated `RedirectMatch` is a
    // configuration Apache may or may not accept, and the rollout is a
    // Product Owner decision rather than a typo's.
    for (const value of ['307', '0', 'yes', '30 2', '3028']) {
      const site = await load({ KOXORA_SITE_ALIAS_REDIRECT_STATUS: value });
      expect(site.aliasRedirectStatus, value).toBe(308);
    }
  });
});
describe('where the contact form posts', () => {
  it('is nothing at all until a deployment configures it', async () => {
    // The form is rendered only where this is set, because a form that posts
    // nowhere is worse than a published address.
    const site = await load({ KOXORA_SITE_CONTACT_ENDPOINT: '' });
    expect(site.contactEndpoint).toBeNull();
  });
  it('keeps a path on this site as it was given', async () => {
    const site = await load({ KOXORA_SITE_CONTACT_ENDPOINT: '/api/contact' });
    expect(site.contactEndpoint).toBe('/api/contact');
  });
  it('accepts another address, because the endpoint need not be ours', async () => {
    const site = await load({
      KOXORA_SITE_CONTACT_ENDPOINT: 'https://forms.example.org/api/contact',
    });
    expect(site.contactEndpoint).toBe('https://forms.example.org/api/contact');
  });
  it('refuses anything that is not an address to post to', async () => {
    // This value becomes a form action and a policy source. A `javascript:`
    // or `data:` value must yield no form rather than a form pointing
    // somewhere it should not.
    for (const value of [
      'javascript:alert(1)',
      'data:,x',
      'mailto:support@koxora.app',
      'not an address',
    ]) {
      const site = await load({ KOXORA_SITE_CONTACT_ENDPOINT: value });
      expect(site.contactEndpoint, value).toBeNull();
    }
  });
});
describe('the host the endpoint runs on', () => {
  it('takes no handler path it cannot safely write into a rule', async () => {
    // Both values are written into a generated Apache `Alias`, so a value
    // with a space, a quotation mark or a traversal in it would change what
    // that directive means. Anything but a plain absolute path to a PHP file
    // yields no contact routing at all.
    for (const script of [
      '/opt/koxora contact/public/contact.php',
      '/opt/koxora-contact/public/../../etc/passwd.php',
      '/opt/koxora-contact/public/contact.sh',
      'opt/koxora-contact/public/contact.php',
      '/opt/koxora-contact/public/contact.php"',
    ]) {
      const site = await load({ KOXORA_SITE_CONTACT_SCRIPT: script });
      expect(site.contactHandler.script, script).toBeNull();
    }
    const good = await load({
      KOXORA_SITE_CONTACT_SCRIPT: '/opt/koxora-contact/public/contact.php',
      KOXORA_SITE_CONTACT_FPM: 'unix:/run/php/php8.4-fpm.sock|fcgi://localhost',
    });
    expect(good.contactHandler.script).toBe(
      '/opt/koxora-contact/public/contact.php',
    );
    expect(good.contactHandler.fpm).toBe(
      'unix:/run/php/php8.4-fpm.sock|fcgi://localhost',
    );
  });
});
