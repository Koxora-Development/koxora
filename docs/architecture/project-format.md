# Native project format specification

**Implemented v1.0.0 for Phase 2.1 review, 2026-10-21.** The Product Owner explicitly required a structured ZIP container. This specification and [ADR 0013](../adr/0013-project-storage.md) replace the rejected, never-released JSON draft. Acceptance and merge remain pending. The executable schema is `packages/project/src/schema.ts`, with public types in `types.ts`; no separate JSON Schema dialect is claimed.

## Container and archive layout

A `.koxora` file is a ZIP32 archive of UTF-8 JSON and binary resources. Browser downloads use `application/zip`; no vendor MIME registration is claimed. Required indexes exist even when empty.

```text
manifest.json
documents/index.json
documents/<document-uuid>.json
datasets/index.json
datasets/<dataset-uuid>.json
assets/index.json
assets/<sha256>
themes/index.json
themes/<theme-uuid>.json
templates/index.json
templates/<template-uuid>.json
previews/index.json
previews/<preview-uuid>
extensions/<owner-namespace>/<optional-resource>
```

Manifest fields: `format: "koxora-project"`, independent `formatVersion` and `schemaVersion`, `minReaderVersion`, `minSchemaReaderVersion`, `projectId`, `title`, `createdAt`, `updatedAt`, `locale`, `direction`, `requiredFeatures`, the six `<collection>Index` paths, `resources`, and `extensions`. Initial versions are `1.0.0`. Dates are canonical UTC ISO strings with milliseconds. Locale is a valid BCP 47 tag, independent of UI language; direction is `auto`, `ltr`, or `rtl`.

Each resource descriptor has `size` (uncompressed bytes), lowercase hex `sha256`, `mediaType`, `required`, and `extensions`. Every file except the manifest itself must have exactly one descriptor. Missing files, extra unlisted files, hash/size mismatches, and a recursive manifest descriptor fail import. Hashes detect corruption; they do not authenticate the author. Core JSON entry hashes are regenerated after edits. Optional opaque files retain their exact bytes and descriptor metadata. Empty directory entries carry no project semantics and are omitted on export.

Indexes have `schemaVersion`, `items`, and `extensions`. Each item has a unique `id`, canonical `path`, and `extensions`, plus optional future fields. Assets and previews store their complete descriptors in the index. Other indexes point to individual JSON records. Two asset identities may share the same content-addressed blob. Asset filenames omit a guessed extension; their media type is explicit. This refines the original illustrative `<hash>.<extension>` layout without changing its content-addressing intent.

## Domain schema

All entities with IDs use canonical lowercase UUIDs, versions 1–8 and RFC variant. The factory creates UUID v4 through an injected generator. IDs are globally unique within the modeled project, including template contents, dataset fields, styles and actions. References are checked by type and scope, not merely by UUID spelling. A copy import changes only the project ID; opaque embedded references to the original project cannot safely be rewritten automatically.

| Structure | Validated v1 fields and semantics |
| --- | --- |
| Document | `id`, `schemaVersion`, `type`, `title`, `locale`, nonempty `pages`, `styles`, `domainModels`, `actions`, `animations`, `extensions` |
| Page | `id`, `title`, positive `size.width/height`, `viewport.x/y/zoom`, nonempty `layers`, `nodes`, `connections`, `relationships`, `layout`, `presentation`, `extensions` |
| Layer | `id`, `title`, booleans `visible/locked`, optional same-page `parentId`; acyclic hierarchy |
| Node/shape | `id`, `kind`, same-page `layerId`, `geometry.x/y/width/height/rotation`, `content`, `metadata`, optional `styleId`, `assetIds`, `dataBindings`, `extensions` |
| Connection | `id`, same-page node `sourceId/targetId`, same-page `layerId`, `relationType`, numeric `waypoints`, optional `styleId`, `extensions` |
| Relationship | `id`, project node `sourceId/targetId`, `kind`, `metadata`, `extensions`; may span pages/documents |
| Dataset | `id`, `schemaVersion`, `title`, `fields`, `rows`, `source`, `extensions`; every row contains exactly the declared field IDs |
| Dataset field | `id`, `name`, `type` (`string`, `number`, `boolean`, `date`, `json`), boolean `nullable`, `extensions`; dates use valid `YYYY-MM-DD` |
| Data binding | `datasetId`, `fieldId`; field must belong to that dataset |
| Asset | `id`, `path: assets/<sha256>`, `sha256`, integer `size`, `mediaType`, `extensions`; bytes and manifest descriptor must agree |
| Style | `id`, `properties`, optional same-list `parentId`, `extensions`; acyclic inheritance |
| Theme | `id`, `schemaVersion`, `title`, `tokens`, `styles`, `extensions` |
| Template | `id`, `schemaVersion`, `title`, validated `document`, `extensions` |
| Preview | Asset descriptor plus existing `documentId`, `path: previews/<id>`, and image media type |
| Action | `id`, node `targetId`, `trigger` (`click`, `hover`, `focus`), allowlisted `operation`, `parameters`, `extensions` |
| Animation | `id`, node `targetId`, positive `duration` in milliseconds, supported `easing`, at least two strictly ordered `keyframes` within duration, `extensions` |

Geometry uses logical document units; rotation is in degrees. Page layout/presentation, shape content and style properties are inert extensible JSON dictionaries. They provide storage for future renderers, not an implemented drawing engine. Text and embedded bytes are never interpreted as HTML or executed. No remote resource, dataset source, URL, font or plugin is loaded during import.

Actions validate operation-specific parameters: `tooltip.text`, `navigate.pageId`, `expand.nodeId`, `filter.datasetId/fieldId/value`, or `url.url`. URL schemes are limited to HTTP, HTTPS and mailto, without URL credentials. Animation easing accepts `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `step-start`, `step-end`. Neither actions nor animations are executed in this milestone. A later interpreter must independently enforce interaction and navigation permissions.

### Diagram-specific schemas

Each domain model has `namespace`, `schemaVersion`, `required`, `references`, `data`, and `extensions`. References must exist in the project. Known v1 namespaces validate these data structures:

- `org.koxora.mindmap`: `roots` and `parents` keyed by document node IDs; roots are the exact distinct null-parent entries; parents form an acyclic forest.
- `org.koxora.flowchart`: `starts` and `ends` containing document node references.
- `org.koxora.uml`: `classifiers` with document `nodeId`, `kind`, string `attributes` and `operations`.
- `org.koxora.er`: `entities` with document `nodeId` and fields (`id`, `name`, `dataType`, `primaryKey`, `nullable`); `relations` reference document connections and declared ER fields.

These validate a storage foundation, not all semantic rules of UML or a database engine. Future engine metadata fits in namespaced extensions. An unknown namespace or unsupported model major version is retained opaquely when optional and rejected when required. Its declared references still validate.

## Compatibility and preservation

Container, core schema, indexed component schemas and domain model schemas are independent of application versions. Readers accept major version 1 with additive minor/patch versions only when the manifest's minimum container and schema readers are no higher than `1.0.0`. Unsupported major versions, unknown required features or unknown required resources fail safely. The UI keeps the active project and source file untouched.

Supported required feature labels are `documents`, `pages`, `nodes`, `connections`, `layers`, `relationships`, `datasets`, `assets`, `styles`, `themes`, `templates`, `actions`, `animations`, `previews`. Unsupported semantics must be declared required by writers; unknown optional fields must not redefine existing fields.

Every extensible record retains additional JSON fields. Extension keys use lowercase reverse-domain namespaces such as `org.example.plugin`; namespace ownership is not authenticated. Opaque plugin resources must be listed in the manifest with `required: false`. Unknown fields in indexes and resource descriptors also survive. A known field with an invalid value is rejected rather than reinterpreted as an extension.

Serialization sorts JSON object keys and archive paths, preserves array order, uses two-space JSON plus a newline, and emits STORE entries with fixed DOS timestamps (1980-01-01). Repeated exports of unchanged data are byte-identical. Imports accept STORE and raw DEFLATE, including data descriptors. Re-exporting compressed input changes compression, ZIP metadata, JSON formatting and hashes of normalized JSON; semantic values and opaque resource bytes remain intact. Finite binary64 numbers are supported, with safe integers only; high-precision values should be strings. Negative zero normalizes to zero.

## Migration

Normal file import accepts ZIP only. `importLegacyJson` is the explicit migration entry point for this PR's unreleased JSON draft. The migration preserves project/page/node/connection IDs, derives deterministic document/layer UUIDs, supplies required geometry/layout defaults, and retains the complete original parsed project in `org.koxora.legacy-source`. Local snapshots from the draft are detected and migrated in memory; the next save retains the original snapshot bytes as its previous value.

`migrate` operates on copies through explicit exact `from`/`to` steps, rejects missing or cyclic routes, and propagates errors. The caller validates the final target schema before persistence. No invented historical ZIP version is accepted, and no downgrade exporter silently drops data. New container/schema migrations must add real source/target fixtures and explicit validation before they are registered. `legacy-json-v1.json` and `migrated-json-v1.koxora` form the minimal migration pair; `legacy-rich-v1.json` and `migrated-rich-v1.koxora` also preserve a populated graph and unknown source metadata.

## Security and resource limits

The archive parser preflights the central directory and every local header before inflation. It rejects encryption, ZIP64, multiple disks, unsupported methods, links/devices, alternate-name extra fields, mismatched headers, overlap/hidden bytes, unsafe paths, duplicate/case-alias names, bad CRCs and size inconsistencies. Names are portable ASCII paths of at most 240 characters; Unicode belongs in JSON content, not generated archive paths. No entry is extracted to the filesystem. Streaming DEFLATE checks actual output against advertised and configured bounds, even when headers lie.

JSON rejects duplicate keys (including escaped aliases), unsafe prototype keys, malformed UTF-8, non-JSON runtime values, excessive nesting, invalid references and unsupported required semantics. Index identities are checked before parsing referenced payloads to prevent repeat-reference amplification. Hierarchy checks visit each parent chain only once.

| Default limit | Value | Reason |
| --- | --- | --- |
| Archive bytes | 64 MiB | Portable whole-file browser/desktop exchange; bounds file-input and native IPC allocation |
| Total expanded bytes | 64 MiB | Compressed input must not exceed the same document-data budget |
| Per-entry expanded bytes | 32 MiB | Prevents one binary object consuming the full project budget |
| Per-JSON entry bytes | 8 MiB | JSON objects/strings use substantially more heap than their UTF-8 bytes |
| Archive entries | 4,096 | Bounds headers, resource-table work and hash operations |
| Compression ratio | 200:1 | Rejects extreme compression amplification before inflation; configurable for trusted legitimate data |
| JSON depth | 64 | Bounds recursive schema and canonicalization work |
| Aggregate runtime JSON values | 1,000,000 | Bounds object graph complexity independently of file size |

These are explicit implementation budgets, not on-disk schema maxima or measured renderer capacity. Peak memory includes input bytes, inflated buffers, JSON objects, generated output, base64 snapshots and the previous save; it can be several times the archive limit. `ResourceLimits` options on import/export permit host-selected budgets; the application uses defaults. Rejecting a large project leaves its source intact. ZIP32 field bounds remain mandatory regardless of host configuration. Parsing currently runs on the calling thread; worker parsing and streaming persistence are future performance work. The native snapshot envelope is capped at 256 MiB to hold two base64-encoded 64 MiB archives plus metadata; an oversized recovery envelope fails without deleting its source.

## Verification and deferred features

`complete-v1.koxora` includes multiple documents/pages, every known domain model, a dataset/binding, PNG bytes, theme, template, preview, actions, animation, Unicode/RTL metadata and opaque future data. Unit and browser tests cover deterministic round trips, corruption, references, versions, migrations, limits and failure retention. See [project storage](../development/project-storage.md) for actual results and manual acceptance.

Interactive editors, rendering fidelity across export formats, CRDT logs, cloud integration, archive encryption, external asset licensing and a MIME registration remain separate decisions. They do not weaken the implemented container's preservation contract.

## Phase 2.2 portable view settings

[ADR 0014](../adr/0014-interactive-canvas.md) proposes the existing page viewport as a world-center camera: `screen = (world - {x,y}) * zoom + viewportSize / 2`, using CSS pixels. This defines previously unspecified semantics without changing ZIP/schema version 1.0.0. The optional `page.presentation["org.koxora.canvas"]` object contains `version: 1`, `visible`, `snap`, and `spacing` (1–1024 world units). Optional `manifest.extensions["org.koxora.workspace"]` contains `version: 1`, `documentId`, and `pageId`. Unknown sibling/subfields are retained; newer namespaces are never overwritten. Old files use default grid/view selection without mutation until an explicit change. Device pixel ratio, viewport dimensions, theme, language and expanded-window state are not stored in these fields. See the ADR for bounded display and invalid optional-field handling.

## Phase 2.3 basic diagram presentation

[ADR 0015](../adr/0015-shapes-text-connections.md) defines optional version-1 `org.koxora.element` and `org.koxora.connection` extension namespaces for basic appearance, text/edge labels, routing, arrowheads and local cardinal/automatic anchors. Existing node geometry/content, page layers, connection endpoints and styles remain authoritative; ZIP and schema versions remain 1.0.0. Label-only edits preserve unsupported style values, unknown fields, assets and unrelated domain models. Newer namespaces and unsupported connection payloads remain read-only rather than being silently normalized. An explicit routing-type change replaces the connection's retained waypoints. See the ADR for exact bounds and preservation rules.

## Phase 2.4 standalone lines and interactive editing

[ADR 0016](../adr/0016-interactive-editing-history.md) adds trusted node kinds `line` and `arrow`, using existing rotated geometry for a local horizontal segment. Optional `node.extensions["org.koxora.line"]` contains `version: 1`, `startArrow` and `endArrow` booleans. Drawing lines need no graph endpoints; semantic connections retain their existing endpoint identities. Older readers preserve the new kinds as unsupported previews; newer or invalid options are read-only. ZIP/schema versions remain 1.0.0. Selection, clipboard, gesture drafts and command history are session state, never serialized. Renaming only changes the manifest title/update time. Unknown compatible fields and binary resources retain the existing preservation contract.


### Phase 2.4 appearance and explicit ports

Line/Arrow interactions also create existing semantic connections with `org.koxora.connection` version 1, `arrow: false/true`, and explicit `sourceAnchor`/`targetAnchor` values `north`, `east`, `south`, `west` or `auto`. Cardinal anchors are local to the endpoint shape and follow its rotation, translation and resizing. UI port markers and draft previews do not enter the archive.

The existing element/connection `style` dictionary and shared style properties accept additive `fontFamily` tokens `sans`/`serif`/`mono`, `fontWeight` 400/700, `fontStyle` `normal`/`italic`, and `textDecoration` `none`/`underline`. Defaults are sans/400/normal/none. Fonts resolve only to trusted local fallback stacks; arbitrary imported CSS is never rendered. Size 8–96, text color, alignment and multiline text remain supported. These fields style the whole label, without a rich-text run model. Older readers preserve additive properties; unknown values survive unrelated edits. ZIP and schema remain 1.0.0. See ADR 0016 for history and inheritance behavior.

## Phase 2.5 workbook and rich text

[ADR 0018](../adr/0018-workbook-rich-text.md) retains the existing document/page arrays, UUIDs and per-page views. Tab order is page-array order. No ZIP or core-schema migration is required.

Optional node/connection extension `org.koxora.rich-text` version 1 contains `paragraphs`, each with `align` and `runs` of literal `text` and safe style overrides. The existing plain-text label is an exact newline-joined projection. Rich data never contains executable HTML, CSS declarations, URLs or ProseMirror runtime state. Unknown versions/fields and projection mismatches remain preserved and read-only. The trusted font-token catalog expands additively to 20 local family preferences; no font is fetched or embedded. See the ADR for bounds, older-reader behavior and exact fields.
