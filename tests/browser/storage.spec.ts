import { expect, test } from '@playwright/test';
// IPC contract only; Rust tests cover filesystem copying and commit semantics.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const records = new Map<string, string>();
    Object.assign(window, {
      __TAURI__: {
        core: {
          invoke: async (
            command: string,
            args: Record<string, unknown> = {},
          ) => {
            if (command === 'storage_status')
              return {
                directory:
                  sessionStorage.getItem('location') ?? '/default/projects-v1',
                firstRun: !sessionStorage.getItem('location'),
              };
            if (command === 'storage_keep') {
              sessionStorage.setItem('location', '/default/projects-v1');
              return;
            }
            if (command === 'storage_change') {
              if (sessionStorage.getItem('fail')) throw 'storage';
              sessionStorage.setItem('location', '/chosen/世界/projects-v1');
              return true;
            }
            if (command === 'storage_open') return;
            if (command === 'project_list') return [...records.keys()];
            if (command === 'project_read')
              return records.get(args.id as string) ?? null;
            if (command === 'project_write') {
              if ((records.get(args.id as string) ?? null) !== args.expected)
                throw 'conflict';
              records.set(args.id as string, args.value as string);
              return;
            }
            throw 'storage';
          },
        },
      },
    });
  });
});
test('first run chooses storage before project discovery and is remembered offline in EN/DE', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toContainText('/default/projects-v1');
  await expect(
    page.getByRole('button', { name: 'New project', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page
    .getByRole('button', { name: 'Speicherort ändern …', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Neues Projekt', exact: true })
    .click();
  await expect(page.locator('.save-status')).toContainText('gespeichert');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Einstellungen · Speicher', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText(
    '/chosen/世界/projects-v1',
  );
});
test('migration failure preserves session and successful switch resets workspace before reopen', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Keep default and continue' }).click();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  await page
    .getByRole('button', { name: 'Settings · Storage', exact: true })
    .click();
  await page.evaluate(() => sessionStorage.setItem('fail', '1'));
  await page
    .getByRole('button', { name: 'Change location…', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await expect(page.locator('.workspace-header h1')).toHaveText(
    'Untitled project',
  );
  await page.evaluate(() => sessionStorage.removeItem('fail'));
  await page
    .getByRole('button', { name: 'Change location…', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText(
    '/chosen/世界/projects-v1',
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.workspace-header')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
});
