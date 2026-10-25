import { defineConfig, devices } from '@playwright/test';
// Browser tests for the public marketing website. The web server builds both
// deployment variants the consent tests need: the reviewed necessary-only
// build on port 4175 and a build with optional consent categories on 4176.
const engines = process.env.KOXORA_BROWSERS === 'all';
export default defineConfig({
  testDir: './tests/website',
  outputDir: './node_modules/.cache/koxora/website-results',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: 'node_modules/.cache/koxora/website-report',
      },
    ],
  ],
  use: {
    // The site follows the operating system until a reader chooses, so the
    // suite fixes a baseline; the test that covers the light preference
    // overrides it explicitly.
    colorScheme: 'dark',
    baseURL: 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 834, height: 1112 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    ...(engines
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
  webServer: {
    command:
      'pnpm --filter @koxora/website build && pnpm --filter @koxora/website build:consent-demo && pnpm --filter @koxora/website preview:test',
    url: 'http://127.0.0.1:4176/en/',
    // Always rebuild and restart: reusing a leftover server would test the
    // previous build without running the build command at all.
    reuseExistingServer: false,
    timeout: 180000,
  },
});
