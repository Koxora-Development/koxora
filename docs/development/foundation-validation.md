# Foundation validation record

Date: 2026-10-20. Results apply to the cloud instance and feature branch, not a published release.

## Passed locally

- Node.js 24.19.0, pnpm 10.32.1; frozen installation repeated successfully.
- `pnpm check`: TypeScript, ESLint (including literal JSX localization checks), Prettier, 8 unit tests in 2 files, documentation consistency, and 453 JavaScript dependency license entries.
- Documentation validation retains all 178 requirements, 38 decisions, 27 engineering items, 9 milestones and 21 legacy mappings; currently 49 Markdown documents and 100 local links/anchors.
- `pnpm audit --audit-level high`: no known vulnerabilities reported.
- Production web build and development server startup; light/dark screenshots visually inspected.
- 8 Playwright tests passed across desktop/mobile Chromium using the installed system browser: English default on German OS, guest startup with no external requests, language/theme selection and offline reload, unchanged unrelated synthetic data, blocked storage warning, responsive layout and keyboard skip navigation.
- Rust 1.93.1 installed through a checksum-verified rustup installer; Cargo lock generated, `cargo fmt --check` passed.
- `cargo deny --locked check licenses advisories sources` using cargo-deny 0.20.2 passed **with one independently reviewed maintenance advisory exception**, RUSTSEC-2024-0370; see the [dependency review](dependencies.md). Exact target-lexicon license metadata is reviewed separately.
- Tauri's desktop build hook successfully builds the shared frontend with browser service-worker generation disabled.
- Independent read-only agent review examined implementation, tests, architecture, licenses and workflows. Windows license-check invocation and unlocked Cargo builds were fixed; a second inspection confirmed closure and no remaining blocking findings. This is not human merge approval.

## Blocked or not executed locally

- `cargo check --locked -j 2` and Tauri debug build fail at `glib-sys`: system `glib-2.0` development metadata is absent. GTK/WebKit development packages and an interactive desktop are also unavailable. No successful native application build/startup is claimed.
- Native Clippy/tests, Linux installers, Windows/macOS builds and desktop UI acceptance require suitable runners. A Cargo entry point with zero domain tests would not establish UI readiness.
- Playwright's managed browser download is rejected with HTTP 403 `Domain forbidden` from `cdn.playwright.dev`; Firefox/WebKit and Playwright-pinned Chromium are unrun locally. The 8 passing tests use system Chromium, not those uninstalled binaries.
- Remote Actions were triggered. The initial macOS quality job passed; full native builds and the latest workflow results remain pending and must be checked on the PR. Superseded workflow runs are cancelled to avoid unnecessary duplication.
- No complete canvas, project files, native round trip, signing, notarization or public release has been implemented or validated.
