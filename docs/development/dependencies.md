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

The contact endpoint is PHP under the host's existing PHP-FPM ([ADR 0019](../adr/0019-contact-delivery.md)), so its dependencies are resolved by Composer and are recorded in `apps/contact-php/composer.lock`. They face the same licence policy as the JavaScript ones: `pnpm check:licenses` now reads that lock file as well, and a package with a licence outside the allowlist, or with none declared, fails the check exactly as a JavaScript package would. All 41 entries, runtime and development, are MIT.

`symfony/mailer` **7.4.19** delivers over SMTP. It was chosen over hand-written SMTP because the credential travels on that connection, and STARTTLS, authentication and dot-stuffing are details worth not re-implementing.

**Symfony Mailer rather than PHPMailer.** PHPMailer is the obvious first candidate — one package, no dependencies of its own — but it is distributed under LGPL-2.1-only, and this project's allowlist is permissive licences only. Admitting it would mean admitting a copyleft licence to the whole repository's dependency policy for one SMTP client. Symfony Mailer is MIT, as is every one of the fourteen packages it brings, so it costs a larger tree and no change of policy. The check that decides this was verified by adding a fictional LGPL-2.1 package to the lock file and confirming the licence check refuses it.

**7.4.19 rather than 7.3.x.** The first resolution landed on 7.3.10, and `composer audit` reported CVE-2026-45068 against it: argument injection in the `SendmailTransport` through a recipient address beginning with a dash, which affects everything below 7.4.12 in that line. It does not apply to this endpoint — the transport is constructed in code as an `EsmtpTransport` and `Transport::fromDsn` appears nowhere, so no setting can select a sendmail transport at all, and a test asserts that — but shipping a dependency with an open advisory is not a position to defend, and `composer audit` is a continuous integration gate. 7.4.19 clears it.

**`symfony/mime` 7.4.22, and why the transitive dependency is pinned too.** On 28 October 2026 `composer audit` reported CVE-2026-45070 against it: email header injection through non-token characters in MIME parameter names, affecting everything below 7.4.22 in that line. That is the same class of defect the endpoint's own validation exists to prevent, in the library that writes the headers, so it was taken seriously rather than reasoned away. It is very unlikely to be reachable here — the endpoint composes a plain text message with a subject, a `From`, a `To` and a `Reply-To`, sets no MIME parameter of its own, and refuses any field containing a character that could end a header before the library ever sees it — but a header-injection advisory in the mail library of a contact form is not something to ship open. The upgrade is a patch release with no API change; the suite passed unchanged.

`phpunit/phpunit` **11.5.57** is the development dependency. 11.5.48 was pinned first and `composer audit` reported CVE-2026-24765 against it, unsafe deserialization in PHPT coverage handling, fixed in 11.5.50.

The transport is configured to require TLS rather than prefer it, to verify the certificate and refuse a self-signed one, and to accept TLS 1.2 or later. No credential is in the repository: every setting comes from the environment or from a settings file outside every document root, and the endpoint refuses to deliver without each one.

**The version constraints are exact**, which `composer validate` warns about. That is deliberate and matches how this repository pins its JavaScript dependencies: a reviewed release is a known set of bytes, and an upgrade is a change somebody looked at.

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

## Phase 2.5 text editor

The Studio UI adds ProseMirror model 1.25.12, state 1.4.4, view 1.42.8, history 1.5.1, commands 1.7.2 and keymap 1.2.3, with their small transitive modules. These packages are MIT licensed; installed package license files and the repository license inventory are checked. They implement caret/selection/IME, deterministic transactions and text undo without remote services. No upstream files are modified. Retain their license notices in distributed application artifacts. The portable project format stores Koxora's narrow run model, not library-specific editor JSON. No font file is bundled, so no proprietary-font redistribution permission is assumed. All font choices use local fallbacks documented in the [Phase 2.5 guide](workbook-rich-text.md).

## Phase 2.6 external URL opening

The desktop adds `open` 5.4.5 (MIT), pinned exactly for review, and makes the already locked `url` 2.5.8 a direct dependency. The lockfile adds only `open`, `is-wsl` 0.4.0 and `is-docker` 0.2.0, all MIT licensed, and removes/updates no existing package. No JavaScript dependency or allowlist exception is added.

Source inspection verified that Tauri's `tauri-plugin-opener` 2.7.2 delegates URL opening to `open::that_detached` with `shellexecute-on-windows` enabled. Studio uses that backend directly outside Linux AppImages; inside an AppImage it uses the same crate's launcher commands with a child environment stripped of AppDir-owned library/module paths. The `insecure` feature stays disabled. The plugin's unrelated Linux file-reveal implementation would also pull in zbus 5 and its standalone `zbus_names`, `zvariant` and `zvariant_derive` crates, which RustSec marks unmaintained (RUSTSEC-2026-0371, RUSTSEC-2026-0370 and RUSTSEC-2026-0372). Those dependencies are absent from the final lockfile, so no new advisory exception is needed.

Studio grants only the custom main-window `open_external_url` command, which validates the allowlist in Rust before handing the URL to the system default application. No arbitrary program is supplied, no plugin intercepts JavaScript links, and general opener/path/shell commands remain ungranted. Native advisory/license CI remains required; metadata review is not a vulnerability scan. Full local Tauri compilation is blocked in this environment by missing GTK/GLib development packages.

## Native file opening (#35)

The latest official `tauri-plugin-single-instance` 2.5.5 (MIT/Apache-2.0) implements required warm-launch delivery on Linux/Windows/macOS. Its Linux-only zbus 5.19.0 graph adds three exact informational maintenance notices: [RUSTSEC-2026-0370](https://rustsec.org/advisories/RUSTSEC-2026-0370), [RUSTSEC-2026-0371](https://rustsec.org/advisories/RUSTSEC-2026-0371), and [RUSTSEC-2026-0372](https://rustsec.org/advisories/RUSTSEC-2026-0372), for zvariant, zbus_names and zvariant_derive respectively. Independent review read the official RustSec entries and registry dependency metadata on 2026-11-09: these standalone crates were consolidated into zbus 6, there is no reported vulnerability or patched compatible standalone release, and the official plugin requires zbus ^5.9. A forced zbus 6 substitution would violate its dependency/API contract.

Unlike the optional file-reveal implementation rejected in Phase 2.6, this dependency supplies the explicitly assigned single-instance requirement. Retaining the official OS IPC implementation is preferable to introducing a bespoke IPC/authentication protocol solely to avoid maintenance notices. `deny.toml` documents only these three exact-ID maintenance exceptions, independently reviewed. Reassess on the next official plugin upgrade and before distribution. Vulnerability, license and source checks remain enabled; this is not an advisory-free claim or a blanket zbus exception. No existing dependencies are deliberately upgraded. The full locked Cargo gate and packaged OS tests are still required.
