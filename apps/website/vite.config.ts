import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The public website ships static HTML produced by `scripts/emit-site.mjs`.
// This configuration only builds the stylesheet and the small progressive
// enhancement bundle; React is used for rendering at build time, not shipped.
export default defineConfig(({ isSsrBuild }) => ({
  appType: 'mpa',
  plugins: [react()],
  build: {
    // The renderer bundle is a build tool: it needs no manifest and must not
    // duplicate the published images.
    manifest: !isSsrBuild,
    copyPublicDir: !isSsrBuild,
    assetsDir: 'assets',
    cssMinify: true,
    rollupOptions: { input: 'src/client/main.ts' },
  },
  clearScreen: false,
}));
