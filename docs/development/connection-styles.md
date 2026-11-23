# Connection styles and the 2026-11-17 authoring feedback

Status: accepted and merged in [PR #62](https://github.com/Koxora-Development/koxora/pull/62) on 2026-11-23 (`27527a7`). Requirements: EDIT-005/007/008 and CORE-003/005/006/007/008/015/016. This extends [direct table editing](direct-table-editing.md) and the existing [shapes and connections](shapes-text-connections.md).

The subsequent screenshot review requests a shared tabbed Shapes/Connections strip, width-based shape capacity, adaptive attachment ports and an explicit junction point. See [connection ports and junctions](connection-ports-junctions.md) for that additional contract and its separate acceptance cases.

## Connection choices

The first 2026-11-17 implementation provides an always-visible connection strip with twenty named visual presets. Straight, orthogonal and curved paths with no, one or both arrowheads are joined by dashed/dotted lines and arrows, open arrowheads, open/filled diamonds, circles and bars. All are ordinary local connections. The detailed options independently select line pattern and each endpoint symbol; they do not impose UML, ERD or network semantics.

Decorated free drawings use the existing floating-endpoint connection model, including a straight decorated line. Attached and mixed endpoints keep their existing anchor/attachment behavior. Choosing a plain preset clears prior decoration options for the next drawing; ordinary straight standalone Line/Arrow nodes remain unchanged. Styling an existing connection preserves its endpoints, text, unrelated extension data and ordinary history.

The visible path has solid, dashed or dotted strokes. Dots use round caps; the continuous transparent hit path remains usable between visible dashes/dots. Source symbols follow the outward source tangent, target symbols the target tangent. Marker geometry is shared by the gallery and renderer. Existing scene bounds include sufficiently padded endpoint areas for thick markers.

## Portable contract

The version-1 `org.koxora.connection` extension gains optional `lineStyle`, `sourceMarker` and `targetMarker`. Line styles are `solid`, `dashed`, `dotted`; symbols are `none`, `arrow`, `open-arrow`, `diamond`, `filled-diamond`, `circle`, `bar`. When a symbol field is absent, the existing `startArrow`/`arrow` boolean supplies its legacy meaning. Existing undecorated objects do not gain optional fields merely by reading or ordinary editing.

The presence of any decoration field requires `connection-decorations-v1` in the manifest. Known version-1 invalid values are rejected; unknown siblings remain preserved. Future unsupported extension versions remain uneditable. Commands validate choices, preserve options during ordinary changes, and remove omitted known optional fields when explicitly resetting to legacy appearance. The feature marker remains conservatively after clearing a decoration or traveling through history. An older application refuses this required feature instead of silently changing the diagram. No schema-version, native-permission, external-asset or dependency change is introduced.

## Fonts, text windows and symbol paging

The persistent dragging explanation is removed from text windows. Dragging from noninteractive surfaces and accessible keyboard movement remain available. The font picker replaces the prominent native disclosure triangle with a compact chevron. Its menu uses the browser's top layer while retaining its owner's DOM ancestry, keeping all twenty local font-stack choices reachable without clipping or dismissing the editor.

The same font choices apply to selected table cells/ranges and the rich-text selection inside an active cell. A chosen font for a blank cell survives typing and native reopen; mixed rich text and unselected runs retain their existing styles. Font names represent local font stacks with existing fallbacks, not bundled downloads.

Mouse-wheel paging works over the shape symbol strip and its page arrows. Both dominant horizontal and vertical wheel movement are normalized across pixel/line/page deltas. Small trackpad deltas accumulate; a short cooldown avoids racing across pages. Paging stays bounded and does not wrap. Control/Command wheel zoom and editable/filter controls keep their native actions. Buttons and keyboard paging remain available; touch does not depend on a physical wheel.

## Acceptance

Exercise all twenty fonts in ordinary text and table cells in English/German, at 100/200%, including narrow windows, a mixed styled paragraph, a blank cell that is saved/reopened, font search, scrolling and Escape/outside dismissal. Verify visible text windows no longer show the dragging explanation.

Page symbols with a real desktop wheel and small trackpad-like deltas; verify bounds, search/category changes, Control/Command zoom and keyboard navigation. Mobile synthetic wheel events validate the handler separately from physical hardware.

Draw representative connection presets in both languages, including custom symbols at each end and dashed/dotted paths. Verify attachment, geometry, hit testing, labels, formatting, Undo/Redo, copy/paste, native reopen and refusal without the required feature. Record actual validation and separate native GUI and remote browser-engine evidence in the PR handover.

## Recorded local validation

The final local `pnpm check` passed TypeScript, ESLint, formatting, all 871 unit/integration tests, documentation and dependency-license checks. Production builds passed with the existing bundle-size warning. Across the coordinated runs, 128 distinct Chromium desktop/mobile cases passed. The final 34-case table/font run and 22-case font/live-editing run passed after the synchronization changes. Rapid typing in empty styled cells also passed twelve repeated EN/DE desktop/mobile cases. Desktop wheel tests use actual wheel input; mobile tests dispatch native wheel events because touch emulation suppresses the hardware injection.

The actual font popup was visually inspected and exposes the complete existing list without toolbar clipping. Checks include mixed and unselected run preservation; font selection in cell ranges; an empty cell formatted through the rich toolbar, exported/reopened, undone/redone and typed into; menu focus, search and Escape; decorated paths and native required-feature preservation. Existing context-menu and page-navigation tests now explicitly reopen the intentionally auto-collapsed navigator; table-entry helpers use the direct single-click path, and pointer-based size assertions allow a tightly bounded rounding tolerance. A distant-line fixture zooms out before drawing so its endpoints remain inside the smaller work area.

Independent review found no remaining material findings after correcting opaque future-version feature gating, menu focus, native typing focus, delayed controlled-value acknowledgements and empty-style undo/redo. A bounded local acknowledgement queue preserves newer input while accepting external history changes. Memoized cell values prevent camera-only renders from replaying stale input, and ProseMirror selection/focus is established in the layout phase. Empty style seeds are saved for explicit formatting rather than mere focus. Native Python helpers passed eight cases with one NSIS-specific skip; native code and permissions are unchanged. Latest remote CI and native build artifacts remain separate evidence from these local results.
