import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testDir: './tests/performance',
  workers: 1,
  retries: 0,
  projects: [base.projects![0]],
  timeout: 90000,
});
