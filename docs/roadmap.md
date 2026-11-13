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

Phase 2.3 was accepted and merged at `e2bd42c02ccf146555a48f19650c47d800ad8388`. Subsequent accepted editor milestones are Phase 2.4 interactive editing (#23), Phase 2.5 workbook/rich text (#39), and Phase 2.6 URL/page links (#51). Configurable desktop storage, native project opening, the Office-style workbench and project/element navigation were accepted and merged in #58 (`04e508eb75b5ff326ac366ea153d31fce5ab4cb4`). Element rotation/mirroring, optional enhanced accessibility and library refinements were accepted and merged in #59 (`8c464ed782b7f3473e9cf7ba96eb75f41cfd3f15`). These merges do not authorize public releases, and native packaging/distribution acceptance remains separate.

The 2026-11-13 Product Owner assignment requests continued development in the existing phase order. Phase 2 is not complete merely because generic shape editing and navigation work. Its mind-map, flowchart, organization-chart and local-template goals need their own usable workflows and evidence.

| Next slice | Scope and status |
| --- | --- |
| Phase 2.7: structured mind maps | Current assigned implementation, based on accepted #59. A New mind map action creates a local starter; topic hierarchy authoring and deliberate automatic layout reuse the shared editor, history and portable format. See [the implementation and acceptance guide](development/mind-maps.md). Product Owner acceptance and merge remain pending. |
| Remaining Phase 2 diagram workflows | Complete organization-chart hierarchy/layout, the remaining flowchart semantics/routing work, and the local template base with save/apply behavior. Establish acceptance evidence for each slice before claiming Editor alpha complete. |
| Phase 3: data and export | CSV/XLSX/ODS, datasets/charts, SVG/PDF/PNG and interactive HTML, followed by the planned animation/video experiments. The interactive-export remainder of Issue #24 belongs here. |
| Phase 4: visualization breadth | Network/IT symbols and their later ports/metadata/templates, plus the other diagram families in the preserved table above. See [network and IT planning](planning/network-it-diagrams.md). |

The bundled mind-map starter in Phase 2.7 is not local template management: it provides no dedicated template overview, user-saved template library or template sharing. Further interface presets/customization remain [planned separately](planning/studio-design-customization.md). This sequencing retains every catalog requirement and historical milestone; it changes neither release gates nor the Website workstream.
