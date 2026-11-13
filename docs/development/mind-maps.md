# Studio Phase 2.7: structured mind maps

**Status: assigned implementation for [Issue #60](https://github.com/Koxora-Development/koxora/issues/60) on accepted #59; Product Owner acceptance, merge and release remain pending.** The Product Owner requested continued development on 2026-11-13 and explicitly asked that it follow [the existing phase plan](../roadmap.md). Structured mind maps fill a remaining Phase 2 Editor alpha goal before Phase 3 data/export and Phase 4 network expansion.

Relevant requirements are DIAG-001 (topics and subtopics), EDIT-006 (automatic layout), EDIT-007 (manual positions), CORE-001/002/003/005/008/015/016 (local-first, browser/desktop, portability, history and localization), and the future template boundary in EDIT-012. The full [catalog](../product/feature-catalog.md) remains unchanged.

## Scope

The project library offers **New mind map**. It creates a separate local project with a named root and two editable branches from a bundled starter. The starter requires no account, remote resource or downloaded artwork. This action is the first mind-map entry point; it does not provide a template overview, user-saved templates or marketplace integration.

Within a supported mind-map page, users author topics and their parent/child hierarchy with root, child and sibling actions and the existing text editing controls. This first slice exposes these commands only for documents whose type is `mindmap`, with one supported mind-map model wholly contained on one page. Cross-page hierarchy authoring remains later work. Unrelated diagram documents do not become mind maps merely because they contain compatible-looking shapes. The shared canvas continues to provide selection, styling, movement, zoom and normal project navigation. Unrelated ordinary shapes on a supported page remain editable. Topic labels and application language are independent; generated starter labels use the selected interface language, while later language changes do not translate user content.

**Arrange** requires explicit confirmation before changing topic geometry. It preserves existing connection waypoints, styles and metadata; manually authored waypoints may therefore need later manual adjustment. Ordinary text editing and manual movement do not silently reposition existing topics. Layout changes are reversible through the existing history, and a failed command leaves the complete previous project intact.

**Delete branch** removes the chosen topic and its descendants as one history operation, subject to protection and reference checks. After deleting the last root, **Add root** allows drawing to continue. Generic topic Copy/Duplicate/Paste and semantic-page Duplicate/Delete are refused in this slice to avoid silently flattening or breaking the hierarchy. Those refusals do not turn unrelated ordinary shapes into read-only topics.

Mind-map controls are grouped in a disclosure that starts collapsed in small or short windows. Expanding it retains scrollable access to its controls and a minimum 160-pixel canvas area. Test keyboard focus and scrolling at increased interface scale rather than relying on controls fitting in an unscaled desktop screenshot.

## Data and preservation

Reuse the versioned native project model, including the existing `org.koxora.mindmap` domain model with root identities and parent references, and the shared editor command/history boundary. Keep domain relationships separate from presentation coordinates. Do not infer a topic's parent from its position or its label.

Stable topic identities and hierarchy must survive project/page navigation, offline restart and native `.koxora` export/import. Preserve compatible unknown data and unrelated pages, nodes, resources and references. Unsupported or protected imported configurations must fail safely or remain read-only; they must not be silently rewritten to fit this authoring subset. Branch deletion uses explicit reference handling and atomic undo/redo. General topic/page copying awaits a separate implementation that preserves semantics. Browser test doubles are not evidence of native operating-system behavior.

## Acceptance scenarios

1. Create a mind map from the project library. Verify a distinct local project with its root and two branches, then rename topics using the normal text editor.
2. Add children and siblings, including several hierarchy levels and long Unicode labels. Confirm the intended parent relationships and attached connections after manual movement and text changes.
3. Move topics manually, then invoke Arrange. Cancel once and verify no geometry changes; confirm the next attempt. Check the resulting hierarchy is readable and Undo/Redo restores the complete previous layout. Existing waypoints, styles and metadata remain unchanged.
4. Use Delete branch and check descendant removal, incoming-reference refusal and atomic Undo/Redo. Delete the last root and add a new root. Verify generic topic Copy/Duplicate/Paste and semantic-page Duplicate/Delete refuse unsupported operations, while unrelated shapes remain editable. Check protected layers, malformed or cross-page hierarchy, missing targets and imported newer/unknown data without losing unrelated content.
5. Save, close/reopen offline, export `.koxora`, import as a separate project and continue editing. Verify topic identities, hierarchy and presentation survive the supported round trip.
6. Repeat creation and hierarchy controls with keyboard access, English/German, light/dark themes, enhanced accessibility, 100–200% interface scale and small/short windows. Expand the collapsed mind-map disclosure and scroll its controls; the canvas retains at least 160 pixels of height. Controls and errors remain reachable and localized.
7. Use the shared browser implementation and a target-native review build. Distinguish automated browser checks, native compilation and actual desktop acceptance in the evidence.

## Validation status

Local validation on 2026-11-13:

- `pnpm check` passed TypeScript, lint, formatting, all **542 unit/integration tests**, documentation and dependency-license checks. The new core cases include atomic history, protected/unknown content, sparse imported references, stable sibling order after canonical export/import, and a validated 5,000-topic chain.
- The production web build passed through Playwright's server setup; the existing bundle-size warning remains.
- **53 Chromium regression cases** passed across editing, project storage, workbook/rich text, links, library layout and the shell. A subsequent **18 mind-map cases** passed in Chromium desktop/mobile, including offline reopening and reachable authoring/canvas/navigation controls in EN/DE at 390/800 pixels and 200% scale. These runs overlap; they are not 71 distinct scenarios.
- The native helper suite passed eight tests with one platform-specific skip. Rust and native packaging prerequisites are unavailable locally; GitHub CI packaging and target-native manual acceptance remain separate evidence.
- Independent review examined the actual diff and resolved writable-layer selection, sparse-reference page copying, canonical sibling order and small-window control reachability. No remaining actionable findings were reported.

The local environment required the pinned pnpm version, its matching temporary package store and readable modes on checked-out public website screenshots. These setup corrections do not change repository dependencies or website source. Product Owner manual acceptance, merge and release remain pending; the checklist above is not a claim of completed native acceptance.

## Remaining phase work

Phase 2 still includes organization-chart hierarchy/layout, remaining flowchart semantics/routing and a local template base with user save/apply behavior. Their acceptance is separate from this mind-map slice. Phase 3 covers data/charts and standard/interactive exports; Phase 4 covers network/IT and broader specialist diagrams. The [network plan](../planning/network-it-diagrams.md) and [design/template plan](../planning/studio-design-customization.md) remain future work, with no implied delivery date or publication approval.
