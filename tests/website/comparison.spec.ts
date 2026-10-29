import { expect, test } from '@playwright/test';
import { status } from './helpers';
const comparisonPaths = [
  ['/en/compare/', 'en'],
  ['/de/vergleich/', 'de'],
] as const;
const productPaths = [
  '/en/compare/drawio/',
  '/en/compare/miro/',
  '/en/compare/lucidchart/',
  '/de/vergleich/drawio/',
  '/de/vergleich/miro/',
  '/de/vergleich/lucidchart/',
];
test.describe('the sourced comparison', () => {
  test('answers ten questions for six products in both languages', async ({
    page,
  }) => {
    for (const [path, locale] of comparisonPaths) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      const table = page.locator('#table table.data-table');
      await expect(table.locator('tbody tr')).toHaveCount(10);
      await expect(table.locator('thead [data-product]')).toHaveCount(6);
      // Every cell says what it found, as words rather than a symbol.
      await expect(table.locator('tbody td .claim')).toHaveCount(60);
    }
  });
  test('states the review date and the date each source was read', async ({
    page,
  }) => {
    await page.goto('/en/compare/');
    await expect(page.locator('#sources')).toContainText(
      'Comparison content updated on October 28, 2026',
    );
    const entries = page.locator('#sources .source-list li');
    expect(await entries.count()).toBeGreaterThanOrEqual(10);
    for (const index of [0, 1, 2])
      await expect(entries.nth(index)).toContainText('Read on');
    await expect(
      entries.filter({ hasText: 'Koxora Studio 2.5' }),
    ).toContainText('Read on October 28, 2026');
    for (const name of ['jgraph/drawio-desktop', 'Excalidraw+', 'Miro pricing'])
      await expect(entries.filter({ hasText: name })).toContainText(
        'Read on October 25, 2026',
      );
  });
  test('links every source as an external, untracked reference', async ({
    page,
  }) => {
    await page.goto('/en/compare/');
    const links = page.locator('#sources .source-list a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(10);
    for (let index = 0; index < count; index += 1) {
      const link = links.nth(index);
      await expect(link).toHaveAttribute('href', /^https:\/\//);
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).toHaveAttribute('rel', /nofollow/);
    }
  });
  test('says what each answer means and what the comparison is not', async ({
    page,
  }) => {
    await page.goto('/en/compare/');
    const legend = page.locator('#table .legend');
    await expect(legend.locator('dt')).toHaveCount(6);
    await expect(legend).toContainText('Not verified');
    await expect(page.locator('#method')).toContainText(
      'It does not claim that Koxora is better',
    );
  });
  test('never shows a planned Koxora capability as available', async ({
    page,
  }) => {
    await page.goto('/en/compare/');
    for (const dimension of ['collaboration', 'ai', 'integration', 'desktop']) {
      const cell = page.locator(
        `tr[data-dimension="${dimension}"] td[data-product="koxora"]`,
      );
      await expect(cell).toHaveAttribute('data-status', 'planned');
      await expect(cell.locator('.claim')).toHaveText('Planned');
    }
  });
  test('credits what the other tools do well', async ({ page }) => {
    await page.goto('/en/compare/');
    // draw.io's isolated desktop application and Lucid's offline editing are
    // the two strengths the assignment names explicitly.
    await expect(
      page.locator('tr[data-dimension="offline"] td[data-product="drawio"]'),
    ).toHaveAttribute('data-status', 'supported');
    await expect(
      page.locator(
        'tr[data-dimension="offline"] td[data-product="lucidchart"]',
      ),
    ).toContainText('Chrome, Firefox and Edge');
  });
});
test.describe('the comparison filter', () => {
  test('narrows the questions and the products, and says what is shown', async ({
    page,
  }) => {
    await page.goto('/en/compare/');
    const filter = page.locator('[data-comparison-filter]');
    await expect(filter).toBeVisible();
    const status = page.locator('[data-comparison-status]');
    await expect(status).toContainText('10 of 10 questions');
    // One topic off hides its rows and nothing else.
    await filter.locator('input[name="group"][value="together"]').uncheck();
    await expect(
      page.locator('tr[data-dimension="collaboration"]'),
    ).toBeHidden();
    await expect(page.locator('tr[data-dimension="offline"]')).toBeVisible();
    await expect(status).toContainText('7 of 10 questions');
    // One product off hides its column, header included.
    await filter.locator('input[name="product"][value="visio"]').uncheck();
    await expect(page.locator('thead th[data-product="visio"]')).toBeHidden();
    await expect(
      page.locator('tbody td[data-product="koxora"]').first(),
    ).toBeVisible();
    await expect(status).toContainText('5 of 6 products');
    // Reset brings everything back.
    await filter.locator('button[type="reset"]').click();
    await expect(
      page.locator('tr[data-dimension="collaboration"]'),
    ).toBeVisible();
    await expect(page.locator('thead th[data-product="visio"]')).toBeVisible();
    await expect(status).toContainText('10 of 10 questions');
  });
  test('cannot hide the column everything is compared against', async ({
    page,
  }) => {
    await page.goto('/en/compare/');
    await expect(
      page.locator('input[name="product"][value="koxora"]'),
    ).toBeDisabled();
  });
  test('is operable from the keyboard', async ({ page }) => {
    await page.goto('/en/compare/');
    const box = page.locator('input[name="group"][value="cost"]');
    await box.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('tr[data-dimension="licence"]')).toBeHidden();
    await page.keyboard.press('Space');
    await expect(page.locator('tr[data-dimension="licence"]')).toBeVisible();
  });
  test('stays out of the way without JavaScript, and the table stays whole', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4175/en/compare/');
    // A control that filters nothing would be worse than no control.
    await expect(page.locator('[data-comparison-filter]')).toBeHidden();
    await expect(page.locator('#table tbody tr')).toHaveCount(10);
    await expect(page.locator('#table tbody td .claim')).toHaveCount(60);
    await context.close();
  });
});
test.describe('the page per product', () => {
  test('answers, credits and guides, in both languages', async ({
    page,
    request,
  }) => {
    for (const path of productPaths) {
      expect((await status(request, path)).status, path).toBe(200);
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      // Two columns: Koxora and the product the page is about.
      const table = page.locator('#table table.data-table');
      await expect(table.locator('thead [data-product]')).toHaveCount(2);
      await expect(table.locator('thead [data-product="koxora"]')).toHaveCount(
        1,
      );
      await expect(page.locator('#strengths')).toBeVisible();
      await expect(page.locator('#choose .checklist li')).toHaveCount(2);
      await expect(
        page.locator('#sources .source-list li').first(),
      ).toBeVisible();
    }
  });
  test('links back to the full comparison in its own language', async ({
    page,
  }) => {
    for (const [path, target] of [
      ['/en/compare/drawio/', '/en/compare/'],
      ['/de/vergleich/miro/', '/de/vergleich/'],
    ] as const) {
      await page.goto(path);
      const link = page.locator(`#table a[href="${target}"]`);
      await expect(link).toHaveCount(1);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${target}$`));
    }
  });
  test('is reachable from the comparison page', async ({ page }) => {
    await page.goto('/en/compare/');
    for (const target of [
      '/en/compare/drawio/',
      '/en/compare/miro/',
      '/en/compare/lucidchart/',
    ])
      await expect(page.locator(`#tools a[href="${target}"]`)).toHaveCount(1);
  });
  test('keeps the historic address of the draw.io page working', async ({
    request,
  }) => {
    const result = await status(request, '/en/compare/diagrams-net/');
    expect(result.status).toBe(301);
    expect(result.location).toBe('/en/compare/drawio/');
  });
});
