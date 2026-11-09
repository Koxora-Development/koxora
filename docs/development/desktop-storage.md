# Configurable desktop project storage (#14)

References: CORE-001–006, CORE-010, CORE-015–017, OPS-001, OPS-007–009; [project storage](project-storage.md) and [storage ADR](../adr/0013-project-storage.md). This assignment implements storage controls for review; merge and release require separate Product Owner approval.

## Behavior and boundaries

A fresh desktop repository offers a project-data location before loading projects. Keep default acknowledges it once. An existing repository is used unchanged after upgrade; Settings · Storage remains available. English is the default; German is independently selectable, including onboarding. Browser IndexedDB is unchanged.

The bootstrap file `storage-v1.json` lives in Tauri's per-user **app_config_dir**, independently of snapshots and the WebView profile. For `app.koxora.studio`, defaults are:

| OS      | Bootstrap directory                               | Default project directory                                        |
| ------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| Linux   | `${XDG_CONFIG_HOME:-~/.config}/app.koxora.studio` | `${XDG_DATA_HOME:-~/.local/share}/app.koxora.studio/projects-v1` |
| Windows | `%APPDATA%\app.koxora.studio`                     | `%APPDATA%\app.koxora.studio\projects-v1`                        |
| macOS   | `~/Library/Application Support/app.koxora.studio` | `~/Library/Application Support/app.koxora.studio/projects-v1`    |

Choose a parent folder on a writable local disk; Koxora creates `projects-v1` below it. An existing target is rejected rather than merged. Settings shows the absolute effective path and opens it with the OS. Available-space reporting is explicitly unavailable; write/copy failures retain the source. No installer changes move data: AppImage and DMG have no wizard; NSIS uses the same first-run flow, avoiding installation-directory/data-directory confusion. Updates/uninstallation must retain user data. No installer-time selector is claimed.

## Migration, interruption and recovery

Every current-build repository operation holds the per-user bootstrap OS lock and rereads configuration. Migration holds legacy per-project write locks as well. Copying preserves **all project-data** regular files, including current/previous generations, recovery envelopes, trash metadata and pending files, without decoding/re-encoding archives. Only reserved top-level `<project-id>/write.lock` coordination files are omitted: source OS locks remain held through commit, and destination locks are recreated on first write. Unknown nested files with the same name are preserved. Source/destination bytes are compared in bounded buffers; each copied file is synchronized. Random destination-volume staging is renamed to the final repository, then the separate configuration is atomically replaced. Source files are never removed. The UI saves pending work first and clears the old workspace/history/token only after a successful switch, then refreshes discovery.

An interrupted copy leaves the old bootstrap authoritative. A published copy followed by failed/interrupted config replacement also leaves the old bootstrap authoritative. Restart normally, or explicitly select **Restore an existing projects-v1 folder**, choosing its parent, to activate the completed copy or retained old repository. Restore does not merge divergent repositories. Export important changes before restoring. An orphan `.koxora-migration-*` directory is never active; inspect it only with all instances closed, retain a backup, then remove it manually if unwanted. The persistent `.koxora-migration.lock` uses an OS lock, so process death releases ownership. No journal can silently activate a partial copy.

Configured missing media, corrupt bootstrap files and permissions errors fail closed; there is no fallback to an empty default. Reconnect the disk or restore another existing repository. If media disappears with unsaved work, export that in-memory work using Save As before restarting into the recovery selector; a failed save deliberately blocks switching that session. Keep the original repository and exports until acceptance.

Only writable **local filesystems** are supported. Network shares, cloud-sync directories, symlinks (including ancestors), special files and nested source/destination repositories are unsupported/rejected where detectable. Shares mounted as local paths cannot be reliably identified cross-platform; users must choose a local disk. Close all older builds before migration: they do not read bootstrap configuration and may continue writing their retained old repository after migration. Concurrent current builds coordinate per OS user; cross-user access to one repository is unsupported. Hostile same-user path replacement and storage-controller power-loss durability are outside the filesystem trust boundary. Windows and macOS packaging/filesystem acceptance is still required.

## Review packages and acceptance on CachyOS

Use this PR head's **Desktop foundation** artifact `unsigned-desktop-x86_64-unknown-linux-gnu`, containing `appimage/` and `deb/`. This is an unsigned review artifact, not a public release. Verify the Actions run commit matches the PR head; do not install the DEB on CachyOS. Extract the AppImage, `chmod +x` it, and run without sudo; use `--appimage-extract-and-run` if FUSE 2 is unavailable.

1. Back up `.koxora` exports. In a disposable OS user, launch offline, select German, choose a local folder on a secondary partition, and verify its `projects-v1` path. Restart: no onboarding; same path. Repeat Keep default in another disposable user.
2. In an existing installation, confirm no automatic move. Create three projects with multiple pages, assets and two save generations; trash one project. Export all important work.
3. Change location to an empty parent. During copying, controls remain blocked and progress is announced. Verify projects, trash, previous-save recovery, IDs and exports after restart offline. The original repository still exists. Save As must still choose an independent export destination.
4. Try a parent with an existing `projects-v1`, a symlink, a nested source folder, and a non-writable folder. Each failure must retain current data and show EN/DE feedback. Do not deliberately fill a real disk.
5. In disposable data only, terminate during copying, restart, and verify the old repository. If a final destination exists, use explicit Restore to activate it. Restore the retained original location once; no merge or overwrite occurs.
6. Close the app, disconnect the configured test disk, restart: storage recovery is offered; no new default project repository is silently created. Reconnect or restore a retained copy. Test keyboard-only dialog use and language switching.
7. Open two current builds where the OS permits it and attempt simultaneous saves/migration: conflicts must preserve source data. Older builds must be closed before migration.

Repeat first launch, migration, restore, offline restart and Save As on Windows NSIS and macOS Intel/ARM DMG before cross-OS acceptance. Real OS packaging is not established by browser mocks.

## Validation and independent review (2026-11-09)

- Eleven standalone Rust storage/location tests passed, including immutable generations, CAS races, copy integrity, previous generation recovery, collisions, symlink rejection, missing media, retained source, published-copy recovery and abandoned OS-lock files. Standalone Clippy with warnings denied passed; Rust formatting passed. The harness imports the production modules directly; full Tauri compilation initially stopped at missing host GLib development libraries.
- Ten Chromium/Firefox IPC-contract tests passed (storage plus native Save As). After adding language selection inside the modal, all four storage cases passed again in Chromium/Firefox. These cover EN/DE, offline restart, first-run persistence, failure retention and workspace reset; they do not certify OS dialogs.
- Independent agent diff review found and verified corrections for stale workspace after switching, crash-stale reservation files, path canonicalization/traversal bounds, legacy writer locks, native harness bootstrap, writable Windows sync handles, the post-publication commit boundary and modal language access. Final targeted review found no new blockers; no independent native OS tests were claimed.
- Full check initially exposed checkout permissions (`0600` from this environment's umask) on existing website screenshots. Restoring their ordinary readable modes changes no Git blobs. Final combined-check and native CI outcomes belong to the PR; no unrun packaging or OS acceptance is claimed here.

The first CI run built Linux AppImage/DEB and both macOS DMGs successfully and passed their native tests and Rust supply-chain gate. Windows exposed copying a held coordination lock; this is corrected with a reserved-path exclusion and a save/recovery regression. The native link browser mock now acknowledges storage bootstrap. Full local Linux Tauri testing passed 27 tests before this regression addition. Final rerun outcomes are recorded in the PR.
