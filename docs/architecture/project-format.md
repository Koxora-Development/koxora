# Native project format specification

**Status: planning proposal v0.1, 2026-10-20; extension, schema, and implementation are not finalized.**

Implemented Phase 2.1 behavior and proposed deviations are recorded in [ADR 0013](../adr/0013-project-storage.md) and the [project storage guide](../development/project-storage.md). The broader planning scope below is retained.

## 1. Purpose

Portable, versioned, offline-editable native projects span browser and desktop. They contain projects, diagrams, datasets, media, layouts, interactions, animations, and metadata. A native file is different from PNG/PDF/GIF or exported HTML.

## 2. Container

Proposed `.koxora` ZIP archive with UTF-8 JSON and binary assets; MIME type registration follows the format decision. Bound expanded sizes, compression ratios, and file count. Reject absolute paths, traversal, and unsafe links.

```text
project.koxora
├── manifest.json
├── documents/
│   ├── index.json
│   └── <document-id>.json
├── datasets/
│   ├── index.json
│   └── <dataset-id>.json
├── assets/
│   └── <sha256>.<extension>
├── themes/
├── templates/
└── previews/thumbnail.png
```

## 3. Illustrative manifest

```json
{
  "format": "koxora-project",
  "schemaVersion": "1.0.0",
  "minReaderVersion": "1.0.0",
  "projectId": "018f0000-0000-7000-8000-000000000001",
  "title": "Network architecture",
  "locale": "en",
  "createdAt": "2026-10-20T00:00:00Z",
  "updatedAt": "2026-10-20T00:00:00Z",
  "documentsIndex": "documents/index.json",
  "datasetsIndex": "datasets/index.json",
  "features": ["nodes", "edges", "interactive-actions"],
  "extensions": {}
}
```

IDs, versions, title, and timestamps are synthetic examples, not a real project. `title` is user-authored document content, not interface text. `locale` is document metadata, independent of interface selection and its English fallback; the `de-DE` source example has been adapted to the English documentation convention. Exact locale normalization is an open schema decision.

## 4. Objects

- Document: `id`, `type`, `title`, `pages`, `views`, `styles`, `interactions`, `animations`, `extensions`.
- Page: `id`, `size`, `viewport`, `layers`, `elements`, `relationships`.
- Element: stable `id`, `kind`, `geometry`, `style`, `content`, `dataBindings`, `metadata`, `extensions`.
- Relationship: `id`, `sourceId`, `targetId`, `relationType`, `ports`, `routing`, `metadata`.
- Domain-specific models: independently versioned `domainModel` blocks; renderers may generate additional views.
- Dataset: `schema`, `rows`/`columns`, `transforms`, `refreshPolicy`, `sourceRef`, `snapshot`.
- Interactions: allowlisted declarative tooltip, navigation, filter, expand, and URL actions; no arbitrary script.
- Animation: keyframes, timeline, duration, easing, target elements.

## 5. Resources and portability

Address assets by SHA-256. Explicitly reference external fonts/URLs; embedding requires license review. Never automatically export credentials, tokens, absolute local paths, or session secrets. Retain portable source snapshots optionally.

## 6. Versions and migration

Schema SemVer is separate from app version. Validate manifest and minimum reader version, back up, then migrate incrementally. Preserve unknown optional extensions. Unknown required features cause read-only access or an error rather than silent destruction. Export to old schemas only with an explicit loss report.

## 7. Collaboration

A CRDT operation log is a synchronization mechanism, not necessarily the portable format. Serialize snapshots deterministically. Keep project IDs stable; importing as a copy may create a new identity at user request. Resolve imported-file/cloud-project conflicts through user choice.

## 8. Fidelity

Importers/exporters report `supported`, `partiallySupported`, `unsupported`. HTML can retain interactions; SVG/PDF have limits; PNG/JPEG are static; GIF/video are temporal. Raster reimport cannot automatically restore editable structures.

## 9. Reference tests

Golden files per schema version; import/export/import; vN→vN+1 migrations; deterministic asset hashes; corrupt/oversized archives; Unicode/RTL; unknown extensions; missing fonts; offline HTML.

## 10. Open decisions

Extension/MIME, JSON schemas, UUIDv7 versus ULID, units, collaboration granularity, deterministic ZIP ordering, asset limits, and optional archive encryption. See [O-004 and T-010](../decisions.md).
