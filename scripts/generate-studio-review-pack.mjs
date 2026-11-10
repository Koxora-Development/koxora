// Synthetic local acceptance data. No user files, accounts or network are involved.
import { createServer } from 'vite';
import { lstat, mkdir, open, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(
  process.argv[2] ??
    resolve(root, 'node_modules/.cache/koxora/studio-review-pack'),
);
await mkdir(output, { recursive: true });
const destinationInfo = await lstat(output);
if (
  destinationInfo.isSymbolicLink() ||
  !destinationInfo.isDirectory() ||
  (await readdir(output)).length
) {
  throw new Error(
    'Choose a fresh, empty output directory; existing data is never overwritten.',
  );
}
async function writeFresh(name, bytes) {
  const file = await open(resolve(output, name), 'wx', 0o644);
  try {
    await file.writeFile(bytes);
    await file.chmod(0o644);
  } finally {
    await file.close();
  }
}
const server = await createServer({
  root,
  configFile: false,
  server: { middlewareMode: true, hmr: false, watch: null },
  ssr: { noExternal: [/^@koxora\//] },
});
try {
  const model = await server.ssrLoadModule('/packages/project/src/index.ts');
  const core = await server.ssrLoadModule('/packages/editor-core/src/index.ts');
  const now = '2026-11-09T00:00:00.000Z';
  let sequence = 1000;
  const id = () =>
    `00000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`;
  function diagram(title) {
    let project = model.createProject(title, id, now);
    const doc = project.documents[0],
      page = doc.pages[0];
    for (const [i, x] of [0, 500, 1600].entries())
      project = core.applyEdit(
        project,
        doc.id,
        page.id,
        {
          type: 'insert',
          id: id(),
          kind: 'rectangle',
          position: { x, y: i * 450 },
          layerId: page.layers[0].id,
          text: [
            'Other project / Anderes Projekt',
            'Local target / Lokales Ziel',
            'Far destination / Fernes Ziel',
          ][i],
        },
        now,
      );
    project = core.applyWorkbook(
      project,
      {
        type: 'newPage',
        documentId: doc.id,
        title: 'Second page / Zweite Seite',
      },
      id,
      now,
    );
    return core.selectPage(project, doc.id, page.id);
  }
  function linked(project, index, target) {
    const doc = project.documents[0],
      page = doc.pages[0];
    return core.applyEdit(
      project,
      doc.id,
      page.id,
      {
        type: 'link',
        id: page.nodes[index].id,
        link: { target, actionId: id() },
      },
      now,
    );
  }
  const hashes = [];
  async function put(name, bytes) {
    await writeFresh(name, bytes);
    hashes.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
  }
  async function archive(name, project) {
    // Navigation helpers update the manifest clock; normalize it for reproducibility.
    const normalized = {
      ...project,
      manifest: { ...project.manifest, createdAt: now, updatedAt: now },
    };
    const bytes = await model.exportProject(normalized);
    await model.importProject(bytes);
    await put(name, bytes);
  }
  const destination = diagram('Destination / Ziel');
  const target = destination.documents[0].pages[0];
  const lockedLayer = {
    id: id(),
    title: 'Locked destination / Gesperrtes Ziel',
    visible: true,
    locked: true,
    extensions: {},
  };
  target.layers.push(lockedLayer);
  target.nodes[2].layerId = lockedLayer.id;
  await archive('destination.koxora', destination);
  let source = diagram('Navigation source / Navigationsquelle');
  const page = source.documents[0].pages[0];
  source = linked(source, 0, {
    type: 'project',
    projectId: destination.manifest.projectId,
    pageId: target.id,
    elementId: target.nodes[2].id,
  });
  source = linked(source, 1, {
    type: 'element',
    pageId: page.id,
    elementId: page.nodes[2].id,
  });
  await archive('navigation-source.koxora', source);
  await archive('Plan 世界 & 100%.koxora', source);
  const located = diagram('Located destination / Wiedergefundenes Ziel');
  let missing = diagram('Missing destination / Fehlendes Ziel');
  missing = linked(missing, 0, {
    type: 'project',
    projectId: located.manifest.projectId,
    pageId: located.documents[0].pages[0].id,
    elementId: located.documents[0].pages[0].nodes[2].id,
  });
  await archive('missing-source.koxora', missing);
  await archive('locate-me.koxora', located);
  const complete = await model.importProject(
    new Uint8Array(
      await readFile(
        resolve(root, 'packages/project/fixtures/complete-v1.koxora'),
      ),
    ),
  );
  for (const letter of ['A', 'B', 'C'])
    await archive(`storage-${letter}.koxora`, {
      ...complete,
      manifest: {
        ...complete.manifest,
        projectId: id(),
        title: `Storage ${letter} / Speicher ${letter}`,
        createdAt: now,
        updatedAt: now,
      },
    });
  await put(
    'invalid.koxora',
    Buffer.from('Intentionally invalid archive for negative acceptance.\n'),
  );
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  await put(
    'README.txt',
    Buffer.from(
      `Koxora Studio synthetic review pack\nSource commit: ${commit}\n\nNo personal data or credentials. Keep real work backed up.\n\nStorage PR #52: import storage-A/B/C, rename/save each twice, trash one, then migrate, restart offline and recover a previous save. The fixtures include the full golden-format collections and binary assets.\n\nOpening PR #53: use any storage archive with double-click/Open With cold and warm, multiple files, spaces/Unicode/punctuation. Plan 世界 & 100%.koxora has the same identity as navigation-source.koxora deliberately: unchanged reopen is idempotent; changed local data must require explicit copy. invalid.koxora must fail without replacing work.\n\nNavigation PR #54: import destination.koxora then navigation-source.koxora. Select the first source element and Open link: it should open and highlight a locked foreign destination without editable selection. The second source element centers/selects a distant local target. Import missing-source.koxora without locate-me.koxora first: follow reports missing; use explicit Locate/import for locate-me.koxora, return to missing-source, and follow again. No archive is searched automatically.\n\nEach PR is based independently on main. Use its matching unsigned AppImage artifact; the fixture pack contains no executable and is not a release. New optional navigation extensions remain inert in older readers. Follow the complete EN/DE/offline/negative steps in each PR's development guide.\n\nVerify files with: sha256sum -c SHA256SUMS\n`,
    ),
  );
  await writeFresh('SHA256SUMS', hashes.sort().join('\n') + '\n');
  console.log(
    `Wrote ${hashes.length} verified synthetic review files to ${output}`,
  );
} finally {
  await server.close();
}
