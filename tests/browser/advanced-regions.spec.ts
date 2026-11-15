import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
  type Project,
} from '../../packages/project/src/index';
import {
  applyEdit,
  resolveAppearance,
  TEXT_REGIONS_KEY,
  type RichText,
} from '../../packages/editor-core/src/index';

const now = '2026-11-14T18:00:00.000Z';
function fixture(kind: 'container' | 'table') {
  let project = createProject(
    'Advanced text regions',
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
      layerId: sheet.layers[0].id,
      position: { x: 0, y: 0 },
      text: kind === 'container' ? 'Body remains independent' : '',
    },
    now,
  );
  const node = project.documents[0].pages[0].nodes[0];
  project = applyEdit(
    project,
    workbook.id,
    sheet.id,
    {
      type: 'updateNode',
      id,
      text: String(node.content.text ?? ''),
      style: resolveAppearance(node),
      textRegions:
        kind === 'container'
          ? { version: 1, type: 'container', title: 'Section title' }
          : {
              version: 1,
              type: 'table',
              headerRow: true,
              cells: [
                ['Name', 'Role', ''],
                ['Ada', 'Lead', ''],
                ['', '', ''],
              ],
            },
    },
    now,
  );
  return { project, id };
}
async function open(page: Page, project: Project, locale = 'en') {
  const messages: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: messages['project.import'], exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel(messages['project.import'], { exact: true })
    .setInputFiles({
      name: 'advanced-regions.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await saved(page, locale);
}
async function saved(page: Page, locale = 'en') {
  const messages: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
}
async function exported(page: Page) {
  await saved(page);
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
}
function first(project: Project) {
  return project.documents[0].pages[0].nodes[0];
}
function regions(project: Project) {
  return first(project).extensions[TEXT_REGIONS_KEY] as Record<string, unknown>;
}
const dialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Edit text on canvas', exact: true });
const panel = (page: Page) =>
  page.getByRole('complementary', { name: 'Properties', exact: true });
async function closeInline(page: Page) {
  await expect(
    dialog(page).getByRole('button', { name: 'Apply changes', exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await saved(page);
}
async function selectText(editor: Locator, start: number, end: number) {
  await editor.focus();
  await editor.evaluate(
    (element, offsets) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      const point = (offset: number): [Text, number] => {
        for (const node of nodes) {
          if (offset <= node.length) return [node, offset];
          offset -= node.length;
        }
        return [nodes.at(-1)!, nodes.at(-1)!.length];
      };
      const range = document.createRange();
      range.setStart(...point(offsets.start));
      range.setEnd(...point(offsets.end));
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    },
    { start, end },
  );
}
async function richFormat(editor: Locator, scope: Locator) {
  await selectText(editor, 5, 'Plan carefully'.length);
  const bold = scope.getByRole('button', { name: 'Bold', exact: true });
  if ((await bold.getAttribute('aria-pressed')) !== 'true') await bold.click();
  await editor.press('ControlOrMeta+i');
  await editor.press('ControlOrMeta+u');
  await scope.locator('.font-picker summary').click();
  await scope
    .getByRole('searchbox', { name: 'Search fonts', exact: true })
    .fill('Georgia');
  await scope
    .locator('.font-menu')
    .getByRole('button', { name: 'Georgia', exact: true })
    .click();
  await scope.getByLabel('Text color', { exact: true }).fill('#b3264b');
  const size = scope.getByLabel('Text size', { exact: true });
  await size.fill('24');
  await size.press('Tab');
  await scope
    .getByLabel('Text alignment', { exact: true })
    .selectOption('left');
}
function styledRun(rich: RichText) {
  return rich.paragraphs
    .flatMap((paragraph) => paragraph.runs)
    .find((run) => run.text === 'carefully');
}
async function clickRegion(page: Page, region: Locator) {
  await region.scrollIntoViewIfNeeded();
  const point = await region.evaluate((element) => {
    if (element instanceof SVGGraphicsElement) {
      const matrix = element.getScreenCTM();
      if (!matrix) throw new Error('The text region must be attached');
      // WebKit reports text bounds at the text origin instead of positioned tspans.
      const span = element.querySelector('tspan');
      if (span instanceof SVGTSpanElement) {
        let x = span.x.baseVal.getItem(0).value;
        const y = span.y.baseVal.getItem(0).value;
        const anchor = element.getAttribute('text-anchor');
        const width = span.getComputedTextLength();
        if (anchor === 'start') x += width / 2;
        if (anchor === 'end') x -= width / 2;
        const point = new DOMPoint(x, y).matrixTransform(matrix);
        return { x: point.x, y: point.y };
      }
      const box =
        element instanceof SVGForeignObjectElement
          ? {
              x: element.x.baseVal.value,
              y: element.y.baseVal.value,
              width: element.width.baseVal.value,
              height: element.height.baseVal.value,
            }
          : element.getBBox();
      const point = new DOMPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      ).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    }
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
}
async function properties(page: Page, id: string) {
  await clickRegion(
    page,
    page.locator(`[data-node-id="${id}"] [data-text-region]`).first(),
  );
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  if (!(await panel(page).isVisible()))
    await page.getByRole('button', { name: 'Properties', exact: true }).click();
  await panel(page).getByRole('tab', { name: 'Text', exact: true }).click();
  return panel(page);
}
async function reachable(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  expect(
    await locator.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        ),
      );
    }),
  ).toBe(true);
}

test('clicking a container title or body edits that exact region with independent rich formatting and live persistence', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { project, id } = fixture('container');
  await open(page, project);
  const rendered = page.locator(`[data-node-id="${id}"]`);
  await clickRegion(page, rendered.locator('[data-text-region="title"]'));
  await expect(dialog(page)).toBeVisible();
  let editor = dialog(page).locator('[contenteditable="true"][role="textbox"]');
  await expect(editor).toHaveText('Section title');
  await editor.fill('Plan carefully');
  await richFormat(editor, dialog(page));
  await closeInline(page);
  let result = await exported(page);
  expect(first(result).content.text).toBe('Body remains independent');
  expect(regions(result).title).toBe('Plan carefully');
  expect(styledRun(regions(result).titleRichText as RichText)).toMatchObject({
    style: {
      fontFamily: 'georgia',
      fontSize: 24,
      fontWeight: 700,
      fontStyle: 'italic',
      textDecoration: 'underline',
      textColor: '#b3264b',
    },
  });
  expect(result.manifest.requiredFeatures).toContain(
    'advanced-text-regions-v1',
  );
  expect((regions(result).titleRichText as RichText).paragraphs[0].align).toBe(
    'left',
  );
  const span = rendered
    .locator('[data-text-region="title"] span')
    .filter({ hasText: 'carefully' });
  await expect(span).toHaveCSS('font-weight', '700');
  await expect(span).toHaveCSS('font-style', 'italic');
  await expect(span).toHaveCSS('color', 'rgb(179, 38, 75)');
  await clickRegion(page, rendered.locator('[data-text-region="body"]'));
  editor = dialog(page).locator('[contenteditable="true"][role="textbox"]');
  await expect(editor).toHaveText('Body remains independent');
  await editor.fill('Body edited live');
  await page.keyboard.press('Escape');
  expect(first(await exported(page)).content.text).toBe('Body edited live');
  await clickRegion(page, rendered.locator('[data-text-region="body"]'));
  await dialog(page)
    .locator('[contenteditable="true"][role="textbox"]')
    .fill('Body edited directly');
  await closeInline(page);
  result = await exported(page);
  expect(regions(result).title).toBe('Plan carefully');
  expect(first(result).content.text).toBe('Body edited directly');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(first(await exported(page)).content.text).toBe('Body edited live');
});

test('table header is visibly distinguished and a cell click supports mixed rich text without changing other cells', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { project, id } = fixture('table');
  await open(page, project);
  const rendered = page.locator(`[data-node-id="${id}"]`);
  await expect(rendered.locator('[data-table-header="true"]')).toHaveCount(3);
  const fills = await rendered.evaluate((element) => ({
    body: element.querySelector('.scene-node')!.getAttribute('fill'),
    headers: [...element.querySelectorAll('[data-table-header="true"]')].map(
      (header) => header.getAttribute('fill'),
    ),
  }));
  for (const fill of fills.headers) {
    expect(fill).not.toBe('none');
    expect(fill).not.toBe(fills.body);
  }
  await clickRegion(page, rendered.locator('[data-text-region="cell-1-0"]'));
  await expect(dialog(page)).toBeVisible();
  const editor = dialog(page).locator(
    '[contenteditable="true"][role="textbox"]',
  );
  await expect(editor).toHaveText('Ada');
  await editor.fill('Plan carefully');
  await richFormat(editor, dialog(page));
  await closeInline(page);
  const result = await exported(page);
  expect(regions(result).cells).toEqual([
    ['Name', 'Role', ''],
    ['Plan carefully', 'Lead', ''],
    ['', '', ''],
  ]);
  const rich = (regions(result).cellRichText as (RichText | null)[][])[1][0]!;
  expect(rich.paragraphs[0].align).toBe('left');
  expect(styledRun(rich)).toMatchObject({
    style: {
      fontFamily: 'georgia',
      fontSize: 24,
      fontWeight: 700,
      fontStyle: 'italic',
      textColor: '#b3264b',
      textDecoration: 'underline',
    },
  });
  await expect(
    rendered
      .locator('[data-text-region="cell-1-0"] span')
      .filter({ hasText: 'carefully' }),
  ).toHaveCSS('font-style', 'italic');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(regions(await exported(page)).cells).toEqual(regions(project).cells);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect((await exported(page)).documents).toEqual(result.documents);
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  expect((await exported(page)).documents).toEqual(result.documents);
});

test('merging populated cells retains their text, splits without loss and survives atomic history, duplication and offline reopen', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { project, id } = fixture('table');
  await open(page, project);
  const form = await properties(page, id);
  await form.locator('[data-table-cell="0-0"]').click();
  await form.locator('[data-table-cell="0-1"]').click({ modifiers: ['Shift'] });
  await form
    .getByRole('button', { name: 'Merge selected cells', exact: true })
    .click();
  await expect(form.locator('[data-table-cell="0-0"]')).toHaveCount(1);
  await expect(form.locator('[data-table-cell="0-1"]')).toHaveCount(0);
  await expect(form.locator('th[colspan="2"],td[colspan="2"]')).toHaveCount(1);
  await expect(
    form.getByRole('button', { name: 'Apply changes', exact: true }),
  ).toHaveCount(0);
  const merged = await exported(page);
  expect(regions(merged).merges).toEqual([
    { row: 0, column: 0, rowSpan: 1, columnSpan: 2 },
  ]);
  expect((regions(merged).cells as string[][])[0][0]).toContain('Name');
  expect((regions(merged).cells as string[][])[0][0]).toContain('Role');
  expect((regions(merged).cells as string[][])[0][1]).toBe('');
  const rendered = page.locator(`[data-node-id="${id}"]`);
  await expect(rendered.locator('[data-table-cell="0-0"]')).toHaveAttribute(
    'data-colspan',
    '2',
  );
  await expect(rendered.locator('[data-table-cell="0-1"]')).toHaveCount(0);
  await clickRegion(page, rendered.locator('[data-text-region="cell-0-0"]'));
  const editor = dialog(page).locator(
    '[contenteditable="true"][role="textbox"]',
  );
  await expect(editor).toContainText('Name');
  await expect(editor).toContainText('Role');
  await page.keyboard.press('Escape');
  await form.getByRole('button', { name: 'Split cell', exact: true }).click();
  await expect(
    form.getByRole('button', { name: 'Apply changes', exact: true }),
  ).toHaveCount(0);
  const split = await exported(page);
  expect(regions(split).merges ?? []).toEqual([]);
  expect((regions(split).cells as string[][])[0][0]).toBe(
    (regions(merged).cells as string[][])[0][0],
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await exported(page)).documents).toEqual(merged.documents);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect((await exported(page)).documents).toEqual(split.documents);
  await clickRegion(page, rendered.locator('[data-text-region="cell-0-0"]'));
  await page.keyboard.press('Escape');
  await page
    .getByRole('region', { name: 'Interactive canvas', exact: true })
    .focus();
  await page.keyboard.press('ControlOrMeta+d');
  await expect(page.locator('[data-node-id]')).toHaveCount(2);
  const copied = await exported(page);
  expect(
    copied.documents[0].pages[0].nodes[1].extensions[TEXT_REGIONS_KEY],
  ).toEqual(regions(split));
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
  expect((await exported(page)).documents).toEqual(copied.documents);
});

test('a blank table cell opens its own editor and closing retains live text changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { project, id } = fixture('table');
  await open(page, project);
  const rendered = page.locator(`[data-node-id="${id}"]`);
  const bounds = (await rendered.locator('.scene-node').boundingBox())!;
  await page.mouse.click(
    bounds.x + (bounds.width * 5) / 6,
    bounds.y + (bounds.height * 5) / 6,
  );
  await expect(dialog(page)).toBeVisible();
  const editor = dialog(page).locator(
    '[contenteditable="true"][role="textbox"]',
  );
  await expect(editor).toHaveText('');
  await editor.fill('Saved blank cell');
  await page.keyboard.press('Escape');
  expect((regions(await exported(page)).cells as string[][])[2][2]).toBe(
    'Saved blank cell',
  );
  await clickRegion(page, rendered.locator('[data-text-region="cell-2-2"]'));
  await dialog(page)
    .locator('[contenteditable="true"][role="textbox"]')
    .fill('Last cell');
  await closeInline(page);
  expect((regions(await exported(page)).cells as string[][])[2][2]).toBe(
    'Last cell',
  );
});

test('keyboard focus can leave a live text editor and undo its changes without a stale editor', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const { project, id } = fixture('container');
  await open(page, project);
  await clickRegion(
    page,
    page.locator(`[data-node-id="${id}"] [data-text-region="title"]`),
  );
  const editor = dialog(page).locator(
    '[contenteditable="true"][role="textbox"]',
  );
  await editor.fill('Edited before keyboard undo');
  await saved(page);
  await expect(dialog(page)).toBeVisible();
  await expect(editor).toBeFocused();
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await undo.focus();
  await expect(dialog(page)).toHaveCount(0);
  await undo.press('Enter');
  expect(regions(await exported(page)).title).toBe('Section title');
  await page.getByRole('button', { name: 'Redo', exact: true }).focus();
  await page.keyboard.press('Enter');
  expect(regions(await exported(page)).title).toBe(
    'Edited before keyboard undo',
  );
  expect(errors).toEqual([]);
});

test('clicking an ordinary shape label provides the same direct rich-text controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  let project = createProject(
    'Direct ordinary label',
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
      kind: 'rectangle',
      layerId: sheet.layers[0].id,
      position: { x: 0, y: 0 },
      text: 'Direct label',
    },
    now,
  );
  await open(page, project);
  await clickRegion(
    page,
    page.locator(`[data-node-id="${id}"] [data-text-region="body"]`),
  );
  await expect(dialog(page)).toBeVisible();
  const editor = dialog(page).locator(
    '[contenteditable="true"][role="textbox"]',
  );
  await expect(editor).toHaveText('Direct label');
  await editor.fill('Changed directly');
  await editor.press('ControlOrMeta+a');
  await editor.press('ControlOrMeta+i');
  await closeInline(page);
  const result = await exported(page);
  expect(first(result).content.text).toBe('Changed directly');
  expect(first(result).extensions['org.koxora.rich-text']).toMatchObject({
    paragraphs: [
      { runs: [{ text: 'Changed directly', style: { fontStyle: 'italic' } }] },
    ],
  });
});

test('dragging a table cell moves its element without opening or committing a text editor', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { project, id } = fixture('table');
  await open(page, project);
  const region = page.locator(
    `[data-node-id="${id}"] [data-text-region="cell-1-0"]`,
  );
  const bounds = (await region.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 48,
    bounds.y + bounds.height / 2 + 48,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(dialog(page)).toHaveCount(0);
  const moved = await exported(page);
  expect(first(moved).geometry).not.toEqual(first(project).geometry);
  expect(regions(moved)).toEqual(regions(project));
});

for (const locale of ['en', 'de']) {
  test(`direct cell editing and merge controls remain reachable at 390px and 200% in ${locale}`, async ({
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
    await page.setViewportSize({ width: 390, height: 600 });
    const { project, id } = fixture('table');
    await open(page, project, locale);
    const rendered = page.locator(`[data-node-id="${id}"]`);
    await clickRegion(page, rendered.locator('[data-text-region="cell-1-0"]'));
    const inline = page.getByRole('dialog', {
      name: messages['rich.inlineTitle'],
      exact: true,
    });
    const editor = inline.locator('[contenteditable="true"][role="textbox"]');
    await reachable(editor);
    await editor.fill('Directly edited Ω');
    await editor.press('ControlOrMeta+a');
    await editor.press('ControlOrMeta+i');
    await expect(
      inline.getByRole('button', {
        name: messages['diagram.apply'],
        exact: true,
      }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(inline).toHaveCount(0);
    await clickRegion(page, rendered.locator('[data-text-region="cell-1-0"]'));
    await page.keyboard.press('Escape');
    const form = page.getByRole('complementary', {
      name: messages['office.properties'],
      exact: true,
    });
    if (!(await form.isVisible()))
      await page
        .getByRole('button', {
          name: messages['office.properties'],
          exact: true,
        })
        .click();
    await form
      .getByRole('tab', {
        name: messages['office.property.text'],
        exact: true,
      })
      .click();
    await form
      .getByText(messages['regions.selectionRange'], { exact: true })
      .click();
    const startRow = form.getByRole('combobox', {
      name: messages['regions.startRow'],
      exact: true,
    });
    await reachable(startRow);
    await startRow.selectOption('1');
    await form.locator('[data-table-cell="1-0"]').click();
    await form
      .locator('[data-table-cell="1-1"]')
      .click({ modifiers: ['Shift'] });
    const merge = form.getByRole('button', {
      name:
        locale === 'en'
          ? 'Merge selected cells'
          : messages['regions.mergeCells'],
      exact: true,
    });
    await reachable(merge);
    await merge.click();
    await expect(
      form.getByRole('button', {
        name: messages['diagram.apply'],
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(rendered.locator('[data-table-cell="1-0"]')).toHaveAttribute(
      'data-colspan',
      '2',
    );
  });
}
