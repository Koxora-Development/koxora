import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { importProject } from '../../packages/project/src/index';

function messagesFor(locale: 'en' | 'de'): Record<string, string> {
  return JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
}

async function saved(page: Page, messages: Record<string, string>) {
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
}

async function openData(page: Page, messages: Record<string, string>) {
  const name = messages['office.menu.file'];
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name, exact: true })
    .press('Enter');
  await page
    .getByRole('menu', { name, exact: true })
    .getByRole('menuitem', { name: messages['data.menu'], exact: true })
    .press('Enter');
  return page.getByRole('dialog', {
    name: messages['data.title'],
    exact: true,
  });
}

async function importData(
  page: Page,
  messages: Record<string, string>,
  csv: string,
) {
  await page.goto('/');
  await page
    .locator('.start-actions')
    .getByRole('button', { name: messages['start.blank'], exact: true })
    .click();
  await saved(page, messages);
  const data = await openData(page, messages);
  await data.getByLabel(messages['data.file'], { exact: true }).setInputFiles({
    name: 'sales.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await data
    .getByRole('button', { name: messages['data.import'], exact: true })
    .click();
  await expect(
    data.getByRole('combobox', {
      name: messages['data.selected'],
      exact: true,
    }),
  ).toBeVisible();
}

async function createChart(page: Page, messages: Record<string, string>) {
  await page
    .getByRole('dialog', { name: messages['data.title'], exact: true })
    .getByRole('button', { name: messages['chart.create'], exact: true })
    .press('Enter');
  return page.getByRole('dialog', {
    name: messages['chart.create'],
    exact: true,
  });
}

async function archive(page: Page, messages: Record<string, string>) {
  await saved(page, messages);
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: messages['project.export'], exact: true })
    .click();
  return importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
}

test('chart creation and editing retain dataset bindings through history and offline reopening', async ({
  page,
  context,
}) => {
  const messages = messagesFor('en');
  await page.setViewportSize({ width: 1440, height: 900 });
  await importData(
    page,
    messages,
    'Region,Day,Amount\nNorth,2026-11-25,8\nWest,2026-11-23,\nEast,2026-11-24,12',
  );
  const create = await createChart(page, messages);
  await create
    .getByRole('combobox', { name: messages['chart.category'], exact: true })
    .selectOption({ label: 'Region' });
  await expect(
    create.getByRole('combobox', { name: messages['chart.type'], exact: true }),
  ).toHaveValue('column');
  await create
    .getByRole('textbox', { name: messages['chart.title'], exact: true })
    .fill('Regional sales');
  await create
    .getByRole('button', { name: messages['chart.confirm'], exact: true })
    .press('Enter');
  await expect(create).toHaveCount(0);

  const canvas = page.getByRole('region', {
    name: messages['canvas.navigation'],
    exact: true,
  });
  const chart = canvas.locator('svg[data-chart]');
  const title = chart.locator('[data-chart-title]');
  await expect(chart).toHaveAttribute('data-chart', 'column');
  await expect(title).toHaveText('Regional sales');
  await expect(chart.locator('[data-chart-category]')).toHaveText([
    'North',
    'West',
    'East',
  ]);
  await expect(chart.locator('[data-chart-column]')).toHaveCount(2);
  await expect(chart.locator('[data-chart-column="1"]')).toHaveCount(0);

  await canvas.press('ControlOrMeta+a');
  await canvas.press('Shift+F10');
  await page
    .getByRole('menuitem', { name: messages['chart.edit'], exact: true })
    .press('Enter');
  const edit = page.getByRole('dialog', {
    name: messages['chart.edit'],
    exact: true,
  });
  await edit
    .getByRole('combobox', { name: messages['chart.category'], exact: true })
    .selectOption({ label: 'Day' });
  await edit
    .getByRole('combobox', { name: messages['chart.type'], exact: true })
    .selectOption('line');
  await edit
    .getByRole('combobox', { name: messages['chart.palette'], exact: true })
    .selectOption('ocean');
  await edit
    .getByRole('textbox', { name: messages['chart.title'], exact: true })
    .fill('Daily sales');
  await edit
    .getByRole('button', { name: messages['chart.apply'], exact: true })
    .press('Enter');
  await expect(edit).toHaveCount(0);
  await expect(title).toHaveText('Daily sales');
  await expect(chart).toHaveAttribute('data-chart', 'line');
  await expect(chart).toHaveAttribute('data-chart-palette', 'ocean');
  await expect(chart.locator('[data-chart-category]')).toHaveText([
    '2026-11-25',
    '2026-11-23',
    '2026-11-24',
  ]);
  await expect(chart.locator('[data-chart-point]')).toHaveCount(2);
  await expect(chart.locator('[data-chart-point="1"]')).toHaveCount(0);

  await page
    .getByRole('button', { name: messages['editing.undo'], exact: true })
    .press('Enter');
  await expect(title).toHaveText('Regional sales');
  await expect(chart).toHaveAttribute('data-chart', 'column');
  await page
    .getByRole('button', { name: messages['editing.redo'], exact: true })
    .press('Enter');
  await expect(title).toHaveText('Daily sales');
  await expect(chart).toHaveAttribute('data-chart', 'line');

  const data = await openData(page, messages);
  await data
    .getByRole('button', { name: messages['data.remove'], exact: true })
    .click();
  await data
    .getByRole('button', { name: messages['data.confirmRemove'], exact: true })
    .click();
  await expect(data.getByRole('alert')).toHaveText(
    messages['data.error.inUse'],
  );
  await data
    .getByRole('button', { name: messages['office.close'], exact: true })
    .click();

  const before = await archive(page, messages);
  expect(before.manifest.requiredFeatures).toContain('data-charts-v1');
  expect(before.datasets).toHaveLength(1);
  const [dataset] = before.datasets;
  const node = before.documents[0].pages[0].nodes[0];
  expect(node.kind).toBe('data-chart');
  expect(node.dataBindings).toEqual(
    ['Day', 'Amount'].map((name) => ({
      datasetId: dataset.id,
      fieldId: dataset.fields.find((field) => field.name === name)!.id,
    })),
  );
  expect(node.extensions['org.koxora.chart']).toEqual({
    version: 1,
    type: 'line',
    palette: 'ocean',
  });

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole('button', { name: messages['project.open'], exact: true })
    .click();
  await expect(title).toHaveText('Daily sales');
  await expect(chart).toHaveAttribute('data-chart-palette', 'ocean');
  const after = await archive(page, messages);
  expect(after.datasets).toEqual(before.datasets);
  expect(after.documents[0].pages[0].nodes).toEqual([node]);
});

test('German chart creation suggests a line from dates and bounds the rendered row count on a narrow screen', async ({
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
  const csv = [
    'Tag,Wert',
    ...Array.from({ length: 101 }, (_, i) => `2026-11-25,${i + 1}`),
  ].join('\n');
  await importData(page, messages, csv);
  const create = await createChart(page, messages);
  await expect(
    create.getByRole('combobox', { name: messages['chart.type'], exact: true }),
  ).toHaveValue('line');
  await expect(
    create.getByRole('textbox', { name: messages['chart.title'], exact: true }),
  ).toHaveValue('Wert nach Tag');
  const preview = messages['data.chartPreviewRows']
    .replace('{shown}', '100')
    .replace('{total}', '101');
  await expect(create.getByText(preview, { exact: true })).toBeVisible();
  await create
    .getByRole('button', { name: messages['chart.confirm'], exact: true })
    .press('Enter');
  const chart = page.locator('svg[data-chart="line"]');
  await expect(chart.locator('[data-chart-point]')).toHaveCount(100);
  await expect(chart.locator('[data-chart-preview]')).toHaveText(preview);
});
