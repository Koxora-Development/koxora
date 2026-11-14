import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
  type Project,
} from '../../packages/project/src/index';
import {
  applyEdit,
  TEXT_REGIONS_KEY,
} from '../../packages/editor-core/src/index';

async function saved(page: Page) {
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
}
async function exported(page: Page) {
  await saved(page);
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
}
function node(project: Project) {
  return project.documents[0].pages[0].nodes[0];
}
async function openElement(page: Page, kind: 'container' | 'table') {
  const now = '2026-11-14T12:00:00.000Z';
  const id = () => crypto.randomUUID();
  let project = createProject('Text region review', id, now);
  const document = project.documents[0],
    sheet = document.pages[0];
  const nodeId = id();
  project = applyEdit(
    project,
    document.id,
    sheet.id,
    {
      type: 'insert',
      id: nodeId,
      layerId: sheet.layers[0].id,
      kind,
      position: { x: 0, y: 0 },
      text: kind === 'container' ? 'Existing body' : '',
    },
    now,
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Import .koxora', { exact: true })
    .setInputFiles({
      name: 'regions.koxora',
      mimeType: 'application/zip',
      buffer: Buffer.from(await exportProject(project)),
    });
  await saved(page);
  const rendered = page.locator(`[data-node-id="${nodeId}"]`);
  await rendered.dblclick();
  const panel = page.getByRole('complementary', {
    name: 'Properties',
    exact: true,
  });
  await expect(
    panel.getByRole('tab', { name: 'Text', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  return { panel, rendered, project, nodeId };
}
async function reachable(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  expect(
    await locator.evaluate((element) => {
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

test('container title and rich body remain separate through editing, duplication, history and native reopening', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { panel, rendered } = await openElement(page, 'container');
  await panel
    .getByRole('textbox', { name: 'Container title', exact: true })
    .fill('Project overview');
  const body = panel.getByRole('textbox', {
    name: 'Label / text',
    exact: true,
  });
  await expect(body).toContainText('Existing body');
  await body.fill('Independent body 世界');
  await body.press('Control+a');
  await body.press('Control+b');
  await panel
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(rendered.locator('[data-text-region="title"]')).toHaveText(
    'Project overview',
  );
  await expect(rendered).toContainText('Independent body 世界');
  const first = await exported(page);
  expect(node(first).content.text).toBe('Independent body 世界');
  expect(node(first).extensions[TEXT_REGIONS_KEY]).toMatchObject({
    type: 'container',
    title: 'Project overview',
  });
  expect(node(first).extensions['org.koxora.rich-text']).toBeDefined();
  expect(first.manifest.requiredFeatures).toContain('element-text-regions-v1');
  await page
    .getByRole('region', { name: 'Interactive canvas', exact: true })
    .focus();
  await page.keyboard.press('Control+d');
  await expect(page.locator('[data-node-id]')).toHaveCount(2);
  const duplicate = await exported(page);
  expect(
    duplicate.documents[0].pages[0].nodes[1].extensions[TEXT_REGIONS_KEY],
  ).toEqual(node(first).extensions[TEXT_REGIONS_KEY]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-node-id]')).toHaveCount(1);
  await saved(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          {
            once: true,
          },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  expect((await exported(page)).documents).toEqual(first.documents);
});

test('table cells are independent, portable and copied as one ordinary element with atomic undo and redo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { panel, rendered } = await openElement(page, 'table');
  await expect(
    panel.getByRole('textbox', { name: /^Row \d+, column \d+$/ }),
  ).toHaveCount(9);
  await panel
    .getByRole('textbox', { name: 'Row 1, column 1', exact: true })
    .fill('Name');
  await panel
    .getByRole('textbox', { name: 'Row 1, column 2', exact: true })
    .fill('Role');
  await panel
    .getByRole('textbox', { name: 'Row 2, column 1', exact: true })
    .fill('Ada 世界');
  await panel
    .getByRole('textbox', { name: 'Row 2, column 2', exact: true })
    .fill('Lead\nReviewer');
  await panel
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  await expect(rendered.locator('[data-text-region="cell-0-0"]')).toHaveText(
    'Name',
  );
  await expect(rendered.locator('[data-text-region="cell-1-0"]')).toHaveText(
    'Ada 世界',
  );
  const first = await exported(page);
  expect(node(first).extensions[TEXT_REGIONS_KEY]).toEqual({
    version: 1,
    type: 'table',
    headerRow: true,
    cells: [
      ['Name', 'Role', ''],
      ['Ada 世界', 'Lead\nReviewer', ''],
      ['', '', ''],
    ],
  });
  expect(first.manifest.requiredFeatures).toContain('element-text-regions-v1');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(node(await exported(page)).extensions[TEXT_REGIONS_KEY]).toMatchObject(
    {
      cells: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
    },
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(node(await exported(page)).extensions[TEXT_REGIONS_KEY]).toEqual(
    node(first).extensions[TEXT_REGIONS_KEY],
  );
  await rendered.click();
  await page
    .getByRole('region', { name: 'Interactive canvas', exact: true })
    .focus();
  await page.keyboard.press('Control+d');
  await expect(page.locator('[data-node-id]')).toHaveCount(2);
  const copied = await exported(page);
  expect(
    copied.documents[0].pages[0].nodes[1].extensions[TEXT_REGIONS_KEY],
  ).toEqual(node(first).extensions[TEXT_REGIONS_KEY]);
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  expect((await exported(page)).documents).toEqual(copied.documents);
});

test('reducing a table preserves cells on cancel and can undo an explicitly confirmed shrink', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { panel } = await openElement(page, 'table');
  await panel
    .getByRole('textbox', { name: 'Row 3, column 3', exact: true })
    .fill('Keep this cell');
  await panel
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  const before = await exported(page);
  await panel
    .getByRole('combobox', { name: 'Rows', exact: true })
    .selectOption('2');
  const confirmation = page.getByRole('dialog', {
    name: 'Reduce table size',
    exact: true,
  });
  await confirmation
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(
    panel.getByRole('combobox', { name: 'Rows', exact: true }),
  ).toHaveValue('3');
  await expect(
    panel.getByRole('textbox', { name: 'Row 3, column 3', exact: true }),
  ).toHaveValue('Keep this cell');
  await panel
    .getByRole('combobox', { name: 'Rows', exact: true })
    .selectOption('2');
  await confirmation
    .getByRole('button', { name: 'Remove cells', exact: true })
    .click();
  await expect(
    panel.getByRole('textbox', { name: /^Row \d+, column \d+$/ }),
  ).toHaveCount(6);
  await panel
    .getByRole('button', { name: 'Apply changes', exact: true })
    .click();
  expect(node(await exported(page)).extensions[TEXT_REGIONS_KEY]).toMatchObject(
    {
      cells: [
        ['', '', ''],
        ['', '', ''],
      ],
    },
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await exported(page)).documents).toEqual(before.documents);
});

for (const locale of ['en', 'de']) {
  test(`table insertion, independent cells and controls stay reachable at 390px and 200% in ${locale}`, async ({
    page,
  }) => {
    const messages: Record<string, string> = JSON.parse(
      readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
    );
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'koxora.preferences.v1',
          JSON.stringify({
            locale: language,
            theme: 'dark',
            guiScale: 200,
            accessibility: true,
          }),
        ),
      locale,
    );
    await page.setViewportSize({ width: 390, height: 600 });
    await page.goto('/');
    await page
      .getByRole('button', { name: messages['project.create'], exact: true })
      .click();
    const search = page.getByRole('searchbox', {
      name: messages['palette.search'],
      exact: true,
    });
    await reachable(search);
    await search.fill('table');
    const tool = page
      .getByRole('toolbar', { name: messages['diagram.tools'], exact: true })
      .getByRole('button', { name: messages['shape.table'], exact: true });
    await reachable(tool);
    await tool.click();
    const canvas = page.locator('.interactive-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('[data-node-id]')).toHaveCount(1);
    await page.locator('[data-node-id]').dblclick();
    const panel = page.getByRole('complementary', {
      name: messages['office.properties'],
      exact: true,
    });
    const first = panel.getByRole('textbox', {
      name: messages['regions.cellLabel']
        .replace('{row}', '1')
        .replace('{column}', '1'),
      exact: true,
    });
    const last = panel.getByRole('textbox', {
      name: messages['regions.cellLabel']
        .replace('{row}', '3')
        .replace('{column}', '3'),
      exact: true,
    });
    await reachable(first);
    await first.fill('Header');
    await reachable(last);
    await last.fill('Last cell Ω');
    const widths = await panel
      .locator('.office-property-form')
      .evaluate((form) => ({
        form: form.getBoundingClientRect().width,
        tab: form.querySelector('[data-property-tab]')!.getBoundingClientRect()
          .width,
        cells: form.querySelector('.table-cell-scroll')!.getBoundingClientRect()
          .width,
        innerScrollable:
          form.querySelector('.table-cell-scroll')!.scrollWidth >
          form.querySelector('.table-cell-scroll')!.clientWidth,
      }));
    expect(widths.tab).toBeLessThanOrEqual(widths.form);
    expect(widths.cells).toBeLessThanOrEqual(widths.form);
    expect(widths.innerScrollable).toBe(true);
    const apply = panel.getByRole('button', {
      name: messages['diagram.apply'],
      exact: true,
    });
    await reachable(apply);
    await apply.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('[data-text-region="cell-2-2"]')).toContainText(
      'Last cell Ω',
    );
  });
}
