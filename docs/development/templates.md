# Studio Phase 2.7: simple templates and a categorized element library

**Status: corrected implementation assignment for [Issue #60](https://github.com/Koxora-Development/koxora/issues/60) and [PR #61](https://github.com/Koxora-Development/koxora/pull/61), based on accepted #59. Product Owner acceptance, merge and release remain pending.** The Product Owner requested a shared template selection with several simple mind-map layouts and other small starters. More detailed templates must follow the availability of additional editor functions and a broader element library.

Relevant requirements are the initial built-in portion of EDIT-012 (template management), EDIT-015 (element libraries), EDIT-003/004/005/007/008 (ordinary elements, editing, connections and styles), and CORE-001/002/003/005/006/008/015/016 (shared local-first editing, portability, history and localization). The examples contribute starter content for DIAG-001/003/005/007; they do not establish complete semantic diagram engines or automatic hierarchy layout. The full [catalog](../product/feature-catalog.md) and [phase table](../roadmap.md) remain unchanged.

## User flow

The project library and application menu open a dedicated **Templates** overview. Users can search, filter categories and inspect a preview before creating a project. The overview is part of the local application and works offline after provisioning. A blank project remains available through the existing creation action.

Choosing a template creates a separate ordinary editable project with fresh identities. It never changes the bundled template or overwrites an existing stored project. The existing protection for unsaved work remains in effect. Returning to the project library retains the library's normal navigation and project controls.

The generated shapes, text and connections use the same tools as a blank project: selection, movement, resizing, text/style changes, copy/duplicate/delete and undo/redo. Users can extend a starter with any existing palette element. No special mind-map authoring panel, hierarchy commands or additional copying/deletion restrictions are introduced by these templates.

## Initial catalog

| Category     | Simple starters                                         |
| ------------ | ------------------------------------------------------- |
| Mind maps    | Radial brainstorming, a branching tree, and a study map |
| Flowcharts   | A linear process and a small decision flow              |
| Organization | A small team chart                                      |
| Planning     | A weekly plan and a goals board                         |

The initial catalog deliberately uses supported shapes, text and ordinary connections. Different geometry, palettes and example labels provide useful starting points without implying unsupported features. A team chart is editable example content, not evidence that automatic organization-chart layout is implemented. A planning board does not imply task scheduling, live data or a domain-specific board engine.

Previews come from the same trusted declarative content as generated projects. They should accurately represent each starter's geometry, labels, colors and connections. Content is bundled with the application; no account, remote template service, downloaded artwork or runtime icon/font request is needed. UI labels and example starter text use English/German resources. Changing the interface language after creation does not translate or mutate a user's document.

## Categorized element library

The follow-up assignment adds ten generic built-in shapes: document, database, cloud, folded-corner note, predefined process, trapezoid, pentagon, octagon, chevron and cross. They extend the existing shape registry and use the normal label, style, transformation and connection behavior. They do not implement a database engine, cloud integration or domain-specific process semantics.

The palette offers All, Basic, Flowchart, Symbols and Drawing categories, plus text search. Search matches the selected language's labels and English labels. Select and Pan remain available regardless of filtering. If a filter hides an armed insertion tool, insertion returns to Select so a hidden tool cannot keep creating unexpected content. Keyboard navigation, accessible names and the normal editing tools remain available.

The registry additions use ordinary nodes without a new schema or dependency. Older readers retain unknown kinds using their existing read-only fallback; their fallback geometry is not a promise of the new shape's exact appearance. Unknown imported data must remain intact. Current-reader rendering, picking, anchors and transforms require actual tests for the new contours.

The Product Owner's long-term goal is broad coverage of elements and templates offered by competing tools, plus additional useful original content. Track this as a maintained categorized inventory of implemented, planned and unsupported capabilities with provenance and validation evidence. A current subset must not be described as complete competitor parity. Reusable artwork requires established licensing and attribution; adding a generic shape is not evidence that a specialized diagram engine or its semantics is implemented.

Keep the first templates simple while this element library and the required editor functions expand. More elaborate templates should follow their actual supported editing capabilities rather than showing content users cannot meaningfully modify.

## Data and preservation

Each application of a template creates fresh project, document, page, layer, element and connection identities, with every connection pointing to its newly created endpoints. The catalog is immutable reusable source data. Editing one generated project must not alter another instance or a later preview.

Generated template content uses the portable project format and ordinary editor extensions. Applying a starter adds no special semantic domain model. Element-registry additions require their own verified compatibility behavior rather than silently rewriting imported content. Native export/import, save/reopen and offline editing must preserve the generated content as they do an ordinary project. Existing imported semantic models retain their established compatibility behavior; the template catalog does not reinterpret or rewrite them.

User-saved custom templates, template import/export, sharing, public catalogs and marketplace distribution remain separate work. The current catalog is a first template foundation, not completion of all EDIT-012 acceptance criteria. More elaborate examples await the functions and element families needed to make their contents fully editable and useful.

## Acceptance scenarios

1. Open Templates from the library and application menu. Check search, category filtering, preview selection, an empty search result and returning to the library. Confirm a blank project can still be created.
2. Inspect all eight simple starters, including all three mind-map layouts. Check that each preview represents the project that is created and that all labels are readable.
3. Create two projects from the same starter. Rename and edit one, then open the other and create a third. Confirm the catalog and other projects are unchanged and generated identities/references are independent.
4. Edit text, move and resize elements, change colors, find and insert a shape through palette categories/search, copy/duplicate/delete and undo/redo. Ordinary editor commands remain available for every starter, including mind-map examples.
5. Save and reopen offline, export `.koxora`, import it as another project and continue editing. Check positions, text, styles and attached connections. Cancel a template creation while protecting unsaved work and verify the original project remains intact.
6. Use search, categories, preview and creation with the keyboard in English/German, light/dark themes, enhanced accessibility and 100–200% scale. Repeat in small windows; all controls and results remain reachable through appropriate reflow/scrolling.
7. Test the shared browser implementation and a target-native review build. Record actual browser, compilation and native manual evidence separately.

## Validation status

Local evidence for this template and element implementation:

- `pnpm check` passed TypeScript, lint, formatting, all **582 unit/integration tests**, documentation and dependency-license checks. Tests include fresh template identities, archive round trips, unrestricted ordinary editing/history, localized immutable catalog data and new shape geometry/anchors.
- The production web build passed through Playwright's server setup. The existing bundle-size warning remains.
- All **24 new browser cases** passed in Chromium desktop/mobile, covering template previews/filtering, independent project creation, ordinary duplication/deletion/history, unsaved-work protection, offline reopening, category/search behavior and EN/DE controls at 390/800 pixels and 200% scale. The final preview test also verifies explicit paragraph spacing.
- All **47 existing Chromium regression cases** passed across targeted runs for editing, projects, links, workbook/rich text, library layout and transforms. The library test now checks the working dedicated Templates entry while retaining the absence of a reserved empty template sidebar. Targeted mobile checks also passed.
- The native helper suite passed eight tests with one platform-specific skip. Rust/native packaging prerequisites are unavailable locally; GitHub build results and target-native manual acceptance are separate evidence.
- Independent review of the actual diff found and resolved preview paragraph fidelity and a narrow-angle document-contour anchor case. The final contour agreed with SVG fill sampling, and fine radial scans found no re-entry. No remaining actionable findings were reported.

The restored execution environment required the pinned pnpm version and restoration of its temporary package-store metadata before the dependency-license check. These setup changes do not alter repository dependencies. Product Owner acceptance, merge and release remain pending. Earlier standalone mind-map test artifacts are not evidence for this implementation.

## Remaining phase work

The remaining Phase 2 semantic diagram workflows and user-saved local template management need separate implementation and acceptance. Phase 3 covers data/charts and standard/interactive exports; Phase 4 covers network/IT and broader specialist diagrams. The [design/template plan](../planning/studio-design-customization.md) and [network plan](../planning/network-it-diagrams.md) retain their longer-term requirements without promising unsupported detailed templates in the first catalog.
