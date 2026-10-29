import { expect, test } from '@playwright/test';
import { allPaths, openNavigation, pages, status } from './helpers';
import { catalog } from '../../apps/website/src/content/catalog';
import { site } from '../../apps/website/src/site';
const repositoryUrl = site.repositoryUrl;
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
    // Features, local-first, comparison, contact, roadmap, download. Contact
    // is one of them because the Product Owner could not find the page while
    // it was a footer entry among the other resources.
    await expect(links).toHaveCount(6);
    for (const index of [0, 1, 2, 3, 4, 5]) {
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
  test('the root address sends the reader to a language', async ({
    page,
    request,
  }) => {
    const redirect = await status(request, '/');
    expect(redirect.status).toBe(302);
    expect(redirect.location).toMatch(/^\/(en|de)\/$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|de)\/$/);
    // The gateway document stays available for a host without rewrite rules.
    const gateway = await (await request.get('/index.html')).text();
    expect(gateway).toContain('noindex');
    expect(gateway).toContain('/en/');
    expect(gateway).toContain('/de/');
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
  test('the security contact is published and reachable', async ({
    page,
    request,
  }) => {
    for (const locale of ['en', 'de'] as const) {
      await page.goto(`/${locale}/`);
      // The footer sends a reporter to the policy rather than to the mailbox,
      // because the policy says what is safe to put in a first message while
      // delivery and access to that mailbox are untested.
      await expect(page.locator('footer a[href$="SECURITY.md"]')).toHaveCount(
        1,
      );
    }
    await page.goto('/de/impressum/');
    await expect(page.locator('main')).toContainText('security@koxora.app');
    const security = await request.get('/.well-known/security.txt');
    expect(security.status()).toBe(200);
    const body = await security.text();
    expect(body).toContain('Contact: mailto:security@koxora.app');
    expect(body).toMatch(/Expires: \d{4}-\d{2}-\d{2}T/);
    // No promise that cannot be kept yet.
    expect(body).not.toMatch(/Encryption|Acknowledgements|Hiring/);
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
test.describe('footer', () => {
  test('groups its links by what a reader came to do', async ({ page }) => {
    for (const locale of ['en', 'de'] as const) {
      await page.goto(locale === 'en' ? '/en/' : '/de/');
      const columns = page.locator('.site-footer .footer-column');
      await expect(columns, locale).toHaveCount(4);
      // The repository belongs with the other resources, not with the
      // addresses, and appears exactly once in the footer.
      const repository = page.locator(
        `.site-footer a[href="${repositoryUrl}"]`,
      );
      await expect(repository, locale).toHaveCount(1);
      await expect(
        columns.nth(1).locator(`a[href="${repositoryUrl}"]`),
        locale,
      ).toHaveCount(1);
    }
  });
  test('tells a support question and a security report apart', async ({
    page,
  }) => {
    for (const locale of ['en', 'de'] as const) {
      await page.goto(locale === 'en' ? '/en/' : '/de/');
      const contact = page.locator('.footer-column-contact');
      const terms = contact.locator('dt');
      await expect(terms, locale).toHaveCount(2);
      await expect(terms.nth(0), locale).toHaveText(
        catalog.translate(locale, 'footer.supportTask'),
      );
      await expect(terms.nth(1), locale).toHaveText(
        catalog.translate(locale, 'footer.securityTask'),
      );
      // A question has two ways: the contact page and the address. The page
      // comes first, because this is the column a reader opens when they are
      // looking for a way to write, and it is where it was missing.
      const question = contact.locator('.footer-contacts > div').nth(0);
      await expect(
        question.locator('a.footer-contact-page'),
        locale,
      ).toHaveAttribute(
        'href',
        locale === 'de' ? '/de/kontakt/' : '/en/contact/',
      );
      // Support is a working address; the security entry is the policy,
      // because the mailbox is not an established channel for details yet.
      await expect(contact.locator('a[href^="mailto:"]'), locale).toHaveCount(
        1,
      );
      const security = contact
        .locator('.footer-contacts > div')
        .nth(1)
        .locator('a');
      await expect(security, locale).toHaveAttribute('href', /SECURITY\.md$/);
      await expect(security, locale).toHaveText(
        catalog.translate(locale, 'footer.security'),
      );
      await expect(page.locator('.site-footer'), locale).not.toContainText(
        'security@koxora.app',
      );
    }
  });
});
