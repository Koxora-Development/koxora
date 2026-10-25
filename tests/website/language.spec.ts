import { expect, test, type APIRequestContext } from '@playwright/test';
import { languageCookieName } from '../../apps/website/src/language';
import { openLanguageMenu } from './helpers';
/** The root address, asked for with a given request language and cookie. */
async function root(
  request: APIRequestContext,
  {
    acceptLanguage,
    cookie,
    path = '/',
  }: { acceptLanguage?: string; cookie?: string; path?: string } = {},
) {
  const response = await request.get(path, {
    maxRedirects: 0,
    headers: {
      ...(acceptLanguage ? { 'accept-language': acceptLanguage } : {}),
      ...(cookie ? { cookie } : {}),
    },
  });
  const headers = response.headers();
  return {
    status: response.status(),
    location: headers.location ?? null,
    cacheControl: headers['cache-control'] ?? null,
    vary: headers.vary ?? null,
  };
}
test.describe('language detection on the address without a language', () => {
  test('sends a German browser to the German site and an English one to English', async ({
    request,
  }) => {
    const cases: [string, string][] = [
      ['de', '/de/'],
      ['de-DE,de;q=0.9,en;q=0.8', '/de/'],
      ['de-AT,de;q=0.9', '/de/'],
      ['de-CH', '/de/'],
      ['en-US,en;q=0.9', '/en/'],
      ['en-GB,en;q=0.9,de;q=0.8', '/en/'],
      // A language this site does not have falls back to English.
      ['fr-FR,fr;q=0.9', '/en/'],
      ['ja,ko;q=0.9', '/en/'],
      ['', '/en/'],
      // The quality values decide, not the order written.
      ['en;q=0.5,de;q=0.9', '/de/'],
      ['de;q=0.5,en;q=0.9', '/en/'],
      // A refused language is not a preference.
      ['de;q=0,en', '/en/'],
      // The first supported entry of a longer list wins.
      ['fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7', '/de/'],
    ];
    for (const [acceptLanguage, expected] of cases) {
      const result = await root(request, { acceptLanguage });
      expect(result.status, acceptLanguage).toBe(302);
      expect(result.location, acceptLanguage).toBe(expected);
    }
  });
  test('a stored choice outranks the browser languages in both directions', async ({
    request,
  }) => {
    const german = await root(request, {
      cookie: `${languageCookieName}=de`,
      acceptLanguage: 'en-US,en;q=0.9',
    });
    expect(german.location).toBe('/de/');
    const english = await root(request, {
      cookie: `${languageCookieName}=en`,
      acceptLanguage: 'de-DE,de;q=0.9',
    });
    expect(english.location).toBe('/en/');
  });
  test('a stored value that is not one of the two languages is ignored', async ({
    request,
  }) => {
    for (const value of ['fr', 'de-DE', '//evil.example', '/en/']) {
      const result = await root(request, {
        cookie: `${languageCookieName}=${encodeURIComponent(value)}`,
        acceptLanguage: 'de-DE,de;q=0.9',
      });
      expect(result.status, value).toBe(302);
      expect(result.location, value).toBe('/de/');
    }
  });
  test('the answer is temporary, never stored, and says what it depends on', async ({
    request,
  }) => {
    const result = await root(request, { acceptLanguage: 'de' });
    expect(result.status).toBe(302);
    expect(result.cacheControl).toBe('no-store');
    expect(result.vary).toContain('Cookie');
    expect(result.vary).toContain('Accept-Language');
  });
  test('the query string survives the hop', async ({ request }) => {
    const result = await root(request, {
      path: '/?ref=example&utm_source=test',
      acceptLanguage: 'de-DE,de;q=0.9',
    });
    expect(result.location).toBe('/de/?ref=example&utm_source=test');
  });
  test('the negotiated address answers without a second redirect', async ({
    request,
  }) => {
    for (const acceptLanguage of ['de-DE,de;q=0.9', 'en-US']) {
      const first = await root(request, { acceptLanguage });
      const second = await root(request, {
        path: first.location!,
        acceptLanguage,
        cookie: `${languageCookieName}=de`,
      });
      // An address that names its language is served, never negotiated again.
      expect(second.status, `${acceptLanguage} -> ${first.location}`).toBe(200);
    }
  });
});
test.describe('an address that names its language', () => {
  test('is always honoured, whatever was stored before', async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    await context.addCookies([
      {
        name: languageCookieName,
        value: 'de',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
    const page = await context.newPage();
    // A shared deep link in the other language opens in that language and the
    // stored choice is left exactly as it was.
    for (const path of ['/en/', '/en/features/', '/en/privacy-policy/']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    }
    const cookies = await context.cookies();
    expect(
      cookies.find((cookie) => cookie.name === languageCookieName)?.value,
    ).toBe('de');
    await context.close();
  });
});
test.describe('remembering an explicit choice', () => {
  test('stores the language the reader selects and uses it on the next visit', async ({
    browser,
  }) => {
    // A browser that asks for English; the reader chooses German.
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await page.goto('/en/');
    await openLanguageMenu(page);
    await page.locator('[data-language-option="de"]').first().click();
    await expect(page).toHaveURL(/\/de\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      'koxora.website.language',
    );
    expect(stored).toBe('de');
    const cookies = await context.cookies();
    const cookie = cookies.find((entry) => entry.name === languageCookieName);
    expect(cookie?.value).toBe('de');
    expect(cookie?.path).toBe('/');
    expect(cookie?.sameSite).toBe('Lax');
    // The address without a language now opens the chosen one, although the
    // browser still asks for English.
    await page.goto('/');
    await expect(page).toHaveURL(/\/de\/$/);
    await context.close();
  });
  test('survives a new browser session and can be changed back', async ({
    browser,
  }) => {
    const first = await browser.newContext({ locale: 'en-US' });
    const page = await first.newPage();
    await page.goto('/en/');
    await openLanguageMenu(page);
    await page.locator('[data-language-option="de"]').first().click();
    await expect(page).toHaveURL(/\/de\/$/);
    const state = await first.storageState();
    await first.close();
    // A new context with the same stored state is what a reader who closes
    // and reopens the browser has.
    const second = await browser.newContext({
      locale: 'en-US',
      storageState: state,
    });
    const reopened = await second.newPage();
    await reopened.goto('/');
    await expect(reopened).toHaveURL(/\/de\/$/);
    // Changing back overwrites the earlier choice.
    await openLanguageMenu(reopened);
    await reopened.locator('[data-language-option="en"]').first().click();
    await expect(reopened).toHaveURL(/\/en\/$/);
    await reopened.goto('/');
    await expect(reopened).toHaveURL(/\/en\/$/);
    await second.close();
  });
  test('stores nothing before a reader has chosen', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    for (const path of ['/', '/de/', '/en/features/']) await page.goto(path);
    expect(
      (await context.cookies()).map((cookie) => cookie.name),
    ).not.toContain(languageCookieName);
    await context.close();
  });
});
test.describe('the gateway document', () => {
  test('decides in the browser where the hosting layer did not', async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: 'de-AT' });
    const page = await context.newPage();
    // The emitted gateway, asked for by its file name so the negotiating
    // redirect of the server is not what is being tested.
    await page.goto('/index.html');
    await expect(page).toHaveURL(/\/de\/$/);
    await context.close();
  });
  test('is a usable language selection page without JavaScript', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      locale: 'de-DE',
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    await page.goto('/index.html');
    // No meta refresh: it could only name one language and would send a
    // German reader to English.
    await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
    for (const locale of ['en', 'de']) {
      const link = page.locator(`a[data-language-option="${locale}"]`);
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', `/${locale}/`);
    }
    // Both languages name the choice, because the reader has not been
    // identified as speaking either.
    await expect(page.locator('main p[lang="de"]')).toHaveCount(1);
    await expect(page.locator('main p[lang="en"]')).toHaveCount(1);
    await page.locator('a[data-language-option="de"]').click();
    await expect(page).toHaveURL(/\/de\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await context.close();
  });
  test('without JavaScript the root address still lands on a real page', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      locale: 'de-DE',
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/de\/$/);
    await expect(page.locator('h1')).toHaveCount(1);
    await context.close();
  });
});
test.describe('the language control', () => {
  test('keeps every option reachable by keyboard and marks the current one', async ({
    page,
  }) => {
    await page.goto('/en/');
    await openLanguageMenu(page);
    const current = page.locator('[data-language-option="en"]').first();
    await expect(current).toHaveAttribute('aria-current', 'true');
    const other = page.locator('[data-language-option="de"]').first();
    await other.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/de\/$/);
    // Activating with the keyboard stores the choice as a press does.
    expect(
      (await page.context().cookies()).find(
        (cookie) => cookie.name === languageCookieName,
      )?.value,
    ).toBe('de');
  });
});
