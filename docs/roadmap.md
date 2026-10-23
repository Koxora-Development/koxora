# Phased development roadmap

**Status: proposed sequence, without guaranteed dates, budgets, or automatic implementation authorization.** All [178 catalog requirements](product/feature-catalog.md) remain long-term scope.

| Phase | Scope | Acceptance evidence |
| --- | --- | --- |
| 0: Master planning | PRD, 178 requirements, architecture, agent/GitHub rules, email concept | Validated documentation PR, independent review, explicit Product Owner approval |
| 1: Foundation | Proposed monorepo/web shell, desktop spike, local storage, schema, English/German localization, CI | Reproducible web/desktop startup, local round trip, actual tests |
| 2: Editor alpha | Canvas/commands, undo/redo, mind map, flowchart, organization chart, template base | Guest/offline editing and shared files across targets |
| 3: Data and export | CSV/XLSX/ODS, charts, wizards, SVG/PDF/PNG, interactive HTML, GIF/video spikes | Data import and export fidelity/offline interaction |
| 4: Visualization breadth | UML, ER, BPMN, C4, network, Gantt, Kanban, wireframe, statistics, whiteboard | Cross-family reference projects |
| 5: AI and plugins | User keys, local models, prompts, preview/validation, sandbox, templates | Independent local core and safely tested optional capabilities |
| 6: Cloud and live teams | Accounts, sync, history, roles, CRDT/presence, comments, guests | Concurrent/offline merging, authorization, backups |
| 7: Community, self-hosting, enterprise | Marketplace, publication/moderation, Docker/backup, policies/SSO | Security, legal, and operating gates |
| 8: Stabilization and growth | Accessibility, translations, performance, distribution, release hardening | Platforms, migrations, recovery, support verified |

Before Phase 1, choose the first audience/journey, release acceptance scope, and technical comparison under O-002/O-003 and T-001 through T-004. Cloud pilot work also needs O-005/O-010 and privacy/account processes. Public release requires license, security reporting, support, and rollback readiness. Email setup requires a separate O-009 operations assignment.

Versions 0.1/0.3/0.5/0.7/0.9/1.0 and 1.x/2.x are illustrative maturity markers, not fixed cloud/enterprise delivery commitments. All 178 requirements need not ship before v1.0. Map releases by feasibility and value. Catalog waves P0–P3 are distinct from these numbered roadmap phases and GitHub priority labels.

The [detailed backlog](planning/roadmap-backlog.md) preserves M0–M8 and 27 initial engineering-item IDs. No issues, labels, milestones, workflows, or infrastructure are created by these planning tables. Each implementation needs a separate assignment and test evidence.

## Accepted baseline and active editor milestone

Phase 2.3 was accepted and merged at `e2bd42c02ccf146555a48f19650c47d800ad8388`. Phase 2.4 implements [interactive editing](development/interactive-editing.md), including the mandatory [Issue #13](https://github.com/Koxora-Development/koxora/issues/13) workflows. [Issue #14](https://github.com/Koxora-Development/koxora/issues/14) stays open for a separate desktop/settings milestone covering first-run storage-directory selection and safe migration. No storage relocation is part of Phase 2.4.
