import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
  type Project,
} from '../../packages/project/src/index';
import {
  applyEdit,
  DEFAULT_CONNECTION,
  readFreehand,
  readStackOrder,
  readRichText,
} from '../../packages/editor-core/src/index';
const now = '2026-10-27T12:00:00.000Z';
const id = () => crypto.randomUUID();
const button = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true });
const canvas = (p: Page) => p.locator('.interactive-canvas');
const treePages = (p: Page) => p.locator('[role=treeitem][data-page-id]');
async function open(p: Page, project?: Project) {
  await p.goto('/');
  await p.setViewportSize({ width: 1440, height: 1100 });
  if (project) {
    await button(p, 'Import .koxora').click();
    await p
      .getByRole('dialog')
      .getByLabel('Import .koxora', { exact: true })
      .setInputFiles({
        name: 'feedback.koxora',
        mimeType: 'application/zip',
        buffer: Buffer.from(await exportProject(project)),
      });
  } else await button(p, 'New project').click();
  await expect(canvas(p)).toHaveAttribute('data-camera', /zoom/);
}
async function exported(p: Page) {
  if (await button(p, 'Restore workspace').isVisible())
    await button(p, 'Restore workspace').click();
  const download = p.waitForEvent('download');
  await button(p, 'Export .koxora').click();
  const result = await importProject(
    new Uint8Array(readFileSync((await (await download).path())!)),
  );
  await expect(button(p, 'Export .koxora')).toBeEnabled();
  return result;
}
async function point(p: Page, x: number, y: number) {
  await canvas(p).scrollIntoViewIfNeeded();
  const box = (await canvas(p).boundingBox())!,
    camera = JSON.parse((await canvas(p).getAttribute('data-camera'))!);
  return {
    x: box.x + box.width / 2 + (x - camera.x) * camera.zoom,
    y: box.y + box.height / 2 + (y - camera.y) * camera.zoom,
  };
}
async function capture(p: Page, name: string) {
  if (process.env.KOXORA_CAPTURE && test.info().project.name === 'chromium') {
    mkdirSync('docs/design/screenshots/phase-2.5', { recursive: true });
    await p.screenshot({
      path: `docs/design/screenshots/phase-2.5/${name}.png`,
      fullPage: true,
    });
  }
}
function fixture() {
  let p = createProject('Feedback retest', id, now);
  const d = p.documents[0],
    page = d.pages[0];
  for (const x of [-200, 200, 0])
    p = applyEdit(
      p,
      d.id,
      page.id,
      {
        type: 'insert',
        id: id(),
        layerId: page.layers[0].id,
        kind: 'rectangle',
        position: { x, y: 0 },
        text: 'Label',
      },
      now,
    );
  return p;
}

test('navigator menus stay interactive inside expanded canvas and preserve keyboard history and deletion focus', async ({
  page,
}) => {
  await open(page);
  await button(page, 'New page').click();
  const second = treePages(page).last();
  await second.press('F2');
  await page.getByLabel('Name', { exact: true }).fill('Details');
  await page.getByLabel('Name', { exact: true }).press('Enter');
  await expect(second).toBeFocused();
  await second.press('ControlOrMeta+z');
  await expect(second).toHaveAttribute('aria-label', 'Page 2');
  await second.press('ControlOrMeta+Shift+z');
  await expect(second).toHaveAttribute('aria-label', 'Details');
  await button(page, 'Expand canvas').click();
  await button(page, 'Project navigator').click();
  const nav = page.getByRole('dialog', {
    name: 'Project navigator',
    exact: true,
  });
  const projectRoot = nav.locator('[role=treeitem][aria-level="1"]');
  await projectRoot.press('ArrowLeft');
  await expect(nav).toBeVisible();
  await expect(projectRoot).toHaveAttribute('aria-expanded', 'false');
  await projectRoot.press('ArrowRight');
  await expect(projectRoot).toHaveAttribute('aria-expanded', 'true');
  const row = nav.getByRole('treeitem', { name: 'Details', exact: true });
  await row.click({ button: 'right' });
  const menu = page.getByRole('menu');
  await expect(
    menu.getByRole('menuitem', { name: 'Rename', exact: true }),
  ).toBeFocused();
  expect(await menu.evaluate((el) => !!el.closest('dialog[open]'))).toBe(true);
  await capture(page, 'navigator-context');
  await page.keyboard.press('Escape');
  await expect(row).toBeFocused();
  await row.press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Rename', exact: true })
    .getByLabel('Name', { exact: true })
    .fill('Renamed in navigator');
  await page
    .getByRole('dialog', { name: 'Rename', exact: true })
    .getByLabel('Name', { exact: true })
    .press('Enter');
  await expect(nav.getByRole('treeitem', { selected: true })).toBeFocused();
  await nav.getByRole('treeitem', { selected: true }).press('Shift+F10');
  await page
    .getByRole('menuitem', { name: 'Delete page', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Delete page', exact: true })
    .getByRole('button', { name: 'Continue', exact: true })
    .click();
  await expect(nav.getByRole('treeitem', { selected: true })).toBeFocused();
  await nav.getByRole('treeitem', { selected: true }).press('ControlOrMeta+z');
  await expect(nav.locator('[data-page-id]')).toHaveCount(2);
});

test('sidebar saves before project switching, duplicates complete projects and restores deleted projects after expanded mode', async ({
  page,
}) => {
  await open(page);
  await page.getByLabel('Project name', { exact: true }).fill('First project');
  await page.getByLabel('Project name', { exact: true }).press('Enter');
  await button(page, 'Create project in navigator').click();
  await page.getByLabel('Project name', { exact: true }).fill('Second project');
  await page.getByLabel('Project name', { exact: true }).press('Enter');
  await page
    .getByRole('treeitem', { name: 'First project', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'First project',
  );
  await expect(
    page.getByRole('treeitem', { name: 'Second project', exact: true }),
  ).not.toHaveAttribute('aria-disabled', 'true');
  await page
    .getByRole('treeitem', { name: 'Second project', exact: true })
    .press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Second project (copy)',
  );
  const copy = await exported(page);
  await button(page, 'Expand canvas').click();
  await button(page, 'Project navigator').click();
  const root = page.getByRole('treeitem', {
    name: 'Second project (copy)',
    exact: true,
  });
  await root.press('Shift+F10');
  await page
    .getByRole('menuitem', { name: 'Delete project…', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Delete project…', exact: true })
    .getByRole('button', { name: 'Continue', exact: true })
    .click();
  await expect(page.getByRole('tree')).toBeVisible();
  await page.locator('.project-trash summary').click();
  await button(page, 'Restore project').click();
  await page
    .getByRole('treeitem', { name: 'Second project (copy)', exact: true })
    .click();
  expect((await exported(page)).documents).toEqual(copy.documents);
  await page
    .getByRole('treeitem', { name: 'First project', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'First project',
  );
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await button(page, 'New page').click();
  await page
    .getByRole('treeitem', { name: 'Second project', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Local storage');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'First project',
  );
  expect((await exported(page)).documents[0].pages).toHaveLength(2);
});

test('pen samples mouse, touch and pen strokes, supports keyboard drawing, cancellation and ordinary editing offline', async ({
  page,
  context,
}) => {
  await open(page);
  await button(page, 'Freehand pen').click();
  const start = await point(page, -150, 0),
    end = await point(page, 0, -80);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 15 });
  await page.mouse.move(end.x + 100, end.y + 70, { steps: 15 });
  await page.mouse.up();
  await expect(canvas(page).locator('[data-node-id]')).toHaveCount(1);
  for (const pointerType of ['touch', 'pen']) {
    await canvas(page).evaluate((el, pointerType) => {
      const capture = el.setPointerCapture;
      el.setPointerCapture = () => {}; // Synthetic pointers are not registered with the browser capture registry.
      const b = el.getBoundingClientRect();
      for (const [i, type] of [
        'pointerdown',
        'pointermove',
        'pointermove',
        'pointerup',
      ].entries())
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 5,
            pointerType,
            clientX: b.x + 100 + i * 20,
            clientY: b.y + 140 + i * 15,
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            bubbles: true,
            cancelable: true,
          }),
        );
      el.setPointerCapture = capture;
    }, pointerType);
    await expect(canvas(page).locator('[data-node-id]')).toHaveCount(
      pointerType === 'touch' ? 2 : 3,
    );
  }
  await expect(canvas(page).locator('[data-node-id]')).toHaveCount(3);
  await canvas(page).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Enter');
  await expect(canvas(page).locator('[data-node-id]')).toHaveCount(4);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(canvas(page).locator('[data-node-id]')).toHaveCount(4);
  await button(page, 'Select').click();
  await canvas(page).focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ControlOrMeta+c');
  await page.keyboard.press('ControlOrMeta+v');
  await expect(canvas(page).locator('[data-node-id]')).toHaveCount(8);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(canvas(page).locator('[data-node-id]')).toHaveCount(4);
  const p = await exported(page);
  expect(
    p.documents[0].pages[0].nodes.every(
      (n) => n.kind === 'freehand' && readFreehand(n)?.length,
    ),
  ).toBe(true);
  await button(page, 'Freehand pen').click();
  await capture(page, 'freehand');
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
  expect((await exported(page)).documents).toEqual(p.documents);
});

test('stacking paints and hits connectors above shapes, restores via keyboard and preserves clipboard order', async ({
  page,
}) => {
  let p = fixture();
  const d = p.documents[0],
    model = d.pages[0],
    edge = id();
  p = applyEdit(
    p,
    d.id,
    model.id,
    {
      type: 'connect',
      id: edge,
      sourceId: model.nodes[0].id,
      targetId: model.nodes[1].id,
      layerId: model.layers[0].id,
      options: DEFAULT_CONNECTION,
    },
    now,
  );
  await open(page, p);
  const target = await point(page, -100, 0);
  await page.mouse.click(target.x, target.y, { button: 'right' });
  await page
    .getByRole('menuitem', { name: 'Bring to front', exact: true })
    .click();
  const middle = await point(page, 0, 0);
  await page.mouse.click(middle.x, middle.y);
  await expect(canvas(page)).toHaveAttribute(
    'data-selection',
    JSON.stringify([edge]),
  );
  await canvas(page).press('ControlOrMeta+Alt+Shift+ArrowDown');
  await page.mouse.click(middle.x, middle.y);
  await expect(canvas(page)).toHaveAttribute(
    'data-selection',
    JSON.stringify([model.nodes[2].id]),
  );
  await canvas(page).press('ControlOrMeta+z');
  await page.mouse.dblclick(middle.x, middle.y);
  await expect(
    page.getByRole('dialog', { name: 'Edit text on canvas', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await canvas(page).focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+d');
  const result = await exported(page),
    out = result.documents[0].pages[0];
  expect(readStackOrder(out)?.at(-1)).toBe(out.connections[1].id);
  await page.locator('.selection-stack summary').click();
  await capture(page, 'stacking');
});

test('arrangement preview cancels without edits and non-overlap layout is one reversible command', async ({
  page,
}) => {
  const project = fixture();
  await open(page, project);
  await canvas(page).focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.locator('.selection-align summary').click();
  await button(page, 'Align left').focus();
  await expect(
    page.getByText('Arrangement preview — click to apply, Escape to cancel.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await exported(page)).documents).toEqual(project.documents);
  await page.locator('.selection-align summary').click();
  await button(page, 'Arrange without overlap').click();
  const result = await exported(page),
    nodes = result.documents[0].pages[0].nodes;
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i].geometry,
        b = nodes[j].geometry;
      expect(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
      ).toBe(true);
    }
  await button(page, 'Undo').click();
  expect((await exported(page)).documents).toEqual(project.documents);
});

for (const theme of ['light', 'dark'])
  test(`automatic and explicit mixed colors keep canvas, editor backdrop, caret and portable semantics in ${theme}`, async ({
    page,
  }) => {
    let p = fixture();
    const d = p.documents[0],
      model = d.pages[0],
      node = model.nodes[0].id;
    p = applyEdit(
      p,
      d.id,
      model.id,
      {
        type: 'format',
        ids: [node],
        patch: { textColor: '#ffffff', fill: '#000000' },
      },
      now,
    );
    p = applyEdit(
      p,
      d.id,
      model.id,
      {
        type: 'richText',
        id: node,
        value: {
          version: 1,
          paragraphs: [
            {
              align: 'left',
              runs: [
                { text: 'White ', style: { textColor: '#ffffff' } },
                { text: 'Black ', style: { textColor: '#000000' } },
                { text: 'Automatic', style: { textColor: 'auto' } },
              ],
            },
          ],
        },
      },
      now,
    );
    await open(page, p);
    await page
      .getByRole('combobox', { name: 'Appearance', exact: true })
      .selectOption(theme);
    const rendered = page.locator(`[data-node-id="${node}"]`);
    await expect(rendered.locator('.scene-rich-label span').nth(2)).toHaveCSS(
      'color',
      'rgb(255, 255, 255)',
    );
    await rendered.dblclick();
    const editor = page.getByRole('textbox', {
      name: 'Label / text',
      exact: true,
    });
    await expect(editor.locator('[data-text-color="#ffffff"]')).toHaveCSS(
      'background-color',
      'rgb(0, 0, 0)',
    );
    await expect(editor.locator('[data-text-color="#ffffff"]')).toHaveCSS(
      'caret-color',
      'rgb(255, 255, 255)',
    );
    await expect(editor.locator('[data-text-color="#000000"]')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await capture(page, `contrast-${theme}`);
    await editor.press('ControlOrMeta+a');
    await editor.evaluate((el) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData(
        'text/html',
        '<p><span data-text-color="auto" style="color:var(--ink)">Automatic paste</span></p>',
      );
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: clipboardData });
      el.dispatchEvent(event);
    });
    await expect(editor.locator('[data-text-color="auto"]')).toHaveText(
      'Automatic paste',
    );
    await expect(editor.locator('[data-text-color="auto"]')).toHaveCSS(
      'background-color',
      theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(16, 19, 35)',
    );
    await page.keyboard.press('ControlOrMeta+Enter');
    const saved = await exported(page);
    expect(
      readRichText(saved.documents[0].pages[0].nodes[0])?.paragraphs[0].runs[0]
        .style.textColor,
    ).toBe('auto');
    await page
      .getByRole('combobox', { name: 'Appearance', exact: true })
      .selectOption(theme === 'light' ? 'dark' : 'light');
    expect((await exported(page)).documents).toEqual(saved.documents);
  });

test('context menus clamp to narrow viewport edges and visible touch actions dismiss with focus return', async ({
  page,
}) => {
  await open(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await canvas(page).scrollIntoViewIfNeeded();
  await canvas(page).evaluate((el) =>
    el.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: innerWidth - 2,
        clientY: innerHeight - 2,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  expect(
    await menu.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return (
        b.left >= 0 &&
        b.top >= 0 &&
        b.right <= innerWidth &&
        b.bottom <= innerHeight
      );
    }),
  ).toBe(true);
  await expect(
    menu.getByRole('menuitem', { name: 'Edit text', exact: true }),
  ).toHaveCount(0);
  await expect(
    menu.getByRole('menuitem', { name: 'Delete', exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(canvas(page)).toBeFocused();
  const trigger = page.locator('.tree-actions').last();
  await trigger.click();
  await expect(
    menu.getByRole('menuitem', { name: 'Rename', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await capture(page, 'navigator-narrow');
});

test('automatic defaults remain legible on shape, standalone text, arrow and connector in both themes without changing stored colors', async ({
  page,
}) => {
  let p = fixture();
  const d = p.documents[0],
    model = d.pages[0];
  const text = id(),
    arrow = id(),
    edge = id();
  for (const [node, kind, y] of [
    [text, 'text', -140],
    [arrow, 'arrow', 140],
  ] as const)
    p = applyEdit(
      p,
      d.id,
      model.id,
      {
        type: 'insert',
        id: node,
        kind,
        layerId: model.layers[0].id,
        position: { x: 0, y },
        text: 'Automatic label',
      },
      now,
    );
  p = applyEdit(
    p,
    d.id,
    model.id,
    {
      type: 'connect',
      id: edge,
      sourceId: model.nodes[0].id,
      targetId: model.nodes[1].id,
      layerId: model.layers[0].id,
      options: { ...DEFAULT_CONNECTION, label: 'Automatic edge' },
    },
    now,
  );
  await open(page, p);
  for (const theme of ['light', 'dark']) {
    await page
      .getByRole('combobox', { name: 'Appearance', exact: true })
      .selectOption(theme);
    const ink = await canvas(page).evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--ink').trim(),
    );
    for (const selector of [
      `[data-node-id="${text}"]`,
      `[data-node-id="${arrow}"]`,
      `[data-connection-id="${edge}"]`,
    ])
      expect(
        await page
          .locator(`${selector} text`)
          .evaluate((el) => el.getAttribute('fill')),
      ).toBe('var(--ink)');
    expect(ink).toMatch(/^#/);
    await expect(
      page.locator(`[data-node-id="${model.nodes[0].id}"] text`),
    ).toHaveAttribute('fill', '#000000');
  }
  expect((await exported(page)).documents).toEqual(p.documents);
});

test('a second touch cancels pending ink and pinches from the latest finger position', async ({
  page,
}) => {
  await open(page);
  await button(page, 'Freehand pen').click();
  await canvas(page).evaluate((el) => {
    const capture = el.setPointerCapture;
    el.setPointerCapture = () => {};
    const box = el.getBoundingClientRect();
    const send = (type: string, pointerId: number, x: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId,
          pointerType: 'touch',
          clientX: box.x + x,
          clientY: box.y + 100,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          bubbles: true,
          cancelable: true,
        }),
      );
    send('pointerdown', 5, 100);
    send('pointermove', 5, 300);
    send('pointerdown', 6, 400);
    send('pointermove', 5, 310);
    send('pointerup', 5, 310);
    send('pointerup', 6, 400);
    el.setPointerCapture = capture;
  });
  await expect
    .poll(
      async () =>
        JSON.parse((await canvas(page).getAttribute('data-camera'))!).zoom,
    )
    .toBeCloseTo(0.9, 4);
  await expect(canvas(page).locator('[data-node-id]')).toHaveCount(0);
  expect((await exported(page)).documents[0].pages[0].nodes).toHaveLength(0);
});

test('keyboard menu navigation reveals actions in short windows', async ({
  page,
}) => {
  await open(page, fixture());
  await canvas(page).focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.setViewportSize({ width: 800, height: 320 });
  const trigger = button(page, 'Selection actions');
  await trigger.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await page.keyboard.press('End');
  const cancel = menu.getByRole('menuitem', { name: 'Cancel', exact: true });
  await expect(cancel).toBeFocused();
  expect(
    await cancel.evaluate((el) => {
      const b = el.getBoundingClientRect(),
        m = el.closest('[role=menu]')!.getBoundingClientRect();
      return b.top >= m.top && b.bottom <= m.bottom;
    }),
  ).toBe(true);
  await page.keyboard.press('Home');
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
