import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { waitForCanvasLayout } from './canvas-layout';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';
import {
  applyEdit,
  FONT_FAMILIES,
  fromPlainText,
  TEXT_REGIONS_KEY,
  type RichText,
  type TableTextRegions,
} from '../../packages/editor-core/src/index';

const now = '2026-11-17T10:00:00.000Z';
const fonts = Object.keys(FONT_FAMILIES) as (keyof typeof FONT_FAMILIES)[];
async function start(
  page: Page,
  locale: string,
  kind: 'table' | 'rectangle' = 'table',
  scale = 100,
) {
  await page.addInitScript(
    ({ locale, scale }) =>
      localStorage.setItem(
        'koxora.preferences.v1',
        JSON.stringify({ locale, guiScale: scale, theme: 'dark' }),
      ),
    { locale, scale },
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  const t: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  let project = createProject('Font feedback', () => crypto.randomUUID(), now);
  const document = project.documents[0],
    sheet = document.pages[0],
    id = crypto.randomUUID();
  project = applyEdit(
    project,
    document.id,
    sheet.id,
    {
      type: 'insert',
      id,
      kind,
      layerId: sheet.layers[0].id,
      position: { x: 0, y: 0 },
      text: 'Alpha Beta',
    },
    now,
  );
  if (kind === 'table')
    project = applyEdit(
      project,
      document.id,
      sheet.id,
      {
        type: 'regionText',
        id,
        target: { type: 'table-cell', row: 1, column: 0 },
        value: fromPlainText('Alpha Beta'),
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
      name: 'fonts.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText(t['project.saved']);
  const rendered = page.locator(`[data-node-id="${id}"]`);
  const target =
    kind === 'table'
      ? rendered.locator('[data-table-cell="1-0"]')
      : rendered.locator('.scene-node');
  await waitForCanvasLayout(target);
  const point = await target.evaluate((el) => {
    const region = el.querySelector('[data-text-region]') ?? el;
    const svg = region as SVGGraphicsElement;
    const box =
      svg instanceof SVGForeignObjectElement
        ? {
            x: svg.x.baseVal.value,
            y: svg.y.baseVal.value,
            width: svg.width.baseVal.value,
            height: svg.height.baseVal.value,
          }
        : svg.getBBox();
    const p = new DOMPoint(
      box.x + box.width / 2,
      box.y + box.height / 2,
    ).matrixTransform(svg.getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (kind === 'table') await page.mouse.click(point.x, point.y);
  else await page.mouse.dblclick(point.x, point.y);
  if (kind === 'table') {
    await expect(page.locator('.canvas-table-toolbar')).toBeVisible();
    // Opening the toolbar changes the canvas height during the first pointer
    // gesture. Select the intended cell after that layout, then enter editing.
    const editor = page.locator('.canvas-cell-input [contenteditable]');
    if (await editor.count()) await editor.press('Escape');
    const cell = page.locator('.canvas-table-grid [data-canvas-cell="1-0"]');
    await cell.click();
    await cell.press('F2');
    await expect(
      page.locator('.canvas-cell-input [contenteditable]'),
    ).toHaveText('Alpha Beta');
  } else await expect(page.locator('.canvas-text-dialog')).toBeVisible();
  return { t, rendered };
}
async function selectBeta(editor: Locator) {
  await editor.focus();
  await editor.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const point = (offset: number): [Text, number] => {
      for (const node of nodes) {
        if (offset <= node.length) return [node, offset];
        offset -= node.length;
      }
      throw new Error('The requested word must exist in the editor');
    };
    const range = document.createRange();
    range.setStart(...point(6));
    range.setEnd(...point(10));
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
}
async function choose(
  picker: Locator,
  t: Record<string, string>,
  font: keyof typeof FONT_FAMILIES,
  keyboard = false,
) {
  if (keyboard) await picker.locator('summary').press('Enter');
  else await picker.locator('summary').click();
  const menu = picker.locator('.font-menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button')).toHaveCount(fonts.length);
  if (font === 'sans')
    await picker
      .page()
      .screenshot({ path: test.info().outputPath('font-menu.png') });
  expect(await menu.evaluate((el) => el.matches(':popover-open'))).toBe(true);
  const option = menu.getByRole('button', {
    name: t[`text.family.${font}`],
    exact: true,
  });
  if (keyboard) {
    const search = menu.getByRole('searchbox');
    await search.fill(t[`text.family.${font}`]);
    await search.press('ArrowDown');
    await expect(option).toBeFocused();
    await option.press('Enter');
  } else await option.click();
  await expect(menu).toBeHidden();
}
async function exported(page: Page, t: Record<string, string>) {
  await expect(page.locator('.save-status')).toHaveText(t['project.saved']);
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: t['project.export'], exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
}
for (const locale of ['en', 'de']) {
  test(`all font choices escape the table toolbar and retain mixed text ${locale}`, async ({
    page,
  }) => {
    const { t, rendered } = await start(page, locale);
    const editor = page.locator('.canvas-cell-input [contenteditable]');
    await expect(editor).toHaveText('Alpha Beta');
    await selectBeta(editor);
    await editor.press('ControlOrMeta+i');
    const picker = page.locator('.canvas-table-rich-toolbar .font-picker');
    await expect(picker.locator('summary')).toHaveCSS(
      'list-style-type',
      'none',
    );
    for (const font of fonts) await choose(picker, t, font);
    await expect(editor).toHaveText('Alpha Beta');
    await expect(
      rendered
        .locator('[data-text-region="cell-1-0"] span')
        .filter({ hasText: 'Beta' }),
    ).toHaveCSS('font-style', 'italic');
    await page
      .locator('.canvas-table-toolbar')
      .getByRole('button', { name: t['directTable.finish'], exact: true })
      .click();
    const project = await exported(page, t);
    const regions = project.documents[0].pages[0].nodes[0].extensions[
      TEXT_REGIONS_KEY
    ] as unknown as TableTextRegions;
    expect(regions.cells[1][0]).toBe('Alpha Beta');
    const rich = regions.cellRichText![1][0] as RichText;
    expect(
      rich.paragraphs[0].runs.find((r) => r.text === 'Beta'),
    ).toMatchObject({
      style: { fontFamily: fonts.at(-1), fontStyle: 'italic' },
    });
    expect(
      rich.paragraphs[0].runs.find((r) => r.text === 'Alpha '),
    ).toMatchObject({ style: { fontFamily: 'sans', fontStyle: 'normal' } });
  });
  test(`selected table ranges expose every font and preserve values at 200 percent ${locale}`, async ({
    page,
  }) => {
    const { t, rendered } = await start(page, locale, 'table', 200);
    await page.locator('.canvas-cell-input [contenteditable]').press('Escape');
    const grid = page.locator('.canvas-table-grid');
    await grid.locator('[data-canvas-cell="1-0"]').click();
    await grid
      .locator('[data-canvas-cell="1-1"]')
      .click({ modifiers: ['Shift'] });
    await expect(grid.locator('[aria-selected="true"]')).toHaveCount(2);
    const picker = page.locator('.canvas-table-toolbar .font-picker');
    await choose(picker, t, 'georgia', true);
    await expect(picker.locator('summary')).toBeFocused();
    await expect(grid.locator('[aria-selected="true"]')).toHaveCount(2);
    await expect(
      rendered.locator('[data-text-region="cell-1-0"] span'),
    ).toHaveCSS('font-family', /Georgia/);
    await page
      .locator('.canvas-table-toolbar')
      .getByRole('button', { name: t['directTable.finish'], exact: true })
      .click();
    const project = await exported(page, t);
    const regions = project.documents[0].pages[0].nodes[0].extensions[
      TEXT_REGIONS_KEY
    ] as unknown as TableTextRegions;
    expect(regions.cells[1].slice(0, 2)).toEqual(['Alpha Beta', '']);
    expect(
      regions.cellRichText![1][0]!.paragraphs[0].runs[0].style?.fontFamily,
    ).toBe('georgia');
    expect(
      regions.cellRichText![1][1]!.paragraphs[0].runs[0].style?.fontFamily,
    ).toBe('georgia');
    // Reopening an empty formatted cell uses its saved font for new text.
    // An empty SVG text group has no painted hit target; click the actual
    // middle cell on the table body as a user would.
    // Locator clicks wait for the export notice's layout change to settle.
    await waitForCanvasLayout(rendered.locator('.scene-node'));
    await rendered.locator('.scene-node').click();
    await expect(page.locator('.canvas-table-address')).toHaveText('B2');
    const editor = page.locator('.canvas-cell-input [contenteditable]');
    await expect(
      page.locator('.canvas-table-rich-toolbar .font-picker summary'),
    ).toHaveText(t['text.family.georgia']);
    const richPicker = page.locator('.canvas-table-rich-toolbar .font-picker');
    await choose(richPicker, t, 'consolas');
    await page
      .locator('.canvas-table-toolbar')
      .getByRole('button', { name: t['directTable.finish'], exact: true })
      .click();
    const blank = await exported(page, t);
    const blankRegions = blank.documents[0].pages[0].nodes[0].extensions[
      TEXT_REGIONS_KEY
    ] as unknown as TableTextRegions;
    expect(blankRegions.cells[1][1]).toBe('');
    expect(
      blankRegions.cellRichText![1][1]!.paragraphs[0].runs[0].style?.fontFamily,
    ).toBe('consolas');
    await waitForCanvasLayout(rendered.locator('.scene-node'));
    await rendered.locator('.scene-node').click();
    await expect(page.locator('.canvas-table-address')).toHaveText('B2');
    await expect(richPicker.locator('summary')).toHaveText(
      t['text.family.consolas'],
    );
    const historyUndo = page
      .locator('.canvas-table-toolbar > [role="toolbar"]')
      .getByRole('button', { name: t['rich.undo'], exact: true });
    await historyUndo.click();
    await expect(
      page.locator('.canvas-table-rich-toolbar .font-picker summary'),
    ).toHaveText(t['text.family.georgia']);
    await historyUndo.press('ControlOrMeta+Shift+z');
    await expect(
      page.locator('.canvas-table-rich-toolbar .font-picker summary'),
    ).toHaveText(t['text.family.consolas']);
    await editor.pressSequentially('New cell');
    await expect(editor).toHaveText('New cell');
    await page
      .locator('.canvas-table-toolbar')
      .getByRole('button', { name: t['directTable.finish'], exact: true })
      .click();
    const typed = await exported(page, t);
    const typedRegions = typed.documents[0].pages[0].nodes[0].extensions[
      TEXT_REGIONS_KEY
    ] as unknown as TableTextRegions;
    expect(typedRegions.cells[1][1]).toBe('New cell');
    expect(
      typedRegions.cellRichText![1][1]!.paragraphs[0].runs[0].style?.fontFamily,
    ).toBe('consolas');
  });
}

test('ordinary text windows omit drag instructions and the font popup remains within the editor session', async ({
  page,
}) => {
  const { t } = await start(page, 'en', 'rectangle');
  const dialog = page.locator('.canvas-text-dialog');
  await expect(dialog.locator('.floating-window-help')).toHaveCount(0);
  await expect(dialog).not.toContainText('Drag the window background');
  const picker = dialog.locator('.font-picker');
  await picker.locator('summary').click();
  const search = picker.getByRole('searchbox', {
    name: t['rich.searchFonts'],
    exact: true,
  });
  await search.press('ArrowUp');
  await expect(
    picker.locator('.font-menu').getByRole('button').last(),
  ).toBeFocused();
  await search.fill('Georgia');
  await expect(picker.locator('.font-menu').getByRole('button')).toHaveCount(1);
  await search.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(picker.locator('.font-menu')).toBeHidden();
  await choose(picker, t, 'georgia');
  await expect(dialog).toBeVisible();
});
