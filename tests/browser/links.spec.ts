import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
  serializeProject,
  type Project,
} from '../../packages/project/src/index';
import {
  applyEdit,
  applyWorkbook,
  selectPage,
  elementLink,
  DEFAULT_CONNECTION,
  LINK_KEY,
} from '../../packages/editor-core/src/index';
const now = '2026-10-30T10:00:00.000Z',
  id = () => crypto.randomUUID();
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
function fixture() {
  let project = createProject('Interactive links', id, now);
  const d = project.documents[0],
    p = d.pages[0];
  for (const [i, x] of [-200, 200].entries())
    project = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'insert',
        id: id(),
        kind: 'rectangle',
        position: { x, y: 0 },
        layerId: p.layers[0].id,
        text: i ? 'Details' : 'Overview',
      },
      now,
    );
  const [a, b] = project.documents[0].pages[0].nodes;
  project = applyEdit(
    project,
    d.id,
    p.id,
    {
      type: 'connect',
      id: id(),
      sourceId: a.id,
      targetId: b.id,
      layerId: p.layers[0].id,
      options: DEFAULT_CONNECTION,
    },
    now,
  );
  project = applyWorkbook(
    project,
    { type: 'newDocument', title: 'Reference' },
    id,
    now,
  );
  project = applyWorkbook(
    project,
    {
      type: 'renamePage',
      pageId: project.documents[1].pages[0].id,
      title: 'Details page',
    },
    id,
    now,
  );
  return selectPage(project, d.id, p.id);
}
async function open(page: Page, project: Project) {
  await page.goto('/');
  await button(page, 'Import .koxora').click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'links.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.interactive-canvas')).toBeVisible();
}
async function properties(page: Page, elementId: string) {
  const picker = page.getByLabel('Diagram element', { exact: true });
  if (!(await picker.isVisible())) await button(page, 'Objects').click();
  await picker.selectOption(elementId);
  return page.getByRole('dialog', { name: 'Element properties' });
}
async function select(page: Page, elementId: string) {
  const dialog = await properties(page, elementId);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
}
async function exported(page: Page) {
  const download = page.waitForEvent('download');
  await button(page, 'Export .koxora').click();
  return importProject(
    new Uint8Array(readFileSync((await (await download).path())!)),
  );
}
test('authors and undoes page links, retaining stable destinations after rename and offline reopen', async ({
  page,
  context,
  isMobile,
}) => {
  if (!isMobile) await page.setViewportSize({ width: 1440, height: 1100 });
  const project = fixture(),
    p = project.documents[0].pages[0],
    node = p.nodes[0],
    dest = project.documents[1].pages[0];
  await open(page, project);
  let dialog = await properties(page, node.id);
  await dialog.getByLabel('Link type', { exact: true }).selectOption('page');
  await dialog
    .getByLabel('Destination page', { exact: true })
    .selectOption(dest.id);
  if (process.env.KOXORA_CAPTURE && !isMobile) {
    mkdirSync('docs/design/screenshots/phase-2.6', { recursive: true });
    await page.screenshot({
      path: 'docs/design/screenshots/phase-2.6/link-properties-en.png',
    });
  }
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(button(page, 'Open link')).toBeVisible();
  await expect(page.locator(`[data-node-id="${node.id}"] title`)).toContainText(
    'Reference / Details page',
  );
  await button(page, 'Undo').click();
  await expect(button(page, 'Open link')).toHaveCount(0);
  await button(page, 'Redo').click();
  dialog = await properties(page, node.id);
  await expect(
    dialog.getByLabel('Destination page', { exact: true }),
  ).toHaveValue(dest.id);
  await dialog
    .getByRole('button', { name: 'Remove link', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(button(page, 'Open link')).toHaveCount(0);
  await button(page, 'Undo').click();
  const doc = page.locator(`[data-tree-id="${project.documents[1].id}"]`);
  await doc.focus();
  await doc.press('ArrowRight');
  const tree = page.locator(`[role=treeitem][data-page-id="${dest.id}"]`);
  await tree.focus();
  await tree.press('F2');
  await page
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('Renamed destination');
  await page.getByRole('textbox', { name: 'Name', exact: true }).press('Enter');
  const loaded = await exported(page);
  expect(elementLink(loaded, node.id)).toEqual({
    state: 'ready',
    target: { type: 'page', pageId: dest.id },
  });
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
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
  await select(page, node.id);
  await page.locator('.interactive-canvas').focus();
  await page.keyboard.press('Alt+Enter');
  await expect(
    page
      .locator('.notification')
      .getByText('Opened page: Renamed destination', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.interactive-canvas')).toBeFocused();
});
test('opens external URLs only deliberately, without opener access or referrer', async ({
  page,
  context,
}) => {
  const project = fixture(),
    node = project.documents[0].pages[0].nodes[0];
  await context.route('https://example.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>Destination</title>',
    }),
  );
  await open(page, project);
  const dialog = await properties(page, node.id);
  await dialog.getByLabel('Link type', { exact: true }).selectOption('url');
  for (const url of [
    'javascript:alert(1)',
    'file:///tmp/a',
    'https://user:pass@example.com',
  ]) {
    await dialog.getByLabel('URL address', { exact: true }).fill(url);
    await expect(
      dialog.getByRole('button', { name: 'Apply changes', exact: true }),
    ).toBeDisabled();
  }
  await dialog
    .getByLabel('URL address', { exact: true })
    .fill('https://example.com/help');
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await page.locator(`[data-node-id="${node.id}"]`).click();
  await page.locator('.interactive-canvas').press('ArrowRight');
  await button(page, 'Edit text').click();
  await page.keyboard.press('Escape');
  expect(context.pages()).toHaveLength(1);
  await expect(button(page, 'Open link')).toHaveAttribute(
    'title',
    'External destination: https://example.com/help',
  );
  const popup = page.waitForEvent('popup');
  await button(page, 'Open link').click();
  const target = await popup;
  await expect(target).toHaveTitle('Destination');
  expect(
    await target.evaluate(() => ({
      opener: window.opener,
      referrer: document.referrer,
    })),
  ).toEqual({ opener: null, referrer: '' });
  await target.close();
  expect(elementLink(await exported(page), node.id)).toEqual({
    state: 'ready',
    target: { type: 'url', url: 'https://example.com/help' },
  });
});
test('repairs missing connector destinations and follows links using German controls', async ({
  page,
}) => {
  const project = fixture(),
    p = project.documents[0].pages[0],
    edge = p.connections[0],
    dest = project.documents[1].pages[0];
  edge.extensions[LINK_KEY] = { version: 1, type: 'page', pageId: id() };
  await open(page, project);
  await select(page, edge.id);
  await button(page, 'Open link').click();
  await expect(
    page.getByText(
      'The destination page is unavailable. Choose another page in Element properties.',
      { exact: true },
    ),
  ).toBeVisible();
  const dialog = await properties(page, edge.id);
  await dialog
    .getByLabel('Destination page', { exact: true })
    .selectOption(dest.id);
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  expect(elementLink(await exported(page), edge.id)).toEqual({
    state: 'ready',
    target: { type: 'page', pageId: dest.id },
  });
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await button(page, 'Link öffnen').click();
  await expect(
    page
      .locator('.notification')
      .getByText('Seite geöffnet: Details page', { exact: true }),
  ).toBeVisible();
});
test('native IPC receives only an explicitly followed URL and reports opener failure', async ({
  page,
}) => {
  const project = fixture(),
    node = project.documents[0].pages[0].nodes[0];
  const raw = await serializeProject(project);
  await page.addInitScript(
    ({ id, raw }) => {
      const records = new Map<string, string>([
        [id, JSON.stringify({ current: raw, previous: null })],
      ]);
      Object.assign(window, {
        nativeLinks: [],
        __TAURI__: {
          core: {
            invoke: async (
              command: string,
              args: Record<string, unknown> = {},
            ) => {
              if (command === 'appimage_integration')
                return { available: false };
              if (command === 'storage_status')
                return { directory: '/test/projects-v1', firstRun: false };
              if (command === 'project_open_next') return null;
              if (command === 'project_list') return [...records.keys()];
              if (command === 'project_read')
                return records.get(args.id as string) ?? null;
              if (command === 'project_write') {
                records.set(args.id as string, args.value as string);
                return;
              }
              if (command === 'open_external_url') {
                (
                  window as unknown as { nativeLinks: unknown[] }
                ).nativeLinks.push(args.url);
                throw new Error('openUrl');
              }
              throw new Error(command);
            },
          },
        },
      });
    },
    { id: project.manifest.projectId, raw },
  );
  await page.goto('/');
  await button(page, 'Open project').click();
  const dialog = await properties(page, node.id);
  await dialog.getByLabel('Link type', { exact: true }).selectOption('url');
  await dialog
    .getByLabel('URL address', { exact: true })
    .fill('https://example.com/');
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (window as unknown as { nativeLinks: string[] }).nativeLinks,
    ),
  ).toEqual([]);
  await button(page, 'Open link').click();
  await expect(
    page.getByText(
      'The link could not be opened. Check the address and your browser or mail application.',
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { nativeLinks: string[] }).nativeLinks,
    ),
  ).toEqual(['https://example.com/']);
});
test('keeps future link configurations inert while allowing unrelated edits', async ({
  page,
}) => {
  const project = fixture(),
    p = project.documents[0].pages[0],
    edge = p.connections[0];
  edge.extensions[LINK_KEY] = {
    version: 2,
    type: 'url',
    url: 'https://example.com/',
  };
  await open(page, project);
  const dialog = await properties(page, edge.id);
  await expect(
    dialog.getByText(
      'This imported link configuration is unsupported and is preserved without being opened or changed.',
      { exact: true },
    ),
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(button(page, 'Open link')).toBeDisabled();
  expect(
    (await exported(page)).documents[0].pages[0].connections[0].extensions[
      LINK_KEY
    ],
  ).toEqual(edge.extensions[LINK_KEY]);
});
