# Requirements: entry point and status

The authoritative long-term baseline is the [178-entry catalog](product/feature-catalog.md) and its [CSV representation](product/feature-catalog.csv). The supplied planning archive restores the complete scope under Koxora. The earlier seven-entry summary and five MVP proposals remain cross-referenced in [legacy traceability](traceability.md#legacy-requirement-and-mvp-ids).

## Confirmed requirements: summary

| Requirement | Catalog reference |
| --- | --- |
| Browser and Linux/Windows/macOS share an editor core | CORE-001 |
| Core features without an account | CORE-002 |
| Offline use after provisioning | CORE-003 |
| Local persistence | CORE-004 |
| Portable, versioned native project | CORE-005, CORE-006 |
| English default/fallback; German from inception; localization keys and extensibility | CORE-015 |
| Independent language selection without document mutation | CORE-016 |
| Unicode and RTL preparation | CORE-017 |
| Broad diagram and data visualization scope | DIAG-*, DATA-* |
| Imports/exports including standalone HTML and video | IO-* |
| Optional AI, collaboration, cloud, and platform services | AI-*, COLLAB-*, PLAT-* |
| Website, downloads, docs, community | SITE-* |
| Privacy, QA, CI/CD, security | OPS-* |

## Interpretation

MUST means confirmed long-term scope, not delivery in v0.1/v1.0. P0–P3 in the catalog are original implementation waves, not current GitHub priority labels, numbered roadmap phases, or authorization to implement during Phase 0. A large catalog is not an MVP. Technical, schema, and commercial proposals require spikes and appropriate decisions.

The explicit [language contract](product/internationalization.md) overrides the archive's German-first documentation preference and clarifies CORE-015/CORE-016 without adding or removing requirement IDs.

## First incremental acceptance journey: proposal

Open the browser without an account → create a flowchart/mind map → edit nodes/edges → undo/redo → persist locally → export the native project → open in a desktop prototype → preserve data → reimport. This is proposed implementation sequencing and does not authorize Phase 1.

The Product Owner controls goals and approvals, agents handle technical work, all changes use branches/PRs, and DNS/mail operations remain outside Phase 0. See [PRD](product/prd.md), [vision](product/vision.md), [roadmap](roadmap.md), and [decisions](decisions.md).
