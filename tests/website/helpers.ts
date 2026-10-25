import { expect, type Page, type APIRequestContext } from '@playwright/test';
export const consentOrigin = 'http://127.0.0.1:4176';
/** Every public page, in both languages, with its canonical path. */
export const pages = [
  { id: 'home', en: '/en/', de: '/de/' },
  { id: 'features', en: '/en/features/', de: '/de/funktionen/' },
  { id: 'localFirst', en: '/en/local-first/', de: '/de/local-first/' },
  { id: 'compare', en: '/en/compare/', de: '/de/vergleich/' },
  {
    id: 'compareDrawio',
    en: '/en/compare/drawio/',
    de: '/de/vergleich/drawio/',
  },
  { id: 'compareMiro', en: '/en/compare/miro/', de: '/de/vergleich/miro/' },
  {
    id: 'compareLucidchart',
    en: '/en/compare/lucidchart/',
    de: '/de/vergleich/lucidchart/',
  },
  { id: 'roadmap', en: '/en/roadmap/', de: '/de/roadmap/' },
  { id: 'contact', en: '/en/contact/', de: '/de/kontakt/' },
  { id: 'download', en: '/en/download/', de: '/de/download/' },
  { id: 'docs', en: '/en/docs/', de: '/de/dokumentation/' },
  { id: 'releases', en: '/en/releases/', de: '/de/releases/' },
  { id: 'legalNotice', en: '/en/legal-notice/', de: '/de/impressum/' },
  { id: 'privacyPolicy', en: '/en/privacy-policy/', de: '/de/datenschutz/' },
  {
    id: 'privacySettings',
    en: '/en/privacy-settings/',
    de: '/de/datenschutz-einstellungen/',
  },
] as const;
export const allPaths = pages.flatMap((page) => [page.en, page.de]);
export async function meta(page: Page, name: string): Promise<string | null> {
  return page.locator(`meta[name="${name}"]`).first().getAttribute('content');
}
export async function property(
  page: Page,
  name: string,
): Promise<string | null> {
  return page
    .locator(`meta[property="${name}"]`)
    .first()
    .getAttribute('content');
}
export async function status(
  request: APIRequestContext,
  url: string,
): Promise<{ status: number; location: string | null }> {
  const response = await request.get(url, { maxRedirects: 0 });
  return {
    status: response.status(),
    location: response.headers().location ?? null,
  };
}
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
}
/** Opens the collapsed header menu on narrow layouts. */
export async function openNavigation(page: Page) {
  const toggle = page.locator('[data-menu-toggle]');
  if (await toggle.isVisible()) await toggle.click();
}
/** Opens the language popover, after the collapsed header menu where needed. */
export async function openLanguageMenu(page: Page) {
  await openNavigation(page);
  const toggle = page.locator('[data-language-toggle]');
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute('aria-expanded')) !== 'true'
  )
    await toggle.click();
}
