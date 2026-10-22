# Instructions for coding agents

These rules apply throughout the repository. The Product Owner owns goals, priorities, manual product acceptance, architecture approval where required, and merge/release authorization. Agents perform technical work within the assigned scope.

## Read before changes

Read [README](README.md), [vision](docs/product/vision.md), [requirements](docs/requirements.md), [decisions](docs/decisions.md), and [contributing](CONTRIBUTING.md). For each story, read the relevant IDs in the [178-entry catalog](docs/product/feature-catalog.md), the [PRD](docs/product/prd.md), relevant specifications and ADRs, and the [agent workflow](docs/development/ai-workflow.md). Follow [SECURITY](SECURITY.md) for sensitive reports.

## Confirmed constraints

The product is local-first, usable offline after provisioning, and usable in the browser without registration. Browser and Linux/Windows/macOS share an editor core and portable project format. AI, cloud, collaboration, plugins, and marketplace integrations are optional. The full catalog is long-term scope; defer features through prioritization rather than deleting IDs without a Product Owner decision.

## Mandatory language rules

All source code, identifiers, variables, functions, classes, comments, technical documentation, GitHub issues, commit messages, and pull request descriptions must be in English. English (`en`) is the default and fallback application language. German (`de`) must be supported from the beginning and explicitly selectable independently of operating system language. Never hardcode user-facing strings: all interface text uses localization keys. Additional languages must be enabled through resources and locale registration without changing application logic. See [internationalization](docs/product/internationalization.md).

## Proposals and decisions

React/TypeScript/Vite, pnpm, Tauri 2, Yjs, Laravel, PostgreSQL, canvas libraries, `.koxora`, schemas, licenses, monetization, hosting, APIs, colors, branding assets, and exact release dates are not automatically approved. Use spikes, license/security checks, and ADRs. Distinguish confirmed product constraints, technical candidates, and open decisions. Missing historical context is not evidence of approval.

## Branches, changes, and review

- Inspect current remote branches and related issues/PRs before work; preserve existing useful content and user changes. Do not have multiple agents change the same files concurrently.
- Work on a feature branch and open a PR against `main`. Never push directly to `main`, force-push, or merge without explicit approval.
- Keep changes coherent; reference the assignment or issue, relevant requirement IDs, acceptance cases, negative cases, and actual validation results.
- Each cloud task is isolated. Use the existing checkout; do not create a Git worktree unless the user explicitly requests one.
- Never commit secrets, real personal data, server credentials, session tokens, or SMTP credentials. Validate untrusted files, templates, remote data, plugins, and browser content; enforce optional cloud permissions on the server.
- DNS, mailserver, payment, production, and organization-permission changes require a separate explicit assignment.

## Authorized implementation scope

Phase 0 is complete. The explicit Phase 1 assignment authorizes the monorepo, shared web/desktop shell, localization, themes, tests, CI, and supporting ADRs. See [foundation setup](docs/development/foundation.md). It does not authorize canvas, cloud, authentication, collaboration, AI, marketplace, DNS, or production work. The 178 requirements remain long-term scope; do not implement unrelated features or create issues en masse.

Phase 2.1 separately authorizes the shared project model, validation and migration infrastructure, local persistence adapters, native project import/export and recovery, minimal project controls, and their tests. See [project storage](docs/development/project-storage.md). Canvas and optional services remain outside this assignment.

## Verification and handover

Run relevant existing checks and report real results. Run `pnpm check`, `pnpm build`, browser smoke tests, and native checks where prerequisites exist; see the development guide. Keep actual local results distinct from configured remote CI. Later stories must address appropriate unit/integration/E2E, offline, localization, migration, security, accessibility, and dependency-license checks. Do not claim unrun tests passed.

Arrange independent review by another agent or reviewer; do not claim it happened without access to the diff and evidence. Present changes, verification, limitations, and decisions in plain English. Human Product Owner approval remains required before merge. A documentation merge does not authorize Phase 1.

Phase 2.2 separately authorizes the interactive canvas navigation foundation, grid/snapping infrastructure, portable viewport/page settings, honest read-only imported-content previews, renderer evaluation, performance measurements and their tests. See [interactive canvas](docs/development/interactive-canvas.md). Full element creation/editing, collaboration and optional services remain outside this assignment.
