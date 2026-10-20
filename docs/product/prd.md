# Product Requirements Document

**Status: planning baseline v0.1, 2026-10-20. Product direction is confirmed; technical designs and release assignments are proposals.**

## 1. Vision

Koxora is a planned free-to-use, international, local-first studio for diagrams, mind maps, data visualizations, and interactive visual documents. Browser and Linux/Windows/macOS share one editor. Registration is never required for local core features. Cloud, collaboration, community, and enterprise are optional services.

## 2. Audiences and jobs

| Audience | Job | Success criterion |
| --- | --- | --- |
| Pupils, students, educators | Present ideas and processes | Start within minutes without an account |
| Developers and IT administrators | Document UML, ER, C4, and networks | Editable, portable exchange |
| Analysts and business teams | Visualize spreadsheet data | Updates through data binding |
| Designers and content creators | Create infographics and animations | High-quality HTML/SVG/video output |
| Teams and organizations | Work together | Live sync, roles, comments |
| Privacy-conscious users | Work offline or self-host | No mandatory external data transfer |

Selecting the first audience and validating demand remains part of release scoping, not a reason to remove the other audiences.

## 3. Product principles

1. Local-first core functionality without login.
2. Portable, documented native project format.
3. Free import/export, including interactive HTML, as product direction; exact licensing and commercial boundaries remain open.
4. Optional AI with user-provided keys and local models.
5. Internationalization as a foundation: English default/fallback, German from inception, independent user selection, localization keys for every interface string, extensibility without logic changes, and separation from document language. See [language contract](internationalization.md).
6. Quality, accessibility, security, and migration before growth.
7. Free basic features; candidate revenue from managed cloud, enterprise administration, support, services, and optional marketplace commissions. No prices or paid-feature boundaries are approved.

## 4. Scope and traceability

All 178 IDs in the [catalog](feature-catalog.md) belong to long-term scope across CORE, EDIT, DIAG, DATA, IO, AI, COLLAB, PLAT, SITE, and OPS. A phase defers features rather than deleting them. Catalog waves P0–P3 are historical groupings, not releases or Phase 0 implementation instructions.

## 5. User journeys

### A. Without registration

Open the website → activate the localized browser-start action (`actions.openEditor`) → create a diagram → continue offline → download a native project → import on another operating system → edit → export HTML/PDF/SVG. Key names are illustrative, not a committed resource schema.

### B. Spreadsheet to visualization

Import XLSX → choose a worksheet → verify types → choose a suggestion → configure bindings → style the chart → export standalone HTML.

### C. Shared session

Open a project → activate the localized sharing action (`actions.shareProject`) → choose cloud or a temporary guest session → create a role-scoped invitation → edit together → synchronize offline changes → restore a version.

### D. Publish a template

Export locally → optionally sign in → specify license, tags, and preview → security/moderation checks → publication → download by the community without login.

### E. Enterprise

Self-host the community server → optionally enable enterprise capabilities → use SSO, policies, and auditing → retain data ownership and backups.

## 6. Nonfunctional requirements

- Platform parity with documented OS exceptions.
- Offline startup after installation or successful PWA caching; no hidden server dependency.
- Structured errors, crash recovery, file migrations, and data-loss prevention.
- WCAG 2.2 AA as a design target, with measured and documented exceptions; no compliance certification is claimed.
- No unrequested document transfer to AI providers.
- No secrets in project exports; encrypted cloud transport and appropriate encryption at rest.
- Performance budgets based on prototypes and reference files rather than invented measurements.
- Locale fallback, plurals, Unicode/RTL preparation, and translation completeness tracking.

## 7. Candidate product metrics

First-diagram completion, import/export success, crash-free sessions, recovery success, P95 load time, collaboration synchronization latency, template activation, and voluntary managed-cloud conversion. Instrument minimally and transparently, with an appropriate legal basis; no mandatory tracking.

## 8. Definition of Done

Reference feature IDs; localize the interface; verify permissions; run relevant unit/integration/E2E, offline, round-trip, and migration checks; update documentation and release notes; review security and accessibility. Report actual evidence.

## 9. Open decisions

Trademark clearance, exact OSS/open-core license, initial canvas engine, v1.0 scope, paid cloud limits, P2P security, market/payment validation, and community moderation rules. Confirmed name/domains, local-first, and language principles are recorded in [K-001 through K-013](../decisions.md); they do not settle these technical, legal, or operating questions.
