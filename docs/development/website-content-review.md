# Keeping the website true when the studio changes

**Status: proposed with Website W2.3, 2026-10-25.** This is the procedure [Issue #29](https://github.com/Koxora-Development/koxora/issues/29) asks for, from the website side: what has to be rechecked when a studio phase merges, so the public site never describes a product that no longer exists or one that does not yet.

The website makes claims about a product that is being built in parallel. Every one of those claims has a source in this repository, and this page says which, so a check is a short list rather than a reading of the whole site.

## 1. The rule

**A capability appears on the website only once it is merged.** Not when it is designed, not when a pull request is open, not when it is nearly done. Until then it is `planned`, and the status labels on the site say what that means.

Three tests already refuse the most dangerous mistakes, so the procedure below is about the things a test cannot judge:

| Test                                          | What it refuses                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `apps/website/src/content/comparison.test.ts` | Collaboration, assistance, integrations and a desktop build being anything but `planned` in the Koxora column |
| `apps/website/src/content/docs.test.ts`       | A documentation page offering a download, or dropping the browser-storage warning                             |
| `apps/website/src/content/launch.test.ts`     | Launch-sensitive copy surviving into a published build                                                        |

## 2. What to recheck, and where it lives

When a studio phase merges into `main`, walk this list. It is short on purpose.

| Content                       | Where                                                                                       | What to ask                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| The capability list           | `apps/website/src/content/data.ts`, features page                                           | Does anything move from planned to available? Are the named limits still the real limits?                       |
| The documentation sections    | `apps/website/src/content/docs.ts` and the `docsStart`, `docsEditing`, `docsProjects` pages | Does a described gesture, shortcut or dialog still work the way it is described?                                |
| The questions                 | `faqEntries` in the same file                                                               | Does an answer that says "not yet" now say something else?                                                      |
| The comparison, Koxora column | `apps/website/src/content/comparison.ts`                                                    | Does a `planned` row become `supported`? The review date moves with it                                          |
| The roadmap page              | `apps/website/src/content/data.ts`                                                          | Has a phase finished, or changed order?                                                                         |
| The screenshots               | `apps/website/public/images/studio/`                                                        | Does the interface still look like the picture, and are the accessible names in the capture tool still correct? |
| The studio link               | `KOXORA_SITE_EDITOR_URL`                                                                    | Has the studio been published, so the call to action can point at it?                                           |

## 2a. Studio Phase 2.5 review completed on 2026-10-28

The Product Owner manually accepted Studio 2.5 and explicitly authorized [PR #39](https://github.com/Koxora-Development/koxora/pull/39) to merge. The accepted implementation is merge commit `0d610773fc895e99aa7c8371b34e98327ba8bcf2`; [Issue #19](https://github.com/Koxora-Development/koxora/issues/19) is closed. This W2.3 update describes that merged development version. It does not publish Studio, downloads or the website.

The final navigation differs from the original tab proposal: the Product Owner chose **one sidebar project → document → page navigator**, replacing the bottom tabs and document selector. Website descriptions and FAQ explain the change instead of advertising an absent tab strip.

| Reviewed area                    | Website update                                                                                                                                   | Implementation evidence                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Documents/pages                  | `pages` becomes available in the development version; navigation, actions, per-page views, deletion guards and same-project moves are documented | `packages/studio/src/project-tree.tsx`, `packages/editor-core/src/workbook.ts`                                                |
| Rich text                        | `richText` becomes available; word/range formatting, toolbar, clipboard, draft history and explicit Apply/Cancel described                       | `packages/studio/src/rich-text-editor.tsx`, `packages/studio/src/inline-text.tsx`                                             |
| Fonts                            | 20 searchable preferences with installed fallbacks, no remote font queries; no claim of 20 bundled or identical fonts on every OS                | `packages/editor-core/src/shapes.ts`                                                                                          |
| Batch properties and arrangement | Mixed values, atomic changes, alignment versus non-overlap arrangement and within-layer stacking                                                 | `packages/studio/src/format-selection.tsx`, `packages/editor-core/src/interaction.ts`, `packages/editor-core/src/stacking.ts` |
| Freehand                         | Mouse/touch/pen/keyboard strokes, ordinary editing and portable storage; no eraser, pressure or tilt brushes                                     | `packages/editor-core/src/freehand.ts`, `packages/studio/src/canvas.tsx`                                                      |
| Projects/history                 | Save before switching, whole-project copies, reversible local Trash; session history across pages, distinct draft history and Restore action     | `packages/studio/src/projects.tsx`, `packages/editor-core/src/studio-history.ts`                                              |
| FAQ, roadmap and milestones      | Implemented development capabilities and accepted 2.5 milestone; no public release or download claim                                             | Accepted PR #39 and the Product Owner's merge instruction                                                                     |
| Comparison                       | Only Koxora's implementation claim and pinned repository source were updated                                                                     | PR #39 merge; external product claims and their 2026-10-25 source dates are unchanged and were not reverified                 |

The capture script regenerates all seven existing website images and adds localized navigator, canvas rich-text and freehand captures. New screenshots are reached through the real UI, use a generated sample project with two documents and three pages, and record measured dimensions plus WebP/PNG variants. No pixels or controls are invented. The content and FAQ identify missing interactive links, cross-project page transfer, full layer management, image export and optional services.

`available` continues to mean implemented and merged in the development version. Public release links, editor deployment configuration and contact activation remain unchanged. Website PR #37 remains stacked on #36; a merge from main brings in the accepted Studio only to make screenshots and tests reproducible against the documented implementation. It does not merge any W2 PR. Review the W2 stack separately and in order before any publication.

## 2b. Studio 2.6 to 2.7 review completed on 2026-11-15

The website had last been reviewed against Studio 2.5. Four studio merges had landed on `main` since then without a website review: the links milestone ([PR #51](https://github.com/Koxora-Development/koxora/pull/51)), the workbench, storage, opening and navigation block ([PR #58](https://github.com/Koxora-Development/koxora/pull/58), `04e508eb75b5ff326ac366ea153d31fce5ab4cb4`), rotation, mirroring and interface options ([PR #59](https://github.com/Koxora-Development/koxora/pull/59), `8c464ed782b7f3473e9cf7ba96eb75f41cfd3f15`) and Studio 2.7 templates, live editing and element libraries ([PR #61](https://github.com/Koxora-Development/koxora/pull/61), `7efb13538f4bd01934bdc254b271c4109180c874`). This update describes that merged development version at the Product Owner's request. It does not publish Studio, a download or the website, and it changes no studio code.

Two earlier statements had become wrong rather than merely incomplete, which is the case this procedure exists for. The website said interactive links were not implemented, and it explained that a sidebar navigator had replaced the planned bottom tabs. Links were merged in #51, and #58 brought sheet tabs back below the canvas beside the navigator.

| Reviewed area               | Website update                                                                                                                                                                                                 | Implementation evidence                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Templates                   | `templates` becomes available: eight built-in starters, search, categories, preview, a separate ordinary project per use. No mind-map mode, no automatic layout and no user-saved templates are claimed        | `packages/editor-core/src/templates.ts`, `packages/studio/src/template-browser.tsx`                                               |
| Element library             | `library` becomes available and `shapes` names the current 23 palette entries, the four categories, remembered selection, search and the element browser                                                       | `packages/editor-core/src/shapes.ts`, `packages/studio/src/shape-palette.tsx`, `packages/studio/src/shape-categories.tsx`         |
| Tables and containers       | `tables` becomes available: 1–20 rows, 1–12 columns, header row, per-cell rich text, merge and split, container title and body. Stated as text tables without formulas or data import                          | `packages/project/src/text-regions.ts`, `packages/editor-core/src/text-regions.ts`, `packages/studio/src/text-regions-editor.tsx` |
| Text editing and properties | Click-to-edit labels, live changes without Apply or Cancel, grouped undo, and the docked Format/Text/Links panel replace the description of a property dialog with a draft                                     | `packages/studio/src/inline-text.tsx`, `packages/studio/src/rich-text-editor.tsx`, `packages/editor-core/src/studio-history.ts`   |
| Connections                 | Attached or free ends, dragging an end to attach or detach, an arrowhead at either end and the three path styles                                                                                               | `packages/editor-core/src/connections.ts`, `packages/editor-core/src/editing.ts`                                                  |
| Links                       | `links` becomes available: web and mail addresses, pages, elements and other local projects; deliberate activation with Open link or Alt+Enter; missing-target guidance. The FAQ answer changes from no to yes | `packages/editor-core/src/links.ts`, `packages/studio/src/element-links.tsx`                                                      |
| Rotation and mirroring      | `transforms` becomes available: handle with 15° snapping, exact angle, quarter turns, horizontal and vertical mirroring                                                                                        | `packages/editor-core/src/transforms.ts`                                                                                          |
| Pages and projects          | Sheet tabs below the canvas beside the navigator; project library with title search; Trash with permanent deletion; opening by file choice or drop, idempotent for unchanged files                             | `packages/studio/src/workbook-tabs.tsx`, `packages/studio/src/start-page.tsx`, `packages/studio/src/project-tree.tsx`             |
| Interface                   | `interface` becomes available: scale from 100 to 200 percent and optional enhanced accessibility, described as accommodations and not as a certification; language and appearance can follow the system        | `packages/studio/src/office-settings.tsx`, `packages/studio/src/preferences.ts`                                                   |
| File format                 | The projects page says that a file using a newer capability declares it and that an older version declines to open it                                                                                          | `docs/architecture/project-format.md`, the required-feature markers named in the studio guides                                    |
| Desktop                     | Stays `in-development` on the features page and `planned` in the comparison: there is still nothing to install. The wording now names the storage folder and file opening and that platform acceptance is open | `docs/development/desktop-storage.md`, `docs/development/native-opening.md`                                                       |
| Roadmap and milestones      | Phase 2 stays in progress with its text updated; the release page lists 2.6, #58, #59 and 2.7 as merged milestones, each linked to its scope document                                                          | `docs/roadmap.md`                                                                                                                 |
| Comparison                  | Only Koxora's diagram-type and desktop answers, the per-product draw.io text and the pinned repository source were updated; the review date moves to 2026-11-15                                                | External product claims and their 2026-10-25 source dates are unchanged and were not reverified                                   |

Deliberately unchanged: image export, import from other tools, data import, collaboration, cloud, assistance, plugins, self-hosting and touch-first mobile stay `planned`; guided diagram types stay `planned`, because a template made of ordinary shapes is not a diagram engine. The privacy policy and the legal notice were not touched. Studio 2.7 is described as merged; no separate statement about a manual acceptance run is made for it, because the merge is what the repository shows.

The capture script was rewritten for the current workbench, because the previous one addressed controls that no longer exist: the appearance and language selectors moved from the footer into Settings, element properties became a docked panel instead of a dialog, and a click on a label now opens its editor. It now captures each language in a profile of its own with a sample project written in that language, loads the phone view at phone size instead of resizing a desktop session, and adds the template overview, the element browser, a table with its cell editor and a link. All 21 pictures were regenerated from the production build of `7efb135`.

## 3. Regenerating the screenshots

The pictures on the site are captures of the real studio, driven by `tests/assets/studio-screenshots.spec.ts`. They are not drawings and nothing is retouched.

```sh
pnpm capture:studio
python3 scripts/optimize_screenshots.py   # optional, needs Pillow
pnpm test:website                         # the pages still match their pictures
```

The capture tool uses the studio's own accessible names — "Fit content", "Element properties", "Keyboard shortcuts", "Import .koxora", and their German counterparts for the German pictures. They are written out in the capture tool for each language rather than read from the studio's message catalog. **A studio change that renames one of those breaks the capture**, which is the point: a silent rename would otherwise leave the website showing an interface nobody can find. The capture is type-checked by `pnpm check` but is not run by continuous integration, so a rename surfaces when the pictures are next regenerated.

The capture needs a Chromium that matches the pinned Playwright version. Where the browser is provided by the environment instead of `playwright install`, point the run at it with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, which both Playwright configurations already read.

## 4. When it happens

- **With every studio phase merge**, as part of accepting that phase. The website is one more thing the phase changed.
- **Before a website release**, as the last step: the comparison's review date, the content date and the screenshots are all dated, and a stale date is visible to every reader.
- **When the studio is published**, which is the one change that affects almost every page: the call to action, the download page, the release page and the Koxora column all describe a product nobody can reach today.

## 5. Who

Website content is Claude Code's area and the studio is Codex's, which is exactly why this list exists: the person accepting a studio phase should not have to know which website file mentions what. Opening a pull request against the website with the rechecked content is a small, separate change, and keeping it separate from the studio phase keeps both reviewable.

The Product Owner decides whether a capability is ready to be described as available. The website never makes that call on its own, and no test can.
