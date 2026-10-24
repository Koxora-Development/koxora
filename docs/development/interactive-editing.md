# Interactive editing (Phase 2.4)

Implements [Issue #13](https://github.com/Koxora-Development/koxora/issues/13) on accepted Phase 2.3 main. [ADR 0016](../adr/0016-interactive-editing-history.md) defines the portable fields, transient state, history limits and deletion rules. The shared web/Tauri implementation requires no account and works offline after provisioning.

## Everyday workflow

- The visual palette shows recognizable geometry for rectangles, rounded rectangles, ellipses, diamonds, triangles, hexagons, parallelograms, text, containers, lines and arrows. Line and Arrow handle both free drawings and semantic connections; Connect and Edit are no longer separate tools. Arrow keys/Home/End move palette focus; Enter/Space activates a tool. Tool names and active states are localized.
- Choose a shape and click to place its default size or drag to draw its size. Enter on the canvas places it at the viewport center. Insertion switches to Select; enable **Repeat insertion** to retain the tool. Escape cancels a tool/draft.
- Click to select, Shift-click to add/remove, drag an empty area for marquee selection, Ctrl/Cmd+A for all editable page elements. Double-click or **Element properties**/Enter edits the selected element. **Align & more → Diagram element** exposes a keyboard/touch alternative for all elements, including unsupported entries with explicit read-only feedback. Text formatting appears first; geometry and shape/route controls expand separately.
- Drag a selected shape to move the selection. Corner handles resize a single shape; Shift preserves proportions. The properties dialog also exposes X/Y/width/height. Arrows/lines expose endpoint handles, labels, stroke and start/end arrowheads.
- **Snap** uses the portable world grid. Alt temporarily bypasses snapping for insertion/move/resize/nudge; a canvas accent border indicates active snapping. Arrow keys nudge by one unit or one grid step; Shift multiplies by ten. With no editable selection, arrow keys retain viewport navigation.
- **Navigate**, middle-button drag or Space-drag pans. Wheel and pinch retain existing navigation. Editing gestures never serialize project ZIPs per frame.
- **Line/Arrow**: choose a visible border port on each of two shapes, or click shape bodies for automatic anchoring. Line creates no arrowhead; Arrow creates one. Dragging from a shape/port to another is also supported. The selected source port is highlighted and a live guide follows the cursor. Choose **Repeat insertion** for successive connections. Moving/resizing endpoints retains their chosen anchors. Click the completed path (including its wider hit area) to select and edit/delete it.
- Duplicate uses Ctrl/Cmd+D or the selection/context action; Delete/Backspace removes the selection. **Align & more** exposes alignment, distribution and internal copy/paste. Ctrl/Cmd+C/V operate only on the canvas clipboard, without overwriting system text. Copy supported nodes together to retain connections between them.
- Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. Toolbar actions work too. Text fields retain ordinary text shortcuts. History is session-only, isolated by page, and bounded to 100 transactions/estimated 16 MiB across page branches. An oversized transaction clears that page's history. Opening/importing/recovering resets it.
- Double-click a dashboard or workspace title, or use **Rename**. Enter or leaving the field commits, Escape cancels; invalid names remain editable with feedback. The inspector follows the same commit rule. Renaming changes the internal title without changing project or document IDs.

Deletion is conservative: editable incident connections are removed together; locked/unsupported connections or specialized references block deletion. Unknown data and opaque binary resources are preserved. Selection/tool/clipboard/history state is never put in `.koxora`.

## Ports, typography and shortcut reference

These refinements implement the [acceptance feedback](https://github.com/Koxora-Development/koxora/pull/23#issuecomment-6383678608) and [visible-port supplement](https://github.com/Koxora-Development/koxora/pull/23#issuecomment-6383730378). Phase 2.4 is **not yet accepted**; the Product Owner must retest the new head.

Line/Arrow exposes top/right/bottom/left ports on visible compatible shapes, including touch devices without hover. Symbols remain small; interactive areas remain 32 CSS pixels at any zoom. Overlapping hit areas choose the nearest port center, with topmost ordering for ties. Dense/tiny shapes can instead be addressed with **Connect by name**, including an explicit point selector, or by zooming in. Tab enters the port group; arrow keys/Home/End move its roving focus; Enter/Space chooses a source or target. Stable HTML buttons retain focus across camera redraws and provide localized shape/point labels. Supported rotation rotates cardinal ports with the shape. Existing routed-connection behavior is preserved; there is no obstacle routing or self-loop support.

Pending connections do not change the project. Escape, switching tools/layers or window blur cancels them; pointer cancellation drops the gesture. Clicking blank canvas while a source is pending clears that source without creating an element. Start a new gesture on blank canvas for a free line/arrow. Invalid/self/duplicate/protected endpoints report an error and never create a stray node. Ports and source highlights are transient; only the completed semantic connection stores endpoint IDs and anchor tokens.

The properties dialog starts with **Text and formatting**: local Sans serif/Serif/Monospace families, size 8–96, bold, italic, underline, color, alignment and multiline text. This styles the **whole label** on shapes, text, free drawings and semantic connections. Mixed per-character formatting remains future scope. Fonts resolve to local system fallbacks; their metrics may differ across operating systems. No external font request, CSS input or HTML interpretation is introduced. Apply (or Ctrl/Cmd+Enter) makes one reversible command; Cancel/Escape discards the draft. Inherited styles and unknown compatible properties retain their existing preservation rules.

The header's **Keyboard shortcuts** button, F1 or `?` opens a searchable EN/DE reference. It groups navigation, selection/focus, insertion/connections, manipulation, text/properties, history/clipboard and project/help. Ctrl is shown as Cmd on Apple platforms. Text fields retain native editing shortcuts. Project actions without dedicated key bindings are described as focusable controls. Grid/snap/spacing share the navigation footer; mode controls appear only for insertion tools. Select/Escape replaces the redundant Cancel tool button.

## Verification

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm test:e2e
pnpm audit --audit-level high
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` when using system Chromium. CI runs Chromium, Firefox, WebKit and mobile Chromium, plus native builds and Rust checks. Actual final results and artifact links are recorded in the PR; configured jobs are not evidence of execution.

Core tests cover selection eligibility, group snapping, rotated/aspect resizing, fixed line endpoints, alignment/distribution, retained scene identities, every reversible operation, redo branching, no-op/preview history boundaries, history retention and project/page isolation, locked/reference-protected deletion, identity collisions, waypoint preservation and rich ZIP/rename preservation. Browser tests exercise actual direct placement, dragging under zoom, grid override, resize, group move/duplicate/delete, copy/paste, free arrows, route attachment, cancellation/capture/blur, repeated keys, inline renaming, keyboard tools, narrow layouts and German. Additional core/browser cases assert explicit cardinal and automatic anchors, rotation and route preservation, pointer/keyboard/pen/touch ports, move/resize, portable/offline reopening, safe inherited typography on every label type, font injection rejection, localized narrow dialogs and searchable shortcut help. Existing storage/conflict/quota/recovery/native Save As tests remain enabled and use explicit rename commits.

Independent read-only review examined the real diff, reproduced a burst-command race and verified its fix, ran 60 core interaction/shape tests and checked a separate 30-command undo/redo sequence against every document checkpoint. Review also prompted corrections to preview work, capture cancellation, connection hit regions, name drafts and minimum-size endpoint preservation. The acceptance-rework review identified and verified fixes for pending-source consistency, aligned-label culling bounds and protected-source draft ports. Its final independent rerun passed 71 core cases with no blocking findings. The PR records the actual browser and CI results for the final revision.

## Screenshots and performance

Capture actual UI using:

```sh
KOXORA_CAPTURE=1 pnpm exec playwright test tests/browser/acceptance.spec.ts --project chromium
KOXORA_CAPTURE=1 pnpm exec playwright test tests/browser/editing.spec.ts --project chromium --grep 'palette keyboard'
```

Screenshots are stored in `docs/design/screenshots/phase-2.4/`. [Performance evidence](evidence/phase-2.4/README.md) records its exact reproduction command and limitations: core preview p95 was 0.52 / 1.68 / 4.04 ms for 100 / 1,000 / 3,000 shapes with half as many connections. The largest browser sample had a 50 ms frame-gap p95 in detail view. Measurements are observations on a shared cloud host, not native FPS guarantees. Final document validation remains proportional to project size, and culling still scans the scene; dense output remains capped without deleting model data.

## Product Owner acceptance

Use the exact-revision artifact links in the PR. Extract the Linux archive and run the executable AppImage on CachyOS as a normal user. Packages are unsigned development builds. Keep [Issue #14](https://github.com/Koxora-Development/koxora/issues/14) open; configurable storage and safe migration are a dedicated future desktop/settings milestone.

- [ ] Create a project; rename by double-click and by keyboard Rename in workspace and dashboard. Test Enter, Escape, blur and invalid names.
- [ ] Insert a rectangle directly from the palette; move and resize it with visible handles. Repeat under pan, zoom and fractional display scaling.
- [ ] Toggle snap, test Alt bypass and Shift aspect preservation; use numeric size controls and keyboard nudges.
- [ ] Activate Line: verify visible ports, click right of A then left of B, and confirm no arrowhead. Use Arrow with top/bottom ports on another pair. Move/resize each endpoint and verify the chosen attachment stays fixed relative to the shape. Repeat with rotated imported shapes and straight/orthogonal/curved paths.
- [ ] Click the bodies of two shapes for automatic anchoring; also drag from source to target. Cancel a selected source with Escape and a tool change. Try self/duplicate/locked/future targets; verify error feedback and no stray objects.
- [ ] Tab into ports, use arrows/Home/End and Enter/Space; repeat with Connect by name and its point selector. Zoom and test overlapping/tiny shapes with the name picker. Test real touch and stylus hardware.
- [ ] Format a shape, text element, free arrow and connection: size, all three font families, bold/italic/underline, color, alignment and multiline Unicode. Undo/redo once per Apply, save/reopen offline and export/import. Check EN/DE and a narrow window.
- [ ] Confirm Connect, Edit and Cancel tool are absent; Repeat insertion appears only with insertion tools. Open Keyboard shortcuts by button and F1/?, search for connections/undo, and close with Escape. Check focus restoration and Ctrl/Cmd wording.
- [ ] Draw a standalone line and arrow, adjust endpoints and enable two arrowheads. Verify no endpoint shapes are required.
- [ ] Shift/marquee-select several shapes, move together, align/distribute, duplicate, copy/paste, delete, undo and redo. Check internal cloned connections.
- [ ] Cancel each gesture with Escape, blur and resize; test Space/middle-button navigation with tools armed. Test touch, pen and trackpad on actual hardware.
- [ ] Use keyboard-only palette, element picker, properties, rename and history. Verify focus, English/German, light/dark, narrow windows and expanded canvas.
- [ ] Save, close/restart and reopen; edited geometry and project title survive. Repeat offline.
- [ ] Use native Save As, cancel and decline overwrite once, then export/import as a copy and continue editing. Verify rich fixtures retain unknown extensions/assets.
- [ ] Exercise previous-save recovery, failed writes and two-instance conflicts. Recovery resets history; failed saves leave session work exportable.
- [ ] Test KDE Plasma/Wayland scaling and the Windows NSIS/macOS Intel/Apple Silicon DMGs on their real platforms.

Physical hardware, native GUI, screen-reader usability and Product Owner acceptance remain manual. Do not merge automatically.
