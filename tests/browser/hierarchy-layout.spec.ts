import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  applyEdit,
  DEFAULT_CONNECTION,
} from '../../packages/editor-core/src/index';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';

function fixture(cyclic: boolean) {
  const id = () => crypto.randomUUID();
  const now = '2026-11-23T13:00:00.000Z';
  let project = createProject('Hierarchy layout', id, now);
  const doc = project.documents[0];
  const sheet = doc.pages[0];
  const layerId = sheet.layers[0].id;
  const shapes = [
    { text: 'Lead', x: 0, y: -105 },
    { text: 'Left branch', x: -190, y: 55 },
    { text: 'Right branch', x: 170, y: -45 },
    { text: 'Leaf', x: -95, y: 175 },
    { text: 'Unselected', x: 395, y: 100 },
  ];
  for (const { text, x, y } of shapes)
    project = applyEdit(
      project,
      doc.id,
      sheet.id,
      {
        type: 'insert',
        id: id(),
        kind: 'rectangle',
        layerId,
        text,
        position: { x, y },
      },
      now,
    );
  const [root, left, right, leaf, outside] =
    project.documents[0].pages[0].nodes;
  const links = [
    [root, right],
    [root, left],
    [left, leaf],
    [right, outside],
  ];
  if (cyclic) links.push([leaf, root]);
  for (const [source, target] of links)
    project = applyEdit(
      project,
      doc.id,
      sheet.id,
      {
        type: 'connect',
        id: id(),
        sourceId: source.id,
        targetId: target.id,
        layerId,
        options: {
          ...DEFAULT_CONNECTION,
          label: 'Reports to',
          routing: 'orthogonal',
        },
      },
      now,
    );
  return project;
}

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });

async function openFixture(page: Page, cyclic: boolean, language: 'en' | 'de') {
  const project = fixture(cyclic);
  const messages: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${language}.json`, 'utf8'),
  );
  await page.addInitScript((locale) => {
    localStorage.setItem('koxora.preferences.v1', JSON.stringify({ locale }));
  }, language);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await button(page, messages['project.import']).click();
  await page
    .getByRole('dialog')
    .getByLabel(messages['project.import'], { exact: true })
    .setInputFiles({
      name: 'hierarchy.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
  const canvas = page.locator('.interactive-canvas');
  const camera = await canvas.getAttribute('data-camera');
  await button(page, messages['canvas.fit']).click();
  await expect(canvas).not.toHaveAttribute('data-camera', camera!);

  const original = project.documents[0].pages[0];
  const selected = original.nodes.slice(0, 4).map((node) => node.id);
  for (const [index, nodeId] of selected.entries())
    await page.locator(`[data-node-id="${nodeId}"]`).click({
      modifiers: index ? ['Shift'] : [],
    });
  await expect(canvas).toHaveAttribute(
    'data-selection',
    JSON.stringify(selected),
  );
  return { original, messages };
}

async function hierarchyMenu(page: Page, name: string) {
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: 'Format', exact: true })
    .press('Enter');
  return page.getByRole('menuitem', { name, exact: true });
}

async function exportedPage(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await button(page, name).click();
  const download = await pending;
  const archive = await importProject(
    new Uint8Array(readFileSync((await download.path())!)),
  );
  await expect(button(page, name)).toBeEnabled();
  return archive.documents[0].pages[0];
}

test('hierarchy keyboard preview and one-step layout preserve data through undo, redo and native export', async ({
  page,
}) => {
  const { original, messages } = await openFixture(page, false, 'en');
  const undo = button(page, messages['editing.undo']);
  const redo = button(page, messages['editing.redo']);
  const guidance = page.locator('.diagram-guidance');
  await expect(undo).toBeDisabled();
  const layout = await hierarchyMenu(page, messages['arrange.hierarchy']);
  await layout.focus();
  await expect(guidance).toHaveText(messages['editing.preview']);
  await page.keyboard.press('Escape');
  await expect(guidance).toBeHidden();
  await expect(undo).toBeDisabled();
  expect((await exportedPage(page, messages['project.export'])).nodes).toEqual(
    original.nodes,
  );

  await (
    await hierarchyMenu(page, messages['arrange.hierarchy'])
  ).press('Enter');
  const arranged = await exportedPage(page, messages['project.export']);
  const [root, left, right, leaf, outside] = arranged.nodes;
  expect(root).toEqual(original.nodes[0]);
  expect(outside).toEqual(original.nodes[4]);
  expect(left.geometry.y).toBe(right.geometry.y);
  expect(left.geometry.y).toBeGreaterThan(
    root.geometry.y + root.geometry.height,
  );
  expect(right.geometry.x).toBeGreaterThan(
    left.geometry.x + left.geometry.width,
  );
  expect(leaf.geometry.y).toBeGreaterThan(
    left.geometry.y + left.geometry.height,
  );
  for (const [index, node] of arranged.nodes.entries())
    expect(node).toEqual({
      ...original.nodes[index],
      geometry: {
        ...original.nodes[index].geometry,
        x: node.geometry.x,
        y: node.geometry.y,
      },
    });
  expect(arranged.connections).toEqual(original.connections);

  await undo.click();
  expect((await exportedPage(page, messages['project.export'])).nodes).toEqual(
    original.nodes,
  );
  await expect(undo).toBeDisabled();
  await redo.click();
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
  await page.reload();
  await button(page, messages['project.open']).click();
  const reopened = await exportedPage(page, messages['project.export']);
  expect(reopened.nodes).toEqual(arranged.nodes);
  expect(reopened.connections).toEqual(original.connections);
});

test('hierarchy layout rejects a selected cycle and leaves the project unchanged in German', async ({
  page,
}) => {
  const { original, messages } = await openFixture(page, true, 'de');
  await (await hierarchyMenu(page, messages['arrange.hierarchy'])).click();
  await expect(page.locator('.diagram-guidance')).toHaveText(
    messages['arrange.hierarchy.structure'],
  );
  await expect(button(page, messages['editing.undo'])).toBeDisabled();
  const unchanged = await exportedPage(page, messages['project.export']);
  expect(unchanged.nodes).toEqual(original.nodes);
  expect(unchanged.connections).toEqual(original.connections);
});
