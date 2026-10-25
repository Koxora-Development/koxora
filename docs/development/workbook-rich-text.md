# Studio Phase 2.5: workbook and text editing

Phase 2.5 implements [Issue #19](https://github.com/Koxora-Development/koxora/issues/19), including the Product Owner's batch-formatting and compact-toolbar feedback. Both page tabs and Office-style text editing are acceptance scope. [ADR 0018](../adr/0018-workbook-rich-text.md) describes identity, history, rich-text preservation and dependency decisions. Phase 2.4's accepted merge `58c85cb` is the baseline. Website W1, link authoring from #24, release and deployment are separate work.

## Using the workbook

The bottom strip displays pages in the selected document. Use **+**, click a tab to switch, double-click/F2 to rename, or open **Page actions** by right-click, Shift+F10 or its touch button. Rename uses Enter to confirm and Escape to cancel. Drag tabs to reorder; focused tabs support Alt+Left/Right, and the Move dialog supports an explicit position and destination document. Left/Right/Home/End select and focus tabs. Overflow stays on one scrollable row with scroll buttons.

The document selector, New document and Rename document preserve the document/page hierarchy. Tabs indicate unsaved page/order changes. Zoom, center and grid belong to each page. Save/export include all documents, pages and views. Delete requires confirmation, retains at least one page per document and can be undone. Referenced/specialized pages are protected with an error instead of losing links or domain semantics. Stable IDs survive rename/reorder/move; duplicate gets new identities.

## Text editing

Double-click a label or use **Edit text** for the canvas text surface. **Element properties** and Enter provide the same formatting editor plus optional geometry and route controls. Select words to apply font, variable size (8–96), bold, italic, underline or color. Paragraph alignment supports mixed documents. With a caret, formatting applies to subsequent typing. Use Ctrl/Cmd+B/I/U and text Undo/Redo. Apply/Ctrl/Cmd+Enter commits; Escape cancels. Whole-project Undo/Redo is chronological across pages and restores deleted pages.

The font menu previews each family and can be searched. Fonts work without an account or network. The complete stored text remains available even when a small shape clips its display; resize it or reduce the size. Connection/drawing labels wrap in a 240-unit-wide view with a 512-unit height limit. Rich clipboard input keeps supported text styling; links, images and unsupported markup are omitted with a notice. Inputs beyond 4,096 characters are rejected instead of truncated.

## Batch selection and compact tools

Shift-click or marquee-select compatible objects, then open **Element properties** or right-click the selection. Mixed font/size/color values remain unchanged until a property is edited. Every change updates the selected compatible objects immediately as one undo step. Changing fill leaves all text runs intact; changing font family replaces only that run attribute. Close with **Done**. Fill/corners do not apply to text-only nodes, drawing lines or semantic connectors.

Align/Distribute appears for a multiple-node selection; alignment needs two nodes and distribution three. The optional **Objects** panel supplies explicit accessible selection for dense diagrams. Connection tools retain their separate **Connect by name** picker and visible cardinal ports.

## Offline font catalog

These are preferences backed by trusted fixed CSS stacks, not claims that all fonts are installed. No font binaries or external font service are used. Actual font rasterization and metrics vary by OS; choosing two absent families may produce the same fallback. The executable mapping is `FONT_FAMILIES` in `packages/editor-core/src/shapes.ts`.

| Menu family     | Preferred/fallback families before the CSS generic      |
| --------------- | ------------------------------------------------------- |
| Sans            | system-ui, Apple system, Segoe UI                       |
| Serif           | Georgia, Times New Roman                                |
| Monospace       | ui-monospace, SFMono-Regular, Consolas, Liberation Mono |
| Arial           | Arial, Helvetica, Liberation Sans                       |
| Helvetica       | Helvetica, Arial, Liberation Sans                       |
| Verdana         | Verdana, Geneva, DejaVu Sans                            |
| Tahoma          | Tahoma, Verdana, DejaVu Sans                            |
| Trebuchet MS    | Trebuchet MS, Gill Sans, DejaVu Sans                    |
| Segoe UI        | Segoe UI, Helvetica Neue, Liberation Sans               |
| Calibri         | Calibri, Carlito, Helvetica Neue, Liberation Sans       |
| Georgia         | Georgia, DejaVu Serif                                   |
| Times New Roman | Times New Roman, Times, Liberation Serif                |
| Cambria         | Cambria, Caladea, DejaVu Serif                          |
| Garamond        | Garamond, Palatino Linotype, Palatino, Liberation Serif |
| Palatino        | Palatino Linotype, Palatino, Book Antiqua, DejaVu Serif |
| Courier New     | Courier New, Courier, Liberation Mono                   |
| Consolas        | Consolas, Menlo, DejaVu Sans Mono                       |
| Menlo           | Menlo, Consolas, DejaVu Sans Mono                       |
| DejaVu Sans     | DejaVu Sans, Verdana                                    |
| Liberation Sans | Liberation Sans, Arial, Helvetica                       |

## Reproduction and evidence

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm test:e2e
pnpm audit --audit-level high
KOXORA_CAPTURE=1 pnpm exec playwright test tests/browser/phase25.spec.ts --project chromium
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for a system Chromium installation. The browser suite covers actual selections/caret, typing a size, rich/plain paste and sanitization, word-level formatting, per-page view restoration, keyboard/drag tab order, deletion/undo, mixed batch values, right-click selection, multiple documents, offline save/reopen and connection-port preservation. Core tests cover archive round trips, identity remapping, semantic deletion guards, history bounds and unknown rich-text protection. The PR records exact local results and remote CI results separately. Configured CI includes Linux/Windows/macOS checks, Chromium/Firefox/WebKit/mobile and native Tauri builds; configuration alone is not evidence of execution.

Actual screenshots live in `docs/design/screenshots/phase-2.5/`. Physical native GUI, system-font installation, touch/pen hardware, IME and assistive technology need the following manual checks; browser automation does not certify those environments.

## Product Owner retest

1. Create three pages and two documents. Rename by double-click and F2; cancel one rename. Drag tabs and use Alt+arrows. Move a page to another document and confirm its UUID/content survives export/import. Scroll a project with 20+ tabs on a narrow display.
2. Give each page a different zoom/pan/grid. Switch rapidly, save/restart offline and export/reimport. Delete a populated page, cancel once, then confirm; Undo/Redo restores the page and earlier edits. Try deleting the last page and a page with imported incoming actions/relationships.
3. Edit a shape, a text node, a free arrow and a semantic connector. Select one word and change font, size, bold/italic/underline and color. Change paragraph alignment, paste multiline Unicode and use text undo/redo. Apply, then project Undo/Redo. Save/reopen and inspect the `.koxora` round trip.
4. Search all font categories on Linux, Windows and macOS. Disconnect the network. Compare fallback rendering and wrapping; verify no external font requests. Test German/English, light/dark, small windows and fractional display scaling.
5. Select rectangle+ellipse with different fills/fonts/sizes. Open Properties and confirm Mixed. Change only fill, then only font family; verify other styles and mixed word formatting remain. Undo each batch in one step. Right-click any selected object and confirm selection stays intact. Include a connector and a text node to verify property applicability.
6. Inspect zero/one/two/three selected objects: no generic Diagram element dropdown in the normal toolbar, compact alignment for two and distribution for three. Open the optional Objects panel and Connect by name with keyboard/touch.
7. Recheck Line/Arrow source and target ports, automatic body anchors, movement/resizing, free drawing lines, cancellation, copy/paste, multiselection, protected imported content, previous-save recovery, conflicts and native Save As.
8. Test screen-reader names/focus, real touch/pen/trackpad, IME composition, Linux KDE/Wayland scaling and Windows/macOS native packages. Report any clipping, lost caret, unexpected focus or font fallback.

Final Product Owner acceptance, merge and any public release remain separate explicit decisions.
