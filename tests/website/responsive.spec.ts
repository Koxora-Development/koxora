import { expect, test } from '@playwright/test';
import { allPaths, expectNoHorizontalOverflow } from './helpers';
test.describe('responsive layout', () => {
  test('no page scrolls sideways at any supported width', async ({ page }) => {
    for (const path of allPaths) {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    }
  });
  test('the phone layout collapses the navigation behind a labelled button', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'Narrow layouts only.');
    await page.goto('/en/');
    const toggle = page.locator('[data-menu-toggle]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.primary-nav a').first()).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.primary-nav a').first()).toBeVisible();
    await page.locator('.primary-nav a').first().click();
    await expect(page).toHaveURL(/features/);
    await expect(page.locator('[data-menu-toggle]')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
  test('the desktop layout shows the navigation without a menu button', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Wide layouts only.');
    await page.goto('/en/');
    await expect(page.locator('.primary-nav a').first()).toBeVisible();
    await expect(page.locator('[data-menu-toggle]')).toBeHidden();
  });
  test('screenshots and tables stay inside the viewport', async ({ page }) => {
    await page.goto('/en/');
    const width = page.viewportSize()!.width;
    for (const image of await page.locator('main img').all()) {
      const box = await image.boundingBox();
      if (box) expect(Math.round(box.width)).toBeLessThanOrEqual(width);
    }
    await page.goto('/de/datenschutz/');
    const table = await page.locator('.data-table').first().boundingBox();
    expect(Math.round(table!.width)).toBeLessThanOrEqual(width);
  });
  test('touch targets on the phone are large enough', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Phone layout only.');
    await page.goto('/en/');
    await page.locator('[data-menu-toggle]').click();
    for (const link of await page.locator('.primary-nav a').all()) {
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(32);
    }
    const cta = await page.locator('.header-cta').boundingBox();
    expect(cta!.height).toBeGreaterThanOrEqual(32);
  });
  test('the home page keeps its sections in order on every width', async ({
    page,
  }) => {
    await page.goto('/en/');
    const ids = await page
      .locator('main section[id]')
      .evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(ids).toEqual([
      'preview',
      'features',
      'local-first',
      'future',
      'compare',
      'roadmap',
      'structure',
      'follow',
    ]);
  });
});
