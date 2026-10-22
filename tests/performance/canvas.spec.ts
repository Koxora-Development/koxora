import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, arch } from 'node:os';
import { createProject, exportProject } from '../../packages/project/src/index';

test('record reference scene navigation and capture the implemented canvas', async ({
  page,
  browserName,
  browser,
}) => {
  const results: unknown[] = [];
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  for (const count of [100, 1000, 10000]) {
    const project = createProject(
      `Reference scene · ${count.toLocaleString('en')} nodes`,
      () => crypto.randomUUID(),
      '2026-01-01T00:00:00.000Z',
    );
    const model = project.documents[0].pages[0],
      columns = Math.ceil(Math.sqrt(count));
    model.nodes = Array.from({ length: count }, (_, index) => ({
      id: crypto.randomUUID(),
      kind: 'rectangle',
      layerId: model.layers[0].id,
      geometry: {
        x: ((index % columns) - columns / 2) * 160,
        y: (Math.floor(index / columns) - columns / 2) * 96,
        width: 128,
        height: 56,
        rotation: 0,
      },
      content: { text: `Idea ${index + 1}` },
      metadata: {},
      assetIds: [],
      dataBindings: [],
      extensions: {},
    }));
    const start = performance.now();
    await page
      .getByRole('button', { name: 'Import .koxora', exact: true })
      .click();
    await page
      .getByRole('dialog')
      .getByLabel('Import .koxora', { exact: true })
      .setInputFiles({
        name: 'reference.koxora',
        mimeType: 'application/zip',
        buffer: Buffer.from(await exportProject(project)),
      });
    const canvas = page.getByRole('region', {
      name: 'Interactive canvas',
      exact: true,
    });
    await expect(canvas).toHaveAttribute('data-camera', /zoom/);
    const importToReadyMs = performance.now() - start;
    await page
      .getByRole('button', { name: 'Expand canvas', exact: true })
      .click();
    for (const view of ['detail', 'fit']) {
      if (view === 'fit')
        await page
          .getByRole('button', { name: 'Fit content', exact: true })
          .click();
      const timing = await canvas.evaluate(async (element) => {
        const gaps: number[] = [];
        const dispatch: number[] = [];
        let last = 0;
        for (let i = 0; i < 100; i++)
          await new Promise<void>((resolve) =>
            requestAnimationFrame((time) => {
              if (i > 10) gaps.push(time - last);
              last = time;
              const start = performance.now();
              element.dispatchEvent(
                new WheelEvent('wheel', {
                  deltaX: i % 2 ? -20 : 20,
                  deltaY: i % 2 ? -8 : 8,
                  cancelable: true,
                }),
              );
              dispatch.push(performance.now() - start);
              resolve();
            }),
          );
        const percentile = (values: number[], p: number) =>
          [...values].sort((a, b) => a - b)[
            Math.floor((values.length - 1) * p)
          ];
        return {
          frameGapMedianMs: percentile(gaps, 0.5),
          frameGapP95Ms: percentile(gaps, 0.95),
          inputDispatchP95Ms: percentile(dispatch, 0.95),
          renderedNodes: element.querySelectorAll('.scene-node').length,
          dpr: devicePixelRatio,
          userAgent: navigator.userAgent,
        };
      });
      results.push({ count, view, importToReadyMs, ...timing });
    }
    await page
      .getByRole('button', { name: 'Restore workspace', exact: true })
      .click();
    if (count === 100) {
      await page
        .getByRole('button', { name: 'Fit content', exact: true })
        .click();
      await page
        .getByRole('combobox', { name: 'Appearance', exact: true })
        .selectOption('dark');
      await expect(
        page.getByText('Saved on this device', { exact: true }),
      ).toBeVisible();
      if (process.env.KOXORA_CAPTURE) {
        mkdirSync('docs/design/screenshots/phase-2.2', { recursive: true });
        await page.screenshot({
          path: 'docs/design/screenshots/phase-2.2/canvas-dark.png',
          fullPage: true,
        });
        await page
          .getByRole('combobox', { name: 'Appearance', exact: true })
          .selectOption('light');
        await page.screenshot({
          path: 'docs/design/screenshots/phase-2.2/canvas-light.png',
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole('combobox', { name: 'Language', exact: true })
          .selectOption('de');
        await page.screenshot({
          path: 'docs/design/screenshots/phase-2.2/canvas-small-de.png',
          fullPage: true,
        });
        await page
          .getByRole('combobox', { name: 'Sprache', exact: true })
          .selectOption('en');
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
    }
    await expect(
      page.getByText('Saved on this device', { exact: true }),
    ).toBeVisible();
  }
  const output = {
    recordedAt: new Date().toISOString(),
    browserName,
    browserVersion: browser.version(),
    host: {
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model,
      logicalCpus: cpus().length,
    },
    viewport: { width: 1440, height: 1000 },
    note: 'Headless reference run, not a hardware or FPS guarantee. rAF gaps include scheduling and rendering; input dispatch excludes the deferred SVG render. Dense views cap previews at 1500 nodes and 1500 edges.',
    results,
  };
  mkdirSync('node_modules/.cache/koxora', { recursive: true });
  writeFileSync(
    'node_modules/.cache/koxora/canvas-performance.json',
    JSON.stringify(output, null, 2) + '\n',
  );
});
