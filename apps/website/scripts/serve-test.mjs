// Starts both deployment variants used by the browser tests: the reviewed
// necessary-only build and a build that enables optional consent categories.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve-site.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await startServer({ dir: resolve(root, 'dist'), port: 4175 });
await startServer({ dir: resolve(root, 'dist-consent'), port: 4176 });
