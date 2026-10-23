# Interactive canvas (Phase 2.2)

This document records the Phase 2.2 baseline. [Phase 2.3](shapes-text-connections.md) extends it with basic shapes, text/style editing, connections and updated interaction rules; the navigation and persistence contracts below remain in effect.

Phase 2.2 adds pan/zoom, portable per-page view settings and a read-only content preview to the approved Phase 2.1 workspace. It does not add element creation, selection, dragging, resizing, deletion or undo. See [ADR 0014](../adr/0014-interactive-canvas.md), [project format](../architecture/project-format.md), and [storage](project-storage.md).

## Module boundaries

- `packages/editor-core`: CSS/world coordinate transforms, configurable zoom bounds, pointer anchoring, pan/pinch, fit/bounds, world snapping and adaptive grid spacing; immutable project view adapters; pure read-only scene adapter/culling.
- `packages/studio/src/canvas.tsx`: platform input, pointer capture, animation-frame batching, focus and resize lifecycle, actual navigation controls and localized help. Gesture state is transient; commits use existing local autosave. Camera commits do not rebuild the scene or rerender the Studio tree on every pointer event.
- `packages/studio/src/svg-renderer.ts`: replaceable bounded SVG geometry preview, stable paint order and safe text-only output. It never writes project data.
- `packages/studio/src/projects.tsx`: snapshots pending navigation before save/export/transition; load generations isolate recovery/import/open sessions. The Phase 2.1 repository and native adapters are reused unchanged.

## Controls and portable behavior

| Input                                                    | Action                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Left/middle drag; single touch or pen drag               | Pan                                                                                                   |
| Wheel/trackpad scroll                                    | Pan; Shift converts vertical scrolling to horizontal                                                  |
| Ctrl/Command + wheel; two-touch pinch                    | Zoom around pointer/gesture midpoint                                                                  |
| Focused canvas: arrows; Shift + arrows                   | Pan 40 or 160 CSS pixels                                                                              |
| Focused canvas: +, −, 0, Home                            | Zoom in/out, reset zoom to 100%, fit content (origin for empty pages)                                 |
| Tab / Shift+Tab                                          | Enter/leave navigation and controls; expanded view contains focus                                     |
| Expand canvas / Restore workspace; Escape while expanded | Fill/restore application window (not a native OS fullscreen command)                                  |
| Grid / Snap / Spacing                                    | Persist independent grid visibility, future element snapping preference and 1–1024 world-unit spacing |

The center stays stable on window resize and OS fullscreen changes. Zoom is 2%–1600%. Snap is infrastructure for future element editing: it does not snap camera panning. A helper explains this distinction. Empty-state text is stationary interface guidance, not a world object. The grid and imported geometry show actual world navigation.

Page selection, center, zoom and grid settings travel in `.koxora` files. A reopened project restores its selected document/page. Merely opening, resizing or exporting an imported project does not rewrite its data. Future view namespaces remain intact; page settings from newer versions permit temporary navigation only. Invalid view settings fall back safely. The existing settings selector continues to store language/theme on the device.

## Performance

Run `pnpm exec playwright test --config playwright.performance.config.ts`. Set `KOXORA_CAPTURE=1` to also refresh the screenshots. This uses production build/preview, generated 100/1,000/10,000-node scenes and 100 animation frames of repeated navigation per view. It records detail (100% zoom) and fit views, frame gap median/p95 after warmup, synchronous input-dispatch p95, rendered node count, import-to-ready time, browser, DPR and machine information in `node_modules/.cache/koxora/canvas-performance.json`.

The input-dispatch duration excludes deferred rendering; animation-frame gaps include browser scheduling and rendering. Import-to-ready includes generating/serializing and uploading the fixture as well as opening it. Measurements are headless observations, not a GPU benchmark, an FPS guarantee or an editing performance claim. Linear culling processes all scene bounds; DOM output caps at 1,500 nodes and 1,500 connections per frame with a visible warning. Spatial indexing and faithful large-graph editing remain future work.

Measured on 2026-10-22 in the Linux x64 cloud container (AMD EPYC 9V74, 3 exposed logical CPUs), system Chromium 154.0.8037.57, DPR 1, 1440×1000 CSS pixels; Playwright's Desktop Chrome profile supplies a different user-agent version. Raw evidence is in [canvas-performance.json](evidence/phase-2.2/canvas-performance.json).

| Nodes  | View   | Rendered nodes | Frame gap median / p95 (ms) | Input dispatch p95 (ms) | Import-to-ready (ms) |
| ------ | ------ | -------------- | --------------------------- | ----------------------- | -------------------- |
| 100    | Detail | 80             | 16.7 / 16.7                 | 0.2                     | 325                  |
| 100    | Fit    | 100            | 16.7 / 16.7                 | 0.2                     | 325                  |
| 1,000  | Detail | 80             | 16.7 / 16.7                 | 0.2                     | 252                  |
| 1,000  | Fit    | 1,000          | 16.7 / 33.3                 | 0.2                     | 252                  |
| 10,000 | Detail | 80             | 16.7 / 16.7                 | 0.2                     | 1,158                |
| 10,000 | Fit    | 1,500 (capped) | 16.7 / 33.4                 | 0.2                     | 1,158                |

The dense 10,000-node fit view misses some 60 Hz frame intervals even with capped output. This supports keeping the honest preview limit and evaluating spatial indexing/another renderer before unrestricted dense editing. The results are one local reference run, not native platform measurements.

Actual implementation screenshots: [dark](../design/screenshots/phase-2.2/canvas-dark.png), [light](../design/screenshots/phase-2.2/canvas-light.png), [390px German](../design/screenshots/phase-2.2/canvas-small-de.png). They show generated read-only reference content, not element creation tools.

## Automated verification

Core tests cover transform inverses across zoom/large coordinates, pointer anchoring at bounds, repeated pan, resize semantics, pinch, fit, wheel normalization, snap independence and grid coarsening. Project tests round-trip active page/view settings and unknown data/assets, reject overwriting newer settings, preserve untouched/out-of-range views and validate safe hidden-layer previews.

Browser tests cover pointer-centered zoom, wheel/drag/keyboard navigation, page switch/export during an uncommitted gesture, view/grid offline restoration and portable exports/imports, same-ID recovery, resizing/expanded focus, help/localization and DPR 2 synthetic touch/pen routing. Existing Phase 2.1 storage/conflict/recovery/export/security tests remain in the matrix. The default workflow runs Chromium, Firefox and WebKit plus mobile Chromium. Native CI builds Linux AppImage/DEB, Windows NSIS, macOS Intel/ARM DMG and runs Rust fmt/clippy/tests and supply-chain checks.

## Manual acceptance

1. Start offline-capable browser or the new desktop artifact. Create and name a project. Verify the actual dotted canvas, compact empty state and only working navigation controls.
2. Drag and scroll in every direction, including negative coordinates. Ctrl/Command + scroll at each corner; the world point under the pointer should stay put. Try zoom limits, reset and fit. Repeat with real trackpad pinch, touchscreen and pen where available.
3. Toggle the grid, change spacing and enable Snap. At low zoom the visible grid coarsens; navigation remains continuous. Read navigation help for future snapping behavior.
4. Use keyboard only: focus canvas, arrows/Shift+arrows, +/−, 0, Home, Tab. Expand canvas, cycle focus, Escape, and confirm focus returns visibly without reaching obscured fields. Check light/dark contrast and a screen reader.
5. Save; close/restart; reopen offline. Verify view and settings. Import a multi-page fixture, navigate pages differently, reopen and confirm active-page and per-page restoration.
6. Export during a wheel gesture, import the file as a copy and compare camera/settings. On desktop, confirm native Save As cancellation, filename and overwrite confirmation still work. Test storage denial and a concurrent second tab; unsaved work must remain visible/exportable.
7. Save a different view, recover the previous save and confirm that the canvas and grid change to the recovered generation, then remain correct after restart.
8. Import advanced content/assets. The read-only geometry disclosure must be visible; export and compare original domain/binary content. Test a dense scene: a preview limit notice appears, and zooming reveals detail without deleting elements.
9. Resize from 360px to a large desktop, expand/restore and use OS fullscreen. On CachyOS/KDE Plasma/Wayland test fractional display scaling and moving the window between monitors with different scale factors. Check pointer anchoring and crispness. These physical environment checks are not simulated by DPR tests.

## Known limitations

Read-only geometry is not a complete diagram renderer; styles, assets, rich text and specialized shapes are not faithfully drawn. No editing tools, inertia, auto-layout, snap-to-object guides, minimap or undo are claimed. Expanded view fills the app rather than changing the operating system's fullscreen state. Extremely large saved cameras use bounded presentation until navigation; malformed/newer view namespaces are preserved. Abrupt process termination during an active uncommitted gesture may retain the last committed view; explicit save/export and normal transitions snapshot it. Project content retains Phase 2.1 storage integrity guarantees.

Unsigned CI artifacts require the platform's normal trust handling. CI verifies builds/tests, not hands-on Windows/macOS/Wayland UX. Physical touch, trackpad, pen, screen reader and mixed-DPI desktop acceptance remain Product Owner/platform checks.
