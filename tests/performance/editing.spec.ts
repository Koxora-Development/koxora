import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, arch } from 'node:os';
import { createProject, exportProject } from '../../packages/project/src/index';
import {
  buildScene,
  transformScene,
  CommandHistory,
  DEFAULT_CONNECTION,
  CONNECTION_KEY,
} from '../../packages/editor-core/src/index';

test('measure representative editing previews and completed commands', async ({
  page,
  browser,
}) => {
  const results: unknown[] = [];
  const percentile = (values: number[], p: number) =>
    [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)];
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  for (const count of [100, 1000, 3000]) {
    const project = createProject(
      `Editing reference ${count}`,
      () => crypto.randomUUID(),
      '2026-10-23T00:00:00.000Z',
    );
    const document = project.documents[0],
      model = document.pages[0];
    document.styles = ['#ede9fe', '#cffafe', '#e0e7ff', '#f0fdf4'].map(
      (fill) => ({
        id: crypto.randomUUID(),
        properties: { fill },
        extensions: {},
      }),
    );
    model.nodes = Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(),
      kind:
        i % 3 === 0 ? 'rounded-rectangle' : i % 3 === 1 ? 'diamond' : 'ellipse',
      layerId: model.layers[0].id,
      geometry: {
        x: (i % 40) * 240 - 80,
        y: Math.floor(i / 40) * 160 - 40,
        width: 160,
        height: 80,
        rotation: i % 7 === 0 ? 15 : 0,
      },
      styleId: document.styles[i % 4].id,
      content: { text: `Step ${i + 1}` },
      metadata: {},
      assetIds: [],
      dataBindings: [],
      extensions: { 'org.example.optional': { preserve: true } },
    }));
    model.connections = model.nodes.flatMap((node, i) =>
      i % 2 || i + 1 === count
        ? []
        : [
            {
              id: crypto.randomUUID(),
              sourceId: node.id,
              targetId: model.nodes[i + 1].id,
              layerId: model.layers[0].id,
              relationType: 'connection',
              waypoints: [],
              extensions: {
                [CONNECTION_KEY]: {
                  version: 1,
                  ...DEFAULT_CONNECTION,
                  label: 'Next',
                },
              },
            },
          ],
    );
    const scene = buildScene(model, document.styles),
      timings: number[] = [];
    for (let i = 0; i < 110; i++) {
      const start = performance.now();
      const preview = transformScene(scene, model, {
        [model.nodes[0].id]: { ...model.nodes[0].geometry, x: i },
      });
      if (i >= 10) timings.push(performance.now() - start);
      expect(preview.nodes[1]).toBe(scene.nodes[1]);
    }
    const history = new CommandHistory();
    const start = performance.now();
    const changed = history.execute(
      project,
      document.id,
      model.id,
      {
        type: 'move',
        ids: [model.nodes[0].id],
        delta: { x: 24, y: 24 },
        spacing: 24,
        snap: true,
      },
      project.manifest.updatedAt,
    );
    const commandMs = performance.now() - start;
    const undoStart = performance.now();
    history.travel(
      changed,
      document.id,
      model.id,
      'undo',
      project.manifest.updatedAt,
    );
    const undoMs = performance.now() - undoStart;
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
    await canvas.scrollIntoViewIfNeeded();
    const browserTiming = await canvas.evaluate(async (el) => {
      el.setPointerCapture = () => {};
      el.hasPointerCapture = () => false;
      const box = el.getBoundingClientRect(),
        x = box.x + box.width / 2,
        y = box.y + box.height / 2;
      const send = (type: string, dx: number) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 91,
            pointerType: 'mouse',
            button: 0,
            clientX: x + dx,
            clientY: y + 20,
          }),
        );
      const gaps: number[] = [],
        dispatch: number[] = [];
      send('pointerdown', 0);
      let last = 0;
      const original = el.querySelectorAll('[data-node-id]')[1];
      for (let i = 0; i < 65; i++)
        await new Promise<void>((resolve) =>
          requestAnimationFrame((time) => {
            if (i > 5) gaps.push(time - last);
            last = time;
            const start = performance.now();
            send('pointermove', i);
            dispatch.push(performance.now() - start);
            resolve();
          }),
        );
      const retainedSvg = original === el.querySelectorAll('[data-node-id]')[1];
      const start = performance.now();
      send('pointerup', 65);
      const commitDispatchMs = performance.now() - start;
      const percentile = (values: number[], p: number) =>
        [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)];
      return {
        frameGapMedianMs: percentile(gaps, 0.5),
        frameGapP95Ms: percentile(gaps, 0.95),
        moveDispatchP95Ms: percentile(dispatch, 0.95),
        commitDispatchMs,
        retainedSvg,
        renderedNodes: el.querySelectorAll('[data-node-id]').length,
        dpr: devicePixelRatio,
      };
    });
    expect(browserTiming.retainedSvg).toBe(true);
    results.push({
      nodes: count,
      connections: model.connections.length,
      corePreviewMedianMs: percentile(timings, 0.5),
      corePreviewP95Ms: percentile(timings, 0.95),
      commandMs,
      undoMs,
      ...browserTiming,
    });
    await page
      .getByRole('button', { name: 'Save project', exact: true })
      .click();
    await expect(
      page.getByText('Saved on this device', { exact: true }),
    ).toBeVisible();
  }
  mkdirSync('docs/development/evidence/phase-2.4', { recursive: true });
  writeFileSync(
    'docs/development/evidence/phase-2.4/editing-performance.json',
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        platform: platform(),
        architecture: arch(),
        cpu: cpus()[0].model,
        browser: browser.version(),
        method:
          '110 core previews (10 warm-ups); one validated command/undo; 65 synthetic pointer frames on the actual SVG adapter, detail view. Shared host; excludes import/export and persistence from core timing.',
        results,
      },
      null,
      2,
    ) + '\n',
  );
});
