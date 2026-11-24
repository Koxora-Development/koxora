import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { importProject } from '../../packages/project/src/index';

async function openProject(page: Page, locale: 'en' | 'de', width: number) {
  const messages: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  await page.addInitScript((language) => {
    localStorage.setItem(
      'koxora.preferences.v1',
      JSON.stringify({ locale: language }),
    );
    localStorage.setItem(
      'koxora.element-libraries.v1',
      JSON.stringify({ version: 1, selected: ['basic'] }),
    );
  }, locale);
  await page.setViewportSize({ width, height: 840 });
  await page.goto('/');
  await page
    .locator('.start-actions')
    .getByRole('button', { name: messages['start.blank'], exact: true })
    .click();
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
  const canvas = page.getByRole('region', {
    name: messages['canvas.navigation'],
    exact: true,
  });
  const name = messages['office.menu.insert'];
  const insert = page
    .getByRole('menubar')
    .getByRole('menuitem', { name, exact: true });
  const menu = page.getByRole('menu', { name, exact: true });
  const choose = (key: string) =>
    menu.getByRole('menuitem', { name: messages[key], exact: true });
  return { messages, canvas, insert, menu, choose };
}

async function archivedNodeKinds(page: Page, messages: Record<string, string>) {
  await expect(page.locator('.save-status')).toHaveText(
    messages['project.saved'],
  );
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: messages['project.export'], exact: true })
    .click();
  const archive = await importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
  return archive.documents[0].pages[0].nodes.map((node) => node.kind);
}

test('compact Insert chooses a shape outside the enabled libraries without changing the ribbon preferences', async ({
  page,
}) => {
  const { messages, canvas, insert, menu, choose } = await openProject(
    page,
    'en',
    1440,
  );
  await insert.press('Enter');
  await expect(menu.getByRole('menuitem')).toHaveText([
    'Shapes and symbols…',
    'Text',
    'Table',
    'Connections…',
    'Freehand pen',
  ]);
  await expect(menu.getByRole('separator')).toHaveCount(1);
  const dialog = page.getByRole('dialog', {
    name: messages['palette.fullCatalogTitle'],
    exact: true,
  });
  const search = dialog.getByRole('searchbox', {
    name: messages['palette.search'],
    exact: true,
  });
  const library = dialog.getByRole('combobox', {
    name: messages['palette.fullCatalogLibrary'],
    exact: true,
  });
  await choose('office.menu.insertShapes').press('Enter');
  await expect(search).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(insert).toBeFocused();

  await insert.press('Enter');
  await choose('office.menu.insertShapes').press('Enter');
  await expect(library.locator('option:checked')).toHaveText('All libraries');
  const firewall = dialog.getByRole('button', {
    name: messages['shape.firewall'],
    exact: true,
  });
  await search.fill('firewall');
  await expect(firewall).toBeVisible();
  await library.selectOption({ label: messages['palette.category.basic'] });
  await expect(firewall).toHaveCount(0);
  await library.selectOption({ label: messages['palette.category.security'] });
  await expect(firewall.locator('svg')).toBeVisible();
  await firewall.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(canvas).toBeFocused();
  await expect(canvas.locator('[data-node-id]')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(canvas.locator('[data-node-id]')).toHaveCount(1);
  expect(await archivedNodeKinds(page, messages)).toEqual(['firewall']);

  const ribbonFilters = page.locator('.ribbon-shape-filters');
  if (!(await ribbonFilters.isVisible()))
    await page
      .getByRole('button', { name: messages['ribbon.libraries'], exact: true })
      .click();
  await ribbonFilters
    .getByRole('button', {
      name: messages['palette.chooseCategories'],
      exact: true,
    })
    .click();
  const preferences = page.getByRole('dialog', {
    name: messages['palette.categoriesTitle'],
    exact: true,
  });
  await expect(
    preferences.getByRole('checkbox', {
      name: messages['palette.category.basic'],
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    preferences.getByRole('checkbox', {
      name: messages['palette.category.security'],
      exact: true,
    }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('koxora.element-libraries.v1')!),
    ),
  ).toEqual({ version: 1, selected: ['basic'] });
});

test('German Insert reaches the existing connection search and places quick tools on a narrow canvas', async ({
  page,
}) => {
  const { messages, canvas, insert, choose } = await openProject(
    page,
    'de',
    390,
  );
  const ribbon = page.locator('.compact-tool-ribbon');
  const search = ribbon.getByRole('searchbox', {
    name: messages['palette.search'],
    exact: true,
  });
  await insert.click();
  await choose('office.menu.insertShapes').click();
  const dialog = page.getByRole('dialog', {
    name: 'Formen und Symbole',
    exact: true,
  });
  const catalogSearch = dialog.getByRole('searchbox');
  await expect(catalogSearch).toBeFocused();
  const heptagon = dialog.getByRole('button', {
    name: 'Siebeneck',
    exact: true,
  });
  for (const query of ['siebeneck', 'heptagon']) {
    await catalogSearch.fill(query);
    await expect(heptagon).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(insert).toBeFocused();

  await search.fill('rectangle');
  await insert.press('Enter');
  await choose('office.menu.insertConnections').press('Enter');
  await expect(
    ribbon.getByRole('tab', {
      name: messages['ribbon.connections'],
      exact: true,
    }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('');
  await expect(
    ribbon.getByRole('button', {
      name: messages['shape.junction'],
      exact: true,
    }),
  ).toBeVisible();
  for (const preset of ['straight-line', 'straight-arrow', 'curved-arrow']) {
    await search.fill(preset);
    await expect(
      ribbon.getByRole('button', {
        name: messages[`line.${preset}`],
        exact: true,
      }),
    ).toBeVisible();
  }

  await insert.press('Enter');
  await choose('shape.table').press('Enter');
  await expect(canvas).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(canvas.locator('[data-table-cell]').first()).toBeVisible();

  const format = messages['office.menu.format'];
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: format, exact: true })
    .press('Enter');
  await page
    .getByRole('menu', { name: format, exact: true })
    .getByRole('menuitem', { name: messages['rich.edit'], exact: true })
    .press('Enter');
  const tableEditor = page.locator('.canvas-table-toolbar');
  await expect(tableEditor).toBeVisible();
  await insert.press('Enter');
  await choose('shape.freehand').press('Enter');
  await expect(tableEditor).toHaveCount(0);
  await expect(canvas).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Enter');
  await expect(canvas.locator('[data-node-id]')).toHaveCount(2);

  await insert.press('Enter');
  await choose('shape.text').press('Enter');
  await expect(canvas).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(canvas.locator('[data-node-id]')).toHaveCount(3);
  await page.keyboard.press('Escape');
  expect(await archivedNodeKinds(page, messages)).toEqual([
    'table',
    'freehand',
    'text',
  ]);

  const file = messages['office.menu.file'];
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: file, exact: true })
    .press('Enter');
  await page
    .getByRole('menu', { name: file, exact: true })
    .getByRole('menuitem', { name: messages['templates.heading'], exact: true })
    .press('Enter');
  await expect(insert).toBeDisabled();
});
