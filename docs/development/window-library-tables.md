# Movable editing windows, expanded libraries and table operations

Status: active, unmerged PR #62; Product Owner assignment of 2026-11-15 and subsequent AppImage feedback, based on accepted PR #61 (`7efb135`). Implementation and review do not authorize merge or publication. Relevant requirements: EDIT-003/005/007/008/015, CORE-001–008/012/014/015/016.

## Editing window

The nonmodal canvas text editor measures its actual rendered size instead of assuming a 640×380 window. It stays within the visible viewport with an eight-pixel margin and scrolls when content is taller than available space. ResizeObserver and viewport resize/scroll events cover content growth, interface scale, window resizing and visual viewport changes. The initial implementation provides header dragging with pointer capture, including touch, and focused arrow-key movement (10 pixels, or 40 with Shift). AppImage feedback extends movement to noninteractive window surfaces and asks for a clear editing title; text, controls and text selection must retain their normal behavior. Closing retains accepted edits and restores the original focus when focus has not already moved elsewhere.

The initial implementation exposes **Edit table structure** from a table-cell window and also offers the properties panel. Subsequent AppImage feedback replaces this as the primary table journey with [direct table authoring on the actual canvas](direct-table-editing.md). The properties path remains an additional entry point. Text and structure changes must retain existing atomic/grouped history behavior.

## Expanded element library

The first PR #62 implementation grows the catalog from 22 to 58 shape kinds, plus the existing freehand tool. Eight additional categories bring the total to twelve: polygons, stars, block arrows, callouts, badges and banners, buildings, communication and devices complement basic shapes, flowcharts, symbols and drawing. Existing stored category selections stay intact; new or reset selections include all categories.

The 36 additions comprise kite/heptagon/nonagon/decagon; five star variants; seven block/notched arrows; manual input/operation, off-page connector, delay, display and internal storage; three callouts; shield/bookmark/ribbon/ticket; house/factory; envelope; monitor/laptop/phone/server. Geometry is original declarative vector data, with no external assets, fonts, licensing additions, remote fetches or provider logos. Device symbols are ordinary editable shapes, not a network topology engine or port-aware device model. Search accepts localized labels, English labels and kind identifiers. The first implementation caps the quick palette at 24 items and reveals up to 48 browser items per batch. AppImage feedback additionally requires direct paging and quick switching through all enabled symbols, with a visible active tool and bounded rendering, and expands the original IT, arrow and line-symbol families further. See [the current follow-up](direct-table-editing.md).

Picking and connection boundaries share the registered contours. Dedicated label boxes keep labels within narrow/concave silhouettes. Existing kind storage, unknown-kind preservation, native round trips and transformations apply unchanged. Older readers may show a bounded fallback for unfamiliar kinds; no new project schema is introduced.

## Office-style table operations

- Select a cell or extend a rectangle with Shift+click/Shift+Arrow. Row and column headings select entire rows/columns, and the corner heading selects the whole table. Selections include complete merged cells.
- Insert one row above/below or column left/right of the selection. Delete the selected rows or columns; the final row/column cannot be removed. Existing trailing dimension controls remain available.
- Insertion inside a merge extends it. Deletion clips affected merges; if an anchor is removed but part of its merge survives, all combined rich text moves to the surviving anchor. A removed populated range requires confirmation. Cancellation leaves the table intact. Confirmation checks that the source has not changed.
- Merge/split retains existing formatted paragraphs. Range formatting applies alignment, bold or normal character styling to each selected visible cell. Individual mixed rich-text editing remains available.
- With a cell or heading focused, copy/paste uses quoted plain TSV. Embedded newlines, tabs and quotes retain their cell boundaries. Paste grows trailing dimensions within the existing limits. A multi-cell paste overlapping merged cells is rejected until those cells are split. Invalid/oversized input is rejected atomically. Clipboard payloads without plain text leave the table unchanged. This uses clipboard events and introduces no clipboard permission.

All operations use immutable updates and the existing version-1 text-region payload/required features. Unknown sibling data, unaffected cells and rich formatting survive. No new schema or native permission is needed. The established limits remain 20 rows, 12 columns, 1,024 characters per cell and 32,768 total. The subsequent Product Owner assignment adds [independent dimensions and formulas](table-calculations.md); dataset import remains separate.

## Review and verification

Review window placement at every viewport edge in EN/DE, 100–200% scale, narrow windows and enhanced accessibility; drag the header, use keyboard movement, grow the table editor, resize the window and close with Escape. Validate row/column insertion around merged cells, cancellation of populated deletion, quoted multi-line paste, range formatting, undo/redo, save/export/import and offline reopening. Browse all categories, load the second element-browser batch, and verify new shapes remain ordinary selectable, transformable elements.

Automated evidence is recorded in the accompanying review handover. Browser checks do not substitute for physical touch, native GUI or screen-reader acceptance.

Historical local validation for the first window/library/table implementation, before the later AppImage follow-up: `pnpm check` passed 739 unit/integration tests plus type, lint, format, documentation and dependency-license checks. The production web build passed, retaining the existing bundle-size warning. The main browser run passed 70 cases in Chromium desktop/mobile across new window/table flows, advanced text regions, live editing, libraries, structured tables and rendered duplicate audits. Independent review passed 182 targeted core tests; clipboard, focus and contour findings were addressed. Native Python helper checks passed eight cases, with one NSIS-specific skip. Cargo is unavailable locally, so native builds/GUI remain unverified here; remote CI is separate evidence.

After the selected-cell focus correction, all 14 window/table cases passed again on Chromium desktop/mobile, including the two new keyboard-origin cases (72 distinct browser cases across the main and follow-up runs). Type checking, targeted lint and formatting also passed after that correction. A screenshot of the actual table editor was visually inspected.
