import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const golden = readFileSync('packages/project/fixtures/v1.koxora');
async function saved(page: import('@playwright/test').Page) {
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
}
test('create, rename, reopen offline, export, import and recover', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await saved(page);
  await page
    .getByRole('textbox', { name: 'Project name' })
    .fill('Portable 世界');
  await saved(page);
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  const data = JSON.parse(readFileSync(path!, 'utf8'));
  expect(data.title).toBe('Portable 世界');
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
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue(
    'Portable 世界',
  );
  await page.getByLabel('Import .koxora', { exact: true }).setInputFiles(path!);
  await expect(page.getByRole('alert')).toContainText('already exists');
  await page.getByLabel('Import as a new project').check();
  await page.getByLabel('Import .koxora', { exact: true }).setInputFiles(path!);
  await saved(page);
  await expect(
    page.getByRole('button', { name: 'Open project', exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole('textbox', { name: 'Project name' })
    .fill('Renamed copy');
  await saved(page);
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Renamed copy' })
    .getByRole('button', { name: 'Recover previous save' })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Continue' })
    .click();
  await saved(page);
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue(
    'Portable 世界',
  );
});
test('invalid files, versions and duplicate keys leave the active project unchanged', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Import .koxora', { exact: true }).setInputFiles({
    name: 'fixture.koxora',
    mimeType: 'application/json',
    buffer: golden,
  });
  await saved(page);
  for (const text of [
    '{',
    '{"format":"wrong","format":"koxora-project"}',
    golden
      .toString()
      .replace('"schemaVersion": "1.0.0"', '"schemaVersion": "2.0.0"'),
  ]) {
    await page.getByLabel('Import .koxora', { exact: true }).setInputFiles({
      name: 'invalid.koxora',
      mimeType: 'application/json',
      buffer: Buffer.from(text),
    });
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Project name' }),
    ).toHaveValue('Überblick 世界 مرحبا');
  }
});
test('a quota failure keeps unsaved changes exportable and the stored version intact', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await saved(page);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Quota full', 'QuotaExceededError');
    };
  });
  await page
    .getByRole('textbox', { name: 'Project name' })
    .fill('Keep my changes');
  await expect(page.getByRole('alert')).toContainText('Local storage');
  await expect(
    page.getByText('Unsaved changes', { exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  expect(
    JSON.parse(readFileSync((await (await downloadPromise).path())!, 'utf8'))
      .title,
  ).toBe('Keep my changes');
  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue(
    'Untitled project',
  );
});
test('two tabs cannot silently overwrite each other', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await saved(page);
  const other = await context.newPage();
  await other.goto('/');
  await other
    .getByRole('button', { name: 'Open project', exact: true })
    .click();
  await expect(
    other.getByRole('textbox', { name: 'Project name' }),
  ).toHaveValue('Untitled project');
  await page
    .getByRole('textbox', { name: 'Project name' })
    .fill('First writer');
  await saved(page);
  await other
    .getByRole('textbox', { name: 'Project name' })
    .fill('Stale writer');
  await expect(other.getByRole('alert')).toContainText('changed elsewhere');
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue(
    'First writer',
  );
});
test('German project controls preserve content and recover an invalid head', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await saved(page);
  await page.getByRole('textbox', { name: 'Project name' }).fill('Recovery');
  await saved(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('koxora-projects', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const r = store.openCursor();
      r.onsuccess = () => {
        const cursor = r.result!;
        const data = JSON.parse(cursor.value);
        data.current = '{';
        cursor.update(JSON.stringify(data));
      };
      tx.oncomplete = () => resolve();
      tx.onerror = reject;
    });
    db.close();
  });
  await page.reload();
  await expect(
    page.getByText('Unreadable project — try recovery', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page
    .getByRole('button', { name: 'Vorherigen Speicherstand wiederherstellen' })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Fortfahren' })
    .click();
  await expect(
    page.getByText('Auf diesem Gerät gespeichert', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Projektname' })).toHaveValue(
    'Untitled project',
  );
});
test('blocked project storage keeps edits exportable and replacement requires explicit confirmation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Project name' })
    .fill('Session only');
  await expect(page.getByRole('alert')).toContainText('Local storage');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel' })
    .click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue(
    'Session only',
  );
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  expect(
    JSON.parse(readFileSync((await (await downloadPromise).path())!, 'utf8'))
      .title,
  ).toBe('Session only');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Continue' })
    .click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue(
    'Untitled project',
  );
});
