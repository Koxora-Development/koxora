import { expect, test } from '@playwright/test';
test('guest startup defaults to English on a German OS with no backend requests', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ locale: 'de-DE' });
  const page = await context.newPage();
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith(baseURL!)) external.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Make room for your next idea.',
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('combobox', { name: 'Language', exact: true }),
  ).toHaveValue('en');
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
});
test('language and dark theme persist across offline reload without changing document data', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem('synthetic.project', 'My unchanged diagram'),
  );
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page
    .getByRole('combobox', { name: 'Darstellung', exact: true })
    .selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Platz für deine nächste Idee.',
  );
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
  await expect(
    page.getByRole('combobox', { name: 'Sprache', exact: true }),
  ).toHaveValue('de');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('status')).toHaveText('Offline');
  expect(
    await page.evaluate(() => localStorage.getItem('synthetic.project')),
  ).toBe('My unchanged diagram');
  await page
    .getByRole('combobox', { name: 'Sprache', exact: true })
    .selectOption('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Make room for your next idea.',
  );
});
test('blocked preference storage leaves a usable localized session', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage disabled');
      },
    });
  });
  await page.goto('/');
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await expect(page.getByRole('alert')).toContainText('für diese Sitzung');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
});
test('responsive shell has no horizontal overflow and supports keyboard skip navigation', async ({
  page,
}) => {
  await page.goto('/');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to workspace' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'Your workspace', exact: true }),
  ).toBeVisible();
});
