# Contributing and development workflow

Koxora uses agent-assisted development: the Product Owner prioritizes and accepts outcomes, agents implement, and reviewers/CI validate. The planning baseline describes a private repository; external contributions depend on an explicit license and publication decision.

## Workflow

1. Record the need in an issue with catalog IDs, value, acceptance criteria, non-goals, dependencies, and test expectations. A direct assignment can serve as the reference for a small documentation task.
2. Read AGENTS, relevant PRD/specifications, decisions, ADRs, and CLAUDE when applicable. Inspect current branches and PRs and preserve others' changes.
3. Use a dedicated branch from current `main`, such as `docs/phase-0-completion` or `feat/CORE-005-project-io`. Continue an existing task branch when explicitly updating its work. Do not write directly to `main` or force-push.
4. Make the smallest coherent change. Do not hide architecture or feature changes, or perform unrelated refactoring or infrastructure changes.
5. Run real local/CI checks appropriate to scope, including guest/offline, localization, privacy, and migration cases where relevant.
6. Open a PR with assignment/issue, context, requirement IDs, changes, actual checks and results, review instructions, risks, and open decisions.
7. Obtain independent review and address findings. Give the Product Owner understandable review steps and request explicit merge approval. Agents do not auto-merge.
8. Release builds, downloads, and production operation require a separate gate. A documentation merge does not authorize application implementation.

## Definition of Ready

Known user problem/value, unambiguous requirement references, accepted prerequisite decisions, verifiable acceptance scenarios, scope/non-goals, dependencies, and risks. Do not treat proposals or silence as approval.

## Definition of Done

Acceptance cases demonstrated, appropriate checks executed and reported, documentation/migrations/changelog updated where relevant, independent review addressed, no secrets or real confidential data, and explicit Product Owner approval before merge. Identify unrun checks and reasons.

## Language and project management

All code, names, comments, documentation, issues, commits, and PR descriptions are English. All interface text uses localization keys, with English default/fallback, German from inception, independent language selection, and resource-based extension to other languages. See [language rules](docs/product/internationalization.md).

Use [roadmap and backlog](docs/planning/roadmap-backlog.md) for proposed milestones and engineering items. Suggested labels: `area:*`, `type:*`, `priority:P0..P3`, `status:*`, `platform:*`. Historical catalog waves are not GitHub priority labels. Engineering-item IDs and requirement IDs are separate namespaces.

Branch protection, required checks, CODEOWNERS, labels, and milestones need real maintainers and permission review before setup. Avoid impossible approval rules for a repository with one human maintainer. No such settings are configured by Phase 0 documentation.

## Current checks

Run `python3 scripts/validate_docs.py` from the repository root. No dependency manifests, application build scripts, or product CI exist. Exact product startup and test commands must be documented when separately authorized Phase 1 work introduces them.
