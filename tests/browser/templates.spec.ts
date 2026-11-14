import { expect, test, type Locator, type Page } from '@playwright/test';
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
  await expect(page.locator('.template-card')).toHaveCount(8);
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
    const box = (element as SVGGraphicsElement).getBBox();
    return { y: box.y, height: box.height };
  });
  const notesBox = await notesLine.evaluate((element) => {
    const box = (element as SVGGraphicsElement).getBBox();
    return { y: box.y, height: box.height };
  });
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
  await expect(page.locator('.template-card')).toHaveCount(8);
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
