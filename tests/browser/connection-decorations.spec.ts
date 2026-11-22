import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';
import {
  CONNECTION_KEY,
  CONNECTION_DECORATIONS_FEATURE,
} from '../../packages/editor-core/src/index';
async function open(page: Page, locale: string) {
  const t: Record<string, string> = JSON.parse(
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
  await page.setViewportSize({ width: 1440, height: 1000 });
  const p = createProject(
    'Connection styles',
    () => crypto.randomUUID(),
    '2026-11-17T10:00:00.000Z',
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: t['project.import'], exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel(t['project.import'], { exact: true })
    .setInputFiles({
      name: 'styles.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(p)),
    });
  await expect(page.locator('.save-status')).toHaveText(t['project.saved']);
  return t;
}
async function draw(page: Page) {
  const canvas = page.locator('.interactive-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.7, {
    steps: 6,
  });
  await page.mouse.up();
}
for (const locale of ['en', 'de'])
  test(`connection gallery draws decorated paths and preserves them in archives ${locale}`, async ({
    page,
  }) => {
    const t = await open(page, locale),
      gallery = page.getByRole('toolbar', {
        name: t['line.library'],
        exact: true,
      });
    await page.locator('[data-ribbon-tab="connections"]').click();
    await expect(
      gallery.locator('[data-connection-preset]').first(),
    ).toBeVisible();
    const choose = async (preset: string) => {
      const previous = page.locator('.connection-page-button').first();
      while (await previous.isEnabled()) await previous.click();
      const button = gallery.locator(`[data-connection-preset="${preset}"]`);
      const next = page.locator('.connection-page-button').last();
      while (!(await button.count()) && (await next.isEnabled()))
        await next.click();
      await button.click();
      return button;
    };
    const choices = [
      'dashed-open-arrow',
      'open-diamond',
      'filled-diamond',
      'circle-ends',
      'bar-ends',
      'dotted-arrow',
    ];
    for (const [index, preset] of choices.entries()) {
      const button = await choose(preset);
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await draw(page);
      await expect(page.locator('[data-connection-id]')).toHaveCount(index + 1);
    }
    const dashed = page
      .locator('[data-endpoint-marker="open-arrow"]')
      .locator('..');
    await expect(dashed.locator('.scene-connection')).toHaveAttribute(
      'stroke-dasharray',
      /\d+ \d+/,
    );
    await expect(page.locator('[data-endpoint-marker="diamond"]')).toHaveCount(
      1,
    );
    await expect(
      page.locator('[data-endpoint-marker="filled-diamond"]'),
    ).toHaveCount(1);
    await expect(page.locator('[data-endpoint-marker="circle"]')).toHaveCount(
      2,
    );
    await expect(page.locator('[data-endpoint-marker="bar"]')).toHaveCount(2);
    await expect(
      page.locator('.scene-connection[stroke-linecap="round"]'),
    ).toHaveCount(1);
    await page.screenshot({
      path: test.info().outputPath(`connection-styles-${locale}.png`),
    });
    const pending = page.waitForEvent('download');
    await page
      .getByRole('button', { name: t['project.export'], exact: true })
      .click();
    const reopened = await importProject(
      new Uint8Array(readFileSync((await (await pending).path())!)),
    );
    expect(reopened.manifest.requiredFeatures).toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
    const edges = reopened.documents[0].pages[0].connections;
    expect(edges).toHaveLength(choices.length);
    expect(edges[0].extensions[CONNECTION_KEY]).toMatchObject({
      lineStyle: 'dashed',
      targetMarker: 'open-arrow',
    });
    expect(edges.at(-1)!.extensions[CONNECTION_KEY]).toMatchObject({
      lineStyle: 'dotted',
    });
    // Choosing a plain preset clears custom options for the next line.
    await choose('straight-arrow');
    await draw(page);
    await expect(page.locator('[data-node-id]')).toHaveCount(1);
    await expect(
      page.locator('[data-node-id] [data-arrow-end="target"]'),
    ).toHaveCount(1);
    await page
      .getByRole('button', { name: t['editing.undo'], exact: true })
      .click();
    await expect(page.locator('[data-node-id]')).toHaveCount(0);
    await page
      .getByRole('button', { name: t['editing.redo'], exact: true })
      .click();
    await expect(page.locator('[data-node-id]')).toHaveCount(1);
  });
