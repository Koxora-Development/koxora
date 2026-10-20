# Development milestones and engineering backlog

**Status: planning baseline v0.1, 2026-10-20. Proposed sequencing and technologies are not delivery promises or implementation authorization.**

## 1. Principles

Milestones are acceptance-based, not calendar guarantees. Preserve every master requirement. Website work can progress alongside editor milestones. Avoid an all-at-once release.

## 2. Milestones

| ID | Milestone | Result |
| --- | --- | --- |
| M0 | Decision foundations | PRD acceptance, license/trademark review, canvas spike, threat model |
| M1 | Foundation | Monorepo, CI, localization, UI, document model/format, browser/desktop shell |
| M2 | Editor alpha | Canvas/tools, mind map, flowchart, organization chart, storage, round trip |
| M3 | Data and export | XLSX/CSV/ODS, charts/bindings, HTML/PDF/SVG, GIF/video prototype |
| M4 | Diagram breadth | UML, BPMN, ER, C4, Gantt, technical/creative families |
| M5 | AI and plugins | User keys, Ollama, SDK/sandbox, templates |
| M6 | Cloud and live teams | Accounts, sync, roles, comments, CRDT, guests, P2P |
| M7 | Community and enterprise | Marketplace/moderation, self-hosting, SSO/audit/support |
| M8 | Hardening and growth | Further locales, accessibility, performance, security, distribution, stability |

## 3. Critical path

License/trademark → core schema → commands → canvas adapter → native round trip → engines → data binding → export capabilities → CRDT bindings → cloud/marketplace. Parallel: internationalization, CI, website, documentation, security.

## 4. Proposed release gates

- 0.1 technical preview: core, canvas, local save/open.
- 0.3 alpha: mind map/flowchart, desktop/browser parity.
- 0.5 public alpha: more diagram families, basic export, website downloads.
- 0.7 beta: data import, charts, export studio, broad testing.
- 0.9 release candidate: schema freeze, migration, security/accessibility.
- 1.0 stable local-first core, with remaining requirements retained in later backlog.
- 1.x/2.x collaboration, cloud, community, marketplace, enterprise according to maturity.

These markers are illustrative and not approved release assignments.

## 5. Preserved initial engineering items

Each catalog row is a product requirement with its own ID and acceptance criterion. The following **27 engineering-item IDs are a separate namespace**, not GitHub issue numbers. Some original IDs overlap catalog IDs; interpret the first column only as an engineering ID and the last only as a catalog requirement reference. Use an explicit `engineering:` prefix in prose where ambiguity is possible; do not renumber existing source IDs.

| Engineering item ID | Proposed task | Milestone | Catalog requirement ID |
| --- | --- | --- | --- |
| ARCH-001 | ADR: open-core and license compatibility | M0 | OPS-012 |
| ARCH-002 | Spike: React Flow versus tldraw performance/license | M0 | EDIT-001 |
| ARCH-003 | Schema v0 with Zod and golden files | M1 | CORE-006 |
| ARCH-004 | Command bus and user-local undo semantics | M1 | CORE-008 |
| ARCH-005 | Browser/desktop storage adapters | M1 | CORE-004 |
| ARCH-006 | ZIP import limits and traversal defense | M1 | IO-015 |
| UX-001 | Design tokens, dark mode, keyboard navigation | M1 | CORE-012 |
| I18N-001 | Locale resources, English fallback, German selection, RTL tests | M1 | CORE-015 |
| DIAG-001 | Mind map engine and automatic layout | M2 | DIAG-001 |
| DIAG-002 | Flowchart and edge routing | M2 | DIAG-005 |
| DATA-001 | XLSX/CSV import pipeline | M3 | DATA-001 |
| DATA-002 | Dataset bindings and refresh | M3 | DATA-009 |
| EXPORT-001 | Standalone HTML with CSP and interaction | M3 | IO-005 |
| EXPORT-002 | SVG/PDF/PNG export tests | M3 | IO-002 |
| EXPORT-003 | GIF/video worker pipeline | M3 | IO-007 |
| AI-001 | User-key secret store and provider SDK | M5 | AI-002 |
| AI-002 | Validate and preview AI commands | M5 | AI-009 |
| SYNC-001 | Yjs model and offline merge spike | M6 | COLLAB-008 |
| SYNC-002 | WebSocket presence and RBAC | M6 | COLLAB-012 |
| SYNC-003 | Guest sessions, links, revocation | M6 | COLLAB-007 |
| MARKET-001 | Moderated template publishing pipeline | M7 | PLAT-008 |
| PLUGIN-001 | Sandbox and permissions spike | M5 | PLAT-014 |
| WEB-001 | Website SEO/localization/downloads | M2 | SITE-001 |
| WEB-002 | Changelog release API and CMS | M2 | SITE-007 |
| OPS-001 | Build matrix, signatures, update feed | M2 | OPS-002 |
| OPS-002 | Security fuzzing and threat model | M1 | OPS-008 |
| ENT-001 | Self-hosting Docker Compose and backups | M7 | PLAT-017 |

## 6. Project management

Suggested labels: `area:*`, `type:feature|bug|security|docs`, `priority:P0..P3`, `status:blocked|ready|in-progress|review|done`, `platform:*`. Each issue needs scope, dependencies, acceptance cases, tests, localization/security checks, and Definition of Done. Epics group catalog requirements. Create actual GitHub issues only under an explicit assignment.

## 7. Capacity and risks

The source estimates that the full scope could take years for one developer with agent assistance; this is not a validated delivery estimate. Key risks: canvas licensing, fidelity, migrations, realtime conflicts, sandboxing, cross-platform builds, moderation, support load. Reduce uncertainty through early spikes and reference projects.

## 8. First two sprints: proposal only

The source suggests two two-week planning units, not scheduled commitments. Sprint A: trademark/license research, ADR template, repository/CI foundation, schema draft, internationalization foundation, UI prototype, canvas comparison. Sprint B: commands, project ZIP round trip, browser storage, desktop shell, mind map prototype, golden tests. None of this application work is authorized by Phase 0 documentation integration.
