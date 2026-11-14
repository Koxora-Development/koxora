# Element text regions, tables and library discovery

**Status: Product Owner-assigned follow-up to [Issue #60](https://github.com/Koxora-Development/koxora/issues/60) and [PR #61](https://github.com/Koxora-Development/koxora/pull/61), 2026-11-14. Implementation is for review; manual acceptance, merge and release remain pending.** The Product Owner requested an exact-duplicate audit, useful independent text fields including table cells, search in Local projects, and a category selection that can scale to hundreds of elements while retaining Koxora's existing workbench.

Relevant catalog requirements are EDIT-003/005/007/008/015 and CORE-001–008/015/016. This follows the existing Phase 2 editor work and does not change the master catalog, phase order or release gates.

## Distinct elements

The initial independent audit compared actual rendered output for all 21 then-registered shape kinds at 160×100 and 320×240 with radius 16, and 26×22 with radius 5. Rounded rectangle and Container were the sole exact visible duplicate pair. Rectangle and Text share an underlying outline implementation but paint differently; Line and Arrow differ through the arrowhead. Those visible differences are retained.

Container keeps its existing stored kind and gains a header divider and separate title/body regions, including a distinct palette glyph. It is a text-bearing visual container; this change does not make it a grouping parent or automatically move other elements placed inside it. Its existing body text and rich formatting remain available independently of the new title. The duplicate check should compare rendered output rather than raw SVG path strings and should include the new table and revised container.

Custom geometry and styling can deliberately make different elements resemble each other. The audit concerns duplicate built-in representations at comparable dimensions and styles, rather than forbidding user-created visual similarities.

## Container and table authoring

Container Text properties expose a plain-text title and the existing rich-text body editor. A legacy container without a text-region payload retains its body in `content.text` and its existing `org.koxora.rich-text` formatting. The title does not replace or absorb that body.

Table is an ordinary insertable element with a default three-row, three-column grid. Text properties provide independently labelled cell inputs, row and column controls, and an optional header-row setting. Header styling distinguishes the first logical row. A resize retains cells within the new rectangle and introduces blank cells when it grows. Shrinking a draft that contains nonempty cells outside the requested bounds requires confirmation; cancellation keeps the draft intact. Applying the properties is one undoable element transaction.

The initial limits are 1–20 rows, 1–12 columns, at most 1,024 characters per cell and at most 32,768 characters across the matrix. Cells are plain multiline text. Table content is editable with the usual element movement, resizing, styling, connections, duplication, deletion, history and native round trip. Existing transforms move the region positions while keeping text glyphs readable. This is a table element, not a spreadsheet engine or data-import milestone.

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

The payload type must match the node kind. Container titles are bounded to 4,096 characters. A table matrix must be nonempty, rectangular and within the row, column and text limits above. `headerRow` is a boolean. Compatible additional JSON fields survive supported updates; the editor does not execute markup or remote resources found in text.

Every persisted text-region extension requires `element-text-regions-v1` in `manifest.requiredFeatures`. ZIP and schema versions remain unchanged. Readers that do not recognize the required feature reject the project safely instead of flattening text regions. Writers retain the feature conservatively through undo and later edits; removing the last table is not a downgrade operation.

Table cells are authoritative. `content.text` is a trimmed, tab/newline-separated fallback summary capped at 4,096 characters for names and descriptions; editing that summary alone must not replace cell content. A table carrying a global rich-text payload is unsupported for authoring, preventing ambiguity between a global label and individual cells. A foreign table without this extension remains preserved and read-only rather than being silently converted into the new table profile.

Supported version-1 payloads are validated strictly. Future positive integer payload versions under the known required-feature marker are retained opaquely and remain read-only. Unknown required feature labels continue to fail safely. See the [native format contract](../architecture/project-format.md) for archive and unknown-data rules.

## Discovering a larger element library

The existing workbench remains in place. **Categories…** opens a Koxora dialog with independent checkboxes for Basic, Flowchart, Symbols and Drawing, a bounded preview, Select all/Clear actions, Apply/Cancel and an optional Remember selection preference. Several groups can be enabled together. Their union is deduplicated in registry order; Select and Pan remain available even when no library is selected. Cancelling the dialog leaves the applied selection untouched.

Search matches the selected language, English labels and element-kind aliases. Filtering out an armed insertion tool returns to Select. An explicitly selected menu/shortcut tool remains visibly pinned even when it falls outside the selected libraries. The quick toolbar is limited to 24 element entries, in addition to navigation and an explicit active tool. **Browse elements…** offers labelled tiles and search for the enabled libraries, initially renders 48 matches and adds further 48-item batches through Show more. Category previews are also bounded to 48 entries. These bounds support a larger catalog without rendering hundreds of toolbar buttons at once.

The remembered preference uses the versioned local key `koxora.element-libraries.v1`. It is independent of project content. Invalid stored values fall back to the available groups; recognized groups survive alongside unknown future groups. An explicit empty selection is valid. Unchecking Remember selection removes the saved preference. If local preference storage fails, the current session remains usable and reports the failure locally.

## Local-project search

Local projects now has a title search with trimmed, case-insensitive and accent-insensitive matching, a matching/total count and a clear action. The active project's current title participates in matching. Empty-library and no-match states remain distinct. Clearing search restores all rows and returns focus to the search field.

Unreadable project heads have no trustworthy title, so their recovery rows remain available while searching and an explanatory note is shown. Search filters display only; it does not rename, open, overwrite or remove projects. Normal rename/open/recovery actions retain their project identities.

## Acceptance and evidence

Verify title/body independence, table cell edits and bounds, resize cancellation/confirmation, unknown fields and future payload preservation, protected-content refusal, and atomic undo/redo. Exercise copy/duplicate, save/reopen offline, and native export/import with distinct contents in several cells. Verify category Apply/Cancel/Remember behavior, empty selections, blocked preference storage, bounded browsing, and project-search recovery behavior. Repeat keyboard and scrolling journeys in EN/DE at 100–200% scale in small and large windows.

Recorded local evidence for this follow-up:

- `pnpm check` passed TypeScript, lint, formatting, all **602 unit/integration tests**, documentation and dependency-license checks. The production web build also passed; the existing bundle-size warning remains.
- The final rendered-duplicate regression compared all **22 registered kinds** in Chromium at 26×22 with radius 5, 160×100 with radius 16 and 320×240 with radius 16. All three cases passed, including the revised Container and new Table.
- The native helper suite passed **eight tests**, with one Windows NSIS-specific skip. This does not replace a packaged target-native manual acceptance run.
- Independent review completed. Its findings were fixed: SVG titles and connection-port names now use authoritative structured text, Container body text is clipped to its body region, the table editor scrolls within its available width, and category controls stay stationary while previews change.
- The 24-entry quick-toolbar bound is unit-tested with a synthetic 201-entry source. The 48-entry browser and preview limits are source-checked. The current catalog does not exercise a real hundreds-element library or a second browser batch at runtime.

All **136 selected Chromium desktop/mobile browser cases** passed across the combined run and targeted follow-up. These cover structured elements, rendered duplicates, project search, category transactions, templates, editing/history, workbook/rich text, native archives, transforms and library layout, including EN/DE at 390px and 200%. The final follow-up passed all 28 cases after correcting a stale test locator and anchoring the category dialog for future preview-size changes. Firefox/WebKit and packaged target-native results remain separate CI/manual evidence.

Earlier template-build results are a separate baseline. Product Owner acceptance, packaged target-native manual acceptance, merge and release remain pending.
