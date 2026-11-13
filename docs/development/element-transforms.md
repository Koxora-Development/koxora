# Element rotation and mirroring

**Status: implementation for Issue #57 review; merge and publication require Product Owner approval.** This extends the [Office workbench](office-studio.md) and [interactive editing](interactive-editing.md). References: EDIT-003/004/005/007/008, CORE-003/005/006/007/008/012/015/016, OPS-001/007/008.

## Interaction contract

The properties dock provides a numeric rotation in degrees, clockwise/counterclockwise 90° commands and horizontal/vertical mirror commands. Format → Transform and the compact context-menu Transform submenu expose the same four commands with English/German names and keyboard access. Single-element properties remain a draft until Apply; multi-selection properties and menu commands apply immediately.

Each selected element keeps its own center at `(x + width / 2, y + height / 2)`. Numeric multi-selection rotation sets each element's absolute angle; quarter-turn commands add or subtract 90° from each angle. A rotation handle measures the pointer angle around the handle owner's center and applies that delta to every selected editable node, each around its own center. Shift snaps the delta to 15° increments. The selection does not orbit a common pivot. Pointer previews create no history entry; release commits one operation, while cancellation discards the preview.

Horizontal and vertical mirroring use the element's local axes before rotation. Shapes and freehand points reflect; label positions follow their reflected label area, while glyphs remain unreflected. Shape labels and standalone text follow the node's rotation. Line/arrow labels retain the existing upright connection-label presentation. Mirroring a text-only element therefore does not reverse its letters. Arrowheads retain their semantic start/end association and follow the transformed endpoints.

Semantic connection anchor names remain attached to the same local edge of the node after reflection and rotation. Automatic anchors use the transformed contour. Existing manual connection waypoints remain in world coordinates; transforming individual endpoint nodes does not rotate an entire routed connection or silently rewrite its waypoints. Standalone line endpoints, hit testing, selection outlines and resize handles use the same transformed geometry. Reshaping a mirrored line by its endpoints may fold its horizontal reflection into its rotation while preserving the visible segment and start/end semantics.

Locked, hidden and unsupported elements remain inert. UI selection excludes them; a direct batch command containing an invalid or protected target is rejected before any project replacement. Finite numeric angles up to an absolute value of `1e12` are accepted and normalized into `[0, 360)` by the authoring controls. Invalid input must not partially transform a selection. IDs, paint order, links, rich text, styles and unrelated compatible extensions are retained.

## Portable representation

The existing `geometry.rotation` remains authoritative. Reflection adds optional boolean `geometry.flipX` and `geometry.flipY`; missing values mean `false`. Width and height retain their existing nonnegative storage and positive editing-size invariants. Reflection never uses a negative size.

Any project containing either reflection field, including an explicit `false`, must declare `node-reflection-v1` in `manifest.requiredFeatures`. Editing introduces that declaration when necessary. The existing ZIP/schema version remains `1.0.0`; the required-feature gate expresses the additional rendering requirement. Existing files without these fields continue to open without migration.

Older readers do not recognize this required feature and refuse to open the project as unsupported. They leave the original archive intact instead of rendering an unmirrored approximation or rewriting unsupported content. Consequently, a mirrored project cannot be edited in an older Koxora version. The feature declaration is conservatively retained through subsequent edits and undo; undoing a reflection is not a downgrade/export-conversion operation. New readers validate the boolean fields and their declaration, preserve them through local saves and native archives, and use them in rendering and connection geometry.

See the [project format](../architecture/project-format.md) for the archive, unknown-data and validation boundaries. No new dependency, account, network request or native permission is needed.

## Interface follow-up

The Studio footer is removed. Language and appearance remain in Settings → General, each with a selectable System default option. That explicit choice follows the registered operating-system/browser language preferences or the system light/dark preference. Unsupported system languages fall back to English. Existing explicit preferences remain authoritative; a fresh profile still starts in English/light. These preferences do not change document language, text or geometry.

The project library uses an accessible rename icon. Scale-aware layout and small-window reflow keep library names and actions reachable; scrolling remains available where all content cannot fit. Additional design presets and interface customization are [planned separately](../planning/studio-design-customization.md).

## Verification and acceptance

Actual commands, results and platform limitations belong in the PR; this document does not assert a completed validation run. Relevant coverage is in `packages/editor-core/src/transforms.test.ts`, the existing geometry/history/format suites, preference tests and `tests/browser/transforms.spec.ts`.

Before acceptance:

1. Rotate and mirror an asymmetric shape, non-ASCII rich text, an arrow and freehand content, separately and in a mixed selection. Compare numeric values, quarter turns, direct handles and Shift snapping.
2. Check semantic cardinal/automatic anchors and retained manual waypoints. Resize transformed shapes and both endpoints of a mirrored arrow; confirm arrow direction, picking and outlines agree.
3. Undo/redo each deliberate operation once; cancel a pointer gesture and discard a properties draft. Try invalid angles and a batch containing locked, hidden or future content; verify no partial changes.
4. Save/reopen locally and offline, export/import `.koxora`, and repeat through native saves. Verify IDs, links, formatting, unrelated extensions and document content. Confirm an older reader refuses a required reflection feature without modifying the source archive.
5. Compare EN/DE, light/dark/System default, every interface scale, small windows and expanded/restored workbenches. Reach project actions, rename, settings and transform controls by keyboard.

Shared browser checks do not substitute for native visual acceptance on Linux, Windows and macOS or physical pointer, touch, pen and display-scaling checks.
