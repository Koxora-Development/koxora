import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createProject, exportProject } from '../../packages/project/src/index';
import {
  applyEdit,
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
  { id: 'b', kind: 'rectangle', text: 'Research', x: -80, y: -150 },
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
    '2026-10-24T09:00:00.000Z',
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
  await page.setViewportSize({ width: 1440, height: 980 });
  await page.clock.setFixedTime(new Date('2026-10-24T09:00:00Z'));
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
  await fixture(page);
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
  await page.getByRole('button', { name: 'Fit content', exact: true }).click();
  await expect(
    page.getByText('Saved on this device', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await shoot(page, 'editor-small-en');
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
  await page.setViewportSize({ width: 1440, height: 980 });
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page
    .getByRole('combobox', { name: 'Darstellung', exact: true })
    .selectOption('dark');
  await page.setViewportSize({ width: 390, height: 844 });
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
      `export const screenshotSizes: Record<string, { width: number; height: number }> = {\n${entries}\n};\n`,
  );
});
