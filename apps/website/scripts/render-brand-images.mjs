// Rasterizes the brand assets used for favicons and social previews from the
// approved Koxora mark. Run with: pnpm --filter @koxora/website images:brand
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/images');
const mark = `<rect width="64" height="64" rx="17" fill="#1B1B35"/><path d="M17 14v36M47 14 17 44m15-17 15 23" stroke="url(#brand)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="47" cy="14" r="4" fill="#65E5EE"/>`;
const gradient = `<linearGradient id="brand" x1="5" y1="4" x2="63" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#BBA4FF"/><stop offset=".55" stop-color="#967FFF"/><stop offset="1" stop-color="#59DEEC"/></linearGradient>`;
const copy = {
  en: {
    headline: 'Ideas take shape.',
    accent: 'Local-first diagrams and mind maps.',
    footnote: 'In development · koxora.app',
  },
  de: {
    headline: 'Ideen nehmen Form an.',
    accent: 'Local-first-Diagramme und Mindmaps.',
    footnote: 'In Entwicklung · koxora.app',
  },
};
function iconMarkup(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><defs>${gradient}</defs>${mark}</svg>`;
}
function socialMarkup(locale) {
  const text = copy[locale];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Inter,DejaVu Sans,Arial,sans-serif">
  <defs>
    <linearGradient id="bg" x2="1" y2="1"><stop stop-color="#12122A"/><stop offset="1" stop-color="#080B16"/></linearGradient>
    <linearGradient id="accent" x2="1" y2="0"><stop stop-color="#BAA0FF"/><stop offset="1" stop-color="#70DAEF"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#5A3DA7" stop-opacity=".45"/><stop offset="1" stop-color="#5A3DA7" stop-opacity="0"/></radialGradient>
    ${gradient}
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="880" cy="300" r="430" fill="url(#glow)"/>
  <g transform="translate(92 100) scale(1.25)"><g transform="scale(1)">${mark}</g></g>
  <text x="212" y="162" fill="#F5F4FF" font-size="62" font-weight="700" letter-spacing="-3">koxora</text>
  <text x="92" y="340" fill="#F5F4FF" font-size="70" font-weight="700" letter-spacing="-3">${text.headline}</text>
  <text x="92" y="410" fill="url(#accent)" font-size="36" font-weight="600">${text.accent}</text>
  <text x="92" y="520" fill="#ADB4CE" font-size="26">Diagrams · Mindmaps · Data visualization</text>
  <text x="92" y="566" fill="#8F86C4" font-size="22">${text.footnote}</text>
</svg>`;
}
async function shoot(page, markup, width, height, file) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${markup}</body></html>`,
    { waitUntil: 'load' },
  );
  const buffer = await page.screenshot({ omitBackground: true, type: 'png' });
  await writeFile(resolve(outDir, file), buffer);
  return file;
}
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
try {
  await mkdir(outDir, { recursive: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const written = [
    await shoot(page, iconMarkup(180), 180, 180, 'icon-180.png'),
    await shoot(page, iconMarkup(512), 512, 512, 'icon-512.png'),
    await shoot(page, socialMarkup('en'), 1200, 630, 'og-en.png'),
    await shoot(page, socialMarkup('de'), 1200, 630, 'og-de.png'),
  ];
  console.log(`Brand images: ${written.join(', ')}`);
} finally {
  await browser.close();
}
