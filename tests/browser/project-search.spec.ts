import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
} from '../../packages/project/src/index';

const messages = (locale: string): Record<string, string> =>
  JSON.parse(readFileSync(`packages/i18n/src/locales/${locale}.json`, 'utf8'));
async function seed(page: Page, titles: string[], locale = 'en') {
  const m = messages(locale);
  const projects = titles.map((title) =>
    createProject(title, () => crypto.randomUUID(), '2026-11-14T12:00:00.000Z'),
  );
  for (const project of projects) {
    await page
      .getByRole('button', { name: m['project.import'], exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: m['project.import'],
      exact: true,
    });
    await dialog
      .getByLabel(m['project.import'], { exact: true })
      .setInputFiles({
        name: 'search.koxora',
        mimeType: 'application/zip',
        buffer: Buffer.from(await exportProject(project)),
      });
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.save-status')).toHaveText(m['project.saved']);
  }
  if (!(await page.locator('.project-sidebar').isVisible()))
    await page
      .getByRole('button', { name: m['tree.heading'], exact: true })
      .click();
  await page
    .locator('.project-sidebar .nav-item')
    .filter({ hasText: m['project.recent'] })
    .click();
  await expect(page.locator('.start-project-row')).toHaveCount(projects.length);
  return projects;
}
async function reachable(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
  expect(
    await control.evaluate((element) => {
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

test('local project search filters full titles, follows a rename and opens the same project identity', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const [cafe] = await seed(page, ['Café planning 世界', 'Other project']);
  const search = page.getByRole('searchbox', {
    name: 'Search local projects',
    exact: true,
  });
  await search.fill('  CAFE planning 世界  ');
  await expect(page.locator('.start-project-row')).toHaveCount(1);
  await expect(page.locator('.start-search-count')).toHaveText(
    '1 of 2 projects',
  );
  await page
    .locator('.start-project-row')
    .getByRole('button', { name: 'Rename', exact: true })
    .click();
  const rename = page
    .locator('.start-project-row')
    .getByRole('textbox', { name: 'Project name', exact: true });
  await rename.fill('Résumé 世界');
  await rename.press('Enter');
  await expect(page.locator('.start-project-row')).toHaveCount(0);
  await expect(
    page.getByText('No projects match your search.', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.start-search-count')).toHaveText(
    '0 of 2 projects',
  );
  await search.fill('resume 世界');
  await expect(page.locator('.start-project-row')).toHaveCount(1);
  await expect(page.locator('.start-project-row')).toContainText('Résumé 世界');
  await page
    .locator('.start-project-row')
    .getByRole('button', { name: 'Open project', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Résumé 世界');
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export .koxora', exact: true })
    .click();
  const project = await importProject(
    new Uint8Array(readFileSync((await (await pending).path())!)),
  );
  expect(project.manifest.projectId).toBe(cafe.manifest.projectId);
  expect(project.manifest.title).toBe('Résumé 世界');
});

test('search keeps unreadable projects available for explicit recovery', async ({
  page,
}) => {
  await page.goto('/');
  const [recoverable] = await seed(page, [
    'Recover this project',
    'Healthy project',
  ]);
  await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('koxora-projects', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('projects', 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.get(id);
      request.onsuccess = () => {
        const record = JSON.parse(request.result);
        record.previous = record.current;
        record.current = '{';
        store.put(JSON.stringify(record), id);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = reject;
    });
    db.close();
  }, recoverable.manifest.projectId);
  await page.reload();
  const search = page.getByRole('searchbox', {
    name: 'Search local projects',
    exact: true,
  });
  await search.fill('missing named project');
  await expect(page.locator('.start-project-row')).toHaveCount(1);
  await expect(page.locator('.start-project-row')).toContainText(
    'Unreadable project',
  );
  await expect(page.locator('.start-search-recovery')).toContainText(
    'remain visible',
  );
  await page
    .locator('.start-project-row')
    .getByRole('button', { name: 'Recover previous save', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Continue', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Project name', exact: true }),
  ).toHaveValue('Recover this project');
  await expect(page.locator('.save-status')).toHaveText('Saved on this device');
});

for (const locale of ['en', 'de']) {
  test(`project search distinguishes empty library and no match and remains reachable at 200% in ${locale}`, async ({
    page,
  }) => {
    const m = messages(locale);
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
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto('/');
    const search = page.getByRole('searchbox', {
      name: m['start.search'],
      exact: true,
    });
    await reachable(search);
    await search.fill('not here');
    await expect(
      page.getByRole('heading', {
        name: m['dashboard.emptyTitle'],
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(m['start.noMatches'], { exact: true }),
    ).toHaveCount(0);
    await page
      .locator('.start-search-row')
      .getByRole('button', { name: m['start.clearSearch'], exact: true })
      .click();
    await expect(search).toBeFocused();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await seed(page, ['Café planning 世界', 'Other project'], locale);
    await page.setViewportSize({ width: 390, height: 600 });
    const localSearch = page.getByRole('searchbox', {
      name: m['start.search'],
      exact: true,
    });
    await reachable(localSearch);
    await localSearch.fill('absent');
    await expect(
      page.getByText(m['start.noMatches'], { exact: true }),
    ).toBeVisible();
    const clear = page
      .locator('.start-search-row')
      .getByRole('button', { name: m['start.clearSearch'], exact: true });
    await reachable(clear);
    await clear.click();
    await expect(localSearch).toBeFocused();
    await expect(page.locator('.start-project-row')).toHaveCount(2);
    await localSearch.fill('cafe');
    await expect(page.locator('.start-project-row')).toHaveCount(1);
    await reachable(
      page
        .locator('.start-project-row')
        .getByRole('button', { name: m['project.open'], exact: true }),
    );
    const library = await page.locator('.start-library').boundingBox();
    await page.locator('.start-help summary').click();
    const after = await page.locator('.start-library').boundingBox();
    expect(after!.width).toBeCloseTo(library!.width, 1);
    expect(after!.x).toBeCloseTo(library!.x, 1);
  });
}
