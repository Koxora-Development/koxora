# Foundation stack and module boundaries

## Status and responsibility

Implemented for Phase 1, pending Product Owner review of the implementation PR. Date: 2026-10-20. Responsible implementation role: Codex; merge and release approval: Product Owner. This follows the explicit Phase 1 assignment and does not approve unrelated candidates or a product license.

## Context and options

CORE-001, CORE-002, CORE-003, CORE-013, CORE-014, CORE-015, CORE-018, OPS-001, OPS-003, OPS-007, OPS-011, T-001, T-002, and T-003 require a portable local foundation. Compared with a single application, workspaces make real reuse and dependency direction explicit. Compared with Electron, Tauri avoids shipping a second browser runtime but needs OS libraries and separate native runners. Plain CSS would suffice for this shell; Tailwind is adopted as the requested lightweight utility layer alongside semantic CSS tokens, without a component framework or canvas library.

## Decision

Use pnpm 10 workspaces and one committed lockfile, strict TypeScript 5.9, React 19, Vite 8, Tailwind 4, Vitest 5, Playwright, ESLint 10, Prettier, and GitHub Actions. Exact resolved versions are locked. Node 22.22 is the CI baseline; Node 24 is also supported. TypeScript remains on a mature supported compiler rather than combining this milestone with a compiler-major migration. Use Tauri 2 with a pinned Rust toolchain, committed Cargo lockfile, no plugins, no IPC commands, and no granted native capabilities. Desktop packages use system webviews: WebKitGTK on Linux, WebView2 on Windows, WKWebView on macOS.

Create only modules with a consumer now:

```text
apps/studio-web -> packages/studio -> packages/ui
                                 -> packages/i18n
apps/studio-desktop -> the same built studio-web assets
```

No Turborepo, global application store, routing framework, UI kit, backend, canvas engine, project schema, persistence adapter, collaboration or AI package is needed yet. The shared studio is the later editor composition boundary, not a domain model. Future domain packages must remain independent of React, browser globals, and native APIs; adapters will connect storage and import/export. They are not empty workspace packages today.

## Compatibility, maintenance, and licenses

React, TypeScript, Vite, pnpm, Tailwind, ESLint, Vitest and Prettier use permissive licenses; Playwright is Apache-2.0; Tauri is MIT OR Apache-2.0. See the [dependency review](../development/dependencies.md) for transitive exceptions and release obligations. Package and toolchain locks, frozen installs, supply-chain checks, and weekly Dependabot updates make changes reviewable. No final core license is inferred from dependency licenses (O-001).

Tauri's current Linux GTK macro chain includes the unmaintained `proc-macro-error` build dependency (RustSec RUSTSEC-2024-0370), with no patched version. This is a documented maintenance risk, not a reported runtime vulnerability in that advisory. Independent review supports an exact-ID policy exception for the foundation; reassess it before distribution and on upstream updates. See the dependency review for the remaining active gates.

The web shell uses standard browser APIs without remote assets or fonts. Native frontend assets are bundled locally and browser service-worker generation is disabled for desktop. Linux, Windows, macOS ARM64 and macOS x86_64 builds have dedicated CI targets. Signing, notarization, Windows ARM64, installers on real user devices, and desktop UI automation remain outside verified results (O-013).

## Verification evidence and consequences

The [development guide](../development/foundation.md#verification-and-known-limitations) records actual local checks and the distinct CI-only checks. Small build output and functional browser tests are the initial spike; this does not evaluate canvas performance. Platform webview differences require native testing as editor features arrive. The existing product architecture stays a roadmap, not a claim that its modules exist.
