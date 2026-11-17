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
  FREEHAND_KEY,
  type EditCommand,
} from '../../packages/editor-core/src/index';

const now = '2026-11-15T09:00:00.000Z';
const canvas = (page: Page) => page.locator('.interactive-canvas');
const labelEditor = (scope: Locator) =>
  scope.locator('[contenteditable="true"][role="textbox"]');
const inline = (page: Page) =>
  page.getByRole('dialog', { name: 'Edit text on canvas', exact: true });
const properties = (page: Page) =>
  page.getByRole('complementary', { name: 'Properties', exact: true });

function fixture() {
  let project = createProject(
    'Live element feedback',
    () => crypto.randomUUID(),
    now,
  );
  const book = project.documents[0];
  const sheet = book.pages[0];
  return {
    get project() {
      return project;
    },
    run(command: EditCommand) {
      project = applyEdit(project, book.id, sheet.id, command, now);
    },
    layerId: sheet.layers[0].id,
  };
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
      name: 'live-feedback.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
}
async function exported(page: Page) {
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
}
async function selectProperties(page: Page, id: string, tab = 'Text') {
  if (!(await page.locator('.objects-panel').isVisible()))
    await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByLabel('Diagram element', { exact: true }).selectOption(id);
  await expect(properties(page)).toBeVisible();
  await properties(page).getByRole('tab', { name: tab, exact: true }).click();
  await expect(
    properties(page).getByRole('button', {
      name: 'Apply changes',
      exact: true,
    }),
  ).toHaveCount(0);
  return properties(page);
}
async function point(page: Page, x: number, y: number) {
  await canvas(page).scrollIntoViewIfNeeded();
  const bounds = (await canvas(page).boundingBox())!;
  const camera = JSON.parse((await canvas(page).getAttribute('data-camera'))!);
  return {
    x: bounds.x + bounds.width / 2 + (x - camera.x) * camera.zoom,
    y: bounds.y + bounds.height / 2 + (y - camera.y) * camera.zoom,
  };
}
async function drag(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
}
async function currentBox(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}
async function connect(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  kind = 'Arrow',
) {
  await page
    .getByRole('toolbar', { name: 'Diagram tools', exact: true })
    .getByRole('button', { name: kind, exact: true })
    .click();
  await drag(
    page,
    await point(page, start.x, start.y),
    await point(page, end.x, end.y),
  );
}
async function clickRegion(page: Page, region: Locator) {
  await region.scrollIntoViewIfNeeded();
  const box = (await region.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('element properties save valid style and text changes live, keep incomplete numbers local and track external undo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const f = fixture(),
    id = crypto.randomUUID();
  f.run({
    type: 'insert',
    id,
    kind: 'rectangle',
    layerId: f.layerId,
    position: { x: 0, y: 0 },
    text: 'Original label',
  });
  await open(page, f.project);
  const form = await selectProperties(page, id, 'Format');
  const format = form.locator('[data-property-tab="format"]');
  await format.getByLabel('Fill', { exact: true }).fill('#efbc7d');
  await expect(
    page.locator(`[data-node-id="${id}"] .scene-node`),
  ).toHaveAttribute('fill', '#efbc7d');
  const geometryWidth = format.getByLabel('Width', { exact: true });
  const originalWidth = Number(await geometryWidth.inputValue());
  await geometryWidth.fill('');
  await format.getByLabel('Height', { exact: true }).fill('210');
  const resized = await exported(page);
  expect(resized.documents[0].pages[0].nodes[0].geometry).toMatchObject({
    width: originalWidth,
    height: 210,
  });
  await expect(geometryWidth).toHaveValue(String(originalWidth));
  const beforeNumber = await exported(page);
  const width = format.getByLabel('Outline width', { exact: true });
  await width.fill('');
  expect((await exported(page)).documents).toEqual(beforeNumber.documents);
  await width.fill('5');
  await expect(
    page.locator(`[data-node-id="${id}"] .scene-node`),
  ).toHaveAttribute('stroke-width', '5');
  await form.getByRole('tab', { name: 'Text', exact: true }).click();
  const editor = labelEditor(form);
  await editor.fill('Saved while typing');
  await expect(
    page.locator(`[data-node-id="${id}"] [data-text-region="body"]`),
  ).toHaveText('Saved while typing');
  await editor.press('ControlOrMeta+a');
  await editor.press('ControlOrMeta+b');
  const saved = await exported(page);
  expect(saved.documents[0].pages[0].nodes[0].content.text).toBe(
    'Saved while typing',
  );
  expect(
    saved.documents[0].pages[0].nodes[0].extensions['org.koxora.rich-text'],
  ).toMatchObject({
    paragraphs: [
      { runs: [{ text: 'Saved while typing', style: { fontWeight: 700 } }] },
    ],
  });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  const undone = await exported(page);
  expect(undone.documents[0].pages[0].nodes[0].content.text).toBe(
    'Original label',
  );
  await selectProperties(page, id, 'Text');
  await expect(labelEditor(properties(page))).toHaveText('Original label');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await selectProperties(page, id, 'Text');
  await expect(labelEditor(properties(page))).toHaveText('Saved while typing');
});

test('freehand has a centered rich label with useful Text properties and preserves its original stroke on reopen and duplication', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const f = fixture(),
    id = crypto.randomUUID();
  f.run({
    type: 'freehand',
    id,
    layerId: f.layerId,
    points: [
      { x: -120, y: -80 },
      { x: -60, y: 70 },
      { x: 60, y: -70 },
      { x: 120, y: 80 },
    ],
    stroke: '#7c3aed',
    strokeWidth: 3,
  });
  const original = f.project.documents[0].pages[0].nodes[0];
  await open(page, f.project);
  const form = await selectProperties(page, id);
  const editor = labelEditor(form);
  await expect(editor).toBeVisible();
  await editor.fill('Central note 世界');
  await editor.press('ControlOrMeta+a');
  await editor.press('ControlOrMeta+i');
  await form
    .locator('.rich-text-editor')
    .getByLabel('Text color', { exact: true })
    .fill('#8a1638');
  const rendered = page.locator(`[data-node-id="${id}"]`);
  const label = rendered.locator('[data-text-region="body"]');
  await expect(label).toHaveText('Central note 世界');
  const center = await rendered.evaluate((element) => {
    const stroke = element
      .querySelector('.scene-node')!
      .getBoundingClientRect();
    const label = element
      .querySelector('[data-text-region="body"]')!
      .getBoundingClientRect();
    return {
      strokeX: stroke.x + stroke.width / 2,
      strokeY: stroke.y + stroke.height / 2,
      labelX: label.x + label.width / 2,
      labelY: label.y + label.height / 2,
    };
  });
  expect(Math.abs(center.strokeX - center.labelX)).toBeLessThan(2);
  expect(Math.abs(center.strokeY - center.labelY)).toBeLessThan(2);
  const changed = await exported(page),
    node = changed.documents[0].pages[0].nodes[0];
  expect(node.extensions[FREEHAND_KEY]).toEqual(
    original.extensions[FREEHAND_KEY],
  );
  expect(node.geometry).toEqual(original.geometry);
  expect(node.extensions['org.koxora.rich-text']).toMatchObject({
    paragraphs: [
      {
        runs: [
          {
            text: 'Central note 世界',
            style: { fontStyle: 'italic', textColor: '#8a1638' },
          },
        ],
      },
    ],
  });
  await clickRegion(page, label);
  await expect(inline(page)).toBeVisible();
  await expect(labelEditor(inline(page))).toHaveText('Central note 世界');
  await labelEditor(inline(page)).fill('Direct freehand note');
  await page.keyboard.press('Escape');
  await canvas(page).focus();
  await page.keyboard.press('ControlOrMeta+d');
  await expect(page.locator('[data-node-id]')).toHaveCount(2);
  const copied = await exported(page);
  expect(
    copied.documents[0].pages[0].nodes[1].extensions[FREEHAND_KEY],
  ).toEqual(original.extensions[FREEHAND_KEY]);
  expect(copied.documents[0].pages[0].nodes[1].content.text).toBe(
    'Direct freehand note',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  expect((await exported(page)).documents).toEqual(copied.documents);
});

test('connectors can start or end in empty space, detach and reattach either end and keep independent arrowheads through native reopening', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const f = fixture(),
    source = crypto.randomUUID(),
    target = crypto.randomUUID();
  for (const [id, x] of [
    [source, -280],
    [target, 120],
  ] as const)
    f.run({
      type: 'insert',
      id,
      kind: 'rectangle',
      layerId: f.layerId,
      position: { x, y: -50 },
      geometry: { x, y: -50, width: 160, height: 100, rotation: 0 },
      text: '',
    });
  await open(page, f.project);
  await connect(page, { x: -200, y: 0 }, { x: 0, y: -180 });
  await expect(page.locator('[data-connection-id]')).toHaveCount(1);
  await connect(page, { x: 0, y: 180 }, { x: 200, y: 0 }, 'Line');
  await expect(page.locator('[data-connection-id]')).toHaveCount(2);
  await connect(page, { x: -200, y: 0 }, { x: 200, y: 0 });
  await expect(page.locator('[data-connection-id]')).toHaveCount(3);
  // Keep the distant free-line endpoints inside the working area with the connection strip visible.
  await canvas(page).focus();
  await page.keyboard.press('-');
  await connect(page, { x: -320, y: -240 }, { x: 320, y: -240 }, 'Line');
  await expect(page.locator('[data-node-id]')).toHaveCount(3);
  let result = await exported(page),
    edges = result.documents[0].pages[0].connections;
  expect(edges[0]).toMatchObject({
    sourceId: source,
    targetPoint: { x: expect.any(Number), y: expect.any(Number) },
  });
  expect(edges[0].targetId).toBeUndefined();
  expect(edges[1]).toMatchObject({
    sourcePoint: { x: expect.any(Number), y: expect.any(Number) },
    targetId: target,
  });
  expect(edges[1].sourceId).toBeUndefined();
  expect(edges[2]).toMatchObject({ sourceId: source, targetId: target });
  expect(result.manifest.requiredFeatures).toContain(
    'floating-connection-endpoints-v1',
  );
  await selectProperties(page, edges[0].id, 'Format');
  await properties(page)
    .getByLabel('Arrowhead at start', { exact: true })
    .check();
  await properties(page)
    .getByLabel('Arrowhead at end', { exact: true })
    .check();
  await expect(
    page.locator(`[data-connection-id="${edges[0].id}"] .scene-arrow`),
  ).toHaveCount(2);
  const endpoint = (end: 'source' | 'target') =>
    page.locator(
      `[data-connection-endpoint-id="${edges[0].id}"][data-connection-endpoint="${end}"]`,
    );
  await expect(endpoint('source')).toBeVisible();
  const sourceBox = await currentBox(endpoint('source'));
  await drag(
    page,
    {
      x: sourceBox.x + sourceBox.width / 2,
      y: sourceBox.y + sourceBox.height / 2,
    },
    await point(page, -340, 180),
  );
  result = await exported(page);
  edges = result.documents[0].pages[0].connections;
  expect(edges[0].sourceId).toBeUndefined();
  expect(edges[0].sourcePoint).toBeDefined();
  await selectProperties(page, edges[0].id, 'Format');
  await expect(endpoint('target')).toBeVisible();
  const targetBox = await currentBox(endpoint('target'));
  await drag(
    page,
    {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2,
    },
    await point(page, 200, 0),
  );
  result = await exported(page);
  edges = result.documents[0].pages[0].connections;
  expect(edges[0].targetId).toBe(target);
  expect(edges[0].targetPoint).toBeUndefined();
  // The existing attached pair must be removed before another connector can use it.
  await selectProperties(page, edges[2].id, 'Format');
  await canvas(page).focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-connection-id]')).toHaveCount(2);
  await selectProperties(page, edges[0].id, 'Format');
  await expect(endpoint('source')).toBeVisible();
  const detachedBox = await currentBox(endpoint('source'));
  await drag(
    page,
    {
      x: detachedBox.x + detachedBox.width / 2,
      y: detachedBox.y + detachedBox.height / 2,
    },
    await point(page, -200, 0),
  );
  result = await exported(page);
  expect(result.documents[0].pages[0].connections[0]).toMatchObject({
    sourceId: source,
    targetId: target,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  expect((await exported(page)).documents).toEqual(result.documents);
});

test('unhandled studio context menus are cancelled while native text editing and the canvas menu remain available', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const handled = await page.getByRole('banner').evaluate(
    (element) =>
      !element.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
        }),
      ),
  );
  expect(handled).toBe(true);
  await expect(page.getByLabel('Project name', { exact: true })).toBeEditable();
  const editableNativeMenu = await page
    .getByLabel('Project name', { exact: true })
    .evaluate((element) =>
      element.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
        }),
      ),
    );
  expect(editableNativeMenu).toBe(true);
  const name = page.getByLabel('Project name', { exact: true });
  for (const attribute of ['readonly', 'disabled']) {
    const cancelled = await name.evaluate((element, attribute) => {
      element.setAttribute(attribute, '');
      const result = !element.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
        }),
      );
      element.removeAttribute(attribute);
      return result;
    }, attribute);
    expect(cancelled).toBe(true);
  }
  await page
    .getByRole('toolbar', { name: 'Diagram tools', exact: true })
    .getByRole('button', { name: 'Rectangle', exact: true })
    .click();
  const checkboxCancelled = await page
    .locator('input[type="checkbox"]')
    .first()
    .evaluate(
      (element) =>
        !element.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2,
          }),
        ),
    );
  expect(checkboxCancelled).toBe(true);
  await page
    .getByRole('toolbar', { name: 'Diagram tools', exact: true })
    .getByRole('button', { name: 'Select', exact: true })
    .click();
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: 'right',
  });
  await expect(page.getByRole('menu')).toBeVisible();
});

for (const locale of ['en', 'de']) {
  test(`freehand live text and formatting controls remain usable at 390px and 200% in ${locale}`, async ({
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
    const f = fixture(),
      id = crypto.randomUUID();
    f.run({
      type: 'freehand',
      id,
      layerId: f.layerId,
      points: [
        { x: -60, y: -40 },
        { x: 0, y: 40 },
        { x: 60, y: -40 },
      ],
      stroke: '#7c3aed',
      strokeWidth: 3,
    });
    await open(page, f.project, locale);
    await page
      .getByRole('button', { name: messages['format.objects'], exact: true })
      .click();
    await page
      .getByLabel(messages['diagram.target'], { exact: true })
      .selectOption(id);
    const form = page.getByRole('complementary', {
      name: messages['office.properties'],
      exact: true,
    });
    await form
      .getByRole('tab', { name: messages['office.property.text'], exact: true })
      .click();
    const editor = labelEditor(form);
    await editor.scrollIntoViewIfNeeded();
    await expect(editor).toBeInViewport();
    await editor.fill('Central live note Ω');
    await editor.press('ControlOrMeta+a');
    const italic = form.getByRole('button', {
      name: messages['text.italic'],
      exact: true,
    });
    await italic.scrollIntoViewIfNeeded();
    await expect(italic).toBeInViewport();
    await italic.click();
    await expect(
      form.getByRole('button', {
        name: messages['diagram.apply'],
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.locator(`[data-node-id="${id}"] [data-text-region="body"]`),
    ).toHaveText('Central live note Ω');
    await expect(page.locator('.save-status')).toHaveText(
      messages['project.saved'],
    );
    await page.reload();
    await page
      .getByRole('button', { name: messages['project.open'], exact: true })
      .click();
    await expect(
      page.locator(`[data-node-id="${id}"] [data-text-region="body"]`),
    ).toHaveText('Central live note Ω');
    await expect(
      page
        .locator(`[data-node-id="${id}"] [data-text-region="body"] span`)
        .filter({ hasText: 'Central live note Ω' }),
    ).toHaveCSS('font-style', 'italic');
  });
}
