# Phase 2.1 project model and local persistence

## Scope and boundaries

Phase 2.1 implements a shared native ZIP project format, local saves, creation/naming, import/export, reopen and previous-save recovery. The [format specification](../architecture/project-format.md) defines fields, versions, resource budgets, security and compatibility; [ADR 0013](../adr/0013-project-storage.md) records the architecture. The original JSON draft is superseded, with an explicit development migration path.

| Location                                       | Responsibility                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `packages/project`                             | Framework-independent model, runtime schema, secure ZIP profile, integrity, deterministic bytes and migration |
| `packages/persistence`                         | Atomic compare-and-swap repository; current/previous snapshots; IndexedDB/native adapters                     |
| `packages/studio/src/projects.tsx`             | Localized project controls and session state                                                                  |
| `apps/studio-desktop/src-tauri/src/storage.rs` | Native locking, generations, atomic binary export and interruption handling                                   |
| `packages/i18n`                                | English default/fallback and German interface resources                                                       |
| `tests/browser/projects.spec.ts`               | Production-shell project journeys and injected failure cases                                                  |

The model stores multiple documents/pages, layers, shapes/nodes, connections, relationships, mindmap/flowchart/UML/ER models, typed datasets, binaries, themes, templates, previews, declarative actions/animations, locale and namespaced future extensions. These are real validated storage structures. The minimal UI creates an empty document/page and edits the project name; it does not expose editors or renderers for all structures. No account, backend, network, cloud, AI or marketplace is required.

Fixtures are synthetic: `packages/project/fixtures/complete-v1.koxora` exercises all collections and future data; `legacy-json-v1.json` and `migrated-json-v1.koxora` form a deterministic migration pair. Normal file import accepts ZIP. Local draft snapshots migrate in memory and retain their original bytes on the next save.

## Local saves, conflicts, and recovery

Browser projects live in the `koxora-projects` IndexedDB database, in the `projects` object store keyed by project ID. The record contains current and previous serialized project snapshots. An IndexedDB transaction checks the expected record and commits its replacement atomically. Browser preferences and cached application assets are separate stores.

Desktop projects live below Tauri's application-data directory in `projects-v1/<project-id>/`. Each directory contains numbered `.snapshot` records and a `write.lock`; `pending.tmp` is ignored until a successful write becomes a snapshot. Native records are limited to 256 MiB. An OS lock coordinates native writers, and the expected record must still match before committing. The latest two generations are retained. These internal records are not portable `.koxora` exports and should not be manually edited.

The shared UI autosaves after 600 ms without another name edit and also offers **Save project**. Wait for **Saved on this device** before relying on local storage. A failed write keeps the session's unsaved project available for export. A conflict means another writer changed the record or an imported ID already exists; export your changes and reopen the current version, or explicitly import as a new project. No automatic merge or silent overwrite occurs.

**Recover previous save** requires confirmation. The restored content is saved through the same conflict check. The displaced current bytes remain as the previous backup, including unsupported or corrupt project content; another successful changed save advances that backup. A malformed native envelope can fall back to the preceding native generation when readable, retaining its original raw envelope in `recoverySource`. The browser cannot recover an entirely corrupted IndexedDB envelope from an independent filesystem generation. The UI cannot recover when the newest native record cannot be read because of invalid UTF-8, excessive size, or file-access failure: it leaves the source unchanged. A retained prior native generation or separate export may permit manual recovery. Deleted browser data and device loss can also prevent recovery. Keep `.koxora` exports separately.

Autosave cannot capture edits made immediately before a crash or before the write commits. There is no full operation log, unlimited history, checksum-based disk repair, or zero-keystroke-loss guarantee. Unsaved navigation warnings depend on the browser/webview and should not replace a verified save.

## Import and export

**Import .koxora** validates a chosen local file and commits it before switching the displayed project. A failed import leaves the current project visible. A duplicate project ID causes a localized conflict. Select **Import as a new project (new project ID)** when a separate copy is intended. This changes only the project ID; opaque extension references are not rewritten.

**Export .koxora** serializes the active in-memory project, including changes that have not saved locally. Browser downloads follow normal browser behavior. Desktop exports to the OS download directory using a unique filename and displays the resulting path. It writes and synchronizes a temporary file before publishing a complete export with an atomic, non-overwriting hard link. Filesystems without hard-link support produce a storage error; there is no fallback that overwrites a destination or exposes a partial final export. An interrupted export can leave a temporary file. Desktop has no native save-location dialog or in-place file overwrite in this milestone. Files are not uploaded, and imported content does not trigger network requests or script execution.

The source import file remains untouched. Exported files contain project content and extension data; the application adds no account tokens, storage paths, preference records, or runtime credentials. The format cannot identify secrets a user deliberately stores in arbitrary document content.

## Manual acceptance, including CachyOS

Use the repository-pinned Node/pnpm/Rust versions and locked dependencies from [foundation setup](foundation.md). All user content remains local.

### Browser

1. Run `pnpm install --frozen-lockfile`, `pnpm build`, then `pnpm preview`. Open the local preview in a fresh profile. English must be default even on a German OS, with no account prompt.
2. Create a project named `Portable 世界`; wait for **Saved on this device**. Reload and use **Open project**. Confirm the title survives.
3. Export `.koxora`. Inspect with `unzip -l FILE.koxora` and `unzip -p FILE.koxora manifest.json`: it must be a ZIP with version fields, indexes and stable IDs. Import into a second browser profile and export again. Unchanged exports should be byte-identical.
4. Import the same file in the original profile: expect a conflict and unchanged saved content. Enable **Import as a new project** and retry: expect a new project identity and separate list entry.
5. Import `complete-v1.koxora` in a fresh profile, export it, and compare bytes using `sha256sum`. The UI only shows the project title; the archive retains all additional documents, dataset, binary assets and extensions.
6. Rename and save, then choose **Recover previous save**, confirm, reload and verify the previous title. Cancel recovery once to verify no replacement occurs.
7. Wait for service-worker activation, disconnect networking, reload, reopen, rename, save and export. Use production preview for this test; development mode does not provision an offline shell.
8. Select German, then English. Controls/errors change language; document titles, locale metadata and payloads remain unchanged.
9. Import a truncated ZIP, a non-ZIP text file, and an unsupported required version. Expect a localized error, with a structural location when available, and an unchanged active project. Automated tests cover quota and limits; do not fill a real disk deliberately.
10. Open a saved project in two tabs. Save in the first, then edit the second. Expect a conflict with unsaved changes still exportable; reopening shows the first writer's saved state.

### CachyOS AppImage

Use the artifact from **the current PR commit's successful Desktop foundation run**, not a Phase 1 or old JSON build. The workflow artifact is named `unsigned-desktop-x86_64-unknown-linux-gnu` and contains both `appimage/` and `deb/` bundle directories. The DEB is not the CachyOS installation path.

1. Open PR #10 → Checks → Desktop foundation → successful run → Artifacts. Download the Linux artifact ZIP and extract it into a new directory. Verify the run's commit matches the PR head. Artifacts expire after seven days; an expired artifact requires a new workflow run.
2. In a terminal inside the extracted directory, locate the AppImage with `find . -name '*.AppImage' -type f`. Set its executable bit with `chmod +x ./appimage/ACTUAL_FILE.AppImage`, then run `./appimage/ACTUAL_FILE.AppImage`. Replace the placeholder with the actual filename. These are unsigned review builds.
3. If the host reports missing FUSE, install the distribution's FUSE 2 compatibility package according to CachyOS guidance, or run `./appimage/ACTUAL_FILE.AppImage --appimage-extract-and-run`. Record which route was used. Do not use `sudo` to launch the app.
4. Create/name/save a project, close the process, launch again, reopen and verify it. Export and confirm the reported file exists in Downloads and passes `unzip -t FILE.koxora`.
5. Import that export in the browser; import a browser export and `complete-v1.koxora` in the AppImage. Export the unchanged fixture and compare its SHA-256 with the repository fixture. This tests actual native IPC and binary fidelity.
6. Repeat rename/recovery, cancelled confirmations, invalid archive import, English/German switching and offline restart. Confirm that failure leaves the active project and source file intact.
7. Keep exports before testing failure conditions. Native snapshots are under Tauri's app-data location in `projects-v1`; do not edit/delete a real user's records. A storage failure can be tested only in a disposable OS profile or test directory.

Repeat native creation/restart/export/import/recovery on Windows NSIS and both macOS DMG architectures. Linux browser tests do not certify system webviews, dialogs, package startup or filesystem behavior on those systems.

## Automated verification

```sh
pnpm check
pnpm build
pnpm audit --audit-level high
pnpm test:e2e
```

From `apps/studio-desktop/src-tauri`:

```sh
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
cargo deny --locked check licenses advisories sources
```

Unit tests cover all collections, deterministic golden bytes, Unicode, compatible future fields, optional resources, hashes, malformed ZIP/JSON, unsafe paths, duplicate entries/indexes, resource limits and lying DEFLATE headers, references, domain models, migration, persistence conflicts and recovery. Native tests additionally export the complete binary fixture and verify byte equality. Browser tests use real IndexedDB and the production offline shell.

Local revision validation on 2026-10-21:

| Check                                                | Observed result                                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Unit suite                                           | 89 passed; full `pnpm check` passed (TypeScript, lint, formatting, docs, 453 license records) |
| Chromium desktop and mobile-emulation browser suites | 20 passed against the ZIP production build                                                    |
| Standalone native storage                            | 7 passed, including complete ZIP export fidelity                                              |
| Full native build and cross-OS packages              | Awaiting the final commit's CI matrix                                                         |

The local browser tests use installed Chromium because the Playwright CDN was blocked in this environment. Mobile coverage is Chromium device emulation, not a physical iOS device. The standalone Rust checks cover storage, not full Tauri integration. Full local native commands require GLib/GObject/WebKit development prerequisites that were unavailable at the prior check; final attempts and CI evidence must remain distinct.

### CI diagnosis

Initial Quality run 39630608405 and Desktop run 39630608263 failed before checkout with no runner or executed steps. The Product Owner supplied the exact annotation: “The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings”. The additional macOS queue-capacity warning was separate. The workflow definitions matched the working Phase 1 baseline; no tests or matrix jobs were disabled.

After the Product Owner made the repository public, Quality run 39630608405 succeeded on the old PR commit. This confirms recovery for that run, not validation of the ZIP revision. The new commit must pass Quality and the complete native matrix and supply downloadable Linux DEB/AppImage, Windows NSIS and both macOS DMGs before acceptance.

## Limitations

- No full interactive canvas, domain editor, dataset editor or action/animation runtime is included. Stored values remain inert.
- ZIP32 STORE/DEFLATE is the supported profile; encryption, ZIP64 and arbitrary legacy ZIP metadata are deliberately rejected. DEFLATE import requires a supporting standard compression API in the host webview.
- Whole-project parsing and base64 snapshot transport consume multiple buffers and run on the calling thread; limits bound work but do not guarantee responsiveness on every low-memory device.
- Browser eviction/clearing, device loss and private-storage restrictions remain reasons to keep portable backups. Recovery is bounded, not unlimited history.
- Native export uses hard links and Downloads; unsupported filesystems fail explicitly. No native destination picker or overwrite-in-place workflow is supplied.
- There is no complete RTL editor, accessibility certification, archive authenticity signature or guarantee of power-loss durability on every filesystem.
- No dependency upgrades or changes to Dependabot PRs #3–#9 are included. Audit and license results apply to the repository's existing dependency baseline.
