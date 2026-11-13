import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';
import { applyEdit } from '../../packages/editor-core/src/index';

const messages: Record<string, Record<string, string>> = Object.fromEntries(
  ['en', 'de'].map((locale) => [
    locale,
    JSON.parse(
      readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
    ),
  ]),
);
const translate = (locale: string, key: string) => messages[locale][key];

async function library(page: Page) {
  await page.setViewportSize({ width: 1905, height: 1000 });
  await page.goto('/');
  const now = '2026-11-13T12:00:00.000Z';
  let project = createProject('Network review', () => crypto.randomUUID(), now);
  const document = project.documents[0];
  const sheet = document.pages[0];
  project = applyEdit(
    project,
    document.id,
    sheet.id,
    {
      type: 'insert',
      id: crypto.randomUUID(),
      kind: 'rectangle',
      position: { x: 20, y: 30 },
      layerId: sheet.layers[0].id,
      text: 'Portable content',
    },
    now,
  );
  for (const item of [
    project,
    createProject('Client overview', () => crypto.randomUUID(), now),
    createProject(
      'A project with a long descriptive name for the network architecture and its clients',
      () => crypto.randomUUID(),
      now,
    ),
  ]) {
    await page
      .getByRole('button', { name: 'Import .koxora', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Import .koxora' });
    await dialog.getByLabel('Import .koxora', { exact: true }).setInputFiles({
      name: 'layout.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(item)),
    });
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.save-status')).toHaveText(
      'Saved on this device',
    );
  }
  await page.getByRole('button', { name: /^Local projects/ }).click();
  await expect(page.locator('.start-project-row')).toHaveCount(3);
  return project;
}

async function settings(page: Page, locale = 'en') {
  const name = translate(locale, 'office.settings');
  await page.getByRole('button', { name, exact: true }).click();
  return page.getByRole('dialog', { name, exact: true });
}

async function unobscured(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
  expect(
    await control.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        ),
      );
    }),
  ).toBe(true);
}

async function noLibraryOverlap(page: Page) {
  await expect(async () => {
    const main = (await page.locator('.dashboard-main').boundingBox())!;
    expect(main.width).toBeGreaterThan(300);
    expect(main.height).toBeGreaterThan(100);
    const sidebar = page.locator('.project-sidebar');
    if (await sidebar.isVisible()) {
      const nav = (await sidebar.boundingBox())!;
      expect(
        main.x >= nav.x + nav.width - 1 || main.y >= nav.y + nav.height - 1,
      ).toBe(true);
    }
    for (const selector of ['.dashboard-main', '.studio-start']) {
      expect(
        await page
          .locator(selector)
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      ).toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }).toPass({ timeout: 5000 });
}

async function stableHelpWidth(page: Page) {
  const start = page.locator('.studio-start');
  const section = page.locator('.start-library');
  const summary = page.locator('.start-help > summary');
  const before = [(await start.boundingBox())!, (await section.boundingBox())!];
  await summary.click();
  await expect(page.locator('.start-help')).toHaveAttribute('open', '');
  const after = [(await start.boundingBox())!, (await section.boundingBox())!];
  for (let index = 0; index < before.length; index += 1) {
    expect(after[index].x).toBeCloseTo(before[index].x, 0);
    expect(after[index].width).toBeCloseTo(before[index].width, 0);
  }
  await summary.click();
}

test('the library uses the available width and help never resizes it at 100% or 200%', async ({
  page,
}) => {
  await library(page);
  for (const scale of ['100', '200']) {
    const preferences = await settings(page);
    await preferences
      .getByLabel('Interface scale', { exact: true })
      .selectOption(scale);
    await page.keyboard.press('Escape');
    await expect(page.locator('.project-sidebar')).toBeVisible();
    await noLibraryOverlap(page);
    const main = (await page.locator('.dashboard-main').boundingBox())!;
    const start = (await page.locator('.studio-start').boundingBox())!;
    expect(start.width).toBeGreaterThan(main.width * 0.95);
    await stableHelpWidth(page);
    const row = page
      .locator('.start-project-row')
      .filter({ hasText: 'Network review' });
    const rename = row.getByRole('button', { name: 'Rename', exact: true });
    await unobscured(rename);
    await rename.click();
    await page
      .locator('.dashboard-main')
      .getByLabel('Project name', { exact: true })
      .press('Escape');
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ui-scale', '200');
  await expect(page.locator('.project-sidebar')).toBeVisible();
  await expect(page.locator('.start-project-row')).toHaveCount(3);
  await noLibraryOverlap(page);
  await stableHelpWidth(page);
  const navigator = page.getByRole('button', {
    name: 'Project navigator',
    exact: true,
  });
  await navigator.click();
  await noLibraryOverlap(page);
  await navigator.click();
  await noLibraryOverlap(page);
  await page
    .locator('.start-project-row')
    .last()
    .getByRole('button', { name: 'Open project', exact: true })
    .click();
  await expect(page.locator('.interactive-canvas')).toBeVisible();
});

for (const locale of ['en', 'de']) {
  test(`a small window keeps the navigator and all library actions reachable at 200% (${locale})`, async ({
    page,
  }) => {
    await library(page);
    const preferences = await settings(page);
    await preferences
      .getByLabel('Interface scale', { exact: true })
      .selectOption('200');
    await preferences
      .getByLabel('Language', { exact: true })
      .selectOption(locale);
    await page.keyboard.press('Escape');
    for (const width of [800, 390]) {
      await page.setViewportSize({ width, height: 600 });
      await expect(page.locator('.studio-shell')).toHaveAttribute(
        'data-ui-small',
        'true',
      );
      await noLibraryOverlap(page);
      await stableHelpWidth(page);
      const navigator = page.getByRole('button', {
        name: translate(locale, 'tree.heading'),
        exact: true,
      });
      await navigator.click();
      await expect(page.locator('.project-sidebar')).toBeHidden();
      await noLibraryOverlap(page);
      await stableHelpWidth(page);
      const last = page.locator('.start-project-row').last();
      const rename = last.getByRole('button', {
        name: translate(locale, 'editing.rename'),
        exact: true,
      });
      await unobscured(rename);
      await rename.click();
      const input = last.getByLabel(translate(locale, 'project.name'), {
        exact: true,
      });
      await input.fill(`Reachable ${width}`);
      await input.press('Enter');
      await expect(
        page
          .locator('.start-project-row')
          .getByRole('heading', { name: `Reachable ${width}`, exact: true }),
      ).toBeVisible();
      await noLibraryOverlap(page);
      await navigator.click();
      await expect(page.locator('.project-sidebar')).toBeVisible();
      await noLibraryOverlap(page);
    }
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-ui-scale', '200');
    await expect(page.locator('.start-project-row')).toHaveCount(3);
    await expect(page.locator('.project-sidebar')).toBeHidden();
    await noLibraryOverlap(page);
    await stableHelpWidth(page);
    expect(
      await page
        .locator('.dashboard-main')
        .evaluate((element) => element.scrollHeight > element.clientHeight),
    ).toBe(true);
    await page
      .locator('.start-project-row')
      .last()
      .getByRole('button', {
        name: translate(locale, 'project.open'),
        exact: true,
      })
      .click();
    await expect(page.locator('.interactive-canvas')).toBeVisible();
    const restored = await settings(page, locale);
    await restored
      .getByLabel(translate(locale, 'preferences.scale'), { exact: true })
      .selectOption('100');
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('data-ui-scale', '100');
  });
}

test('enhanced accessibility is optional, persists, enlarges targets and preserves diagram data', async ({
  page,
}) => {
  const original = await library(page);
  const preferences = await settings(page);
  const option = preferences.getByRole('checkbox', {
    name: 'Enhanced accessibility',
    exact: true,
  });
  await expect(option).not.toBeChecked();
  await option.check();
  await page.keyboard.press('Escape');
  await expect(page.locator('.studio-shell')).toHaveAttribute(
    'data-accessibility',
    'true',
  );
  for (const selector of [
    '.office-tool-button',
    '.start-actions button',
    '.start-row-actions button',
    '.title-rename',
    '.start-help > summary',
  ]) {
    for (const control of await page.locator(selector).all()) {
      const box = (await control.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
  const row = page
    .locator('.start-project-row')
    .filter({ hasText: 'Network review' });
  const rename = row.getByRole('button', { name: 'Rename', exact: true });
  await rename.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(rename).toBeFocused();
  expect(
    await rename.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).outlineWidth),
    ),
  ).toBeGreaterThanOrEqual(3);
  await unobscured(rename);
  await noLibraryOverlap(page);
  await stableHelpWidth(page);
  await page.reload();
  await expect(page.locator('.studio-shell')).toHaveAttribute(
    'data-accessibility',
    'true',
  );
  await page
    .locator('.start-project-row')
    .filter({ hasText: 'Network review' })
    .getByRole('button', { name: 'Open project', exact: true })
    .click();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  const exported = await importProject(
    new Uint8Array(readFileSync((await (await download).path())!)),
  );
  expect(exported.documents[0].pages[0].nodes).toEqual(
    original.documents[0].pages[0].nodes,
  );
  const reopened = await settings(page);
  await reopened.getByLabel('Language', { exact: true }).selectOption('de');
  const german = page.getByRole('checkbox', {
    name: 'Erhöhte Barrierefreiheit',
    exact: true,
  });
  await expect(german).toBeChecked();
  await german.uncheck();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('.studio-shell')).toHaveAttribute(
    'data-accessibility',
    'false',
  );
});

async function accessibleTarget(control: Locator, container: Locator) {
  await unobscured(control);
  const target = (await control.boundingBox())!;
  const bounds = (await container.boundingBox())!;
  expect(target.width).toBeGreaterThanOrEqual(44);
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(target.x).toBeGreaterThanOrEqual(bounds.x - 1);
  expect(target.y).toBeGreaterThanOrEqual(bounds.y - 1);
  expect(target.x + target.width).toBeLessThanOrEqual(
    bounds.x + bounds.width + 1,
  );
  expect(target.y + target.height).toBeLessThanOrEqual(
    bounds.y + bounds.height + 1,
  );
  expect(
    await control.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return [0.1, 0.9].every((y) =>
        [0.2, 0.8].every((x) =>
          element.contains(
            document.elementFromPoint(
              box.x + box.width * x,
              box.y + box.height * y,
            ),
          ),
        ),
      );
    }),
  ).toBe(true);
}

test('enhanced accessibility at 200% keeps narrow editor controls fully reachable', async ({
  page,
}) => {
  await library(page);
  const preferences = await settings(page);
  await preferences
    .getByRole('checkbox', { name: 'Enhanced accessibility', exact: true })
    .check();
  await preferences
    .getByLabel('Interface scale', { exact: true })
    .selectOption('200');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Project navigator', exact: true })
    .click();
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(page.locator('.studio-shell')).toHaveAttribute(
    'data-ui-small',
    'true',
  );
  await page
    .locator('.start-project-row')
    .filter({ hasText: 'Network review' })
    .getByRole('button', { name: 'Open project', exact: true })
    .click();
  const properties = page.locator('.office-properties');
  const closeProperties = properties.getByRole('button', {
    name: 'Hide properties',
    exact: true,
  });
  if (await properties.isVisible()) {
    await accessibleTarget(closeProperties, properties.locator('header'));
    await closeProperties.click();
  }
  const palette = page.locator('.shape-palette');
  for (const name of ['Rectangle', 'Freehand pen', 'Select']) {
    const tool = palette.getByRole('button', { name, exact: true });
    await accessibleTarget(tool, palette);
    await tool.click();
  }
  const sheetbar = page.locator('.workbook-sheetbar');
  const tab = sheetbar.getByRole('tab').first();
  await accessibleTarget(tab, sheetbar);
  await tab.press('Shift+F10');
  const rename = page.getByRole('menuitem', { name: 'Rename', exact: true });
  await accessibleTarget(rename, page.locator('.context-menu'));
  await rename.click();
  await expect(
    page.getByRole('dialog', { name: 'Rename', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  const add = sheetbar.getByRole('button', { name: 'Add page', exact: true });
  await accessibleTarget(add, sheetbar);
  await add.click();
  await expect(sheetbar.getByRole('tab')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Expand canvas', exact: true })
    .click();
  const toolbar = page.locator('.expanded-workbench-tools');
  for (const name of [
    'Project navigator',
    'Properties',
    'Objects',
    'Restore workspace',
  ]) {
    await accessibleTarget(
      toolbar.getByRole('button', { name, exact: true }),
      toolbar,
    );
  }
  await toolbar
    .getByRole('button', { name: 'Properties', exact: true })
    .click();
  await accessibleTarget(closeProperties, properties.locator('header'));
  await closeProperties.click();
  await toolbar
    .getByRole('button', { name: 'Project navigator', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Project navigator', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await toolbar
    .getByRole('button', { name: 'Restore workspace', exact: true })
    .click();
  await expect(toolbar).toHaveCount(0);
  await accessibleTarget(sheetbar.getByRole('tab').last(), sheetbar);
});
