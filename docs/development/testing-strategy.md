# Quality and testing strategy

**Status: long-term strategy with a Phase 1 foundation subset implemented.** See [current commands and limitations](foundation.md#local-checks); editor, project-file, collaboration and native UI scenarios below remain future work.

## Test layers

| Layer | Target | Examples |
| --- | --- | --- |
| Unit | Commands, schema, transforms, layout helpers | Undo/redo, validation, parsers, numbers/time zones |
| Property/fuzz | Files, importers, converters | Random graphs, damaged ZIPs, traversal, Unicode |
| Integration | Adapters and engines | Native round trip, layout, HTML export, browser/native storage |
| Web E2E | User journeys | Guest, offline, keyboard, import/export, recovery |
| Desktop E2E | Native shell/files | Linux/Windows/macOS, dialogs, save/restore, updates |
| Realtime | Sync, roles, guest links | Concurrency, reconnect, revocation, undo conflicts |
| Accessibility | Editor and website | Keyboard/screen reader, contrast, zoom, reduced motion |
| Security | Data, dependencies, cloud | XSS, CSP, SSRF, limits, authorization, plugin isolation |
| Performance | Reference projects | Small/medium/large diagrams, data imports, rendering/export |
| Internationalization | Resources, selection, fallback | English default/fallback, German selection, plural/format/RTL cases |

## Fixtures

Use synthetic or freely licensed examples, never real user data. Keep golden files for supported schema versions, migrations, and forward compatibility. Cover English/German, Unicode/RTL labels, special characters, large assets, and missing fonts. Negative cases include disk-full, quotas, offline start/network loss, corrupt files, unsupported features, and cloud interruption.

Localization tests must verify an English initial UI even on a German OS, explicit German selection independent of OS, preference persistence offline, no document-content changes, missing-German fallback to English, missing-English detection, no hardcoded interface strings, and a resource-only additional locale. See [acceptance scenarios](../product/internationalization.md#acceptance-scenarios-for-implementation).

## Evidence and current checks

Every story links IDs, verifiable acceptance cases, commands, and actual results. Planning is not a passing product test. Phase 0 validates only documentation structure, links/anchors, fenced JSON, CSV/Markdown agreement, ID references, source inventory, and completeness.

Run `python3 scripts/validate_docs.py`. For an independent comparison against the supplied archive, run `python3 scripts/validate_docs.py --source-archive /absolute/path/to/Koxora_Phase0_Masterplanung_komplett.zip`. The source file remains outside Git. The documentation validator still uses only Python's standard library. The separately authorized Phase 1 foundation adds application dependencies, unit/browser tests and CI; see the development guide for executable commands and actual evidence.
