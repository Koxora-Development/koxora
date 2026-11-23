import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
  type Project,
} from '../../packages/project/src/index';
import { applyEdit } from '../../packages/editor-core/src/index';

async function open(page: Page, project: Project) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'layout-feedback.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
}
function fixture(kind: 'rectangle' | 'table' = 'rectangle') {
  const now = '2026-11-16T18:00:00.000Z';
  let project = createProject(
    'Readable editing controls',
    () => crypto.randomUUID(),
    now,
  );
  const workbook = project.documents[0],
    sheet = workbook.pages[0];
  const id = crypto.randomUUID();
  project = applyEdit(
    project,
    workbook.id,
    sheet.id,
    {
      type: 'insert',
      id,
      kind,
      position: { x: -267.5202911305816, y: 13.987654321 },
      layerId: sheet.layers[0].id,
      geometry: {
        x: -267.5202911305816,
        y: 13.987654321,
        width: 160,
        height: 100,
        rotation: 0,
      },
      text: kind === 'rectangle' ? 'Research options' : '',
    },
    now,
  );
  return { project, id };
}
async function selectProperties(page: Page, id: string) {
  if (!(await page.locator('.objects-panel').isVisible()))
    await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByLabel('Diagram element', { exact: true }).selectOption(id);
  const panel = page.getByRole('complementary', {
    name: 'Properties',
    exact: true,
  });
  if (!(await panel.isVisible()))
    await page.getByRole('button', { name: 'Properties', exact: true }).click();
  return panel;
}

test('ordinary labels wrap at word boundaries and precise geometry stays intact after reading rounded fields', async ({
  page,
}) => {
  const { project, id } = fixture();
  await open(page, project);
  const label = page.locator(`[data-node-id="${id}"] text.scene-label`);
  await expect(label.locator('tspan')).toHaveText(['Research', 'options']);
  const panel = await selectProperties(page, id);
  await panel.getByRole('tab', { name: 'Format', exact: true }).click();
  const x = panel.getByLabel('Position X', { exact: true });
  await expect(x).toHaveValue('-267.52');
  await x.focus();
  await panel.getByLabel('Position Y', { exact: true }).focus();
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  const archive = await importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
  expect(archive.documents[0].pages[0].nodes[0].geometry.x).toBe(
    -267.5202911305816,
  );
  await x.fill('-123.456789');
  await panel.getByLabel('Position Y', { exact: true }).focus();
  await expect(x).toHaveValue('-123.46');
  const changed = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  const edited = await importProject(
    new Uint8Array(readFileSync((await (await changed).path())!)),
  );
  expect(edited.documents[0].pages[0].nodes[0].geometry).toMatchObject({
    x: -123.456789,
    y: 13.987654321,
  });
});

test('properties show the complete default table grid and a readable text size field', async ({
  page,
}) => {
  const { project, id } = fixture('table');
  await open(page, project);
  const panel = await selectProperties(page, id);
  await panel.getByRole('tab', { name: 'Text', exact: true }).click();
  expect((await panel.boundingBox())!.width).toBeGreaterThanOrEqual(359);
  const grid = panel.locator('.table-cell-scroll');
  expect(
    await grid.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  const size = panel.getByRole('spinbutton', {
    name: 'Text size',
    exact: true,
  });
  expect((await size.boundingBox())!.width).toBeGreaterThanOrEqual(75);
  await size.focus();
  expect(
    await size.evaluate((element) =>
      parseFloat(getComputedStyle(element).outlineOffset),
    ),
  ).toBeLessThanOrEqual(0);
});
