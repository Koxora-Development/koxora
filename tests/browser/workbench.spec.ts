import { test, expect, type Page } from '@playwright/test';
import {
  createProject,
  exportProject,
  serializeProject,
} from '../../packages/project/src/index';
import {
  applyWorkbook,
  selectPage,
} from '../../packages/editor-core/src/index';

async function openWorkbook(page: Page) {
  const now = '2026-11-11T12:00:00.000Z';
  const id = () => crypto.randomUUID();
  let project = createProject('Workbook review', id, now);
  const documentId = project.documents[0].id;
  for (let n = 2; n <= 18; n++)
    project = applyWorkbook(
      project,
      { type: 'newPage', documentId, title: `Sheet ${n} · Übersicht` },
      id,
      now,
    );
  project = applyWorkbook(
    project,
    { type: 'newDocument', title: 'Second workbook' },
    id,
    now,
  );
  project = selectPage(project, documentId, project.documents[0].pages[0].id);
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'workbook.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  return project;
}

test('sheet tabs scroll, navigate with the keyboard, add pages and retain document identity offline', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const project = await openWorkbook(page);
  const tabs = page.getByRole('tablist', {
    name: 'Diagram pages',
    exact: true,
  });
  await expect(tabs.getByRole('tab')).toHaveCount(18);
  await tabs.getByRole('tab').first().focus();
  await page.keyboard.press('End');
  await expect(tabs.getByRole('tab').last()).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(tabs.getByRole('tab').last()).toBeInViewport();
  await expect(tabs.getByRole('tab').last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tabs.getByRole('tab').first()).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await expect(tabs.getByRole('tab')).toHaveCount(19);
  await expect(tabs.getByRole('tab').last()).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(tabs.getByRole('tab')).toHaveCount(18);
  const documents = page.getByRole('combobox', {
    name: 'Document',
    exact: true,
  });
  await documents.selectOption(project.documents[1].id);
  await expect(tabs.getByRole('tab')).toHaveCount(1);
  await documents.selectOption(project.documents[0].id);
  await expect(tabs.getByRole('tab')).toHaveCount(18);
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
  await expect(tabs.getByRole('tab')).toHaveCount(18);
});

test('expanded workbench keeps all four icon controls and sheet tabs available', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openWorkbook(page);
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
    const button = toolbar.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    await expect(button.locator('svg')).toHaveCount(1);
  }
  await toolbar.getByRole('button', { name: 'Objects', exact: true }).click();
  await expect(page.locator('.objects-panel')).toBeVisible();
  await toolbar
    .getByRole('button', { name: 'Properties', exact: true })
    .click();
  await expect(page.locator('.office-properties')).toHaveCount(0);
  await toolbar
    .getByRole('button', { name: 'Project navigator', exact: true })
    .click();
  const navigator = page.getByRole('dialog', {
    name: 'Project navigator',
    exact: true,
  });
  await expect(navigator.locator('.studio-navigator')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    toolbar.getByRole('button', { name: 'Project navigator', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('tablist', { name: 'Diagram pages', exact: true })
    .getByRole('tab')
    .last()
    .click();
  await expect(page.locator('.canvas-workbook-expanded')).toBeVisible();
  const sheets = page.getByRole('tablist', {
    name: 'Diagram pages',
    exact: true,
  });
  await sheets.getByRole('tab').last().focus();
  await page.keyboard.press('Home');
  await expect(sheets.getByRole('tab').first()).toBeFocused();
  await expect(sheets.getByRole('tab').first()).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    toolbar.getByRole('button', { name: 'Restore workspace', exact: true }),
  ).toBeVisible();
  await toolbar
    .getByRole('button', { name: 'Restore workspace', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Expand canvas', exact: true }),
  ).toBeFocused();
});

test('start library uses compact project rows and reserves an honest template section in EN and DE', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Project library', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'New blank project', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Templates are planned', { exact: true }),
  ).toBeVisible();
  await openWorkbook(page);
  if (!(await page.locator('.project-sidebar').isVisible()))
    await page
      .getByRole('button', { name: 'Project navigator', exact: true })
      .click();
  await page.getByRole('button', { name: /^Local projects/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Project library', level: 1 }),
  ).toBeFocused();
  await expect(page.locator('.office-document-name')).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await expect(
    page.getByRole('heading', { name: 'Projektbibliothek', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText('Vorlagen sind geplant', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Vorlagen', exact: true }),
  ).toHaveCount(0);
});

test('trash cancellation and restore retain data; confirmed permanent deletion removes all browser snapshots', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const project = await openWorkbook(page);
  async function trashProject() {
    const root = page
      .locator('.project-sidebar [role="treeitem"][aria-level="1"]')
      .first();
    await root.press('Shift+F10');
    await page
      .getByRole('menuitem', { name: 'Delete project…', exact: true })
      .click();
    await page
      .getByRole('dialog', { name: 'Delete project…', exact: true })
      .getByRole('button', { name: 'Continue', exact: true })
      .click();
    await expect(page.locator('.navigator-trash-entry')).toHaveCount(1);
  }
  await trashProject();
  const trash = page.locator('.project-trash');
  await expect(trash.locator('summary [data-icon="trash"]')).toHaveCount(1);
  expect(
    await trash
      .locator('summary')
      .evaluate((element) => getComputedStyle(element).listStyleType),
  ).toBe('none');
  await trash.locator('summary').click();
  const purge = trash.getByRole('button', {
    name: 'Permanently delete Workbook review',
    exact: true,
  });
  await purge.click();
  const confirmation = page.getByRole('dialog', {
    name: 'Permanently delete project',
    exact: true,
  });
  await expect(confirmation).toContainText('Workbook review');
  await expect(
    confirmation.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(confirmation).toHaveCount(0);
  await expect(page.locator('.navigator-trash-entry')).toHaveCount(1);
  await trash.getByRole('button', { name: /^Restore/ }).click();
  await expect(page.locator('.navigator-trash-entry')).toHaveCount(0);
  await expect(page.locator('.start-project-row')).toHaveCount(1);
  await trashProject();
  await trash.locator('summary').click();
  await purge.click();
  await confirmation
    .getByRole('button', { name: 'Permanently delete', exact: true })
    .click();
  await expect(confirmation).toHaveCount(0);
  await expect(page.locator('.navigator-trash-entry')).toHaveCount(0);
  await expect(page.locator('.start-project-row')).toHaveCount(0);
  const stored = await page.evaluate(
    (id) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('koxora-projects', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('projects', 'readonly');
          const read = transaction.objectStore('projects').get(id);
          read.onsuccess = () => resolve(read.result ?? null);
          transaction.oncomplete = () => db.close();
        };
      }),
    project.manifest.projectId,
  );
  expect(stored).toBeNull();
  await page.reload();
  await expect(page.locator('.start-project-row')).toHaveCount(0);
});

test('sheet navigation cannot discard pending properties', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openWorkbook(page);
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
  await page.locator('.interactive-canvas').focus();
  await page.keyboard.press('Enter');
  const properties = page.getByRole('region', {
    name: 'Element properties',
    exact: true,
  });
  await properties.getByLabel('Width', { exact: true }).fill('248');
  const tabs = page.getByRole('tablist', {
    name: 'Diagram pages',
    exact: true,
  });
  await tabs.getByRole('tab').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab').first()).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(properties.getByLabel('Width', { exact: true })).toHaveValue(
    '248',
  );
  await expect(page.locator('.save-status')).toHaveText('Unapplied properties');
  await properties
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await tabs.getByRole('tab').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab').nth(1)).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('stale permanent-delete confirmation cannot erase a newer trashed version', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const project = await openWorkbook(page);
  await page
    .locator('.project-sidebar [role="treeitem"][aria-level="1"]')
    .first()
    .press('Shift+F10');
  await page
    .getByRole('menuitem', { name: 'Delete project…', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Delete project…', exact: true })
    .getByRole('button', { name: 'Continue', exact: true })
    .click();
  const trash = page.locator('.project-trash');
  await expect(trash).toBeVisible();
  await trash.locator('summary').click();
  await trash
    .getByRole('button', {
      name: 'Permanently delete Workbook review',
      exact: true,
    })
    .click();
  const confirmation = page.getByRole('dialog', {
    name: 'Permanently delete project',
    exact: true,
  });
  await expect(confirmation).toContainText('Workbook review');
  const current = await serializeProject({
    ...project,
    manifest: { ...project.manifest, title: 'Updated elsewhere' },
  });
  const newer = await page.evaluate(
    ({ id, current }) =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('koxora-projects', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('projects', 'readwrite');
          const store = transaction.objectStore('projects');
          let raw = '';
          const read = store.get(id);
          read.onsuccess = () => {
            const old = JSON.parse(read.result);
            raw = JSON.stringify({
              ...old,
              current,
              previous: old.current,
              deleted: true,
            });
            store.put(raw, id);
          };
          transaction.oncomplete = () => {
            db.close();
            resolve(raw);
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { id: project.manifest.projectId, current },
  );
  await confirmation
    .getByRole('button', { name: 'Permanently delete', exact: true })
    .click();
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByRole('alert')).toBeVisible();
  const retained = await page.evaluate(
    (id) =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('koxora-projects', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('projects', 'readonly');
          const read = transaction.objectStore('projects').get(id);
          read.onsuccess = () => resolve(read.result);
          transaction.oncomplete = () => db.close();
        };
      }),
    project.manifest.projectId,
  );
  expect(retained).toBe(newer);
  await confirmation
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await trash
    .getByRole('button', {
      name: 'Permanently delete Workbook review',
      exact: true,
    })
    .click();
  await expect(confirmation).toContainText('Updated elsewhere');
  await confirmation
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
});
