import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createProject, exportProject } from '../../packages/project/src/index';
import { applyEdit } from '../../packages/editor-core/src/index';
async function properties(page: Page) {
  const time = '2026-11-10T00:00:00.000Z';
  let project = createProject('Compact review', randomUUID, time);
  const doc = project.documents[0],
    p = doc.pages[0],
    id = randomUUID();
  project = applyEdit(
    project,
    doc.id,
    p.id,
    {
      type: 'insert',
      id,
      kind: 'rectangle',
      position: { x: 0, y: 0 },
      layerId: p.layers[0].id,
      text: 'Example',
    },
    time,
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'compact.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByLabel('Diagram element', { exact: true }).selectOption(id);
  return {
    dialog: page.getByRole('dialog', { name: 'Element properties' }),
    id,
  };
}
test('properties group compact fields and retain help, form edits and menu keyboard navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const { dialog, id } = await properties(page);
  const box = await dialog.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(700);
  expect(box!.height).toBeLessThan(700);
  const help = dialog.getByText('Help and shortcuts', { exact: true }).first();
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByText(/Select text to format words/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page
    .locator(`[data-node-id="${id}"]`)
    .first()
    .click({ button: 'right' });
  const menu = page.getByRole('menu');
  const height = await menu
    .getByRole('menuitem')
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);
  const coarse = await page.evaluate(
    () => matchMedia('(pointer: coarse)').matches,
  );
  expect(height).toBe(coarse ? 44 : 30);
  await page.keyboard.press('End');
  await expect(
    menu.getByRole('menuitem', { name: 'Cancel', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Home');
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});
test('small-window properties keep actions reachable without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 640 });
  const { dialog } = await properties(page);
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  const apply = dialog.getByRole('button', {
    name: 'Apply changes',
    exact: true,
  });
  await apply.focus();
  await expect(apply).toBeInViewport();
  await page.keyboard.press('Tab');
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
test('native settings explicitly register Open With and expose restore mode in EN and DE', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let registered = false;
    Object.assign(window, {
      compactActions: [] as string[],
      __TAURI__: {
        core: {
          invoke: async (
            command: string,
            args: Record<string, unknown> = {},
          ) => {
            if (command === 'storage_status')
              return {
                directory: '/home/test/Koxora/projects-v1',
                firstRun: false,
                availableBytes: 1024 * 1048576,
              };
            if (command === 'project_list') return [];
            if (command === 'project_open_next') return null;
            if (command === 'appimage_integration') {
              (
                window as unknown as { compactActions: string[] }
              ).compactActions.push(args.action as string);
              if (args.action === 'register') registered = true;
              if (args.action === 'remove') registered = false;
              return {
                available: true,
                registered,
                path: '/home/test/Applications/Koxora.AppImage',
                refreshNeeded: false,
              };
            }
            throw command;
          },
        },
      },
    });
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Settings · Storage', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('/home/test/Koxora/projects-v1');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { compactActions: string[] }).compactActions,
      ),
    )
    .toEqual(['status']);
  await dialog
    .getByRole('button', { name: 'Set up Open With', exact: true })
    .click();
  await expect(dialog).toContainText('Registration matches this AppImage');
  await dialog
    .getByRole('button', { name: 'Remove integration', exact: true })
    .click();
  await expect(dialog).toContainText('This AppImage is not registered');
  await dialog
    .getByRole('checkbox', { name: 'Use an existing repository', exact: true })
    .check();
  await expect(
    dialog.getByRole('button', { name: 'Restore location…', exact: true }),
  ).toBeVisible();
  await expect(dialog).toContainText('Restore mode:');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page
    .getByRole('button', { name: 'Einstellungen · Speicher', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Öffnen mit einrichten', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText(
    'Deine Standard-App bleibt unverändert',
  );
});

test('integration status failures stay visible and a missing AppImage can still be unregistered', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.assign(window, {
      compactStatusFails: true,
      __TAURI__: {
        core: {
          invoke: async (
            command: string,
            args: Record<string, unknown> = {},
          ) => {
            if (command === 'storage_status')
              return { directory: '/test/projects-v1', firstRun: false };
            if (command === 'project_list') return [];
            if (command === 'project_open_next') return null;
            if (command === 'appimage_integration') {
              if (
                (window as unknown as { compactStatusFails: boolean })
                  .compactStatusFails
              )
                throw 'integrationFailed';
              return {
                available: true,
                canRegister: false,
                registered: false,
                path: '/moved/Koxora.AppImage',
                refreshNeeded: args.action === 'remove',
              };
            }
            throw command;
          },
        },
      },
    }),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Settings · Storage', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText(
    'Integration could not be completed',
  );
  await page.evaluate(() => {
    (window as unknown as { compactStatusFails: boolean }).compactStatusFails =
      false;
  });
  await dialog
    .getByRole('button', { name: 'Check integration again', exact: true })
    .click();
  await expect(dialog).toContainText('This AppImage was moved');
  await expect(
    dialog.getByRole('button', { name: 'Set up Open With', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole('button', { name: 'Remove integration', exact: true })
    .click();
  await expect(dialog).toContainText('Desktop caches may need refreshing');
});

test('zoom-sized viewport keeps the last property field clear of actions', async ({
  page,
}) => {
  const { dialog } = await properties(page);
  await page.setViewportSize({ width: 640, height: 450 });
  await dialog.getByText('Geometry and appearance', { exact: true }).click();
  const last = dialog.locator('.element-fields input').last();
  await last.focus();
  const field = await last.boundingBox();
  const footer = await dialog.locator('.dialog-actions').boundingBox();
  expect(field!.y + field!.height).toBeLessThanOrEqual(footer!.y + 1);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
});
