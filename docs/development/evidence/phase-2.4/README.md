# Phase 2.4 editing measurements

Recorded on 2026-10-23 on a shared Linux x64 cloud host (AMD EPYC 9V74), system Chromium 154.0.8037.57, 1440 × 1100 CSS-pixel viewport and device pixel ratio 1. [Raw results](editing-performance.json) include full precision and environment metadata.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm exec playwright test --config playwright.performance.config.ts tests/performance/editing.spec.ts
```

The fixture uses labeled mixed shapes, inherited styles, arbitrary rotations, optional metadata and one semantic connector per two shapes. Each core sample moves one shape and updates its attached route, retaining other scene identities. We measure 110 previews and discard the first ten, then one fully validated movement transaction and undo. The browser imports the real portable project, dispatches 65 pointer frames through the actual canvas/SVG adapter, releases once and saves. The test confirms that an unchanged rendered SVG node retains its identity. Synthetic pointer capture is stubbed; ordinary browser tests cover real capture and cancellation separately.

| Shapes / connections | Core preview median / p95 | Validated command / undo | Browser frame gap median / p95 | Pointer release dispatch |
| -------------------- | ------------------------- | ------------------------ | ------------------------------ | ------------------------ |
| 100 / 50             | 0.25 / 0.52 ms            | 4.15 / 1.72 ms           | 16.7 / 16.7 ms                 | 4.3 ms                   |
| 1,000 / 500          | 1.17 / 1.68 ms            | 7.26 / 27.10 ms          | 16.7 / 16.7 ms                 | 6.5 ms                   |
| 3,000 / 1,500        | 1.65 / 4.04 ms            | 13.42 / 15.44 ms         | 16.7 / 50.0 ms                 | 18.0 ms                  |

These are detail-view measurements with six visible shapes after culling, not a dense all-visible scene or native FPS guarantee. Pointer-move dispatch p95 was 0.2–0.3 ms because preview work is deferred to animation frames; dispatch time alone is not total rendering cost. Frame gaps include browser scheduling and other shared-host load. The 3,000-shape case shows occasional missed frames; validated transactions and undo remain proportional to project size. Single command/undo observations are noisy, as illustrated by the 1,000-shape undo outlier. ZIP import/export, autosave and asset serialization are outside the core timings.

A richer 10,000-shape/5,000-connection fixture was attempted but its canonical document exceeded the existing 8 MiB per-JSON-entry serialization limit. It produced no complete browser measurement and is excluded from the results. No resource/security limit was relaxed. The existing renderer still bounds dense output to 1,500 visible nodes and 1,500 visible connections without deleting model content; linear scene/culling scans remain. Earlier renderer-only evidence in the canvas milestone should not be read as proof that every rich project of that size fits the portable file budget.
