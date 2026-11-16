import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';
import { CONNECTION_KEY } from '../../packages/editor-core/src/index';

test('line presets create routed free connections and preserve both arrowheads in native projects', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const project = createProject(
    'Line preset review',
    () => crypto.randomUUID(),
    '2026-11-16T18:00:00.000Z',
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'line-presets.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  await page
    .getByRole('combobox', { name: 'Show library', exact: true })
    .selectOption('drawing');
  await page
    .locator('.shape-palette')
    .getByRole('button', { name: 'Line', exact: true })
    .click();
  const presets = page.getByRole('combobox', {
    name: 'Line / arrow style',
    exact: true,
  });
  await expect(presets.locator('option:not(:disabled)')).toHaveCount(9);
  await presets.selectOption('curved-both');
  await expect(
    page.getByRole('combobox', { name: 'Connection path', exact: true }),
  ).toHaveValue('curved');
  const canvas = (await page.locator('.interactive-canvas').boundingBox())!;
  await page.mouse.move(
    canvas.x + canvas.width * 0.25,
    canvas.y + canvas.height * 0.35,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvas.x + canvas.width * 0.7,
    canvas.y + canvas.height * 0.7,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.locator('[data-connection-id]')).toHaveCount(1);
  await expect(page.locator('.scene-connection')).toHaveAttribute('d', /C/);
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  const reopened = await importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
  const edge = reopened.documents[0].pages[0].connections[0];
  expect(edge.sourcePoint).toBeDefined();
  expect(edge.targetPoint).toBeDefined();
  expect(edge.extensions[CONNECTION_KEY]).toMatchObject({
    routing: 'curved',
    arrow: true,
    startArrow: true,
  });
});
