import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
  type Project,
} from '../../packages/project/src/index';
import {
  applyEdit,
  CONNECTION_KEY,
  CONNECTION_PORTS_FEATURE,
  type Anchor,
} from '../../packages/editor-core/src/index';

const now = '2026-11-22T12:00:00.000Z';
const sourceAnchor = { x: 1, y: 0.25 };
const sheetOf = (project: Project) => project.documents[0].pages[0];
type Messages = Record<string, string>;

function fixture() {
  let project = createProject(
    'Shared connection junction',
    () => crypto.randomUUID(),
    now,
  );
  const document = project.documents[0],
    sheet = sheetOf(project);
  const nodes = [
    { kind: 'rectangle', x: -660, y: -120, text: 'Source' },
    { kind: 'junction', x: -8, y: -8, text: '' },
    { kind: 'triangle', x: 240, y: -420, text: 'Triangle target' },
    { kind: 'ellipse', x: 240, y: -120, text: 'Ellipse target' },
    { kind: 'table', x: 240, y: 180, text: 'Table target' },
  ] as const;
  for (const node of nodes)
    project = applyEdit(
      project,
      document.id,
      sheet.id,
      {
        type: 'insert',
        id: crypto.randomUUID(),
        layerId: sheet.layers[0].id,
        kind: node.kind,
        position: { x: node.x, y: node.y },
        geometry: {
          x: node.x,
          y: node.y,
          width: node.kind === 'junction' ? 16 : 360,
          height: node.kind === 'junction' ? 16 : 240,
          rotation: 0,
        },
        text: node.text,
        snap: false,
      },
      now,
    );
  return project;
}

async function open(page: Page, locale: string, project = fixture()) {
  const t: Messages = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  await page.addInitScript(
    (locale) =>
      localStorage.setItem(
        'koxora.preferences.v1',
        JSON.stringify({ locale, theme: 'light', guiScale: 100 }),
      ),
    locale,
  );
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto('/');
  await page
    .getByRole('button', { name: t['project.import'], exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel(t['project.import'], { exact: true })
    .setInputFiles({
      name: 'connection-ports.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText(t['project.saved']);
  await page
    .getByRole('button', { name: t['canvas.fit'], exact: true })
    .click();
  return { t, project };
}

const ports = (page: Page, id: string) =>
  page.locator(`[data-port-node="${id}"]`);
const port = (page: Page, id: string, anchor: Anchor) =>
  page.locator(
    `[data-port-node="${id}"][data-port-anchor='${typeof anchor === 'string' ? anchor : JSON.stringify(anchor)}']`,
  );

async function exported(page: Page, t: Messages) {
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: t['project.export'], exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await download).path())!)),
  );
}

async function assertMeetingPoint(
  page: Page,
  edges: Project['documents'][number]['pages'][number]['connections'],
  junctionId: string,
  x: number,
  y: number,
) {
  for (const edge of edges) {
    await expect
      .poll(async () =>
        page
          .locator(`[data-connection-id="${edge.id}"] .scene-connection`)
          .evaluate((element, target) => {
            const path = element as SVGPathElement;
            const point = path.getPointAtLength(
              target ? path.getTotalLength() : 0,
            );
            return {
              x: Number(point.x.toFixed(5)),
              y: Number(point.y.toFixed(5)),
            };
          }, edge.targetId === junctionId),
      )
      .toEqual({ x, y });
  }
}

async function selectObject(page: Page, t: Messages, id: string) {
  const picker = page.getByRole('combobox', {
    name: t['diagram.target'],
    exact: true,
  });
  if (!(await picker.isVisible()))
    await page
      .getByRole('button', { name: t['format.objects'], exact: true })
      .click();
  await picker.selectOption(id);
  await expect(page.locator('.interactive-canvas')).toHaveAttribute(
    'data-selection',
    JSON.stringify([id]),
  );
}

test('dense diagrams bound visible port controls and retain the armed source while the pointer moves', async ({
  page,
}) => {
  test.setTimeout(60_000);
  let project = createProject(
    'Dense connection ports',
    () => crypto.randomUUID(),
    now,
  );
  const document = project.documents[0],
    sheet = sheetOf(project);
  project = applyEdit(
    project,
    document.id,
    sheet.id,
    {
      type: 'insert',
      id: crypto.randomUUID(),
      kind: 'rectangle',
      layerId: sheet.layers[0].id,
      position: { x: 0, y: 0 },
      geometry: { x: 0, y: 0, width: 360, height: 240, rotation: 0 },
      snap: false,
    },
    now,
  );
  const prototype = sheetOf(project).nodes[0];
  sheetOf(project).nodes = Array.from({ length: 1500 }, (_, index) => ({
    ...structuredClone(prototype),
    id: crypto.randomUUID(),
    geometry: {
      ...prototype.geometry,
      x: (index % 50) * 400,
      y: Math.floor(index / 50) * 280,
    },
  }));
  const { t } = await open(page, 'en', project);
  await expect(page.locator('[data-node-id]')).toHaveCount(1500);
  await page.locator('[data-ribbon-tab="connections"]').click();
  await page.locator('[data-connection-preset="straight-arrow"]').click();
  const controls = page.locator('[data-port-node]');
  await expect(controls.first()).toBeVisible();
  const assertBounded = async () => {
    const visible = await controls.evaluateAll((buttons) => ({
      count: buttons.length,
      nodes: new Set(
        buttons.map((button) => (button as HTMLElement).dataset.portNode),
      ).size,
    }));
    expect(visible.count).toBeGreaterThan(0);
    expect(visible.count).toBeLessThanOrEqual(1024);
    expect(visible.nodes).toBeLessThanOrEqual(256);
  };
  await assertBounded();
  const initial = controls.first();
  const sourceId = (await initial.getAttribute('data-port-node'))!;
  const anchor = (await initial.getAttribute('data-port-anchor'))!;
  await initial.press('Enter');
  const selectedPort = page.locator(
    `[data-port-node="${sourceId}"][data-port-anchor='${anchor}']`,
  );
  await expect(selectedPort).toHaveAttribute('aria-pressed', 'true');
  const visibleNodeIds = () =>
    controls.evaluateAll((buttons) =>
      [
        ...new Set(
          buttons.map((button) => (button as HTMLElement).dataset.portNode),
        ),
      ]
        .sort()
        .join(','),
    );
  const previousNodes = await visibleNodeIds();
  const canvas = (await page.locator('.interactive-canvas').boundingBox())!;
  await page.mouse.move(canvas.x + 24, canvas.y + 24);
  await expect.poll(visibleNodeIds).not.toBe(previousNodes);
  await expect(selectedPort).toHaveAttribute('aria-pressed', 'true');
  await assertBounded();
  const target = page
    .locator(`[data-port-node]:not([data-port-node="${sourceId}"])`)
    .first();
  const targetId = (await target.getAttribute('data-port-node'))!;
  await target.press('Enter');
  await expect(page.locator('[data-connection-id]')).toHaveCount(1);
  const saved = await exported(page, t);
  expect(sheetOf(saved).nodes).toHaveLength(1500);
  expect(sheetOf(saved).connections[0]).toMatchObject({ sourceId, targetId });
});

for (const locale of ['en', 'de'])
  test(`normalized contour ports and a shared junction survive manipulation and reopening ${locale}`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { t, project } = await open(page, locale);
    const [source, junction, ...targets] = sheetOf(project).nodes;
    await page.locator('[data-ribbon-tab="connections"]').click();
    const arrow = page.locator('[data-connection-preset="straight-arrow"]');
    await arrow.click();
    await expect(ports(page, source.id)).toHaveCount(12);
    await expect(ports(page, junction.id)).toHaveCount(1);
    await expect(port(page, junction.id, 'auto')).toHaveAccessibleName(
      new RegExp(t['ports.center']),
    );
    for (const target of targets)
      expect(await ports(page, target.id).count()).toBeGreaterThan(4);

    // The pointer chooses a noncardinal local direction, then the exact center.
    await port(page, source.id, sourceAnchor).click();
    await expect(port(page, source.id, sourceAnchor)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await port(page, junction.id, 'auto').click();
    await expect(page.locator('[data-connection-id]')).toHaveCount(1);
    for (const [index, target] of targets.entries()) {
      await arrow.click();
      const center = port(page, junction.id, 'auto');
      // Exercise native keyboard activation of the same visible port button.
      if (index === 0) await center.press('Enter');
      else await center.click();
      await port(page, target.id, 'west').click();
      await expect(page.locator('[data-connection-id]')).toHaveCount(index + 2);
    }
    await expect(page.locator('[data-node-id]')).toHaveCount(5);
    const connected = await exported(page, t),
      edges = sheetOf(connected).connections;
    expect(connected.manifest.requiredFeatures).toContain(
      CONNECTION_PORTS_FEATURE,
    );
    expect(edges).toHaveLength(4);
    expect(edges[0]).toMatchObject({
      sourceId: source.id,
      targetId: junction.id,
    });
    expect(edges[0].extensions[CONNECTION_KEY]).toMatchObject({
      version: 1,
      sourceAnchor,
      targetAnchor: 'auto',
    });
    expect(edges.slice(1).map((edge) => edge.targetId)).toEqual(
      targets.map((target) => target.id),
    );
    for (const [index, edge] of edges.slice(1).entries()) {
      expect(edge.sourceId).toBe(junction.id);
      expect(edge.extensions[CONNECTION_KEY]).toMatchObject({
        sourceAnchor: 'auto',
        targetAnchor: 'west',
      });
      const targetPoint = await page
        .locator(`[data-connection-id="${edge.id}"] .scene-connection`)
        .evaluate((element) => {
          const path = element as SVGPathElement;
          const point = path.getPointAtLength(path.getTotalLength());
          return { x: point.x, y: point.y };
        });
      // A triangle's left contour sits inside its bounding rectangle at midheight.
      expect(targetPoint.x).toBeCloseTo(index === 0 ? 330 : 240, 5);
      expect(targetPoint.y).toBeCloseTo([-300, 0, 300][index], 5);
    }
    await assertMeetingPoint(page, edges, junction.id, 0, 0);

    // All four endpoints move together, and each history step restores the branch.
    await selectObject(page, t, junction.id);
    await page.locator('.interactive-canvas').focus();
    await page.keyboard.press('Alt+Shift+ArrowRight');
    await assertMeetingPoint(page, edges, junction.id, 10, 0);
    await page
      .getByRole('button', { name: t['editing.undo'], exact: true })
      .click();
    await assertMeetingPoint(page, edges, junction.id, 0, 0);
    await page
      .getByRole('button', { name: t['editing.redo'], exact: true })
      .click();
    await assertMeetingPoint(page, edges, junction.id, 10, 0);

    // Shrink below the additional-port threshold through the real resize handle.
    await selectObject(page, t, source.id);
    const handle = page.locator(
      `[data-resize-id="${source.id}"][data-handle="se"]`,
    );
    const box = (await handle.boundingBox())!;
    const canvas = page.locator('.interactive-canvas');
    const surface = (await canvas.boundingBox())!;
    const camera = JSON.parse((await canvas.getAttribute('data-camera'))!) as {
      x: number;
      y: number;
      zoom: number;
    };
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.keyboard.down('Alt');
    await page.mouse.move(
      surface.x + surface.width / 2 + (-480 - camera.x) * camera.zoom,
      surface.y + surface.height / 2 - camera.y * camera.zoom,
      { steps: 8 },
    );
    await page.mouse.up();
    await page.keyboard.up('Alt');
    const resized = await exported(page, t);
    const savedSource = sheetOf(resized).nodes.find(
      (node) => node.id === source.id,
    )!;
    expect(savedSource.geometry.width).toBeGreaterThan(120);
    expect(savedSource.geometry.width).toBeLessThan(220);
    expect(savedSource.geometry.height).toBeGreaterThan(80);
    expect(savedSource.geometry.height).toBeLessThan(220);
    expect(
      sheetOf(resized).connections[0].extensions[CONNECTION_KEY],
    ).toMatchObject({ sourceAnchor });
    await assertMeetingPoint(page, edges, junction.id, 10, 0);
    const attached = await page
      .locator(`[data-connection-id="${edges[0].id}"] .scene-connection`)
      .evaluate((element) => {
        const point = (element as SVGPathElement).getPointAtLength(0);
        return { x: point.x, y: point.y };
      });
    expect(attached.x).toBeCloseTo(
      savedSource.geometry.x + savedSource.geometry.width,
      4,
    );
    expect(attached.y).toBeCloseTo(
      savedSource.geometry.y + savedSource.geometry.height * 0.25,
      4,
    );
    await arrow.click();
    await expect(ports(page, source.id)).toHaveCount(5);
    await expect(port(page, source.id, sourceAnchor)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.save-status')).toHaveText(t['project.saved']);

    await page.reload();
    await page
      .getByRole('button', { name: t['project.open'], exact: true })
      .click();
    await expect(page.locator('[data-connection-id]')).toHaveCount(4);
    await assertMeetingPoint(page, edges, junction.id, 10, 0);
    const reopened = await exported(page, t);
    expect(reopened.manifest.projectId).toBe(project.manifest.projectId);
    expect(sheetOf(reopened).connections).toEqual(sheetOf(resized).connections);
    expect(
      sheetOf(reopened).nodes.find((node) => node.id === junction.id)?.geometry,
    ).toMatchObject({ x: 2, y: -8, width: 16, height: 16 });

    // The explicit localized insertion tool creates an ordinary small junction.
    await page.locator('[data-ribbon-tab="connections"]').click();
    await page
      .getByRole('button', { name: t['shape.junction'], exact: true })
      .click();
    const currentSurface = (await canvas.boundingBox())!;
    const currentCamera = JSON.parse(
      (await canvas.getAttribute('data-camera'))!,
    ) as { x: number; y: number; zoom: number };
    await page.mouse.click(
      currentSurface.x +
        currentSurface.width / 2 +
        (-100 - currentCamera.x) * currentCamera.zoom,
      currentSurface.y +
        currentSurface.height / 2 +
        (-300 - currentCamera.y) * currentCamera.zoom,
    );
    await expect(page.locator('[data-node-id]')).toHaveCount(6);
    const inserted = sheetOf(await exported(page, t)).nodes.find(
      (node) => node.kind === 'junction' && node.id !== junction.id,
    )!;
    expect(inserted.geometry).toMatchObject({ width: 16, height: 16 });
    await page
      .getByRole('button', { name: t['editing.undo'], exact: true })
      .click();
    await expect(page.locator('[data-node-id]')).toHaveCount(5);
    await assertMeetingPoint(page, edges, junction.id, 10, 0);
    await page.screenshot({
      path: test.info().outputPath(`connection-junction-${locale}.png`),
    });
  });
