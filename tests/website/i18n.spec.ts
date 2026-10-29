import { expect, test } from '@playwright/test';
import { allPaths, openLanguageMenu, pages } from './helpers';
import { catalog } from '../../apps/website/src/content/catalog';
import { pageRegistry } from '../../apps/website/src/pages/registry';
test.describe('languages', () => {
  test('every page declares its own language', async ({ page }) => {
    for (const path of allPaths) {
      await page.goto(path);
      const expected = path.startsWith('/de') ? 'de' : 'en';
      await expect(page.locator('html')).toHaveAttribute('lang', expected);
    }
  });
  test('each page shows the translated title of its own language', async ({
    page,
  }) => {
    for (const entry of pages) {
      const definition = pageRegistry[entry.id];
      for (const locale of ['en', 'de'] as const) {
        await page.goto(entry[locale]);
        const expected = catalog.translate(locale, definition.titleKey);
        await expect(page, `${entry.id} ${locale}`).toHaveTitle(
          new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        );
      }
    }
  });
  // Each route is an independent case so adding documentation pages does not
  // make every language switch share one test timeout.
  for (const entry of pages)
    test(`switching the language keeps the reader on ${entry.id}`, async ({
      page,
    }) => {
      await page.goto(entry.en);
      await openLanguageMenu(page);
      await page.locator('.site-header .language a[hreflang="de"]').click();
      await expect(page, entry.id).toHaveURL(new RegExp(`${entry.de}$`));
      await openLanguageMenu(page);
      await page.locator('.site-header .language a[hreflang="en"]').click();
      await expect(page, entry.id).toHaveURL(new RegExp(`${entry.en}$`));
    });
  test('the German pages are fully German', async ({ page }) => {
    for (const entry of pages) {
      await page.goto(entry.de);
      const text = await page.locator('main').innerText();
      const english = catalog.translate(
        'en',
        pageRegistry[entry.id].descriptionKey,
      );
      expect(text, entry.id).not.toContain(english);
      expect(text.length, entry.id).toBeGreaterThan(200);
    }
    await page.goto('/de/');
    await expect(page.locator('.primary-nav a').first()).toHaveText(
      'Funktionen',
    );
    await expect(
      page.locator('.site-header .language a[hreflang="en"]'),
    ).toHaveCount(1);
    await expect(page.locator('footer')).toContainText('Rechtliches');
  });
  test('the language links are bidirectional and declare their language', async ({
    page,
  }) => {
    for (const entry of pages)
      for (const locale of ['en', 'de'] as const) {
        await page.goto(entry[locale]);
        const links = page.locator('.site-header .language a');
        await expect(links).toHaveCount(2);
        await expect(links.nth(0)).toHaveAttribute('hreflang', 'en');
        await expect(links.nth(1)).toHaveAttribute('hreflang', 'de');
        await expect(
          page.locator(`.site-header .language a[aria-current="true"]`),
        ).toHaveAttribute('hreflang', locale);
      }
  });
  test('no page mixes a German layout with English navigation', async ({
    page,
  }) => {
    await page.goto('/de/datenschutz/');
    await expect(page.locator('.site-header .header-cta')).not.toHaveText(
      catalog.translate('en', 'cta.studioPending'),
    );
    await expect(page.locator('footer')).not.toContainText('Privacy settings');
  });
});
