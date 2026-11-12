import { test, expect, type Page } from '@playwright/test';
import { createProject, exportProject } from '../../packages/project/src/index';
import { applyEdit } from '../../packages/editor-core/src/index';

async function diagram(page: Page) {
  const now = '2026-11-11T12:00:00.000Z';
  let project = createProject(
    'Interface review',
    () => crypto.randomUUID(),
    now,
  );
  const doc = project.documents[0],
    sheet = doc.pages[0],
    id = crypto.randomUUID();
  project = applyEdit(
    project,
    doc.id,
    sheet.id,
    {
      type: 'insert',
      id,
      kind: 'rectangle',
      position: { x: 0, y: 0 },
      layerId: sheet.layers[0].id,
      text: 'Unchanged diagram',
    },
    now,
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'interface.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  return { project, id };
}
async function settings(page: Page) {
  await page.getByRole('button', { name: 'Settings…', exact: true }).click();
  return page.getByRole('dialog', { name: 'Settings…', exact: true });
}

test('sheet names are editable by double-click, F2 and context menu without changing IDs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await diagram(page);
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  const sheets = page.getByRole('tablist', {
    name: 'Diagram pages',
    exact: true,
  });
  const id = await sheets.getByRole('tab').last().getAttribute('data-sheet-id');
  await sheets.getByRole('tab').last().dblclick();
  const rename = page.getByRole('dialog', { name: 'Rename', exact: true });
  await rename.getByLabel('Name', { exact: true }).fill('Übersicht Ω');
  await rename.getByLabel('Name', { exact: true }).press('Enter');
  await expect(rename).toHaveCount(0);
  await expect(
    sheets.getByRole('tab', { name: 'Übersicht Ω', exact: true }),
  ).toHaveAttribute('data-sheet-id', id!);
  await expect(
    sheets.getByRole('tab', { name: 'Übersicht Ω', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(sheets.getByRole('tab').last()).toHaveText('Page 2');
  await sheets.getByRole('tab').last().press('F2');
  await rename.getByLabel('Name', { exact: true }).fill('Discarded name');
  await page.keyboard.press('Escape');
  await expect(sheets.getByRole('tab').last()).toHaveText('Page 2');
  await page
    .getByRole('button', { name: 'Expand canvas', exact: true })
    .click();
  await sheets.getByRole('tab').first().press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
  await rename.getByLabel('Name', { exact: true }).fill('First sheet');
  await rename
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(sheets.getByRole('tab').first()).toHaveText('First sheet');
  await expect(page.locator('.canvas-workbook-expanded')).toBeVisible();
  await expect(sheets.getByRole('tab').last()).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('GUI scaling enlarges controls while retaining diagram zoom and unapplied properties, and persists offline', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { id } = await diagram(page);
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByLabel('Diagram element', { exact: true }).selectOption(id);
  const properties = page.getByRole('region', {
    name: 'Element properties',
    exact: true,
  });
  await properties.getByLabel('Width', { exact: true }).fill('248');
  const camera = await page
    .locator('.interactive-canvas')
    .getAttribute('data-camera');
  const original = (await page
    .locator(`[data-node-id="${id}"]`)
    .first()
    .boundingBox())!;
  const toolbarBefore = (await page
    .getByRole('button', { name: 'New project', exact: true })
    .boundingBox())!;
  const preferences = await settings(page);
  const scale = preferences.getByRole('combobox', {
    name: 'Interface scale',
    exact: true,
  });
  await scale.focus();
  await scale.selectOption('125');
  await expect(scale).toBeFocused();
  await preferences.getByRole('button', { name: 'Close', exact: true }).click();
  const toolbarAfter = (await page
    .getByRole('button', { name: 'New project', exact: true })
    .boundingBox())!;
  expect(toolbarAfter.height).toBeGreaterThan(toolbarBefore.height * 1.2);
  expect(
    (await page.locator(`[data-node-id="${id}"]`).first().boundingBox())!.width,
  ).toBeCloseTo(original.width, 1);
  await expect(page.locator('.interactive-canvas')).toHaveAttribute(
    'data-camera',
    camera!,
  );
  await expect(properties.getByLabel('Width', { exact: true })).toHaveValue(
    '248',
  );
  await expect(page.locator('.save-status')).toHaveText('Unapplied properties');
  await properties
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-ui-scale', '125');
  const restored = await settings(page);
  await expect(
    restored.getByRole('combobox', { name: 'Interface scale', exact: true }),
  ).toHaveValue('125');
});

test('large GUI settings remain operable in a narrow window and can return to compact size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await diagram(page);
  await page.getByRole('button', { name: /^Local projects/ }).click();
  await page.setViewportSize({ width: 800, height: 700 });
  await page
    .getByRole('button', { name: 'Project navigator', exact: true })
    .click();
  const preferences = await settings(page);
  const scale = preferences.getByRole('combobox', {
    name: 'Interface scale',
    exact: true,
  });
  await scale.selectOption('200');
  await expect(scale).toHaveValue('200');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const close = preferences.getByRole('button', { name: 'Close', exact: true });
  await close.focus();
  await expect(close).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(
    page
      .locator('.start-project-row')
      .getByRole('heading', { name: 'Interface review', exact: true }),
  ).toBeVisible();
  expect(
    (await page.locator('.start-project-copy').boundingBox())!.width,
  ).toBeGreaterThan(200);
  const reopened = await settings(page);
  await reopened
    .getByRole('combobox', { name: 'Interface scale', exact: true })
    .selectOption('100');
  await expect(
    reopened.getByRole('combobox', { name: 'Interface scale', exact: true }),
  ).toHaveValue('100');
  await reopened
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await expect(
    page
      .getByRole('dialog')
      .getByRole('combobox', { name: 'Oberflächenskalierung', exact: true }),
  ).toHaveValue('100');
});

test('storage change belongs to its path row and information controls have no native triangle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() =>
    Object.assign(window, {
      __TAURI__: {
        core: {
          invoke: async (command: string) => {
            if (command === 'storage_status')
              return {
                directory: '/home/review/Koxora/projects-v1',
                firstRun: false,
                availableBytes: 2147483648,
              };
            if (command === 'project_list') return [];
            if (command === 'project_open_next') return null;
            if (command === 'appimage_integration')
              return {
                available: true,
                registered: false,
                path: '/home/review/Koxora.AppImage',
                refreshNeeded: false,
              };
            if (command === 'storage_change') return false;
            throw new Error(command);
          },
        },
      },
    }),
  );
  await page.goto('/');
  const preferences = await settings(page);
  await preferences
    .getByRole('button', { name: 'Project storage', exact: true })
    .click();
  const path = preferences.locator('.storage-path'),
    change = preferences.getByRole('button', {
      name: 'Change location…',
      exact: true,
    });
  const pathBox = (await path.boundingBox())!,
    changeBox = (await change.boundingBox())!;
  expect(changeBox.x).toBeGreaterThanOrEqual(pathBox.x + pathBox.width);
  expect(
    Math.abs(
      changeBox.y + changeBox.height / 2 - pathBox.y - pathBox.height / 2,
    ),
  ).toBeLessThan(3);
  const info = preferences
    .getByRole('region', { name: 'Settings · Storage', exact: true })
    .locator('.info-disclosure > summary');
  await expect(info.locator('[data-icon="info"]')).toHaveCount(1);
  expect(
    await info.evaluate((element) => getComputedStyle(element).listStyleType),
  ).toBe('none');
  await info.click();
  await expect(
    preferences.getByText(
      'This location stores local projects, snapshots and recovery data. It does not move the application or your separately exported .koxora files.',
      { exact: true },
    ),
  ).toBeVisible();
  await change.click();
  await expect(preferences.locator('.storage-path')).toHaveText(
    '/home/review/Koxora/projects-v1',
  );
});
