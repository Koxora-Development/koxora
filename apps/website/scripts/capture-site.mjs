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
const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};
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
  {
    file: 'home-en-light',
    url: `${base}/en/`,
    viewport: 'desktop',
    theme: 'light',
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
      if (shot.dialog)
        await page.locator('[data-consent-action="customize"]').click();
      await page.waitForTimeout(250);
      await page.screenshot({
        path: `${outDir}/${shot.file}.png`,
        fullPage: Boolean(shot.full),
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
