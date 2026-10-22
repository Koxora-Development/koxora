import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';
const canvas = (page: Page) =>
  page.getByRole('region', { name: 'Interactive canvas', exact: true });
async function camera(page: Page) {
  await expect(canvas(page)).toHaveAttribute('data-camera', /zoom/);
  return JSON.parse((await canvas(page).getAttribute('data-camera'))!) as {
    x: number;
    y: number;
    zoom: number;
  };
}
async function create(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await camera(page);
}
async function saved(page: Page) {
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
}
async function imported(page: Page) {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles('packages/project/fixtures/complete-v1.koxora');
  await saved(page);
}

test('pointer-centered zoom, wheel pan, drag, keyboard, resize and expanded canvas', async ({
  page,
}) => {
  await create(page);
  const box = (await canvas(page).boundingBox())!;
  const anchor = {
    x: Math.round(box.x + box.width * 0.3) - box.x,
    y: Math.round(box.y + box.height * 0.4) - box.y,
  };
  await canvas(page).dispatchEvent('wheel', {
    clientX: box.x + anchor.x,
    clientY: box.y + anchor.y,
    deltaY: -300,
    ctrlKey: true,
  });
  await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThan(1);
  const zoomed = await camera(page);
  const world = { x: anchor.x - box.width / 2, y: anchor.y - box.height / 2 };
  expect((world.x - zoomed.x) * zoomed.zoom + box.width / 2).toBeCloseTo(
    anchor.x,
    3,
  );
  expect((world.y - zoomed.y) * zoomed.zoom + box.height / 2).toBeCloseTo(
    anchor.y,
    3,
  );
  await canvas(page).dispatchEvent('wheel', { deltaX: 30, deltaY: 60 });
  await expect
    .poll(async () => (await camera(page)).x)
    .toBeCloseTo(zoomed.x + 30 / zoomed.zoom, 3);
  const beforeDrag = await camera(page);
  await page.mouse.move(box.x + 100, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 120, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await camera(page)).x)
    .toBeCloseTo(beforeDrag.x - 60 / zoomed.zoom, 3);
  const beforeKey = await camera(page);
  await canvas(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => (await camera(page)).x)
    .toBeCloseTo(beforeKey.x + 40 / zoomed.zoom, 3);
  const stable = await camera(page);
  for (const width of [1440, 800, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await camera(page)).toEqual(stable);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole('button', { name: 'Expand canvas', exact: true })
    .click();
  await expect(page.locator('.canvas-expanded')).toBeVisible();
  expect(await camera(page)).toEqual(stable);
  await page.getByRole('button', { name: 'Fit content', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Restore workspace', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('button', { name: 'Restore workspace', exact: true })
    .click();
  await canvas(page).focus();
  await page.keyboard.press('0');
  await expect.poll(async () => (await camera(page)).zoom).toBe(1);
  await page.keyboard.press('Home');
  await expect.poll(() => camera(page)).toEqual({ x: 0, y: 0, zoom: 1 });
  await page.keyboard.press('Tab');
  await expect(canvas(page)).not.toBeFocused();
});

test('grid, snap and viewport survive save, offline restart and portable export', async ({
  page,
  context,
}) => {
  await create(page);
  await canvas(page).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await page.getByRole('button', { name: 'Snap', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Spacing', exact: true })
    .fill('32');
  const expected = await camera(page);
  await saved(page);
  const downloaded = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  const path = await (await downloaded).path();
  const project = await importProject(new Uint8Array(readFileSync(path!)));
  expect(project.documents[0].pages[0].viewport).toMatchObject(expected);
  expect(
    project.documents[0].pages[0].presentation['org.koxora.canvas'],
  ).toMatchObject({ version: 1, visible: false, snap: true, spacing: 32 });
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
  expect(await camera(page)).toEqual(expected);
  await expect(
    page.getByRole('button', { name: 'Grid', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(
    page.getByRole('button', { name: 'Snap', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('spinbutton', { name: 'Spacing', exact: true }),
  ).toHaveValue('32');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page.getByLabel('Import as a new project').check();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles(path!);
  await saved(page);
  expect(await camera(page)).toEqual(expected);
});

test('page changes flush a pending wheel gesture and restore independent viewports and active page', async ({
  page,
}) => {
  await imported(page);
  const pages = page
    .getByRole('navigation', { name: 'Documents' })
    .getByRole('button');
  expect(await pages.count()).toBeGreaterThan(1);
  const first = await camera(page);
  // Dispatch and click in one task, before the 180ms gesture debounce can fire.
  await canvas(page).evaluate((element) => {
    element.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }),
    );
    (
      document
        .querySelectorAll('.page-nav')
        .item(
          document.querySelectorAll('.page-nav').length - 1,
        ) as HTMLButtonElement
    ).click();
  });
  await expect(pages.last()).toHaveAttribute('aria-current', 'page');
  await canvas(page).focus();
  await page.keyboard.press('ArrowLeft');
  const last = await camera(page);
  await saved(page);
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(pages.last()).toHaveAttribute('aria-current', 'page');
  expect(await camera(page)).toEqual(last);
  await pages.first().click();
  await expect
    .poll(async () => (await camera(page)).y)
    .toBeCloseTo(first.y + 100 / first.zoom, 3);
});

test('export captures an in-progress wheel gesture without waiting for autosave', async ({
  page,
}) => {
  await create(page);
  await saved(page);
  const downloaded = page.waitForEvent('download');
  await canvas(page).evaluate((element) => {
    element.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 75, cancelable: true }),
    );
    const button = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Export .koxora'),
    )!;
    button.click();
  });
  const path = await (await downloaded).path();
  const project = await importProject(new Uint8Array(readFileSync(path!)));
  expect(project.documents[0].pages[0].viewport.y).toBe(75);
});

test('German controls, focus help and grid styling work in both themes', async ({
  page,
}) => {
  await create(page);
  await page
    .getByRole('button', { name: 'Navigation help', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText(
    'future element editing',
  );
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Navigation help', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await expect(
    page.getByRole('region', {
      name: 'Interaktive Zeichenfläche',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Einrasten', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Darstellung', exact: true })
    .selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  await expect(page.getByLabel('Zoomstufe', { exact: true })).toHaveText(
    '125 %',
  );
});

test('CSS coordinates stay correct at high DPR and touch/pen gestures end cleanly', async ({
  browser,
}) => {
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    viewport: { width: 1280, height: 900 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await camera(page);
  await canvas(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await camera(page)).x).toBe(40);
  const box = (await canvas(page).boundingBox())!;
  // Synthetic pointer stream exercises multi-pointer routing; physical platform gestures remain a manual check.
  await canvas(page).evaluate((el) => {
    el.setPointerCapture = () => {};
    el.hasPointerCapture = () => false;
  });
  for (const [pointerId, x] of [
    [1, 100],
    [2, 200],
  ])
    await canvas(page).dispatchEvent('pointerdown', {
      pointerId,
      pointerType: 'touch',
      button: 0,
      clientX: box.x + x,
      clientY: box.y + 100,
    });
  await canvas(page).dispatchEvent('pointermove', {
    pointerId: 2,
    pointerType: 'touch',
    clientX: box.x + 300,
    clientY: box.y + 100,
  });
  await expect.poll(async () => (await camera(page)).zoom).toBe(2);
  for (const pointerId of [1, 2])
    await canvas(page).dispatchEvent('pointercancel', {
      pointerId,
      pointerType: 'touch',
    });
  await expect(canvas(page)).not.toHaveClass(/panning/);
  await saved(page);
  await canvas(page).dispatchEvent('pointerdown', {
    pointerId: 3,
    pointerType: 'pen',
    button: 0,
    clientX: box.x + 100,
    clientY: box.y + 100,
  });
  await canvas(page).dispatchEvent('pointermove', {
    pointerId: 3,
    pointerType: 'pen',
    clientX: box.x + 120,
    clientY: box.y + 100,
  });
  await canvas(page).dispatchEvent('pointerup', {
    pointerId: 3,
    pointerType: 'pen',
  });
  await saved(page);
  await context.close();
});

test('recovering a previous save remounts the canvas even with identical project and page IDs', async ({
  page,
}) => {
  await create(page);
  await saved(page);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await saved(page);
  await page
    .getByRole('button', { name: 'Recover previous save', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Continue', exact: true })
    .click();
  await saved(page);
  await expect.poll(() => camera(page)).toEqual({ x: 0, y: 0, zoom: 1 });
  await expect(
    page.getByRole('button', { name: 'Grid', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  expect(await camera(page)).toEqual({ x: 0, y: 0, zoom: 1 });
});

test('expanded help closes independently and keeps background fields inaccessible', async ({
  page,
}) => {
  await create(page);
  await page
    .getByRole('button', { name: 'Expand canvas', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Navigation help', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Navigation help', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Navigation help', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Navigation help', exact: true }),
  ).toBeFocused();
  await expect(page.locator('.canvas-expanded')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Expand canvas', exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toBeVisible();
});

test('culling preserves paint order and imported labels remain inert text', async ({
  page,
}) => {
  const project = createProject(
    'Paint order',
    () => crypto.randomUUID(),
    '2026-01-01T00:00:00.000Z',
  );
  const model = project.documents[0].pages[0];
  model.nodes = [-600, 0].map((x, index) => ({
    id: crypto.randomUUID(),
    kind: 'rectangle',
    layerId: model.layers[0].id,
    geometry: { x, y: -50, width: 800, height: 100, rotation: 0 },
    content: { text: index ? '<img src=x onerror=alert(1)>' : 'First' },
    metadata: {},
    assetIds: [],
    dataBindings: [],
    extensions: {},
  }));
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'order.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await camera(page);
  await expect(page.locator('.scene-label')).toHaveText([
    'First',
    '<img src=x onerror=alert(1)>',
  ]);
  await canvas(page).dispatchEvent('wheel', { deltaX: 700 });
  await expect(page.locator('.scene-label')).toHaveText([
    '<img src=x onerror=alert(1)>',
  ]);
  await canvas(page).dispatchEvent('wheel', { deltaX: -700 });
  await expect(page.locator('.scene-label')).toHaveText([
    'First',
    '<img src=x onerror=alert(1)>',
  ]);
  await expect(
    page.locator(
      '.canvas-svg img, .canvas-svg script, .canvas-svg foreignObject',
    ),
  ).toHaveCount(0);
});
