import { expect, test, type Page } from '@playwright/test';
import { allPaths } from './helpers';
function channel(value: number) {
  const ratio = value / 255;
  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}
function luminance([red, green, blue]: number[]) {
  return (
    0.2126 * channel(red!) + 0.7152 * channel(green!) + 0.0722 * channel(blue!)
  );
}
function contrast(foreground: number[], background: number[]) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (light! + 0.05) / (dark! + 0.05);
}
async function colors(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const parse = (value: string) =>
        value
          .match(/\d+(\.\d+)?/g)!
          .slice(0, 3)
          .map(Number);
      let node: HTMLElement | null = element as HTMLElement;
      let background = 'rgba(0, 0, 0, 0)';
      while (node) {
        const value = getComputedStyle(node).backgroundColor;
        const parts = value.match(/[\d.]+/g) ?? [];
        const alpha = value.startsWith('rgba') ? Number(parts[3] ?? '1') : 1;
        // Only a fully opaque layer can be measured without compositing.
        if (parts.length >= 3 && alpha === 1) {
          background = value;
          break;
        }
        node = node.parentElement;
      }
      return {
        color: parse(getComputedStyle(element).color),
        background: parse(background),
      };
    });
}
test.describe('accessibility', () => {
  test('every page exposes exactly one of each landmark', async ({ page }) => {
    for (const path of allPaths) {
      await page.goto(path);
      await expect(page.getByRole('banner'), path).toHaveCount(1);
      await expect(page.getByRole('main'), path).toHaveCount(1);
      await expect(page.getByRole('contentinfo'), path).toHaveCount(1);
      await expect(page.locator('nav[aria-label]'), path).not.toHaveCount(0);
    }
  });
  test('navigation regions are named', async ({ page }) => {
    await page.goto('/de/');
    for (const name of [
      'Hauptnavigation',
      'Sprache',
      'Sprache, im Fußbereich',
      'Fußbereichsnavigation',
    ])
      await expect(page.locator(`nav[aria-label="${name}"]`)).toHaveCount(1);
    const names = await page
      .locator('nav[aria-label]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('aria-label')!),
      );
    expect(
      new Set(names).size,
      'every navigation region has its own name',
    ).toBe(names.length);
  });
  test('all images and decorative graphics are handled correctly', async ({
    page,
  }) => {
    for (const path of ['/en/', '/de/', '/en/features/']) {
      await page.goto(path);
      for (const image of await page.locator('img').all())
        expect((await image.getAttribute('alt'))?.length, path).toBeGreaterThan(
          10,
        );
      for (const svg of await page.locator('svg').all())
        expect(await svg.getAttribute('aria-hidden'), path).toBe('true');
    }
  });
  test('interactive controls have an accessible name', async ({ page }) => {
    await page.goto('/en/privacy-settings/');
    for (const control of await page.locator('button, a[href], input').all()) {
      const name = await control.evaluate((element) => {
        const label =
          element.getAttribute('aria-label') ??
          element.textContent?.trim() ??
          '';
        if (label) return label;
        const id = element.getAttribute('id');
        return id
          ? (document.querySelector(`label[for="${id}"]`)?.textContent ?? '')
          : '';
      });
      expect(name.length).toBeGreaterThan(0);
    }
  });
  test('body text meets the AA contrast ratio in both appearances', async ({
    page,
  }) => {
    for (const theme of ['dark', 'light'] as const) {
      await page.goto('/en/features/');
      await page.evaluate((value) => {
        localStorage.setItem('koxora.website.theme', value);
      }, theme);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      for (const selector of [
        '.card p:not(.card-icon)',
        '.lead',
        '.section-desc',
        'h1',
      ]) {
        const sample = await colors(page, selector);
        expect(
          contrast(sample.color, sample.background),
          `${theme} ${selector}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  test('the keyboard reaches the navigation and the studio entry', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'The menu is collapsed on narrow layouts.',
    );
    await page.goto('/en/');
    const order: string[] = [];
    for (let step = 0; step < 10; step += 1) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(
          () => document.activeElement?.textContent?.trim().slice(0, 24) ?? '',
        ),
      );
    }
    expect(order[0]).toContain('Skip');
    expect(order.join(' | ')).toContain('Features');
  });
  test('keyboard focus is visible on the first controls of the page', async ({
    page,
  }) => {
    await page.goto('/en/');
    for (let step = 0; step < 3; step += 1) {
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement;
        const style = getComputedStyle(element);
        return {
          name: `${element.tagName}.${element.className}`,
          width: Number.parseFloat(style.outlineWidth),
          style: style.outlineStyle,
        };
      });
      expect(outline.style, outline.name).not.toBe('none');
      expect(outline.width, outline.name).toBeGreaterThan(0);
    }
  });
  test('the page works without client-side scripting', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4175/de/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.primary-nav a')).toHaveCount(5);
    await page.goto('http://127.0.0.1:4175/de/datenschutz-einstellungen/');
    await expect(page.locator('.data-table tbody tr')).toHaveCount(1);
    await expect(page.locator('.consent-noscript')).toBeVisible();
    await context.close();
  });
  test('reduced motion is respected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en/');
    const duration = await page
      .locator('.action-primary')
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(Number.parseFloat(duration)).toBeLessThan(0.01);
  });
});
