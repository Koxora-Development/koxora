# Technology candidates and decision method

**Status: preferred candidates, no adopted dependencies.** Record decisions as ADRs after spikes and license/maintenance review.

| Layer | Candidate | Evaluation |
| --- | --- | --- |
| Monorepo | pnpm Workspaces, optional Turborepo | Determinism, CI/cache, licensing |
| Web editor/UI | React, TypeScript, Vite, Tailwind | Ecosystem, accessibility, performance, bundle size |
| Desktop | Tauri 2 | Three OS targets, signing, system APIs |
| Schemas/commands | TypeScript, Zod or equivalent | Serialization, validation, migrations, stable API |
| Graph/canvas | React Flow or tldraw | License, behavior, complex diagrams |
| Automatic layout | ELK.js, Dagre | Quality and reproducible tests |
| Data visualization | Apache ECharts | Offline support, graphics, license, export fidelity |
| Parsers | Safe CSV/XLS/XLSX/ODS/JSON libraries | Licenses, memory limits, formulas/injection |
| Optional realtime | Yjs and WebSockets | Semantics, persistence, RBAC, offline merging |
| Website | Astro or Next.js | SEO, localization, CMS, deployment cost |
| Optional API | Laravel | Realtime integration, authentication, operation |
| Optional database | PostgreSQL | Tenancy, indexes, backups |
| Optional assets | S3-compatible, for example MinIO | Hashes, scans, ACLs, deletion |
| Tests/CI | Vitest, Playwright, Rust tests, GitHub Actions | Linux/macOS/Windows matrix and cost |
| Internationalization | Shared resources, locale registry, library to evaluate | English fallback, German selection, plurals, RTL, offline persistence |

## Proposed layout

```text
apps/studio-web/           # Browser/PWA core
apps/studio-desktop/       # Desktop shell
apps/website/              # Marketing, downloads, docs
apps/platform-api/         # Optional later
apps/admin/                # Optional later
packages/document-core/    # Model, commands, migration
packages/application/      # Use cases and adapter orchestration
packages/editor-ui/        # Editor interface
packages/diagram-engines/  # Diagram families
packages/data-engine/      # Sources and charts
packages/import-export/    # Format registry
packages/storage-adapters/ # IndexedDB/OPFS/native files
packages/i18n/             # English default/fallback; German from inception
packages/ui/               # Design tokens and components
packages/collaboration/    # Optional realtime
packages/ai-adapters/      # Optional BYOK/local models
packages/plugin-sdk/       # Optional later
services/realtime/         # Optional later
docs/                      # PRD, ADRs, product documentation
infra/                     # CI, release, operation artifacts
```

## Spikes before adoption

Compare candidates using the same 100/1,000/10,000-element scenes and domain edge cases; derive budgets from measurement. Demonstrate offline browser/desktop file round trip and migration. Build Linux packages and native Windows/macOS artifacts on suitable runners; do not claim unbuilt cross-OS packages work. Test HTML/plugin isolation independently. Review transitive licenses, maturity, security history, and maintenance. The existing Node-oriented `.gitignore` is not evidence of a selected stack.
