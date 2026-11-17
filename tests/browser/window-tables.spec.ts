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
  shapeKinds,
  type TableTextRegions,
} from '../../packages/editor-core/src/index';

async function open(
  page: Page,
  locale = 'en',
  scale = 100,
  cell = '0-0',
  kind: 'table' | 'rectangle' = 'table',
) {
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
      kind,
      layerId: sheet.layers[0].id,
      position: { x: 0, y: 0 },
      text: 'Header',
    },
    now,
  );
  if (kind === 'table')
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
    kind === 'table'
      ? `[data-node-id="${id}"] [data-text-region="cell-${cell}"]`
      : `[data-node-id="${id}"] .scene-node`,
  );
  await region.scrollIntoViewIfNeeded();
  const point = await region.evaluate((el) => {
    const element = el as SVGGraphicsElement;
    // WebKit can report foreignObject bounds at the origin instead of x/y.
    const box =
      element instanceof SVGForeignObjectElement
        ? {
            x: element.x.baseVal.value,
            y: element.y.baseVal.value,
            width: element.width.baseVal.value,
            height: element.height.baseVal.value,
          }
        : element.getBBox();
    const matrix = element.getScreenCTM()!;
    const point = new DOMPoint(
      box.x + box.width / 2,
      box.y + box.height / 2,
    ).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  });
  // Table editing begins on the first click; a second click can hit a new
  // cell after the contextual toolbar changes the canvas height.
  if (kind === 'table') await page.mouse.click(point.x, point.y);
  else await page.mouse.dblclick(point.x, point.y);
  const dialog = page.locator('.canvas-text-dialog'),
    toolbar = page.locator('.canvas-table-toolbar'),
    grid = page.locator('.canvas-table-grid');
  if (kind === 'table') {
    await expect(toolbar).toBeVisible();
    await expect(grid).toBeVisible();
    const [row, column] = cell.split('-').map(Number);
    await expect(toolbar.locator('.canvas-table-address')).toHaveText(
      `${String.fromCharCode(65 + column)}${row + 1}`,
    );
    await expect(dialog).toHaveCount(0);
  } else await expect(dialog).toBeVisible();
  return { dialog, toolbar, grid, t, id };
}
async function within(dialog: Locator) {
  await expect
    .poll(() =>
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
async function chooseCell(grid: Locator, cell: string) {
  const editor = grid.locator(
    '.canvas-cell-input [contenteditable][role="textbox"]',
  );
  if (await editor.count()) await editor.press('Escape');
  await grid.locator(`[data-canvas-cell="${cell}"]`).click();
}
async function structure(toolbar: Locator, label: string) {
  const details = toolbar.locator(
    ':scope > [role="toolbar"] > details:not(.font-picker)',
  );
  if ((await details.getAttribute('open')) === null)
    await details.locator('summary').click();
  await details.getByRole('button', { name: label, exact: true }).click();
}
async function exported(page: Page, t: Record<string, string>) {
  await expect(page.locator('.save-status')).toHaveText(t['project.saved']);
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: t['project.export'], exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await download).path())!)),
  );
}
async function dragDivider(
  page: Page,
  grid: Locator,
  axis: 'row' | 'column',
  delta: number,
) {
  const divider = grid.locator(`.canvas-table-resize.${axis}`).first();
  const box = (await divider.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(
    x + (axis === 'column' ? delta : 0),
    y + (axis === 'row' ? delta : 0),
    { steps: 5 },
  );
  await page.mouse.up();
}
for (const locale of ['en', 'de'])
  for (const scale of [100, 200])
    test(`floating editor remains visible and movable ${locale} ${scale}`, async ({
      page,
    }) => {
      const { dialog, t } = await open(page, locale, scale, '0-0', 'rectangle');
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

test('canvas table headings, structure, merged content and quoted clipboard persist', async ({
  page,
}) => {
  const { toolbar, grid, t } = await open(page);
  await structure(toolbar, t['regions.row.before']);
  await expect(grid).toHaveAttribute('aria-rowcount', '4');
  await expect(grid.locator('[data-canvas-cell="1-0"]')).toContainText(
    'Header',
  );
  await grid
    .getByRole('button', {
      name: t['regions.selectRow'].replace('{row}', '2'),
      exact: true,
    })
    .click();
  const copied = await grid
    .getByRole('button', {
      name: t['regions.selectRow'].replace('{row}', '2'),
      exact: true,
    })
    .evaluate((el) => {
      const event = new Event('copy', {
        bubbles: true,
        cancelable: true,
      }) as ClipboardEvent;
      // Synthetic Firefox paste/copy events protect constructor-supplied transfers.
      // Supply a local event payload; native clipboard permissions are not needed.
      Object.defineProperty(event, 'clipboardData', {
        value: new DataTransfer(),
      });
      el.dispatchEvent(event);
      return event.clipboardData!.getData('text/plain');
    });
  expect(copied).toBe('Header\t\t\n');
  await toolbar
    .getByRole('button', { name: t['regions.mergeCells'], exact: true })
    .click();
  await expect(grid.locator('[data-canvas-cell="1-0"]')).toHaveAttribute(
    'aria-colspan',
    '3',
  );
  await expect(grid.locator('[data-canvas-cell="1-0"]')).toContainText(
    'Header',
  );
  await toolbar
    .getByRole('button', { name: t['regions.splitCell'], exact: true })
    .click();
  await chooseCell(grid, '1-0');
  await grid.locator('[data-canvas-cell="1-0"]').evaluate((el) => {
    const data = new DataTransfer();
    data.setData('text/plain', '"First\nSecond"\tValue');
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    el.dispatchEvent(event);
  });
  await expect(grid.locator('[data-canvas-cell="1-0"]')).toContainText('First');
  await expect(grid.locator('[data-canvas-cell="1-1"]')).toHaveText('Value');
  await grid.locator('[data-canvas-cell="1-0"]').evaluate((el) => {
    const data = new DataTransfer();
    data.setData('image/png', 'unsupported');
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    el.dispatchEvent(event);
  });
  await expect(grid.locator('[data-canvas-cell="1-0"]')).toContainText(
    'Second',
  );
  await grid
    .getByRole('button', {
      name: t['regions.selectRow'].replace('{row}', '2'),
      exact: true,
    })
    .click();
  await structure(toolbar, t['regions.row.delete']);
  const confirm = toolbar.getByRole('alertdialog', {
    name: t['directTable.confirmDelete'],
    exact: true,
  });
  await expect(confirm).toBeVisible();
  await confirm
    .getByRole('button', { name: t['project.cancel'], exact: true })
    .click();
  await expect(grid.locator('[data-canvas-cell="1-0"]')).toContainText(
    'Second',
  );
  await toolbar
    .getByRole('button', { name: t['directTable.finish'], exact: true })
    .click();
  await expect(toolbar).toHaveCount(0);
  const p = await exported(page, t);
  const regions = p.documents[0].pages[0].nodes[0].extensions[
    TEXT_REGIONS_KEY
  ] as unknown as TableTextRegions;
  expect(regions.cells[1].slice(0, 2)).toEqual(['First\nSecond', 'Value']);
  expect(regions.cells).toHaveLength(4);
});

test('expanded categories expose more browser batches and searchable server shapes', async ({
  page,
}) => {
  const { toolbar, t } = await open(page);
  await toolbar
    .getByRole('button', { name: t['directTable.finish'], exact: true })
    .click();
  await page
    .getByRole('button', { name: t['palette.browseElements'], exact: true })
    .click();
  const browser = page.locator('.element-browser-dialog');
  await expect(browser.locator('[data-library-kind]')).toHaveCount(48);
  await browser.locator('.element-browser-more').click();
  await expect(browser.locator('[data-library-kind]')).toHaveCount(
    Math.min(96, shapeKinds.length + 1),
  );
  await browser.getByRole('searchbox').fill('server');
  await expect(browser.locator('[data-library-kind="server"]')).toBeVisible();
  await browser.locator('[data-library-kind="server"]').click();
  await expect(
    page
      .getByRole('toolbar', { name: t['diagram.tools'], exact: true })
      .getByRole('button', { name: t['shape.server'], exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('canvas cells retain the clicked origin, navigate by Tab and Enter and extend ranges', async ({
  page,
}) => {
  const { toolbar, grid } = await open(page, 'en', 100, '1-1');
  await expect(grid.locator('.canvas-cell-input [contenteditable]')).toHaveText(
    'Body',
  );
  await grid.locator('.canvas-cell-input [contenteditable]').press('Escape');
  await expect(grid.locator('[data-canvas-cell="1-1"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(grid.locator('[data-canvas-cell="1-2"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(grid.locator('[data-canvas-cell="2-2"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(grid).toHaveAttribute('aria-rowcount', '4');
  await expect(grid.locator('[data-canvas-cell="3-0"]')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(grid.locator('[data-canvas-cell="2-2"]')).toBeFocused();
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(
    grid.locator('[data-canvas-cell][aria-selected="true"]'),
  ).toHaveCount(2);
  await expect(toolbar.locator('.canvas-table-address')).toHaveText('C3');
  await page.screenshot({ path: test.info().outputPath('table-tools.png') });
});

for (const locale of ['en', 'de'])
  test(`canvas dimensions and formulas recalculate and survive native export ${locale}`, async ({
    page,
  }) => {
    const { toolbar, grid, t, id } = await open(page, locale);
    await dragDivider(page, grid, 'column', 60);
    await dragDivider(page, grid, 'row', 35);
    const rendered = page.locator(`[data-node-id="${id}"]`);
    await expect
      .poll(async () =>
        Number(
          await rendered
            .locator('.scene-table-header')
            .first()
            .getAttribute('width'),
        ),
      )
      .toBeCloseTo(180);
    await expect
      .poll(async () =>
        Number(
          await rendered
            .locator('.scene-table-header')
            .first()
            .getAttribute('height'),
        ),
      )
      .toBeCloseTo(105);
    await toolbar.getByLabel(t['table.calculate'], { exact: true }).check();
    const source = toolbar.locator('.canvas-table-source textarea');
    await source.fill('2');
    await chooseCell(grid, '0-1');
    await source.fill('3');
    await chooseCell(grid, '0-2');
    await source.fill(locale === 'de' ? '=SUMME(A1:B1)' : '=SUM(A1:B1)');
    await expect(toolbar.locator('output')).toContainText('5');
    await expect(rendered.locator('[data-text-region="cell-0-2"]')).toHaveText(
      '5',
    );
    await chooseCell(grid, '0-0');
    await source.fill('4');
    await expect(rendered.locator('[data-text-region="cell-0-2"]')).toHaveText(
      '7',
    );
    await structure(toolbar, t['regions.column.before']);
    await expect(rendered.locator('[data-text-region="cell-0-3"]')).toHaveText(
      '7',
    );
    await chooseCell(grid, '0-3');
    await expect(source).toHaveValue(
      locale === 'de' ? '=SUMME(B1:C1)' : '=SUM(B1:C1)',
    );
    await chooseCell(grid, '1-0');
    await source.fill('=1/0');
    await expect(toolbar.locator('output')).toContainText('#DIV/0!');
    await chooseCell(grid, '2-0');
    await source.fill('=A3');
    await expect(toolbar.locator('output')).toContainText('#CYCLE!');
    await source.fill('Line one\nLine two');
    await expect(source).toHaveValue('Line one\nLine two');
    await toolbar
      .getByRole('button', { name: t['directTable.finish'], exact: true })
      .click();
    await expect(toolbar).toHaveCount(0);
    const project = await exported(page, t);
    expect(project.manifest.requiredFeatures).toContain(
      'table-layout-formulas-v1',
    );
    const regions = project.documents[0].pages[0].nodes[0].extensions[
      TEXT_REGIONS_KEY
    ] as unknown as TableTextRegions;
    expect(regions.columnWidths).toEqual([100, 150, 50, 100]);
    expect(regions.rowHeights).toEqual([150, 50, 100]);
    expect(regions.cells[2][0]).toBe('Line one\nLine two');
    expect(regions.cells[0][3]).toBe(
      locale === 'de' ? '=SUMME(B1:C1)' : '=SUM(B1:C1)',
    );
  });

test('copying a formula on canvas adjusts relative references and preserves absolute ones', async ({
  page,
}) => {
  const { toolbar, grid, t } = await open(page);
  await toolbar.getByLabel(t['table.calculate'], { exact: true }).check();
  const source = toolbar.locator('.canvas-table-source textarea');
  for (const [cell, value] of [
    ['0-0', '2'],
    ['0-1', '3'],
    ['1-0', '10'],
    ['1-1', '20'],
    ['0-2', '=A1+B1+$A$1'],
  ]) {
    await chooseCell(grid, cell);
    await source.fill(value);
  }
  await expect(toolbar.locator('output')).toContainText('7');
  const copied = await grid
    .locator('[data-canvas-cell="0-2"]')
    .evaluate((el) => {
      const event = new Event('copy', {
        bubbles: true,
        cancelable: true,
      }) as ClipboardEvent;
      // Synthetic Firefox paste/copy events protect constructor-supplied transfers.
      // Supply a local event payload; native clipboard permissions are not needed.
      Object.defineProperty(event, 'clipboardData', {
        value: new DataTransfer(),
      });
      el.dispatchEvent(event);
      return {
        text: event.clipboardData!.getData('text/plain'),
        native: event.clipboardData!.getData('application/x-koxora-table'),
      };
    });
  await chooseCell(grid, '1-2');
  await grid.locator('[data-canvas-cell="1-2"]').evaluate((el, copied) => {
    const data = new DataTransfer();
    data.setData('text/plain', copied.text);
    data.setData('application/x-koxora-table', copied.native);
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    el.dispatchEvent(event);
  }, copied);
  await expect(source).toHaveValue('=A2+B2+$A$1');
  await expect(toolbar.locator('output')).toContainText('32');
  await page.screenshot({ path: test.info().outputPath('formula-editor.png') });
});
