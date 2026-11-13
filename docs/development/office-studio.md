# Office-style Studio workbench

The Product Owner rejected the compact-dialog refinement in PR #56 and requested a substantially denser, conventional Office application structure. This follow-up is based on that combined review branch; it includes the unmerged storage, file-opening and project/element navigation work. Merge and publication still require explicit approval. Relevant requirements are CORE-001–006/010/015–017, EDIT-011 and OPS-001/003/007–009.

## Structure and behavior

A fixed application menu exposes File, Edit, View, Insert, Format and Help. A narrow quick-access toolbar holds file actions, history, navigation and panel controls. The project tree stays on the left, the drawing occupies the remaining center, and properties dock on the right. Project naming has one location in the toolbar. The Issue #57 follow-up removes the bottom status bar; theme and language remain in Settings → General, with selectable System default options. See [element transforms and interface follow-up](element-transforms.md).

Element properties use Format, Text and Links tabs. Applying a single-element form commits one existing edit transaction; Discard resets the form. Switching tabs retains the draft. Selection, project/page navigation, tools, history, file saves/exports and native opening cannot silently discard an unapplied form. Queued native requests resume after Apply or Discard. The draft indicator is distinct from the committed project's saved status. Invalid fields reveal their tab and receive focus. Clean forms refresh after model/history changes. Multi-selection formatting retains its existing immediate-application semantics.

Settings use a category list and one content area. General preferences work in browser and desktop; Project storage and File opening are native-only categories. First-run storage onboarding stays modal. Existing migration, restore, registration and failure handling are reused. AppImage setup now lives under Settings → File opening → Set up Open With; German: Einstellungen → Dateien öffnen → Öffnen mit einrichten. See [native opening](native-opening.md) for desktop registration limitations and wrapper usage.

Context menus expose short action groups and nested stacking/alignment commands. The menubar has roving keyboard focus, arrow/Home/End navigation and Escape/Tab dismissal. Nested menus retain keyboard focus during pointer movement. Panels can be hidden; narrow windows overlay them rather than squeezing the document. Light/dark and EN/DE share the same structure; no online service is introduced.

## Transformation follow-up

[Issue #57](https://github.com/Koxora-Development/koxora/issues/57) adds rotation and horizontal/vertical mirror authoring as a separate editing block after the Office layout. The [transform contract](element-transforms.md) documents single/multiple selection, pivot and text behavior, history, compatibility, anchors and required acceptance. Interactive exports remain deferred. Additional design presets, local templates and interface customization are [future planning](../planning/studio-design-customization.md).

## Manual acceptance

1. Use the combined Office review AppImage on CachyOS, and the matching browser package in Firefox. Import the supplied synthetic projects; work offline after initial browser provisioning.
2. At 1440×900, inspect the menu, toolbar, project tree and dock. Select an object, change Format/Text/Links tabs and compare light/dark, English/German. Hide both panels to recover drawing space.
3. Edit a property without applying. Try another object, another page, Local projects, Undo, Save and an incoming file request. The draft must remain intact. Apply, then undo/redo; repeat using Discard. Enter an invalid field and confirm validation reveals it without losing other fields.
4. Use menus with mouse, keyboard arrows, Home/End, Enter, Escape and Tab. Repeatedly click the same top-level menu to toggle it. Open nested commands and move the pointer away while keyboard focus stays inside.
5. Open Settings, change language/theme and inspect native storage/file-opening categories. Exercise migration/restore only with disposable data as in [combined acceptance](studio-integration-review.md). Register the stable AppImage path, then check Dolphin's Open With list.
6. Reduce the window and test 200% browser zoom, keyboard-only use, multi-selection formatting, text editing, link following, expanded canvas, export/import and offline restart.

Automated verification results and exact-head package identifiers belong in the PR and review handover. Screenshots establish presentation, not host-specific Dolphin/AppImage acceptance.

## Workbook, library and trash follow-up

The next Product Owner review requests Excel-like page switching, a coherent start/library view, a cleaner navigator, persistent workbench icons in expanded mode and permanent deletion from Trash. The bottom sheet bar now lists the active document's pages, scrolls long names, reveals the active sheet, supports arrow/Home/End navigation and adds pages through existing history commands. A compact document selector handles multi-document projects without changing page identities. The same four navigator/properties/objects/expand icons remain in an expanded workbench toolbar; leaving expanded mode restores focus to its trigger.

The start screen is a compact local project library rather than decorative project cards. Blank-project and file-opening actions remain distinct. A clearly marked, noninteractive planned-templates area reserves an appropriate future entry point without claiming template support. The navigator uses consistent project/document/page icons and the same hierarchy in its dock and expanded dialog.

Trash retains ordinary restoration and adds a per-project irreversible action with a named confirmation whose default is Cancel. Preparing the confirmation captures the exact trashed snapshot token and title; submitting cannot silently delete a later restored/edited/retrashed revision. Browser deletion uses one IndexedDB compare-and-delete transaction. Native deletion uses the same stable writer lock as writes/restores, rejects active/nontrashed/stale records and unexpected/symlinked leaves, removes only known project generations/pending files, and removes the matching current head last. An interrupted cleanup before the head commit point remains retryable. The empty UUID directory and writer-lock inode intentionally remain to prevent concurrent processes from splitting onto different locks; no project payload remains there after success.

Permanent deletion affects the current repository's project snapshots and recovery data. External `.koxora` exports and deliberately retained storage-migration backups are not removed. This is logical deletion, not a claim of physical secure erasure. No batch empty-trash operation or template authoring is introduced.

Additional manual acceptance: switch many sheets and documents offline; retain a pending property draft when attempting another sheet; toggle all four icons in expanded mode; compare the library/navigator in EN/DE and both themes. With disposable projects, move one to Trash, cancel permanent deletion, restore it, then trash and confirm deletion. Restart and verify it is absent while an unrelated project and external export remain. Concurrent restore/write or a changed confirmation snapshot must report a conflict and retain the changed data.

## Interface size, information rows and direct sheet naming

The next visual review requests an actual Trash icon, sheet renaming at the sheet bar, path-local storage actions, cleaner information disclosure and a user-defined GUI scale. The sheet bar now offers Rename through double-click, F2, its visible menu button and pointer/keyboard context menus. A short modal retains the existing workbook/history validation, immutable page identity, native-open pause and focus return. Cancel/Escape leaves the name unchanged.

Settings → General offers 100%, 125%, 150%, 175% and 200% interface scale. The existing compact size is the minimum/default. It is stored in the existing local preferences record; missing or unsupported values safely read as 100%. UI metrics scale independently from portable diagram geometry and the camera, without a CSS zoom/transform on the drawing surface. Logical viewport breakpoints keep large-scale settings and library rows reachable. Existing property drafts and settings category/focus remain mounted; language/theme and offline persistence continue to work.

The storage change/restore action sits with the effective path, with unchanged migration/restore guards and onboarding Keep behavior. Shared information rows use an information icon and a subtle plus/minus affordance instead of native triangle markers and heavy boxes; help text remains available. Trash has an explicit bin icon, document icons for entries and the same bin artwork for permanent deletion. File-manager MIME icon integration is documented in [native opening](native-opening.md).

Additional acceptance: rename a selected and inactive sheet via all entry points, cancel and undo, and verify stable IDs/links. Adjust scale with a property draft open: controls grow, the diagram stays at its previous zoom/pixel size, and the draft remains. Reload offline to retain the scale. At 200% in a narrow window, reach Close/Escape, library project names/actions and the scale control, then restore 100%. Verify path/change proximity and information rows in EN/DE and both themes. Refresh an existing AppImage integration and inspect `.koxora` icons in Dolphin; MIME/GIO unit evidence is not manual desktop-shell acceptance.

On narrow screens the quick toolbar scrolls horizontally; the save status remains rendered and reachable there. Navigator visibility is initialized from the window width, so tests that intend a desktop journey set that width before loading. Mobile navigation journeys explicitly open the navigator through its toolbar control.
