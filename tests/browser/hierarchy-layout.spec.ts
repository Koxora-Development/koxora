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
  type Page as DiagramPage,
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

function localeMessages(language: 'en' | 'de'): Record<string, string> {
  return JSON.parse(
    readFileSync(`packages/i18n/src/locales/${language}.json`, 'utf8'),
  );
}

async function openFixture(page: Page, cyclic: boolean, language: 'en' | 'de') {
  const project = fixture(cyclic);
  const messages = localeMessages(language);
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

async function layoutMenu(
  page: Page,
  messages: Record<string, string>,
  command: string,
) {
  await page
    .getByRole('menubar')
    .getByRole('menuitem', {
      name: messages['office.menu.format'],
      exact: true,
    })
    .press('Enter');
  await page
    .getByRole('menuitem', { name: messages['arrange.automatic'], exact: true })
    .press('ArrowRight');
  const menu = page.getByRole('menu', {
    name: messages['arrange.automatic'],
    exact: true,
  });
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  return menu.getByRole('menuitem', { name: messages[command], exact: true });
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

function expectTranslatedDiagram(actual: DiagramPage, original: DiagramPage) {
  expect(actual.connections).toEqual(original.connections);
  expect(actual.nodes).toHaveLength(original.nodes.length);
  for (const [index, node] of actual.nodes.entries())
    expect(node).toEqual({
      ...original.nodes[index],
      geometry: {
        ...original.nodes[index].geometry,
        x: node.geometry.x,
        y: node.geometry.y,
      },
    });
}

test('hierarchy keyboard preview and one-step layout preserve data through undo, redo and native export', async ({
  page,
}) => {
  const { original, messages } = await openFixture(page, false, 'en');
  const undo = button(page, messages['editing.undo']);
  const redo = button(page, messages['editing.redo']);
  const guidance = page.locator('.diagram-guidance');
  await expect(undo).toBeDisabled();
  const layout = await layoutMenu(page, messages, 'arrange.hierarchy.top-down');
  await layout.focus();
  await expect(guidance).toHaveText(messages['editing.preview']);
  await page.keyboard.press('Escape');
  await expect(guidance).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(undo).toBeDisabled();
  expect((await exportedPage(page, messages['project.export'])).nodes).toEqual(
    original.nodes,
  );

  await (
    await layoutMenu(page, messages, 'arrange.hierarchy.top-down')
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
  expectTranslatedDiagram(arranged, original);

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
  await (
    await layoutMenu(page, messages, 'arrange.hierarchy.top-down')
  ).click();
  await expect(page.locator('.diagram-guidance')).toHaveText(
    messages['arrange.hierarchy.structure'],
  );
  await expect(button(page, messages['editing.undo'])).toBeDisabled();
  const unchanged = await exportedPage(page, messages['project.export']);
  expect(unchanged.nodes).toEqual(original.nodes);
  expect(unchanged.connections).toEqual(original.connections);
});

function expectFlowDirection(sheet: DiagramPage, axis: 'x' | 'y') {
  const extent = axis === 'x' ? 'width' : 'height';
  const geometry = (title: string) => {
    const node = sheet.nodes.find((node) => node.content.text === title);
    expect(node, title).toBeDefined();
    return node!.geometry;
  };
  const start = geometry('Submit change request');
  const fork = geometry('High-risk change?');
  const risk = geometry('Assess technical risk');
  const scope = geometry('Verify scope');
  const join = geometry('Approved?');
  const completed = geometry('Record and notify');
  const revision = geometry('Revise request');
  expect(fork[axis]).toBeGreaterThan(start[axis] + start[extent]);
  expect(risk[axis]).toBeGreaterThan(fork[axis] + fork[extent]);
  expect(scope[axis]).toBe(risk[axis]);
  expect(join[axis]).toBeGreaterThan(risk[axis] + risk[extent]);
  expect(join[axis]).toBeGreaterThan(scope[axis] + scope[extent]);
  expect(completed[axis]).toBeGreaterThan(join[axis] + join[extent]);
  expect(revision[axis]).toBe(completed[axis]);
  for (const [index, { geometry: a }] of sheet.nodes.entries())
    for (const { geometry: b } of sheet.nodes.slice(index + 1))
      expect(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
      ).toBe(true);
}

test('flowchart layout keeps the approval branches, rejoin and rework loop in both directions', async ({
  page,
}) => {
  const messages = localeMessages('en');
  const title = 'Approval and rework';
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page
    .locator('.start-actions')
    .getByRole('button', { name: messages['templates.heading'], exact: true })
    .click();
  await page
    .getByRole('combobox', {
      name: messages['templates.category'],
      exact: true,
    })
    .selectOption('flowchart');
  await page
    .locator('.template-card')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .getByRole('button', { name: messages['templates.preview'], exact: true })
    .click();
  const preview = page.getByRole('dialog', { name: title, exact: true });
  await expect(preview).toContainText('Resubmit');
  await preview
    .getByRole('button', { name: messages['templates.use'], exact: true })
    .click();
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
  const download = () => exportedPage(page, messages['project.export']);
  const original = await download();
  expect(original.nodes).toHaveLength(7);
  expect(original.connections).toHaveLength(8);
  const nodeTitles = new Map(
    original.nodes.map((node) => [node.id, node.content.text]),
  );
  expect(
    original.connections.map((edge) => [
      nodeTitles.get(edge.sourceId!),
      nodeTitles.get(edge.targetId!),
    ]),
  ).toEqual(
    expect.arrayContaining([
      ['High-risk change?', 'Assess technical risk'],
      ['High-risk change?', 'Verify scope'],
      ['Assess technical risk', 'Approved?'],
      ['Verify scope', 'Approved?'],
      ['Revise request', 'High-risk change?'],
    ]),
  );

  const canvas = page.locator('.interactive-canvas');
  await canvas.press('ControlOrMeta+a');
  await expect
    .poll(
      async () =>
        JSON.parse((await canvas.getAttribute('data-selection')) ?? '[]')
          .length,
    )
    .toBe(original.nodes.length + original.connections.length);
  await (
    await layoutMenu(page, messages, 'arrange.flow.left-right')
  ).press('Enter');
  const horizontal = await download();
  expectFlowDirection(horizontal, 'x');
  expectTranslatedDiagram(horizontal, original);
  // Menu opening must hand off focus before any deferred animation frame.
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  try {
    const verticalAction = await layoutMenu(
      page,
      messages,
      'arrange.flow.top-down',
    );
    await verticalAction.focus();
    await page.clock.runFor(32);
    await expect(verticalAction).toBeFocused();
  } finally {
    await page.clock.resume();
  }
  await page.keyboard.press('Enter');
  const vertical = await download();
  expectFlowDirection(vertical, 'y');
  expectTranslatedDiagram(vertical, original);
  expect(vertical.nodes).not.toEqual(horizontal.nodes);

  const undo = button(page, messages['editing.undo']);
  const redo = button(page, messages['editing.redo']);
  await undo.click();
  expect((await download()).nodes).toEqual(horizontal.nodes);
  await undo.click();
  expect((await download()).nodes).toEqual(original.nodes);
  await expect(undo).toBeDisabled();
  await redo.click();
  await redo.click();
  const redone = await download();
  expect(redone.nodes).toEqual(vertical.nodes);
  expect(redone.connections).toEqual(vertical.connections);
  await expect(redo).toBeDisabled();
});
