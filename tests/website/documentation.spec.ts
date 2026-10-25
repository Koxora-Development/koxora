import { expect, test } from '@playwright/test';
import { status } from './helpers';
const sections = [
  ['/en/docs/getting-started/', '/de/dokumentation/erste-schritte/'],
  ['/en/docs/editing/', '/de/dokumentation/bearbeiten/'],
  ['/en/docs/projects/', '/de/dokumentation/projekte/'],
  ['/en/docs/faq/', '/de/dokumentation/faq/'],
  ['/en/docs/support/', '/de/dokumentation/support/'],
] as const;
test.describe('the documentation', () => {
  test('answers every section in both languages', async ({ page, request }) => {
    for (const pair of sections)
      for (const [index, path] of pair.entries()) {
        expect((await status(request, path)).status, path).toBe(200);
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          index === 0 ? 'en' : 'de',
        );
        await expect(page.locator('h1')).toHaveCount(1);
      }
  });
  test('links every section from the hub, with the state it describes', async ({
    page,
  }) => {
    await page.goto('/en/docs/');
    for (const [english] of sections)
      await expect(
        page.locator(`#sections a[href="${english}"]`),
        english,
      ).toHaveCount(1);
    // The capability list, the roadmap and the local-first page belong to the
    // documentation too; they are linked rather than rewritten.
    for (const target of ['/en/features/', '/en/roadmap/', '/en/local-first/'])
      await expect(page.locator(`#sections a[href="${target}"]`)).toHaveCount(
        1,
      );
    // Every card says what state it describes, and the legend explains them.
    const badges = page.locator('#sections .badge');
    expect(await badges.count()).toBeGreaterThanOrEqual(8);
    await expect(page.locator('#sections .legend')).toBeVisible();
  });
  test('shows real screenshots of the studio, named as such', async ({
    page,
  }) => {
    await page.goto('/en/docs/getting-started/');
    const shot = page.locator('.shot img');
    await expect(shot).toHaveCount(1);
    await expect(shot).toHaveAttribute('src', /docs-dashboard/);
    // An alternative text that describes the picture, a frame label so it is
    // not read as live interface, and a caption saying which version it is.
    await expect(shot).toHaveAttribute('alt', /project list/);
    await expect(page.locator('.shot-label')).toContainText('Screenshot');
    await expect(page.locator('figcaption')).toContainText(
      'development version',
    );
    await page.goto('/en/docs/editing/');
    await expect(page.locator('.shot img')).toHaveCount(2);
  });
  test('never offers a download that does not exist', async ({ page }) => {
    for (const [english, german] of sections)
      for (const path of [english, german]) {
        await page.goto(path);
        const text = (await page.locator('main').textContent()) ?? '';
        expect(text, path).not.toMatch(/download koxora now/i);
        expect(text, path).not.toMatch(/jetzt herunterladen/i);
      }
    // And the questions say plainly that there is none.
    await page.goto('/en/docs/faq/');
    await expect(page.locator('#questions')).toContainText('no public release');
  });
  test('answers the questions as a description list', async ({ page }) => {
    await page.goto('/de/dokumentation/faq/');
    const questions = page.locator('#questions dt');
    const answers = page.locator('#questions dd');
    await expect(questions).toHaveCount(12);
    await expect(answers).toHaveCount(12);
    await expect(questions.first()).toContainText('Konto');
  });
  test('warns about browser storage where it matters', async ({ page }) => {
    for (const [path, needle] of [
      ['/en/docs/getting-started/', '.koxora'],
      ['/en/docs/projects/', '.koxora'],
      ['/de/dokumentation/erste-schritte/', '.koxora'],
    ] as const) {
      await page.goto(path);
      await expect(page.locator('main'), path).toContainText(needle);
    }
  });
  test('sends a security report somewhere other than support', async ({
    page,
  }) => {
    await page.goto('/en/docs/support/');
    await expect(page.locator('#security')).toContainText('security policy');
    await expect(page.locator('#security a[href*="SECURITY.md"]')).toHaveCount(
      1,
    );
    // The ordinary routes are offered too, and the contact page among them.
    await expect(page.locator('#where a[href="/en/contact/"]')).toHaveCount(1);
    await expect(
      page.locator('#where a[href="mailto:support@koxora.app"]'),
    ).toHaveCount(1);
  });
  test('is reachable from the footer of every page', async ({ page }) => {
    await page.goto('/de/funktionen/');
    await expect(
      page.locator('.footer-nav a[href="/de/dokumentation/"]'),
    ).toHaveCount(1);
  });
});
