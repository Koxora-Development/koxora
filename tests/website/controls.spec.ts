import { expect, test } from '@playwright/test';
import { openLanguageMenu, openNavigation, pages } from './helpers';
import { catalog } from '../../apps/website/src/content/catalog';
// The appearance switch and the language switch are one shared pattern with
// the studio. These cases cover the behaviour the shared specification
// promises; docs/design/shared-header-controls.md is that specification.
test.describe('header controls', () => {
  test('both controls are the same round button of the same size', async ({
    page,
  }) => {
    await page.goto('/en/');
    await openNavigation(page);
    const boxes = [];
    for (const selector of ['[data-language-toggle]', '[data-theme-toggle]']) {
      const control = page.locator(selector);
      await expect(control).toBeVisible();
      boxes.push((await control.boundingBox())!);
      await expect(control).toHaveClass(/control-button/);
    }
    expect(boxes[0]!.width).toBe(boxes[1]!.width);
    expect(boxes[0]!.height).toBe(boxes[1]!.height);
    expect(Math.round(boxes[0]!.width)).toBe(36);
  });
  test('the language button names itself and its menu in both languages', async ({
    page,
  }) => {
    for (const locale of ['en', 'de'] as const) {
      await page.goto(locale === 'en' ? '/en/' : '/de/');
      await openNavigation(page);
      const toggle = page.locator('[data-language-toggle]');
      const label = catalog.translate(locale, 'nav.languageMenu');
      await expect(toggle, locale).toHaveAttribute('aria-label', label);
      await expect(toggle, locale).toHaveAttribute('title', label);
      await expect(toggle, locale).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#language-menu-title'), locale).toHaveText(
        label,
      );
    }
  });
  test('a press opens the menu and a second press closes it', async ({
    page,
  }) => {
    await page.goto('/en/');
    await openNavigation(page);
    const toggle = page.locator('[data-language-toggle]');
    const menu = page.locator('[data-language-menu]');
    await expect(menu).toBeHidden();
    await toggle.click();
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(menu).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
  test('the keyboard opens the menu, walks it and closes it again', async ({
    page,
  }) => {
    await page.goto('/en/');
    await openNavigation(page);
    const toggle = page.locator('[data-language-toggle]');
    const menu = page.locator('[data-language-menu]');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();
    // Arrow keys open the menu and move straight into it.
    await page.keyboard.press('ArrowDown');
    await expect(menu).toBeVisible();
    await expect(page.locator('[data-language-menu] a').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-language-menu] a').last()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-language-menu] a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();
  });
  test('a press outside closes the menu without moving the focus', async ({
    page,
  }) => {
    await page.goto('/en/');
    await openLanguageMenu(page);
    await expect(page.locator('[data-language-menu]')).toBeVisible();
    await page.locator('main h1').click();
    await expect(page.locator('[data-language-menu]')).toBeHidden();
    await expect(page.locator('[data-language-toggle]')).not.toBeFocused();
  });
  test('the menu marks the current language for more than a colour', async ({
    page,
  }) => {
    for (const locale of ['en', 'de'] as const) {
      await page.goto(locale === 'en' ? '/en/' : '/de/');
      await openLanguageMenu(page);
      const current = page.locator(
        `[data-language-menu] a[aria-current="true"]`,
      );
      await expect(current, locale).toHaveCount(1);
      await expect(current, locale).toHaveAttribute('hreflang', locale);
      // A check mark next to the entry, plus a name a screen reader reads.
      await expect(current.locator('.control-selected'), locale).toHaveCount(1);
      await expect(current).toContainText(
        catalog.translate(locale, 'nav.languageCurrent'),
      );
    }
  });
  test('every entry shows its own language in that language', async ({
    page,
  }) => {
    for (const locale of ['en', 'de'] as const) {
      await page.goto(locale === 'en' ? '/en/' : '/de/');
      await openLanguageMenu(page);
      for (const [code, name] of [
        ['en', 'English'],
        ['de', 'Deutsch'],
      ]) {
        const entry = page.locator(
          `[data-language-menu] a[hreflang="${code}"]`,
        );
        await expect(entry, `${locale} ${code}`).toHaveAttribute('lang', code);
        await expect(
          entry.locator('.language-name'),
          `${locale} ${code}`,
        ).toHaveText(name);
        // The flag is decoration; the name carries the meaning.
        await expect(
          entry.locator('.language-pictogram'),
          `${locale} ${code}`,
        ).toHaveAttribute('aria-hidden', 'true');
      }
    }
  });
  test('the menu keeps the reader on the same page', async ({ page }) => {
    for (const entry of pages.slice(0, 4)) {
      await page.goto(entry.en);
      await openLanguageMenu(page);
      await page.locator('[data-language-menu] a[hreflang="de"]').click();
      await expect(page, entry.id).toHaveURL(new RegExp(`${entry.de}$`));
    }
  });
  test('the menu stays inside the viewport on every layout', async ({
    page,
  }) => {
    await page.goto('/en/');
    await openLanguageMenu(page);
    const box = (await page.locator('[data-language-menu]').boundingBox())!;
    const width = page.viewportSize()!.width;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  });
  test('without scripting the languages are plain visible links', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    await page.goto('/en/');
    // No control that needs scripting is offered, and the links are reachable.
    await expect(page.locator('[data-language-toggle]')).toBeHidden();
    await expect(page.locator('[data-theme-toggle]')).toBeHidden();
    const german = page.locator('.site-header .language a[hreflang="de"]');
    await expect(german).toBeVisible();
    await german.click();
    await expect(page).toHaveURL(/\/de\/$/);
    await context.close();
  });
  test('the appearance control offers the appearance it switches to', async ({
    page,
  }) => {
    await page.goto('/en/');
    await openNavigation(page);
    const toggle = page.locator('[data-theme-toggle]');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle.locator('.theme-icon-sun')).toBeVisible();
    await expect(toggle.locator('.theme-icon-moon')).toBeHidden();
    await expect(toggle).toHaveAttribute(
      'aria-label',
      catalog.translate('en', 'nav.themeToLight'),
    );
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle.locator('.theme-icon-moon')).toBeVisible();
    await expect(toggle.locator('.theme-icon-sun')).toBeHidden();
    await expect(toggle).toHaveAttribute(
      'aria-label',
      catalog.translate('en', 'nav.themeToDark'),
    );
  });
});
