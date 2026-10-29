# ADR 0018: Workbook pages and structured rich text

- Status: Implemented for Phase 2.5 review; Product Owner acceptance pending
- Date: 2026-10-25
- References: [Issue #19](https://github.com/Koxora-Development/koxora/issues/19), including the batch-formatting supplement; [Issue #24](https://github.com/Koxora-Development/koxora/issues/24) defines the later linking boundary
- Baseline: accepted Phase 2.4 merge `58c85cbc04ba860ca0f3e15189fe875b5453b120`
- Requirements: CORE-001–006, CORE-010, CORE-015–017; EDIT-003–005, EDIT-007–008; IO-001; OPS-001; bounded subsets of EDIT-006 and DIAG-026 (non-overlap selection arrangement and pen only)

## Decision and alternatives

Keep the existing project/document/page hierarchy, SVG geometry, immutable commands and persistence adapters. A separate workbook or editor file would duplicate identity and compromise portability. After the Product Owner’s PR #39 AppImage feedback, a persistent sidebar tree replaces redundant bottom tabs/document selection. It lists all local projects, expands the active project’s documents/pages and remains accessible through a dialog in expanded canvas. Stable row identities preserve focus across keyed canvas changes. Shared pointer/keyboard/touch menus are clamped to the viewport and hosted inside an active modal when needed. Existing page viewport/grid fields remain authoritative. Renaming and reordering never replace UUIDs.

`applyWorkbook` creates, renames, duplicates, moves and deletes pages, and creates, renames, reorders and deletes documents. Duplicate allocates fresh page/layer/node/connection/relationship/action/animation UUIDs and remaps known internal targets. It retains assets, styles and unknown JSON without guessing the meaning of opaque UUID strings. Actions and animations are project-scoped; copies find their targets across all documents, including after a page was moved. Deletion protects incoming semantic references and the last page of a document. Specialized domain-model references block operations whose semantics cannot be safely inferred. Errors preserve the source project. These constraints are visible failures, not lossy partial operations.

The active Studio history becomes project-chronological: edits, batch changes and page operations can be reversed in their actual order, including deletion of the active page. ID-addressed field and collection-order deltas retain only changed data. Navigation is outside history. Limits remain 100 entries and an estimated 16 MiB; an individual operation exceeding the budget is rejected before changing the session. Binaries are never retained in history. The earlier page-isolated `CommandHistory` remains available to core consumers and its regression tests. Opening/recovering another session resets Studio history.

Use the small MIT-licensed ProseMirror model/state/view/history/commands/keymap modules for browser caret, selection, IME, keyboard and text undo behavior. Hand-written `contenteditable`/`execCommand` would require rebuilding these browser invariants. The editor has a deliberately narrow schema, no links, embedded media, arbitrary attributes or HTML storage. Dependencies are local bundle resources, with no server or account requirement.

## Portable text contract

ZIP, manifest and core schema versions remain `1.0.0`. Nodes and semantic connections may carry the optional extension `org.koxora.rich-text`:

```json
{
  "version": 1,
  "paragraphs": [
    {
      "align": "left",
      "runs": [
        { "text": "Plan ", "style": {} },
        {
          "text": "carefully",
          "style": { "fontWeight": 700, "fontFamily": "georgia" }
        }
      ]
    }
  ]
}
```

A paragraph contains plain text runs; newlines are paragraph boundaries. Run overrides are `fontFamily` (a trusted catalog token), `fontSize` (finite 8–96), `fontWeight` (400/700), `fontStyle` (normal/italic), `textDecoration` (none/underline), and `textColor` (six-digit hex, `auto`, or the existing inert `none` token). Alignment is left/center/right per paragraph. Omitted run properties inherit the element appearance. The editor materializes inherited values when opening a draft so individual words can override an inherited underline correctly. The existing 4,096-character limit applies to concatenated text plus paragraph separators.

Every text transaction updates both structured text and its existing plain-text projection (`node.content.text` or the connection extension's `label`). The reader checks exact agreement. An unknown version, attribute, malformed run or mismatching projection is preserved and shown using the safe plain-text fallback, but editing is disabled. Existing plain projects remain editable without migration. Older readers preserve the extension and display the projection; they cannot render mixed formatting. If an older editor rewrites the projection, 2.5 refuses to overwrite the stale rich payload silently. Use a backup for mixed-version editing.

Clipboard HTML is parsed only in an inert template. Active/resource elements are removed before the allowlisted schema reads text and supported styles. Unknown CSS, links, images and scripts never enter the project or renderer. A localized notice explains paste losses; oversized input is rejected. Internal copies keep supported marks. Runtime marks are converted to the portable model, not serialized as ProseMirror JSON or HTML.

Native DOM newlines, including Firefox text-node input, become explicit editor break nodes and portable paragraph boundaries. Plain clipboard serialization uses the same single-LF projection. Plain paste normalizes CRLF/CR, retains blank/trailing paragraphs and inherits the insertion point's marks and alignment instead of collapsing repeated line endings.

## Rendering and interaction

Rich labels use safe DOM-created SVG `foreignObject` text with the same local fonts, paragraph alignment and CSS wrapping as the editor. Text is assigned with `textContent`; no imported markup or CSS enters rendering. Plain legacy labels retain their SVG renderer. Shape labels remain inside their label box; line/connection labels use a 240-unit-wide, 512-unit-high view. Overflow is clipped visually, while the full text remains in the editor, accessible element title and file. Increase shape size or reduce font size to reveal more. Non-native SVG/image export is not implemented by this milestone.

Double-click opens a compact modal text surface over the canvas with a live label preview. The modal prevents navigation from discarding a draft. Apply/Ctrl/Cmd+Enter produces one project command; Escape/Cancel discards the draft. Text undo/redo works within the editing session; project undo/redo works after Apply. Properties retains precision geometry/route controls and the same rich editor. Shapes, text nodes, containers, standalone lines/arrows and semantic connectors share the model.

Batch formatting changes only explicitly edited attributes. It preserves other appearance and run properties. A changed text attribute replaces that attribute's run overrides, while fill/stroke changes leave rich text intact. Controls display mixed/indeterminate states; fill/corners apply only to compatible shape types. Each changed attribute across the selection is one atomic history command. Right-click preserves an existing selection, and contextual Properties supports keyboard/touch. Align/Distribute is a compact selection menu; the optional Objects panel replaces the generic toolbar dropdown. The connection-name/port picker remains intact.

## Fonts and limits

The 20-family catalog uses fixed local stacks. No font file is bundled, no network font request is made, and no proprietary font is redistributed. The requested family is a preference: unavailable fonts resolve through documented platform fallbacks, ultimately CSS sans-serif/serif/monospace. Distinct menu choices can render identically when the preferred fonts are absent. Metrics and line wrapping can vary across OS installations. See the [acceptance guide](../development/workbook-rich-text.md) for the catalog, evidence and native manual checks.

Interactive link authoring/execution, moving individual pages between projects, full hierarchical layer authoring, semantic-engine cloning, lists/tables and arbitrary Office document fidelity remain outside Phase 2.5. This ADR does not authorize merge, release or deployment.

## AppImage feedback supplement (2026-10-27)

The Product Owner authorized the single sidebar navigation, freehand pen, stacking controls and separate collision-free arrangement. These are additive to the accepted baseline and do not change ZIP/core schema versions.

- `kind: "freehand"` nodes carry `extensions["org.koxora.freehand"] = {"version":1,"points":[[0,0],[1,1]]}`. One to 8,192 finite normalized point pairs in [0,1] use ordinary geometry for positioning/scaling/rotation. Only known fields/version are editable. Rendering creates trusted SVG paths; hit-testing uses rotated stroke segments. Unknown strokes remain preserved and read-only. Pressure/tilt and semantic ports are excluded.
- `page.extensions["org.koxora.stacking"] = {"version":1,"ids":["UUID", "UUID"]}` orders nodes and semantic connectors together within existing layers. Unique IDs are bounded to 200,000; stale IDs are ignored. Without this extension, legacy connections-before-nodes order remains. Layer order takes precedence; newly created IDs append within their layer. Commands preserve relative order of selected groups and unselected objects. Clipboard and page duplication map known ordering IDs. Malformed/newer order data blocks commands that would overwrite it. Both history implementations restore changed extensions.
- Align retains conventional axis behavior. Distribute retains outer bounds. The separate non-overlap command lays selected editable nodes in a deterministic grid and moves them downward past visible obstacles, with 24-unit gaps. It never moves unselected nodes; semantic connectors follow endpoint geometry. Hover/focus preview is session state; commit is one transform/history command.
- Missing text colors resolve automatically. Explicit `auto` runs override explicit base colors using the actual label background; other explicit colors remain authored data. Editor-only contrast backdrops and caret/selection styling never serialize. Clipboard keeps only validated color tokens and supported style declarations. Older readers preserve the additive token but may use their older fallback display.
- Project switching serializes the complete latest view/content before opening another project and blocks conflicting interaction during that transition. Failed writes leave current data exportable. A project copy gets a new project UUID with complete binary/opaque resources and existing child identities in the new namespace. Page transfers between projects remain out of scope.
- Reversible project Trash uses an optional `deleted` flag in the local persistence envelope and compare-and-swap writes. It preserves current/previous/recovery bytes and rejects stale saves to trashed projects. Restore is independent of bounded session Undo. The portable archive is unchanged; old application versions may list local trashed records because they do not understand this local flag.

Website PR #36 has moved its contact-delivery ADR to 0019; Studio retains 0018. No Website changes are included here. Native GUI acceptance is still required on the exact CI artifact commit.
