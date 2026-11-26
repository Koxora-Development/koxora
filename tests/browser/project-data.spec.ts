import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { importProject } from '../../packages/project/src/index';

function messagesFor(locale: 'en' | 'de'): Record<string, string> {
  return JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
}

function saved(page: Page, messages: Record<string, string>) {
  return expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
}

async function openData(page: Page, messages: Record<string, string>) {
  const file = messages['office.menu.file'];
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: file, exact: true })
    .press('Enter');
  await page
    .getByRole('menu', { name: file, exact: true })
    .getByRole('menuitem', { name: messages['data.menu'], exact: true })
    .press('Enter');
  const dialog = page.getByRole('dialog', {
    name: messages['data.title'],
    exact: true,
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function exportArchive(page: Page, messages: Record<string, string>) {
  await saved(page, messages);
  const pending = page.waitForEvent('download');
  const exportButton = page.getByRole('button', {
    name: messages['project.export'],
    exact: true,
  });
  await exportButton.click();
  const bytes = readFileSync((await (await pending).path())!);
  const project = await importProject(new Uint8Array(bytes));
  await expect(exportButton).toBeEnabled();
  return { bytes, project };
}

test('CSV import infers types, preserves overridden source text and round-trips project data', async ({
  page,
  browser,
  baseURL,
}) => {
  const messages = messagesFor('en');
  await page.goto('/');
  await page
    .locator('.start-actions')
    .getByRole('button', { name: messages['start.blank'], exact: true })
    .click();
  await saved(page, messages);

  const dialog = await openData(page, messages);
  const data = [
    '\ufeffID;Amount;Raw amount;Active;Day;Note',
    '001;12,50;12,50;true;2026-01-02;"Überblick\nneeds; review"',
    '002;-4,25;-4,25;false;2026-01-03;"quote ""inside"""',
  ].join('\r\n');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    dialog
      .getByRole('button', { name: messages['data.chooseFile'], exact: true })
      .click(),
  ]);
  await chooser.setFiles({
    name: 'transactions.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(data),
  });
  const rawAmount = dialog.getByRole('combobox', {
    name: messages['data.columnType'].replace('{name}', 'Raw amount'),
    exact: true,
  });
  await expect(rawAmount).toHaveValue('number');
  await rawAmount.selectOption('string');
  const datasetName = 'Reviewed transactions';
  await dialog
    .getByRole('textbox', { name: messages['data.name'], exact: true })
    .fill(datasetName);
  await dialog
    .getByRole('button', { name: messages['data.import'], exact: true })
    .click();
  await expect(
    dialog.getByRole('cell', { name: '001', exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: messages['office.close'], exact: true })
    .click();

  await page
    .getByRole('button', { name: messages['editing.undo'], exact: true })
    .press('Enter');
  expect((await exportArchive(page, messages)).project.datasets).toEqual([]);
  await page
    .getByRole('button', { name: messages['editing.redo'], exact: true })
    .press('Enter');
  const archive = await exportArchive(page, messages);
  expect(archive.project.datasets).toHaveLength(1);
  const [dataset] = archive.project.datasets;
  expect(dataset.title).toBe(datasetName);
  expect(dataset.fields.map(({ name, type }) => [name, type])).toEqual([
    ['ID', 'string'],
    ['Amount', 'number'],
    ['Raw amount', 'string'],
    ['Active', 'boolean'],
    ['Day', 'date'],
    ['Note', 'string'],
  ]);
  expect(
    dataset.rows.map((row) => dataset.fields.map(({ id }) => row[id])),
  ).toEqual([
    ['001', 12.5, '12,50', true, '2026-01-02', 'Überblick\nneeds; review'],
    ['002', -4.25, '-4,25', false, '2026-01-03', 'quote "inside"'],
  ]);

  const context = await browser.newContext({ baseURL });
  try {
    const fresh = await context.newPage();
    await fresh.goto('/');
    await fresh
      .getByRole('button', { name: messages['project.import'], exact: true })
      .click();
    await fresh
      .getByRole('dialog')
      .getByLabel(messages['project.import'], { exact: true })
      .setInputFiles({
        name: 'data.koxora',
        mimeType: 'application/zip',
        buffer: archive.bytes,
      });
    await saved(fresh, messages);
    const recovered = await openData(fresh, messages);
    const activeDataset = recovered.getByRole('combobox', {
      name: messages['data.selected'],
      exact: true,
    });
    await expect(activeDataset.locator('option:checked')).toHaveText(
      datasetName,
    );
    await expect(
      recovered.getByRole('cell', { name: '12,50', exact: true }),
    ).toBeVisible();
    await recovered
      .getByRole('button', { name: messages['data.remove'], exact: true })
      .click();
    await expect(activeDataset.locator('option:checked')).toHaveText(
      datasetName,
    );
    await recovered
      .getByRole('button', {
        name: messages['data.confirmRemove'],
        exact: true,
      })
      .click();
    await recovered
      .getByRole('button', { name: messages['office.close'], exact: true })
      .click();
    expect((await exportArchive(fresh, messages)).project.datasets).toEqual([]);
  } finally {
    await context.close();
  }
});

test('German TSV import rejects malformed data and closing a corrected preview leaves the project unchanged', async ({
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
  await page.goto('/');
  await page
    .locator('.start-actions')
    .getByRole('button', { name: messages['start.blank'], exact: true })
    .click();
  await saved(page, messages);

  const dialog = await openData(page, messages);
  const file = dialog.getByLabel(messages['data.file'], { exact: true });
  const delimiter = dialog.getByRole('combobox', {
    name: messages['data.delimiter'],
    exact: true,
  });
  await file.setInputFiles({
    name: 'invalid.tsv',
    mimeType: 'text/tab-separated-values',
    buffer: Buffer.from('Region\tAnzahl\n"Ende fehlt\t1'),
  });
  await delimiter.selectOption('\t');
  await expect(dialog.getByRole('alert')).toBeVisible();
  const importButton = dialog.getByRole('button', {
    name: messages['data.import'],
    exact: true,
  });
  await expect(importButton).toBeDisabled();

  const header = dialog.getByRole('checkbox', {
    name: messages['data.header'],
    exact: true,
  });
  await file.setInputFiles({
    name: 'long-header.tsv',
    mimeType: 'text/tab-separated-values',
    buffer: Buffer.from(`${'X'.repeat(4097)}\tAnzahl\nNord\t1`),
  });
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(importButton).toBeDisabled();
  await header.uncheck();
  await expect(importButton).toBeEnabled();

  await file.setInputFiles({
    name: 'regions.tsv',
    mimeType: 'text/tab-separated-values',
    buffer: Buffer.from('Nord\t1\nSüd\t2'),
  });
  await header.uncheck();
  await expect(
    dialog.getByRole('cell', { name: 'Nord', exact: true }),
  ).toBeVisible();
  await expect(importButton).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect((await exportArchive(page, messages)).project.datasets).toEqual([]);
});
