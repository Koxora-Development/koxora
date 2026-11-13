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

The public marketing website is a separate application in `apps/website` and is built and tested on its own:

```sh
pnpm website:build
pnpm website:preview
pnpm test:website
```

It renders static English and German pages, shares the brand and localization contract with the studio, and is deployed independently of it. See the [W1 implementation notes](docs/platform/website-w1.md), the [delivery ADR](docs/adr/0017-public-website-delivery.md) and the [deployment guide](docs/development/website-deployment.md). Nothing is published without a separate Product Owner decision.

Project behavior, the supported file profile, manual acceptance, and current limitations are in the [project storage guide](docs/development/project-storage.md). The [storage ADR](docs/adr/0013-project-storage.md) records the versioned ZIP `.koxora` container and local persistence boundaries.

Desktop commands and native prerequisites, module boundaries, license checks, verification evidence, and limitations are in the [development guide](docs/development/foundation.md). The [stack ADR](docs/adr/0011-foundation-stack.md) and [localization ADR](docs/adr/0012-localization-and-offline-shell.md) record the choices and their tradeoffs. These implementation decisions are subject to PR review; there is no production release or signing setup.

## Product and planning

The [PRD](docs/product/prd.md), [178-entry catalog](docs/product/feature-catalog.md), [CSV](docs/product/feature-catalog.csv), [vision](docs/product/vision.md), [decision register](docs/decisions.md), [architecture](docs/architecture.md), [roadmap](docs/roadmap.md), and [Phase 0 acceptance](docs/phase-0.md) remain the authoritative planning baseline. Historical technology proposals describe long-term possibilities; the implemented foundation and project-storage choices are documented in their ADRs and remain subject to the stated review status.

English is the default/fallback interface language; German is explicitly selectable, independent of operating system language. All technical work remains English. See [internationalization](docs/product/internationalization.md), [agent instructions](AGENTS.md), [contributing](CONTRIBUTING.md), and [security reporting](SECURITY.md).

The project license, branding, distribution signing, cloud, AI, collaboration, and marketplace decisions remain open. All packages are private and marked `UNLICENSED`; this is not a publication or licensing decision.

Phase 2.2 adds the [interactive canvas foundation](docs/development/interactive-canvas.md): pan/zoom, per-page portable views, grid settings and read-only geometry previews. Phase 2.3 extends this foundation with basic element editing. The renderer choice is documented in [ADR 0014](docs/adr/0014-interactive-canvas.md), pending Product Owner review.

Phase 2.3 adds [shapes, editable text and connections](docs/development/shapes-text-connections.md): insert shapes, edit labels/styles, connect endpoints, and save/reopen portable diagrams offline. [ADR 0015](docs/adr/0015-shapes-text-connections.md) documents the registry, geometry, extension fields and command boundary.

Phase 2.4 adds [interactive editing](docs/development/interactive-editing.md): visual palette, direct insertion, multiselection, drag/resize, unified free/attached Line and Arrow tools with visible cardinal ports, whole-label typography, a searchable EN/DE shortcut reference, duplicate/delete, alignment, bounded undo/redo and inline project renaming. [ADR 0016](docs/adr/0016-interactive-editing-history.md) records history and preservation rules. Phase 2.4 was accepted and merged in #23.

Phase 2.5 adds [workbook navigation and rich text](docs/development/workbook-rich-text.md): page/document navigation, identity-safe page operations, per-page views, mixed word formatting, a searchable 20-family local font catalog, atomic batch properties, a freehand pen, stacking and contextual alignment/non-overlap arrangement. [ADR 0018](docs/adr/0018-workbook-rich-text.md) records its additive storage and history contracts. Studio Phase 2.5 was manually accepted and merged in #39 on 2026-10-28; no public release is approved.

Phase 2.6 adds [explicit diagram links](docs/development/interactive-links.md) for review: author URL or same-project page destinations in element properties, then follow with Open link or Alt+Enter. Native project round trips, undo/redo and stable page identities preserve links. Product Owner acceptance remains pending.

Configurable desktop project storage is prepared in [the storage-location guide](docs/development/desktop-storage.md), including migration, retained backups, explicit recovery and CachyOS acceptance. This review work does not authorize a merge or public release.
[Native project opening](docs/development/native-opening.md) documents `.koxora` cold/warm opening, file associations, the optional per-user AppImage integration helper and the packaged OS acceptance matrix. Review builds are not public releases.

The [Office-style workbench](docs/development/office-studio.md), merged with the storage/opening/navigation work in #58, replaces large property dialogs with a compact dock and conventional application menus. [Element rotation and mirroring](docs/development/element-transforms.md) are prepared for Issue #57 review, together with system preferences and library layout refinements. More design presets, a dedicated local-template overview and interface customization are [planned future work](docs/planning/studio-design-customization.md). A separate [network and IT diagram plan](docs/planning/network-it-diagrams.md) covers device symbols, ports, technical details and later software architecture families.
The remaining project/element navigation from Issue #24 is prepared in [the navigation guide](docs/development/project-element-navigation.md): explicit local project identities, element camera/highlight targets, missing-target import/relink guidance and portable optional version-2 links. Interactive exports remain deferred.
