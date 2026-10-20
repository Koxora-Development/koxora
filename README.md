# Koxora

A local-first visualization studio. The Phase 1 technical foundation provides a shared browser/desktop shell, English and German, persistent preferences, light/dark themes, and development checks. Canvas editing and project files are not implemented yet.

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

Desktop commands and native prerequisites, module boundaries, license checks, verification evidence, and limitations are in the [development guide](docs/development/foundation.md). The [stack ADR](docs/adr/0011-foundation-stack.md) and [localization ADR](docs/adr/0012-localization-and-offline-shell.md) record the choices and their tradeoffs. These implementation decisions are subject to PR review; there is no production release or signing setup.

## Product and planning

The [PRD](docs/product/prd.md), [178-entry catalog](docs/product/feature-catalog.md), [CSV](docs/product/feature-catalog.csv), [vision](docs/product/vision.md), [decision register](docs/decisions.md), [architecture](docs/architecture.md), [roadmap](docs/roadmap.md), and [Phase 0 acceptance](docs/phase-0.md) remain the authoritative planning baseline. Historical technology proposals describe long-term possibilities; only the foundation choices in the new ADRs are implemented.

English is the default/fallback interface language; German is explicitly selectable, independent of operating system language. All technical work remains English. See [internationalization](docs/product/internationalization.md), [agent instructions](AGENTS.md), [contributing](CONTRIBUTING.md), and [security reporting](SECURITY.md).

The project license, branding, distribution signing, cloud, AI, collaboration, and marketplace decisions remain open. All packages are private and marked `UNLICENSED`; this is not a publication or licensing decision.
