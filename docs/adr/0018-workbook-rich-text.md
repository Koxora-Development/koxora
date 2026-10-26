# ADR 0018: Workbook pages and structured rich text

- Status: Implemented for Phase 2.5 review; Product Owner acceptance pending
- Date: 2026-10-25
- References: [Issue #19](https://github.com/Koxora-Development/koxora/issues/19), including the batch-formatting supplement; [Issue #24](https://github.com/Koxora-Development/koxora/issues/24) defines the later linking boundary
- Baseline: accepted Phase 2.4 merge `58c85cbc04ba860ca0f3e15189fe875b5453b120`
- Requirements: CORE-001–006, CORE-010, CORE-015–017; EDIT-003–005, EDIT-007–008; IO-001; OPS-001

## Decision and alternatives

Keep the existing project/document/page hierarchy, SVG geometry, immutable commands and persistence adapters. A separate workbook or editor file would duplicate identity and compromise portability. Page tabs are a persistent sibling of the keyed canvas, so switching pages does not destroy keyboard focus. The document selector preserves the hierarchy. Existing page viewport/grid fields remain authoritative. Renaming and reordering never replace UUIDs.

`applyWorkbook` creates, renames, duplicates, moves and deletes pages, and creates/renames documents. Duplicate allocates fresh page/layer/node/connection/relationship/action/animation UUIDs and remaps known internal targets. It retains assets, styles and unknown JSON without guessing the meaning of opaque UUID strings. Actions and animations are project-scoped; copies find their targets across all documents, including after a page was moved. Deletion protects incoming semantic references and the last page of a document. Specialized domain-model references block operations whose semantics cannot be safely inferred. Errors preserve the source project. These constraints are visible failures, not lossy partial operations.

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

A paragraph contains plain text runs; newlines are paragraph boundaries. Run overrides are `fontFamily` (a trusted catalog token), `fontSize` (finite 8–96), `fontWeight` (400/700), `fontStyle` (normal/italic), `textDecoration` (none/underline), and `textColor` (six-digit hex or the existing inert `none` token). Alignment is left/center/right per paragraph. Omitted run properties inherit the element appearance. The editor materializes inherited values when opening a draft so individual words can override an inherited underline correctly. The existing 4,096-character limit applies to concatenated text plus paragraph separators.

Every text transaction updates both structured text and its existing plain-text projection (`node.content.text` or the connection extension's `label`). The reader checks exact agreement. An unknown version, attribute, malformed run or mismatching projection is preserved and shown using the safe plain-text fallback, but editing is disabled. Existing plain projects remain editable without migration. Older readers preserve the extension and display the projection; they cannot render mixed formatting. If an older editor rewrites the projection, 2.5 refuses to overwrite the stale rich payload silently. Use a backup for mixed-version editing.

Clipboard HTML is parsed only in an inert template. Active/resource elements are removed before the allowlisted schema reads text and supported styles. Unknown CSS, links, images and scripts never enter the project or renderer. A localized notice explains paste losses; oversized input is rejected. Internal copies keep supported marks. Runtime marks are converted to the portable model, not serialized as ProseMirror JSON or HTML.

Native DOM newlines, including Firefox text-node input, become explicit editor break nodes and portable paragraph boundaries. Plain clipboard serialization uses the same single-LF projection. Plain paste normalizes CRLF/CR, retains blank/trailing paragraphs and inherits the insertion point's marks and alignment instead of collapsing repeated line endings.

## Rendering and interaction

Rich labels use safe DOM-created SVG `foreignObject` text with the same local fonts, paragraph alignment and CSS wrapping as the editor. Text is assigned with `textContent`; no imported markup or CSS enters rendering. Plain legacy labels retain their SVG renderer. Shape labels remain inside their label box; line/connection labels use a 240-unit-wide, 512-unit-high view. Overflow is clipped visually, while the full text remains in the editor, accessible element title and file. Increase shape size or reduce font size to reveal more. Non-native SVG/image export is not implemented by this milestone.

Double-click opens a compact modal text surface over the canvas with a live label preview. The modal prevents navigation from discarding a draft. Apply/Ctrl/Cmd+Enter produces one project command; Escape/Cancel discards the draft. Text undo/redo works within the editing session; project undo/redo works after Apply. Properties retains precision geometry/route controls and the same rich editor. Shapes, text nodes, containers, standalone lines/arrows and semantic connectors share the model.

Batch formatting changes only explicitly edited attributes. It preserves other appearance and run properties. A changed text attribute replaces that attribute's run overrides, while fill/stroke changes leave rich text intact. Controls display mixed/indeterminate states; fill/corners apply only to compatible shape types. Each changed attribute across the selection is one atomic history command. Right-click preserves an existing selection, and contextual Properties supports keyboard/touch. Align/Distribute is a compact selection menu; the optional Objects panel replaces the generic toolbar dropdown. The connection-name/port picker remains intact.

## Fonts and limits

The 20-family catalog uses fixed local stacks. No font file is bundled, no network font request is made, and no proprietary font is redistributed. The requested family is a preference: unavailable fonts resolve through documented platform fallbacks, ultimately CSS sans-serif/serif/monospace. Distinct menu choices can render identically when the preferred fonts are absent. Metrics and line wrapping can vary across OS installations. See the [acceptance guide](../development/workbook-rich-text.md) for the catalog, evidence and native manual checks.

Interactive link authoring/execution, cross-project navigation, document deletion, semantic-engine cloning, lists/tables and arbitrary Office document fidelity remain outside Phase 2.5. This ADR does not authorize merge, release or deployment.
