import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';
import {
  applyEdit,
  ELEMENT_KEY,
  DEFAULT_CONNECTION,
} from '../../packages/editor-core/src/index';
const button = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true });
const canvas = (p: Page) =>
  p.getByRole('region', { name: 'Interactive canvas', exact: true });
async function create(p: Page) {
  await p.goto('/');
  await button(p, 'New project').click();
  await expect(canvas(p)).toHaveAttribute('data-camera', /zoom/);
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
async function click(p: Page, x: number, y: number, shift = false) {
  const a = await point(p, x, y);
  if (shift) await p.keyboard.down('Shift');
  await p.mouse.click(a.x, a.y);
  if (shift) await p.keyboard.up('Shift');
}
async function drag(
  p: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await p.mouse.move(from.x, from.y);
  await p.mouse.down();
  await p.mouse.move(to.x, to.y, { steps: 8 });
  await p.mouse.up();
}
async function worldDrag(
  p: Page,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  await drag(p, await point(p, ax, ay), await point(p, bx, by));
}
async function handleCenter(handle: Locator) {
  await expect(handle).toBeVisible();
  // Read geometry atomically: scheduled overlay redraws replace SVG handles.
  let center = { x: 0, y: 0, width: 0, height: 0 };
  await expect
    .poll(async () => {
      center = await handle.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };
      });
      return center.width > 0 && center.height > 0;
    })
    .toBe(true);
  return center;
}
async function shape(p: Page, name: string, x: number, y: number) {
  await button(p, name).click();
  await click(p, x, y);
}
async function exported(p: Page) {
  const download = p.waitForEvent('download');
  await button(p, 'Export .koxora').click();
  const path = (await (await download).path())!;
  // Wait for the async export notification before the next geometry gesture.
  await expect(
    p
      .locator('.notification.success')
      .getByText(
        'Project download started. Your local project remains saved separately.',
        { exact: true },
      ),
  ).toBeVisible();
  await button(p, 'Dismiss notification').click();
  return {
    path,
    project: await importProject(new Uint8Array(readFileSync(path))),
  };
}
async function save(p: Page) {
  await button(p, 'Save project').click();
  await expect(
    p.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
}
async function selection(p: Page) {
  return JSON.parse(
    (await canvas(p).getAttribute('data-selection'))!,
  ) as string[];
}

test('direct visual insertion, move at zoom, snapping override, resize and single-step undo', async ({
  page,
}) => {
  await create(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await expect(page.getByRole('combobox', { name: 'Shape type' })).toHaveCount(
    0,
  );
  await expect(button(page, 'Insert shape')).toHaveCount(0);
  await shape(page, 'Rectangle', -150, 0);
  await expect(button(page, 'Select')).toHaveAttribute('aria-pressed', 'true');
  const node = page.locator('[data-node-id]');
  const initial = await node.getAttribute('transform');
  await button(page, 'Zoom in').click();
  await button(page, 'Snap').click();
  await worldDrag(page, -150, 0, -95, 41);
  const moved = await node.getAttribute('transform');
  expect(moved).not.toBe(initial);
  await button(page, 'Undo').click();
  await expect(node).toHaveAttribute('transform', initial!);
  await button(page, 'Redo').click();
  await expect(node).toHaveAttribute('transform', moved!);
  await click(page, -95, 41);
  const handle = page.locator('[data-handle="se"]');
  const h = await handleCenter(handle);
  await drag(page, h, { x: h.x + 90, y: h.y + 55 });
  let model = (await exported(page)).project.documents[0].pages[0];
  expect(model.nodes[0].geometry.width).toBeGreaterThan(160);
  expect(Math.abs(model.nodes[0].geometry.x % 24)).toBe(0);
  await button(page, 'Undo').click();
  model = (await exported(page)).project.documents[0].pages[0];
  expect(model.nodes[0].geometry.width).toBe(160);
  await click(page, -95, 41);
  const before = model.nodes[0].geometry;
  await page.keyboard.down('Alt');
  await worldDrag(page, -95, 41, -82, 48);
  await page.keyboard.up('Alt');
  model = (await exported(page)).project.documents[0].pages[0];
  expect(model.nodes[0].geometry.x - before.x).toBeCloseTo(13, 0);
  await save(page);
  await page.reload();
  await button(page, 'Open project').click();
  expect((await exported(page)).project.documents[0].pages[0].nodes).toEqual(
    model.nodes,
  );
});

test('shift and marquee selection move together, duplicate linked nodes, delete and undo without dangling edges', async ({
  page,
}) => {
  await create(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shape(page, 'Rectangle', -200, -50);
  await shape(page, 'Diamond', 100, -50);
  await button(page, 'Arrow').click();
  await click(page, -200, -50);
  await click(page, 100, -50);
  await button(page, 'Select').click();
  await click(page, -200, -50);
  await click(page, 100, -50, true);
  await expect.poll(() => selection(page).then((s) => s.length)).toBe(2);
  const path = await page.locator('.scene-connection').getAttribute('d');
  await worldDrag(page, -200, -50, -170, 0);
  await expect(page.locator('.scene-connection')).not.toHaveAttribute(
    'd',
    path!,
  );
  await button(page, 'Duplicate').click();
  await expect(page.locator('[data-node-id]')).toHaveCount(4);
  await expect(page.locator('[data-connection-id]')).toHaveCount(2);
  let model = (await exported(page)).project.documents[0].pages[0];
  expect(model.connections[1].sourceId).toBe(model.nodes[2].id);
  expect(model.connections[1].targetId).toBe(model.nodes[3].id);
  await canvas(page).focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-node-id]')).toHaveCount(2);
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-node-id]')).toHaveCount(4);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('[data-node-id]')).toHaveCount(2);
  await button(page, 'Expand canvas').click();
  await worldDrag(page, -285, -120, 250, 100);
  await expect.poll(() => selection(page).then((s) => s.length)).toBe(3);
  await canvas(page).focus();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect(page.locator('[data-node-id]')).toHaveCount(4);
  await button(page, 'Restore workspace').click();
  model = (await exported(page)).project.documents[0].pages[0];
  expect(model.connections).toHaveLength(2);
});

test('standalone arrows have editable endpoints, labels and heads and survive portable offline reopening', async ({
  page,
  context,
}) => {
  await create(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await button(page, 'Arrow').click();
  await worldDrag(page, -160, -50, 80, 80);
  await expect(page.locator('[data-node-id]')).toHaveCount(1);
  await expect(page.locator('[data-connection-id]')).toHaveCount(0);
  await expect(page.locator('.scene-arrow')).toHaveCount(1);
  const arrowPath = page.locator('[data-node-id] .scene-connection');
  const originalPath = await arrowPath.getAttribute('d');
  const end = await handleCenter(page.locator('[data-handle="end"]'));
  await drag(page, end, { x: end.x + 75, y: end.y - 20 });
  await expect(arrowPath).not.toHaveAttribute('d', originalPath!);
  await button(page, 'Element properties').click();
  await page
    .getByLabel('Label / text', { exact: true })
    .fill('Standalone 世界');
  await page.getByText('Geometry and appearance', { exact: true }).click();
  await page.getByLabel('Arrowhead at start', { exact: true }).check();
  await button(page, 'Apply changes').click();
  await expect(page.locator('.scene-arrow')).toHaveCount(2);
  await save(page);
  const { path, project } = await exported(page);
  expect(project.documents[0].pages[0].nodes[0].kind).toBe('arrow');
  await context.setOffline(true);
  await page.reload();
  await button(page, 'Open project').click();
  await expect(page.locator('.scene-arrow')).toHaveCount(2);
  await button(page, 'Import .koxora').click();
  await page.getByLabel('Import as a new project').check();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles(path);
  await expect(page.locator('.scene-edge-label')).toHaveText('Standalone 世界');
  await expect(button(page, 'Undo')).toBeDisabled();
});

test('Escape, capture cancellation and blur discard previews; navigation never inserts', async ({
  page,
}) => {
  await create(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shape(page, 'Rectangle', 0, 0);
  const node = page.locator('[data-node-id]');
  const original = await node.getAttribute('transform');
  for (const cancel of ['Escape', 'pointercancel', 'blur']) {
    const a = await point(page, 0, 0);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x + 80, a.y + 20);
    if (cancel === 'Escape') await page.keyboard.press('Escape');
    else if (cancel === 'blur')
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    else await canvas(page).dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
    await expect(node).toHaveAttribute('transform', original!);
  }
  await click(page, 230, 130);
  const a = await point(page, -250, -100),
    b = await point(page, 250, 130);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(() => selection(page).then((s) => s.length)).toBe(0);
  await button(page, 'Arrow').click();
  await page.keyboard.down('Space');
  // Layout changes cancel gestures, but must not forget a physically held key.
  await page.setViewportSize({ width: 1400, height: 1080 });
  await worldDrag(page, 200, 100, 250, 150);
  await page.keyboard.up('Space');
  await expect(node).toHaveCount(1);
  await button(page, 'Rectangle').click();
  const center = await point(page, 0, 0);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(node).toHaveCount(1);
});

test('burst keyboard nudges retain every command and ordinary text editing does not trigger canvas shortcuts', async ({
  page,
}) => {
  await create(page);
  await shape(page, 'Rectangle', 0, 0);
  const node = page.locator('[data-node-id]');
  const original = await node.getAttribute('transform');
  await canvas(page).evaluate((el) => {
    for (let i = 0; i < 5; i++)
      el.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
  });
  let model = (await exported(page)).project.documents[0].pages[0];
  expect(model.nodes[0].geometry.x).toBe(-75);
  for (let i = 0; i < 5; i++) {
    await canvas(page).focus();
    await page.keyboard.press('Control+z');
  }
  await expect(node).toHaveAttribute('transform', original!);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await click(page, 0, 0);
  await button(page, 'Element properties').click();
  await page.getByLabel('Label / text', { exact: true }).fill('keep');
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await button(page, 'Apply changes').click();
  model = (await exported(page)).project.documents[0].pages[0];
  expect(model.nodes).toHaveLength(1);
  expect(model.nodes[0].content.text).toBe('');
});

test('history shortcuts work with toolbar focus', async ({ page }) => {
  await create(page);
  await shape(page, 'Rectangle', 0, 0);
  await button(page, 'Duplicate').click();
  await expect(page.locator('[data-node-id]')).toHaveCount(2);
  await button(page, 'Grid').focus();
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-node-id]')).toHaveCount(1);
  await button(page, 'Grid').focus();
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('[data-node-id]')).toHaveCount(2);
});

test('workspace and dashboard inline rename commit, cancel, validate and retain project identity', async ({
  page,
}) => {
  await create(page);
  await shape(page, 'Rectangle', 0, 0);
  await save(page);
  const before = (await exported(page)).project;
  await page.locator('.workspace-header h1').dblclick();
  const input = page.locator('.inline-title-field input');
  await input.fill('Renamed project 世界');
  await input.press('Enter');
  await expect(page.locator('.workspace-header h1')).toHaveText(
    'Renamed project 世界',
  );
  await save(page);
  await page.locator('.workspace-header h1').dblclick();
  await input.fill('Discard');
  await input.press('Escape');
  await expect(page.locator('.workspace-header h1')).toHaveText(
    'Renamed project 世界',
  );
  await page.locator('.workspace-header h1').dblclick();
  await input.fill('   ');
  await input.press('Enter');
  await expect(
    page.locator('.inline-title-field [role="alert"]'),
  ).toBeVisible();
  await input.press('Escape');
  await page
    .getByLabel('Project name', { exact: true })
    .fill('Name with spaces');
  await button(page, 'Save project').click();
  await expect(page.locator('.workspace-header h1')).toHaveText(
    'Name with spaces',
  );
  await page.getByRole('button', { name: /Local projects/ }).click();
  await expect(
    page
      .locator('.project-card')
      .getByRole('button', { name: 'Rename', exact: true }),
  ).toBeEnabled();
  await page.locator('.project-card h3').dblclick();
  await input.fill('Dashboard title');
  await input.press('Tab');
  await expect(page.locator('.project-card h3')).toHaveText('Dashboard title');
  await expect
    .poll(async () => page.locator('.project-card h3').textContent())
    .toBe('Dashboard title');
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.locator('.project-card h3')).toHaveText('Dashboard title');
  await button(page, 'Open project').click();
  const after = (await exported(page)).project;
  expect(after.manifest.projectId).toBe(before.manifest.projectId);
  expect(after.documents).toEqual(before.documents);
});

test('hidden, locked and future elements stay protected and edge hit area is selectable', async ({
  page,
}) => {
  let project = createProject(
    'Layers',
    () => crypto.randomUUID(),
    '2026-10-23T12:00:00.000Z',
  );
  const d = project.documents[0],
    p = d.pages[0],
    ids = Array.from({ length: 5 }, () => crypto.randomUUID());
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
        position: { x: i * 180 - 360, y: 0 },
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
      sourceId: ids[1],
      targetId: ids[2],
      layerId: p.layers[0].id,
      options: DEFAULT_CONNECTION,
    },
    project.manifest.updatedAt,
  );
  const model = project.documents[0].pages[0];
  model.layers.push(
    {
      id: crypto.randomUUID(),
      title: 'Locked',
      visible: true,
      locked: true,
      extensions: {},
    },
    {
      id: crypto.randomUUID(),
      title: 'Hidden',
      visible: false,
      locked: false,
      extensions: {},
    },
  );
  model.nodes[0].layerId = model.layers[1].id;
  model.nodes[3].layerId = model.layers[2].id;
  model.nodes[4].extensions[ELEMENT_KEY] = { version: 9, opaque: true };
  await page.goto('/');
  await page.setViewportSize({ width: 1600, height: 1100 });
  await button(page, 'Import .koxora').click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'layers.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await button(page, 'Arrow').click();
  await expect(page.locator('.connection-port')).toHaveCount(8);
  await expect(
    page.locator(
      `[data-port-node="${ids[0]}"], [data-port-node="${ids[3]}"], [data-port-node="${ids[4]}"]`,
    ),
  ).toHaveCount(0);
  for (const x of [-360, 360]) {
    const a = await point(page, x, 0),
      b = await point(page, -180, 0);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 5 });
    await expect(
      page.locator(
        `[data-port-node="${ids[0]}"], [data-port-node="${ids[4]}"]`,
      ),
    ).toHaveCount(0);
    await expect(page.locator('.connection-preview')).toHaveCount(0);
    await page.mouse.up();
    await expect(page.getByRole('alert')).toBeVisible();
  }

  await page.keyboard.press('Escape');
  await canvas(page).focus();
  await page.keyboard.press('Control+a');
  await expect.poll(() => selection(page).then((s) => s.length)).toBe(3);
  await click(page, -90, 4);
  await expect.poll(() => selection(page)).toEqual([model.connections[0].id]);
  await canvas(page).focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-connection-id]')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  const after = (await exported(page)).project;
  expect(after.documents).toEqual(project.documents);
});

test('palette keyboard navigation, repeat insertion, alignment and localized narrow layouts', async ({
  page,
}) => {
  await create(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await button(page, 'Rectangle').click();
  await page.getByLabel('Repeat insertion', { exact: true }).check();
  await shape(page, 'Rectangle', -220, -60);
  await click(page, 0, 20);
  await click(page, 220, 80);
  await expect(page.locator('[data-node-id]')).toHaveCount(3);
  await expect(button(page, 'Rectangle')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await canvas(page).focus();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+a');
  await page.getByText('Align / Distribute', { exact: true }).click();
  await button(page, 'Align top').click();
  const model = (await exported(page)).project.documents[0].pages[0];
  expect(new Set(model.nodes.map((n) => n.geometry.y)).size).toBe(1);
  await button(page, 'Select').focus();
  await page.keyboard.press('ArrowRight');
  await expect(button(page, 'Navigate')).toBeFocused();
  await page.keyboard.press('End');
  await expect(
    page
      .getByRole('toolbar')
      .getByRole('button', { name: 'Freehand pen', exact: true }),
  ).toBeFocused();
  if (process.env.KOXORA_CAPTURE && test.info().project.name === 'chromium') {
    await page.getByText('Align / Distribute', { exact: true }).click();
    await page
      .getByLabel('Project name', { exact: true })
      .fill('Release readiness');
    await page.getByLabel('Project name', { exact: true }).press('Enter');
    const centers = model.nodes.map((n) => ({
      x: n.geometry.x + n.geometry.width / 2,
      y: n.geometry.y + n.geometry.height / 2,
    }));
    for (let i = 0; i < centers.length; i++) {
      await click(page, centers[i].x, centers[i].y);
      await button(page, 'Element properties').click();
      await page
        .getByLabel('Label / text', { exact: true })
        .fill(['Draft & review', 'Validate', 'Ready to ship'][i]);
      await button(page, 'Apply changes').click();
    }
    await button(page, 'Arrow').click();
    for (let i = 0; i < 2; i++) {
      await click(page, centers[i].x, centers[i].y);
      await click(page, centers[i + 1].x, centers[i + 1].y);
    }
    await button(page, 'Arrow').click();
    await worldDrag(page, -150, 100, 150, 100);
    await button(page, 'Select').click();
    await click(page, centers[1].x, centers[1].y);
    await save(page);
    const dismiss = page.getByRole('button', {
      name: 'Dismiss notification',
      exact: true,
    });
    if (await dismiss.isVisible()) await dismiss.click();
    mkdirSync('docs/design/screenshots/phase-2.4', { recursive: true });
    for (const theme of ['dark', 'light']) {
      await page
        .getByRole('combobox', { name: 'Appearance', exact: true })
        .selectOption(theme);
      await page.screenshot({
        path: `docs/design/screenshots/phase-2.4/editor-${theme}.png`,
        fullPage: true,
      });
    }
  }
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  for (const width of [360, 800, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(button(page, 'Pfeil')).toBeVisible();
  await expect(button(page, 'Umbenennen')).toBeVisible();
  if (process.env.KOXORA_CAPTURE && test.info().project.name === 'chromium') {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.screenshot({
      path: 'docs/design/screenshots/phase-2.4/editor-small-de.png',
      fullPage: true,
    });
  }
});
