import { expect, test } from '@playwright/test';
import { allPaths, openNavigation, pages, status } from './helpers';
test.describe('navigation and routing', () => {
  test('every public page answers and carries the shared shell', async ({
    page,
    request,
  }) => {
    for (const path of allPaths) {
      expect((await status(request, path)).status, path).toBe(200);
      await page.goto(path);
      await expect(page.locator('header.site-header')).toBeVisible();
      await expect(page.locator('main#main')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
    }
  });
  test('the main navigation reaches every product page and marks the current one', async ({
    page,
  }) => {
    await page.goto('/en/');
    const links = page.locator('.primary-nav a');
    await expect(links).toHaveCount(5);
    for (const index of [0, 1, 2, 3, 4]) {
      await page.goto('/en/');
      await openNavigation(page);
      const link = page.locator('.primary-nav a').nth(index);
      const target = await link.getAttribute('href');
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${target}$`));
      await expect(
        page.locator(`.primary-nav a[href="${target}"]`),
      ).toHaveAttribute('aria-current', 'page');
    }
  });
  test('the legal pages stay reachable from the footer of every page', async ({
    page,
  }) => {
    for (const path of ['/en/', '/de/', '/en/features/', '/de/datenschutz/']) {
      await page.goto(path);
      const locale = path.startsWith('/de') ? 'de' : 'en';
      const legal = locale === 'de' ? '/de/impressum/' : '/en/legal-notice/';
      const privacy =
        locale === 'de' ? '/de/datenschutz/' : '/en/privacy-policy/';
      const settings =
        locale === 'de'
          ? '/de/datenschutz-einstellungen/'
          : '/en/privacy-settings/';
      for (const target of [legal, privacy, settings])
        await expect(
          page.locator(`.footer-nav a[href="${target}"]`),
          `${path} -> ${target}`,
        ).toHaveCount(1);
    }
  });
  test('aliases and unprefixed paths redirect permanently', async ({
    request,
  }) => {
    const cases = [
      ['/features/', '/en/features/'],
      ['/funktionen/', '/de/funktionen/'],
      ['/de/legal-notice/', '/de/impressum/'],
      ['/de/privacy-policy/', '/de/datenschutz/'],
      ['/impressum/', '/de/impressum/'],
    ] as const;
    for (const [from, to] of cases) {
      const result = await status(request, from);
      expect(result.status, from).toBe(301);
      expect(result.location, from).toBe(to);
    }
  });
  test('a missing trailing slash redirects to the canonical address', async ({
    request,
  }) => {
    const result = await status(request, '/en/features');
    expect(result.status).toBe(301);
    expect(result.location).toBe('/en/features/');
  });
  test('the root address offers both languages without being indexed', async ({
    page,
    request,
  }) => {
    expect((await status(request, '/')).status).toBe(200);
    const body = await (await request.get('/')).text();
    expect(body).toContain('noindex');
    expect(body).toContain('/en/');
    expect(body).toContain('/de/');
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/$/);
  });
  test('an unknown address answers 404 with the localized page', async ({
    page,
    request,
  }) => {
    expect((await status(request, '/en/nothing-here/')).status).toBe(404);
    expect((await status(request, '/de/gibt-es-nicht/')).status).toBe(404);
    await page.goto('/de/gibt-es-nicht/');
    await expect(page.locator('h1')).toHaveText('Diese Seite gibt es nicht');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await page.locator('main a[href="/de/"]').first().click();
    await expect(page).toHaveURL(/\/de\/$/);
  });
  test('internal links on the home page all resolve', async ({
    page,
    request,
  }) => {
    for (const locale of ['en', 'de'] as const) {
      await page.goto(`/${locale}/`);
      const hrefs = await page
        .locator('a[href^="/"]')
        .evaluateAll((links) =>
          [...new Set(links.map((link) => link.getAttribute('href')!))].filter(
            (href) => !href.startsWith('//'),
          ),
        );
      expect(hrefs.length).toBeGreaterThan(10);
      for (const href of hrefs) {
        const result = await status(request, href);
        expect([200, 301], `${locale} ${href}`).toContain(result.status);
      }
    }
  });
  test('the skip link moves focus to the main content', async ({ page }) => {
    await page.goto('/en/');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
  test('the studio entry points at a real destination', async ({ page }) => {
    await page.goto('/en/');
    await openNavigation(page);
    const cta = page.locator('.header-cta');
    const href = await cta.getAttribute('href');
    expect(href).toBeTruthy();
    // Until the hosted studio is published, the entry explains how to run it.
    if (href!.startsWith('/')) expect(href).toBe('/en/download/');
    else expect(href).toMatch(/^https:\/\//);
  });
  test('each page links to its own language variant from the header', async ({
    page,
  }) => {
    for (const entry of pages) {
      await page.goto(entry.en);
      await expect(
        page.locator(`.site-header .language a[href="${entry.de}"]`),
      ).toHaveCount(1);
      await page.goto(entry.de);
      await expect(
        page.locator(`.site-header .language a[href="${entry.en}"]`),
      ).toHaveCount(1);
    }
  });
});
