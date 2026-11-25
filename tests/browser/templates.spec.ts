import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { readFileSync } from 'node:fs';
import { importProject, type Project } from '../../packages/project/src/index';

async function saved(page: Page) {
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
}
async function exported(page: Page, waitForSave = true) {
  if (waitForSave) await saved(page);
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
}
async function gallery(page: Page) {
  if (await page.locator('.start-actions').isVisible()) {
    await page
      .locator('.start-actions')
      .getByRole('button', { name: 'Templates', exact: true })
      .click();
  } else {
    await page
      .getByRole('menubar')
      .getByRole('menuitem', { name: 'File', exact: true })
      .click();
    await page
      .getByRole('menuitem', { name: 'Templates', exact: true })
      .click();
  }
  await expect(
    page.getByRole('heading', { name: 'Templates', exact: true }),
  ).toBeVisible();
}
function card(page: Page, title: string) {
  return page
    .locator('.template-card')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}
async function restartOffline(page: Page, context: BrowserContext) {
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
}
function identities(project: Project) {
  return [
    project.manifest.projectId,
    ...project.documents.flatMap((d) => [
      d.id,
      ...d.pages.flatMap((p) => [
        p.id,
        ...p.layers.map((l) => l.id),
        ...p.nodes.map((n) => n.id),
        ...p.connections.map((e) => e.id),
      ]),
    ]),
  ];
}
async function reachable(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  expect(
    await locator.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        ),
      );
    }),
  ).toBe(true);
}

test('templates have real previews, category/search filtering and cancellation does not create a project', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'New mind map', exact: true }),
  ).toHaveCount(0);
  await gallery(page);
  await expect(page.locator('.template-card')).toHaveCount(10);
  await page
    .getByRole('combobox', { name: 'Template category', exact: true })
    .selectOption('mindmap');
  await expect(page.locator('.template-card')).toHaveCount(3);
  await card(page, 'Tree mind map')
    .getByRole('button', { name: 'Preview', exact: true })
    .click();
  const preview = page.getByRole('dialog', {
    name: 'Tree mind map',
    exact: true,
  });
  await expect(
    preview.locator('svg.template-preview > g path').first(),
  ).toBeVisible();
  await expect(preview).toContainText('freely editable');
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Template category', exact: true })
    .selectOption('planning');
  await card(page, 'Weekly plan')
    .getByRole('button', { name: 'Preview', exact: true })
    .click();
  const weekly = page.getByRole('dialog', { name: 'Weekly plan', exact: true });
  const mainLine = weekly
    .locator('tspan')
    .filter({ hasText: /^Main task$/ })
    .first();
  const notesLine = weekly
    .locator('tspan')
    .filter({ hasText: /^Notes$/ })
    .first();
  const mainBox = await mainLine.evaluate((element) => {
    const text = element as SVGTextContentElement;
    return {
      y: text.getStartPositionOfChar(0).y,
      height: text.getExtentOfChar(0).height,
    };
  });
  const notesBox = await notesLine.evaluate((element) => {
    const text = element as SVGTextContentElement;
    return {
      y: text.getStartPositionOfChar(0).y,
      height: text.getExtentOfChar(0).height,
    };
  });
  expect(mainBox.height).toBeGreaterThan(0);
  expect(notesBox.height).toBeGreaterThan(0);
  expect(notesBox.y - mainBox.y).toBeGreaterThan(mainBox.height * 1.5);
  await page.keyboard.press('Escape');
  await expect(weekly).toHaveCount(0);
  await page
    .getByRole('searchbox', { name: 'Search templates', exact: true })
    .fill('not-a-template');
  await expect(page.locator('.template-card')).toHaveCount(0);
  await expect(
    page.getByText('No templates match your search.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  await expect(page.locator('.template-card')).toHaveCount(10);
  await page
    .getByRole('button', { name: 'Back to projects', exact: true })
    .click();
  await expect(page.locator('.start-project-row')).toHaveCount(0);
});

test('each use creates fresh ordinary editable content with standard duplication, deletion and history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await gallery(page);
  await card(page, 'Radial mind map')
    .getByRole('button', { name: 'Use template', exact: true })
    .click();
  const original = await exported(page);
  const sheet = original.documents[0].pages[0];
  expect(sheet.nodes.length).toBeGreaterThan(3);
  expect(sheet.connections.length).toBeGreaterThan(2);
  expect(original.documents[0].domainModels).toEqual([]);
  await expect(
    page.getByRole('group', { name: 'Mind map tools', exact: true }),
  ).toHaveCount(0);
  const canvas = page.getByRole('region', {
    name: 'Interactive canvas',
    exact: true,
  });
  await canvas.focus();
  await page.keyboard.press('Control+a');
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: 'Edit', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
  await expect(page.locator('[data-node-id]')).toHaveCount(
    sheet.nodes.length * 2,
  );
  await canvas.focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-node-id]')).toHaveCount(sheet.nodes.length);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-node-id]')).toHaveCount(
    sheet.nodes.length * 2,
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-node-id]')).toHaveCount(sheet.nodes.length);
  await saved(page);
  await gallery(page);
  await card(page, 'Radial mind map')
    .getByRole('button', { name: 'Use template', exact: true })
    .click();
  const second = await exported(page);
  const firstIds = new Set(identities(original));
  expect(identities(second).some((id) => firstIds.has(id))).toBe(false);
  expect(second.documents[0].pages[0].nodes.map((n) => n.content)).toEqual(
    sheet.nodes.map((n) => n.content),
  );
});

test('template browsing preserves unsaved work and using a template requires replacement confirmation', async ({
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
    .getByRole('textbox', { name: 'Project name', exact: true })
    .fill('Keep my current project');
  await page
    .getByRole('textbox', { name: 'Project name', exact: true })
    .press('Enter');
  await expect(page.getByRole('alert')).toContainText('Local storage');
  await gallery(page);
  await card(page, 'Weekly plan')
    .getByRole('button', { name: 'Use template', exact: true })
    .click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText('unsaved');
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  const retained = await exported(page, false);
  expect(retained.manifest.title).toBe('Keep my current project');
  expect(retained.documents[0].pages[0].nodes).toEqual([]);
  await page
    .getByRole('button', { name: 'Back to projects', exact: true })
    .click();
  await expect(page.locator('.start-project-row.active')).toContainText(
    'Keep my current project',
  );
});

test('templates and created diagrams remain available after an offline restart', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await gallery(page);
  await card(page, 'Simple process')
    .getByRole('button', { name: 'Use template', exact: true })
    .click();
  const initial = await exported(page);
  await restartOffline(page, context);
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  expect((await exported(page)).documents).toEqual(initial.documents);
  await gallery(page);
  await card(page, 'Small team')
    .getByRole('button', { name: 'Preview', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Use template', exact: true })
    .click();
  const next = await exported(page);
  expect(next.manifest.title).toBe('Small team');
  expect(next.manifest.projectId).not.toBe(initial.manifest.projectId);
  expect(next.documents[0].domainModels).toEqual([]);
});

test('a saved local template is an offline snapshot with independent projects and explicit removal', async ({
  page,
  context,
}) => {
  const title = 'Reusable design review';
  const pages = page.getByRole('tablist', {
    name: 'Diagram pages',
    exact: true,
  });
  const addPage = page.getByRole('button', { name: 'Add page', exact: true });
  const projectName = page.getByRole('textbox', {
    name: 'Project name',
    exact: true,
  });
  const local = card(page, title);
  const useTemplate = local.getByRole('button', {
    name: `Use template: ${title}`,
    exact: true,
  });

  await page.goto('/');
  await gallery(page);
  await card(page, 'Simple process')
    .getByRole('button', { name: 'Use template', exact: true })
    .click();
  await addPage.click();
  await expect(pages.getByRole('tab')).toHaveCount(2);
  await pages.getByRole('tab').first().click();
  const original = await exported(page);
  expect(original.documents[0].pages[0].connections.length).toBeGreaterThan(0);

  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: 'File', exact: true })
    .click();
  await page.getByRole('menuitem', { name: /^Save as template/ }).click();
  const saveDialog = page.getByRole('dialog', {
    name: 'Save as template',
    exact: true,
  });
  const templateName = saveDialog.getByRole('textbox', {
    name: 'Template name',
    exact: true,
  });
  await expect(templateName).toBeFocused();
  await expect(templateName).toHaveValue('Simple process');
  await templateName.fill(title);
  await saveDialog.getByRole('button', { name: 'Save template' }).click();
  await expect(saveDialog).toHaveCount(0);
  await expect(projectName).toHaveValue('Simple process');

  // Later edits to the source must not leak into the saved snapshot.
  await addPage.click();
  await expect(pages.getByRole('tab')).toHaveCount(3);
  await saved(page);
  await restartOffline(page, context);
  await gallery(page);
  await page
    .getByRole('combobox', { name: 'Template category', exact: true })
    .selectOption({ label: 'My templates' });
  await expect(local).toBeVisible();
  await expect(card(page, 'Simple process')).toHaveCount(0);
  const search = page.getByRole('searchbox', { name: 'Search templates' });
  await search.fill('does not match');
  await expect(local).toHaveCount(0);
  await search.fill('design review');
  await useTemplate.click();

  const first = await exported(page);
  expect(first.manifest.title).toBe(title);
  expect(first.manifest.projectId).not.toBe(original.manifest.projectId);
  expect(first.documents).toEqual(original.documents);
  await addPage.click();
  await expect(pages.getByRole('tab')).toHaveCount(3);
  await projectName.fill('Edited from template');
  await projectName.press('Enter');
  await saved(page);

  await gallery(page);
  await useTemplate.click();
  const second = await exported(page);
  expect(second.manifest.projectId).not.toBe(first.manifest.projectId);
  expect(second.manifest.projectId).not.toBe(original.manifest.projectId);
  expect(second.documents).toEqual(original.documents);

  await gallery(page);
  const remove = local.getByRole('button', {
    name: `Delete template: ${title}`,
    exact: true,
  });
  const confirmation = page.getByRole('dialog', {
    name: 'Delete template',
    exact: true,
  });
  await remove.click();
  await expect(confirmation).toContainText(title);
  await confirmation
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(local).toBeVisible();
  await remove.click();
  await confirmation
    .getByRole('button', { name: 'Delete template', exact: true })
    .click();
  await expect(local).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to projects' }).click();
  for (const name of ['Simple process', 'Edited from template', title])
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
});

test('the German template flow captures edits even when project autosave fails', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'koxora.preferences.v1',
      JSON.stringify({ locale: 'de' }),
    );
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Neues Projekt', exact: true })
    .click();
  await expect(page.locator('.save-status')).toHaveText(
    'Auf diesem Gerät gespeichert',
  );
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'projects')
        throw new DOMException('Project write failed', 'QuotaExceededError');
      return put.call(this, value, key);
    };
  });
  await page.getByRole('button', { name: 'Seite hinzufügen' }).click();
  await expect(page.getByRole('alert')).toContainText('Lokaler Speicher');
  await page.getByRole('menuitem', { name: 'Datei', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Als Vorlage speichern…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Als Vorlage speichern' });
  const name = dialog.getByRole('textbox', { name: 'Vorlagenname' });
  await name.fill('Teamplanung');
  await name.press('Enter');
  await expect(dialog).toHaveCount(0);

  await page.getByRole('menuitem', { name: 'Datei', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Vorlagen', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Vorlagenkategorie' })
    .selectOption('local');
  const local = card(page, 'Teamplanung');
  await expect(local).toContainText('Seiten: 2');
  await local
    .getByRole('button', { name: 'Vorlage verwenden: Teamplanung' })
    .click();
  await expect(page.getByRole('dialog')).toContainText(
    'Ungespeicherte Änderungen',
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Abbrechen' })
    .click();
  await expect(local).toBeVisible();
});

for (const locale of ['en', 'de'])
  for (const width of [800, 390]) {
    test(`templates search, preview and use remain reachable at ${width}px and 200% in ${locale}`, async ({
      page,
    }) => {
      const messages: Record<string, string> = JSON.parse(
        readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
      );
      await page.addInitScript(
        (language) =>
          localStorage.setItem(
            'koxora.preferences.v1',
            JSON.stringify({
              locale: language,
              theme: 'dark',
              guiScale: 200,
              accessibility: true,
            }),
          ),
        locale,
      );
      await page.setViewportSize({ width, height: 600 });
      await page.goto('/');
      const entry = page.locator('.start-actions').getByRole('button', {
        name: messages['templates.heading'],
        exact: true,
      });
      await reachable(entry);
      await entry.click();
      const search = page.getByRole('searchbox', {
        name: messages['templates.search'],
        exact: true,
      });
      const category = page.getByRole('combobox', {
        name: messages['templates.category'],
        exact: true,
      });
      await reachable(search);
      await reachable(category);
      await category.selectOption('mindmap');
      await search.fill(messages['templates.mindmap-study.title']);
      await expect(page.locator('.template-card')).toHaveCount(1);
      const preview = page.locator('.template-card').getByRole('button', {
        name: messages['templates.preview'],
        exact: true,
      });
      await reachable(preview);
      await preview.click();
      const use = page
        .getByRole('dialog')
        .getByRole('button', { name: messages['templates.use'], exact: true });
      await reachable(use);
      await use.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.interactive-canvas')).toBeVisible();
      // The renderer culls offscreen nodes; fit the entire starter before counting it.
      await page
        .getByRole('button', { name: messages['canvas.fit'], exact: true })
        .click();
      await expect(page.locator('[data-node-id]')).toHaveCount(5);
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
  }
