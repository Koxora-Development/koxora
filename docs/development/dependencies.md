# Dependency and license review

## Policy

The project license is still undecided (O-001). Workspace packages are private and `UNLICENSED`, preventing accidental registry publication. This review records dependency compatibility for the foundation; it does not license Koxora or substitute for legal review before distribution.

Use `pnpm install --frozen-lockfile`, `pnpm audit --audit-level high`, and `pnpm check:licenses`. The latter inventories installed JavaScript dependencies including development tools and installed optional packages, fails on unknown/unreviewed license identifiers, and writes `node_modules/.cache/koxora/dependency-licenses.json`. Each native runner checks its installed dependency set. A Linux report is not an inventory of uninstalled macOS/Windows optional binaries. The permissive allowlist includes MIT, MIT-0, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0, BlueOak-1.0.0, Python-2.0 and explicitly reviewed dual-license expressions.

## Specific reviewed exceptions

- `lightningcss` and its platform binaries use MPL-2.0. These are CSS build tooling supplied through Tailwind/Vite, not JavaScript application runtime libraries. MPL is file-level copyleft: preserve notices and make modifications to covered files available when distributing them. No covered upstream source is modified here. A package-specific exception avoids admitting unrelated MPL dependencies silently.
- `caniuse-lite` is CC-BY-4.0 browser compatibility data used by build tooling. Retain attribution and license information with any redistributed data. It is not application content. Only this named package is excepted.
- Tauri CLI is MIT OR Apache-2.0; the explicit SPDX expression is allowed. Native Tauri/runtime transitive licenses are a separate Cargo inventory.
- `MIT-0` was added to the general allowlist rather than as a package exception. It is the MIT license without its attribution clause, so it imposes strictly fewer obligations than MIT, which is already allowed; admitting it cannot introduce a condition the existing list does not already accept.

## Website W2.2 runtime addition

`nodemailer` 10.2.1 is the first runtime dependency of a server-side Koxora component, used by `@koxora/contact-api` to deliver contact messages over SMTP. It was chosen over hand-written SMTP because the credential travels on that connection and STARTTLS, authentication and dot-stuffing are details worth not re-implementing. Three properties made it acceptable:

- **No dependencies of its own.** The installed package declares an empty dependency set, so it adds one package and not a tree.
- **MIT-0**, as recorded above.
- **A bounded surface.** The service uses one transport, one send, one verify and one close. nodemailer ships no type declarations, and rather than adding a second package for them, `apps/contact-api/src/nodemailer.d.ts` declares exactly that surface, so what the service relies on is written down and anything else would fail the type check.

The transport is configured to require TLS, to reject an untrusted certificate, to use TLS 1.2 or later, and to read neither files nor URLs on behalf of a message. No credential is in the repository: every setting comes from the environment, and the service refuses to start without it.

**Version 10.2.1 rather than 7.x.** The first attempt pinned 7.0.9, and `pnpm audit --audit-level high` reported five high advisories against it: three denial-of-service findings in its address parser, a bypass of `disableFileAccess` and `disableUrlAccess` through a message-level `raw` option, and improper TLS certificate validation when fetching an OAuth2 token. Three of those did not apply to this service — `raw` is never used, OAuth2 is not used, and a reader's address is validated to one short plain address before it is parsed — but shipping a dependency with five open high advisories is not a position to defend, and the audit is a continuous integration gate. 10.2.1 clears all five, keeps MIT-0, still declares no dependencies of its own, and requires Node 20 or later, which the pinned toolchain satisfies. The surface the service uses was verified against it directly: a transport built with every option above, and `sendMail`, `verify` and `close` behaving as the declaration says.

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

## Phase 2.2 targeted Tokio security patch

The Phase 2.2 CI run detected [RUSTSEC-2026-0384](https://rustsec.org/advisories/RUSTSEC-2026-0384), published 2026-10-21, in the already locked transitive `tokio 1.54.0`. The advisory describes a race/use-after-free in `tokio::time::Interval` on the multi-threaded runtime, and identifies `>=1.54.1` as patched (`<1.54.0` unaffected). The affected 1.54.0 release was yanked. Tauri and its networking/runtime dependencies reach Tokio; absence of direct Interval calls in application code is not treated as a safety guarantee.

A separate security commit updates only the Tokio lockfile entry to 1.54.1, retaining its Cargo-generated registry checksum and all other package versions/dependency edges. This is a targeted fix for the required security gate, not a maintenance batch or major-version upgrade. No manifest ranges, advisory exceptions, security gates or Dependabot PRs are changed. The pre-existing maintenance-only exception documented above remains unchanged. Native builds/tests and `cargo deny --locked check licenses advisories sources` must pass on the final PR commit before acceptance.
