import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { allPaths } from './helpers';
const buildInfo = JSON.parse(
  readFileSync('apps/website/dist-deploy/build-info.json', 'utf8'),
) as { inlineScriptHash: string; contentSecurityPolicy: string };
test.describe('hosting contract', () => {
  test('every response carries the security headers of the deployment', async ({
    request,
  }) => {
    const response = await request.get('/en/');
    const headers = response.headers();
    expect(headers['content-security-policy']).toBe(
      buildInfo.contentSecurityPolicy,
    );
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  });
  test('the policy pins the inline script that is actually served', async ({
    request,
  }) => {
    const html = await (await request.get('/en/')).text();
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
      (match) => match[1]!,
    );
    expect(inline.length, 'exactly one inline script ships').toBe(1);
    const hash = `sha256-${createHash('sha256').update(inline[0]!).digest('base64')}`;
    expect(hash).toBe(buildInfo.inlineScriptHash);
    expect(buildInfo.contentSecurityPolicy).toContain(`'${hash}'`);
  });
  test('no page violates the policy it is served with', async ({ page }) => {
    await page.addInitScript(() => {
      const violations: string[] = [];
      Object.defineProperty(window, '__cspViolations', { value: violations });
      document.addEventListener('securitypolicyviolation', (event) =>
        violations.push(`${event.violatedDirective}: ${event.blockedURI}`),
      );
    });
    for (const path of [...allPaths, '/en/404.html']) {
      const errors: string[] = [];
      page.once('pageerror', (error) => errors.push(error.message));
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { __cspViolations: string[] })
              .__cspViolations,
        ),
        path,
      ).toEqual([]);
      expect(errors, path).toEqual([]);
      // The hashed inline script is what applies a stored appearance before
      // the first paint; a blocked policy would show up here.
      expect(await page.locator('html').getAttribute('data-js'), path).toBe(
        'on',
      );
    }
  });
  test('build artefacts and hidden files are not served', async ({
    request,
  }) => {
    for (const path of [
      '/.vite/manifest.json',
      '/%2Evite/manifest.json',
      '/_headers',
      '/_redirects',
      '/en/.secret',
    ])
      expect(
        (await request.get(path, { maxRedirects: 0 })).status(),
        path,
      ).toBe(404);
  });
  test('cache rules match the asset class', async ({ page, request }) => {
    await page.goto('/en/');
    const asset = await page
      .locator('link[rel="stylesheet"]')
      .first()
      .getAttribute('href');
    expect((await request.get(asset!)).headers()['cache-control']).toContain(
      'immutable',
    );
    expect(
      (await request.get('/images/icon.svg')).headers()['cache-control'],
    ).toContain('must-revalidate');
    expect((await request.get('/en/')).headers()['cache-control']).toContain(
      'max-age=0',
    );
  });
});
