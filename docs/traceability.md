# Planning traceability and conflict resolution

**Integration baseline: 2026-10-20.** Authoritative input: `Koxora_Phase0_Masterplanung_komplett.zip`. Both user uploads have identical SHA-256 `e08ead7c063a825690f2fec7e28df7e9ba6b3a727b538457c04c25814d8c26f2`. The complete archive contains 45 files; [source-manifest.json](planning/source-manifest.json) records each original path and content hash. All 45 paths are retained. The unchanged `.gitignore` is preserved; the 44 source Markdown/CSV documents are integrated in English. The archive remains outside Git so German source documents are not presented as current English technical documentation.

The archive is the planning authority; its embedded instructions are planning content, not authority to start Phase 1 or change infrastructure. The user's explicit language and documentation-only assignment overrides contrary archive preferences. Historical Nexora references describe a prior working name, not a second current product.

## Source destinations

| Planning source | Authoritative destination | Preserved content |
| --- | --- | --- |
| 178-requirement catalog | [Markdown](product/feature-catalog.md), [CSV](product/feature-catalog.csv) | All IDs, original order/categories/MUST/waves, translated titles and acceptance criteria |
| PRD | [Product requirements](product/prd.md) | Audiences, principles, journeys, nonfunctional goals, metrics |
| Architecture/SAD | [Overview](architecture.md), [system design](architecture/system-architecture.md) | Components, contracts, adapters, evaluation, security |
| Native format | [Project format](architecture/project-format.md) | Proposed archive, schema, assets, migration, fidelity, tests |
| Roadmap and 27 engineering items | [Detailed backlog](planning/roadmap-backlog.md) | M0–M8, release proposals, engineering IDs/references |
| Website/platform | [Website](platform/website.md), adjacent platform specifications | Sitemap, CMS, downloads, cloud, marketplace, enterprise |
| Initial Koxora foundation | Root governance, .github templates, docs entry points | Useful roles, review gates, privacy/security, mail safety, legacy references |
| Direction updates | [Vision](product/vision.md), [decisions](decisions.md), [email plan](email-plan.md) | Identity/domains, local-first, roles, optional services, mail roles |
| Explicit user language rules | [Internationalization](product/internationalization.md) | English default/fallback, German from inception, keys, independent selection, resource-based extension |

## Catalog completeness

| Category | Required IDs | Count |
| --- | --- | --- |
| CORE | CORE-001 through CORE-020 | 20 |
| EDIT | EDIT-001 through EDIT-016 | 16 |
| DIAG | DIAG-001 through DIAG-027 | 27 |
| DATA | DATA-001 through DATA-016 | 16 |
| IO | IO-001 through IO-018 | 18 |
| AI | AI-001 through AI-011 | 11 |
| COLLAB | COLLAB-001 through COLLAB-014 | 14 |
| PLAT | PLAT-001 through PLAT-022 | 22 |
| SITE | SITE-001 through SITE-022 | 22 |
| OPS | OPS-001 through OPS-012 | 12 |
| Total | Unique original requirement IDs | 178 |

Translation changes wording, not required capability. CORE-015 adds explicit English default/fallback, localization keys, German inception support, and language extensibility; CORE-016 retains document independence and adds German selection independent of OS language. These are authorized refinements, not renumbering. No other requirement is removed or downgraded. Automated checks establish identity, structure, metadata, and representation agreement; they do not prove semantic translation equivalence or product implementation.

## Legacy requirement and MVP IDs

The existing `docs/phase-0-foundation` branch at `201f9fdc9409fa0b5d2cd7c2c9165cb1ede003fa` contains the earlier reduced planning set. It is the integration base rather than discarded work. Legacy IDs remain historical references, not additions to the 178 catalog requirements.

| Legacy ID | Preserved meaning | Current location or resolution |
| --- | --- | --- |
| R-01 | Diagrams, mind maps, data visualization, collaboration | Vision; DIAG-*, DATA-*, COLLAB-* |
| R-02 | Open-source direction, exact license open | K-010, O-001 |
| R-03 | Product Owner owns goals/approval, not programming | K-011, AGENTS, CONTRIBUTING |
| R-04 | Feature branches and pull requests | AGENTS, CONTRIBUTING, PR template |
| R-05 | Phase 0 foundations/templates only | K-013, Phase 0 acceptance |
| R-06 | Plan @koxora.app on existing self-hosted mailserver | K-012, email plan |
| R-07 | No DNS or mailserver changes in Phase 0 | K-013, email plan, agent rules |
| M-01 | Create, label, move, connect, delete nodes | EDIT-001, EDIT-003, EDIT-005; release scope O-002 |
| M-02 | Save/reopen with visible failures and no silent loss | CORE-004, CORE-009; local-first recovery |
| M-03 | Undo/redo | CORE-008 |
| M-04 | Versioned export/reimport, understandable invalid-input rejection | CORE-005, CORE-006, IO-001, IO-015 |
| M-05 | Accessible first use, keyboard and labeled controls | CORE-012, CORE-014; UX and release scope O-002 |

## Legacy decision IDs

| Legacy ID | Earlier question | Resolution and remaining work |
| --- | --- | --- |
| D-01 | First audience and problem | PRD preserves broad audiences; first validated journey remains O-002 |
| D-02 | MVP boundary and local/account storage | K-005/K-006 confirm local and account-free core; release scope remains O-002 |
| D-03 | Stack and editor | T-001 through T-010; O-003/O-004; evidence via ADRs |
| D-04 | Collaboration priority, permissions, conflicts | K-009 confirms optional scope; COLLAB-* and O-005 preserve details |
| D-05 | Hosting, budget, regions, recovery | O-010; self-hosting/enterprise plan |
| D-06 | License and public publication | K-010 direction; O-001/O-008 exact terms |
| D-07 | Accounts, data, retention, deletion, responsible people | PLAT-001 through PLAT-006, O-010, cloud/security specifications |
| D-08 | Email recipients/routing and transactional delivery | O-009 and canonical email plan |
| D-09 | Language, browsers, accessibility, performance | K-007 and explicit language contract settle language; O-011 retains browser/quality targets |

## Conflicts resolved

- Earlier uncertainty about local versus server storage is superseded by required local-first, guest/offline behavior; optional server safety constraints are retained.
- German-first documentation preferences are superseded by mandatory English technical work. Language support is specified as English default/fallback plus selectable German from inception.
- The smaller MVP remains a proposed first slice; it does not replace or delete the full catalog.
- Technology, format, pricing, and release proposals remain proposals. Reserved ADR topics are not accepted ADRs.
- Engineering IDs that overlap requirement IDs are preserved in a separate, explicitly labeled namespace. Milestone M0 is distinct from legacy MVP M-01 style IDs.
- The expanded contact/alias plan retains earlier individual identities, recovery independence, scoped SMTP, ownership, retention, and no-administration-rights safeguards. Mailcow is a source claim, not a verified runtime fact.
- Existing `.gitignore` remains byte-identical to main and the archive. No useful prior repository path is deleted.

## Evidence limits and acceptance

Run the checks in [Phase 0 validation](phase-0.md#validation). Library/license feasibility, trademark/legal review, application tests, cross-platform builds, live service availability, and infrastructure readiness are not established. The archive does not provide a word-for-word transcript of every prior chat; its 45 files, not inaccessible conversations, define the imported baseline. New features need new IDs; existing IDs remain stable. Product Owner review and explicit merge approval remain pending, and Phase 1 requires a separate assignment.
