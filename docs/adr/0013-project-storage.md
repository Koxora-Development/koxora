# Versioned ZIP projects and local persistence

## Status and responsibility

Implemented for Phase 2.1 Product Owner review, revised 2026-10-21. The Product Owner explicitly requires the ZIP container and rejected the initial JSON-only proposal. This ADR supersedes that proposal; it does not imply product acceptance, merge authorization or release approval.

References: CORE-001 through CORE-007, CORE-009, CORE-010, CORE-012, CORE-014 through CORE-019, K-004 through K-007, O-004, T-010, the [project-format specification](../architecture/project-format.md), and [local-first architecture](../architecture/local-first.md). These remain foundations for the full catalog, not completed canvas features.

## Decision

Use a versioned ZIP32 `.koxora` container with independent format/core-schema versions, minimum reader versions, a manifest resource table, six collection indexes, individual documents/datasets/themes/templates, content-addressed binary assets and document previews. Implement validated domain storage for pages, shapes/nodes, layers, connections, relationships, datasets and bindings, styles, four diagram model namespaces, declarative actions/animations, localization and optional plugin data. The corresponding editors are outside scope.

`packages/project` owns framework-independent types, executable runtime validation, ZIP parsing/writing, SHA-256 integrity, deterministic serialization and explicit migration. It depends on standard platform byte, text, crypto and compression APIs, not React, storage, filesystem or network APIs. STORE export avoids platform compressor differences. Import accepts STORE/DEFLATE with bounded standard `DecompressionStream('deflate-raw')`; ZIP framing is a small audited profile that rejects unsupported encryption, ZIP64, links, multivolume archives and ambiguous entries. This avoids an unreviewed dependency addition but makes parser regression tests and independent security review essential. Supported webviews must supply that compression API for DEFLATE input; STORE input/output works without it.

Every imported file is verified against ZIP CRC and manifest SHA-256/length descriptors. Unknown compatible optional JSON fields, index metadata, resource metadata and opaque resource bytes survive round trips. Required unknown semantics fail without replacing the active project. Exact compatibility, archive restrictions, field schemas, version rules and configurable resource budgets are specified in the linked format document rather than duplicated here.

UUID v4 is the factory default; canonical lowercase UUID versions 1–8 are accepted. References are checked within their declared scopes and all modeled identities are project-unique. Source files remain untouched. Import-as-copy changes only the project ID and never tries to rewrite opaque extension values.

## Refinements of the original planning specification

The container follows the original ZIP design. Assets use `assets/<sha256>` with explicit media types rather than guessed filename extensions. All six collections have explicit indexes, including empty collections. Previews use stable UUID filenames and a document reference. Nodes and connections are separate typed arrays rather than a single loosely typed elements array. Dataset schemas are embedded `fields` records referenced by UUID, with row objects keyed by field ID. These choices are concrete refinements for review, not reasons to defer essential storage structures.

No public vendor MIME registration, archive encryption or downgrade export is introduced. JSON numbers use finite binary64 with safe integers; exact large integers should be strings. Namespaced metadata is inert. Import never executes actions, animations, scripts or plugins and never fetches external resources.

## Migration and preservation

The prior JSON-only implementation was not released. Normal `.koxora` import now accepts ZIP only. `importLegacyJson` is an explicit development migration, backed by source and target fixtures. It preserves existing object IDs, derives stable wrapper IDs, adds required structural defaults, and retains the entire old parsed project in a namespaced extension. Old local snapshots migrate in memory; saving retains the original raw snapshot as the previous save.

The migration runner follows explicit exact version steps on copies, detects cycles/missing routes and propagates failure. Target validation precedes persistence. Future migrations must supply source/target fixtures, version-specific validators and no-loss rules. Newer optional minor/patch data retains its version instead of being silently downgraded.

## Persistence and platform separation

`packages/persistence` owns the shared repository and atomic compare-and-swap contract. It stores the same native ZIP bytes as base64 in existing string snapshot envelopes, with current and previous values committed together. The encoding permits reuse of the established IndexedDB/native transport; it costs approximately one third extra storage and temporary memory. It is an internal transport, not a second native format.

Browser projects use IndexedDB, independently of preferences and offline shell caches. Desktop projects use app-data `projects-v1/<project-id>/` with OS file locks, expected-record comparison, synchronized temporary writes and immutable generation publication. Readers ignore pending files; the latest two generations are retained. The native record limit is 256 MiB and export limit 64 MiB. The native adapter exports byte arrays without text decoding. Only scoped project commands are available to the main window; no general filesystem command or arbitrary destination is exposed.

Browser downloads and native export receive identical shared serializer bytes. Native export synchronizes a temporary file and publishes it under a unique name using a non-overwriting hard link in Downloads. Unsupported filesystems return a storage error. A native save-location dialog, in-place overwrite, unlimited revision history and cross-device synchronization remain outside this slice. Unix directory synchronization is attempted; universal power-loss durability is not claimed.

## User behavior and recovery

The shared localized UI creates/names projects, saves after 600 ms without another edit, supports explicit save, import/export, reopen and previous-save recovery. English remains default/fallback, German is independently selectable, and validation errors include a localized message and structural location. A save is only shown as complete after persistence succeeds. Quota/storage failures keep unsaved session changes exportable; conflicts never silently overwrite another writer.

Recovery is explicit and confirmed. Saving a recovered project retains the displaced current bytes, including unsupported or corrupt content. Native generation fallback can recover a readable malformed envelope and preserve the malformed original under `recoverySource`. Invalid UTF-8, oversized or inaccessible native records may require manual recovery from the retained generation. No repair claims are made for deleted data or failed disks. Browser clearing/eviction remains possible, so exported backups matter.

## Consequences and validation

No backend, authentication, cloud service, new external dependency or dependency upgrade is required. Dependabot PRs #3–#9 remain separate. Whole-project processing is bounded but consumes several times the source size and runs on the calling thread. The default budgets are documented, configurable and tested; they are not estimates of future canvas capacity.

Golden files and negative tests exercise every modeled collection, unknown extensions, binary hashes, migrations, corrupt archives, resource exhaustion, references, conflicts and recovery. Independent review identified amplification and preservation issues that were addressed with regression tests. The [project storage guide](../development/project-storage.md) records actual verification, CI status, native limitations and CachyOS acceptance. Native artifacts and successful workflows for the final commit are required before acceptance; earlier Phase 1 artifacts do not validate this implementation.
