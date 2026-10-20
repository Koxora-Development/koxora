# Architecture overview

**Status: binding product constraints and long-term proposed architecture.** The implemented Phase 1 shell and actual workspace boundaries are documented in the [foundation guide](development/foundation.md); the diagram below includes future modules.

## System boundaries

- Local core editing works without login or network after provisioning.
- Browser and desktop share a versioned project/document model, undo/redo, recovery, and import/export.
- Domain data is separate from rendering; modular engines serve different diagram families.
- Local persistence is fundamental. Cloud, live collaboration, AI, and marketplace are optional adapters.
- Imports, URLs, templates, plugins, HTML exports, and collaboration links cross security boundaries.
- A shared internationalization layer provides English default/fallback, German from inception, key-based interface text, independent language selection, and resource-based language extension.

```text
studio-web / studio-desktop
             |
         editor-ui / i18n
             |
   application / commands
             |
       document-core <----> format / migrations
         |      |                  |
 diagram-engines data-engine  local storage adapters
         |      |
     import-export / templates / themes
             |
 OPTIONAL: ai-adapters, plugin-sdk, collaboration-adapter
             |
 OPTIONAL: cloud-api, realtime, marketplace, accounts, billing
```

The earlier foundation treated local/server storage as alternatives. The authoritative archive resolves this: local storage is required; servers extend the product optionally. Server authorization and account ownership are authoritative server state, never trusted from editable import metadata. Notification queues/retries remain an optional server adapter, with no document content in delivery logs and no mailserver administration privileges.

## Detailed specifications

- [System architecture](architecture/system-architecture.md)
- [Local-first, offline, recovery](architecture/local-first.md)
- [Technology evaluation](architecture/technology-stack.md)
- [Editor and engines](architecture/editor-engine.md)
- [Project format](architecture/project-format.md)
- [Import/export pipeline](architecture/import-export.md)
- [Collaboration](architecture/collaboration.md)
- [AI and plugin safety](architecture/ai-and-plugins.md)
- [Security and privacy](architecture/security.md)
- [Internationalization](product/internationalization.md)

## Quality gates

Type checking, lint, unit/integration, native round-trip/migration, browser/desktop E2E, build matrices, missing-key validation, security, dependency, and license scans are planned. Measure quantitative budgets against reference projects; no validated product benchmarks exist. No application directories or empty packages are created during Phase 0.
