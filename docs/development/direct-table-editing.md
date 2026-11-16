# Direct table editing and AppImage feedback

Status: Product Owner-assigned extension of the active, unmerged [PR #62](https://github.com/Koxora-Development/koxora/pull/62), following review of its AppImage. The accepted prerequisite is PR #61, merged on 2026-11-15 (`7efb135`). The feature branch implements the behavior below; validation evidence remains distinct from merge and release acceptance. It does not authorize a merge or public release.

Relevant requirements: EDIT-003/005/007/008/015; CORE-001–008/012/014/015/016; and the bounded clipboard/integrated-editor portion of DATA-005/006. The existing [table formula and size contract](table-calculations.md), [text-region preservation contract](element-text-regions.md) and [window/library/table operations](window-library-tables.md) remain applicable.

## Table authoring on the canvas

The rendered table must become the editing surface. Selecting and editing a cell must keep the user's attention at that cell rather than require working in the properties panel or a detached copy of the grid. A visible active cell and rectangular range selection provide the basis for keyboard navigation, formatting, clipboard and structure operations. Merged cells retain a single content-owning anchor and complete-span selection behavior.

Contextual controls above the canvas provide row/column insertion and deletion, merge/split and access to the existing table options. Column and row headers expose keyboard-focusable boundary handles for direct dimension manipulation. Handles remain outside cell content, including merged cells. The actual active cell hosts the existing rich-text editor; its formatting toolbar appears above the canvas. Native rich-text selection and paste remain separate from whole-cell range clipboard operations. Enter and Tab move between cells, Alt+Enter inserts a paragraph, F2 edits the selected cell and Escape returns to selection before leaving the table. Tab at the last cell adds a row within the existing bound. Cell value/formula source remains distinct from its calculated display result. The properties panel remains an additional path for detailed settings and rich formatting.

The implementation must preserve live source edits, mixed text, formula reference changes, quoted TSV exchange, relative/absolute copy behavior, atomic structure changes and grouped text history. Removing populated cells still requires confirmation. Invalid or oversized changes must leave project data intact. A pointer gesture on the table must not accidentally move the whole element while the user selects cells or adjusts a boundary; ordinary element manipulation must remain available outside the table-editing session.

The table retains its documented bounds: 20 rows, 12 columns, 1,024 characters per cell and 32,768 total. Direct dimension manipulation uses the existing positive relative row/column weights inside the fixed outer geometry. It introduces no new archive format or native permission. Formulas keep the existing explicit per-table calculation option and bounded local interpreter.

## Windows and symbol access

A text editor title should describe the action clearly. The small move handle must not be the only pointer entry point: noninteractive window surfaces also allow movement, while inputs, buttons, editable content and text selection retain their normal behavior. Keyboard movement remains available. The window must remain reachable after dragging, content changes, interface scaling and viewport changes.

The compact palette must offer a visible way to page or switch quickly through every enabled symbol. A fixed first batch plus a separate browser is insufficient for this feedback. Filtering, category changes, active-tool visibility and keyboard access must stay consistent; catalog growth must not force hundreds of buttons into the toolbar. The searchable element browser remains useful for labelled previews.

The catalog adds 40 original shapes (33 IT/network/storage/security/device symbols and seven block arrows), bringing the branch to 98 shape kinds plus Freehand across fifteen libraries. Nine line/arrow presets combine straight, orthogonal and curved paths with no, one or both arrowheads. Non-straight empty-space drawings use the existing floating-endpoint connection model so routing is retained; straight standalone lines keep their existing behavior. These are ordinary editable elements without network-domain semantics. There are no provider logos, external artwork, remote resources or new dependencies. Complete network modeling, port metadata and domain-specific validation remain later milestones.

## Layout corrections

- Wrap labels at word boundaries when a word fits; split within a word only when that individual word is too long for the available line.
- The properties dock is 360 CSS pixels at default scale. Give properties controls enough width for readable numeric fields and practical table/text editing. Prevent the dock from obscuring most of a newly narrowed window; panel state must react to resizing as well as initial load.
- Give focus indicators enough space around search fields, controls and adjacent status/help content. Preserve a visible keyboard focus indicator rather than removing it to hide overlap.
- Present geometry values to at most two decimal places without rewriting stored precision merely by opening properties.
- Compare browser-measured accessibility target bounds with a tiny numerical tolerance so a reported `43.999969` CSS pixels does not fail a true 44-pixel target. A tolerance must not conceal materially undersized controls.
- Keep README, roadmap and development guides clear that PR #61 is accepted and merged, while PR #62 remains a separate active follow-up.

## Acceptance and evidence

Exercise the actual canvas table in English and German, both themes, 100% and 200% scaling, wide and narrow windows. Enter text and formulas, move between cells with the keyboard, select a range, paste quoted multiline TSV, merge/split and insert/delete around merged cells. Cancel a populated deletion before confirming another. Drag individual column/row boundaries; check weighted layout, rotated/reflected geometry and return to ordinary element selection. Verify source text, rich formatting, formula results/references, dimensions, undo/redo and native save/reopen. Table interactions must not depend on an open properties dock.

Drag the text window from several noninteractive surfaces; verify that typing, text selection, toolbar controls and keyboard movement still work. Page through enabled symbols and quickly change libraries, including empty/search-filtered selections and an active tool outside the visible page. Insert and transform representative new IT, arrow and line symbols. Compare every registered shape's rendered geometry for accidental duplicates.

Check the reported `Research options` label at its standard rectangle size, long individual words, geometry display precision, text-size field readability and a visible 3×3 table grid in properties. Open the dock in a wide window, shrink to phone width and verify that the canvas and Fit content remain reachable. Tab through search fields, dialogs and neighboring controls to inspect focus-ring spacing at both interface scales.

Record actual unit/integration, build, browser-engine, offline, localization, archive/history and independent-review evidence in the PR handover. Historical checks for the earlier window/table implementation are not evidence that this AppImage follow-up passes. Physical native GUI, touch and assistive-technology acceptance remain distinct from automated browser results.

## Recorded follow-up validation

The local quality gate passed all 856 unit/integration tests, TypeScript, ESLint, formatting, documentation and dependency-license checks. The production build passed with the existing bundle-size warning. Browser evidence covers 136 distinct successful Chromium desktop/mobile cases across the new direct-table, window/palette, layout, line-preset and rendered-duplicate flows plus existing editing, library, live-feedback, start-page and workbench regressions. Focused reruns superseded obsolete expectations about always-open docks, first-page symbols and required scrolling in a now-fitting 3×3 table. All original reachability, non-overlap and content-preservation assertions remain applicable.

The actual rich-cell editor and formula-table screenshots were visually inspected. Independent review found no remaining blocking findings after correcting alignment feedback, native heading/separator keys, closing focus, merged-cell resize hit targets, refocusing and merged-range keyboard extension. The reviewer independently passed 283 targeted shape/table/history tests. Native Python helpers passed eight cases with one NSIS-specific skip. No native code, dependencies or permissions changed; Cargo and physical native GUI checks were unavailable locally.

Synthetic clipboard fixtures supply local event payloads explicitly because Firefox protects constructor-provided transfers. This exercises cell-range handlers without requesting system clipboard permission; physical office-application exchange remains manual acceptance. Firefox/WebKit and the latest remote desktop builds are separate CI evidence, not implied by local Chromium success. The new test AppImage must correspond to this follow-up commit; earlier artifacts do not include these changes.
