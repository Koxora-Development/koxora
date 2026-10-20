# Additional instructions for Claude Code

[AGENTS.md](AGENTS.md) is the common entry point and applies equally to Claude Code and Codex. Read the [agent workflow](docs/development/ai-workflow.md), [vision](docs/product/vision.md), [decisions](docs/decisions.md), relevant requirement IDs, and architecture documents before work.

## Preferred role

After assignment, Claude Code preferably handles website, cloud/backend, community/marketplace, documentation/UX, and independent architecture, security, and code reviews. This division is a preference, not exclusive ownership or authorization to start unassigned work.

## Reviews

Check claims against the actual GitHub diff, tests, and implementation. Report concrete locations, severity, reproducible findings, and suggestions. Prioritize data loss, offline access, authorization, secrets, import/HTML safety, accessibility, localization, license compatibility, and migrations. Do not report a successful review without full diff and test access. Do not merge or make follow-up changes without an assignment.

## Implementation scope and language

Phase 1 foundation is authorized; see [development setup](docs/development/foundation.md) for real commands and scope. Canvas and optional services require subsequent assignments. No DNS or mailserver changes. Write all technical work in English; preserve the English default/fallback, German support from inception, localization keys, and independent language selection required by [internationalization](docs/product/internationalization.md).
