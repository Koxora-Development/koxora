# Dependency and license review

## Policy

The project license is still undecided (O-001). Workspace packages are private and `UNLICENSED`, preventing accidental registry publication. This review records dependency compatibility for the foundation; it does not license Koxora or substitute for legal review before distribution.

Use `pnpm install --frozen-lockfile`, `pnpm audit --audit-level high`, and `pnpm check:licenses`. The latter inventories installed JavaScript dependencies including development tools and installed optional packages, fails on unknown/unreviewed license identifiers, and writes `node_modules/.cache/koxora/dependency-licenses.json`. Each native runner checks its installed dependency set. A Linux report is not an inventory of uninstalled macOS/Windows optional binaries. The permissive allowlist includes MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0, BlueOak-1.0.0, Python-2.0 and explicitly reviewed dual-license expressions.

## Specific reviewed exceptions

- `lightningcss` and its platform binaries use MPL-2.0. These are CSS build tooling supplied through Tailwind/Vite, not JavaScript application runtime libraries. MPL is file-level copyleft: preserve notices and make modifications to covered files available when distributing them. No covered upstream source is modified here. A package-specific exception avoids admitting unrelated MPL dependencies silently.
- `caniuse-lite` is CC-BY-4.0 browser compatibility data used by build tooling. Retain attribution and license information with any redistributed data. It is not application content. Only this named package is excepted.
- Tauri CLI is MIT OR Apache-2.0; the explicit SPDX expression is allowed. Native Tauri/runtime transitive licenses are a separate Cargo inventory.

No external fonts, stock artwork or canvas dependencies are introduced. The Product Owner supplied and explicitly requested the official Koxora website logo and branding for the Phase 2.1 UX revision. The exact SVG is used by the shared UI and as the source for generated native icons; provenance is recorded in the [UX revision](../design/phase-2.1-ux.md). This supersedes the provisional application mark for this PR.

## Rust and automation

The desktop uses a committed Cargo lockfile and a pinned Rust toolchain. CI runs `cargo deny --locked check licenses advisories sources` using cargo-deny 0.20.2. Its license allowlist includes permissive licenses, Unicode data licenses and MPL-2.0 for native ecosystem dependencies; private application metadata is excluded. Review failures, source notices and advisories before changing exceptions. Cargo advisories need access to the RustSec GitHub advisory database. Dependency advisories can change independently of a commit.

The exact `Apache-2.0 WITH LLVM-exception` expression is allowed only for `target-lexicon`, a native target-description dependency. Its bundled license was checked; upstream metadata is unchanged.

The current locked Tauri 2.12.4 Linux GTK stack reaches `proc-macro-error 1.0.4` through `glib-macros`/`gtk3-macros`. RustSec RUSTSEC-2024-0370 is an informational **unmaintained** advisory, with no patched version. It reports no runtime vulnerability, but build-time code executes in the build environment and still has maintenance/supply-chain risk. `deny.toml` records one exact advisory-ID exception with rationale; unmaintained checks and all vulnerability checks remain enabled for other findings. Independent review verified this classification and the dependency trace. Reassess this exception on GTK/Tauri updates and before public distribution; do not describe the native graph as free of advisories. The passing gate is explicitly **with one documented maintenance advisory exception**.

GitHub Actions use immutable commit references with version comments. Dependabot proposes npm, Cargo, and Actions updates weekly. Only necessary package install scripts are enabled. No npm audit fix, signature bypass, arbitrary checksum change, or unattended dependency update is part of setup.

Before public desktop distribution, gather licenses/notices for every target artifact, complete the product-license decision, and configure signing/notarization under a separate release assignment.

## Phase 2.1 native Save As additions

The Product Owner explicitly requested the supported Tauri 2 dialog API. This revision adds `tauri-plugin-dialog` 2.8.3 (MIT OR Apache-2.0) and `tempfile` 3.27.0 (MIT OR Apache-2.0), and makes the already locked `serde` a direct dependency for command deserialization. The lockfile adds 18 packages, including `rfd` 0.16.0 (MIT), `tauri-plugin-fs` 2.7.1 (MIT OR Apache-2.0), and native platform support. Existing package versions are unchanged. The filesystem plugin is a transitive implementation dependency of the official dialog API; the main-window capability grants no general filesystem or frontend dialog permissions. Native Rust code owns destination selection and atomic publication.

These additions implement the requested feature; they are not a dependency-maintenance batch. Dependabot PRs #3–#9 remain untouched. CI applies the existing Cargo license/advisory gate without new exceptions.
