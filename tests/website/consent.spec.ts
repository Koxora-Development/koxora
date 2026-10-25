import { expect, test, type Page } from '@playwright/test';
import { consentOrigin, openNavigation } from './helpers';
const storageKey = 'koxora.website.consent';
/**
 * Adds the two shapes of gated content the manager supports: a same-origin
 * script and an embed that makes its own request. Both are inert markup until
 * the matching category is granted.
 */
async function gate(page: Page) {
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.type = 'text/plain';
    script.dataset.consentCategory = 'statistics';
    script.src = '/demo/optional.js';
    const embed = document.createElement('template');
    embed.dataset.consentEmbed = 'true';
    embed.dataset.consentCategory = 'media';
    embed.innerHTML = '<img alt="" src="/images/icon.svg?gated=1" />';
    document.body.append(script, embed);
  });
}
async function stored(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw
      ? (JSON.parse(raw) as {
          version: number;
          choices: Record<string, boolean>;
        })
      : null;
  }, storageKey);
}
test.describe('deployment without consent-requiring technology', () => {
  test('asks for no consent on the first visit', async ({ page }) => {
    await page.goto('/en/');
    await expect(page.locator('[data-consent-banner]')).toHaveCount(0);
    await expect(page.locator('[data-consent-dialog]')).toHaveCount(0);
    expect(await stored(page)).toBeNull();
  });
  test('explains the device storage it does use', async ({ page }) => {
    await page.goto('/en/');
    await page.locator('.footer-nav a[href="/en/privacy-settings/"]').click();
    await expect(page).toHaveURL(/privacy-settings/);
    const manager = page.locator('section#settings [data-consent-manager]');
    await expect(manager).toBeVisible();
    await expect(manager.locator('.note-title')).toHaveText(
      'Nothing to consent to right now',
    );
    await expect(page.locator('[data-consent-toggle]')).toHaveCount(0);
    // Only the two settings a reader sets themselves can be written in this
    // deployment, and both are listed with purpose, place and legal basis.
    const rows = page.locator('.data-table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Appearance preference');
    await expect(rows.nth(1)).toContainText('Language choice');
    await expect(rows.nth(1)).toContainText('First-party cookie');
    await expect(page.locator('.data-table')).not.toContainText('Hetzner');
    await expect(manager.locator('[data-consent-state]')).toContainText(
      'strictly necessary',
    );
  });
  test('the privacy policy names the same storage and no banner duty', async ({
    page,
  }) => {
    await page.goto('/de/datenschutz/');
    const rows = page.locator('.data-table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Darstellungseinstellung');
    await expect(rows.nth(1)).toContainText('Sprachauswahl');
    await expect(page.locator('main')).toContainText('§ 25 Abs. 2 Nr. 2');
    await expect(page.locator('main')).toContainText(
      'kein Einwilligungsbanner',
    );
  });
  test('writes nothing to the device before the reader acts', async ({
    page,
  }) => {
    await page.goto('/en/features/');
    expect(
      await page.evaluate(() => ({
        local: Object.keys(localStorage).length,
        session: Object.keys(sessionStorage).length,
        cookies: document.cookie,
      })),
    ).toEqual({ local: 0, session: 0, cookies: '' });
  });
  test('remembers only an appearance the reader chooses', async ({ page }) => {
    await page.goto('/en/');
    await openNavigation(page);
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
      'koxora.website.theme',
    ]);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
test.describe('deployment with optional consent-requiring technology', () => {
  test.use({ baseURL: consentOrigin });
  test('shows an equal-choice banner before anything optional runs', async ({
    page,
  }) => {
    await page.goto('/en/');
    const banner = page.locator('[data-consent-banner]');
    await expect(banner).toBeVisible();
    const actions = banner.locator('.consent-actions .action');
    await expect(actions).toHaveCount(3);
    await expect(actions.nth(0)).toHaveText('Accept all');
    await expect(actions.nth(1)).toHaveText('Reject optional');
    await expect(actions.nth(2)).toHaveText('Customize');
    const classes = await actions.evaluateAll((nodes) =>
      nodes.map((node) => node.className),
    );
    expect(
      new Set(classes).size,
      'all first-layer buttons share one style',
    ).toBe(1);
    const widths = await actions.evaluateAll((nodes) =>
      nodes.map((node) => Math.round(node.getBoundingClientRect().width)),
    );
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(4);
    expect(await stored(page)).toBeNull();
  });
  test('the banner is localized', async ({ page }) => {
    await page.goto('/de/');
    const actions = page.locator(
      '[data-consent-banner] .consent-actions .action',
    );
    await expect(actions.nth(0)).toHaveText('Alle akzeptieren');
    await expect(actions.nth(1)).toHaveText('Optionale ablehnen');
    await expect(actions.nth(2)).toHaveText('Einstellungen anpassen');
  });
  test('keeps gated code and gated requests inactive until consent', async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto('/en/');
    await gate(page);
    await page.locator('[data-consent-action="reject"]').first().click();
    await expect(page.locator('[data-consent-banner]')).toBeHidden();
    expect(await page.evaluate(() => '__koxoraOptionalDemo' in window)).toBe(
      false,
    );
    expect(requests.filter((url) => url.includes('gated'))).toEqual([]);
    expect(requests.filter((url) => url.includes('/demo/optional.js'))).toEqual(
      [],
    );
    expect((await stored(page))?.choices).toEqual({
      statistics: false,
      media: false,
    });
  });
  test('activates gated code and embeds only after consent', async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto('/en/');
    await gate(page);
    expect(requests.filter((url) => url.includes('gated'))).toEqual([]);
    await page.locator('[data-consent-action="accept"]').first().click();
    await expect
      .poll(() => page.evaluate(() => '__koxoraOptionalDemo' in window))
      .toBe(true);
    await expect
      .poll(() => requests.filter((url) => url.includes('gated')).length)
      .toBe(1);
    expect((await stored(page))?.choices).toEqual({
      statistics: true,
      media: true,
    });
    expect(
      await page.evaluate(() => window.koxoraConsent?.has('statistics')),
    ).toBe(true);
  });
  test('a withdrawal removes what consent inserted', async ({ page }) => {
    await page.goto('/en/');
    await gate(page);
    await page.locator('[data-consent-action="accept"]').first().click();
    await expect(page.locator('img[data-consent-inserted]')).toHaveCount(1);
    await page.goto('/en/privacy-settings/');
    await page
      .locator('section#settings [data-consent-action="withdraw"]')
      .click();
    await page.goto('/en/');
    await gate(page);
    await expect(page.locator('img[data-consent-inserted]')).toHaveCount(0);
    expect(await page.evaluate(() => '__koxoraOptionalDemo' in window)).toBe(
      false,
    );
  });
  test('a saved decision is not asked for again', async ({ page }) => {
    await page.goto('/en/');
    await page.locator('[data-consent-action="reject"]').first().click();
    await page.reload();
    await expect(page.locator('[data-consent-banner]')).toBeHidden();
    await page.goto('/en/features/');
    await expect(page.locator('[data-consent-banner]')).toBeHidden();
  });
  test('the detailed dialog starts with every optional purpose switched off', async ({
    page,
  }) => {
    await page.goto('/en/');
    await page.locator('[data-consent-action="customize"]').click();
    const dialog = page.locator('[data-consent-dialog]');
    await expect(dialog).toBeVisible();
    const toggles = dialog.locator('[data-consent-toggle]');
    await expect(toggles).toHaveCount(2);
    for (const toggle of await toggles.all())
      await expect(toggle).not.toBeChecked();
    await expect(dialog.locator('.consent-items dt').first()).toBeVisible();
    await toggles.nth(0).check();
    await dialog.locator('[data-consent-action="save"]').click();
    expect((await stored(page))?.choices).toEqual({
      statistics: true,
      media: false,
    });
    await expect(dialog).toBeHidden();
  });
  test('the dialog closes with the keyboard', async ({ page }) => {
    await page.goto('/en/');
    await page.locator('[data-consent-action="customize"]').click();
    const dialog = page.locator('[data-consent-dialog]');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
  test('a decision can be withdrawn from the footer entry', async ({
    page,
  }) => {
    await page.goto('/en/');
    await page.locator('[data-consent-action="accept"]').first().click();
    expect(await stored(page)).not.toBeNull();
    await page.goto('/en/privacy-settings/');
    const settings = page.locator('section#settings');
    await expect(settings.locator('[data-consent-state]')).toContainText(
      'saved',
    );
    await settings.locator('[data-consent-action="withdraw"]').click();
    expect(await stored(page)).toBeNull();
    await expect(settings.locator('[data-consent-state]')).toContainText(
      'deleted',
    );
    await page.goto('/en/');
    await expect(page.locator('[data-consent-banner]')).toBeVisible();
  });
  test('the settings entry in the footer opens the dialog', async ({
    page,
  }) => {
    await page.goto('/en/');
    await page.locator('[data-consent-action="reject"]').first().click();
    await page.locator('.footer-nav a[href="/en/privacy-settings/"]').click();
    await expect(page.locator('[data-consent-dialog]')).toBeVisible();
  });
  test('rejecting optional purposes keeps the site fully usable', async ({
    page,
  }) => {
    await page.goto('/en/');
    await page.locator('[data-consent-action="reject"]').first().click();
    await openNavigation(page);
    await page.locator('.primary-nav a').first().click();
    await expect(page.locator('h1')).toBeVisible();
    await openNavigation(page);
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
