import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';
import {
  applyEdit,
  readConnection,
  readAppearance,
  ELEMENT_KEY,
  CONNECTION_KEY,
  jsonObject,
} from '../../packages/editor-core/src/index';
const button = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true });
const canvas = (p: Page) => p.locator('.interactive-canvas');
const port = (p: Page, id: string, anchor: string) =>
  p.locator(`[data-port-node="${id}"][data-port-anchor="${anchor}"]`);
async function fixture(p: Page) {
  let project = createProject(
    'Acceptance workflow',
    () => crypto.randomUUID(),
    '2026-10-24T12:00:00.000Z',
  );
  const d = project.documents[0],
    page = d.pages[0];
  for (const [i, x] of [-210, 210, -210, 210].entries())
    project = applyEdit(
      project,
      d.id,
      page.id,
      {
        type: 'insert',
        id: crypto.randomUUID(),
        kind: i === 1 ? 'diamond' : 'rectangle',
        text: ['Draft', 'Review', 'Revise', 'Publish'][i],
        position: { x, y: i < 2 ? -100 : 110 },
        layerId: page.layers[0].id,
      },
      project.manifest.updatedAt,
    );
  await p.goto('/');
  await p.setViewportSize({ width: 1440, height: 1100 });
  await button(p, 'Import .koxora').click();
  await p
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'acceptance.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(p.locator('[data-node-id]')).toHaveCount(4);
  await button(p, 'Expand canvas').click();
  return project.documents[0].pages[0].nodes.map((n) => n.id);
}
async function point(p: Page, x: number, y: number) {
  const box = (await canvas(p).boundingBox())!,
    c = JSON.parse((await canvas(p).getAttribute('data-camera'))!);
  return {
    x: box.x + box.width / 2 + (x - c.x) * c.zoom,
    y: box.y + box.height / 2 + (y - c.y) * c.zoom,
  };
}
async function click(p: Page, x: number, y: number) {
  const pos = await point(p, x, y);
  await p.mouse.click(pos.x, pos.y);
}
async function center(locator: Locator) {
  await expect(locator).toBeVisible();
  return locator.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
}
async function drag(
  p: Page,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  await p.mouse.move(a.x, a.y);
  await p.mouse.down();
  await p.mouse.move(b.x, b.y, { steps: 8 });
  await p.mouse.up();
}
async function exported(p: Page) {
  if (await button(p, 'Restore workspace').isVisible())
    await button(p, 'Restore workspace').click();
  const download = p.waitForEvent('download');
  await button(p, 'Export .koxora').click();
  return importProject(
    new Uint8Array(readFileSync((await (await download).path())!)),
  );
}
async function properties(p: Page, id: string) {
  const more = p.locator('.editing-more');
  if (!(await more.evaluate((e) => (e as HTMLDetailsElement).open)))
    await more.locator('summary').click();
  await p
    .getByRole('combobox', { name: 'Diagram element', exact: true })
    .selectOption(id);
  await expect(
    p.getByRole('dialog', { name: 'Element properties', exact: true }),
  ).toBeVisible();
}
async function capture(p: Page, name: string) {
  if (process.env.KOXORA_CAPTURE && test.info().project.name === 'chromium') {
    mkdirSync('docs/design/screenshots/phase-2.4', { recursive: true });
    await p.screenshot({
      path: `docs/design/screenshots/phase-2.4/${name}.png`,
      fullPage: true,
    });
  }
}

test('visible explicit ports attach through move, resize, undo, save and offline reopening', async ({
  page,
  context,
}) => {
  const ids = await fixture(page);
  for (const name of ['Connect', 'Edit', 'Cancel tool · Esc'])
    await expect(button(page, name)).toHaveCount(0);
  await expect(
    page.getByLabel('Repeat insertion', { exact: true }),
  ).toHaveCount(0);
  await button(page, 'Line').click();
  await expect(page.locator('.connection-port')).toHaveCount(16);
  const source = port(page, ids[0], 'east');
  await source.click();
  await expect(source).toHaveAttribute('aria-pressed', 'true');
  const cursor = await point(page, 20, -30);
  await page.mouse.move(cursor.x, cursor.y);
  await expect(page.locator('.connection-preview')).toBeVisible();
  await capture(page, 'connection-ports');
  await port(page, ids[1], 'west').click();
  await expect(page.locator('[data-connection-id]')).toHaveCount(1);
  await expect(page.locator('.scene-arrow')).toHaveCount(0);
  await expect(page.locator('.connection-port')).toHaveCount(0);
  await button(page, 'Undo').click();
  await expect(page.locator('[data-connection-id]')).toHaveCount(0);
  await button(page, 'Redo').click();
  await expect(page.locator('[data-connection-id]')).toHaveCount(1);
  const before = await page.locator('.scene-connection').getAttribute('d');
  await drag(page, await point(page, -210, -100), await point(page, -170, -50));
  await expect(page.locator('.scene-connection')).not.toHaveAttribute(
    'd',
    before!,
  );
  const moved = await page.locator('.scene-connection').getAttribute('d');
  const handle = await center(page.locator('[data-handle="se"]'));
  await drag(page, handle, { x: handle.x + 60, y: handle.y + 30 });
  await expect(page.locator('.scene-connection')).not.toHaveAttribute(
    'd',
    moved!,
  );
  const project = await exported(page),
    model = project.documents[0].pages[0];
  expect(model.nodes).toHaveLength(4);
  expect(readConnection(model.connections[0])).toMatchObject({
    arrow: false,
    sourceAnchor: 'east',
    targetAnchor: 'west',
  });
  expect(model.connections[0]).toMatchObject({
    sourceId: ids[0],
    targetId: ids[1],
  });
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
  expect((await exported(page)).documents[0].pages[0].connections).toEqual(
    model.connections,
  );
  await button(page, 'Arrow').click();
  await port(page, ids[2], 'north').click();
  await port(page, ids[3], 'south').click();
  await expect(page.locator('[data-connection-id]')).toHaveCount(2);
});

test('automatic linking, port drag, invalid targets and cancellation keep free drawings independent', async ({
  page,
}) => {
  const ids = await fixture(page);
  await button(page, 'Arrow').click();
  await click(page, -210, -100);
  await click(page, 210, -100);
  await expect(page.locator('[data-connection-id]')).toHaveCount(1);
  await expect(page.locator('.scene-arrow')).toHaveCount(1);
  await button(page, 'Arrow').click();
  await click(page, -210, -100);
  await click(page, -210, -100);
  await expect(page.getByRole('alert')).toBeVisible();
  await click(page, 210, -100);
  await expect(page.getByRole('alert')).toContainText('already');
  await page.keyboard.press('Escape');
  await expect(page.locator('.connection-preview')).toHaveCount(0);
  await button(page, 'Line').click();
  await port(page, ids[2], 'north').click();
  await button(page, 'Rectangle').click();
  await expect(page.locator('.connection-port')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await button(page, 'Arrow').click();
  await drag(
    page,
    await center(port(page, ids[2], 'north')),
    await center(port(page, ids[3], 'south')),
  );
  await expect(page.locator('[data-connection-id]')).toHaveCount(2);
  await button(page, 'Line').click();
  await drag(page, await point(page, -100, 230), await point(page, 120, 230));
  await expect(page.locator('[data-node-id]')).toHaveCount(5);
  await expect(page.locator('[data-handle="start"]')).toBeVisible();
  const model = (await exported(page)).documents[0].pages[0];
  expect(readConnection(model.connections[0])).toMatchObject({
    sourceAnchor: 'auto',
    targetAnchor: 'auto',
    arrow: true,
  });
  expect(readConnection(model.connections[1])).toMatchObject({
    sourceAnchor: 'north',
    targetAnchor: 'south',
    arrow: true,
  });
  expect(model.nodes.at(-1)?.kind).toBe('line');
});

test('ports keep screen-sized targets, keyboard focus and localized touch or pen access', async ({
  page,
  isMobile,
}) => {
  const ids = await fixture(page);
  await button(page, 'Arrow').click();
  const first = port(page, ids[0], 'north');
  await canvas(page).focus();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(port(page, ids[0], 'east')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(port(page, ids[0], 'east')).toBeFocused();
  await canvas(page).dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
  await expect(port(page, ids[0], 'east')).toBeFocused();
  expect((await port(page, ids[0], 'east').boundingBox())!.width).toBe(32);
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await expect(port(page, ids[1], 'west')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-connection-id]')).toHaveCount(1);
  await expect(canvas(page)).toBeFocused();
  await button(page, 'Restore workspace').click();
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await button(page, 'Zeichenfläche erweitern').click();
  await button(page, 'Pfeil').click();
  const a = port(page, ids[2], 'south'),
    b = port(page, ids[3], 'north');
  await expect(a).toHaveAccessibleName('Revise: Verbindungspunkt Unten');
  if (isMobile) {
    await a.tap();
    await b.tap();
  } else {
    // Synthetic pen events have no hardware pointer registered for capture.
    await canvas(page).evaluate((el) => {
      el.setPointerCapture = () => {};
    });
    for (const target of [a, b]) {
      await target.scrollIntoViewIfNeeded();
      const p = await center(target);
      await target.dispatchEvent('pointerdown', {
        pointerId: 7,
        pointerType: 'pen',
        button: 0,
        clientX: p.x,
        clientY: p.y,
      });
      await canvas(page).dispatchEvent('pointerup', {
        pointerId: 7,
        pointerType: 'pen',
        button: 0,
        clientX: p.x,
        clientY: p.y,
      });
    }
  }
  await expect(page.locator('[data-connection-id]')).toHaveCount(2);
});

test('a pending source stays authoritative when the next pointer gesture becomes a drag', async ({
  page,
}) => {
  const ids = await fixture(page);
  await button(page, 'Arrow').click();
  await port(page, ids[0], 'east').click();
  const a = await center(port(page, ids[1], 'north')),
    b = await center(port(page, ids[3], 'west'));
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await expect(port(page, ids[0], 'east')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.connection-preview')).toBeVisible();
  await page.mouse.up();
  const model = (await exported(page)).documents[0].pages[0];
  expect(model.connections[0]).toMatchObject({
    sourceId: ids[0],
    targetId: ids[3],
  });
  expect(readConnection(model.connections[0])).toMatchObject({
    sourceAnchor: 'east',
    targetAnchor: 'west',
  });
});

test('name and point pickers provide connection access without canvas pointing', async ({
  page,
}) => {
  const ids = await fixture(page);
  await button(page, 'Line').click();
  await page.getByText('Connect by name', { exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Source shape', exact: true })
    .selectOption(ids[0]);
  await page
    .getByRole('combobox', { name: 'Connection point', exact: true })
    .selectOption('south');
  await button(page, 'Use as source').click();
  await page
    .getByRole('combobox', { name: 'Target shape', exact: true })
    .selectOption(ids[1]);
  await page
    .getByRole('combobox', { name: 'Connection point', exact: true })
    .selectOption('north');
  await button(page, 'Use as target').click();
  const model = (await exported(page)).documents[0].pages[0];
  expect(readConnection(model.connections[0])).toMatchObject({
    arrow: false,
    sourceAnchor: 'south',
    targetAnchor: 'north',
  });
});

test('whole-label typography renders on shapes, text, free lines and connectors and the shortcut reference stays usable', async ({
  page,
}) => {
  const ids = await fixture(page);
  await button(page, 'Line').click();
  await click(page, -210, -100);
  await click(page, 210, -100);
  const edge = (await page
    .locator('[data-connection-id]')
    .getAttribute('data-connection-id'))!;
  await button(page, 'Arrow').click();
  await drag(page, await point(page, -100, 230), await point(page, 100, 230));
  const free = (await page
    .locator('[data-node-id]')
    .last()
    .getAttribute('data-node-id'))!;
  await button(page, 'Text').click();
  await canvas(page).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Label / text', { exact: true }).fill('Text sample');
  await button(page, 'Apply changes').click();
  const text = (await page
    .locator('[data-node-id]')
    .last()
    .getAttribute('data-node-id'))!;
  for (const id of [ids[0], free, text, edge]) {
    await properties(page, id);
    await page
      .getByRole('combobox', { name: 'Font family', exact: true })
      .selectOption('serif');
    await page.getByLabel('Text size', { exact: true }).fill('28');
    for (const style of ['Bold', 'Italic', 'Underline'])
      await button(page, style).click();
    await page
      .getByRole('combobox', { name: 'Text alignment', exact: true })
      .selectOption('right');
    await page.getByLabel('Text color', { exact: true }).fill('#8b2459');
    await page
      .getByLabel('Label / text', { exact: true })
      .fill('Release\nGrüße 世界');
    if (id === edge) await capture(page, 'text-formatting');
    await page.keyboard.press('Control+Enter');
    const label = page
      .locator(`[data-node-id="${id}"] text, [data-connection-id="${id}"] text`)
      .last();
    await expect(label).toHaveCSS(
      'font-family',
      'Georgia, "Times New Roman", serif',
    );
    await expect(label).toHaveAttribute('font-size', '28');
    await expect(label).toHaveAttribute('font-weight', '700');
    await expect(label).toHaveAttribute('font-style', 'italic');
    await expect(label).toHaveAttribute('text-decoration', 'underline');
    await expect(label).toHaveAttribute('text-anchor', 'end');
  }
  await button(page, 'Undo').click();
  await expect(
    page.locator('[data-connection-id] .scene-edge-label'),
  ).toHaveCount(0);
  await button(page, 'Redo').click();
  await expect(
    page.locator('[data-connection-id] .scene-edge-label'),
  ).toBeVisible();
  const exportedProject = await exported(page),
    model = exportedProject.documents[0].pages[0];
  for (const item of [
    model.nodes[0],
    model.nodes.at(-2)!,
    model.nodes.at(-1)!,
    model.connections[0],
  ]) {
    const style = readAppearance(
      jsonObject(
        jsonObject(
          item.extensions['content' in item ? ELEMENT_KEY : CONNECTION_KEY],
        ).style,
      ),
    );
    expect(style).toMatchObject({
      fontFamily: 'serif',
      fontSize: 28,
      fontWeight: 700,
      fontStyle: 'italic',
      textDecoration: 'underline',
      align: 'right',
    });
  }
  await button(page, 'Save project').click();
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await button(page, 'Open project').click();
  expect((await exported(page)).documents).toEqual(exportedProject.documents);
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page.setViewportSize({ width: 390, height: 900 });
  await button(page, 'Tastenkürzel').click();
  await expect(page.getByRole('dialog')).toContainText(/(?:Strg|⌘ Cmd) \+ Z/);
  await page
    .getByRole('searchbox', { name: 'Tastenkürzel suchen' })
    .fill('Verbindung');
  await expect(page.getByRole('dialog')).toContainText('Ports');
  await capture(page, 'shortcuts-small-de');
  await page.keyboard.press('Escape');
  await expect(button(page, 'Tastenkürzel')).toBeFocused();
  await page.getByText('Ausrichten & mehr', { exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Diagrammelement', exact: true })
    .selectOption(text);
  await expect(
    page.getByRole('group', { name: 'Textformatierung', exact: true }),
  ).toBeVisible();
  await expect(button(page, 'Fett')).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, 'text-small-de');
});
