# Office-style Studio workbench

The Product Owner rejected the compact-dialog refinement in PR #56 and requested a substantially denser, conventional Office application structure. This follow-up is based on that combined review branch; it includes the unmerged storage, file-opening and project/element navigation work. Merge and publication still require explicit approval. Relevant requirements are CORE-001–006/010/015–017, EDIT-011 and OPS-001/003/007–009.

## Structure and behavior

A fixed application menu exposes File, Edit, View, Insert, Format and Help. A narrow quick-access toolbar holds file actions, history, navigation and panel controls. The project tree stays on the left, the drawing occupies the remaining center, and properties dock on the right. Project naming has one location in the toolbar. Theme, language and offline status remain in the bottom status bar.

Element properties use Format, Text and Links tabs. Applying a single-element form commits one existing edit transaction; Discard resets the form. Switching tabs retains the draft. Selection, project/page navigation, tools, history, file saves/exports and native opening cannot silently discard an unapplied form. Queued native requests resume after Apply or Discard. The draft indicator is distinct from the committed project's saved status. Invalid fields reveal their tab and receive focus. Clean forms refresh after model/history changes. Multi-selection formatting retains its existing immediate-application semantics.

Settings use a category list and one content area. General preferences work in browser and desktop; Project storage and File opening are native-only categories. First-run storage onboarding stays modal. Existing migration, restore, registration and failure handling are reused. AppImage setup now lives under Settings → File opening → Set up Open With; German: Einstellungen → Dateien öffnen → Öffnen mit einrichten. See [native opening](native-opening.md) for desktop registration limitations and wrapper usage.

Context menus expose short action groups and nested stacking/alignment commands. The menubar has roving keyboard focus, arrow/Home/End navigation and Escape/Tab dismissal. Nested menus retain keyboard focus during pointer movement. Panels can be hidden; narrow windows overlay them rather than squeezing the document. Light/dark and EN/DE share the same structure; no online service is introduced.

## Deferred transformations

[Issue #57](https://github.com/Koxora-Development/koxora/issues/57) records authoring rotation and horizontal/vertical mirroring, including single/multiple selection, undo/redo, portable persistence, anchors, text behavior and offline EN/DE acceptance. Imported rotation support does not constitute a completed authoring UI. Rotation/mirroring and interactive exports are not implemented by this layout change.

## Manual acceptance

1. Use the combined Office review AppImage on CachyOS, and the matching browser package in Firefox. Import the supplied synthetic projects; work offline after initial browser provisioning.
2. At 1440×900, inspect the menu, toolbar, project tree and dock. Select an object, change Format/Text/Links tabs and compare light/dark, English/German. Hide both panels to recover drawing space.
3. Edit a property without applying. Try another object, another page, Local projects, Undo, Save and an incoming file request. The draft must remain intact. Apply, then undo/redo; repeat using Discard. Enter an invalid field and confirm validation reveals it without losing other fields.
4. Use menus with mouse, keyboard arrows, Home/End, Enter, Escape and Tab. Repeatedly click the same top-level menu to toggle it. Open nested commands and move the pointer away while keyboard focus stays inside.
5. Open Settings, change language/theme and inspect native storage/file-opening categories. Exercise migration/restore only with disposable data as in [combined acceptance](studio-integration-review.md). Register the stable AppImage path, then check Dolphin's Open With list.
6. Reduce the window and test 200% browser zoom, keyboard-only use, multi-selection formatting, text editing, link following, expanded canvas, export/import and offline restart.

Automated verification results and exact-head package identifiers belong in the PR and review handover. Screenshots establish presentation, not host-specific Dolphin/AppImage acceptance.
