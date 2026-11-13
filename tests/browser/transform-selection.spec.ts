import { expect, test, type Page } from '@playwright/test';
import { createProject, exportProject } from '../../packages/project/src/index';
import { applyEdit } from '../../packages/editor-core/src/index';

async function importElements(
  page: Page,
  kinds: ('rectangle' | 'triangle' | 'arrow')[],
) {
  const now = '2026-11-12T12:00:00.000Z';
  let project = createProject(
    'Transform selection',
    () => crypto.randomUUID(),
    now,
  );
  const document = project.documents[0],
    sheet = document.pages[0];
  const ids = kinds.map(() => crypto.randomUUID());
  for (const [index, kind] of kinds.entries()) {
    project = applyEdit(
      project,
      document.id,
      sheet.id,
      {
        type: 'insert',
        id: ids[index],
        kind,
        position: { x: kinds.length === 1 ? 0 : index * 280 - 140, y: 0 },
        layerId: sheet.layers[0].id,
      },
      now,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'selection.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  return ids;
}
async function menu(page: Page, name: string) {
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name, exact: true })
    .click();
}

test('batch rotation refreshes its numeric value and unchanged blur cannot undo a later command', async ({
  page,
}) => {
  const ids = await importElements(page, ['rectangle', 'triangle']);
  await menu(page, 'Edit');
  await page.getByRole('menuitem', { name: 'Select all', exact: true }).click();
  const dock = page.getByRole('region', {
    name: 'Format selection',
    exact: true,
  });
  const angle = dock.getByLabel('Rotation (°)', { exact: true });
  await expect(angle).toHaveValue('0');
  await angle.fill('30');
  await angle.press('Tab');
  for (const id of ids)
    await expect(page.locator(`[data-node-id="${id}"]`)).toHaveAttribute(
      'transform',
      /rotate\(30 /,
    );
  await dock
    .getByRole('button', { name: 'Rotate 90° clockwise', exact: true })
    .click();
  await expect(angle).toHaveValue('120');
  await angle.focus();
  await angle.press('Tab');
  for (const id of ids)
    await expect(page.locator(`[data-node-id="${id}"]`)).toHaveAttribute(
      'transform',
      /rotate\(120 /,
    );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  for (const id of ids)
    await expect(page.locator(`[data-node-id="${id}"]`)).toHaveAttribute(
      'transform',
      /rotate\(30 /,
    );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  for (const id of ids)
    await expect(page.locator(`[data-node-id="${id}"]`)).toHaveAttribute(
      'transform',
      /rotate\(120 /,
    );
});

test('resizing a mirrored arrow endpoint keeps its fixed endpoint and arrowhead direction', async ({
  page,
}) => {
  const [id] = await importElements(page, ['arrow']);
  const node = page.locator(`[data-node-id="${id}"]`);
  await menu(page, 'Edit');
  await page.getByRole('menuitem', { name: 'Select all', exact: true }).click();
  const path = node.locator('.scene-connection');
  const unreflected = await path.getAttribute('d');
  await menu(page, 'Format');
  await page.getByRole('menuitem', { name: 'Transform', exact: true }).click();
  await page
    .getByRole('menuitem', { name: 'Mirror horizontally', exact: true })
    .click();
  await expect(path).not.toHaveAttribute('d', unreflected!);
  const before = (await path.getAttribute('d'))!;
  const endpoints = (value: string) =>
    value.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number);
  const [startX, startY, endX] = endpoints(before);
  expect(startX).toBeGreaterThan(endX);
  const handle = page.locator(`[data-resize-id="${id}"][data-handle="end"]`);
  await expect(handle).toBeVisible();
  await handle.click({ trial: true });
  const rect = (await handle.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.keyboard.down('Alt');
  await page.mouse.move(rect.x - 65, rect.y + 50, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await expect(path).not.toHaveAttribute('d', before);
  const [ax, ay, bx, by] = endpoints((await path.getAttribute('d'))!);
  expect(ax).toBeCloseTo(startX, 6);
  expect(ay).toBeCloseTo(startY, 6);
  expect(bx).toBeLessThan(endX);
  const arrow = node.locator('.scene-arrow');
  const [headX, headY, headAngle] = endpoints(
    (await arrow.getAttribute('transform'))!,
  );
  expect(headX).toBeCloseTo(bx, 6);
  expect(headY).toBeCloseTo(by, 6);
  expect(headAngle).toBeCloseTo(
    (Math.atan2(by - ay, bx - ax) * 180) / Math.PI,
    6,
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(path).toHaveAttribute('d', before);
});
