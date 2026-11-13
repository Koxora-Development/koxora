import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  exportProject,
  importProject,
  type Project,
} from '../../packages/project/src/index';

const namespace = 'org.koxora.mindmap';
function model(project: Project) {
  const found = project.documents[0].domainModels.find(
    (item) => item.namespace === namespace,
  );
  expect(found).toBeDefined();
  return found!;
}
function sheet(project: Project) {
  return project.documents[0].pages[0];
}
function topic(project: Project, text: string) {
  const found = sheet(project).nodes.find((node) => node.content.text === text);
  expect(found).toBeDefined();
  return found!;
}
async function saved(page: Page) {
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
}
async function nativeProject(page: Page) {
  await saved(page);
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
}
async function expandTools(page: Page) {
  const panel = page.locator('details.mindmap-panel');
  await expect(panel).toBeAttached();
  if (
    !(await panel.evaluate((element) => (element as HTMLDetailsElement).open))
  )
    await panel.locator('summary').click();
}
function tools(page: Page) {
  return page.getByRole('group', { name: 'Mind map tools', exact: true });
}
async function create(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New mind map', exact: true }).click();
  await expandTools(page);
  await expect(tools(page)).toBeVisible();
  return nativeProject(page);
}
async function selectTopic(page: Page, id: string) {
  await expandTools(page);
  await tools(page)
    .getByRole('combobox', { name: 'Selected topic', exact: true })
    .selectOption(id);
}
async function add(page: Page, action: string, text: string) {
  await expandTools(page);
  await tools(page).getByRole('button', { name: action, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: action, exact: true });
  await dialog
    .getByRole('textbox', { name: 'Topic text', exact: true })
    .fill(text);
  // Submit from the text field to exercise the keyboard authoring path.
  await dialog
    .getByRole('textbox', { name: 'Topic text', exact: true })
    .press('Enter');
  await expect(dialog).toHaveCount(0);
  const id = await tools(page)
    .getByRole('combobox', { name: 'Selected topic', exact: true })
    .inputValue();
  expect(id).not.toBe('');
  return id;
}

test('mind-map topics retain a portable hierarchy without moving existing manual geometry; branch removal is reversible', async ({
  page,
}) => {
  const initial = await create(page);
  expect(initial.documents[0].type).toBe('mindmap');
  expect(sheet(initial).nodes).toHaveLength(3);
  const root = topic(initial, 'Central topic');
  const first = topic(initial, 'First idea');
  expect(model(initial).data.roots).toEqual([root.id]);
  expect(model(initial).data.parents).toEqual({
    [root.id]: null,
    [first.id]: root.id,
    [topic(initial, 'Second idea').id]: root.id,
  });

  await selectTopic(page, first.id);
  const child = await add(page, 'Add child topic', 'Plan 世界');
  const sibling = await add(page, 'Add sibling topic', 'Review Ω');
  const secondRoot = await add(page, 'Add root topic', 'Independent topic');
  const expanded = await nativeProject(page);
  expect(model(expanded).data.parents).toEqual({
    ...(model(initial).data.parents as Record<string, string | null>),
    [child]: first.id,
    [sibling]: first.id,
    [secondRoot]: null,
  });
  expect(model(expanded).data.roots).toEqual([root.id, secondRoot]);
  for (const node of sheet(initial).nodes)
    expect(
      sheet(expanded).nodes.find((item) => item.id === node.id)?.geometry,
    ).toEqual(node.geometry);
  for (const id of [child, sibling])
    expect(sheet(expanded).connections).toContainEqual(
      expect.objectContaining({ sourceId: first.id, targetId: id }),
    );

  await selectTopic(page, first.id);
  await tools(page)
    .getByRole('button', { name: 'Delete branch', exact: true })
    .click();
  const deletion = page.getByRole('dialog', {
    name: 'Delete branch',
    exact: true,
  });
  await deletion
    .getByRole('button', { name: 'Delete branch', exact: true })
    .click();
  await expect(deletion).toHaveCount(0);
  const reduced = await nativeProject(page);
  expect(sheet(reduced).nodes).toHaveLength(3);
  for (const id of [first.id, child, sibling])
    expect(Object.keys(model(reduced).data.parents!)).not.toContain(id);
  expect(
    sheet(reduced).connections.every(
      (connection) =>
        ![first.id, child, sibling].some((id) =>
          [connection.sourceId, connection.targetId].includes(id),
        ),
    ),
  ).toBe(true);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  const restored = await nativeProject(page);
  expect(sheet(restored).nodes).toEqual(sheet(expanded).nodes);
  expect(sheet(restored).connections).toEqual(sheet(expanded).connections);
  expect(model(restored)).toEqual(model(expanded));
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(sheet(await nativeProject(page)).nodes).toEqual(sheet(reduced).nodes);
});

test('adding a root uses a writable layer when the selected topic is locked', async ({
  page,
}) => {
  const initial = await create(page);
  const currentPage = sheet(initial);
  currentPage.layers[0].locked = true;
  const writableLayerId = crypto.randomUUID();
  currentPage.layers.push({
    id: writableLayerId,
    title: 'Writable ideas',
    visible: true,
    locked: false,
    extensions: {},
  });
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  const importing = page.getByRole('dialog', {
    name: 'Import .koxora',
    exact: true,
  });
  await importing.getByLabel('Import as a new project').check();
  await importing.getByLabel('Import .koxora', { exact: true }).setInputFiles({
    name: 'protected-mindmap.koxora',
    mimeType: 'application/zip',
    buffer: Buffer.from(await exportProject(initial)),
  });
  await expect(importing).toHaveCount(0);
  await saved(page);
  await selectTopic(page, topic(initial, 'Central topic').id);
  await expect(
    tools(page).getByRole('button', { name: 'Add child topic', exact: true }),
  ).toBeDisabled();
  await expect(
    tools(page).getByRole('button', { name: 'Delete branch', exact: true }),
  ).toBeDisabled();
  await expect(
    tools(page).getByRole('button', { name: 'Add root topic', exact: true }),
  ).toBeEnabled();
  const id = await add(page, 'Add root topic', 'Writable root');
  const result = await nativeProject(page);
  expect(topic(result, 'Writable root')).toMatchObject({
    id,
    layerId: writableLayerId,
  });
  expect(
    (model(result).data.parents as Record<string, string | null>)[id],
  ).toBeNull();
  for (const node of sheet(initial).nodes)
    expect(sheet(result).nodes.find((item) => item.id === node.id)).toEqual(
      node,
    );
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('automatic layout requires explicit confirmation and undo restores manual positions', async ({
  page,
}) => {
  const initial = await create(page);
  // Import a valid, deliberately overlapping manual arrangement.
  const nodes = sheet(initial).nodes;
  nodes[1].geometry = {
    ...nodes[1].geometry,
    x: nodes[0].geometry.x,
    y: nodes[0].geometry.y,
  };
  nodes[2].geometry = {
    ...nodes[2].geometry,
    x: nodes[0].geometry.x + 10,
    y: nodes[0].geometry.y + 10,
  };
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  const importing = page.getByRole('dialog', {
    name: 'Import .koxora',
    exact: true,
  });
  await importing.getByLabel('Import as a new project').check();
  await importing.getByLabel('Import .koxora', { exact: true }).setInputFiles({
    name: 'manual-mindmap.koxora',
    mimeType: 'application/zip',
    buffer: Buffer.from(await exportProject(initial)),
  });
  await expect(importing).toHaveCount(0);
  await expandTools(page);
  const manual = await nativeProject(page);
  await tools(page)
    .getByRole('button', { name: 'Arrange mind map', exact: true })
    .click();
  const confirmation = page.getByRole('dialog', {
    name: 'Arrange mind map',
    exact: true,
  });
  await page.keyboard.press('Escape');
  await expect(confirmation).toHaveCount(0);
  expect(sheet(await nativeProject(page)).nodes).toEqual(sheet(manual).nodes);

  await tools(page)
    .getByRole('button', { name: 'Arrange mind map', exact: true })
    .click();
  await confirmation
    .getByRole('button', { name: 'Arrange topics', exact: true })
    .click();
  await expect(confirmation).toHaveCount(0);
  const arranged = await nativeProject(page);
  expect(sheet(arranged).nodes).not.toEqual(sheet(manual).nodes);
  expect(model(arranged)).toEqual(model(manual));
  const positions = sheet(arranged).nodes.map((node) => node.geometry);
  for (let a = 0; a < positions.length; a++)
    for (let b = a + 1; b < positions.length; b++) {
      const first = positions[a],
        second = positions[b];
      expect(
        first.x + first.width <= second.x ||
          second.x + second.width <= first.x ||
          first.y + first.height <= second.y ||
          second.y + second.height <= first.y,
      ).toBe(true);
    }
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(sheet(await nativeProject(page)).nodes).toEqual(sheet(manual).nodes);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(sheet(await nativeProject(page)).nodes).toEqual(sheet(arranged).nodes);
});

test('saved mind maps reopen offline with editable hierarchy and stable topic identities', async ({
  page,
  context,
}) => {
  const initial = await create(page);
  await selectTopic(page, topic(initial, 'First idea').id);
  await add(page, 'Add child topic', 'Offline plan');
  const before = await nativeProject(page);
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
  await expandTools(page);
  await expect(tools(page)).toBeVisible();
  const reopened = await nativeProject(page);
  expect(sheet(reopened).nodes).toEqual(sheet(before).nodes);
  expect(model(reopened)).toEqual(model(before));
  await selectTopic(page, topic(reopened, 'Offline plan').id);
  const child = await add(page, 'Add child topic', 'Still editable offline');
  const edited = await nativeProject(page);
  expect(
    (model(edited).data.parents as Record<string, string | null>)[child],
  ).toBe(topic(before, 'Offline plan').id);
});

async function reachable(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
  expect(
    await control.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        ),
      );
    }),
  ).toBe(true);
}

async function usableCanvas(page: Page) {
  const canvas = page.locator('.interactive-canvas');
  await expect(canvas).toBeVisible();
  await reachable(canvas);
  expect(
    await canvas.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const stage = element
        .closest('.interactive-stage')!
        .getBoundingClientRect();
      return (
        Math.min(box.bottom, stage.bottom, window.innerHeight) -
        Math.max(box.top, stage.top, 0)
      );
    }),
  ).toBeGreaterThan(80);
}

async function canvasControls(page: Page, messages: Record<string, string>) {
  for (const key of [
    'canvas.fit',
    'canvas.zoomIn',
    'canvas.zoomOut',
    'canvas.grid',
  ])
    await reachable(
      page.getByRole('button', { name: messages[key], exact: true }),
    );
  await page
    .getByRole('button', { name: messages['canvas.fit'], exact: true })
    .click();
}

test('phone-sized mind maps retain usable canvas space while tools scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await create(page);
  const panel = page.locator('details.mindmap-panel');
  await panel.locator('summary').click();
  await expect(panel).not.toHaveAttribute('open');
  await usableCanvas(page);
  const messages: Record<string, string> = JSON.parse(
    readFileSync('packages/i18n/src/locales/en.json', 'utf8'),
  );
  await canvasControls(page, messages);
  await expandTools(page);
  await usableCanvas(page);
  const group = tools(page);
  for (const name of [
    'Add root topic',
    'Add child topic',
    'Add sibling topic',
    'Delete branch',
    'Arrange mind map',
  ])
    await reachable(group.getByRole('button', { name, exact: true }));
  await canvasControls(page, messages);
  await usableCanvas(page);
});

for (const locale of ['en', 'de']) {
  for (const width of [800, 390]) {
    test(`mind-map authoring remains reachable at 200% in a ${width}px ${locale} window`, async ({
      page,
    }) => {
      const messages: Record<string, string> = JSON.parse(
        readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
      );
      await page.addInitScript((language) => {
        localStorage.setItem(
          'koxora.preferences.v1',
          JSON.stringify({
            locale: language,
            theme: 'dark',
            guiScale: 200,
            accessibility: true,
          }),
        );
      }, locale);
      await page.setViewportSize({ width, height: 600 });
      await page.goto('/');
      const create = page.getByRole('button', {
        name: messages['mindmap.create'],
        exact: true,
      });
      await reachable(create);
      await create.click();
      const panel = page.locator('details.mindmap-panel');
      await expect(panel).not.toHaveAttribute('open');
      await usableCanvas(page);
      await canvasControls(page, messages);
      await expandTools(page);
      const group = page.getByRole('group', {
        name: messages['mindmap.tools'],
        exact: true,
      });
      await expect(group).toBeVisible();
      await usableCanvas(page);
      const select = group.getByRole('combobox', {
        name: messages['mindmap.selected'],
        exact: true,
      });
      await reachable(select);
      await select.selectOption({ index: 1 });
      for (const key of [
        'mindmap.root',
        'mindmap.child',
        'mindmap.sibling',
        'mindmap.delete',
        'mindmap.layout',
      ])
        await reachable(
          group.getByRole('button', { name: messages[key], exact: true }),
        );
      const addRoot = group.getByRole('button', {
        name: messages['mindmap.root'],
        exact: true,
      });
      await addRoot.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', {
        name: messages['mindmap.root'],
        exact: true,
      });
      const text = dialog.getByRole('textbox', {
        name: messages['mindmap.text'],
        exact: true,
      });
      await reachable(text);
      await text.fill('Accessible topic Ω');
      await text.press('Enter');
      await expect(dialog).toHaveCount(0);
      await expect(select.locator('option:checked')).toHaveText(
        'Accessible topic Ω',
      );
      await expect(page.getByRole('alert')).toHaveCount(0);
      await canvasControls(page, messages);
      await usableCanvas(page);
    });
  }
}
