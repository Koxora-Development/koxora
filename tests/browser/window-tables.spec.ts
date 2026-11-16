import { expect, test, type Page, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';
import {
  applyEdit,
  fromPlainText,
  TEXT_REGIONS_KEY,
  type TableTextRegions,
} from '../../packages/editor-core/src/index';
async function open(page: Page, locale = 'en', scale = 100, cell = '0-0') {
  await page.addInitScript(
    ({ locale, scale }) =>
      localStorage.setItem(
        'koxora.preferences.v1',
        JSON.stringify({ locale, theme: 'light', guiScale: scale }),
      ),
    { locale, scale },
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  const t: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  const now = '2026-11-15T20:00:00.000Z';
  let p = createProject(
    'Window and table review',
    () => crypto.randomUUID(),
    now,
  );
  const d = p.documents[0],
    sheet = d.pages[0],
    id = crypto.randomUUID();
  p = applyEdit(
    p,
    d.id,
    sheet.id,
    {
      type: 'insert',
      id,
      kind: 'table',
      layerId: sheet.layers[0].id,
      position: { x: 0, y: 0 },
      text: 'Header',
    },
    now,
  );
  p = applyEdit(
    p,
    d.id,
    sheet.id,
    {
      type: 'regionText',
      id,
      target: { type: 'table-cell', row: 1, column: 1 },
      value: fromPlainText('Body'),
    },
    now,
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: t['project.import'], exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel(t['project.import'], { exact: true })
    .setInputFiles({
      name: 'table.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(p)),
    });
  await expect(page.locator('.save-status')).toHaveText(t['project.saved']);
  const region = page.locator(
    `[data-node-id="${id}"] [data-text-region="cell-${cell}"]`,
  );
  const point = await region.evaluate((el) => {
    const element = el as SVGGraphicsElement,
      box = element.getBBox(),
      matrix = element.getScreenCTM()!;
    const point = new DOMPoint(
      box.x + box.width / 2,
      box.y + box.height / 2,
    ).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  });
  await page.mouse.dblclick(point.x, point.y);
  const dialog = page.locator('.canvas-text-dialog');
  await expect(dialog).toBeVisible();
  return { dialog, t, id };
}
async function within(dialog: Locator) {
  await expect
    .poll(async () =>
      dialog.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left >= 7 &&
          r.top >= 7 &&
          r.right <= innerWidth - 7 &&
          r.bottom <= innerHeight - 7
        );
      }),
    )
    .toBe(true);
  expect(
    await dialog.evaluate((el) => el.scrollHeight >= el.clientHeight),
  ).toBe(true);
}
for (const locale of ['en', 'de'])
  for (const scale of [100, 200])
    test(`floating editor remains visible and movable ${locale} ${scale}`, async ({
      page,
    }) => {
      const { dialog, t } = await open(page, locale, scale);
      await within(dialog);
      const handle = dialog.getByRole('button', {
        name: t['window.move'],
        exact: true,
      });
      await handle.focus();
      const before = (await dialog.boundingBox())!;
      await handle.press('ArrowLeft');
      expect((await dialog.boundingBox())!.x).toBeLessThan(before.x);
      const grip = (await handle.boundingBox())!;
      await page.mouse.move(grip.x + 20, grip.y + 10);
      await page.mouse.down();
      await page.mouse.move(1430, 990, { steps: 8 });
      await page.mouse.up();
      await within(dialog);
      await dialog
        .getByRole('button', { name: t['regions.editTable'], exact: true })
        .click();
      await within(dialog);
      await page.setViewportSize({ width: 390, height: 600 });
      await within(dialog);
      await handle.scrollIntoViewIfNeeded();
      await expect(handle).toBeInViewport();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      expect(
        await page.evaluate(() => document.activeElement?.isConnected),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.activeElement?.closest('dialog') === null,
        ),
      ).toBe(true);
    });
test('table structure, heading selection, merged content and quoted clipboard persist', async ({
  page,
}) => {
  const { dialog, t } = await open(page);
  await dialog
    .getByRole('button', { name: t['regions.editTable'], exact: true })
    .click();
  const grid = dialog.locator('.table-cell-editor');
  await dialog
    .getByRole('button', { name: 'Insert row above', exact: true })
    .click();
  await expect(
    dialog.getByRole('combobox', { name: 'Rows', exact: true }),
  ).toHaveValue('4');
  await expect(grid.locator('[data-table-cell="1-0"]')).toHaveText('Header');
  await grid.getByRole('button', { name: 'Select row 2', exact: true }).click();
  const copied = await grid
    .getByRole('button', { name: 'Select row 2', exact: true })
    .evaluate((el) => {
      const data = new DataTransfer();
      el.dispatchEvent(
        new ClipboardEvent('copy', { bubbles: true, clipboardData: data }),
      );
      return data.getData('text/plain');
    });
  expect(copied).toBe('Header\t\t\n');
  await dialog
    .getByRole('button', { name: 'Merge selected cells', exact: true })
    .click();
  await expect(grid.locator('[data-table-cell="1-0"]')).toHaveText('Header');
  await expect(
    grid.locator('[data-table-cell="1-0"]').locator('..'),
  ).toHaveAttribute('colspan', '3');
  await dialog.getByRole('button', { name: 'Split cell', exact: true }).click();
  await grid.locator('[data-table-cell="1-0"]').click();
  await grid.locator('[data-table-cell="1-0"]').evaluate((el) => {
    const data = new DataTransfer();
    data.setData('text/plain', '"First\nSecond"\tValue');
    el.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, clipboardData: data }),
    );
  });
  await expect(grid.locator('[data-table-cell="1-0"]')).toContainText('First');
  await expect(grid.locator('[data-table-cell="1-1"]')).toHaveText('Value');
  await grid.locator('[data-table-cell="1-0"]').evaluate((el) => {
    const data = new DataTransfer();
    data.setData('image/png', 'unsupported');
    el.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, clipboardData: data }),
    );
  });
  await expect(grid.locator('[data-table-cell="1-0"]')).toContainText('Second');
  await grid.getByRole('button', { name: 'Select row 2', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Delete selected rows', exact: true })
    .click();
  const confirm = page.getByRole('dialog', {
    name: t['regions.resizeTitle'],
    exact: true,
  });
  await expect(confirm).toBeVisible();
  await confirm
    .getByRole('button', { name: t['project.cancel'], exact: true })
    .click();
  await expect(grid.locator('[data-table-cell="1-0"]')).toContainText('Second');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.save-status')).toHaveText(t['project.saved']);
  const downloaded = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  const p = await importProject(
    new Uint8Array(readFileSync((await (await downloaded).path())!)),
  );
  const regions = p.documents[0].pages[0].nodes[0].extensions[
    TEXT_REGIONS_KEY
  ] as unknown as TableTextRegions;
  expect(regions.cells[1].slice(0, 2)).toEqual(['First\nSecond', 'Value']);
  expect(regions.cells).toHaveLength(4);
});

test('expanded categories expose a second real browser batch and searchable device shapes', async ({
  page,
}) => {
  await open(page);
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Browse elements…', exact: true })
    .click();
  const browser = page.locator('.element-browser-dialog');
  await expect(browser.locator('[data-library-kind]')).toHaveCount(48);
  await browser.locator('.element-browser-more').click();
  await expect(browser.locator('[data-library-kind]')).toHaveCount(59);
  await browser.getByRole('searchbox').fill('server');
  await expect(browser.locator('[data-library-kind]')).toHaveCount(1);
  await browser.locator('[data-library-kind="server"]').click();
  await expect(
    page
      .getByRole('toolbar', { name: 'Diagram tools', exact: true })
      .getByRole('button', { name: 'Server', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('table tools focus the clicked cell instead of changing the keyboard origin', async ({
  page,
}) => {
  const { dialog, t } = await open(page, 'en', 100, '1-1');
  await dialog
    .getByRole('button', { name: t['regions.editTable'], exact: true })
    .click();
  await expect(dialog.locator('[data-table-cell="1-1"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('[data-table-cell="1-2"]')).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('table-tools.png') });
});
