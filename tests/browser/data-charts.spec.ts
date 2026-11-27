import { expect, test, type Locator, type Page } from '@playwright/test';
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

async function startProject(page: Page, messages: Record<string, string>) {
  await page.goto('/');
  await page
    .locator('.start-actions')
    .getByRole('button', { name: messages['start.blank'], exact: true })
    .click();
  await saved(page, messages);
}

async function importData(
  data: Locator,
  messages: Record<string, string>,
  filename: string,
  csv: string,
) {
  await data.getByLabel(messages['data.file'], { exact: true }).setInputFiles({
    name: filename,
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

async function openChartChooser(page: Page, messages: Record<string, string>) {
  const name = messages['office.menu.insert'];
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name, exact: true })
    .press('Enter');
  await page
    .getByRole('menu', { name, exact: true })
    .getByRole('menuitem', { name: messages['chart.insert'], exact: true })
    .press('Enter');
  return page.getByRole('dialog', {
    name: messages['chart.insertTitle'],
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

test('inserting and double-clicking a chart retain dataset bindings through history and offline reopening', async ({
  page,
  context,
}) => {
  const messages = messagesFor('en');
  await page.setViewportSize({ width: 1440, height: 900 });
  await startProject(page, messages);
  const data = await openData(page, messages);
  await importData(
    data,
    messages,
    'sales.csv',
    'Region,Day,Amount\nNorth,2026-11-25,8\nWest,2026-11-23,\nEast,2026-11-24,12',
  );
  await expect(
    data.getByRole('button', { name: 'Create chart…', exact: true }),
  ).toHaveCount(0);
  await data
    .getByRole('button', { name: messages['office.close'], exact: true })
    .click();
  const chooser = await openChartChooser(page, messages);
  await expect(chooser.getByRole('combobox')).toHaveCount(1);
  await expect(
    chooser
      .getByRole('combobox', { name: messages['data.selected'], exact: true })
      .locator('option:checked'),
  ).toHaveText('sales');
  await expect(
    chooser.getByText('Line chart · Amount by Day', { exact: true }),
  ).toBeVisible();
  await chooser
    .getByRole('button', { name: messages['chart.insertConfirm'], exact: true })
    .press('Enter');
  await expect(chooser).toHaveCount(0);

  const canvas = page.getByRole('region', {
    name: messages['canvas.navigation'],
    exact: true,
  });
  const chart = canvas.locator('svg[data-chart]');
  const title = chart.locator('[data-chart-title]');
  await expect(chart).toHaveAttribute('data-chart', 'line');
  await expect(title).toHaveText('Amount by Day');
  await expect(chart.locator('[data-chart-category]')).toHaveText([
    '2026-11-25',
    '2026-11-23',
    '2026-11-24',
  ]);
  await expect(chart.locator('[data-chart-point]')).toHaveCount(2);
  await expect(chart.locator('[data-chart-point="1"]')).toHaveCount(0);

  await canvas.locator('[data-node-id] > .scene-node').dblclick();
  const edit = page.getByRole('dialog', {
    name: messages['chart.edit'],
    exact: true,
  });
  await edit
    .getByRole('combobox', { name: messages['chart.category'], exact: true })
    .selectOption({ label: 'Region' });
  await edit
    .getByRole('combobox', { name: messages['chart.type'], exact: true })
    .selectOption('column');
  await edit
    .getByRole('combobox', { name: messages['chart.palette'], exact: true })
    .selectOption('ocean');
  await edit
    .getByRole('textbox', { name: messages['chart.title'], exact: true })
    .fill('Regional sales');
  await edit
    .getByRole('button', { name: messages['chart.apply'], exact: true })
    .press('Enter');
  await expect(edit).toHaveCount(0);
  await expect(title).toHaveText('Regional sales');
  await expect(chart).toHaveAttribute('data-chart', 'column');
  await expect(chart).toHaveAttribute('data-chart-palette', 'ocean');
  await expect(chart.locator('[data-chart-category]')).toHaveText([
    'North',
    'West',
    'East',
  ]);
  await expect(chart.locator('[data-chart-column]')).toHaveCount(2);
  await expect(chart.locator('[data-chart-column="1"]')).toHaveCount(0);

  await page
    .getByRole('button', { name: messages['editing.undo'], exact: true })
    .press('Enter');
  await expect(title).toHaveText('Amount by Day');
  await expect(chart).toHaveAttribute('data-chart', 'line');
  await page
    .getByRole('button', { name: messages['editing.redo'], exact: true })
    .press('Enter');
  await expect(title).toHaveText('Regional sales');
  await expect(chart).toHaveAttribute('data-chart', 'column');

  await openData(page, messages);
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
    ['Region', 'Amount'].map((name) => ({
      datasetId: dataset.id,
      fieldId: dataset.fields.find((field) => field.name === name)!.id,
    })),
  );
  expect(node.extensions['org.koxora.chart']).toEqual({
    version: 1,
    type: 'column',
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
  await expect(title).toHaveText('Regional sales');
  await expect(chart).toHaveAttribute('data-chart-palette', 'ocean');
  const after = await archive(page, messages);
  expect(after.datasets).toEqual(before.datasets);
  expect(after.documents[0].pages[0].nodes).toEqual([node]);
});

test('pie shares follow stored data edits and area charts keep their typed dataset binding', async ({
  page,
}) => {
  const messages = messagesFor('en');
  await page.setViewportSize({ width: 1440, height: 900 });
  await startProject(page, messages);
  const data = await openData(page, messages);
  await importData(
    data,
    messages,
    'totals.csv',
    'Region,Amount\nNorth,10\nWest,45\nEast,\nNorth,5',
  );
  await data
    .getByRole('button', { name: messages['office.close'], exact: true })
    .click();
  const chooser = await openChartChooser(page, messages);
  await chooser
    .getByRole('button', { name: messages['chart.insertConfirm'], exact: true })
    .press('Enter');
  const canvas = page.getByRole('region', {
    name: messages['canvas.navigation'],
    exact: true,
  });
  const chart = canvas.locator('svg[data-chart]');
  await expect(chart).toHaveAttribute('data-chart', 'column');

  async function changeType(type: 'area' | 'pie') {
    await canvas.locator('[data-node-id] > .scene-node').dblclick();
    const edit = page.getByRole('dialog', {
      name: messages['chart.edit'],
      exact: true,
    });
    await edit
      .getByRole('combobox', { name: messages['chart.type'], exact: true })
      .selectOption(type);
    await edit
      .getByRole('button', { name: messages['chart.apply'], exact: true })
      .press('Enter');
    await expect(chart).toHaveAttribute('data-chart', type);
  }

  await changeType('pie');
  const labels = chart.locator('[data-chart-pie-label]');
  const shares = chart.locator('[data-chart-pie-share]');
  await expect(chart.locator('[data-chart-slice]')).toHaveCount(2);
  await expect(labels).toHaveText(['West', 'North']);
  await expect(shares).toHaveText(['75%', '25%']);

  async function editWest(from: string, to: string, checkInvalid = false) {
    await openData(page, messages);
    const row = data.getByRole('row').filter({
      has: page.getByRole('cell', { name: 'West', exact: true }),
    });
    const cell = row.getByRole('cell', { name: from, exact: true });
    await cell.press('Enter');
    const input = data.getByRole('textbox', {
      name: messages['data.cellValue'],
      exact: true,
    });
    const save = data.getByRole('button', {
      name: messages['data.cellSave'],
      exact: true,
    });
    if (checkInvalid) {
      await input.fill('invalid');
      await save.click();
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await data
        .getByRole('button', { name: messages['data.saved'], exact: true })
        .press('Escape');
      await expect(cell).toBeFocused();
      await expect(input).toHaveCount(0);
      await cell.press('Enter');
    }
    await input.fill(to);
    await save.click();
    await expect(input).toHaveCount(0);
    await expect(
      row.getByRole('cell', { name: to, exact: true }),
    ).toBeVisible();
    await data
      .getByRole('button', { name: messages['office.close'], exact: true })
      .click();
  }

  await editWest('45', '5', true);
  await expect(labels).toHaveText(['North', 'West']);
  await expect(shares).toHaveText(['75%', '25%']);
  await page
    .getByRole('button', { name: messages['editing.undo'], exact: true })
    .press('Enter');
  await expect(labels).toHaveText(['West', 'North']);
  await page
    .getByRole('button', { name: messages['editing.redo'], exact: true })
    .press('Enter');
  await expect(labels).toHaveText(['North', 'West']);

  await editWest('5', '-5');
  await expect(
    chart.locator('[data-chart-pie-status="negative"]'),
  ).toBeVisible();
  await expect(chart.locator('[data-chart-slice]')).toHaveCount(0);
  await changeType('area');
  await expect(chart.locator('[data-chart-area]')).toHaveCount(1);
  await expect(chart.locator('[data-chart-point="2"]')).toHaveCount(0);
  const stored = await archive(page, messages);
  expect(stored.manifest.requiredFeatures).toContain('data-chart-types-v2');
  const node = stored.documents[0].pages[0].nodes[0];
  expect(node.extensions['org.koxora.chart']).toMatchObject({
    version: 2,
    type: 'area',
  });
  expect(node.dataBindings.map(({ datasetId }) => datasetId)).toEqual([
    stored.datasets[0].id,
    stored.datasets[0].id,
  ]);
  expect(stored.datasets[0].rows[1][node.dataBindings[1].fieldId]).toBe(-5);
});

test('German chart insertion opens import when empty and uses the chosen dataset on a narrow screen', async ({
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
  await startProject(page, messages);
  const empty = await openChartChooser(page, messages);
  await expect(
    empty.getByText(messages['data.noDatasets'], { exact: true }),
  ).toBeVisible();
  await empty
    .getByRole('button', {
      name: messages['chart.openProjectData'],
      exact: true,
    })
    .press('Enter');
  const data = page.getByRole('dialog', {
    name: messages['data.title'],
    exact: true,
  });
  await importData(
    data,
    messages,
    'regionen.csv',
    'Region,Wert\nNord,8\nSüd,12',
  );
  await data
    .getByRole('button', { name: messages['data.newImport'], exact: true })
    .click();
  const csv = [
    'Tag,Wert',
    ...Array.from({ length: 101 }, (_, i) => `2026-11-25,${i + 1}`),
  ].join('\n');
  await importData(data, messages, 'tage.csv', csv);
  await data
    .getByRole('button', { name: messages['office.close'], exact: true })
    .click();

  const chooser = await openChartChooser(page, messages);
  const datasets = chooser.getByRole('combobox', {
    name: messages['data.selected'],
    exact: true,
  });
  await expect(datasets.locator('option')).toHaveCount(2);
  await datasets.selectOption({ label: 'regionen' });
  await expect(
    chooser.getByText('Säulendiagramm · Wert nach Region', { exact: true }),
  ).toBeVisible();
  await datasets.selectOption({ label: 'tage' });
  await expect(
    chooser.getByText('Liniendiagramm · Wert nach Tag', { exact: true }),
  ).toBeVisible();
  await chooser
    .getByRole('button', { name: messages['chart.insertConfirm'], exact: true })
    .press('Enter');
  const chart = page.locator('svg[data-chart="line"]');
  await expect(chart.locator('[data-chart-title]')).toHaveText('Wert nach Tag');
  await expect(chart.locator('[data-chart-point]')).toHaveCount(100);
  const preview = messages['data.chartPreviewRows']
    .replace('{shown}', '100')
    .replace('{total}', '101');
  await expect(chart.locator('[data-chart-preview]')).toHaveText(preview);
});
