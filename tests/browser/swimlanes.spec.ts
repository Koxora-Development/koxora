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

function messagesFor(locale: 'en' | 'de'): Record<string, string> {
  return JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
}

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });

const canvasFor = (page: Page, messages: Record<string, string>) =>
  page.getByRole('region', {
    name: messages['canvas.navigation'],
    exact: true,
  });

async function saved(page: Page, messages: Record<string, string>) {
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
}

async function chooseMenuAction(page: Page, menuName: string, action: string) {
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: menuName, exact: true })
    .press('Enter');
  await page
    .getByRole('menu', { name: menuName, exact: true })
    .getByRole('menuitem', { name: action, exact: true })
    .press('Enter');
}

async function armShape(
  page: Page,
  messages: Record<string, string>,
  kind: string,
) {
  await chooseMenuAction(
    page,
    messages['office.menu.insert'],
    messages['office.menu.insertShapes'],
  );
  const catalog = page.getByRole('dialog', {
    name: messages['palette.fullCatalogTitle'],
    exact: true,
  });
  await catalog
    .getByRole('combobox', {
      name: messages['palette.fullCatalogLibrary'],
      exact: true,
    })
    .selectOption('flowchart');
  await catalog.getByRole('searchbox').fill(messages[`shape.${kind}`]);
  await catalog
    .getByRole('button', { name: messages[`shape.${kind}`], exact: true })
    .press('Enter');
  await expect(catalog).toHaveCount(0);
  await expect(canvasFor(page, messages)).toBeFocused();
}

async function exported(page: Page, messages: Record<string, string>) {
  await saved(page, messages);
  const pending = page.waitForEvent('download');
  await button(page, messages['project.export']).click();
  const bytes = readFileSync((await (await pending).path())!);
  const project = await importProject(new Uint8Array(bytes));
  await expect(button(page, messages['project.export'])).toBeEnabled();
  return { bytes, project, sheet: project.documents[0].pages[0] };
}

test('dragging a blank lane body snaps its heading and adjacent seam while foreground objects remain selectable', async ({
  page,
}) => {
  const messages = messagesFor('en');
  const now = '2026-11-25T16:00:00.000Z';
  const makeId = () => crypto.randomUUID();
  let project = createProject('Lane snapping', makeId, now);
  const document = project.documents[0];
  const sheet = document.pages[0];
  sheet.viewport = { x: 0, y: 0, zoom: 2 };
  const layerId = sheet.layers[0].id;
  const createNodes = [
    { kind: 'swimlane-horizontal', x: -216, y: -112, width: 430, height: 104 },
    { kind: 'swimlane-horizontal', x: -148, y: 32, width: 430, height: 104 },
    { kind: 'rectangle', x: -90, y: -82, width: 72, height: 45 },
    { kind: 'rectangle', x: 42, y: -82, width: 72, height: 45 },
  ] as const;
  const ids = createNodes.map(() => makeId());
  const [fixedId, movingId, stepId, otherStepId] = ids;
  const edgeId = makeId();
  for (const [index, { kind, ...bounds }] of createNodes.entries())
    project = applyEdit(
      project,
      document.id,
      sheet.id,
      {
        type: 'insert',
        id: ids[index],
        kind,
        layerId,
        position: { x: bounds.x, y: bounds.y },
        geometry: { ...bounds, rotation: 0 },
      },
      now,
    );
  project = applyEdit(
    project,
    document.id,
    sheet.id,
    { type: 'format', ids: [fixedId, movingId], patch: { fill: '#eff6ff' } },
    now,
  );
  project = applyEdit(
    project,
    document.id,
    sheet.id,
    {
      type: 'connect',
      id: edgeId,
      layerId,
      sourceId: stepId,
      targetId: otherStepId,
      options: DEFAULT_CONNECTION,
    },
    now,
  );
  const original = project.documents[0].pages[0];
  const [fixed, moving, step] = original.nodes;

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await button(page, messages['project.import']).click();
  await page
    .getByRole('dialog')
    .getByLabel(messages['project.import'], { exact: true })
    .setInputFiles({
      name: 'lane-snapping.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await saved(page, messages);
  const canvas = canvasFor(page, messages);
  await expect(canvas).toHaveAttribute('data-camera', /"zoom":2\b/);
  await expect(button(page, messages['canvas.snap'])).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  const drawing = canvas.locator('svg.canvas-svg > g');
  const screenPoint = (x: number, y: number) =>
    drawing.evaluate(
      (element, point) => {
        const p = new DOMPoint(point.x, point.y).matrixTransform(
          (element as SVGGraphicsElement).getScreenCTM()!,
        );
        return { x: p.x, y: p.y };
      },
      { x, y },
    );

  const stepPoint = await screenPoint(
    step.geometry.x + 20,
    step.geometry.y + 20,
  );
  await page.mouse.click(stepPoint.x, stepPoint.y);
  await expect(canvas).toHaveAttribute(
    'data-selection',
    JSON.stringify([stepId]),
  );
  const edgePoint = await canvas
    .locator(`[data-connection-id="${edgeId}"] .scene-connection`)
    .evaluate((element) => {
      const path = element as SVGPathElement;
      const p = path
        .getPointAtLength(path.getTotalLength() / 2)
        .matrixTransform(path.getScreenCTM()!);
      return { x: p.x, y: p.y };
    });
  await page.mouse.click(edgePoint.x, edgePoint.y);
  await expect(canvas).toHaveAttribute(
    'data-selection',
    JSON.stringify([edgeId]),
  );
  const empty = await screenPoint(0, 0);
  await page.mouse.click(empty.x, empty.y);
  const marqueeStart = await screenPoint(-100, -96);
  const marqueeEnd = await screenPoint(-57, -48);
  await page.keyboard.down('Shift');
  try {
    await page.mouse.move(marqueeStart.x, marqueeStart.y);
    await page.mouse.down();
    await page.mouse.move(marqueeEnd.x, marqueeEnd.y, { steps: 8 });
    await page.mouse.up();
  } finally {
    await page.keyboard.up('Shift');
  }
  await expect(canvas).toHaveAttribute(
    'data-selection',
    JSON.stringify([stepId]),
  );

  const body = { x: moving.geometry.x + 210, y: moving.geometry.y + 50 };
  const bodyPoint = await screenPoint(body.x, body.y);
  await page.mouse.click(bodyPoint.x, bodyPoint.y);
  await expect(canvas).toHaveAttribute(
    'data-selection',
    JSON.stringify([movingId]),
  );

  // At 200% canvas zoom, the pointer lands six CSS pixels from either target.
  const seam = fixed.geometry.y + fixed.geometry.height;
  const near = { x: fixed.geometry.x + 3, y: seam + 3 };
  async function dragLaneBody(target = near) {
    const from = await screenPoint(body.x, body.y);
    const to = await screenPoint(
      body.x + target.x - moving.geometry.x,
      body.y + target.y - moving.geometry.y,
    );
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
  }
  await page.keyboard.down('Alt');
  try {
    await dragLaneBody();
  } finally {
    await page.keyboard.up('Alt');
  }
  const free = (await exported(page, messages)).sheet.nodes.find(
    (node) => node.id === movingId,
  )!;
  expect(free.geometry.x).toBeCloseTo(near.x, 0);
  expect(free.geometry.y).toBeCloseTo(near.y, 0);
  const undo = button(page, messages['editing.undo']);
  await undo.press('Enter');
  expect((await exported(page, messages)).sheet.nodes).toEqual(original.nodes);

  await dragLaneBody();
  const snapped = (await exported(page, messages)).sheet;
  expect(snapped.nodes).toEqual(
    original.nodes.map((node) =>
      node.id === movingId
        ? {
            ...node,
            geometry: { ...node.geometry, x: fixed.geometry.x, y: seam },
          }
        : node,
    ),
  );
  expect(snapped.connections).toEqual(original.connections);
  await undo.press('Enter');
  expect((await exported(page, messages)).sheet.nodes).toEqual(original.nodes);
  const gridSnap = button(page, messages['canvas.snap']);
  await gridSnap.press('Enter');
  await expect(gridSnap).toHaveAttribute('aria-pressed', 'true');
  await dragLaneBody({ x: fixed.geometry.x, y: seam });
  expect((await exported(page, messages)).sheet.nodes).toEqual(snapped.nodes);
});

test('German catalog places both swimlane orientations and groups a step by its position at 200% scale', async ({
  page,
}) => {
  const messages = messagesFor('de');
  await page.addInitScript(() =>
    localStorage.setItem(
      'koxora.preferences.v1',
      JSON.stringify({ locale: 'de', guiScale: 200 }),
    ),
  );
  await page.setViewportSize({ width: 390, height: 650 });
  await page.goto('/');
  await page
    .locator('.start-actions')
    .getByRole('button', { name: messages['start.blank'], exact: true })
    .click();
  await saved(page, messages);

  const canvas = canvasFor(page, messages);
  const elements = canvas.locator('[data-node-id]');
  await armShape(page, messages, 'rectangle');
  await page.keyboard.press('Enter');
  await expect(elements).toHaveCount(1);
  const stepId = (await elements.first().getAttribute('data-node-id'))!;

  await armShape(page, messages, 'swimlane-horizontal');
  await page.keyboard.press('Enter');
  await expect(elements).toHaveCount(2);
  await expect(elements.last()).toHaveAttribute('data-node-id', stepId);
  const laneId = (await elements.first().getAttribute('data-node-id'))!;
  await expect(canvas).toHaveAttribute(
    'data-selection',
    JSON.stringify([laneId]),
  );
  await chooseMenuAction(
    page,
    messages['office.menu.format'],
    messages['rich.edit'],
  );
  const editor = page.locator(
    '.canvas-text-dialog [contenteditable="true"][role="textbox"]',
  );
  await expect(editor).toHaveText(messages['swimlane.newTitle']);
  await editor.fill('Support-Team');
  await editor.press('Escape');
  await expect(editor).toHaveCount(0);

  await chooseMenuAction(
    page,
    messages['office.menu.edit'],
    messages['swimlane.selectContents'],
  );
  await expect(canvas).toHaveAttribute(
    'data-selection',
    JSON.stringify([laneId, stepId]),
  );

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
  await page
    .getByRole('menu', { name: messages['arrange.automatic'], exact: true })
    .getByRole('menuitem', {
      name: messages['arrange.flow.left-right'],
      exact: true,
    })
    .press('Enter');
  await expect(page.locator('.diagram-guidance')).toHaveText(
    messages['arrange.automatic.swimlane'],
  );

  await armShape(page, messages, 'swimlane-vertical');
  await page.keyboard.press('Enter');
  await expect(elements).toHaveCount(3);
  const archive = await exported(page, messages);
  expect(archive.project.manifest.requiredFeatures).toContain('swimlanes-v1');
  const [, horizontal, vertical] = archive.sheet.nodes;
  expect(horizontal).toMatchObject({
    id: laneId,
    kind: 'swimlane-horizontal',
    content: { text: 'Support-Team' },
  });
  expect(horizontal.geometry.width).toBeGreaterThan(horizontal.geometry.height);
  expect(vertical).toMatchObject({
    kind: 'swimlane-vertical',
    content: { text: messages['swimlane.newTitle'] },
  });
  expect(vertical.geometry.height).toBeGreaterThan(vertical.geometry.width);
});

test('service request previews named lanes and moves a lane with its connected steps in one undoable edit', async ({
  page,
  browser,
  baseURL,
}) => {
  const messages = messagesFor('en');
  const title = messages['templates.swimlane-service-request.title'];
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page
    .locator('.start-actions')
    .getByRole('button', { name: messages['templates.heading'], exact: true })
    .click();
  const card = page.locator('.template-card').filter({
    has: page.getByRole('heading', { name: title, exact: true }),
  });
  await card
    .getByRole('button', { name: messages['templates.preview'], exact: true })
    .click();
  const preview = page.getByRole('dialog', { name: title, exact: true });
  await expect(preview).toBeVisible();
  const previewLabels = await preview
    .locator('svg.template-preview text')
    .evaluateAll((labels) =>
      labels.map((label) =>
        [...label.querySelectorAll('tspan')]
          .map((span) => span.textContent)
          .join(' '),
      ),
    );
  expect(previewLabels).toEqual(
    expect.arrayContaining(['Requester', 'Service desk', 'Fulfillment']),
  );
  await preview
    .getByRole('button', { name: messages['templates.use'], exact: true })
    .click();

  const canvas = canvasFor(page, messages);
  const original = await exported(page, messages);
  expect(original.project.manifest.requiredFeatures).toContain('swimlanes-v1');
  const lanes = original.sheet.nodes.filter(
    (node) => node.kind === 'swimlane-horizontal',
  );
  expect(lanes.map((lane) => lane.content.text)).toEqual([
    'Requester',
    'Service desk',
    'Fulfillment',
  ]);
  const [requester] = lanes;
  const steps = ['Submit request', 'Confirm receipt'].map((label) =>
    original.sheet.nodes.find((node) => node.content.text === label)!,
  );
  expect(
    original.sheet.connections.some(
      (edge) =>
        edge.sourceId === steps[0].id &&
        !steps.some((step) => step.id === edge.targetId),
    ),
  ).toBe(true);

  await button(page, messages['canvas.fit']).press('Enter');
  const painted = canvas.locator('[data-node-id], [data-connection-id]');
  await expect(painted).toHaveCount(
    original.sheet.nodes.length + original.sheet.connections.length,
  );
  const paintOrder = await painted.evaluateAll((elements) =>
    elements.map(
      (element) =>
        element.getAttribute('data-node-id') ??
        element.getAttribute('data-connection-id'),
    ),
  );
  expect(paintOrder.slice(0, lanes.length)).toEqual(
    lanes.map((lane) => lane.id),
  );

  const lane = canvas.locator(`[data-node-id="${requester.id}"] .scene-node`);
  const bounds = (await lane.boundingBox())!;
  await page.mouse.click(bounds.x + 8, bounds.y + 8, { button: 'right' });
  await expect(canvas).toHaveAttribute(
    'data-selection',
    JSON.stringify([requester.id]),
  );
  await page
    .getByRole('menu', { name: messages['editing.actions'], exact: true })
    .getByRole('menuitem', {
      name: messages['swimlane.selectContents'],
      exact: true,
    })
    .press('Enter');
  const expected = [requester.id, ...steps.map((step) => step.id)];
  await expect
    .poll(async () =>
      (
        JSON.parse((await canvas.getAttribute('data-selection'))!) as string[]
      ).sort(),
    )
    .toEqual([...expected].sort());
  await expect(canvas).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight');
  const moved = await exported(page, messages);
  const movedLane = moved.sheet.nodes.find((node) => node.id === requester.id)!;
  const distance = movedLane.geometry.x - requester.geometry.x;
  expect(distance).toBeGreaterThan(0);
  expect(moved.sheet.nodes).toEqual(
    original.sheet.nodes.map((node) =>
      expected.includes(node.id)
        ? {
            ...node,
            geometry: { ...node.geometry, x: node.geometry.x + distance },
          }
        : node,
    ),
  );
  expect(moved.sheet.connections).toEqual(original.sheet.connections);

  await button(page, messages['editing.undo']).press('Enter');
  const undone = (await exported(page, messages)).sheet;
  expect(undone.nodes).toEqual(original.sheet.nodes);
  expect(undone.connections).toEqual(original.sheet.connections);
  await button(page, messages['editing.redo']).press('Enter');
  const redone = await exported(page, messages);
  expect(redone.sheet.nodes).toEqual(moved.sheet.nodes);

  const context = await browser.newContext({ baseURL });
  try {
    const fresh = await context.newPage();
    await fresh.goto('/');
    await button(fresh, messages['project.import']).click();
    await fresh
      .getByRole('dialog')
      .getByLabel(messages['project.import'], { exact: true })
      .setInputFiles({
        name: 'service-request.koxora',
        mimeType: 'application/zip',
        buffer: redone.bytes,
      });
    const reopened = await exported(fresh, messages);
    expect(reopened.project.manifest.requiredFeatures).toContain(
      'swimlanes-v1',
    );
    expect(reopened.sheet.nodes).toEqual(moved.sheet.nodes);
    expect(reopened.sheet.connections).toEqual(original.sheet.connections);
  } finally {
    await context.close();
  }
});
