import { defineConfig, devices } from '@playwright/test';
// Asset generation, not a test suite: it drives the real studio to capture the
// screenshots the public website shows. Run it on demand with
// `pnpm exec playwright test --config playwright.assets.config.ts`.
export default defineConfig({
  testDir: './tests/assets',
  outputDir: './node_modules/.cache/koxora/asset-results',
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'pnpm --filter @koxora/studio-web build && pnpm --filter @koxora/studio-web preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 180000,
  },
});
