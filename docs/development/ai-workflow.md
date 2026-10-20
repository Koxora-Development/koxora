# Codex and Claude Code development workflow

**Status: requested working model; integration access, quotas, subscriptions, and API permissions require separate verification.**

## Roles

| Role | Responsibility |
| --- | --- |
| Product Owner | Vision, prioritization, final acceptance criteria, manual product tests, merge/release authorization |
| Codex | Preferred core/editor/native-format/browser/desktop implementation, tests, build/CI, integrations |
| Claude Code | Preferred website/backend/cloud/marketplace/documentation/UX work and independent architecture/security review |
| CI | Reproducible format/lint/type/unit/E2E/security/license/build checks where configured |

Assignments are preferences, not exclusive access or automatic authorization. Agents may review one another independently. Check required credentials, quotas, and GitHub access for each assignment. The source reports ChatGPT Plus and Claude Pro; subscription/API entitlements and current availability have not been verified. Chat subscriptions are not unlimited API access. Budget API usage, Actions minutes, storage, signing, and cloud separately.

## One task, one branch, one PR

1. Record goal/value, catalog IDs, scope/non-goals, acceptance tests, risks, dependencies, and language policy in an issue or authorized documentation assignment.
2. Read current main, README, AGENTS, PRD, relevant specifications, decisions/ADRs, and existing code. Inspect related PRs before editing.
3. Use a dedicated branch in the existing isolated cloud checkout. Do not create worktrees unless explicitly requested. Avoid concurrent edits to the same files and silent merges.
4. Implement the smallest coherent slice without coupling local core features to cloud.
5. Run checks appropriate to scope; report actual type/lint/unit/integration/E2E, localization, security, and performance evidence.
6. Obtain independent review of the actual diff, tests, architecture, and licenses. Report findings with locations/severity. Do not claim inaccessible or unperformed review passed.
7. Give the Product Owner a demo/screenshots/build where relevant, plain-language instructions, results, and known limitations.
8. Merge only after explicit human approval. Release is a separate approval step; agents do not auto-merge.

## Review gates and safety

Configure branch protection and checks only with appropriate roles and authorization. Never overwrite planning silently to pass a test or justify feature removal. Never copy personal emails, tokens, secrets, or confidential content into commits/prompts/issues/PRs/logs. Agent review complements CI and Product Owner acceptance; it does not automatically satisfy formal maintainer-review requirements. For critical undecided architecture, present options and evidence in an issue/ADR. Independently verify dependency provenance and artifacts.

## Assignment templates

### Codex implementation

> Address only assigned issue #N on a feature branch in Koxora-Development/koxora. Read AGENTS, PRD, relevant requirement IDs, architecture, and decisions. Make the smallest working change. Preserve local-first behavior, browser/desktop parity, and the mandatory English default/fallback, German support, key-based localization, and independent language selection. Run relevant checks and report actual results. Open a PR against main; do not merge.

### Claude review

> Independently review PR #N. Read AGENTS, CLAUDE, vision, requirement references, and relevant decisions. Examine data loss, offline behavior, permissions, localization, licenses, reproducibility, and tests. Report concrete locations, severity, and reproducible improvements. Do not change or merge without a separate assignment.

### Product Owner handover

> Explain the changed behavior, review steps, fulfilled acceptance cases, actual CI/check results, residual risks, and decisions required. Do not merge automatically.

## Phase 0

Only documentation/templates and their validator exist. Do not invent application tests, API access, completed reviews, configured protections, or functioning integrations. All technical work and GitHub communication are in English.
