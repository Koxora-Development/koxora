# Phase 1 development foundation

## Scope and architecture

This milestone implements a guest studio shell, shared UI and design tokens, English/German, light/dark preferences, offline shell caching, Tauri configuration, and development checks. It implements foundations for CORE-001, CORE-002, CORE-003, CORE-013, CORE-014, CORE-015, CORE-016, CORE-018, OPS-001, OPS-003, OPS-007 and OPS-011. These are partial foundations, not completion of every catalog acceptance case. The direct Phase 1 assignment narrows the earlier roadmap: no canvas, document schema or project files yet.

| Location              | Responsibility                                                             |
| --------------------- | -------------------------------------------------------------------------- |
| `apps/studio-web`     | Vite entry, React mounting, utility CSS, browser asset cache               |
| `apps/studio-desktop` | Tauri shell, restricted native configuration and bundles                   |
| `packages/studio`     | Shared studio composition and validated preference persistence             |
| `packages/ui`         | Reusable presentational components and semantic theme tokens               |
| `packages/i18n`       | Resources, locale registry, English fallback and Intl helpers              |
| `tests/browser`       | Guest, offline, storage failure, language/theme and responsive smoke tests |

Dependencies point from apps toward shared packages. The UI package has no application-state dependency. The translation package has no React dependency. Diagram engines, project persistence, import/export, collaboration and AI will be separate packages when their first real consumers are implemented. Keep domain logic independent of OS/React; inject storage/network adapters. See the [stack decision](../adr/0011-foundation-stack.md) and [localization decision](../adr/0012-localization-and-offline-shell.md).

## Setup and web startup

Use the existing isolated checkout; do not create a Git worktree unless explicitly requested. Install Node.js 22.22.0 and pnpm 10.32.1. Node 24 also satisfies the supported engine range. Python 3.9+ is required for documentation validation. From the repository root:

```sh
npm install --global pnpm@10.32.1
pnpm install --frozen-lockfile
pnpm dev
```

No secrets or `.env` file are required. Vite binds to loopback on port 5173. For local production validation:

```sh
pnpm build
pnpm preview
```

Preview uses port 4173. Open it online once, wait for the service worker to activate, then reload offline. The browser cache stores the shell, not user documents. Development mode is uncached. To reset a preview, unregister its service worker and clear site data. New application code is activated on a subsequent clean navigation lifecycle; there is no in-place update prompt yet. Do not rely on browser cache as a backup.

## Desktop prerequisites and commands

Use Rust 1.93.1 (pinned by `rust-toolchain.toml` in `src-tauri`). Install Rust via rustup and allow rustup to install the specified components. Tauri CLI is a workspace dependency; no global Tauri installation is needed. Official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) are authoritative.

- Ubuntu/Debian: `build-essential curl wget file libwebkit2gtk-4.1-dev libxdo-dev libssl-dev librsvg2-dev libayatana-appindicator3-dev patchelf`; a desktop display is required for interactive startup.
- Windows: Visual Studio Build Tools with C++ desktop tools and a supported Windows SDK, Rust MSVC toolchain, and WebView2 Runtime. Use a native Windows terminal.
- macOS: Xcode command-line tools, Rust, and platform SDKs. Add `x86_64-apple-darwin` with rustup for an Intel build on an Apple Silicon host.

From the repository root:

```sh
pnpm desktop:dev
pnpm desktop:build
pnpm --filter @koxora/studio-desktop build:debug
```

The debug build disables installer bundling. For an explicit release target:

```sh
pnpm --filter @koxora/studio-desktop exec tauri build --target x86_64-unknown-linux-gnu --bundles deb,appimage --ci -- --locked
pnpm --filter @koxora/studio-desktop exec tauri build --target x86_64-pc-windows-msvc --bundles nsis --ci -- --locked
pnpm --filter @koxora/studio-desktop exec tauri build --target aarch64-apple-darwin --bundles dmg --ci -- --locked
pnpm --filter @koxora/studio-desktop exec tauri build --target x86_64-apple-darwin --bundles dmg --ci -- --locked
```

Run each on its supported native host, not as Linux cross-compilation instructions. Bundles are written under `apps/studio-desktop/src-tauri/target/<target>/release/bundle/` (without `<target>` when the flag is omitted). They are development artifacts: unsigned/not notarized, with no updater, store publishing, or release upload. Windows ARM64 is not configured. Desktop grants no native command/plugin permissions. Future native adapters must add narrowly scoped capabilities with tests and review.

## Local checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm check:docs
pnpm check:licenses
pnpm audit --audit-level high
pnpm build
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm test:e2e
```

`pnpm check` combines type checking, linting, formatting, unit tests, documentation and JavaScript license checks. `pnpm format` updates formatting. Browser tests build and start production preview themselves. Use `pnpm test:e2e --project=chromium --project=mobile` for the representative Chromium run. A constrained environment can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for those two projects; do not use that override with Firefox/WebKit. Browser reports/traces and license inventory are generated under `node_modules/.cache/koxora/`.

From `apps/studio-desktop/src-tauri`:

```sh
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
cargo install cargo-deny --version 0.20.2 --locked
cargo deny --locked check licenses advisories sources
```

There are no native domain unit tests yet: the native entry point only starts the shell. Do not treat a zero-test Cargo run as desktop UI verification. Shared behavior is tested through the browser; native UI acceptance still requires running each target on a real desktop.

## CI

Quality CI runs the combined checks and npm audit on Linux, Windows and macOS. Chromium, Firefox, WebKit and mobile smoke tests run on Ubuntu. Desktop CI independently builds Linux x86_64 DEB/AppImage, Windows x86_64 NSIS, macOS ARM64 DMG and macOS x86_64 DMG, runs Rust format/lint/tests, and uploads unsigned artifacts. Rust license/advisory/source checks run separately. Workflow configuration alone is not proof of a successful Actions run. No branch protection or repository settings are changed.

## Verification and known limitations

Local evidence is recorded in the implementation PR and the committed [validation record](foundation-validation.md). Native GTK/WebKit development packages and an interactive display are absent in this cloud machine; native application startup, packaging and cross-OS behavior are not claimed. Browser downloads from Playwright's CDN and GitHub API access can be restricted by the environment; these are separate from working authenticated Git transport.

No project model, file round trip, canvas, project recovery, installable PWA manifest, authentication, backend, cloud, collaboration, AI, marketplace, plugin runtime, telemetry or production deployment exists. Preference persistence is not project persistence. No full WCAG certification, full RTL product translation, signing, notarization or public distribution license is claimed.

## Recommended next milestones

1. Define a minimal versioned document schema with golden fixtures, unknown-extension preservation and migration tests; evaluate the portable archive boundary.
2. Implement a local persistence adapter and explicit save/export/restore with quota/corruption/recovery tests.
3. Compare canvas engines on the same small scenes, licensing and accessibility cases before introducing one. Add command-based editing and undo/redo after that decision.
4. Run native bundles on each OS, close CI findings, test webview differences and storage, and add desktop UI automation before promising platform parity.
