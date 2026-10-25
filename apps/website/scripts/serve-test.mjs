// Starts both deployment variants used by the browser tests: the reviewed
// necessary-only build and a build that enables optional consent categories.
// A port conflict fails loudly instead of leaving a half-started pair behind.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve-site.mjs';
import { startContactStub } from './serve-contact-stub.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contactStubPort = Number(process.env.KOXORA_CONTACT_STUB_PORT ?? 4178);
const variants = [
  {
    dir: resolve(root, 'dist'),
    port: Number(process.env.KOXORA_SITE_PORT ?? 4175),
    // The contact endpoint answers on the site's own origin, as it does in
    // production, so the browser tests exercise a same-origin submission.
    contactProxy: `http://127.0.0.1:${contactStubPort}/api/contact`,
  },
  {
    dir: resolve(root, 'dist-consent'),
    port: Number(process.env.KOXORA_CONSENT_PORT ?? 4176),
  },
];
const previewOrigin = `http://127.0.0.1:${variants[0].port}`;
try {
  for (const variant of variants) await startServer(variant);
  // The stand-in for the delivery service, so the browser tests can submit
  // the form for real. It sends no mail.
  await startContactStub({
    port: contactStubPort,
    allowedOrigins: [previewOrigin, `http://127.0.0.1:${variants[1].port}`],
    resultBase: previewOrigin,
    // Generous on purpose: the suite submits the form many times, and the
    // rate-limited answer is exercised by mocking that response rather than
    // by exhausting a real allowance.
    perClient: 200,
  });
} catch (error) {
  console.error(
    `Could not start the preview servers on ports ${variants
      .map((variant) => variant.port)
      .join(' and ')}: ${String(error)}`,
  );
  process.exit(1);
}
