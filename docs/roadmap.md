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

Phase 2.3 was accepted and merged at `e2bd42c02ccf146555a48f19650c47d800ad8388`. Subsequent accepted editor milestones are Phase 2.4 interactive editing (#23), Phase 2.5 workbook/rich text (#39), and Phase 2.6 URL/page links (#51). Configurable desktop storage, native project opening, the Office-style workbench and project/element navigation were accepted and merged in #58 (`04e508eb75b5ff326ac366ea153d31fce5ab4cb4`). Element rotation/mirroring, optional enhanced accessibility and library refinements were accepted and merged in #59 (`8c464ed782b7f3473e9cf7ba96eb75f41cfd3f15`). Phase 2.7 simple templates, categorized element discovery, structured text regions, live editing and connection feedback were accepted and merged in #61 on 2026-11-15 (`7efb13538f4bd01934bdc254b271c4109180c874`). These merges do not authorize public releases, and native packaging/distribution acceptance remains separate.

The 2026-11-13 Product Owner assignment requested continued development in the existing phase order. The corrected first slice delivered simple templates, including several mind-map layouts and other small starters, using supported editor capabilities. PR #61 accepted that work. PR #62 addressed subsequent Product Owner feedback and was accepted and merged on 2026-11-23 (`27527a7`). PR #64 added local template save and apply and was accepted and merged on 2026-11-23 (`ba11a90`). More detailed templates follow when their required functions and broader element families exist.

| Editor slice | Scope and status |
| --- | --- |
| Phase 2.7: simple built-in templates | Accepted and merged in #61 on 2026-11-15. A local overview offers search, categories, previews and small editable starters, including several mind-map layouts. Applying a template creates a fresh ordinary project. Categorized element discovery, structured text regions, live editing and connection feedback belong to this accepted baseline. See [the implementation and acceptance guide](development/templates.md). |
| PR #62: windows, libraries, tables and connections | Accepted and merged on 2026-11-23. [Window/library/table improvements](development/window-library-tables.md), [individual table dimensions and formulas](development/table-calculations.md), [direct canvas table editing](development/direct-table-editing.md), and [adaptive ports and junctions](development/connection-ports-junctions.md). Includes a compact tabbed symbol ribbon, more IT/arrow/line shapes and layout corrections. |
| PR #64: user-saved local templates | Accepted and merged on 2026-11-23. [Save projects as reusable snapshots](development/local-templates.md), find them under My templates, and use them to create independent projects. Covers the local save and apply workflow for EDIT-012. |
| PR #65: automatic layout and workbench follow-up | Accepted and merged on 2026-11-24 (`10baa38`). [Preview and arrange connected shapes](development/hierarchy-layout.md) vertically or horizontally in one undoable step. The approval-process starter demonstrates decisions, rejoining paths and a rework loop. The [compact Insert menu](development/office-studio.md#compact-insert-menu) gives direct access to common tools and a searchable visual shape chooser. |
| PR #66: swimlane authoring | Accepted and merged on 2026-11-25 (`1b123b8`). [Use named horizontal or vertical lanes](development/swimlanes.md) for process steps and cross-lane connections. The service-request starter demonstrates the workflow. |
| Remaining Phase 2 diagram workflows | Further diagram semantics require implementation and acceptance evidence before Editor alpha is complete. |
| PR #67: local CSV and TSV import | Accepted and merged on 2026-11-26 (`4e6f0fd`). [Preview, import and inspect typed project datasets](development/delimited-data-import.md) for DATA-001 and the first DATA-007 and DATA-016 workflows. |
| PR #69: column and line charts | Accepted and merged on 2026-11-27 (`adb3689`). [Insert suggested charts from saved datasets](development/data-charts.md) and edit the fields, type, title and palette. Covers DATA-008 and the first DATA-009 and DIAG-017 workflows. |
| Phase 3: area and pie charts and typed cell editing | Active implementation for DIAG-017, DATA-006 and DATA-009. [Add area and pie displays](development/data-charts.md#area-and-pie-charts) and [edit scalar dataset cells](development/delimited-data-import.md#edit-a-saved-value) with live chart updates and Undo/Redo. Product Owner acceptance is pending. |
| Further Phase 3 data and export | XLSX/ODS, additional chart types and data-source refresh, SVG/PDF/PNG and interactive HTML, followed by the planned animation/video experiments. The interactive-export remainder of Issue #24 belongs here. |
| Phase 4: visualization breadth | Further network/IT families and their ports/metadata/templates, plus the other diagram families in the preserved table above. See [network and IT planning](planning/network-it-diagrams.md). |

The Product Owner's long-term goal is to cover the element and template breadth of competing tools and add further useful content. Maintain a categorized implementation inventory with provenance and actual support evidence; do not advertise complete competitor parity without verification. Element-library expansion maps to EDIT-015 and remains incremental.

The Phase 2.7 catalog is the first built-in template slice of EDIT-012. Local user templates extend it with save and apply. Template sharing and further interface presets/customization remain [planned separately](planning/studio-design-customization.md).
