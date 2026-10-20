# Dependency and license review

## Policy

The project license is still undecided (O-001). Workspace packages are private and `UNLICENSED`, preventing accidental registry publication. This review records dependency compatibility for the foundation; it does not license Koxora or substitute for legal review before distribution.

Use `pnpm install --frozen-lockfile`, `pnpm audit --audit-level high`, and `pnpm check:licenses`. The latter inventories installed JavaScript dependencies including development tools and installed optional packages, fails on unknown/unreviewed license identifiers, and writes `node_modules/.cache/koxora/dependency-licenses.json`. Each native runner checks its installed dependency set. A Linux report is not an inventory of uninstalled macOS/Windows optional binaries. The permissive allowlist includes MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0, BlueOak-1.0.0, Python-2.0 and explicitly reviewed dual-license expressions.

## Specific reviewed exceptions

- `lightningcss` and its platform binaries use MPL-2.0. These are CSS build tooling supplied through Tailwind/Vite, not JavaScript application runtime libraries. MPL is file-level copyleft: preserve notices and make modifications to covered files available when distributing them. No covered upstream source is modified here. A package-specific exception avoids admitting unrelated MPL dependencies silently.
- `caniuse-lite` is CC-BY-4.0 browser compatibility data used by build tooling. Retain attribution and license information with any redistributed data. It is not application content. Only this named package is excepted.
- Tauri CLI is MIT OR Apache-2.0; the explicit SPDX expression is allowed. Native Tauri/runtime transitive licenses are a separate Cargo inventory.

No external fonts, stock artwork, downloaded icons, or canvas dependencies are introduced. The small geometric application mark is repository-authored provisional artwork, not approved final branding (O-014).

## Rust and automation

The desktop uses a committed Cargo lockfile and a pinned Rust toolchain. CI runs `cargo deny --locked check licenses advisories sources` using cargo-deny 0.18.3. Its license allowlist includes permissive licenses, Unicode data licenses and MPL-2.0 for native ecosystem dependencies; private application metadata is excluded. Review failures, source notices and advisories before changing exceptions. Cargo advisories need access to the RustSec GitHub advisory database. Dependency advisories can change independently of a commit.

GitHub Actions use immutable commit references with version comments. Dependabot proposes npm, Cargo, and Actions updates weekly. Only necessary package install scripts are enabled. No npm audit fix, signature bypass, arbitrary checksum change, or unattended dependency update is part of setup.

Before public desktop distribution, gather licenses/notices for every target artifact, complete the product-license decision, and configure signing/notarization under a separate release assignment.
