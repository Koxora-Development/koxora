import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createProject, exportProject } from '../../packages/project/src/index';
import { shapeKinds } from '../../packages/editor-core/src/index';
import { libraryElementKinds } from '../../packages/studio/src/library-preferences';

async function open(
  page: Page,
  locale: string,
  theme: string,
  guiScale: number,
) {
  await page.addInitScript(
    (preferences) =>
      localStorage.setItem(
        'koxora.preferences.v1',
        JSON.stringify(preferences),
      ),
    { locale, theme, guiScale, accessibility: guiScale === 200 },
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  const messages: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  const project = createProject(
    'Compact ribbon acceptance',
    () => crypto.randomUUID(),
    '2026-11-21T10:00:00.000Z',
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: messages['project.import'], exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel(messages['project.import'], { exact: true })
    .setInputFiles({
      name: 'compact-ribbon.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
  await settle(page);
  await expect(page.locator('.compact-tool-ribbon')).toHaveAttribute(
    'data-palette-measured',
    'true',
  );
  return messages;
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
}

async function reachable(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  expect(
    await locator.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        ),
      );
    }),
  ).toBe(true);
}

for (const locale of ['en', 'de'])
  for (const theme of ['light', 'dark'])
    test(`compact connection tools preserve armed tools, searches and keyboard access at 390px/200% ${locale}/${theme}`, async ({
      page,
    }) => {
      const messages = await open(page, locale, theme, 200);
      await page.setViewportSize({ width: 390, height: 700 });
      await settle(page);
      const ribbon = page.locator('.compact-tool-ribbon');
      const shapes = ribbon.locator('[data-ribbon-tab="shapes"]');
      const connections = ribbon.locator('[data-ribbon-tab="connections"]');
      const search = ribbon.getByRole('searchbox');
      await search.fill('rectangle');
      await ribbon.locator('[data-library-kind="rectangle"]').click();
      await connections.click();
      await expect(ribbon.locator('.connection-current-tool')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await search.fill('curved-arrow');
      // Connection discovery must not apply the Shapes filter or disarm its tool.
      await expect(ribbon.locator('.connection-current-tool')).toHaveAttribute(
        'aria-label',
        messages['shape.rectangle'],
      );
      const preset = ribbon.locator('[data-connection-preset="curved-arrow"]');
      await reachable(preset);
      const preview = (await preset.locator('svg').boundingBox())!;
      expect(preview.width).toBeGreaterThanOrEqual(100);
      expect(preview.height).toBeGreaterThanOrEqual(60);
      await preset.click();
      await expect(preset).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.tool-context')).toHaveCount(0);
      const options = ribbon.locator('.tool-options-trigger');
      await expect(page.locator('.tool-options-panel')).toHaveCount(0);
      await reachable(options);
      await options.focus();
      await options.press('ArrowDown');
      const panel = page.locator('.tool-options-panel');
      await expect(panel).toBeVisible();
      await expect(
        panel.locator('input, select, button, summary').first(),
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await expect(options).toBeFocused();

      // Filtering out the current connection retains a visible selected preview.
      await search.fill('dotted');
      await expect(
        ribbon.locator('.connection-current-preset'),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        ribbon.locator('.connection-palette [tabindex="0"]'),
      ).toHaveCount(1);
      await shapes.click();
      await expect(search).toHaveValue('rectangle');
      await expect(ribbon.locator('.ribbon-active-label')).toContainText(
        messages['shape.arrow'],
      );
      await expect(ribbon.locator('.ribbon-connection-actions')).toBeHidden();
      await expect(
        ribbon.locator(
          '.shape-palette [data-library-kind="line"], .shape-palette [data-library-kind="arrow"], .shape-palette [data-library-kind="junction"]',
        ),
      ).toHaveCount(0);
      const select = ribbon.locator('.shape-palette [tabindex="0"]');
      await expect(select).toHaveAttribute(
        'aria-label',
        messages['diagram.select'],
      );
      await select.focus();
      await select.press('ArrowRight');
      await expect(
        ribbon.locator('.shape-palette').getByRole('button', {
          name: messages['diagram.pan'],
          exact: true,
        }),
      ).toBeFocused();

      const filterToggle = ribbon.locator('.ribbon-filter-toggle');
      await reachable(filterToggle);
      await filterToggle.click();
      const categories = ribbon.getByRole('button', {
        name: messages['palette.chooseCategories'],
        exact: true,
      });
      await reachable(categories);
      await categories.click();
      const dialog = page.getByRole('dialog', {
        name: messages['palette.categoriesTitle'],
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await connections.focus();
      await connections.press('Home');
      await expect(shapes).toBeFocused();
      await shapes.press('End');
      await expect(connections).toBeFocused();
      await expect(search).toHaveValue('dotted');
      await expect(ribbon.locator('.connection-current-preset')).toBeVisible();
      expect(
        await ribbon.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
    });

for (const [locale, theme] of [
  ['en', 'light'],
  ['de', 'dark'],
])
  test(`shape capacity follows full available width and covers every stable page ${locale}/${theme}`, async ({
    page,
  }) => {
    const messages = await open(page, locale, theme, 100);
    const ribbon = page.locator('.compact-tool-ribbon');
    const size = async () =>
      Number(await ribbon.getAttribute('data-palette-page-size'));
    const initialSize = await size();
    await page.setViewportSize({ width: 2560, height: 1200 });
    await expect.poll(size).toBeGreaterThan(initialSize);
    expect(await size()).toBeGreaterThan(23);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await expect.poll(size).toBeLessThan(initialSize);
    await settle(page);

    const status = ribbon.locator('.palette-page-status');
    const next = ribbon.getByRole('button', {
      name: messages['palette.nextPage'],
      exact: true,
    });
    const previous = ribbon.getByRole('button', {
      name: messages['palette.previousPage'],
      exact: true,
    });
    const allowed = new Set(Object.values(libraryElementKinds).flat());
    const expected = [...shapeKinds, 'freehand'].filter(
      (kind) =>
        allowed.has(kind) && !['line', 'arrow', 'junction'].includes(kind),
    );
    const seen = new Set<string>();
    let lastEnd = 0;
    let armed: string | null = null;
    for (let pageIndex = 0; pageIndex < expected.length; pageIndex++) {
      const range = (await status.textContent())!.match(/\d+/g)!.map(Number);
      expect(range[0]).toBe(lastEnd + 1);
      expect(range[2]).toBe(expected.length);
      const kinds = await ribbon
        .locator('.shape-palette [data-library-kind]')
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute('data-library-kind')!),
        );
      expect(new Set(kinds).size).toBe(kinds.length);
      for (const kind of expected.slice(range[0] - 1, range[1]))
        expect(kinds).toContain(kind);
      for (const kind of kinds) seen.add(kind);
      if (pageIndex === 1) {
        armed = expected[range[0] - 1];
        const before = await status.textContent();
        await ribbon.locator(`[data-library-kind="${armed}"]`).click();
        await expect(status).toHaveText(before!);
      }
      if (armed)
        await expect(
          ribbon.locator(`[data-library-kind="${armed}"]`),
        ).toHaveAttribute('aria-pressed', 'true');
      lastEnd = range[1];
      if (await next.isDisabled()) break;
      await next.click();
    }
    expect(lastEnd).toBe(expected.length);
    expect([...seen].sort()).toEqual([...expected].sort());
    const lastRange = await status.textContent();
    for (let resize = 0; resize < 3; resize++) {
      await page.setViewportSize({ width: 2560, height: 1200 });
      await settle(page);
      await page.setViewportSize({ width: 1280, height: 1000 });
      await settle(page);
      await expect(status).toHaveText(lastRange!);
    }
    while (await previous.isEnabled()) await previous.click();
    await expect(status).toHaveText(new RegExp(`^1[–-]`));
    expect(
      await ribbon
        .locator('.shape-palette')
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    await ribbon.locator('[data-ribbon-tab="connections"]').click();
    await ribbon.locator('[data-connection-preset="straight-arrow"]').click();
    const connectionNext = ribbon.getByRole('button', {
      name: messages['ribbon.nextConnections'],
      exact: true,
    });
    while (await connectionNext.isEnabled()) await connectionNext.click();
    const connectionStatus = ribbon.locator('.connection-page-status');
    const lastConnections = await connectionStatus.textContent();
    for (let resize = 0; resize < 3; resize++) {
      await page.setViewportSize({ width: 2560, height: 1200 });
      await settle(page);
      await page.setViewportSize({ width: 1280, height: 1000 });
      await settle(page);
      await expect(connectionStatus).toHaveText(lastConnections!);
    }
    await expect(ribbon.locator('.connection-current-preset')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
