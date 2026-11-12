import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  createProject,
  exportProject,
  type Project,
} from '../../packages/project/src/index';
import { applyEdit, elementLink } from '../../packages/editor-core/src/index';
const now = '2026-11-09T00:00:00.000Z';
function fixture(title: string, locked = false) {
  let project = createProject(title, randomUUID, now);
  const doc = project.documents[0],
    page = doc.pages[0];
  for (const [i, x] of [0, 1400].entries())
    project = applyEdit(
      project,
      doc.id,
      page.id,
      {
        type: 'insert',
        id: randomUUID(),
        kind: 'rectangle',
        position: { x, y: i ? 900 : 0 },
        layerId: page.layers[0].id,
        text: i ? 'Destination' : 'Source',
      },
      now,
    );
  if (locked) project.documents[0].pages[0].layers[0].locked = true;
  return project;
}
async function imported(page: Page, project: Project) {
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'project.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
}
async function properties(page: Page, id: string) {
  const picker = page.getByLabel('Diagram element', { exact: true });
  if (!(await picker.isVisible()))
    await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await picker.selectOption(id);
  const dock = page.getByRole('region', {
    name: 'Element properties',
    exact: true,
  });
  await dock.getByRole('tab', { name: 'Links', exact: true }).click();
  return dock;
}
async function select(page: Page, id: string) {
  const d = await properties(page, id);
  await d.getByRole('button', { name: 'Discard', exact: true }).click();
}
async function follow(page: Page, name = 'Open link') {
  const canvas = page.locator('.interactive-canvas');
  await canvas.focus();
  await canvas.press('Shift+F10');
  await page.getByRole('menuitem', { name, exact: true }).click();
}
async function german(page: Page) {
  await page.getByRole('button', { name: 'Settings…', exact: true }).click();
  const settings = page.getByRole('dialog');
  await settings
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await settings
    .getByRole('button', { name: 'Schließen', exact: true })
    .click();
}
test('authors foreign project and element targets, saves drafts and highlights locked destinations offline', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1500, height: 1100 });
  await page.goto('/');
  const dest = fixture('Destination project', true),
    source = fixture('Source project');
  const p = source.documents[0].pages[0],
    target = dest.documents[0].pages[0];
  await imported(page, dest);
  await imported(page, source);
  const dialog = await properties(page, p.nodes[0].id);
  await dialog.getByLabel('Link type', { exact: true }).selectOption('project');
  await dialog
    .getByLabel('Destination project', { exact: true })
    .selectOption(dest.manifest.projectId);
  await expect(
    dialog.getByLabel('Destination page', { exact: true }),
  ).toBeEnabled();
  await dialog
    .getByLabel('Destination page', { exact: true })
    .selectOption(target.id);
  await dialog
    .getByLabel('Destination element', { exact: true })
    .selectOption(target.nodes[1].id);
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Project name', exact: true })
    .fill('Source draft saved');
  await follow(page);
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Destination project');
  await expect(page.locator('.interactive-canvas')).toHaveAttribute(
    'data-navigation-target',
    target.nodes[1].id,
  );
  await expect(
    page.locator(`[data-navigation-highlight="${target.nodes[1].id}"]`),
  ).toBeVisible();
  await expect(page.locator('.interactive-canvas')).toHaveAttribute(
    'data-selection',
    '[]',
  );
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
  await page
    .locator('.project-card')
    .filter({ hasText: 'Source draft saved' })
    .getByRole('button', { name: 'Open project', exact: true })
    .click();
  await expect(page.locator('.interactive-canvas')).not.toHaveAttribute(
    'data-navigation-target',
    target.nodes[1].id,
  );
  await select(page, p.nodes[0].id);
  await follow(page);
  await expect(page.locator('.interactive-canvas')).toHaveAttribute(
    'data-navigation-target',
    target.nodes[1].id,
  );
});
test('local element navigation centers/selects, survives history, and clears after ordinary page changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  let project = fixture('Local elements');
  const doc = project.documents[0],
    p = doc.pages[0];
  project = applyEdit(
    project,
    doc.id,
    p.id,
    {
      type: 'link',
      id: p.nodes[1].id,
      link: {
        target: { type: 'project', projectId: randomUUID() },
        actionId: randomUUID(),
      },
    },
    now,
  );
  await imported(page, project);
  const dialog = await properties(page, p.nodes[0].id);
  await dialog.getByLabel('Link type', { exact: true }).selectOption('element');
  await dialog
    .getByLabel('Destination element', { exact: true })
    .selectOption(p.nodes[1].id);
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await select(page, p.nodes[0].id);
  await follow(page);
  await expect(page.locator('.interactive-canvas')).toHaveAttribute(
    'data-selection',
    JSON.stringify([p.nodes[1].id]),
  );
  const camera = JSON.parse(
    (await page.locator('.interactive-canvas').getAttribute('data-camera')) ??
      '{}',
  ) as { x: number; y: number };
  expect(camera.x).toBeGreaterThan(1000);
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const zoomBefore = (
    JSON.parse(
      (await page.locator('.interactive-canvas').getAttribute('data-camera')) ??
        '{}',
    ) as { zoom: number }
  ).zoom;
  await follow(page);
  await expect(
    page.getByRole('dialog', { name: 'Destination unavailable' }),
  ).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const zoomAfter = (
    JSON.parse(
      (await page.locator('.interactive-canvas').getAttribute('data-camera')) ??
        '{}',
    ) as { zoom: number }
  ).zoom;
  expect(zoomAfter).toBe(zoomBefore);
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          JSON.parse(
            (await page
              .locator('.interactive-canvas')
              .getAttribute('data-camera')) ?? '{}',
          ) as { x: number }
        ).x,
    )
    .toBeGreaterThan(1000);
  await select(page, p.nodes[0].id);
  await follow(page);
  await page.getByRole('button', { name: 'New page', exact: true }).click();
  await expect(
    page.getByRole('treeitem', { name: 'Page 2', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.interactive-canvas')).not.toHaveAttribute(
    'data-navigation-target',
    p.nodes[1].id,
  );
  await expect(
    page.getByText(
      'The destination page is unavailable. Choose another page in Element properties.',
      { exact: true },
    ),
  ).toHaveCount(0);
});
test('missing projects offer explicit locate/import without switching workspace', async ({
  page,
}) => {
  await page.goto('/');
  let project = fixture('Missing target');
  const d = project.documents[0],
    p = d.pages[0];
  project = applyEdit(
    project,
    d.id,
    p.id,
    {
      type: 'link',
      id: p.nodes[0].id,
      link: {
        target: { type: 'project', projectId: randomUUID() },
        actionId: randomUUID(),
      },
    },
    now,
  );
  expect(elementLink(project, p.nodes[0].id).state).toBe('ready');
  await imported(page, project);
  await select(page, p.nodes[0].id);
  await follow(page);
  await expect(
    page.getByRole('dialog', { name: 'Destination unavailable' }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Missing target');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Locate by importing .koxora…', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Import .koxora' }),
  ).toBeVisible();
});

test('hidden foreign elements stay hidden and report unavailable in German', async ({
  page,
}) => {
  await page.goto('/');
  const dest = fixture('Hidden destination');
  const target = dest.documents[0].pages[0];
  target.layers[0].visible = false;
  let source = fixture('Visible source');
  const doc = source.documents[0],
    p = doc.pages[0];
  source = applyEdit(
    source,
    doc.id,
    p.id,
    {
      type: 'link',
      id: p.nodes[0].id,
      link: {
        target: {
          type: 'project',
          projectId: dest.manifest.projectId,
          pageId: target.id,
          elementId: target.nodes[1].id,
        },
        actionId: randomUUID(),
      },
    },
    now,
  );
  await imported(page, dest);
  await imported(page, source);
  await select(page, p.nodes[0].id);
  await german(page);
  await follow(page, 'Link öffnen');
  await expect(
    page.getByRole('dialog', { name: 'Ziel nicht verfügbar' }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Projektname', exact: true }),
  ).toHaveValue('Visible source');
  await expect(page.locator('[data-navigation-highlight]')).toHaveCount(0);
});
