# Koxora

Open-source platform for diagrams, mind maps, data visualization, and collaboration.

**Make ideas visible. One canvas. Endless possibilities.** (Working slogan, pending approval.)

Koxora is a planned international, local-first visualization platform for diagrams, data, and interactive documents. The full editor is intended to work in the browser without registration, offline after initial provisioning, and on Linux, Windows, and macOS. Optional cloud services, teams, live collaboration, AI, templates, plugins, and a marketplace extend the local core.

**Status as of 2026-10-20: Phase 0 documentation, awaiting review. No runnable application exists.** The repository was described as private in the planning baseline; publication and the specific open-source license remain separate decisions. No deployment, DNS, mailbox, or infrastructure setup is authorized by this documentation.

## Project identity

- Organization: [Koxora-Development](https://github.com/Koxora-Development).
- Repository: [Koxora-Development/koxora](https://github.com/Koxora-Development/koxora).
- Registered domains according to the planning source: `koxora.app`, `koxora.com`, `koxora.de`.
- Planned hosts: `koxora.app` (website), `app.koxora.app` (editor), `docs.koxora.app`, `cloud.koxora.app`, `marketplace.koxora.app`, and `status.koxora.app`. Registration does not establish deployment or reachability.
- The Product Owner sets priorities, tests product outcomes, and approves merges and releases. Coding agents perform implementation and technical validation.

## Documentation

1. [Vision and product principles](docs/product/vision.md), [PRD](docs/product/prd.md).
2. [All 178 requirements](docs/product/feature-catalog.md), [machine-readable CSV](docs/product/feature-catalog.csv), [requirements guide](docs/requirements.md).
3. [Mandatory internationalization and language rules](docs/product/internationalization.md).
4. [Decision register](docs/decisions.md), [source traceability and legacy IDs](docs/traceability.md).
5. [Architecture overview](docs/architecture.md), [system architecture](docs/architecture/system-architecture.md).
6. [Roadmap](docs/roadmap.md), [milestones and 27 proposed engineering items](docs/planning/roadmap-backlog.md).
7. [Website and platform](docs/platform/website.md), [email plan](docs/email-plan.md).
8. [Agent workflow](docs/development/ai-workflow.md), [contributing](CONTRIBUTING.md), [agent instructions](AGENTS.md), [Claude instructions](CLAUDE.md).
9. [Phase 0 acceptance](docs/phase-0.md), [security reporting](SECURITY.md).

## Language and decision status

English (`en`) is the default and fallback language. German (`de`) must be supported from the beginning and selectable independently of operating system language. All interface text must use localization keys. Additional languages must require no application-logic changes. All code, identifiers, comments, documentation, issues, commits, and pull requests must be written in English.

The broad functional vision is confirmed as long-term scope. React/TypeScript, pnpm, Tauri 2, Yjs, Laravel, and other named technologies are candidates pending spikes and license checks. Final schemas, commercial terms, release scope, and operating costs remain open.

## Scope and verification

This branch contains documentation, templates, and a standard-library documentation validator. There are no application install, build, or product-test commands. Run `python3 scripts/validate_docs.py` for documentation consistency; see [validation and source comparison](docs/phase-0.md#validation). Application implementation requires a separate assignment. No merge is authorized without explicit Product Owner approval.
