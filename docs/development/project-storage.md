# Phase 2.1 project model and local persistence

## Scope

Phase 2.1 adds project creation and naming, runtime validation, local saves, reopening, `.koxora` import/export, previous-save recovery, and tests. It extends the shared shell from [Phase 1](foundation.md). It does not implement the interactive canvas, advanced diagram engines, cloud synchronization, accounts, collaboration, AI, or marketplace features.

The [storage ADR](../adr/0013-project-storage.md) records the proposed JSON profile and its deviations from the earlier ZIP specification. Architecture approval and merge authorization remain with the Product Owner.

| Location                                       | Responsibility                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `packages/project`                             | Framework-independent types, runtime schema, deterministic JSON, version compatibility, migration infrastructure, golden fixture |
| `packages/persistence`                         | Shared repository, atomic comparison contract, current/previous records, IndexedDB and native adapters                           |
| `packages/studio/src/projects.tsx`             | Localized project controls and session state; selects the platform adapter                                                       |
| `apps/studio-desktop/src-tauri/src/storage.rs` | Native snapshot files, locking, interrupted-write behavior, and file export                                                      |
| `packages/i18n/src/locales`                    | English default/fallback and German project controls, errors, and guidance                                                       |
| `tests/browser/projects.spec.ts`               | User journeys through real browser storage and the production offline shell                                                      |

This supplies partial foundations for CORE-001 through CORE-007, CORE-009, CORE-010, CORE-012, and CORE-014 through CORE-019. The model supports multiple pages and arbitrary type/kind labels; the UI creates one empty diagram page and edits the project name only. It does not claim completed diagram editing, page-management controls, public API stability, or accessibility certification.

## Supported file profile

A `.koxora` file is UTF-8 JSON, up to 8 MiB. It is not a ZIP archive. `packages/project/fixtures/v1.koxora` is the synthetic golden file for this profile.

| Object     | Required fields                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Project    | `format`, `schemaVersion`, `minReaderVersion`, `projectId`, `title`, `createdAt`, `updatedAt`, `requiredFeatures`, `pages`, `extensions` |
| Page       | `id`, `type`, `title`, `nodes`, `connections`, `extensions`                                                                              |
| Node       | `id`, `kind`, `x`, `y`, `extensions`                                                                                                     |
| Connection | `id`, `sourceId`, `targetId`, `extensions`                                                                                               |

New projects use `format: "koxora-project"`, schema/reader `1.0.0`, UUID v4 IDs, UTC timestamps with milliseconds, and `nodes`/`connections` as required features. IDs are unique across all modeled objects in a project. Connection endpoints must exist on their own page. Node positions are finite JSON numbers; coordinate units, sizing, rendering, and layout semantics remain future decisions.

Every object can retain additional JSON fields. Use `extensions` for namespaced optional metadata. Unknown optional fields and unknown page/node types survive a compatible round trip without being interpreted. Unsupported required features or versions fail before an import can replace the active project. Version compatibility and migration behavior are defined in the ADR; no pre-v1 format migration is shipped.

Limits also include 64 nesting levels, 200,000 traversed JSON values, and 1–1,000 pages. Names and type labels must contain non-whitespace text and be at most 1,024 UTF16 code units. Duplicate JSON keys, unsafe prototype-related keys, non-JSON values, and invalid references are rejected. Numbers use binary64 semantics, with safe integers only; encode high-precision values as strings. Serialization preserves JSON meaning, not the source formatting or numeric spelling.

## Local saves, conflicts, and recovery

Browser projects live in the `koxora-projects` IndexedDB database, in the `projects` object store keyed by project ID. The record contains current and previous serialized project snapshots. An IndexedDB transaction checks the expected record and commits its replacement atomically. Browser preferences and cached application assets are separate stores.

Desktop projects live below Tauri's application-data directory in `projects-v1/<project-id>/`. Each directory contains numbered `.snapshot` records and a `write.lock`; `pending.tmp` is ignored until a successful write becomes a snapshot. Native records are limited to 40 MiB. An OS lock coordinates native writers, and the expected record must still match before committing. The latest two generations are retained. These internal records are not portable `.koxora` exports and should not be manually edited.

The shared UI autosaves after 600 ms without another name edit and also offers **Save project**. Wait for **Saved on this device** before relying on local storage. A failed write keeps the session's unsaved project available for export. A conflict means another writer changed the record or an imported ID already exists; export your changes and reopen the current version, or explicitly import as a new project. No automatic merge or silent overwrite occurs.

**Recover previous save** requires confirmation. The restored content is saved through the same conflict check. The displaced current bytes remain as the previous backup, including unsupported or corrupt project content; another successful changed save advances that backup. A malformed native envelope can fall back to the preceding native generation when readable, retaining its original raw envelope in `recoverySource`. The browser cannot recover an entirely corrupted IndexedDB envelope from an independent filesystem generation. The UI cannot recover when the newest native record cannot be read because of invalid UTF-8, excessive size, or file-access failure: it leaves the source unchanged. A retained prior native generation or separate export may permit manual recovery. Deleted browser data and device loss can also prevent recovery. Keep `.koxora` exports separately.

Autosave cannot capture edits made immediately before a crash or before the write commits. There is no full operation log, unlimited history, checksum-based disk repair, or zero-keystroke-loss guarantee. Unsaved navigation warnings depend on the browser/webview and should not replace a verified save.

## Import and export

**Import .koxora** validates a chosen local file and commits it before switching the displayed project. A failed import leaves the current project visible. A duplicate project ID causes a localized conflict. Select **Import as a new project (new project ID)** when a separate copy is intended. This changes only the project ID; opaque extension references are not rewritten.

**Export .koxora** serializes the active in-memory project, including changes that have not saved locally. Browser downloads follow normal browser behavior. Desktop exports to the OS download directory using a unique filename and displays the resulting path. It writes and synchronizes a temporary file before publishing a complete export with an atomic, non-overwriting hard link. Filesystems without hard-link support produce a storage error; there is no fallback that overwrites a destination or exposes a partial final export. An interrupted export can leave a temporary file. Desktop has no native save-location dialog or in-place file overwrite in this milestone. Files are not uploaded, and imported content does not trigger network requests or script execution.

The source import file remains untouched. Exported files contain project content and extension data; the application adds no account tokens, storage paths, preference records, or runtime credentials. The format cannot identify secrets a user deliberately stores in arbitrary document content.

## Manual acceptance

Start with the [existing development prerequisites](foundation.md). Use the repository-pinned pnpm and locked dependencies.

1. Run `pnpm install --frozen-lockfile`, then `pnpm build` and `pnpm preview`. Open the local preview with a fresh browser profile. Confirm English is selected even if the operating system is German; no account is requested.
2. Select **New project**, name it `Portable 世界`, and wait for **Saved on this device**. Select **Save project**. Reload, then select **Open project** in the local list and confirm the name survives.
3. Export the project. Verify the `.koxora` file is readable JSON with a format version and stable project/page IDs. Import it into a different browser profile or supported desktop build. Export again and compare the project data.
4. Import the same file into the original profile. Confirm the conflict message and unchanged existing project. Enable **Import as a new project**, import again, and confirm that a separate list entry is created with a different project ID.
5. Rename a saved project, wait for the saved status, then choose **Recover previous save** and confirm. Verify the earlier title returns and the restored state persists after reload.
6. Wait for the preview service worker to activate, disconnect networking, reload, and reopen the project. Rename, save, and export while offline. Development-server mode does not provision the offline shell.
7. Select German, reopen and export a project, then switch back to English. Check controls and errors change language while existing project titles and extension data remain unchanged.
8. Try an invalid JSON file, a file with a newer required reader version, and an oversized file. Confirm an understandable error and retention of the active project. Browser integration tests also inject quota failures and concurrent-tab conflicts; do not deliberately exhaust a real user's disk for manual testing.
9. On Linux, Windows, and macOS, run the desktop build with native prerequisites installed. Repeat creation, restart/reopen, export, import, and recovery. Confirm the exported path and contents. Exercise cancellation of replacement/recovery prompts, keyboard operation, and unsaved-window closing in the actual system webview.

For the conflict case, open one saved project in two tabs, save a changed title in the first, then edit the second. The second must report a conflict and keep its unsaved text available for export. Refresh/reopen should show the first tab's committed data.

## Automated checks and evidence

Run the existing checks from the repository root:

```sh
pnpm check
pnpm build
pnpm audit --audit-level high
pnpm test:e2e
```

For native checks, run from `apps/studio-desktop/src-tauri`:

```sh
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
cargo deny --locked check licenses advisories sources
```

The unit suites cover deterministic golden serialization, Unicode and generated graph round trips, compatible extensions, versions, reference validation, parser limits, synthetic migrations, conflicts, storage failure, previous-save recovery, unsupported-head preservation, corrupt-envelope generation fallback, and per-record read failures. Browser scenarios exercise real IndexedDB, export/import, offline reopening, German controls, quota injection, two tabs, and recovery. The six native storage tests exercise committed generations, ignored temporary files, a malformed-head backup, concurrent writers, failed-write retention, path rejection, atomic non-overwriting export publication, and isolation of damaged project directories.

Local validation on 2026-10-21:

| Check                                                                 | Result                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                          | Passed: TypeScript, ESLint, Prettier, 30 unit tests, documentation validation, and license checks for 453 dependency records          |
| `pnpm build`                                                          | Passed; main JavaScript output 243.80 kB, 76.62 kB gzip                                                                               |
| `pnpm audit --audit-level high`                                       | No known vulnerabilities reported for the existing locked dependency baseline                                                         |
| Chromium and mobile Chromium Playwright projects                      | 20 tests passed: 18 in the full regression run plus 2 added blocked-storage/confirmation cases                                        |
| Rust 1.93.1 standalone storage tests                                  | Six tests passed using `rustc --test` on the native storage module                                                                    |
| Standalone native storage Clippy                                      | Passed with `clippy-driver --test -D warnings`                                                                                        |
| `cargo fmt --check`                                                   | Passed                                                                                                                                |
| Full `cargo test --locked` and `cargo clippy --locked -- -D warnings` | Blocked by missing GLib/GObject development libraries discovered through pkg-config; package installation privileges were unavailable |
| `cargo deny --locked check licenses advisories sources`               | Tool unavailable locally; remains a separate CI check                                                                                 |
| Firefox and WebKit local runs                                         | Not run: Playwright browser download failed with HTTP 403 from the environment's network policy                                       |

The browser runs used the installed Chromium because Playwright's browser CDN was blocked. The representative mobile project uses Chromium device emulation, not an iOS device or native Safari. The standalone native checks exercise storage code, not Tauri IPC, a running desktop webview, installers, or cross-OS behavior. The full native build remains unverified locally. Independent review examined the implementation and prompted the corruption, compatibility, and isolation regression cases. Remote GitHub Actions results are separate evidence and must be checked on the delivery PR; no remote CI pass is implied by this table.

No external package upgrades are part of this milestone. The lockfile changes link new internal workspace packages. Dependabot PRs #3–#9 are separate maintenance work. Any audit result from this branch applies to the existing dependency baseline and must be reported separately from whether the new project code passes functional checks.

## Known limits and follow-up work

- The JSON profile deliberately defers the planned ZIP container, binary assets, datasets, archive encryption, and old-version export. Its compatibility contract needs Product Owner review.
- The shared domain model is tested independently of UI and OS APIs. Native app startup, IPC, dialogs, installers, and platform-specific durability still require actual native validation; browser tests do not certify them.
- Browser quotas, private-browsing restrictions, eviction, clearing site data, and device loss remain reasons to keep exports. No browser persistent-storage permission is requested automatically.
- Only a bounded previous-save recovery path exists. It cannot repair every corrupt or inaccessible storage record, and successful repeated edits advance the retained history.
- The entire bounded project is parsed/serialized in memory. Large-file streaming, worker parsing, project search, deletion controls, canvas tools, node/page editing controls, undo/redo, and advanced performance work are outside this slice.
- English and German are supported through the existing resources. Unicode content is retained, but a complete RTL editor and full accessibility certification are not claimed.
