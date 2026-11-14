import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { importProject } from '../../packages/project/src/index';

const palette = (page: Page) =>
  page.getByRole('toolbar', { name: 'Diagram tools', exact: true });
const canvas = (page: Page) =>
  page.getByRole('region', { name: 'Interactive canvas', exact: true });
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
async function worldPoint(page: Page, x: number, y: number) {
  await canvas(page).scrollIntoViewIfNeeded();
  const box = (await canvas(page).boundingBox())!;
  const camera = JSON.parse((await canvas(page).getAttribute('data-camera'))!);
  return {
    x: box.x + box.width / 2 + (x - camera.x) * camera.zoom,
    y: box.y + box.height / 2 + (y - camera.y) * camera.zoom,
  };
}
async function reachable(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  expect(
    await locator.evaluate((element) => {
      const r = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
      );
    }),
  ).toBe(true);
}
async function transform(page: Page, label: string) {
  await page
    .getByRole('menubar')
    .getByRole('menuitem', { name: 'Format', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Transform', exact: true }).click();
  await page.getByRole('menuitem', { name: label, exact: true }).click();
}

async function chooseCategories(page: Page, values: string[], locale = 'en') {
  const messages: Record<string, string> = JSON.parse(
    readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'),
  );
  await page
    .getByRole('button', {
      name: messages['palette.chooseCategories'],
      exact: true,
    })
    .click();
  const dialog = page.getByRole('dialog', {
    name: messages['palette.categoriesTitle'],
    exact: true,
  });
  await dialog
    .getByRole('button', {
      name: messages['palette.clearCategories'],
      exact: true,
    })
    .click();
  for (const value of values)
    await dialog
      .getByRole('checkbox', {
        name: messages[`palette.category.${value}`],
        exact: true,
      })
      .check();
  await dialog
    .getByRole('button', { name: messages['diagram.apply'], exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
}

test('element categories and search preserve navigation and do not leave hidden insertion tools armed', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const search = page.getByRole('searchbox', {
    name: 'Search elements',
    exact: true,
  });
  await chooseCategories(page, ['symbols']);
  await expect(
    palette(page).getByRole('button', { name: 'Cloud', exact: true }),
  ).toBeVisible();
  await expect(
    palette(page).getByRole('button', { name: 'Document', exact: true }),
  ).toHaveCount(0);
  await palette(page)
    .getByRole('button', { name: 'Cloud', exact: true })
    .click();
  await chooseCategories(page, ['flowchart']);
  await expect(
    palette(page).getByRole('button', { name: 'Select', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await search.fill('database');
  await expect(palette(page).getByRole('button')).toHaveCount(3);
  await expect(
    palette(page).getByRole('button', {
      name: 'Database / cylinder',
      exact: true,
    }),
  ).toBeVisible();
  await search.focus();
  await page.keyboard.press('Home');
  await expect(search).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(search).toBeFocused();
  await search.fill('no-such-element');
  await expect(palette(page).getByRole('button')).toHaveCount(2);
  await expect(
    palette(page).getByRole('button', { name: 'Select', exact: true }),
  ).toBeVisible();
  await expect(
    palette(page).getByRole('button', { name: 'Navigate', exact: true }),
  ).toBeVisible();
  await search.fill('');
  await chooseCategories(page, ['drawing']);
  await palette(page)
    .getByRole('button', { name: 'Select', exact: true })
    .focus();
  await page.keyboard.press('End');
  await expect(
    palette(page).getByRole('button', { name: 'Freehand pen', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Home');
  await expect(
    palette(page).getByRole('button', { name: 'Select', exact: true }),
  ).toBeFocused();
});

test('new document, database and note elements support ordinary movement, transforms, history and portable reopening', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const search = page.getByRole('searchbox', {
    name: 'Search elements',
    exact: true,
  });
  for (const [label, x] of [
    ['Document', -250],
    ['Database / cylinder', 0],
    ['Note', 250],
  ] as const) {
    await search.fill(label);
    await palette(page)
      .getByRole('button', { name: label, exact: true })
      .click();
    const point = await worldPoint(page, x, 0);
    await page.mouse.click(point.x, point.y);
  }
  await search.fill('');
  const initial = await exported(page);
  const nodes = initial.documents[0].pages[0].nodes;
  expect(nodes.map((n) => n.kind)).toEqual(['document', 'database', 'note']);
  const doc = page.locator(`[data-node-id="${nodes[0].id}"]`);
  await doc.click();
  const point = await worldPoint(page, -250, 0);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 35, point.y + 45, { steps: 5 });
  await page.mouse.up();
  await transform(page, 'Rotate 90° clockwise');
  await transform(page, 'Mirror horizontally');
  await expect(doc.locator('.scene-node')).toHaveAttribute(
    'transform',
    /scale\(-1 1\)/,
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(doc.locator('.scene-node')).toHaveAttribute(
    'transform',
    /scale\(1 1\)/,
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  const edited = await exported(page);
  expect(edited.documents[0].pages[0].nodes[0].geometry).toMatchObject({
    rotation: 90,
    flipX: true,
  });
  expect(edited.documents[0].pages[0].nodes[0].geometry.x).not.toBe(
    nodes[0].geometry.x,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  expect((await exported(page)).documents).toEqual(edited.documents);
});

for (const locale of ['en', 'de'])
  test(`categorized elements retain localized/English search and reachable canvas controls at 390px/200% in ${locale}`, async ({
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
    const category = page.getByRole('button', {
      name: messages['palette.chooseCategories'],
      exact: true,
    });
    await reachable(category);
    await chooseCategories(page, ['flowchart'], locale);
    await reachable(search);
    await search.fill('database');
    const tools = page.getByRole('toolbar', {
      name: messages['diagram.tools'],
      exact: true,
    });
    const database = tools.getByRole('button', {
      name: messages['shape.database'],
      exact: true,
    });
    await reachable(database);
    await search.fill(messages['shape.database'].split(' / ')[0]);
    await expect(database).toBeVisible();
    for (const key of ['diagram.select', 'diagram.pan'])
      await reachable(
        tools.getByRole('button', { name: messages[key], exact: true }),
      );
    for (const key of [
      'canvas.zoomOut',
      'canvas.zoomIn',
      'canvas.fit',
      'canvas.grid',
    ])
      await reachable(
        page.getByRole('button', { name: messages[key], exact: true }),
      );
    await page.locator('.interactive-canvas').scrollIntoViewIfNeeded();
    expect(
      (await page.locator('.interactive-canvas').boundingBox())!.height,
    ).toBeGreaterThanOrEqual(160);
  });

test('category selection is transactional, combines libraries and restores remembered choices', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await chooseCategories(page, ['basic', 'symbols']);
  await expect(
    palette(page).getByRole('button', { name: 'Rectangle', exact: true }),
  ).toHaveCount(1);
  await expect(
    palette(page).getByRole('button', { name: 'Cloud', exact: true }),
  ).toBeVisible();
  await expect(
    palette(page).getByRole('button', { name: 'Document', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Categories…', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Element categories',
    exact: true,
  });
  await dialog
    .getByRole('button', { name: 'Clear selection', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    palette(page).getByRole('button', { name: 'Cloud', exact: true }),
  ).toBeVisible();
  await chooseCategories(page, []);
  await expect(palette(page).getByRole('button')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Browse elements…', exact: true })
    .click();
  const empty = page.getByRole('dialog', {
    name: 'Element library',
    exact: true,
  });
  await expect(empty.locator('[data-library-kind]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await chooseCategories(page, ['basic', 'symbols']);
  await page
    .getByRole('button', { name: 'Browse elements…', exact: true })
    .click();
  const browser = page.getByRole('dialog', {
    name: 'Element library',
    exact: true,
  });
  await browser
    .getByRole('searchbox', { name: 'Search elements', exact: true })
    .fill('cloud');
  await browser.getByRole('button', { name: 'Cloud', exact: true }).click();
  await expect(browser).toHaveCount(0);
  await expect(
    palette(page).getByRole('button', { name: 'Cloud', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await saved(page);
  await page.reload();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(
    palette(page).getByRole('button', { name: 'Cloud', exact: true }),
  ).toBeVisible();
  await expect(
    palette(page).getByRole('button', { name: 'Document', exact: true }),
  ).toHaveCount(0);
});
