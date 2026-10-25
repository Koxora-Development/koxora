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

## 2a. Studio Phase 2.5, prepared in advance

**Nothing in this section has been changed yet, and nothing in it may be changed before Phase 2.5 is merged into `main` and the Product Owner has accepted it.** It is written now so that the change afterwards is mechanical rather than a search, and so the Product Owner can see exactly what the website will claim once it is true.

Phase 2.5 ([Issue #19](https://github.com/Koxora-Development/koxora/issues/19)) brings two things the website currently describes as unfinished: **workbook-style diagram tabs** and an **Office-style rich-text editor** with twelve or more font families and formatting inside a single label.

### What the site says today, and why that is still right

The two capabilities are already on the site as `in-development`, and both say _"Being implemented in the current studio milestone."_ That is accurate and must stay until the merge. The statuses are in `apps/website/src/content/data.ts`:

| Entry      | Status today     | After the merge            |
| ---------- | ---------------- | -------------------------- |
| `pages`    | `in-development` | `available`, once accepted |
| `richText` | `in-development` | `available`, once accepted |

Moving either one also means removing the "being implemented" sentence from its body text, and reconsidering `highlight: true`, which exists to draw attention to what is coming next.

### What becomes false, and has to be corrected in the same pass

These are claims that are true today and will be wrong the moment 2.5 merges. Each is a message key in both `en.ts` and `de.ts`:

| Key                       | What it claims now                                                                                                                         | Why 2.5 breaks it                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `feature.typography.body` | "Serif, sans serif and monospace families from your own system … applied to a label as a whole"                                            | 2.5 asks for twelve or more families, and formatting within a label |
| `features.limits.item4`   | "Rich text is applied to a whole label; per-character formatting is not implemented"                                                       | That limit is exactly what 2.5 removes                              |
| `docsEditing.text.body`   | "a sans-serif, serif or monospace family … Formatting applies to the whole label. Formatting single words differently is not possible yet" | Both sentences                                                      |
| `docsEditing.limits.body` | "no formatting of single words inside a label"                                                                                             | Same limit, named a second time                                     |
| `cmp.diagramTypes.koxora` | "The merged version draws shapes, plain text and connections with visible ports"                                                           | Several diagrams per project through tabs changes what a project is |

A claim changed in the comparison also moves `comparisonCheckedOn` in `apps/website/src/content/comparison.ts`, because every comparison page prints that date.

### The screenshots that go stale

All seven live in `apps/website/public/images/studio/` and are captured by `tests/assets/studio-screenshots.spec.ts`:

| Picture                                                             | Why it changes                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `docs-properties`                                                   | **Certainly.** It shows the 2.4 properties dialog, which the rich-text editor replaces |
| `editor-dark`, `editor-light`, `editor-small-en`, `editor-small-de` | **Certainly.** Diagram tabs appear in the editor chrome these four show                |
| `docs-shortcuts`                                                    | **Probably.** 2.5 adds Ctrl/Cmd+B, I and U to the shortcut list                        |
| `docs-dashboard`                                                    | **Only if** the project list itself changes                                            |

The capture clicks buttons by their accessible names — "Element properties", "Keyboard shortcuts", "Fit content", "Import .koxora". If 2.5 renames the properties button, **the capture fails rather than producing a wrong picture**, which is the behaviour we want.

### What this does not authorize

No status moves, no sentence is rewritten and no picture is recaptured before the merge. A website pull request that marks either capability available while Phase 2.5 is still open would be exactly the mistake this whole document exists to prevent — and `docs.test.ts` and `comparison.test.ts` do not catch it, because neither can know what has merged.

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
