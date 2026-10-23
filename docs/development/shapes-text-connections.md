# Shapes, text and connections (Phase 2.3)

Phase 2.3 turns the shared browser/Tauri canvas into a basic diagram editor. See [ADR 0015](../adr/0015-shapes-text-connections.md) for domain fields, compatibility, geometry and transaction boundaries. The implementation starts from accepted Phase 2.2 main commit `1485dccb95e08f679987be80902cbebabf71e720`.

## Creating a diagram

1. Open or create a project. Choose a shape type, activate **Insert shape**, then click the canvas. Repeat for more shapes. The ellipse preset creates a circle; imported ellipses keep their original dimensions.
2. Press Escape or choose **Navigate**. Click a shape to edit its label and style, or choose **Edit**, select an element and activate the adjacent Edit button. Apply commits the entire dialog as one edit; Cancel discards the draft.
3. Choose **Text** and click, or focus the canvas and press Enter. Enter multiline Unicode text in the dialog.
4. Choose **Connect**, select Straight, Elbow or Curved, and set Arrowhead. Click the source then the target. The source receives a cyan outline. Keyboard users select each element in the list and activate Use as source/target. Escape abandons the pending connection.
5. Edit a connection through its visible line or the element list to add a label, change its outline/text style, routing or arrowhead. An explicit routing change replaces retained waypoint routing.
6. Save locally, reopen, export `.koxora`, or use native **Save as…**. Offline edits use the existing local repository and remain exportable on storage failure.

Multiple editable layers expose an insertion-layer selector. Hidden/locked ancestors block editing; hidden endpoints hide their edges. Tools affect the active page only. Grid snapping aligns the new shape's top-left corner in world units. The click remains its unsnapped center before snapping. Pan, pointer-centered zoom, fit, grid settings and per-page views retain Phase 2.2 semantics.

## Module ownership

- `packages/editor-core/src/shapes.ts`: trusted shape registry, safe appearance resolution, layer states, rotation, bounds, contour and anchor geometry.
- `packages/editor-core/src/connections.ts`: bounded optional connection interpretation, pure path and arrow orientation.
- `packages/editor-core/src/editing.ts`: immutable, validated insert/connect/update API, no storage or React dependency.
- `packages/editor-core/src/scene.ts`: derived safe rendering scene, bounds, culling and endpoint picking.
- `packages/studio/src/svg-renderer.ts`: vector/text output only, stable layer order, no persistence or imported markup execution.
- `packages/studio/src/canvas.tsx` and `diagram-tools.tsx`: tools, pointer ownership, keyboard alternatives, source indication and localized editing dialog.
- `packages/studio/src/projects.tsx`: project transactions and reuse of snapshots, autosave, conflict/recovery and native export.

## Verification

The PR records final local and CI results for its exact revision. Reproduce using:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm test:e2e
pnpm audit --audit-level high
```

`shapes.test.ts` exercises all nine registry entries, boundary accuracy, rotated anchors, path geometry, arrow direction, five zoom levels, snapping, immutable transactions, styles/layers/pages, malicious optional data, validation failures, UUID collisions, native ZIP round trips and preservation of the rich compatibility fixture's assets/domain models. Regression tests cover oversized labels, unsupported styles, cross-document style references, inherited style resolution and explicit waypoint replacement. Existing storage/migration/recovery tests remain enabled.

`diagram.spec.ts` exercises actual UI creation, Unicode and multiline text, styling, connection picking, arrowheads, export/import, offline reopen and continued editing, keyboard insertion, Escape during a pointer interaction, English/German, window resizing and malicious imports. Existing canvas, native IPC, offline, conflict, quota and responsive tests remain enabled. The standard CI matrix runs Chromium, Firefox, WebKit and mobile Chromium.

Capture actual implementation screenshots with `KOXORA_CAPTURE=1 pnpm exec playwright test tests/browser/diagram.spec.ts --project chromium`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` may select installed system Chromium. Captures show a diagram created using the real controls, not a seeded static example:

- [Dark diagram](../design/screenshots/phase-2.3/diagram-dark.png)
- [Light diagram](../design/screenshots/phase-2.3/diagram-light.png)
- [German at 390 px](../design/screenshots/phase-2.3/diagram-small-de.png)

The cloud environment blocks downloading managed Playwright browsers; local runs use installed Chromium. Firefox/WebKit verification therefore comes from CI. Native packages are built by the unchanged desktop workflow: Linux x86_64 AppImage/DEB, Windows x86_64 NSIS, macOS Intel DMG and Apple Silicon DMG. Successful build artifacts do not substitute for physical native acceptance.

## Performance observations

An independent review measured core-only `buildScene` with N nodes and N available styles, all nodes referencing one shared style. After one warm-up, medians of five runs were 2.48 ms for 1,000 nodes/styles, 3.45 ms for 3,000 and 15.38 ms for 10,000 in the shared Linux cloud host. Scheduling outliers reached 52.73 ms. These are observations of pure scene construction, excluding React, SVG, validation, persistence and browser rendering; they are not an FPS or native performance guarantee. A regression test bounds style-property reads to one per independent style per scene. Existing browser performance tooling remains available, and the 1,500-element per-kind visible cap remains explicit.

## Manual Product Owner acceptance

Use the PR's exact-revision Linux artifact on CachyOS. Extract the archive, make the AppImage executable, and launch as a normal user. Packages are unsigned development builds.

- [ ] Create a project and insert rectangles, circles and diamonds; add several shapes with the same active tool.
- [ ] Add readable Unicode/multiline shape labels and standalone text. Apply colors, font size/alignment, outline width and opacity; cancel a draft and verify it did not save.
- [ ] Create straight, elbow and curved edges. Create an arrow and an undirected connection; add/edit an edge label. Verify source highlighting and correct contour attachment.
- [ ] Verify duplicate/self/missing endpoint feedback and Escape after selecting a source. Cancel between pointerdown and pointerup and confirm no action happens.
- [ ] Use keyboard-only insertion at the view center and the editing/endpoint list. Verify visible focus, dialog trapping, error feedback and expanded-view cancellation.
- [ ] Pan/zoom before insertion; toggle grid/snapping and change spacing. Verify geometry under arbitrary pan/zoom and no duplicate placements. Repeat with touch/pen/trackpad where available.
- [ ] Save, close/restart offline, reopen, edit again and verify shapes, labels, styles, edge references and camera settings.
- [ ] Native Save As: choose destination/name, cancel once, decline an overwrite once, then export. Import as a copy and continue editing. Verify binary assets and unrelated specialized content remain in richer files.
- [ ] Verify previous-save recovery and two-instance conflict feedback. After a failed save, unsaved work must remain visible and exportable.
- [ ] Repeat the basic workflow in German and both themes. Resize from a narrow window to fullscreen; test KDE Plasma/Wayland fractional scaling and mixed-DPI displays.
- [ ] Review the corresponding Windows, macOS Intel and Apple Silicon artifacts on their actual platforms.

## Known limitations

A basic container has no group membership/transform behavior yet. Existing elements cannot yet be dragged, resized or deleted; comprehensive undo/redo, multiselection, obstacle avoidance, self-loop creation, automatic layout and specialized diagram semantics remain Phase 2.4/later work. Imported shapes preserve arbitrary geometry, but shape size/rotation controls are not introduced here. New shapes have sensible fixed dimensions. Text is plain, bounded, system-font text with approximate wrapping, not advanced typography. Unknown/future content is preserved with a simplified preview and may be read-only.

Physical Wayland scaling, native OS dialogs, screen-reader quality, touch/pen hardware and Product Owner approval remain manual acceptance. CI and browser IPC tests are not claims that those physical checks occurred. Do not merge without explicit Product Owner approval.
