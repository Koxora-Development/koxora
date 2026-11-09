# Native .koxora opening (#35)

References: CORE-001–006, CORE-010, CORE-015–017, OPS-001/003/007–009; [project storage](project-storage.md), [native format](../architecture/project-format.md) and [dependency review](dependencies.md). Prepared under the 2026-11-09 assignment, independently of the #14 branch. Merge and release require explicit Product Owner approval.

## Opening contract

The desktop uses one main window. Cold-launch CLI arguments, warm-launch arguments delivered by the official Tauri single-instance plugin, macOS file URLs, native picker selections and native window drops feed one bounded native queue. File paths never become a general webview filesystem API. The main window consumes at most one request at a time. Requests remain queued until acknowledged; invalid requests offer Cancel to skip and continue, or Retry/import-as-copy where applicable. At most 32 pending files are accepted; overflow is explicitly reported. Paths containing spaces, Unicode or shell punctuation are data, never shell commands.

Native reads accept regular absolute `.koxora` files, case-insensitive extension, at most 64 MiB. Leaf symlinks and non-files are rejected with an actionable error; choose the regular target instead. Missing/read-only/corrupt/future-version files are handled without overwriting the external source. Shared `importProject` validates format/schema/integrity/resource budgets. All sources use the same `importBytes` repository pipeline. Reopening an unchanged archive with an existing local identity is idempotent; a changed archive with an existing identity requires explicit import-as-copy. No automatic import overwrite or archive execution occurs. Picker copy intent is retained in the queue.

Before an OS/drop request switches projects, current changes and canvas state are saved through compare-and-swap. Failure leaves the active workspace available for Save As and holds the request for retry/cancel. Operations, confirmations and the native picker serialize opening; no multiple-window editing or external-file autosave is introduced. Autosave remains internal; Save As remains an independent explicit export. Native IPC read/ack errors are visible and polling backs off. A queued path is reread after webview reload while the native process remains alive; files changed externally can produce a different validated import. Successful imports retry acknowledgment without repeating a copy. The queue is in memory: process restart loses pending requests, so reopen unprocessed files explicitly. No durable background-import claim is made.

Browser/PWA supports visible `.koxora` drop instructions, validation and sequential local opening with pause/retry/copy/cancel after failures. The browser picker remains available. Browser OS association is not promised. EN/DE messages, deliberate confirmation/copy choices and ordinary keyboard-accessible dialogs apply to both paths. Everything works offline after installation/provisioning.

## Platform registration and uninstall

Tauri's `fileAssociations` declares `application/x-koxora`, `.koxora` and macOS exported UTType `app.koxora.project` conforming to `public.zip-archive`, with Editor role and Alternate rank. macOS Finder cold/warm file-open events are consumed. Windows NSIS registers only the owned ProgID/Open With entry through the reviewed installer macro override below; default-app selection remains an OS/user decision. Verify installer, updater and uninstall behavior on real Windows; no signing/notarization or public release is claimed.

Linux DEB includes the MIME XML in `/usr/share/mime/packages` and a desktop entry with `%F`. Packaging supplies the icon and executable. Package-manager database triggers own MIME cache refresh. The DEB must be tested on Debian; do not install it on CachyOS. No Flatpak bundle is built by this repository: Flatpak association/portal acceptance remains unavailable and is not claimed.

A standalone **AppImage does not install itself in Open With**. The Linux review artifact includes `integration/appimage-integration.py`, MIME XML and icon. Users may explicitly register a stable AppImage path, without sudo:

```sh
chmod +x /absolute/path/Koxora.AppImage
python3 ./integration/appimage-integration.py /absolute/path/Koxora.AppImage
```

The helper writes only the current user's XDG data directory (defaults to `~/.local/share`), updates MIME/desktop caches when tools are installed, and never calls `xdg-mime default`. It uses Desktop Entry escaping and a fixed `/usr/bin/env --` launcher so GLib also handles percent signs in executable paths correctly. No shell interprets document arguments. Choose Koxora in Dolphin/GNOME **Open With** and optionally set it as the default yourself. Moving/deleting the AppImage requires rerunning integration with the new path. Remove the helper-created files with:

```sh
python3 ./integration/appimage-integration.py --remove
```

Unregistration retains all project data and exports. An independently installed DEB/other application's association is not removed. If desktop MIME caches are missing, install standard `shared-mime-info`/`desktop-file-utils` through the distribution's package manager or log out/in after refreshing them. Do not use sudo to launch the app. AppImage FUSE fallback remains `--appimage-extract-and-run`; for file-manager integration use a functioning executable AppImage with FUSE or a stable user wrapper whose executable path can receive `%F` arguments.

## Concrete CachyOS / Firefox acceptance package

Use this PR head's successful **Desktop foundation** run: `unsigned-desktop-x86_64-unknown-linux-gnu`, containing `appimage/`, `deb/`, and optional `integration/`. Verify the commit SHA; these are unsigned review builds, not a public release. Browser tests use a production `pnpm build && pnpm preview` in Firefox. Keep backup exports and use disposable data.

1. Register the AppImage explicitly, then inspect Dolphin's Open With menu. Confirm Koxora is offered but another chosen default was not changed. Select Koxora as default only if desired.
2. Export two different projects with multiple pages/assets. Close Koxora. Double-click the first: its actual content must open. With Koxora running and an unsaved edit, open the second using Open With: the first's edit must be saved before the second opens. Reopen the first internally and verify it.
3. Open several filenames at once and successively; only one main window remains and every successful request opens in order. Try filenames with spaces, `世界`, quotes, dollar/backtick/semicolon/percent punctuation. They must remain filenames; no commands run. Open the same unmodified archive twice: no duplicate local project appears.
4. Modify a local project, then open an older export carrying its ID: conflict/copy choice, no overwrite. Import as copy through the picker and confirm a new local ID. Cancel an invalid request and verify the next queued valid request opens.
5. Open corrupt, unsupported-version, oversized, missing, non-file and symlink targets; confirm localized actionable errors, unchanged active project/source, and continued queue after Cancel. A read-only regular archive can be imported; its bytes stay untouched.
6. Drop `.koxora` into the native window and Firefox. Repeat a changed-identity conflict; use Retry as copy. Browser overflow must report a limit. Disconnect networking and repeat opening/save/export/restart.
7. Switch EN/DE, use keyboard-only dialogs and verify canvas editing still selects/moves elements normally. Save As must not unexpectedly overwrite an opened source.
8. Remove AppImage integration and verify its menu entry disappears while projects/exports remain. Repeat package install/update/uninstall on Debian, Windows NSIS and macOS Intel/ARM DMG, including warm/cold opening and default-app consent, before claiming platform acceptance.

## Automated evidence

Rust queue tests cover ordering, explicit acknowledgment, size/type/path rejection, punctuation and overflow. Python tests cover per-user reversible integration without default mutation and actual GLib `gio launch` argument fidelity. Browser IPC tests cover cold/warm opening, retained pending edits, idempotence, invalid queue cancellation, picker copy intent and browser drop conflict recovery; OS integration still needs the manual matrix above. Final command outcomes and independent review are recorded in the PR. The official IPC dependency's three informational maintenance exceptions are documented in the dependency guide; no advisory-free claim is made.

Validation on 2026-11-09: full `pnpm check` passed (504 tests), production builds passed through Playwright, six opening journeys passed in Chromium/Firefox, and both browsers passed the additional injected ACK-failure/copy regression. The unchanged native Save As contract passed six browser cases earlier in this block. Fourteen standalone Rust tests (including the six retained storage-location cases from the separate #14 snapshot) and standalone Clippy passed; the three new opening queue tests also pass. `cargo deny --locked check licenses advisories sources` passed with the three reviewed maintenance-only exceptions. Both Python integration tests passed independently, including real GLib launch. Full local Tauri compilation was attempted in the isolated GTK/WebKit container but exhausted its disk while rebuilding dependency features; native CI compilation/packaging remains required. Independent diff review verified the corrections for copy intent, picker serialization, macOS ownership, draft saving, browser overflow/error pause, native IPC feedback and completed-import acknowledgment retries. No remaining concrete blockers were found by that reviewer; real OS acceptance remains outstanding.

### Windows default-app consent correction

Source review of the exact Tauri CLI 2.12.3 NSIS template found that its default `APP_ASSOCIATE` macro assigns the extension's registry default, even if another application was previously registered. This does not meet this assignment's consent requirement. `integration/windows-associations.nsh`, included through `installerHooks`, therefore replaces only the two association macros: install registers the owned ProgID and `OpenWithProgids`, never the extension default or `UserChoice`; uninstall verifies executable-command ownership, removes its own registration and only clears an extension default if it equals the removed owned ProgID. Existing unrelated defaults survive. Executable and filename arguments are quoted, including installation paths with spaces.

The replacement relies on the reviewed upstream ordering (FileAssociation.nsh before installerHooks) and exact macro signatures; CLI upgrades must recheck this contract. A real NSIS harness compiled both replacement macros successfully on 2026-11-09. Python contract tests guard default preservation and optionally compile with an available NSIS compiler. This is compiler/source evidence, not a Windows Registry execution test: actual existing-default install/update/uninstall acceptance remains required.
