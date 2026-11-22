import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createProject, exportProject } from '../../packages/project/src/index';
import { applyEdit, shapeKinds } from '../../packages/editor-core/src/index';

async function start(page: Page, locale: string, scale = 100) {
  await page.addInitScript(
    ({ locale, scale }) =>
      localStorage.setItem(
        'koxora.preferences.v1',
        JSON.stringify({ locale, guiScale: scale, theme: 'light' }),
      ),
    { locale, scale },
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  const t: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  let project = createProject(
    'Window feedback',
    () => crypto.randomUUID(),
    '2026-11-16T18:00:00.000Z',
  );
  const document = project.documents[0],
    sheet = document.pages[0],
    id = crypto.randomUUID();
  project = applyEdit(
    project,
    document.id,
    sheet.id,
    {
      type: 'insert',
      id,
      kind: 'rectangle',
      layerId: sheet.layers[0].id,
      position: { x: 0, y: 0 },
      text: 'Move and select this text',
    },
    '2026-11-16T18:00:00.000Z',
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: t['project.import'], exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel(t['project.import'], { exact: true })
    .setInputFiles({
      name: 'window.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText(t['project.saved']);
  return { t, id };
}

for (const locale of ['en', 'de']) {
  test(`text window drags from background while editable text stays selectable ${locale}`, async ({
    page,
  }) => {
    const { t, id } = await start(page, locale);
    await page.locator(`[data-node-id="${id}"]`).dblclick();
    const dialog = page.locator('.canvas-text-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.floating-window-handle')).toHaveText(
      new RegExp(t['window.textTitle']),
    );
    const before = (await dialog.boundingBox())!;
    const background = (await dialog.locator('.rich-toolbar').boundingBox())!;
    await page.mouse.move(background.x + 2, background.y + 2);
    await page.mouse.down();
    await page.mouse.move(background.x + 2 - 80, background.y + 2 - 30, {
      steps: 5,
    });
    await page.mouse.up();
    expect((await dialog.boundingBox())!.x).toBeLessThan(before.x - 60);
    const moved = (await dialog.boundingBox())!;
    const editor = dialog.locator('[contenteditable]');
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    // WebKit includes a block's terminal newline when selecting its text.
    expect(
      await page.evaluate(() =>
        window.getSelection()?.toString().replace(/\n$/, ''),
      ),
    ).toBe('Move and select this text');
    expect((await dialog.boundingBox())!.x).toBeCloseTo(moved.x, 1);
    await dialog.locator('.floating-window-handle').focus();
    await page.keyboard.press('ArrowRight');
    expect((await dialog.boundingBox())!.x).toBeGreaterThan(moved.x + 8);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test(`every enabled symbol has a quick palette page and categories switch directly ${locale}`, async ({
    page,
  }) => {
    const { t } = await start(page, locale);
    const palette = page.getByRole('toolbar', {
      name: t['diagram.tools'],
      exact: true,
    });
    const next = page.getByRole('button', {
      name: t['palette.nextPage'],
      exact: true,
    });
    const previous = page.getByRole('button', {
      name: t['palette.previousPage'],
      exact: true,
    });
    await expect(page.locator('.compact-tool-ribbon')).toHaveAttribute(
      'data-palette-measured',
      'true',
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      const ribbon = document.querySelector('.compact-tool-ribbon')!;
      let previous = '',
        stable = 0;
      for (let frame = 0; frame < 120; frame++) {
        await new Promise(requestAnimationFrame);
        const current = JSON.stringify([
          ribbon.getBoundingClientRect().width,
          ribbon.getAttribute('data-palette-capacity'),
          ribbon.getAttribute('data-palette-page-size'),
        ]);
        stable = current === previous ? stable + 1 : 0;
        previous = current;
        if (stable >= 4) return;
      }
      throw new Error('The responsive symbol palette did not settle');
    });
    await expect(previous).toBeDisabled();
    const seen = new Set<string>();
    for (let count = 0; count <= shapeKinds.length; count++) {
      for (const kind of await palette
        .locator('[data-library-kind]')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('data-library-kind')!),
        ))
        seen.add(kind);
      await expect(next).toBeInViewport();
      if (await next.isDisabled()) break;
      await next.click();
    }
    expect([...seen].sort()).toEqual(
      [
        ...shapeKinds.filter(
          (kind) => !['line', 'arrow', 'junction'].includes(kind),
        ),
        'freehand',
      ].sort(),
    );
    await expect(previous).toBeEnabled();
    if (!(await page.locator('.ribbon-shape-filters').isVisible()))
      await page.locator('.ribbon-filter-toggle').click();
    await page
      .getByRole('combobox', { name: t['palette.quickCategory'], exact: true })
      .selectOption('drawing');
    await expect(
      palette.getByRole('button', { name: t['shape.freehand'], exact: true }),
    ).toBeVisible();
    await expect(previous).toBeDisabled();
    await palette
      .getByRole('button', { name: t['shape.freehand'], exact: true })
      .click();
    await page
      .getByRole('combobox', { name: t['palette.quickCategory'], exact: true })
      .selectOption('all');
    await expect(
      palette.getByRole('button', { name: t['shape.freehand'], exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      palette.getByRole('button', { name: t['shape.freehand'], exact: true }),
    ).toBeInViewport();
  });
}
