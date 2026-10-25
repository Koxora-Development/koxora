// Starts both deployment variants used by the browser tests: the reviewed
// necessary-only build and a build that enables optional consent categories.
// A port conflict fails loudly instead of leaving a half-started pair behind.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve-site.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const variants = [
  {
    dir: resolve(root, 'dist'),
    port: Number(process.env.KOXORA_SITE_PORT ?? 4175),
  },
  {
    dir: resolve(root, 'dist-consent'),
    port: Number(process.env.KOXORA_CONSENT_PORT ?? 4176),
  },
];
try {
  for (const variant of variants) await startServer(variant);
} catch (error) {
  console.error(
    `Could not start the preview servers on ports ${variants
      .map((variant) => variant.port)
      .join(' and ')}: ${String(error)}`,
  );
  process.exit(1);
}
