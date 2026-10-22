// Run against a production preview server: node scripts/capture-studio.mjs
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const directory = 'docs/design/screenshots';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Europe/Berlin',
  });
  page.setDefaultTimeout(30000);
  await page.clock.setFixedTime(new Date('2026-10-22T10:00:00Z'));
  await page.goto(process.env.KOXORA_PREVIEW_URL || 'http://127.0.0.1:4174');
  await page
    .getByRole('combobox', { name: 'Appearance', exact: true })
    .selectOption('dark');
  await page
    .getByRole('button', { name: 'New project', exact: true })
    .waitFor({ state: 'visible' });
  await page.screenshot({
    path: `${directory}/dashboard-empty-dark.png`,
    fullPage: true,
  });
  for (const title of [
    'Research & discovery',
    'Ideas for the next chapter',
    'Product launch · 2027',
  ]) {
    await page
      .getByRole('button', { name: 'New project', exact: true })
      .click();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Project name' }).fill(title);
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    await page.getByRole('button', { name: /Local projects/ }).click();
  }
  await page.screenshot({
    path: `${directory}/dashboard-dark.png`,
    fullPage: true,
  });
  await page
    .locator('.project-card.active')
    .getByRole('button', { name: 'Open project', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Project name' }).waitFor();
  await page.screenshot({
    path: `${directory}/workspace-dark.png`,
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Import .koxora', exact: true })
    .click();
  await page.screenshot({
    path: `${directory}/import-dark.png`,
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await page
    .getByRole('combobox', { name: 'Appearance', exact: true })
    .selectOption('light');
  await page.screenshot({
    path: `${directory}/workspace-light.png`,
    fullPage: true,
  });
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('de');
  await page
    .getByRole('combobox', { name: 'Darstellung', exact: true })
    .selectOption('dark');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({
    path: `${directory}/workspace-small-de.png`,
    fullPage: true,
  });
} finally {
  await browser.close();
}
