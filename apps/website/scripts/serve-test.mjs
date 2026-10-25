// Starts both deployment variants used by the browser tests: the reviewed
// necessary-only build and a build that enables optional consent categories.
// A port conflict fails loudly instead of leaving a half-started pair behind.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve-site.mjs';
import { startContactEndpoint } from './serve-contact-php.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contactPort = Number(process.env.KOXORA_CONTACT_PORT ?? 4178);
const variants = [
  {
    dir: resolve(root, 'dist'),
    port: Number(process.env.KOXORA_SITE_PORT ?? 4175),
    // The contact endpoint answers on the site's own origin, as it does in
    // production, so the browser tests exercise a same-origin submission.
    contactProxy: `http://127.0.0.1:${contactPort}/api/contact`,
  },
  {
    dir: resolve(root, 'dist-consent'),
    port: Number(process.env.KOXORA_CONSENT_PORT ?? 4176),
  },
];
const previewOrigin = `http://127.0.0.1:${variants[0].port}`;
try {
  for (const variant of variants) await startServer(variant);
  // The real endpoint, so the browser tests submit the form to the code that
  // runs in production. Only the mail server is replaced.
  await startContactEndpoint({
    port: contactPort,
    allowedOrigins: [previewOrigin, `http://127.0.0.1:${variants[1].port}`],
    resultBase: previewOrigin,
  });
} catch (error) {
  console.error(
    `Could not start the preview servers on ports ${variants
      .map((variant) => variant.port)
      .join(' and ')}: ${String(error)}`,
  );
  process.exit(1);
}
