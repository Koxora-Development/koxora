# Versioned projects and local persistence

## Status and responsibility

Proposed implementation decision for the explicitly assigned Phase 2.1, implemented for Product Owner review. Date: 2026-10-21. Codex implements and verifies; the Product Owner accepts architecture and authorizes merge. This record does not imply approval of a permanent container format, a release, or dependency upgrades.

References: CORE-001 through CORE-007, CORE-009, CORE-010, CORE-012, CORE-014 through CORE-019, K-004 through K-007, O-004, T-010, the [project-format proposal](../architecture/project-format.md), and [local-first architecture](../architecture/local-first.md). These are partial foundations; canvas editing and the full catalog acceptance cases remain future work.

## Context and options

The first useful storage milestone must create, name, validate, persist, reopen, exchange, and recover local projects without an account or network. The existing specification proposes a ZIP archive containing a manifest, document indexes, assets, datasets, and other resources. No released archive format or existing user-file migration was established by Phase 1.

A ZIP implementation now would require a reviewed archive dependency or a substantial custom parser, including expanded-size, traversal, compression-ratio, and archive-entry controls. This milestone has no asset or dataset consumer. A single JSON document provides a smaller format boundary that can be exercised across browser and desktop with the repository's existing dependencies. Deferring all file exchange would leave the local-first acceptance journey incomplete.

## Proposed decision and deviations

Use `.koxora` for a bounded UTF-8 JSON profile with `format: "koxora-project"`, `schemaVersion: "1.0.0"`, and `minReaderVersion: "1.0.0"`. Browser downloads use `application/json`; no registered vendor MIME type is claimed. This deliberately differs from the proposed ZIP container. ZIP archives are rejected by this reader, not partially imported. Future binary assets, compressed containers, encryption, and export to older versions require a separate decision and compatibility plan. The planning specification remains unchanged as the broader proposal.

Use a project with direct `pages`, each carrying extensible `type`, `nodes`, and `connections` fields. This narrows the illustrative document/index/element/relationship structure to the first actual consumer. It does not implement the proposed datasets, assets, views, animations, or interaction semantics. Optional JSON fields can retain future content, but retained content is not an implemented renderer or executable feature.

Create UUID v4 identifiers through an injected ID generator (`crypto.randomUUID` at the UI boundary). Accept canonical lowercase UUID variants with version digits 1 through 8. Project, page, node, and connection identifiers must be unique within a project and remain stable across normal saves, exports, and imports. An explicit import-as-new option changes only the project ID. This replaces the UUIDv7-versus-ULID planning question for this implementation profile, subject to review.

## Schema, compatibility, and migrations

`packages/project` owns the TypeScript types and executable runtime schema, deterministic serializer, parser, factory, errors, and migration registry. It has no React, browser-storage, native-filesystem, or network dependency. A golden `.koxora` fixture documents the supported representation; this milestone does not publish a separate JSON Schema dialect document.

The runtime schema validates required fields, UUIDs and uniqueness, same-page connection endpoints, nonempty bounded names/type labels, canonical UTC timestamps, and version compatibility. Current required features are `nodes` and `connections`. A higher minimum reader version, a different unsupported major version, or an unknown required feature produces a structured error. Compatible future minor/patch versions retain their version and unknown optional fields rather than being downgraded.

Unknown JSON values, including extensible metadata, are retained at every model level. Extension keys should use an owner-controlled namespace such as `org.example.feature`; the profile does not currently enforce namespace registration. The serializer sorts object keys, preserves array order, and uses two-space JSON with a trailing newline. Preservation is semantic JSON preservation, not preservation of source whitespace, key order, numeric spelling, or escaping. Numbers use finite binary64 values; integer values must be within JavaScript's safe integer range. High-precision decimal values and external integer identifiers should use strings. Negative zero serializes as zero.

Reject duplicate JSON keys, invalid UTF-8 imports, cyclic/non-JSON runtime values, nonfinite or unsafe integer numbers, and `__proto__`, `prototype`, or `constructor` keys. Bound each imported/exported file to 8 MiB, nesting to 64, traversed JSON values to 200,000, and pages to 1,000. These are initial defensive limits, not measured canvas-performance budgets. Imported text remains inert; no scripts, external URLs, fonts, or resources are fetched or executed.

Migration steps declare exact `from` and `to` versions and operate on copies. The pipeline checks increasing versions, exact step results, the supported target, and final schema validity. There is no production migration from an invented pre-v1 format. Synthetic migration tests exercise the infrastructure; actual later formats must add golden fixtures, migration steps, failure tests, and retention rules before support is claimed. Import leaves the user's source file intact, and local saves retain the preceding stored bytes.

## Persistence and platform boundary

`packages/persistence` owns the shared repository and `SnapshotStore` contract. A store compares the caller's expected raw record with the latest record before replacing it. Both the browser's IndexedDB transaction and the native filesystem lock enforce this check, preventing stale writers from silently overwriting another save. The repository validates project content before writing and after reading; the UI never declares a save complete before storage reports success.

The browser stores projects in IndexedDB, separately from localStorage preferences and the service-worker shell cache. Current and previous serialized project values commit together in one transaction. Quota and disabled-storage failures retain the in-memory edits and surface localized guidance to export a backup. No persistent-storage grant or protection against user-initiated browser-data deletion is assumed.

Desktop uses app-data `projects-v1/<project-id>/` directories. A writer holds an OS file lock, checks the expected record, writes and synchronizes a temporary file, then renames it to a new immutable snapshot generation. Readers ignore temporary files. The latest two generations are retained after cleanup. Unix directory synchronization is attempted; power-loss durability across Windows, devices, filesystems, and controllers is not claimed. The existing Rust toolchain remains 1.93.1; the package's declared minimum is aligned to Rust 1.93 for the standard-library file-lock API.

Only the main Tauri window receives project list/read/previous-read/write/export commands. The commands use application-controlled storage and export directories and validate identifier path components; the frontend receives no general filesystem API or caller-selected absolute-path command. Shared project schema validation stays in TypeScript. Native code bounds record sizes to 40 MiB and handles filesystem operations; it does not implement a competing domain model.

## Recovery and user behavior

The shared UI offers project creation, naming, explicit save, import/export, a local-project list, and previous-save recovery. Name edits autosave after a 600 ms pause. A visible unsaved state remains until a successful save; failures stop automatic retries until further user action. The browser's unload warning is best effort. A process termination before autosave commits can lose the latest edits, so autosave is not a guarantee of zero lost keystrokes.

Recovery is explicit. Opening the previous save does not silently replace the current version; the UI asks for confirmation and saves the restored project through the normal comparison check. The displaced current project bytes become the previous backup even when they describe an unsupported version or corrupt content. For a readable but malformed native storage envelope, the repository can use the preceding native generation and retain the malformed source under `recoverySource` when saving. This is bounded recovery, not an unlimited version history. An invalid-UTF-8, oversized, or inaccessible newest native record fails before the UI recovery fallback; it is left unchanged, and the retained generation may require manual recovery. Storage-device failure and deletion may require external backups.

Imports preserve project identity by default. A collision produces a conflict without overwriting local data. Importing as a new project requires the explicit checkbox; page/node/connection identities and opaque extension values stay unchanged. Unknown extensions that embed the original project ID cannot be safely rewritten automatically.

Browser export uses the normal download mechanism. Desktop export synchronizes a temporary file and publishes a complete unique `.koxora` file with a non-overwriting hard link in the OS download directory, then displays its path. A filesystem without hard-link support produces a storage error; there is no native save-location dialog or overwrite-in-place flow in this milestone. Import uses the shared file input. Native interaction and webview behavior require acceptance on each supported OS.

## Consequences and verification

The implementation adds two internal workspace packages and no external dependency upgrades. Dependabot PRs #3–#9 remain outside this task. It provides meaningful portable project ownership now, while explicitly deferring archive assets, interactive editing, cloud synchronization, authentication, collaboration, AI, and marketplace features.

The [implementation guide](../development/project-storage.md) describes exact fields, manual acceptance, tests, limitations, and validation evidence. Independent review examines the actual implementation and regression tests; Product Owner review and merge approval remain separate gates. Cross-platform CI configuration and passing shared tests do not by themselves establish native desktop UI parity.
