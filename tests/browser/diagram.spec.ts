import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import {
  importProject,
  createProject,
  exportProject,
} from '../../packages/project/src/index';
import {
  applyEdit,
  DEFAULT_CONNECTION,
  DEFAULT_APPEARANCE,
  CONNECTION_KEY,
  ELEMENT_KEY,
} from '../../packages/editor-core/src/index';
const canvas = (p: Page) =>
  p.getByRole('region', { name: 'Interactive canvas', exact: true });
const button = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true });
async function create(p: Page) {
  await p.goto('/');
  await button(p, 'New project').click();
  await expect(canvas(p)).toHaveAttribute('data-camera', /zoom/);
}
async function clickWorld(p: Page, x: number, y: number) {
  await canvas(p).scrollIntoViewIfNeeded();
  const box = (await canvas(p).boundingBox())!,
    camera = JSON.parse((await canvas(p).getAttribute('data-camera'))!);
  await p.mouse.click(
    box.x + box.width / 2 + (x - camera.x) * camera.zoom,
    box.y + box.height / 2 + (y - camera.y) * camera.zoom,
  );
}
async function shape(p: Page, kind: string, x: number, y: number) {
  const names: Record<string, string> = {
    rectangle: 'Rectangle',
    'rounded-rectangle': 'Rounded rectangle',
    ellipse: 'Ellipse / circle',
    diamond: 'Diamond',
    triangle: 'Triangle',
    hexagon: 'Hexagon',
    parallelogram: 'Parallelogram',
    container: 'Container',
  };
  await button(p, names[kind]).click();
  await clickWorld(p, x, y);
}
async function edit(p: Page, id: string, label: string) {
  if (
    !(await p.locator('.editing-more').getAttribute('open')) &&
    !(await p
      .locator('.editing-more')
      .evaluate((e) => (e as HTMLDetailsElement).open))
  )
    await p.getByText('Align & more', { exact: true }).click();
  await p.getByLabel('Diagram element', { exact: true }).selectOption(id);
  await p
    .getByRole('textbox', { name: 'Label / text', exact: true })
    .fill(label);
}
async function save(p: Page) {
  await button(p, 'Save project').click();
  await expect(
    p.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
}
async function exported(p: Page) {
  const download = p.waitForEvent('download');
  await button(p, 'Export .koxora').click();
  const path = (await (await download).path())!;
  return {
    path,
    project: await importProject(new Uint8Array(readFileSync(path))),
  };
}
test('a real flowchart supports labels, styling, arrows, native round trip and offline continued editing', async ({
  page,
  context,
}) => {
  await create(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByLabel('Project name', { exact: true })
    .fill('Release workflow');
  await shape(page, 'rounded-rectangle', -220, -100);
  await shape(page, 'diamond', 80, -100);
  await shape(page, 'ellipse', 80, 130);
  await expect(page.locator('[data-node-id]')).toHaveCount(3);
  const ids = await page
    .locator('[data-node-id]')
    .evaluateAll((es) => es.map((e) => e.getAttribute('data-node-id')!));
  for (const [i, label] of [
    'Prepare\nGrüße 世界',
    'Ready?',
    'Ship ✓',
  ].entries()) {
    await edit(page, ids[i], label);
    if (!i) {
      await page.getByText('Geometry and appearance', { exact: true }).click();
      await page.getByLabel('Fill', { exact: true }).fill('#cffafe');
      await page.getByLabel('Text size', { exact: true }).fill('18');
    }
    await button(page, 'Apply changes').click();
  }
  await button(page, 'Arrow').click();
  await page.getByLabel('Repeat insertion', { exact: true }).check();
  await page
    .getByRole('combobox', { name: 'Connection path', exact: true })
    .selectOption('orthogonal');
  await clickWorld(page, -220, -100);
  const sourceNode = page.locator(`[data-node-id="${ids[0]}"]`);
  await expect(sourceNode).toHaveClass(/connection-source/);
  await canvas(page).dispatchEvent('wheel', { deltaX: 1800 });
  await expect(sourceNode).toHaveCount(0);
  await canvas(page).dispatchEvent('wheel', { deltaX: -1800 });
  await expect(sourceNode).toHaveClass(/connection-source/);
  await clickWorld(page, 80, -100);
  await clickWorld(page, 80, -100);
  await clickWorld(page, 80, 130);
  await expect(page.locator('.scene-connection')).toHaveCount(2);
  await expect(page.locator('.scene-arrow')).toHaveCount(2);
  const edge = await page
    .locator('[data-connection-id]')
    .first()
    .getAttribute('data-connection-id');
  await edit(page, edge!, 'Yes');
  await button(page, 'Apply changes').click();
  await button(page, 'Navigate').click();
  await expect(page.locator('.scene-label').first()).toHaveText(
    'PrepareGrüße 世界',
  );
  await expect(page.locator('.scene-edge-label')).toHaveText('Yes');
  await save(page);
  if (process.env.KOXORA_CAPTURE) {
    mkdirSync('docs/design/screenshots/phase-2.3', { recursive: true });
    await page
      .getByRole('combobox', { name: 'Appearance', exact: true })
      .selectOption('dark');
    await page.screenshot({
      path: 'docs/design/screenshots/phase-2.3/diagram-dark.png',
      fullPage: true,
    });
    await page
      .getByRole('combobox', { name: 'Appearance', exact: true })
      .selectOption('light');
    await page.screenshot({
      path: 'docs/design/screenshots/phase-2.3/diagram-light.png',
      fullPage: true,
    });
  }
  const { path, project } = await exported(page);
  const model = project.documents[0].pages[0];
  expect(model.nodes).toHaveLength(3);
  expect(model.nodes[0].content.text).toBe('Prepare\nGrüße 世界');
  expect(model.connections[0].sourceId).toBe(ids[0]);
  expect(model.connections[0].targetId).toBe(ids[1]);
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
  await button(page, 'Open project').click();
  await expect(page.locator('[data-node-id]')).toHaveCount(3);
  await expect(page.locator('.scene-arrow')).toHaveCount(2);
  await edit(page, ids[2], 'Published ✓');
  await button(page, 'Apply changes').click();
  await save(page);
  await button(page, 'Import .koxora').click();
  await page.getByLabel('Import as a new project').check();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles(path);
  await expect(page.locator('[data-node-id]')).toHaveCount(3);
  await edit(page, ids[2], 'Imported and editable');
  await button(page, 'Apply changes').click();
  await save(page);
});
test('all shape tools, keyboard text, transformed snapping, cancellation and navigation stay independent', async ({
  page,
}) => {
  await create(page);
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const kind of [
    'rectangle',
    'rounded-rectangle',
    'ellipse',
    'diamond',
    'triangle',
    'hexagon',
    'parallelogram',
    'container',
  ]) {
    const names: Record<string, string> = {
      rectangle: 'Rectangle',
      'rounded-rectangle': 'Rounded rectangle',
      ellipse: 'Ellipse / circle',
      diamond: 'Diamond',
      triangle: 'Triangle',
      hexagon: 'Hexagon',
      parallelogram: 'Parallelogram',
      container: 'Container',
    };
    await button(page, names[kind]).click();
    await canvas(page).focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('[data-node-id]')).toHaveCount(8);
  await button(page, 'Text').click();
  await canvas(page).focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('textbox', { name: 'Label / text', exact: true })
    .fill('Standalone\nעברית <img src=x>');
  await button(page, 'Apply changes').click();
  await button(page, 'Snap').click();
  await page.getByLabel('Spacing', { exact: true }).fill('32');
  await button(page, 'Zoom in').click();
  await canvas(page).dispatchEvent('wheel', { deltaX: 80, deltaY: -40 });
  await shape(page, 'rectangle', 160, 40);
  await canvas(page).focus();
  await page.keyboard.press('Escape');
  await expect(button(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
  const { project } = await exported(page);
  const nodes = project.documents[0].pages[0].nodes;
  expect(nodes).toHaveLength(10);
  expect(nodes[9].geometry.x % 32).toBe(0);
  expect(nodes[9].geometry.y % 32).toBe(0);
  expect(nodes[8].content.text).toBe('Standalone\nעברית <img src=x>');
  await expect(
    page.locator(
      '.canvas-svg img,.canvas-svg foreignObject,.canvas-svg script',
    ),
  ).toHaveCount(0);
  await button(page, 'Rectangle').click();
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-node-id]')).toHaveCount(10);
  await button(page, 'Expand canvas').click();
  await button(page, 'Rectangle').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-expanded')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-expanded')).toHaveCount(0);
});
test('German tools and modal focus stay usable after resize', async ({
  page,
}) => {
  await create(page);
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await button(page, 'Rechteck').click();
  await page
    .getByRole('region', { name: 'Interaktive Zeichenfläche', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.getByText('Ausrichten & mehr', { exact: true }).click();
  const id = await page.locator('[data-node-id]').getAttribute('data-node-id');
  await page.getByLabel('Diagrammelement', { exact: true }).selectOption(id!);
  await page
    .getByRole('textbox', { name: 'Beschriftung / Text', exact: true })
    .fill('Prüfung bestanden');
  await button(page, 'Änderungen übernehmen').click();
  for (const width of [360, 800, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  if (process.env.KOXORA_CAPTURE) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: 'docs/design/screenshots/phase-2.3/diagram-small-de.png',
      fullPage: true,
    });
  }
  await expect(page.locator('.scene-label')).toHaveText('Prüfung bestanden');
});
test('untrusted optional fields render safely and oversized imported labels cannot be silently rewritten', async ({
  page,
}) => {
  let project = createProject(
    'Untrusted',
    () => crypto.randomUUID(),
    '2026-10-22T12:00:00.000Z',
  );
  const d = project.documents[0],
    p = d.pages[0],
    ids = [crypto.randomUUID(), crypto.randomUUID()];
  for (const [i, id] of ids.entries())
    project = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'insert',
        id,
        kind: 'rectangle',
        layerId: p.layers[0].id,
        position: { x: i * 240 - 120, y: 0 },
      },
      project.manifest.updatedAt,
    );
  project = applyEdit(
    project,
    d.id,
    p.id,
    {
      type: 'connect',
      id: crypto.randomUUID(),
      sourceId: ids[0],
      targetId: ids[1],
      layerId: p.layers[0].id,
      options: DEFAULT_CONNECTION,
    },
    project.manifest.updatedAt,
  );
  const model = project.documents[0].pages[0];
  model.nodes[0].extensions[ELEMENT_KEY] = {
    version: 1,
    style: {
      ...DEFAULT_APPEARANCE,
      align: { toString: null },
      fill: 'url(https://evil.example)',
    },
  };
  model.connections[0].extensions[CONNECTION_KEY] = {
    version: 1,
    label: 'x'.repeat(5000),
    routing: { toString: null },
    sourceAnchor: { toString: null },
  };
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await button(page, 'Import .koxora').click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'untrusted.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('[data-node-id]')).toHaveCount(2);
  expect(errors).toEqual([]);
  await expect(page.locator('.scene-label').first()).toHaveAttribute(
    'clip-path',
    /^url\(#label-/,
  );
  await page.getByText('Align & more', { exact: true }).click();
  await page
    .getByLabel('Diagram element', { exact: true })
    .selectOption(model.connections[0].id);
  await expect(page.getByRole('alert')).toContainText('unsupported content');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await exported(page)).project.documents).toEqual(project.documents);
});
