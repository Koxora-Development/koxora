# Decision register

**Rule:** Separate Product Owner decisions from technical/business candidates. The authoritative archive supersedes the earlier reduced foundation where confirmed constraints had been marked open. Explicit user language instructions override the archive's German documentation preference. See [traceability](traceability.md) for every legacy D-ID.

## A. Confirmed direction

| ID | Decision | Status | Consequence |
| --- | --- | --- | --- |
| K-001 | Product/project name: Koxora | Confirmed | Use Koxora; trademark clearance remains separate |
| K-002 | Registered domains: koxora.app, koxora.com, koxora.de | Confirmed in planning source | Primary .app; proposed .com redirect to .app and .de to /de/ are not configured |
| K-003 | Organization Koxora-Development, repository koxora | Confirmed | Align branches, PRs, and agent work |
| K-004 | Shared browser and Linux/Windows/macOS editor | Confirmed | Platform-independent core |
| K-005 | Local-first, offline-capable local core | Confirmed | Browser/desktop persistence without backend requirement |
| K-006 | Browser editor without an account | Confirmed | No login barrier for core, imports, or exports |
| K-007 | Internationalization from inception: English default/fallback and German support | Confirmed; explicit user clarification | Every interface string uses keys; German selectable independently of OS; new languages use resources without logic changes; all technical work in English |
| K-008 | Broad diagram/data/import/export vision | Confirmed long-term scope | Incremental delivery; retain all catalog IDs, no fixed dates |
| K-009 | Optional AI and optional cloud/collaboration | Confirmed product principle | Core features do not depend on cloud/providers |
| K-010 | Open-source direction | Confirmed | Exact license required before publication |
| K-011 | Product Owner prioritizes, accepts, and approves; agents implement | Confirmed | PR review, actual checks, manual acceptance |
| K-012 | Existing self-hosted mailserver is the planned @koxora.app basis | Confirmed in planning source | Koxora mailboxes, DNS, delivery, software, and routes remain unverified |
| K-013 | Phase 0 is documentation, without application or DNS changes | Confirmed | Separate Phase 1 authorization required |

## B. Preferred technical direction: not final decisions

| ID | Topic | Candidate and rationale | Required evidence |
| --- | --- | --- | --- |
| T-001 | Web editor | React, TypeScript, Vite, Tailwind | Small end-to-end demo, bundle, accessibility |
| T-002 | Desktop shell | Tauri 2 | Linux/Windows/macOS build/filesystem spikes |
| T-003 | Monorepo | pnpm Workspaces; optional Turborepo | Reproducible startup and CI |
| T-004 | Graph engine | React Flow or tldraw | License, editing, performance, export, touch |
| T-005 | Layout | ELK.js/Dagre | Reference diagrams and deterministic tests |
| T-006 | Data charts | Apache ECharts | Integration/license review |
| T-007 | Realtime | Yjs/CRDT and WebSockets; optional WebRTC | Conflict, offline, authorization spike |
| T-008 | Website | Decided 2026-10-24 for Website W1: static multilingual pages built with the accepted React, TypeScript and Vite stack instead of a second framework; Astro and Next.js remain untaken options for a later content-management need | [ADR 0017](adr/0017-public-website-delivery.md); indexable output, localization and tests verified in the W1 pull request |
| T-009 | Cloud API | Laravel, PostgreSQL, S3-compatible storage | Operation, realtime, permissions, cost |
| T-010 | Native extension | .koxora ZIP plus JSON | Security, versions, migrations |
| T-011 | AI | User keys and local models such as Ollama | Secret handling and privacy |

## C. Open product, legal, and operating questions

| ID | Open decision | Proposal or criteria | Required before |
| --- | --- | --- | --- |
| O-001 | OSS license and branding | Compare GPL/AGPL/Apache/MIT against core/plugin/cloud model | Public publication |
| O-002 | Initial release and v1.0 scope | Reliable local-first foundation before breadth; select first audience/journey | Phase 1 scope/release planning |
| O-003 | First reference canvas behavior and design | Small comparable accessible/efficient prototype | Editor foundation |
| O-004 | Final IDs, schemas, MIME, format | Proposed .koxora; migrations and golden files | Native format implementation |
| O-005 | Realtime hosting and guest links | Server/P2P safety, expiry, permissions, revocation, E2EE tradeoffs | Collaboration |
| O-006 | Cloud plans, free allowances, paid boundaries | Separation, cost model, license compatibility | Billing/commercial operation |
| O-007 | Community, moderation, marketplace, payments | Upload checks, policies, fees/tax | Public uploads |
| O-008 | Self-hosting community/enterprise license | Legal core/add-on boundary without data lock-in | Self-hosting publication |
| O-009 | Email recipients and routing | Primary contact mailbox, aliases, internal roles | Mail-domain setup |
| O-010 | Infrastructure, operations, budget, backups, retention | Regions, owners, secrets, recovery, SLA only if approved | Cloud pilot |
| O-011 | Accessibility and performance targets | WCAG 2.2 AA design target; measured budgets and browser matrix | Public beta |
| O-012 | Translations beyond English/German | Prioritize Spanish/French/Italian/Dutch/Polish/Portuguese etc. | Translation rollout |
| O-013 | Signing and distribution | Apple/Windows signing, Flatpak/stores, automation | Public desktop releases |
| O-014 | Graphic asset provenance, ownership, and operation | Trademark/license review, fonts/icons | Published brand assets |

## Decision records

For acceptance, record status, date, accepting role, rationale, alternatives, consequences, evidence, and issue/PR links. New evidence may reopen a decision for explicit review; do not silently override it. Confirmed K-decisions take precedence over candidate tables. The user-supplied language rules are already confirmed and do not require another language-default decision. Unspecified library/resource details remain technical work.

A document's acceptance does not approve every open option it contains. Human approval is required before merge, and a Phase 0 merge does not authorize Phase 1.

## Phase 2.2 proposal

[ADR 0014](adr/0014-interactive-canvas.md) proposes a framework-independent viewport/grid core and replaceable SVG preview adapter, with portable optional view settings in the existing format. Implementation and verification do not constitute Product Owner architecture acceptance or merge approval.
