// Captures the website screenshots used for review and documentation.
// Requires a running preview server (pnpm --filter @koxora/website preview).
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const outDir = resolve(root, 'docs/design/screenshots/website');
const base = process.env.KOXORA_SITE_URL ?? 'http://127.0.0.1:4175';
const consentBase = process.env.KOXORA_CONSENT_URL ?? 'http://127.0.0.1:4176';
// The variant a launch would publish, served by `preview:published`.
const publishedBase =
  process.env.KOXORA_PUBLISHED_URL ?? 'http://127.0.0.1:4177';
const viewports = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};
// The site follows the operating system preference while no choice is stored,
// so every shot states the preference it emulates. `theme` stores a choice on
// top of it, which is what the appearance control writes.
const defaultScheme = 'dark';
const shots = [
  {
    file: 'home-en-desktop',
    url: `${base}/en/`,
    viewport: 'desktop',
    full: true,
  },
  {
    file: 'home-de-desktop',
    url: `${base}/de/`,
    viewport: 'desktop',
    full: true,
  },
  // No stored choice, so this is the operating system preference being followed.
  {
    file: 'home-en-light',
    url: `${base}/en/`,
    viewport: 'desktop',
    scheme: 'light',
  },
  // The appearance control in both states, with the header and the top of the
  // hero in frame. The stored choice in the second shot also demonstrates that
  // a reader's choice overrides the operating system preference.
  {
    file: 'theme-dark-en',
    url: `${base}/en/`,
    viewport: 'desktop',
    clip: { x: 0, y: 0, width: 1280, height: 420 },
  },
  {
    file: 'theme-light-en',
    url: `${base}/en/`,
    viewport: 'desktop',
    theme: 'light',
    clip: { x: 0, y: 0, width: 1280, height: 420 },
  },
  // The language popover in both languages and both appearances.
  {
    file: 'language-menu-en',
    url: `${base}/en/`,
    viewport: 'desktop',
    language: true,
    clip: { x: 0, y: 0, width: 1280, height: 420 },
  },
  {
    file: 'language-menu-de',
    url: `${base}/de/`,
    viewport: 'desktop',
    theme: 'light',
    language: true,
    clip: { x: 0, y: 0, width: 1280, height: 420 },
  },
  {
    file: 'language-menu-de-mobile',
    url: `${base}/de/`,
    viewport: 'mobile',
    menu: true,
    language: true,
  },
  // The header stays at the top of a scrolled page, over the content.
  {
    file: 'sticky-header-en',
    url: `${base}/en/`,
    viewport: 'desktop',
    scrollTo: 1066,
    clip: { x: 0, y: 0, width: 1280, height: 320 },
  },
  // The footer, grouped by errand, in both languages and on the phone.
  {
    file: 'footer-en-desktop',
    url: `${base}/en/`,
    viewport: 'desktop',
    element: '.site-footer',
  },
  {
    file: 'footer-de-desktop',
    url: `${base}/de/`,
    viewport: 'desktop',
    theme: 'light',
    element: '.site-footer',
  },
  {
    file: 'footer-de-mobile',
    url: `${base}/de/`,
    viewport: 'mobile',
    element: '.site-footer',
  },
  {
    file: 'footer-en-mobile',
    url: `${base}/en/`,
    viewport: 'mobile',
    element: '.site-footer',
  },
  {
    file: 'home-de-mobile',
    url: `${base}/de/`,
    viewport: 'mobile',
    full: true,
  },
  { file: 'home-en-tablet', url: `${base}/en/`, viewport: 'tablet' },
  {
    file: 'features-en-desktop',
    url: `${base}/en/features/`,
    viewport: 'desktop',
    full: true,
  },
  {
    file: 'compare-de-desktop',
    url: `${base}/de/vergleich/`,
    viewport: 'desktop',
  },
  {
    file: 'roadmap-en-desktop',
    url: `${base}/en/roadmap/`,
    viewport: 'desktop',
  },
  {
    file: 'download-de-desktop',
    url: `${base}/de/download/`,
    viewport: 'desktop',
  },
  {
    file: 'local-first-en-desktop',
    url: `${base}/en/local-first/`,
    viewport: 'desktop',
  },
  {
    file: 'legal-notice-de',
    url: `${base}/de/impressum/`,
    viewport: 'desktop',
  },
  {
    file: 'privacy-policy-de',
    url: `${base}/de/datenschutz/`,
    viewport: 'desktop',
    full: true,
  },
  {
    file: 'privacy-settings-en',
    url: `${base}/en/privacy-settings/`,
    viewport: 'desktop',
  },
  {
    file: 'not-found-en',
    url: `${base}/en/does-not-exist/`,
    viewport: 'desktop',
  },
  {
    file: 'menu-de-mobile',
    url: `${base}/de/`,
    viewport: 'mobile',
    menu: true,
  },
  // How the legal page reads once the site is live: no notice addressed to
  // the operator, and everything a reader is entitled to still there.
  {
    file: 'privacy-published-en',
    url: `${publishedBase}/en/privacy-policy/`,
    viewport: 'desktop',
    full: true,
    optional: true,
  },
  {
    file: 'privacy-published-de',
    url: `${publishedBase}/de/datenschutz/`,
    viewport: 'desktop',
    theme: 'light',
    full: true,
    optional: true,
  },
  {
    file: 'consent-banner-de',
    url: `${consentBase}/de/`,
    viewport: 'desktop',
    optional: true,
  },
  {
    file: 'consent-dialog-en',
    url: `${consentBase}/en/`,
    viewport: 'desktop',
    dialog: true,
    optional: true,
  },
];
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const written = [];
try {
  await mkdir(outDir, { recursive: true });
  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: viewports[shot.viewport],
      locale: shot.url.includes('/de/') ? 'de-DE' : 'en-US',
      colorScheme: shot.scheme ?? defaultScheme,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    try {
      const response = await page.goto(shot.url, { waitUntil: 'load' });
      if (!response) throw new Error(`No response for ${shot.url}`);
      if (shot.theme)
        await page.evaluate((theme) => {
          localStorage.setItem('koxora.website.theme', theme);
        }, shot.theme);
      if (shot.theme) await page.reload({ waitUntil: 'load' });
      if (shot.menu) await page.locator('[data-menu-toggle]').click();
      if (shot.language) await page.locator('[data-language-toggle]').click();
      if (shot.dialog)
        await page.locator('[data-consent-action="customize"]').click();
      if (shot.element)
        await page.locator(shot.element).scrollIntoViewIfNeeded();
      if (shot.scrollTo !== undefined)
        await page.evaluate((top) => window.scrollTo(0, top), shot.scrollTo);
      await page.waitForTimeout(250);
      const target = shot.element ? page.locator(shot.element) : page;
      await target.screenshot({
        path: `${outDir}/${shot.file}.png`,
        ...(shot.element ? {} : { fullPage: Boolean(shot.full) }),
        ...(shot.clip ? { clip: shot.clip } : {}),
      });
      written.push(shot.file);
    } catch (error) {
      if (!shot.optional) throw error;
      console.warn(`Skipped ${shot.file}: ${String(error)}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`Website screenshots: ${written.length} in ${outDir}`);
