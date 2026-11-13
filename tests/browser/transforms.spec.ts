import { test, expect, type Page } from '@playwright/test';
import { createProject, exportProject } from '../../packages/project/src/index';
import { applyEdit } from '../../packages/editor-core/src/index';
async function fixture(page: Page) {
  const now = '2026-11-12T12:00:00.000Z';
  let project = createProject(
    'Transform review',
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
      kind: 'triangle',
      position: { x: 0, y: 0 },
      layerId: sheet.layers[0].id,
      text: 'ÄÖ 日本語',
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
      name: 'transform.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  return id;
}
async function transform(page: Page, name: string) {
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: 'Format', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Transform', exact: true }).click();
  await page.getByRole('menuitem', { name, exact: true }).click();
}
test('rotation, mirror, numeric properties, pointer cancel and offline persistence agree', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const id = await fixture(page);
  const node = page.locator(`[data-node-id="${id}"]`).first();
  await node.click();
  await transform(page, 'Rotate 90° clockwise');
  await expect(node).toHaveAttribute('transform', /rotate\(90 /);
  await transform(page, 'Mirror vertically');
  await expect(node.locator('.scene-node')).toHaveAttribute(
    'transform',
    /scale\(1 -1\)/,
  );
  await expect(node).toContainText('ÄÖ 日本語');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(node.locator('.scene-node')).toHaveAttribute(
    'transform',
    /scale\(1 1\)/,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(node.locator('.scene-node')).toHaveAttribute(
    'transform',
    /scale\(1 -1\)/,
  );
  await node.click();
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: 'Format', exact: true })
    .click();
  await page
    .getByRole('menuitem', { name: 'Element properties', exact: true })
    .click();
  const dock = page.getByRole('region', {
    name: 'Element properties',
    exact: true,
  });
  await dock.getByRole('tab', { name: 'Format', exact: true }).click();
  await dock.getByLabel('Rotation (°)', { exact: true }).fill('-450');
  await dock
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(node).toHaveAttribute('transform', /rotate\(270 /);
  const handle = page.locator(`[data-rotate-id="${id}"]`);
  const b = await handle.boundingBox();
  expect(b).not.toBeNull();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + 40, b!.y + 35, { steps: 5 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(node).toHaveAttribute('transform', /rotate\(270 /);
  await node.click();
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.keyboard.down('Shift');
  await page.mouse.move(h.x + 45, h.y + 55, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(node).not.toHaveAttribute('transform', /rotate\(270 /);
  await page.screenshot({
    path: 'node_modules/.cache/koxora/rotation-review.png',
  });
  const result = await node.getAttribute('transform');
  const angle = Number(result!.match(/rotate\(([^ ]+)/)![1]);
  expect(angle % 15).toBe(0);
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
  await expect(node).toHaveAttribute('transform', result!);
  await expect(node.locator('.scene-node')).toHaveAttribute(
    'transform',
    /scale\(1 -1\)/,
  );
});
test('system defaults track the OS while explicit choices persist', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    locale: 'de-DE',
    colorScheme: 'dark',
    baseURL,
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Settings…', exact: true }).click();
  await page.getByLabel('Language', { exact: true }).selectOption('system');
  await page.getByLabel('Darstellung', { exact: true }).selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Sprache', { exact: true }).selectOption('en');
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('footer')).toHaveCount(0);
  await context.close();
});
test('start page reflows at every scale in a small window and rename stays accessible', async ({
  page,
}) => {
  await fixture(page);
  if (!(await page.locator('.project-sidebar').isVisible()))
    await page
      .getByRole('button', { name: 'Project navigator', exact: true })
      .click();
  await page.getByRole('button', { name: /^Local projects/ }).click();
  for (const width of [1024, 640, 390]) {
    await page.setViewportSize({ width, height: 480 });
    for (const scale of ['100', '125', '150', '175', '200']) {
      await page
        .getByRole('button', { name: 'Settings…', exact: true })
        .click();
      await page
        .getByLabel('Interface scale', { exact: true })
        .selectOption(scale);
      await page.keyboard.press('Escape');
      const rename = page
        .locator('.studio-start')
        .getByRole('button', { name: 'Rename', exact: true });
      await expect(rename.locator('[data-icon="edit"]')).toHaveCount(1);
      await rename.scrollIntoViewIfNeeded();
      await expect(rename).toBeInViewport();
      expect(
        await page
          .locator('.studio-start')
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page
    .locator('.studio-start')
    .getByRole('button', { name: 'Rename', exact: true })
    .click();
  await page.getByLabel('Project name', { exact: true }).fill('Renamed Ω');
  await page.getByLabel('Project name', { exact: true }).press('Enter');
  await expect(
    page
      .locator('.studio-start')
      .getByRole('heading', { name: 'Renamed Ω', exact: true }),
  ).toBeVisible();
});
