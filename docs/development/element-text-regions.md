# Element text regions, tables and library discovery

**Status: accepted by the Product Owner and merged in [PR #61](https://github.com/Koxora-Development/koxora/pull/61) on 2026-11-15 (`7efb135`), following [Issue #60](https://github.com/Koxora-Development/koxora/issues/60). Public release and packaged target-native evidence remain separate.** The Product Owner requested an exact-duplicate audit, useful independent text fields including table cells, search in Local projects, and a category selection that can scale to hundreds of elements while retaining Koxora's existing workbench. Further feedback adds direct canvas text editing, visible header rows, merged table cells, centered Freehand text, floating connection ends and live properties with consistent rich-text controls.

Relevant catalog requirements are EDIT-003/005/007/008/015 and CORE-001–008/015/016. This follows the existing Phase 2 editor work and does not change the master catalog, phase order or release gates.

## Distinct elements

The initial independent audit compared actual rendered output for all 21 then-registered shape kinds at 160×100 and 320×240 with radius 16, and 26×22 with radius 5. Rounded rectangle and Container were the sole exact visible duplicate pair. Rectangle and Text share an underlying outline implementation but paint differently; Line and Arrow differ through the arrowhead. Those visible differences are retained.

Container keeps its existing stored kind and gains a header divider and separate title/body regions, including a distinct palette glyph. It is a text-bearing visual container; this change does not make it a grouping parent or automatically move other elements placed inside it. Its existing body text and rich formatting remain available independently of the new title. The duplicate check should compare rendered output rather than raw SVG path strings and should include the new table and revised container.

Custom geometry and styling can deliberately make different elements resemble each other. The audit concerns duplicate built-in representations at comparable dimensions and styles, rather than forbidding user-created visual similarities.

## Live authoring and history

Valid text and element-property changes take effect immediately through ordinary editing commands. There is no Apply/Discard step for text, appearance, geometry, links or table structure. Incomplete numeric or invalid link input stays local until it becomes valid; it does not replace stored values with invalid data or block unrelated valid controls. External undo/redo and property changes update the current editor without remounting it on every keystroke.

Clicking an editable container title/body, table cell or visible ordinary label opens a nearby nonmodal rich-text editor. Close, Escape, Ctrl/Cmd+Enter or clicking elsewhere finishes editing and retains accepted live changes. Use Undo to revert them. A completed move/resize gesture does not open a text editor. The properties panel remains available for structural and formatting work.

Contiguous updates with an explicit group for the same field/session, project, document and page share an undo entry when no more than 1.5 seconds separates them. Other commands, workbook operations and history travel end the group. Grouped entries retain bounded ID-addressed deltas under the existing history budget; transient group IDs never enter project files. Table merge, split and structure changes remain discrete commands. Removing populated cells still requires confirmation, and rename/move/create/delete actions retain their explicit action controls.

## Container and table authoring

Container exposes separate title and body regions, each with the existing rich-text controls for local font choice, size, text color, bold, italic, underline and paragraph alignment. A legacy container without a text-region payload retains its body in `content.text` and its existing `org.koxora.rich-text` formatting. The title does not replace or absorb that body.

Table is an ordinary insertable element with a default three-row, three-column grid. Header row gives the first logical row a visible band and default bold styling even when its cells are empty. Text properties show a lightweight grid of selectable cells and one rich editor for the active cell, rather than a separate editor for every table position. Click to select a cell; Shift+click or Shift+Arrow extends a rectangular range. **Selection range** also offers explicit start/end row and column controls. **Merge selected cells** combines the range, and **Split cell** removes the selected span. The grid reflects actual row/column spans.

Rows and Columns resize the trailing edges of the table live; retained cells are preserved, and new cells start blank. A span crossing a new boundary is clipped while its surviving anchor retains the combined text; a resulting one-cell span needs no merge metadata. Shrinking a table that would remove nonempty cells requires confirmation; cancelling that confirmation keeps the table intact. Each accepted resize, merge or split uses normal undoable history.

The initial limits are 1–20 rows, 1–12 columns, at most 1,024 characters per cell and at most 32,768 characters across the matrix. Cells support multiline rich text with the same local font, color and character/paragraph formatting as ordinary labels. Plain strings remain their exact portable projections. Table content is editable with the usual element movement, resizing, styling, connections, duplication, deletion, history and native round trip. Existing transforms move the region positions while keeping text glyphs readable. This is a table element, not a spreadsheet engine or data-import milestone.

## Portable data contract

The node extension `org.koxora.text-regions` has these supported version-1 payloads:

```json
{
  "version": 1,
  "type": "container",
  "title": "Service overview"
}
```

```json
{
  "version": 1,
  "type": "table",
  "cells": [
    ["Name", "Owner"],
    ["Example", "Team"]
  ],
  "headerRow": true
}
```

The payload type must match the node kind. Container titles are bounded to 4,096 characters. A table matrix must be nonempty, rectangular and within the row, column and text limits above. `headerRow` is a boolean. Compatible additional JSON fields beside the known payload fields survive supported updates; the editor does not execute markup or remote resources found in text.

Every persisted text-region extension requires `element-text-regions-v1` in `manifest.requiredFeatures`. ZIP and schema versions remain unchanged. Readers that do not recognize the required feature reject the project safely instead of flattening text regions. Writers retain the feature conservatively through undo and later edits; removing the last table is not a downgrade operation.

Table cells are authoritative. `content.text` is a trimmed, tab/newline-separated fallback summary capped at 4,096 characters for names and descriptions; editing that summary alone must not replace cell content. A table carrying a global rich-text payload is unsupported for authoring, preventing ambiguity between a global label and individual cells. A foreign table without this extension remains preserved and read-only rather than being silently converted into the new table profile.

Supported version-1 payloads are validated strictly. Future positive integer payload versions under the known required-feature marker are retained opaquely and remain read-only. Unknown required feature labels continue to fail safely. See the [native format contract](../architecture/project-format.md) for archive and unknown-data rules.

### Rich titles, cells and merged geometry

The additional fields remain in version 1: container `titleRichText`, table `cellRichText`, and table `merges`. The rich values use the same bounded paragraph/run model as ordinary labels: trusted local font tokens, sizes 8–96, safe text colors and bold/italic/underline overrides, with left/center/right paragraph alignment. Rich values contain literal text rather than HTML or remote font/resource instructions. Their exact plain projections must match `title` or the corresponding `cells` entry. A present `cellRichText` matrix matches the complete table rectangle and uses `null` where a cell has no rich value.

A merge stores zero-based `{row,column,rowSpan,columnSpan}`. Its top-left cell owns all text and rich runs; covered positions are empty strings with `null` rich values. Spans are positive, cover at least two cells, stay within the table and do not overlap. Selecting part of an existing span expands the selection to include that whole span before merging. Combining a rectangle concatenates the nonempty cell paragraphs in row-major order while preserving formatting. A merge that would exceed the 1,024-character anchor limit is rejected without changing the draft. Splitting restores the individual grid cells and leaves the combined content in the top-left cell. A merge may cross the header/body boundary; the anchor row determines its header styling.

Any present `titleRichText`, `cellRichText` or `merges` field additionally requires `advanced-text-regions-v1`, including an empty merge list or an all-null rich matrix. The original `element-text-regions-v1` marker remains required. Older readers reject the new required feature instead of flattening rich text or spans. Earlier plain version-1 region data remains supported. Neither a caret/selection nor the currently active editing cell enters project data.

## Freehand text

Freehand elements keep their original stroke samples and gain a centered text field with the same rich-text controls as other labels. Text properties contain a usable editor. A selected empty stroke can be edited at its center; visible label text is also a direct editing target. The text box remains bounded and legible for narrow strokes. Only nonempty text expands the label's rendered bounds and picking area, so an empty stroke does not introduce an invisible selectable rectangle.

The label uses existing `content.text` and optional `org.koxora.rich-text` storage. Newly authored labels also carry `org.koxora.freehand-text: {version:1}` and require `freehand-text-v1`; earlier readers cannot silently omit a newly authored label. Required features are retained conservatively through undo and later edits. Previously valid opaque/legacy Freehand content without this profile remains accepted and preserved. Future profile versions are preserved and read-only for authoring. See the [project-format contract](../architecture/project-format.md) for exact compatibility rules.

## Attached and floating connection ends

A connection's source and target are independent: each can reference an eligible element or remain at a free canvas point. Drawing from a shape into empty space and from empty space to a shape are both supported. Drag either selected connection endpoint to attach or detach it. Moving an attached shape continues to update its endpoint; a floating end keeps its own coordinates. Start and end arrowheads can be enabled independently.

Each connection side stores exactly one representation: `sourceId` or `sourcePoint`, and `targetId` or `targetPoint`. A point has finite `x` and `y` coordinates bounded to ±1,000,000,000. Floating ends, and an enabled connection start arrowhead, require `floating-connection-endpoints-v1`; older readers reject the unsupported feature safely. Existing fully attached connections remain supported. No hidden placeholder node represents a free end. Empty-to-empty drawing retains the existing standalone Line/Arrow node path; a connection can also have both ends floating after detachment. Normal archive preservation, duplication offsets and history apply to the explicit endpoint data.

## Discovering a larger element library

The existing workbench remains in place. **Categories…** opens a Koxora dialog with independent checkboxes for Basic, Flowchart, Symbols and Drawing, a bounded preview, Select all/Clear actions and an optional Remember selection preference. Changes take effect live; Close or Escape finishes the selection without reverting it. Several groups can be enabled together. Their union is deduplicated in registry order; Select and Pan remain available even when no library is selected.

Search matches the selected language, English labels and element-kind aliases. Filtering out an armed insertion tool returns to Select. An explicitly selected menu/shortcut tool remains visibly pinned even when it falls outside the selected libraries. The quick toolbar is limited to 24 element entries, in addition to navigation and an explicit active tool. **Browse elements…** offers labelled tiles and search for the enabled libraries, initially renders 48 matches and adds further 48-item batches through Show more. Category previews are also bounded to 48 entries. These bounds support a larger catalog without rendering hundreds of toolbar buttons at once.

The remembered preference uses the versioned local key `koxora.element-libraries.v1`. It is independent of project content. Invalid stored values fall back to the available groups; recognized groups survive alongside unknown future groups. An explicit empty selection is valid. Unchecking Remember selection removes the saved preference. If local preference storage fails, the current session remains usable and reports the failure locally.

## Local-project search

Local projects now has a title search with trimmed, case-insensitive and accent-insensitive matching, a matching/total count and a clear action. The active project's current title participates in matching. Empty-library and no-match states remain distinct. Clearing search restores all rows and returns focus to the search field.

Unreadable project heads have no trustworthy title, so their recovery rows remain available while searching and an explanatory note is shown. Search filters display only; it does not rename, open, overwrite or remove projects. Normal rename/open/recovery actions retain their project identities.

## Context menus

The Back/Forward/Stop/Reload fallback menu belongs to the embedded browser, rather than Koxora. Unhandled Studio surfaces now prevent that native navigation menu. Koxora's own canvas and navigator context menus still receive their events; native menus in inputs, textareas and editable text remain available for text-editing commands.

## Acceptance and evidence

Verify title/body independence, table cell edits and bounds, resize cancellation/confirmation, unknown fields and future payload preservation, protected-content refusal, and undo/redo. Exercise copy/duplicate, save/reopen offline, and native export/import with distinct contents in several cells. Verify live category changes, closing/reopening, Remember behavior, empty selections, blocked preference storage, bounded browsing and project-search recovery. Repeat keyboard and scrolling journeys in EN/DE at 100–200% scale in small and large windows.

Recorded local evidence for the first text-region and discovery implementation at `827debb` (before the direct-editing/rich-region/merge follow-up):

- `pnpm check` passed TypeScript, lint, formatting, all **602 unit/integration tests**, documentation and dependency-license checks. The production web build also passed; the existing bundle-size warning remains.
- The final rendered-duplicate regression compared all **22 registered kinds** in Chromium at 26×22 with radius 5, 160×100 with radius 16 and 320×240 with radius 16. All three cases passed, including the revised Container and new Table.
- The native helper suite passed **eight tests**, with one Windows NSIS-specific skip. This does not replace a packaged target-native manual acceptance run.
- Independent review completed. Its findings were fixed: SVG titles and connection-port names now use authoritative structured text, Container body text is clipped to its body region, the table editor scrolls within its available width, and category controls stay stationary while previews change.
- The 24-entry quick-toolbar bound is unit-tested with a synthetic 201-entry source. The 48-entry browser and preview limits are source-checked. The current catalog does not exercise a real hundreds-element library or a second browser batch at runtime.

For the same `827debb` baseline, all **136 selected Chromium desktop/mobile browser cases** passed across the combined run and targeted follow-up. These cover structured elements, rendered duplicates, project search, category transactions, templates, editing/history, workbook/rich text, native archives, transforms and library layout, including EN/DE at 390px and 200%. The final follow-up passed all 28 cases after correcting a stale test locator and anchoring the category dialog for future preview-size changes. Firefox/WebKit and packaged target-native results remain separate CI/manual evidence.

### Further live-editing, table and connection acceptance

The further feedback must verify that clicking a title, body or table cell opens that exact region for editing from the canvas, that an ordinary move/resize does not open or commit text, and that Close, Escape and clicking elsewhere retain valid live edits. Check both filled and blank regions, including rotated and reflected elements. Type and format through a long edit, then check grouped Undo/Redo, caret stability, external history updates and incomplete numeric input without invalid stored values.

Verify a visible header band while Header row is enabled, including an empty table. Format selected words in a title and several cells with different fonts, colors, bold/italic/underline and alignment; export/reopen and confirm both text and formatting. Merge a rectangular range with several nonempty formatted cells, check that all paragraphs survive in order and interior borders disappear, then split, undo/redo and duplicate it. Check size limits, merge bounds, overlap refusal and populated-cell resize confirmation. Repeat the direct-editing and properties journeys with the keyboard in EN/DE at 390px and 200% scale.

Add and format centered Freehand text, move/rotate/duplicate the element, and confirm the stroke and text survive offline/native reopening. Create shape-to-empty, empty-to-shape and fully attached connectors; detach and reattach each end, enable both arrowheads and check attached movement, floating coordinates, history and native round trips. Check that unhandled surfaces suppress the browser navigation menu while native text-editing and Koxora context menus remain available.

Recorded validation for this additional scope:

- `pnpm check` passed TypeScript, lint, formatting, all **657 unit/integration tests**, documentation and dependency-license checks. The production web build passed through Playwright; the existing bundle-size warning remains. Dependencies and the lockfile are unchanged; the temporary pnpm store metadata was restored separately from the working checkout before checking licenses.
- All **153 Chromium cases** in the browser suite passed across the complete run and targeted follow-ups. All **39 selected mobile cases** also passed, including EN/DE at 390px and 200%, direct rich regions, table merging/splitting, centered Freehand text, both floating connection ends, history, native archives and offline reopening.
- The native helper suite passed **eight tests**, with one NSIS-specific skip. Packaged native builds and manual target-native acceptance remain separate evidence.
- Independent core review passed **99 targeted tests** and resolved inherited alignment on empty/plain merged cells and attached-node routing with opaque sibling coordinates. Independent UI review identified and helped resolve invalid sibling geometry blocking valid fields, autosave dismissing live editors, own rich-text echoes replacing native line breaks/history, and stale nonmodal editors. Browser regressions cover these corrections, stable canvas layout during background saving, context-menu handling and Escape cancellation with a live properties dock.

The earlier 602-test and 136-browser-case results remain a baseline for the preceding implementation. Current-head CI and packaged target-native manual acceptance are reported separately.

Earlier template-build results are also a separate baseline. The Product Owner subsequently accepted PR #61 and it was merged on 2026-11-15. Packaged target-native manual acceptance and public release remain separate evidence and decisions.

## Active follow-up

[PR #62](https://github.com/Koxora-Development/koxora/pull/62), accepted and merged on 2026-11-23 (`27527a7`), adds [window, library and table operations](window-library-tables.md), [individual table dimensions and formulas](table-calculations.md), and [direct canvas table editing](direct-table-editing.md). The follow-up also improves window movement, quick symbol navigation and layout.
