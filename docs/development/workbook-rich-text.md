# Studio Phase 2.5: workbook and text editing

Phase 2.5 implements [Issue #19](https://github.com/Koxora-Development/koxora/issues/19), including the Product Owner's batch-formatting and compact-toolbar feedback. Workbook navigation and Office-style text editing are equal acceptance priorities. The [AppImage feedback on PR #39](https://github.com/Koxora-Development/koxora/pull/39#issuecomment-6423620646) supersedes the initial Excel-tab presentation: the sidebar is now the single project/document/page navigator. The Product Owner also authorized a freehand pen, four stacking commands and a separate non-overlap arrangement command. [ADR 0018](../adr/0018-workbook-rich-text.md) describes identity, history, rich-text preservation and dependency decisions. Phase 2.4's accepted merge `58c85cb` is the baseline. Website W1, link authoring from #24, release and deployment are separate work.

## Using the workbook

The **Project navigator** lists all local projects. Open a project to expand its documents and pages. Its hierarchy is the sole navigation surface: the bottom document selector and page strip have been removed. Expanded canvas has a **Project navigator** button opening the same tree in a dialog. Long names wrap/truncate with full accessible names; vertical scrolling keeps large workbooks and narrow windows usable.

Click a page to switch; double-click or F2 renames. Use Up/Down/Home/End to focus rows, Left/Right to collapse/expand, Enter to activate and Alt+Up/Down to reorder pages/documents. Drag pages within or between documents, or use **Move to document…** with an explicit destination and position. Right-click, Shift+F10 and visible row action buttons open the same menu beside the interaction, clamped to the viewport. Escape closes it and restores focus. Create page/document buttons remain visible. Page duplication remaps child IDs; rename/reorder/move preserve IDs. Dirty indicators identify changed pages, document order and the project.

Switching projects saves the complete current project first. A failed/conflicting save leaves the current project and unsaved changes open and exportable. Whole-project duplication copies all resources and opaque data under a fresh project UUID; child UUIDs remain in their project namespace. This is distinct from moving a page to a different project, which remains deferred. Deleting a project requires confirmation and moves it to local **Trash**, preserving current and recovery snapshots; **Restore project** reverses it. This is separate from session Undo/Redo. Exported files are never deleted. Trash is local-store metadata; older application versions may still list trashed projects.

Zoom, center and grid belong to each page. Save/export include all documents, pages and views. Page/document deletion requires confirmation, retains at least one page per document and one document per project, and can be undone. Incoming semantic references block deletion with a visible error. Undo/Redo also works while a tree row is focused. Deleting an inactive page/document retains the active page; deleting the active page focuses the surviving page.

## Text editing

Double-click a label or use **Edit text** for the canvas text surface. **Element properties** and Enter provide the same formatting editor plus optional geometry and route controls. Select words to apply font, variable size (8–96), bold, italic, underline or color. Paragraph alignment supports mixed documents. With a caret, formatting applies to subsequent typing. Use Ctrl/Cmd+B/I/U and text Undo/Redo. Apply/Ctrl/Cmd+Enter commits; Escape cancels. Whole-project Undo/Redo is chronological across pages and restores deleted pages.

The font menu previews each family and can be searched. Fonts work without an account or network. The complete stored text remains available even when a small shape clips its display; resize it or reduce the size. Connection/drawing labels wrap in a 240-unit-wide view with a 512-unit height limit. Rich clipboard input keeps supported text styling; links, images and unsupported markup are omitted with a notice. Plain-text copy/paste preserves blank and trailing lines and normalizes CRLF/CR line endings to LF. Inputs beyond 4,096 characters are rejected instead of truncated.

**Automatic text color** uses the canvas foreground for transparent text/line/connection labels, and black/white contrast against filled shapes. Missing legacy colors use automatic appearance; explicitly stored colors stay unchanged. Editor-only contrasting backdrops make white, dark and mixed-color runs inspectable, with matching caret and visible selection. Transparent text remains transparent in the file/canvas but is indicated while editing. These presentation backdrops never enter the archive. Theme changes do not recolor authored data.

## Batch selection and compact tools

Shift-click or marquee-select compatible objects, then open **Element properties** or right-click the selection. Mixed font/size/color values remain unchanged until a property is edited. Every change updates the selected compatible objects immediately as one undo step. Changing fill leaves all text runs intact; changing font family replaces only that run attribute. Close with **Done**. Fill/corners do not apply to text-only nodes, drawing lines or semantic connectors.

Align/Distribute appears for a multiple-node selection; alignment needs two nodes and distribution three. Align shares an edge/center and can intentionally overlap objects. Distribute spaces objects between the outer bounds; insufficient space can retain overlap. Hover/focus previews the result; click commits, Escape cancels. **Arrange without overlap** is separate: a grid with 24-world-unit gaps moves selected editable nodes around other visible objects. Unselected/locked objects stay in place. Each command is one undo step.

**Stack order** and contextual **Bring forward / Send backward / Bring to front / Send to back** interleave shapes and semantic connectors within their existing layer. Ctrl/Cmd+Alt+Up/Down moves one step; add Shift for front/back. Paint order and picking agree; copying a group preserves its relative order. A full layer manager remains deferred. The optional **Objects** panel supplies explicit accessible selection for dense diagrams. Connection tools retain their separate **Connect by name** picker and visible cardinal ports.

## Freehand pen

Select **Freehand pen**, choose stroke color/width (1–32 world units), then draw with mouse, touch or pen. Each completed stroke is one undoable ordinary object; Select supports move, resize, rotate through geometry, duplicate/copy/paste, recolor and delete. A click makes a dot. Enter starts a keyboard stroke at the view center; arrows extend it by one world unit (Shift: ten), Enter commits, Escape cancels. Two-finger navigation and pointer cancellation discard a pending stroke. Completed strokes persist offline in `.koxora`. Pressure/tilt brushes, eraser and stroke-point editing are not part of this pen.

Samples are bounded to 8,192 per stroke; reaching the limit cancels the pending stroke with a visible message, never silently truncating it. The pen does not create semantic ports or invisible text labels.

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
KOXORA_CAPTURE=1 pnpm exec playwright test tests/browser/phase25.spec.ts tests/browser/feedback.spec.ts --project chromium
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for a system Chromium installation. The browser suite covers actual selections/caret, typing a size, rich/plain paste and sanitization, word-level formatting, per-page view restoration, keyboard/drag tree order, deletion/undo, mixed batch values, right-click selection, multiple documents, offline save/reopen and connection-port preservation. Core tests cover archive round trips, identity remapping, semantic deletion guards, history bounds and unknown rich-text protection. The PR records exact local results and remote CI results separately. Configured CI includes Linux/Windows/macOS checks, Chromium/Firefox/WebKit/mobile and native Tauri builds; configuration alone is not evidence of execution.

Actual screenshots live in `docs/design/screenshots/phase-2.5/`. Physical native GUI, system-font installation, touch/pen hardware, IME and assistive technology need the following manual checks; browser automation does not certify those environments.

## Product Owner retest

1. Create three pages and two documents in each of two local projects. Rename by double-click and F2; cancel one rename. Drag page/document rows and use Alt+Up/Down. Move a page to another document and confirm its UUID/content survives export/import. Scroll a project with 20+ pages on a narrow display; repeat in expanded canvas.
2. Give each page a different zoom/pan/grid. Switch rapidly, save/restart offline and export/reimport. Delete a populated page, cancel once, then confirm; Undo/Redo restores the page and earlier edits. Try deleting the last page and a page with imported incoming actions/relationships.
3. Edit a shape, a text node, a free arrow and a semantic connector. Select one word and change font, size, bold/italic/underline and color. Change paragraph alignment, paste multiline Unicode and use text undo/redo. Apply, then project Undo/Redo. Save/reopen and inspect the `.koxora` round trip.
4. Search all font categories on Linux, Windows and macOS. Disconnect the network. Compare fallback rendering and wrapping; verify no external font requests. Test German/English, light/dark, small windows and fractional display scaling.
5. Select rectangle+ellipse with different fills/fonts/sizes. Open Properties and confirm Mixed. Change only fill, then only font family; verify other styles and mixed word formatting remain. Undo each batch in one step. Right-click any selected object and confirm selection stays intact. Include a connector and a text node to verify property applicability.
6. Inspect zero/one/two/three selected objects: no generic Diagram element dropdown in the normal toolbar, compact alignment for two and distribution for three. Open the optional Objects panel and Connect by name with keyboard/touch.
7. Recheck Line/Arrow source and target ports, automatic body anchors, movement/resizing, free drawing lines, cancellation, copy/paste, multiselection, protected imported content, previous-save recovery, conflicts and native Save As.
8. Right-click project/document/page/shape/edge at every viewport edge; repeat with Shift+F10 and touch buttons. Confirm menu focus, Escape, direct Edit text, empty-canvas actions and selection preservation. Repeat inside the expanded navigator. Switch with unsaved edits; simulate storage failure and verify the project stays open. Duplicate an entire project, trash it from expanded mode, restore and compare exported content.
9. Test default/white/dark/mixed-run labels on a filled shape, standalone text, free arrow and semantic connector in both themes. Check canvas, inline/properties editor, caret, selection, theme switches and export/reopen. Automatic word overrides must work even on an explicitly colored base.
10. Preview Align, Distribute and Arrange without overlap; cancel, commit and undo. Include rotated shapes, connectors and locked obstacles. Stack a connector above a shape, click the overlap, duplicate the group and save/reopen. Verify all four commands and keyboard alternatives.
11. Draw mouse/touch/pen strokes and keyboard strokes. Cancel one, copy/resize/recolor another, undo/redo, export/reopen offline. Test long strokes, dots and two-finger navigation without accidental ink.
12. Test screen-reader names/focus, real touch/pen/trackpad, IME composition, Linux KDE/Wayland scaling and Windows/macOS native packages. Report any clipping, lost caret, unexpected focus or font fallback.

Final Product Owner acceptance, merge and any public release remain separate explicit decisions.
