import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { waitForCanvasLayout } from './canvas-layout';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';
import {
  applyEdit,
  TEXT_REGIONS_KEY,
  type TableTextRegions,
} from '../../packages/editor-core/src/index';
async function open(page: Page, transformed = false) {
  const now = '2026-11-16T18:00:00.000Z';
  let project = createProject(
    'Canvas cell interaction',
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
      kind: 'table',
      layerId: sheet.layers[0].id,
      position: { x: 0, y: 0 },
      geometry: {
        x: -180,
        y: -105,
        width: 360,
        height: 210,
        rotation: transformed ? 30 : 0,
        ...(transformed ? { flipX: true, flipY: true } : {}),
      },
      text: 'Header',
    },
    now,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'canvas.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  const region = page.locator(
    `[data-node-id="${id}"] [data-text-region="cell-0-0"]`,
  );
  await waitForCanvasLayout(region);
  const point = await region.evaluate((el) => {
    const f = el as SVGForeignObjectElement;
    const p = new DOMPoint(
      f.x.baseVal.value + f.width.baseVal.value / 2,
      f.y.baseVal.value + f.height.baseVal.value / 2,
    ).matrixTransform(f.getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  // The contextual toolbar changes the canvas height after entering a cell.
  await page.mouse.click(point.x, point.y);
  const toolbar = page.locator('.canvas-table-toolbar'),
    grid = page.locator('.canvas-table-grid');
  await expect(toolbar).toBeVisible();
  return { toolbar, grid, id };
}
async function exported(page: Page) {
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
}
test('cell typing, merged range extension, native heading activation and focus stay on the canvas', async ({
  page,
}) => {
  const { toolbar, grid } = await open(page);
  const editor = grid.locator('[contenteditable]');
  await editor.fill('A');
  await editor.press('Tab');
  await expect(toolbar.locator('.canvas-table-address')).toHaveText('B1');
  await expect(grid.locator('[data-canvas-cell="0-1"]')).toBeFocused();
  await page.keyboard.press('x');
  await expect(editor).toBeFocused();
  await page.keyboard.press('y');
  await expect(editor).toHaveText('xy');
  await editor.press('Escape');
  const row = grid.getByRole('button', { name: 'Select row 1', exact: true });
  await row.focus();
  await row.press('Enter');
  await expect(
    grid.locator('[role="gridcell"][aria-selected="true"]'),
  ).toHaveCount(3);
  await grid.locator('[data-canvas-cell="0-0"]').click();
  await grid
    .locator('[data-canvas-cell="0-1"]')
    .click({ modifiers: ['Shift'] });
  await toolbar
    .getByRole('button', { name: 'Merge selected cells', exact: true })
    .click();
  const merged = grid.locator('[data-canvas-cell="0-0"]');
  await merged.focus();
  await merged.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(
    grid.locator('[role="gridcell"][aria-selected="true"]'),
  ).toHaveCount(2);
  await toolbar.getByRole('button', { name: 'Edit cell', exact: true }).click();
  await expect(editor).toBeFocused();
  await toolbar.locator('.canvas-table-source textarea').focus();
  await toolbar.getByRole('button', { name: 'Edit cell', exact: true }).click();
  await expect(editor).toBeFocused();
  await page.screenshot({
    path: test.info().outputPath('direct-table-rich-editor.png'),
  });
  await toolbar
    .getByRole('button', { name: 'Finish table editing', exact: true })
    .click();
  await expect(page.locator('.interactive-canvas')).toBeFocused();
  const saved = await exported(page),
    regions = saved.documents[0].pages[0].nodes[0].extensions[
      TEXT_REGIONS_KEY
    ] as unknown as TableTextRegions;
  expect(regions.cells[0][0]).toBe('A\nxy');
});
test('rotated reflected table resize follows its header and shrinking the window closes properties', async ({
  page,
}) => {
  const { toolbar, grid, id } = await open(page, true);
  const divider = grid.locator('.canvas-table-resize.column').first();
  await expect(divider).toBeVisible();
  await waitForCanvasLayout(divider);
  // Transform the header's local center through the rendered table geometry.
  // WebKit's transformed HTML bounds can include the wrong corner for this hit target.
  const { x, y } = await divider.evaluate((element, id) => {
    const handle = element as HTMLElement;
    const table = document.querySelector<SVGGraphicsElement>(
      `[data-node-id="${id}"]`,
    )!;
    const center = new DOMPoint(
      handle.offsetLeft + handle.offsetWidth / 2,
      handle.offsetTop + handle.offsetHeight / 2,
    ).matrixTransform(table.getScreenCTM()!);
    if (document.elementFromPoint(center.x, center.y) !== handle)
      throw new Error(
        'The projected column boundary must hit its resize handle',
      );
    return { x: center.x, y: center.y };
  }, id);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(
    x - 30 * Math.cos(Math.PI / 6),
    y - 30 * Math.sin(Math.PI / 6),
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(divider).toHaveAttribute('aria-valuenow', '125');
  await page.screenshot({
    path: test.info().outputPath('direct-table-transformed.png'),
  });
  await toolbar
    .getByRole('button', { name: 'Finish table editing', exact: true })
    .click();
  const saved = await exported(page),
    node = saved.documents[0].pages[0].nodes[0],
    regions = node.extensions[TEXT_REGIONS_KEY] as unknown as TableTextRegions;
  // Rotated pointer coordinates are rounded differently by browser engines.
  // A 0.05 weight tolerance is less than 0.06 canvas pixels for this fixture.
  expect(regions.columnWidths![0]).toBeCloseTo(125, 1);
  expect(regions.columnWidths![1]).toBeCloseTo(75, 1);
  expect(regions.columnWidths![0] + regions.columnWidths![1]).toBeCloseTo(200);
  expect(regions.columnWidths![2]).toBe(100);
  expect(node.geometry).toMatchObject({
    rotation: 30,
    flipX: true,
    flipY: true,
    width: 360,
    height: 210,
  });
  const panel = page.locator('.office-properties');
  if (!(await panel.isVisible()))
    await page.getByRole('button', { name: 'Properties', exact: true }).click();
  await expect(panel).toBeVisible();
  await page.setViewportSize({ width: 390, height: 600 });
  await expect(panel).toHaveCount(0);
  const fit = page.getByRole('button', { name: 'Fit content', exact: true });
  await fit.scrollIntoViewIfNeeded();
  await expect(fit).toBeInViewport();
  await fit.click();
});
