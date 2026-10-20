import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.KOXORA_DESKTOP
      ? []
      : [
          VitePWA({
            registerType: 'prompt',
            manifest: false,
            workbox: {
              clientsClaim: true,
              globPatterns: ['**/*.{js,css,html,svg}'],
              navigateFallbackDenylist: [/^\/api\//],
            },
          }),
        ]),
  ],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
