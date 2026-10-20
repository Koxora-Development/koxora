# Software Architecture Document

**Status: planning baseline v0.1, 2026-10-20. Product constraints are confirmed; technology and implementation details remain proposals.**

## 1. Goals and constraints

A shared browser/desktop editor, preferably React/TypeScript with Tauri 2, must keep the core independent of HTTP, accounts, and backends. Use a schema-first approach with shared types, versioned commands, adapters, and tests. Separate node/edge, chart, whiteboard, and specialist rendering. Storage and collaboration transports are replaceable adapters. All interface text follows [the language contract](../product/internationalization.md).

## 2. Logical components

```text
apps/studio-web ---------> packages/editor-ui
apps/studio-desktop -----> packages/editor-ui
apps/website -----------> shared UI / i18n
packages/editor-ui -----> packages/application -> packages/document-core
packages/application ---> diagram-engines / data-engine / import-export
packages/application ---> storage-adapters
optional adapters ------> ai-adapters / plugin-sdk / collaboration
apps/platform-api ------> auth / projects / marketplace / entitlements / moderation
services/realtime ------> CRDT persistence / awareness / authorization
infra/ -----------------> CI / observability / releases / deployment
```

The website can reuse UI/i18n resources; the editor core does not depend on it. Paths are conceptual and do not represent created packages.

## 3. Technology status

| Component | Candidate | Status |
| --- | --- | --- |
| UI | React, TypeScript, Tailwind | Preferred |
| Desktop | Tauri 2 | Preferred; OS packaging spike required |
| Monorepo | pnpm Workspaces; optional Turborepo | Preferred |
| Graph editor | React Flow or tldraw | Spike and license review open |
| Layout | ELK.js, Dagre | Spike open |
| Charts | Apache ECharts | Preferred |
| Data import | SheetJS or alternatives | Parser/license decision open |
| Collaboration | Yjs CRDT | Preferred |
| Website | Astro or Next.js | Open |
| API | Laravel | Preferred |
| Database | PostgreSQL | Preferred |
| Asset storage | S3-compatible | Preferred |
| Testing | Vitest, Playwright, Rust tests | Preferred |

No library is approved or installed by this plan.

## 4. Module contracts

- `document-core`: immutable domain states, schemas, commands, validation, migration; no UI/network imports.
- `diagram-engines`: conceptual `supports(documentType)`, `render(view)`, `layout(options)`, `validate(domainModel)`; no direct file access.
- `data-engine`: sources, dataset snapshots, transforms, dependency graph, refresh policy.
- `import-export`: format registry, capabilities, fidelity warnings, streaming/workers, deterministic tests.
- `storage-adapters`: browser IndexedDB/OPFS and native files, with possible SQLite metadata.
- `collaboration`: CRDT bindings, presence, authorization, interchangeable cloud/P2P providers.
- `ai-adapters`: providers, secret store, prompt-to-validated-command, explicit confirmation.
- `plugin-sdk`: manifest permissions, signatures, sandboxing, versioned APIs/SemVer.
- `i18n`: locale resources/registry/loader, English fallback, persisted explicit selection, plurals and formatting.

## 5. Write path and conflicts

User action → command/validation → document model → local persistence → optional CRDT operation → transport. Domain constraints remain valid under concurrency. Specify deletion, references, renames, assets, and data-refresh merge semantics. Undo is user-local and must not blindly reverse another user's work.

## 6. Persistence

Local state supports offline operation; browser cache is not the sole backup. Cloud stores project versions, assets, permissions, and potentially encrypted snapshots. Keep database/object-store references consistent and define garbage collection. Treat import/cloud conflicts visibly rather than overwriting.

## 7. Security

Threat-model ZIP bombs, traversal, SVG/HTML XSS, template injection, plugins, export scripts, key leakage, guest links, CSRF, privilege escalation, SSRF, and the supply chain. Use plugin isolation, CSP/sanitization, short-lived scoped tokens, encrypted transport, administrative auditing, and data minimization.

## 8. Distribution and operation

Signed desktop artifacts and update feeds, Stable/Beta/Nightly. Candidate packages: Linux AppImage/Flatpak/optional DEB, Windows MSI/EXE, macOS DMG with Apple Silicon/Intel support subject to builds. Deploy static website/PWA independently of the cloud API. Docker Compose for self-hosting, optional Helm later.

## 9. Quality gates

Format/lint, type checks, unit/integration, file fuzzing, round-trip/migration, platform E2E, missing localization keys, license checks, SBOM, and security scans. Small/medium/large reference files measure rendering, import/export, recovery, and performance budgets.

## 10. Proposed ADR topics

ADR-001 license strategy; ADR-002 canvas engine; ADR-003 document model; ADR-004 CRDT document boundaries; ADR-005 storage adapters; ADR-006 backend/website stack; ADR-007 export sandbox; ADR-008 plugin permissions; ADR-009 AI key storage; ADR-010 E2EE and cloud search. These are reserved planning topics, not accepted ADRs or links to existing records. See [ADR guidance](../adr/README.md).
