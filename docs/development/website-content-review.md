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

## 3. Regenerating the screenshots

The pictures on the site are captures of the real studio, driven by `tests/assets/studio-screenshots.spec.ts`. They are not drawings and nothing is retouched.

```sh
pnpm capture:studio
python3 scripts/optimize_screenshots.py   # optional, needs Pillow
pnpm test:website                         # the pages still match their pictures
```

The capture tool uses the studio's own accessible names — "Fit content", "Element properties", "Keyboard shortcuts", "Import .koxora". **A studio change that renames one of those breaks the capture**, which is the point: a silent rename would otherwise leave the website showing an interface nobody can find. The capture is type-checked by `pnpm check` but is not run by continuous integration, so a rename surfaces when the pictures are next regenerated.

## 4. When it happens

- **With every studio phase merge**, as part of accepting that phase. The website is one more thing the phase changed.
- **Before a website release**, as the last step: the comparison's review date, the content date and the screenshots are all dated, and a stale date is visible to every reader.
- **When the studio is published**, which is the one change that affects almost every page: the call to action, the download page, the release page and the Koxora column all describe a product nobody can reach today.

## 5. Who

Website content is Claude Code's area and the studio is Codex's, which is exactly why this list exists: the person accepting a studio phase should not have to know which website file mentions what. Opening a pull request against the website with the rechecked content is a small, separate change, and keeping it separate from the studio phase keeps both reviewable.

The Product Owner decides whether a capability is ready to be described as available. The website never makes that call on its own, and no test can.
