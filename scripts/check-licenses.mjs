import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
// Review every installed JavaScript dependency, including optional native packages.
// Run pnpm's JavaScript entry directly so Windows does not need to execute pnpm.cmd.
if (!process.env.npm_execpath)
  throw new Error('Run this check through pnpm check:licenses');
const report = JSON.parse(
  execFileSync(
    process.execPath,
    [process.env.npm_execpath, 'licenses', 'list', '--json'],
    {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    },
  ),
);
const allowed = new Set([
  'MIT',
  'Apache-2.0',
  '(MIT OR Apache-2.0)',
  '(Apache-2.0 OR MIT)',
  'Apache-2.0 OR MIT',
  '(MIT OR CC0-1.0)',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'BlueOak-1.0.0',
  'Python-2.0',
  // MIT without its attribution clause: strictly fewer obligations than the
  // MIT above, which is already allowed. See docs/development/dependencies.md.
  'MIT-0',
]);
// Scoped exceptions reviewed in docs/development/dependencies.md.
const reviewed = {
  'CC-BY-4.0': new Set(['caniuse-lite']),
  'MPL-2.0': new Set([
    'lightningcss',
    'lightningcss-linux-x64-gnu',
    'lightningcss-linux-x64-musl',
    'lightningcss-linux-arm64-gnu',
    'lightningcss-linux-arm64-musl',
    'lightningcss-darwin-arm64',
    'lightningcss-darwin-x64',
    'lightningcss-win32-x64-msvc',
    'lightningcss-win32-arm64-msvc',
    'lightningcss-linux-arm-gnueabihf',
    'lightningcss-freebsd-x64',
  ]),
};
const failures = [];
let count = 0;
for (const [license, packages] of Object.entries(report)) {
  count += packages.length;
  if (!allowed.has(license)) {
    const unreviewed = packages.filter(
      (entry) => !reviewed[license]?.has(entry.name),
    );
    if (unreviewed.length)
      failures.push(
        `${license}: ${unreviewed.map((entry) => entry.name).join(', ')}`,
      );
  }
}
mkdirSync('node_modules/.cache/koxora', { recursive: true });
writeFileSync(
  'node_modules/.cache/koxora/dependency-licenses.json',
  JSON.stringify(report, null, 2) + '\n',
);
if (!count || failures.length) {
  console.error(
    failures.length ? failures.join('\n') : 'No dependency licenses found',
  );
  process.exit(1);
}
console.log(
  `PASS: ${count} JavaScript dependency license entries; report: node_modules/.cache/koxora/dependency-licenses.json`,
);
