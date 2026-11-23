# Independent table sizes and formulas

Status: accepted and merged in [PR #62](https://github.com/Koxora-Development/koxora/pull/62) on 2026-11-23 (`27527a7`), following the 2026-11-16 Product Owner assignment. Requirements: EDIT-007/008, CORE-003/005/006/007/008/012/015/016 and DATA-005/006 for clipboard and integrated table editing (partial implementation).

## Row and column sizes

Table tools expose numeric height/width for the selected rows/columns. Positive relative weights range from 1 to 10,000; 100 is the default. For example, widths `[100, 300]` allocate 25% and 75% of the table width. Editing one weight redistributes the fixed outer table size; resizing the outer element scales all cells proportionally. Equal rows/columns restores weights of 100. These controls are available in both the direct canvas table editor and the properties panel.

Cell bounds, header fills, grid paths, text layout and hit testing share cumulative weighted offsets. Merged cells occupy the sum of their component dimensions. Rotation and reflection keep the existing geometry contract. Insertion adds a default weight at the selected boundary; deletion removes the addressed weights; trailing expansion/shrink preserves retained weights.

## Formula entry and calculation

Enable **Calculate formulas in this table**. This explicit per-table option preserves old projects whose literal text begins with `=`. The value/formula field edits the selected cell's source, including multiline text. Ordinary rich text controls remain available, including mixed run formatting directly in the active canvas cell. See [direct table editing](direct-table-editing.md) for the AppImage feedback follow-up. Calculated values appear in the editor grid and on the canvas; the source formula remains portable and editable. Calculations run locally with no dependency, scripts, filesystem or network access.

Supported syntax:

- Cell references `A1` through `L20`, with `$A1`, `A$1` and `$A$1` copy locks.
- Inclusive rectangular ranges such as `A1:B4`.
- `+`, `-`, `*`, `/`, right-associative `^`, postfix `%`, unary signs and parentheses. Exponentiation precedes unary negation.
- Comparisons `=`, `<>`, `<`, `>`, `<=`, `>=`; TRUE/FALSE (WAHR/FALSCH).
- SUM/SUMME, AVERAGE/MITTELWERT, MIN, MAX, COUNT/ANZAHL, ABS, ROUND/RUNDEN and lazy IF/WENN. IF requires three arguments; ROUND requires the value and integer digits between -15 and 15. Aggregates include numeric cells and ignore text/blank cells.
- Decimal point, optional exponent notation, comma or semicolon argument separators, and quoted string literals with doubled quote escaping. German function aliases do not change number syntax. An apostrophe prefixes literal cell text when calculation is enabled.

Examples: `=SUM(A1:B3)`, `=SUMME(A1:B3)`, `=ROUND(A1*19%,2)`, `=WENN(A1>0;"Ja";"Nein")`. Numeric results use bounded 12-significant-digit display; source data is not rounded or replaced. This is a bounded diagram-table formula subset, not an XLSX/Excel compatibility claim. Cross-table/sheet references, named ranges, dates, external functions, macros, volatile functions, array formulas and dataset import are not included.

Errors are visible cell results: `#REF!` for unavailable references, `#CYCLE!` for circular dependencies, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#NUM!`, `#ERROR!` for syntax and `#LIMIT!` for resource bounds. Parsing permits at most 512 tokens and 64 nested expressions. Evaluation has depth/operation budgets and memoizes dependencies across the bounded 20×12 table. Errors never replace formula source. The parser/interpreter does not use eval or dynamic function construction.

## Editing and clipboard semantics

Inserting or deleting rows/columns rewrites references, including absolute references, to retain the original addressed cells. Partially deleted ranges shrink; wholly deleted references become `#REF!`. Scientific numeric literals and quoted text are not rewritten. Trailing table shrink applies the same deletion rules. Undo/redo restores sources and dimensions atomically.

A merge may retain a sole formula already at the upper-left anchor, but may not combine a formula with other nonempty contents or relocate a non-anchor formula. The operation fails without modifying any data; move/edit the formula explicitly first. Splitting retains its anchor source. References to covered merged coordinates see their blank underlying cells rather than counting the anchor repeatedly.

Copy produces quoted TSV sources plus bounded optional Koxora clipboard metadata when formulas are enabled. An internal paste into a calculation-enabled table shifts relative references using that origin while respecting `$` locks. Text-only external paste preserves the supplied references exactly; plain TSV has no trustworthy origin from which to infer offsets. Invalid translated ranges become `#REF!`; invalid/oversized matrix input remains atomic. Enabling formulas on a target table is an explicit choice. Clipboard exchange is text/formula exchange; native archives retain rich formatting.

## Portable compatibility contract

The existing version-1 `org.koxora.text-regions` table payload gains optional `columnWidths`, `rowHeights` and boolean `formulas`. Dimension arrays must match the exact matrix dimensions and contain only finite positive bounded numbers. The presence of any new field requires `table-layout-formulas-v1` in manifest.requiredFeatures. Known unsupported container combinations are rejected. Existing plain/advanced text-region requirements remain applicable.

The source matrix remains authoritative. Optional rich cell text is an exact source projection, including the formula string; render-time calculation derives display text without mutating the project. Structural formula rewriting retains the formula's first-run display style. The new feature gate remains conservatively after undo or disabling calculation. Older readers refuse this required feature instead of silently reverting to equal dimensions or displaying an incorrect calculation. Earlier files without the new fields continue to render equal cells and literal text. Unknown sibling data remains preserved.

## Acceptance

Verify EN/DE table controls, selected-cell source and result, direct canvas updates, relative dimensions under transforms, merge/split, row/column changes, absolute/relative copying, malformed clipboard input, negative/overflowing dimensions, cycle/zero-division/syntax/unsupported-function errors, literal equals text, quoted formulas, multiline values, archive round trips, required-feature rejection and bounded atomic history. Formula support does not change any release or native-permission gate.

## Recorded validation

The final local `pnpm check` passed type checking, lint, formatting, all 774 unit/integration tests, documentation and dependency-license checks. The production build passed with the existing bundle-size warning. The browser main run passed 46 Chromium desktop/mobile cases covering dimensions, EN/DE formulas, native export, direct/window editing, merge/history and existing table behavior. A final six-case formula/dimension/clipboard run passed after the last fixes, adding two native-clipboard reference-translation cases (48 distinct cases across both runs). The actual formula-editor screenshot was visually inspected. Independent review found no remaining material issues and passed 81 targeted tests. Remote CI, Firefox/WebKit and physical native GUI remain separate evidence.
