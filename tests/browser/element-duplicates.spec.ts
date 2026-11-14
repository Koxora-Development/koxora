import { expect, test, type Page } from '@playwright/test';
import {
  createProject,
  exportProject,
  type Project,
} from '../../packages/project/src/index';
import {
  applyEdit,
  containerHeaderHeight,
  ELEMENT_KEY,
  shapeKinds,
  TEXT_REGIONS_KEY,
  type ShapeKind,
} from '../../packages/editor-core/src/index';

const now = '2026-11-14T12:00:00.000Z';

function elements(kinds: readonly ShapeKind[], width: number, height: number) {
  let project = createProject(
    'Rendered element audit',
    () => crypto.randomUUID(),
    now,
  );
  const workbook = project.documents[0],
    sheet = workbook.pages[0];
  for (const kind of kinds)
    project = applyEdit(
      project,
      workbook.id,
      sheet.id,
      {
        type: 'insert',
        id: crypto.randomUUID(),
        kind,
        position: { x: 0, y: 0 },
        geometry: { x: 0, y: 0, width, height, rotation: 0 },
        layerId: sheet.layers[0].id,
        text: '',
      },
      now,
    );
  return project;
}

async function open(page: Page, project: Project) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'render-audit.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
  await expect(page.locator('[data-node-id]')).toHaveCount(
    project.documents[0].pages[0].nodes.length,
  );
}

for (const { width, height, radius } of [
  { width: 26, height: 22, radius: 5 },
  { width: 160, height: 100, radius: 16 },
  { width: 320, height: 240, radius: 16 },
]) {
  test(`all registered elements have distinct rendered pixels at ${width}×${height}`, async ({
    page,
  }) => {
    let project = elements(shapeKinds, width, height);
    const workbook = project.documents[0],
      sheet = workbook.pages[0];
    project = applyEdit(
      project,
      workbook.id,
      sheet.id,
      {
        type: 'format',
        ids: sheet.nodes.map((node) => node.id),
        patch: { cornerRadius: radius },
      },
      now,
    );
    await open(page, project);
    // Rasterize the real SvgRenderer output rather than comparing path strings.
    // Equal blank labels prevent names from hiding otherwise identical symbols.
    const pixels = await page.evaluate(
      async ({ nodes, width, height }) => {
        const result: { kind: string; hash: string; painted: number }[] = [];
        for (const node of nodes) {
          const group = document.querySelector(`[data-node-id="${node.id}"]`)!;
          const svg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg',
          );
          const padding = 12;
          svg.setAttribute('width', String(width + padding * 2));
          svg.setAttribute('height', String(height + padding * 2));
          svg.setAttribute(
            'viewBox',
            `${-padding} ${-padding} ${width + padding * 2} ${height + padding * 2}`,
          );
          svg.append(group.cloneNode(true));
          const url = URL.createObjectURL(
            new Blob([new XMLSerializer().serializeToString(svg)], {
              type: 'image/svg+xml',
            }),
          );
          const image = new Image();
          try {
            await new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () =>
                reject(new Error(`Cannot rasterize ${node.kind}`));
              image.src = url;
            });
            const canvas = document.createElement('canvas');
            canvas.width = width + padding * 2;
            canvas.height = height + padding * 2;
            const context = canvas.getContext('2d')!;
            context.drawImage(image, 0, 0);
            const rgba = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            ).data;
            let painted = 0;
            for (let i = 3; i < rgba.length; i += 4)
              if (rgba[i] !== 0) painted++;
            const hash = Array.from(
              new Uint8Array(await crypto.subtle.digest('SHA-256', rgba)),
              (byte) => byte.toString(16).padStart(2, '0'),
            ).join('');
            result.push({ kind: node.kind, hash, painted });
          } finally {
            URL.revokeObjectURL(url);
          }
        }
        return result;
      },
      {
        nodes: project.documents[0].pages[0].nodes.map(({ id, kind }) => ({
          id,
          kind,
        })),
        width,
        height,
      },
    );
    expect(pixels.map(({ kind }) => kind)).toEqual([...shapeKinds]);
    expect(pixels.find(({ kind }) => kind === 'text')!.painted).toBe(0);
    for (const rendered of pixels.filter(({ kind }) => kind !== 'text'))
      expect(
        rendered.painted,
        `${rendered.kind} should render its geometry`,
      ).toBeGreaterThan(0);
    const identical: string[][] = [];
    for (let first = 0; first < pixels.length; first++)
      for (let second = first + 1; second < pixels.length; second++)
        if (pixels[first].hash === pixels[second].hash)
          identical.push([pixels[first].kind, pixels[second].kind]);
    expect(
      identical,
      'Different element names must not conceal identical rendered symbols',
    ).toEqual([]);
  });
}

test('structured element text names use authoritative regions and plain container content cannot paint its header', async ({
  page,
}) => {
  const project = elements(['container', 'container', 'table'], 160, 100);
  const [largeBody, titleOnly, table] = project.documents[0].pages[0].nodes;
  largeBody.geometry.x = -240;
  largeBody.content.text = 'MMMMMMMMMMMMMMMMMMMM';
  largeBody.extensions[ELEMENT_KEY] = {
    version: 1,
    style: { fontSize: 96, fontWeight: 700 },
  };
  titleOnly.content.text = '';
  titleOnly.extensions[TEXT_REGIONS_KEY] = {
    version: 1,
    type: 'container',
    title: 'Section title',
  };
  table.geometry.x = 240;
  table.content.text = 'STALE TABLE FALLBACK';
  table.extensions[TEXT_REGIONS_KEY] = {
    version: 1,
    type: 'table',
    headerRow: true,
    cells: [['Actual cell', 'Current data']],
  };
  await open(page, project);
  const body = page.locator(`[data-node-id="${largeBody.id}"]`);
  // Compare the header's actual pixels with the same rendered node minus its body.
  const headers = await body.evaluate(async (node, header) => {
    const raster = async (hideBody: boolean) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '160');
      svg.setAttribute('height', String(header));
      svg.setAttribute('viewBox', `0 0 160 ${header}`);
      const copy = node.cloneNode(true) as SVGElement;
      copy.setAttribute('transform', '');
      if (hideBody)
        copy
          .querySelectorAll('text:not([data-text-region])')
          .forEach((text) => text.remove());
      svg.append(copy);
      const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(svg)], {
          type: 'image/svg+xml',
        }),
      );
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () =>
            reject(new Error('Cannot rasterize container header'));
          image.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = header;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return canvas.toDataURL();
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    return [await raster(false), await raster(true)];
  }, containerHeaderHeight(largeBody.geometry.height));
  expect(headers[0]).toBe(headers[1]);
  await expect(
    page.locator(`[data-node-id="${titleOnly.id}"] > title`),
  ).toHaveText('Section title');
  await expect(page.locator(`[data-node-id="${table.id}"] > title`)).toHaveText(
    'Actual cell\tCurrent data',
  );
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  const tablePorts = page.locator(`[data-port-node="${table.id}"]`);
  const titlePorts = page.locator(`[data-port-node="${titleOnly.id}"]`);
  await expect(tablePorts).toHaveCount(4);
  await expect(titlePorts).toHaveCount(4);
  for (const port of await tablePorts.all()) {
    await expect(port).toHaveAttribute(
      'aria-label',
      /Actual cell\s+Current data:/,
    );
    await expect(port).not.toHaveAttribute('aria-label', /STALE/);
  }
  for (const port of await titlePorts.all())
    await expect(port).toHaveAttribute('aria-label', /^Section title:/);
});
