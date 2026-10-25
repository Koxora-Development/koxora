import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    // Application tests run in the node environment: anything that needs a
    // document has to inject it, as the website tests do with storage.
    include: ['packages/**/*.test.{ts,tsx}', 'apps/**/src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'apps/*/src-tauri/**'],
    maxWorkers: 2,
  },
});
