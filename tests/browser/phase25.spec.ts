import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
  type Project,
} from '../../packages/project/src/index';
import {
  applyEdit,
  applyWorkbook,
  readRichText,
  DEFAULT_CONNECTION,
  resolveAppearance,
  FONT_FAMILIES,
} from '../../packages/editor-core/src/index';
const now = '2026-10-25T10:00:00.000Z';
const button = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true });
async function setup(page: Page, load = true) {
  let project = createProject('Product launch', () => crypto.randomUUID(), now);
  const d = project.documents[0],
    p = d.pages[0];
  for (const [i, x] of [-220, 0, 220].entries())
    project = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'insert',
        id: crypto.randomUUID(),
        kind: i === 1 ? 'ellipse' : 'rectangle',
        position: { x, y: 0 },
        layerId: p.layers[0].id,
        text: ['Plan launch', 'Review content', 'Publish'][i],
      },
      now,
    );
  project = applyEdit(
    project,
    d.id,
    p.id,
    {
      type: 'format',
      ids: [project.documents[0].pages[0].nodes[1].id],
      patch: { fill: '#e5f9ed', fontSize: 24, fontFamily: 'georgia' },
    },
    now,
  );
  if (load) await open(page, project);
  return project;
}
async function open(page: Page, project: Project) {
  await page.goto('/');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await button(page, 'Import .koxora').click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'phase25.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('[role=treeitem][data-page-id]')).toHaveCount(
    project.documents[0].pages.length,
  );
}
async function exported(page: Page) {
  if (await button(page, 'Restore workspace').isVisible()) {
    await button(page, 'Restore workspace').click();
    await expect(page.locator('.inspector')).toHaveJSProperty('inert', false);
  }
  const download = page.waitForEvent('download');
  await button(page, 'Export .koxora').click();
  return importProject(
    new Uint8Array(readFileSync((await (await download).path())!)),
  );
}
async function selectText(editor: Locator, start: number, end: number) {
  await editor.focus();
  await editor.evaluate(
    (el, { start, end }) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      function find(offset: number): [Text, number] {
        for (const n of nodes) {
          if (offset <= n.length) return [n, offset];
          offset -= n.length;
        }
        return [nodes.at(-1)!, nodes.at(-1)!.length];
      }
      const range = document.createRange(),
        a = find(start),
        b = find(end);
      range.setStart(...a);
      range.setEnd(...b);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    },
    { start, end },
  );
}
async function capture(page: Page, name: string) {
  if (process.env.KOXORA_CAPTURE && test.info().project.name === 'chromium') {
    mkdirSync('docs/design/screenshots/phase-2.5', { recursive: true });
    await page.screenshot({
      path: `docs/design/screenshots/phase-2.5/${name}.png`,
      fullPage: true,
    });
  }
}

test('workbook tree keeps focus, reorder, duplicate, delete/undo, views and document identity offline', async ({
  page,
  context,
}) => {
  const project = await setup(page);
  const first = project.documents[0].pages[0].id;
  await button(page, 'New page').click();
  await button(page, 'New page').click();
  const tabs = page.locator('[role=treeitem][data-page-id]');
  await tabs.nth(2).focus();
  await page.keyboard.press('ArrowUp');
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(tabs.nth(0)).toBeFocused();
  await tabs.nth(0).dblclick();
  await page.getByLabel('Name', { exact: true }).fill('Overview');
  await page.getByLabel('Name', { exact: true }).press('Enter');
  await expect(tabs.nth(0)).toContainText('Overview');
  await tabs.nth(0).press('Alt+ArrowDown');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toContainText('Overview');
  await tabs.nth(1).dragTo(tabs.nth(2));
  await expect(tabs.nth(2)).toContainText('Overview');
  await button(page, 'Zoom in').click();
  await expect(page.getByRole('status', { name: 'Zoom level' })).toHaveText(
    '125%',
  );
  const zoom = JSON.parse(
    (await page.locator('.interactive-canvas').getAttribute('data-camera'))!,
  ).zoom;
  await tabs.nth(0).click();
  await tabs.nth(2).click();
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await page
            .locator('.interactive-canvas')
            .getAttribute('data-camera'))!,
        ).zoom,
    )
    .toBe(zoom);
  await page.getByRole('treeitem', { selected: true }).press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
  await expect(tabs).toHaveCount(4);
  await page.getByRole('treeitem', { selected: true }).press('Shift+F10');
  await page
    .getByRole('menuitem', { name: 'Delete page', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Continue', exact: true })
    .click();
  await expect(tabs).toHaveCount(3);
  await button(page, 'Undo').click();
  await expect(tabs).toHaveCount(4);
  await button(page, 'Redo').click();
  await expect(tabs).toHaveCount(3);
  await button(page, 'New document').click();
  await page
    .getByRole('dialog')
    .getByLabel('Name', { exact: true })
    .fill('Operations');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await page
    .locator('[role=treeitem][data-page-id]')
    .filter({ hasText: 'Overview' })
    .click();
  await page.getByRole('treeitem', { selected: true }).press('Shift+F10');
  await page
    .getByRole('menuitem', { name: 'Move to document…', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('combobox', { name: 'Document', exact: true })
    .selectOption({ label: 'Operations' });
  await dialog.getByLabel('Position', { exact: true }).fill('2');
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  const result = await exported(page);
  expect(result.documents[1].pages[1].id).toBe(first);
  expect(result.documents[1].pages[1].viewport.zoom).toBe(zoom);
  await capture(page, 'workbook-light');
  await page
    .getByRole('combobox', { name: 'Appearance', exact: true })
    .selectOption('dark');
  await capture(page, 'workbook-dark');
  await page
    .getByRole('combobox', { name: 'Appearance', exact: true })
    .selectOption('light');
  await button(page, 'Save project').click();
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await button(page, 'Open project').click();
  await expect(page.getByRole('treeitem', { selected: true })).toContainText(
    'Overview',
  );
  expect((await exported(page)).documents).toEqual(result.documents);
});

test('on-canvas rich text formats only selected words with real keyboard size entry and undo', async ({
  page,
}) => {
  const project = await setup(page),
    id = project.documents[0].pages[0].nodes[0].id;
  await page.locator(`[data-node-id="${id}"]`).dblclick();
  const dialog = page.getByRole('dialog', {
    name: 'Edit text on canvas',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const editor = dialog.getByRole('textbox', {
    name: 'Label / text',
    exact: true,
  });
  await editor.fill('Launch carefully');
  await selectText(editor, 7, 16);
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.press('ControlOrMeta+i');
  await page.keyboard.press('ControlOrMeta+u');
  await dialog.locator('.font-picker summary').click();
  await dialog.getByRole('searchbox', { name: 'Search fonts' }).fill('Georgia');
  await dialog
    .locator('.font-menu')
    .getByRole('button', { name: 'Georgia', exact: true })
    .click();
  const size = dialog.getByLabel('Text size', { exact: true });
  await size.focus();
  await size.press('ControlOrMeta+a');
  await size.pressSequentially('32');
  await expect(size).toBeFocused();
  await size.press('Tab');
  await expect(
    page.locator(`[data-node-id="${id}"] .scene-rich-label span`).last(),
  ).toHaveCSS('font-size', '32px');
  await capture(page, 'rich-text');
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  const result = await exported(page),
    rich = readRichText(result.documents[0].pages[0].nodes[0])!;
  expect(rich.paragraphs[0].runs[0].text).toBe('Launch ');
  expect(rich.paragraphs[0].runs[0].style.fontWeight).toBe(400);
  expect(rich.paragraphs[0].runs[1]).toMatchObject({
    text: 'carefully',
    style: {
      fontFamily: 'georgia',
      fontWeight: 700,
      fontStyle: 'italic',
      textDecoration: 'underline',
      fontSize: 32,
    },
  });
  await button(page, 'Undo').click();
  await expect(page.locator(`[data-node-id="${id}"]`)).toContainText(
    'Plan launch',
  );
  await button(page, 'Redo').click();
  await expect(page.locator(`[data-node-id="${id}"]`)).toContainText(
    'Launch carefully',
  );
});

test('paste sanitizes active markup, keeps one line break and preserves editor undo/caret', async ({
  page,
}) => {
  const project = await setup(page),
    id = project.documents[0].pages[0].nodes[0].id;
  const remote: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('untrusted.invalid')) remote.push(r.url());
  });
  await page.locator(`[data-node-id="${id}"]`).dblclick();
  const editor = page.getByRole('textbox', {
    name: 'Label / text',
    exact: true,
  });
  await editor.fill('');
  await editor.focus();
  await editor.evaluate((el) => {
    const data = new DataTransfer();
    data.setData(
      'text/html',
      '<p style="text-align:right"><b>Hello</b><br>world<script>window.injected=true</script><img src="https://untrusted.invalid/pixel"><a href="javascript:alert(1)">!</a></p>',
    );
    data.setData('text/plain', 'Hello\nworld!');
    // Supply the clipboard payload explicitly: Firefox does not reliably keep
    // clipboardData passed to the synthetic ClipboardEvent constructor.
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    el.dispatchEvent(event);
  });
  await expect(editor).toContainText('Hello');
  await expect(editor.locator('p')).toHaveCount(1);
  await expect(editor.locator('br')).toHaveCount(1);
  await page.keyboard.type('✓');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).not.toContainText('✓');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toContainText('✓');
  await page.keyboard.press('ControlOrMeta+Enter');
  const result = await exported(page);
  expect(result.documents[0].pages[0].nodes[0].content.text).toBe(
    'Hello\nworld!✓',
  );
  expect(
    readRichText(result.documents[0].pages[0].nodes[0])!.paragraphs,
  ).toHaveLength(2);
  expect(remote).toEqual([]);
  expect(await page.evaluate(() => Object.hasOwn(window, 'injected'))).toBe(
    false,
  );
});

test('mixed batch properties preserve spans and right click selection, with atomic undo', async ({
  page,
}) => {
  let project = await setup(page, false);
  const d = project.documents[0],
    p = d.pages[0],
    ids = p.nodes.slice(0, 2).map((n) => n.id);
  project = applyEdit(
    project,
    d.id,
    p.id,
    {
      type: 'richText',
      id: ids[0],
      value: {
        version: 1,
        paragraphs: [
          {
            align: 'center',
            runs: [
              { text: 'Plan ', style: { fontWeight: 700 } },
              {
                text: 'launch',
                style: { textDecoration: 'underline', fontSize: 18 },
              },
            ],
          },
        ],
      },
    },
    now,
  );
  await open(page, project);
  await page.locator(`[data-node-id="${ids[0]}"]`).click();
  await page.keyboard.down('Shift');
  await page.locator(`[data-node-id="${ids[1]}"]`).click();
  await page.keyboard.up('Shift');
  await page.locator(`[data-node-id="${ids[0]}"]`).click({ button: 'right' });
  await expect(page.locator('.interactive-canvas')).toHaveAttribute(
    'data-selection',
    JSON.stringify(ids),
  );
  await page
    .locator('.context-menu')
    .getByRole('menuitem', { name: 'Element properties', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Format selection' });
  await expect(
    dialog.getByRole('combobox', { name: 'Font family', exact: true }),
  ).toHaveValue('');
  await expect(dialog.getByLabel('Text size', { exact: true })).toHaveValue('');
  await dialog.getByLabel('Fill', { exact: true }).fill('#ffcc88');
  await dialog
    .getByRole('combobox', { name: 'Font family', exact: true })
    .selectOption('arial');
  await capture(page, 'batch-format');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.locator('.selection-align summary').click();
  await capture(page, 'selection-alignment');
  await page.locator('.selection-align summary').click();
  const result = await exported(page),
    nodes = result.documents[0].pages[0].nodes;
  expect(nodes.slice(0, 2).map((n) => resolveAppearance(n).fill)).toEqual([
    '#ffcc88',
    '#ffcc88',
  ]);
  expect(readRichText(nodes[0])!.paragraphs[0].runs[1].style).toEqual({
    textDecoration: 'underline',
    fontSize: 18,
    fontFamily: 'arial',
  });
  await button(page, 'Undo').click();
  await button(page, 'Undo').click();
  expect((await exported(page)).documents).toEqual(project.documents);
});

test('many pages, 20 fonts and compact German selection controls remain reachable on narrow screens', async ({
  page,
}) => {
  let project = createProject('Planung', () => crypto.randomUUID(), now);
  const d = project.documents[0];
  for (let i = 2; i <= 18; i++)
    project = applyWorkbook(
      project,
      { type: 'newPage', documentId: d.id, title: `Diagramm ${i}` },
      () => crypto.randomUUID(),
      now,
    );
  await open(page, project);
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page.setViewportSize({ width: 390, height: 900 });
  const tabs = page.locator('[role=treeitem][data-page-id]');
  await tabs.first().focus();
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('combobox', { name: 'Diagrammelement', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Ausrichten / Verteilen', { exact: true }),
  ).toHaveCount(0);
  await button(page, 'Text').click();
  await page.locator('.interactive-canvas').focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: 'Text auf der Zeichenfläche bearbeiten',
  });
  await dialog
    .getByRole('textbox', { name: 'Beschriftung / Text', exact: true })
    .fill('Ein Plan. Viele Perspektiven.');
  await dialog.locator('.font-picker summary').click();
  await expect(dialog.locator('.font-menu button')).toHaveCount(20);
  await dialog
    .getByRole('searchbox', { name: 'Schriftarten suchen' })
    .fill('Consolas');
  await dialog
    .locator('.font-menu')
    .getByRole('button', { name: 'Consolas', exact: true })
    .click();
  await capture(page, 'studio-small-de');
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('rich labels on connectors retain explicit ports after text editing and page duplication', async ({
  page,
}) => {
  let project = await setup(page, false);
  const d = project.documents[0],
    p = d.pages[0];
  project = applyEdit(
    project,
    d.id,
    p.id,
    {
      type: 'connect',
      id: crypto.randomUUID(),
      sourceId: p.nodes[0].id,
      targetId: p.nodes[1].id,
      layerId: p.layers[0].id,
      options: {
        ...DEFAULT_CONNECTION,
        sourceAnchor: 'east',
        targetAnchor: 'west',
        label: 'Approved',
      },
    },
    now,
  );
  await open(page, project);
  await button(page, 'Objects').click();
  await page
    .getByLabel('Diagram element', { exact: true })
    .selectOption(project.documents[0].pages[0].connections[0].id);
  const editor = page.getByRole('textbox', {
    name: 'Label / text',
    exact: true,
  });
  await editor.fill('Approved ✓');
  await editor.press('ControlOrMeta+a');
  await editor.press('ControlOrMeta+b');
  await page.keyboard.press('ControlOrMeta+Enter');
  await page.getByRole('treeitem', { selected: true }).press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
  const result = await exported(page),
    copy = result.documents[0].pages[1];
  expect(copy.connections[0].extensions['org.koxora.connection']).toMatchObject(
    { sourceAnchor: 'east', targetAnchor: 'west' },
  );
  expect(
    readRichText(copy.connections[0])!.paragraphs[0].runs[0].style.fontWeight,
  ).toBe(700);
  expect(copy.connections[0].sourceId).toBe(copy.nodes[0].id);
});

test('all local font choices render offline, preserve text and make no external requests', async ({
  page,
  context,
}) => {
  const project = await setup(page);
  const id = project.documents[0].pages[0].nodes[0].id;
  const remote: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://127.0.0.1:4173')) remote.push(r.url());
  });
  await context.setOffline(true);
  await page.locator(`[data-node-id="${id}"]`).dblclick();
  const dialog = page.getByRole('dialog', {
      name: 'Edit text on canvas',
      exact: true,
    }),
    editor = dialog.getByRole('textbox', { name: 'Label / text', exact: true });
  await editor.fill('Offline fonts');
  await editor.press('ControlOrMeta+a');
  for (const [index, stack] of Object.values(FONT_FAMILIES).entries()) {
    await dialog.locator('.font-picker summary').click();
    const option = dialog.locator('.font-menu button').nth(index);
    await expect(option).toHaveCSS(
      'font-family',
      new RegExp(
        stack
          .split(',')[0]
          .replaceAll('"', '')
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      ),
    );
    await option.click();
    await expect(editor).toHaveText('Offline fonts');
  }
  await page.keyboard.press('ControlOrMeta+Enter');
  expect(remote).toEqual([]);
  const result = await exported(page);
  expect(
    readRichText(result.documents[0].pages[0].nodes[0])!.paragraphs[0].runs[0]
      .style.fontFamily,
  ).toBe('liberation');
});
test('protected page deletion reports its reason in the dialog and keeps contents intact', async ({
  page,
}) => {
  let project = await setup(page, false);
  const doc = project.documents[0],
    first = doc.pages[0];
  project = applyWorkbook(
    project,
    { type: 'newPage', documentId: doc.id, title: 'Other' },
    () => crypto.randomUUID(),
    now,
  );
  project.documents[0].actions.push({
    id: crypto.randomUUID(),
    targetId: first.nodes[0].id,
    trigger: 'click',
    operation: 'navigate',
    parameters: { pageId: first.id },
    extensions: {},
  });
  await open(page, project);
  await page.locator('[role=treeitem][data-page-id]').first().click();
  await page.getByRole('treeitem', { selected: true }).press('Shift+F10');
  await page
    .getByRole('menuitem', { name: 'Delete page', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('semantic references');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.locator('[role=treeitem][data-page-id]').first(),
  ).toBeFocused();
  expect((await exported(page)).documents).toEqual(project.documents);
});

test('text-only batch selection hides shape fill and border controls', async ({
  page,
}) => {
  const project = await setup(page, false),
    nodes = project.documents[0].pages[0].nodes;
  nodes[0].kind = 'text';
  nodes[1].kind = 'text';
  await open(page, project);
  const bounds = await Promise.all(
    nodes
      .slice(0, 2)
      .map((node) => page.locator(`[data-node-id="${node.id}"]`).boundingBox()),
  );
  await page.mouse.click(
    bounds[0]!.x + bounds[0]!.width / 2,
    bounds[0]!.y + bounds[0]!.height / 2,
  );
  await page.keyboard.down('Shift');
  await page.mouse.click(
    bounds[1]!.x + bounds[1]!.width / 2,
    bounds[1]!.y + bounds[1]!.height / 2,
  );
  await page.keyboard.up('Shift');
  await button(page, 'Element properties').click();
  const dialog = page.getByRole('dialog', { name: 'Format selection' });
  await expect(dialog.getByLabel('Fill', { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel('Outline', { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel('Outline width', { exact: true })).toHaveCount(
    0,
  );
  await expect(dialog.getByLabel('Text color', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  expect((await exported(page)).documents).toEqual(project.documents);
});

test('native DOM newlines stay distinct through editing, undo and archive export', async ({
  page,
}) => {
  const project = await setup(page),
    id = project.documents[0].pages[0].nodes[0].id;
  await page.locator(`[data-node-id="${id}"]`).dblclick();
  const editor = page.getByRole('textbox', {
    name: 'Label / text',
    exact: true,
  });
  const text = 'First  line\n\nGrüße 世界\n';
  // Firefox can insert a single text node with embedded line endings. Exercise
  // that DOM shape in every engine instead of relying on fill's implementation.
  await editor.evaluate((el, value) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = value;
    el.replaceChildren(paragraph);
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: value,
      }),
    );
  }, text);
  await expect(
    editor.locator('br:not(.ProseMirror-trailingBreak)'),
  ).toHaveCount(3);
  const copyPlainText = async () => {
    await editor.press('ControlOrMeta+a');
    return editor.evaluate((el) => {
      const data = new DataTransfer();
      const event = new Event('copy', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: data });
      el.dispatchEvent(event);
      return data.getData('text/plain');
    });
  };
  expect(await copyPlainText()).toBe(text);
  await selectText(editor, 0, 5);
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await page.keyboard.press('ControlOrMeta+Enter');
  const result = await exported(page),
    node = result.documents[0].pages[0].nodes[0];
  expect(node.content.text).toBe(text);
  expect(readRichText(node)!.paragraphs).toHaveLength(4);
  expect(readRichText(node)!.paragraphs[0].runs[0].style.fontWeight).toBe(700);
  await page.locator(`[data-node-id="${id}"]`).dblclick();
  const copied = await copyPlainText();
  expect(copied).toBe(text);
  await editor.evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData('text/plain', value);
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    el.dispatchEvent(event);
  }, copied);
  await page.keyboard.press('ControlOrMeta+Enter');
  expect(
    (await exported(page)).documents[0].pages[0].nodes[0].content.text,
  ).toBe(text);
});
