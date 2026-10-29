import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createProject, exportProject } from '../../packages/project/src/index';
import {
  applyEdit,
  applyWorkbook,
  selectPage,
  DEFAULT_CONNECTION,
  type EditCommand,
} from '../../packages/editor-core/src/index';
// Captures genuine screenshots of the current studio for the public website.
// Nothing is drawn or retouched: the studio renders the project below and the
// browser records what it shows.
const directory = 'apps/website/public/images/studio';
const sizes: Record<string, { width: number; height: number }> = {};
const shapes = [
  { id: 'a', kind: 'ellipse', text: 'New idea', x: -360, y: -150 },
  { id: 'b', kind: 'rectangle', text: 'Research options', x: -80, y: -150 },
  { id: 'c', kind: 'diamond', text: 'Review', x: 220, y: -150 },
  { id: 'd', kind: 'rounded-rectangle', text: 'Revise draft', x: -80, y: 90 },
  { id: 'e', kind: 'rectangle', text: 'Ready to ship', x: 220, y: 90 },
  { id: 'f', kind: 'hexagon', text: 'Archive', x: -360, y: 90 },
] as const;
const edges = [
  ['a', 'b'],
  ['b', 'c'],
  ['c', 'e'],
  ['c', 'd'],
  ['d', 'b'],
  ['a', 'f'],
] as const;
async function fixture(page: Page) {
  let project = createProject(
    'Product discovery',
    () => crypto.randomUUID(),
    '2026-10-28T09:00:00.000Z',
  );
  const document = project.documents[0];
  const first = document.pages[0];
  const ids: Record<string, string> = {};
  for (const shape of shapes) {
    ids[shape.id] = crypto.randomUUID();
    const command: EditCommand = {
      type: 'insert',
      id: ids[shape.id]!,
      kind: shape.kind,
      text: shape.text,
      position: { x: shape.x, y: shape.y },
      layerId: first.layers[0].id,
    };
    project = applyEdit(
      project,
      document.id,
      first.id,
      command,
      project.manifest.updatedAt,
    );
  }
  for (const [source, target] of edges)
    project = applyEdit(
      project,
      document.id,
      first.id,
      {
        type: 'connect',
        id: crypto.randomUUID(),
        sourceId: ids[source]!,
        targetId: ids[target]!,
        layerId: first.layers[0].id,
        options: { ...DEFAULT_CONNECTION },
      },
      project.manifest.updatedAt,
    );
  for (const command of [
    { type: 'renameDocument', documentId: document.id, title: 'Discovery' },
    { type: 'renamePage', pageId: first.id, title: 'Overview' },
    { type: 'newPage', documentId: document.id, title: 'Research notes' },
    { type: 'newDocument', title: 'Delivery' },
  ] as const)
    project = applyWorkbook(
      project,
      command,
      () => crypto.randomUUID(),
      project.manifest.updatedAt,
    );
  project = selectPage(project, document.id, first.id);
  project = applyEdit(
    project,
    document.id,
    first.id,
    {
      type: 'richText',
      id: ids.b!,
      value: {
        version: 1,
        paragraphs: [
          {
            align: 'center',
            runs: [
              {
                text: 'Research ',
                style: { fontWeight: 700, textColor: '#2766d7' },
              },
              { text: 'options', style: { fontStyle: 'italic' } },
            ],
          },
        ],
      },
    },
    project.manifest.updatedAt,
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'product-discovery.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('[data-node-id]')).toHaveCount(shapes.length);
  await page.getByRole('button', { name: 'Fit content', exact: true }).click();
  await page.keyboard.press('Escape');
  // Wait for the automatic local save so the status line shows a settled state.
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  return ids;
}
async function shoot(page: Page, name: string) {
  mkdirSync(directory, { recursive: true });
  const buffer = await page.screenshot({ path: `${directory}/${name}.png` });
  const size = await page.evaluate(
    (data) =>
      new Promise<{ width: number; height: number; webp: string }>(
        (resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            canvas.getContext('2d')!.drawImage(image, 0, 0);
            resolve({
              width: image.naturalWidth,
              height: image.naturalHeight,
              webp: canvas.toDataURL('image/webp', 0.9),
            });
          };
          image.onerror = () =>
            reject(new Error('Screenshot could not be decoded'));
          image.src = `data:image/png;base64,${data}`;
        },
      ),
    buffer.toString('base64'),
  );
  writeFileSync(
    `${directory}/${name}.webp`,
    Buffer.from(size.webp.split(',')[1]!, 'base64'),
  );
  sizes[name] = { width: size.width, height: size.height };
}
test('capture studio screenshots for the website', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 980 });
  await page.clock.setFixedTime(new Date('2026-10-28T09:00:00Z'));
  // The dashboard first, before anything is imported: once a project exists
  // on the device the studio opens it, which is the point of local-first and
  // also why a first-time view has to be captured first.
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Import .koxora', exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  await shoot(page, 'docs-dashboard');
  const ids = await fixture(page);
  const appearance = page.getByRole('combobox', {
    name: 'Appearance',
    exact: true,
  });
  await appearance.selectOption('dark');
  await shoot(page, 'editor-dark');
  await appearance.selectOption('light');
  await shoot(page, 'editor-light');
  await appearance.selectOption('dark');
  // Each language gets its own narrow-screen screenshot, so a reader never
  // sees the interface in a language the page is not written in.
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Expand canvas', exact: true })
    .click();
  await page.getByRole('button', { name: 'Fit content', exact: true }).click();
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await shoot(page, 'editor-small-en');
  await page
    .getByRole('button', { name: 'Restore workspace', exact: true })
    .click();
  // The documentation pages show what a reader is told about: the control
  // that opens an element's properties, the shortcut reference, and the
  // dashboard a reader meets before any project is open. Each one is the real
  // interface, reached the way the documentation says to reach it.
  await page.setViewportSize({ width: 1440, height: 980 });
  await page.getByRole('button', { name: 'Fit content', exact: true }).click();
  await page.locator('[data-node-id]').first().click();
  await page.getByRole('button', { name: 'Element properties' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shoot(page, 'docs-properties');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shoot(page, 'docs-shortcuts');
  await page.keyboard.press('Escape');
  for (const locale of ['en', 'de'] as const) {
    await page
      .locator('select')
      .filter({ has: page.locator('option[value="en"]') })
      .selectOption(locale);
    await page.setViewportSize({ width: 1440, height: 980 });
    await page
      .getByRole('button', {
        name: locale === 'en' ? 'Fit content' : 'Inhalt einpassen',
        exact: true,
      })
      .click();
    const delivery = page
      .locator('[role=treeitem][aria-level="2"]')
      .filter({ hasText: 'Delivery' });
    if ((await delivery.getAttribute('aria-expanded')) !== 'true')
      await delivery.click();
    await page
      .getByRole('treeitem', { name: 'Overview', exact: true })
      .locator('..')
      .locator('.tree-actions')
      .click();
    await expect(page.getByRole('menu')).toBeVisible();
    await shoot(page, `docs-navigator-${locale}`);
    await page.keyboard.press('Escape');
    await page.locator(`[data-node-id="${ids.b}"]`).dblclick();
    await expect(page.locator('.canvas-text-dialog')).toBeVisible();
    await expect(
      page.locator('.canvas-text-dialog [contenteditable]'),
    ).toContainText('Research options');
    await shoot(page, `docs-rich-text-${locale}`);
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', {
        name: locale === 'en' ? 'Freehand pen' : 'Freihandstift',
        exact: true,
      })
      .click();
    await page
      .getByLabel(locale === 'en' ? 'Outline' : 'Kontur', { exact: true })
      .fill('#e9a83b');
    await page
      .getByLabel(locale === 'en' ? 'Outline width' : 'Konturstärke', {
        exact: true,
      })
      .fill('5');
    const canvas = page.locator('.interactive-canvas');
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.9);
    await page.mouse.down();
    for (let i = 1; i <= 60; i++)
      await page.mouse.move(
        box.x + box.width * (0.2 + i / 100),
        box.y + box.height * (0.9 + Math.sin(i / 5) * 0.035),
      );
    await page.mouse.up();
    await expect(page.locator('[data-node-id]')).toHaveCount(shapes.length + 1);
    await shoot(page, `docs-freehand-${locale}`);
    await page
      .getByRole('button', {
        name: locale === 'en' ? 'Undo' : 'Rückgängig',
        exact: true,
      })
      .click();
    await expect(page.locator('[data-node-id]')).toHaveCount(shapes.length);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1440, height: 980 });
  await page
    .getByRole('combobox', { name: 'Sprache', exact: true })
    .selectOption('de');
  await page
    .getByRole('combobox', { name: 'Darstellung', exact: true })
    .selectOption('dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Zeichenfläche erweitern', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Inhalt einpassen', exact: true })
    .click();
  await expect(
    page.getByText('Auf diesem Ger\u00e4t gespeichert', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await shoot(page, 'editor-small-de');
  const entries = Object.entries(sizes)
    .map(
      ([name, size]) =>
        `  '${name}': { width: ${size.width}, height: ${size.height} },`,
    )
    .join('\n');
  writeFileSync(
    'apps/website/src/content/screenshots.ts',
    `// Generated by tests/assets/studio-screenshots.spec.ts. Do not edit.\n` +
      `export const screenshotSizes: Record<\n  string,\n  { width: number; height: number }\n> = {\n${entries}\n};\n`,
  );
});
