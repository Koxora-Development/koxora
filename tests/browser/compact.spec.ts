import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createProject, exportProject } from '../../packages/project/src/index';
import { applyEdit } from '../../packages/editor-core/src/index';

// The former compact dialog is now an Office-style properties dock. These cases
// exercise its public controls, rather than relying on the old dialog layout.
async function properties(page: Page) {
  const time = '2026-11-10T00:00:00.000Z';
  let project = createProject('Office review', randomUUID, time);
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
      name: 'office.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByLabel('Diagram element', { exact: true }).selectOption(id);
  const dock = page.getByRole('complementary', {
    name: 'Properties',
    exact: true,
  });
  await expect(dock).toBeVisible();
  return {
    dock,
    panel: dock.getByRole('region', {
      name: 'Element properties',
      exact: true,
    }),
    id,
  };
}

async function settings(page: Page) {
  await page.getByRole('button', { name: 'Settings…', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Settings…', exact: true }),
  ).toBeVisible();
  // The same modal changes its accessible name when its language changes.
  return page.getByRole('dialog');
}

test('menubar toggles its current menu and uses one keyboard tab stop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await properties(page);
  const bar = page.getByRole('menubar', { name: 'Application menu' });
  const file = bar.getByRole('menuitem', { name: 'File', exact: true });
  const fileMenu = page.getByRole('menu', { name: 'File', exact: true });
  await file.click();
  await expect(fileMenu).toBeVisible();
  await file.click();
  await expect(fileMenu).toHaveCount(0);

  await file.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    bar.getByRole('menuitem', { name: 'Edit', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('End');
  await expect(
    bar.getByRole('menuitem', { name: 'Help', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Home');
  await expect(file).toBeFocused();
  expect(
    await bar.evaluate(
      (element) =>
        element.querySelectorAll(':scope > button[tabindex="0"]').length,
    ),
  ).toBe(1);
  await page.keyboard.press('ArrowDown');
  await expect(
    fileMenu.getByRole('menuitem', { name: 'New project', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(file).toBeFocused();
  await expect(fileMenu).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(fileMenu).toHaveCount(0);
  await expect(
    page
      .getByRole('toolbar', { name: 'File and editing tools' })
      .getByRole('button', { name: 'New project', exact: true }),
  ).toBeFocused();
  await file.click();
  await fileMenu
    .getByRole('menuitem', { name: 'Settings…', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Language', { exact: true })
    .selectOption('de');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Schließen', exact: true })
    .click();
  await expect(
    page
      .getByRole('menubar')
      .getByRole('menuitem', { name: 'Datei', exact: true }),
  ).toBeFocused();
});

test('stacking submenu keeps keyboard focus when the pointer leaves and returns with Left or Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const { id } = await properties(page);
  const format = page
    .getByRole('menubar', { name: 'Application menu' })
    .getByRole('menuitem', { name: 'Format', exact: true });
  await format.click();
  const rootMenu = page.getByRole('menu', { name: 'Format', exact: true });
  const stacking = rootMenu.getByRole('menuitem', {
    name: 'Stacking',
    exact: true,
  });
  await stacking.hover();
  await stacking.focus();
  await page.keyboard.press('ArrowRight');
  const submenu = page.getByRole('menu', { name: 'Stacking', exact: true });
  const first = submenu.getByRole('menuitem', {
    name: 'Bring forward',
    exact: true,
  });
  await expect(first).toBeFocused();
  await page.mouse.move(0, 0);
  await expect(submenu).toBeVisible();
  await expect(first).toBeFocused();
  await page.keyboard.press('End');
  await expect(
    submenu.getByRole('menuitem', { name: 'Send to back', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(submenu).toBeHidden();
  await expect(stacking).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(first).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(stacking).toBeFocused();
  await expect(submenu).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(rootMenu).toHaveCount(0);
  await expect(format).toBeFocused();

  await page
    .locator(`[data-node-id="${id}"]`)
    .first()
    .click({ button: 'right' });
  const editing = page.getByRole('menu', {
    name: 'Editing actions',
    exact: true,
  });
  await expect(editing).toBeVisible();
  const contextStacking = editing.getByRole('menuitem', {
    name: 'Stacking',
    exact: true,
  });
  await contextStacking.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page
      .getByRole('menu', { name: 'Stacking', exact: true })
      .getByRole('menuitem', { name: 'Bring forward', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(contextStacking).toBeFocused();
  await expect(editing).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editing).toHaveCount(0);
  await expect(page.locator('.interactive-canvas')).toBeFocused();
});

test('properties are docked and tabbed, retain drafts, and apply without closing the dock', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const { dock, panel } = await properties(page);
  await expect(
    page.getByRole('dialog', { name: 'Element properties', exact: true }),
  ).toHaveCount(0);
  const bounds = await dock.boundingBox();
  expect(bounds!.width).toBeLessThan(1280 / 3);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1281);

  await panel.getByRole('tab', { name: 'Text', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    panel.getByRole('tab', { name: 'Links', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await panel.getByLabel('Link type', { exact: true }).selectOption('url');
  await panel
    .getByLabel('URL address', { exact: true })
    .fill('https://example.org/office-review');
  await expect(page.locator('.save-status')).toHaveText('Unapplied properties');
  await expect(
    page.getByRole('button', { name: 'Save project', exact: true }),
  ).toBeDisabled();
  await dock
    .getByRole('button', { name: 'Hide properties', exact: true })
    .click();
  await expect(dock).toBeVisible();
  await expect(panel.getByLabel('URL address', { exact: true })).toHaveValue(
    'https://example.org/office-review',
  );
  await expect(
    page.getByText(
      'Apply or discard the pending properties before changing the selection or leaving this page.',
      { exact: true },
    ),
  ).toBeVisible();
  await panel.getByRole('button', { name: 'Discard', exact: true }).click();
  await panel.getByRole('tab', { name: 'Links', exact: true }).click();
  await expect(panel.getByLabel('Link type', { exact: true })).toHaveValue(
    'none',
  );
  await panel.getByLabel('Link type', { exact: true }).selectOption('url');
  await panel
    .getByLabel('URL address', { exact: true })
    .fill('https://example.org/applied');
  await panel
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(dock).toBeVisible();
  await panel.getByRole('tab', { name: 'Links', exact: true }).click();
  await expect(panel.getByLabel('URL address', { exact: true })).toHaveValue(
    'https://example.org/applied',
  );
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
});

test('small-window properties scroll fields and actions without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 640 });
  const { dock, panel } = await properties(page);
  expect(await dock.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  const last = panel.locator('.element-fields input').last();
  await last.focus();
  await expect(last).toBeInViewport();
  const field = await last.boundingBox();
  const footer = await panel.locator('.dialog-actions').boundingBox();
  expect(field!.y + field!.height).toBeLessThanOrEqual(footer!.y + 1);
  const apply = panel.getByRole('button', {
    name: 'Apply changes',
    exact: true,
  });
  await apply.focus();
  await expect(apply).toBeInViewport();
  await page.setViewportSize({ width: 640, height: 450 });
  await last.focus();
  await expect(last).toBeInViewport();
  expect(await dock.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await apply.focus();
  await expect(apply).toBeInViewport();
  await dock
    .getByRole('button', { name: 'Hide properties', exact: true })
    .click();
  await expect(dock).toHaveCount(0);
});

test('native settings separate storage and file integration and support EN/DE without changing defaults', async ({
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
  const dialog = await settings(page);
  await expect(dialog.getByLabel('Language', { exact: true })).toHaveValue(
    'en',
  );
  await dialog
    .getByRole('button', { name: 'Project storage', exact: true })
    .click();
  await expect(dialog).toContainText('/home/test/Koxora/projects-v1');
  await dialog
    .getByRole('checkbox', { name: 'Use an existing repository', exact: true })
    .check();
  await expect(
    dialog.getByRole('button', { name: 'Restore location…', exact: true }),
  ).toBeVisible();
  await expect(dialog).toContainText('Restore mode:');
  await dialog
    .getByRole('button', { name: 'File opening', exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { compactActions: string[] }).compactActions,
      ),
    )
    .toEqual(['status']);
  await dialog
    .getByRole('button', { name: 'Register AppImage', exact: true })
    .click();
  await expect(dialog).toContainText('Registration matches this AppImage');
  await expect(dialog).toContainText('application menu or search');
  await dialog
    .getByRole('button', { name: 'Remove integration', exact: true })
    .click();
  await expect(dialog).toContainText('This AppImage is not registered');
  await dialog.getByRole('button', { name: 'General', exact: true }).click();
  await dialog.getByLabel('Language', { exact: true }).selectOption('de');
  await expect(dialog).toHaveAttribute('aria-label', 'Einstellungen …');
  await dialog
    .getByRole('button', { name: 'Dateien öffnen', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'AppImage registrieren', exact: true }),
  ).toBeVisible();
  await expect(dialog).toContainText('Deine Standard-App bleibt unverändert');
  await expect(dialog).toContainText('Anwendungsmenü, in der Anwendungssuche');
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('integration status failures stay visible and a moved AppImage can still be unregistered', async ({
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
  const dialog = await settings(page);
  await dialog
    .getByRole('button', { name: 'File opening', exact: true })
    .click();
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
    dialog.getByRole('button', { name: 'Register AppImage', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole('button', { name: 'Remove integration', exact: true })
    .click();
  await expect(dialog).toContainText('Desktop caches may need refreshing');
});

test('invalid properties reveal their tab and dashboard navigation retains the draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { panel } = await properties(page);
  await panel.getByLabel('Width', { exact: true }).fill('1');
  await panel.getByRole('tab', { name: 'Text', exact: true }).click();
  await panel
    .getByRole('textbox', { name: 'Label / text', exact: true })
    .fill('Pending text');
  await panel
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(
    panel.getByRole('tab', { name: 'Format', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(panel.getByLabel('Width', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: /^Local projects/ }).click();
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel('Width', { exact: true })).toHaveValue('1');
  await panel.getByRole('tab', { name: 'Text', exact: true }).click();
  await expect(
    panel.getByRole('textbox', { name: 'Label / text', exact: true }),
  ).toHaveText('Pending text');
  await panel.getByRole('button', { name: 'Discard', exact: true }).click();
  await panel.getByRole('tab', { name: 'Text', exact: true }).click();
  await expect(
    panel.getByRole('textbox', { name: 'Label / text', exact: true }),
  ).toHaveText('Example');
});
