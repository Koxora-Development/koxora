# Koxora

A local-first visualization studio. The shared browser/desktop shell supports English and German, persistent preferences, and light/dark themes. Versioned projects, local saves, `.koxora` import/export and previous-save recovery support an interactive canvas with direct shape insertion, selection, movement, resizing and undo/redo.

## Quick start

Use Node.js 22.22.0 (see `.node-version`) and pnpm 10.32.1 (see `packageManager`). Node 24 is also supported. Python 3.9+ runs the documentation validator.

```sh
npm install --global pnpm@10.32.1
pnpm install --frozen-lockfile
pnpm dev
```

Open the address Vite prints. No account, backend, environment variables, or API credentials are needed. For offline reload, use the production build: `pnpm build && pnpm preview`; load it online once and let its service worker finish installation. Development mode does not cache the application.

```sh
pnpm check
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm test:e2e
```

Project behavior, the supported file profile, manual acceptance, and current limitations are in the [project storage guide](docs/development/project-storage.md). The [storage ADR](docs/adr/0013-project-storage.md) records the versioned ZIP `.koxora` container and local persistence boundaries.

Desktop commands and native prerequisites, module boundaries, license checks, verification evidence, and limitations are in the [development guide](docs/development/foundation.md). The [stack ADR](docs/adr/0011-foundation-stack.md) and [localization ADR](docs/adr/0012-localization-and-offline-shell.md) record the choices and their tradeoffs. These implementation decisions are subject to PR review; there is no production release or signing setup.

## Product and planning

The [PRD](docs/product/prd.md), [178-entry catalog](docs/product/feature-catalog.md), [CSV](docs/product/feature-catalog.csv), [vision](docs/product/vision.md), [decision register](docs/decisions.md), [architecture](docs/architecture.md), [roadmap](docs/roadmap.md), and [Phase 0 acceptance](docs/phase-0.md) remain the authoritative planning baseline. Historical technology proposals describe long-term possibilities; the implemented foundation and project-storage choices are documented in their ADRs and remain subject to the stated review status.

English is the default/fallback interface language; German is explicitly selectable, independent of operating system language. All technical work remains English. See [internationalization](docs/product/internationalization.md), [agent instructions](AGENTS.md), [contributing](CONTRIBUTING.md), and [security reporting](SECURITY.md).

The project license, branding, distribution signing, cloud, AI, collaboration, and marketplace decisions remain open. All packages are private and marked `UNLICENSED`; this is not a publication or licensing decision.

Phase 2.2 adds the [interactive canvas foundation](docs/development/interactive-canvas.md): pan/zoom, per-page portable views, grid settings and read-only geometry previews. Phase 2.3 extends this foundation with basic element editing. The renderer choice is documented in [ADR 0014](docs/adr/0014-interactive-canvas.md), pending Product Owner review.

Phase 2.3 adds [shapes, editable text and connections](docs/development/shapes-text-connections.md): insert shapes, edit labels/styles, connect endpoints, and save/reopen portable diagrams offline. [ADR 0015](docs/adr/0015-shapes-text-connections.md) documents the registry, geometry, extension fields and command boundary.

Phase 2.4 adds [interactive editing](docs/development/interactive-editing.md): visual palette, direct insertion, multiselection, drag/resize, independent lines/arrows, duplicate/delete, alignment, bounded undo/redo and inline project renaming. [ADR 0016](docs/adr/0016-interactive-editing-history.md) records history and preservation rules. Product Owner acceptance and merge remain pending.
