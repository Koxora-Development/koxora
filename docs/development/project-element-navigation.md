# Project and element navigation (#24, remaining scope)

References: CORE-001–006, CORE-010, CORE-015–017, EDIT-011, OPS-001/007–009; [interactive links](interactive-links.md), [project format](../architecture/project-format.md) and [project storage](project-storage.md). Implemented under the 2026-11-09 assignment after PR #51's URL/page foundation. This branch is independently based on current main; storage and OS-opening remain separate PRs. Interactive exports remain deferred. Merge/release require explicit Product Owner approval.

## Authoring and following

Element properties now offers **Element in this project** and **Another local project**, alongside URL and same-project page links. Choose a locally stored destination project by its title, optionally a page and a visible element. Project-only links open the project's saved page. Explicit UUIDs, not titles, indexes or filesystem paths, identify destinations. Renames/reordering do not rewrite links. The project selector reads the same local repository already available to the editor; no network, account, filesystem scan or cross-profile access is introduced.

Follow with the existing **Open link** action or **Alt+Enter** after selecting an element. Ordinary selection/dragging never follows links. Before changing projects, focused drafts and canvas state are captured and saved through compare-and-swap. Failure retains the source workspace. Destination project/page/visible geometry are validated before switching. Imported missing IDs remain preserved; missing/hidden/unreadable targets show an explicit **Destination unavailable** dialog. **Locate by importing .koxora…** uses the existing validated importer. An imported archive with the expected project identity makes the original link resolvable; a different identity is never attached automatically. To choose a replacement, edit the source link explicitly in properties. No arbitrary path is stored, guessed or read.

Element navigation centers/zooms to its bounded geometry and highlights it. Editable targets are selected; locked/read-only targets receive a visual highlight without editable selection or handles. Hidden targets remain hidden and report unavailable. Focus/camera application waits until the navigation lock and inert state are released, so keyboard focus and ordinary viewport persistence work. Ordinary project/page navigation and history travel clear stale target requests. Navigation itself is not a document edit or link-history entry; link authoring/removal uses ordinary undo/redo.

All controls, accessible labels, errors and missing-target guidance use EN/DE resources. Destination summaries show current local names, with stable identity fallback. Browser and desktop share the same core and repository contract; internal navigation works offline for data present on that device/profile. Native Save As remains separate. A cross-project link does not embed the destination archive or grant access to another user's data.

## Portable semantics and preservation

Existing native node URL/page actions and connector `org.koxora.link` version 1 remain unchanged. New targets are optional element extensions under `org.koxora.link`, **version 2**, on nodes or connectors:

```json
{
  "version": 2,
  "type": "element",
  "pageId": "00000000-0000-4000-8000-000000000001",
  "elementId": "00000000-0000-4000-8000-000000000002"
}
```

```json
{
  "version": 2,
  "type": "project",
  "projectId": "00000000-0000-4000-8000-000000000003",
  "pageId": "00000000-0000-4000-8000-000000000001",
  "elementId": "00000000-0000-4000-8000-000000000002"
}
```

For a project target, page/element are optional; element requires page. Every supplied identity must be a canonical UUID. Unsupported versions/types/extra fields are inert and cannot be rewritten through link controls. Coexisting native actions and node link extensions are ambiguous and therefore unsupported. This is an additive optional extension with its own version, not a new required core/archive schema; older readers preserve the JSON but cannot promise new navigation. Version-2 URL/page records remain unsupported, preserving the previous future-data boundary.

Conversion from a legacy node action occurs only on explicit editing. If the displaced action has opaque extension metadata, its complete original record is retained inertly in `org.koxora.link-source` version 1, alongside any previous backup under `previous`. This source metadata is never executed or converted back automatically. URL/page-to-URL/page edits retain their action metadata in place. Removing an action with opaque metadata also retains that inert backup. No import-wide migration silently rewrites archives.

Page duplication remaps known same-project page/element IDs to the copied page/elements; explicit foreign project identities remain unchanged. Ordinary element copying/duplication retains original destinations. Target deletion preserves optional v2 references so following can report missing without corrupting the archive. Unknown extension payloads remain opaque, including identities the editor cannot safely interpret. Undo/redo restores exact link/source metadata.

Static/raster exports are not made interactive. A portable `.koxora` preserves links but must be opened in a supporting Koxora reader; standalone HTML, interactive PDF and remote project resolution remain later work.

## Concrete review package and CachyOS acceptance

Use this PR head's **Desktop foundation** Linux artifact `unsigned-desktop-x86_64-unknown-linux-gnu` (AppImage/DEB) and **Quality** browser evidence. Match the artifact commit to the PR head, extract the AppImage, make it executable and launch without sudo. On CachyOS, do not install the DEB. Use Firefox with `pnpm build && pnpm preview`, provision its service worker, then disconnect networking. These are unsigned review packages, not a public release. Each of the three assigned blocks has a separate package/PR; this one does not implicitly contain unmerged storage/file-association changes.

1. Create/import two projects with multiple pages. In source element properties, choose Another local project, then a destination page and element. Apply, undo and redo; Save As/export/reopen must retain exactly the chosen identities.
2. Follow with Open link and Alt+Enter. A draft project-name edit and unsaved canvas changes must save before switching. Open the source again and confirm them. Rename the destination and reorder its pages; follow the original link again offline.
3. Link within a project to a distant shape, text, line or connector. Follow: camera centers/highlight appears; editable target is selected. Save/reload/reopen to verify the camera remains. Switch to an unrelated page/project: no stale highlight or false missing-target feedback.
4. Link to a visible locked/read-only target: highlight and camera move, but no editable selection/resize handles and no geometry mutation. A hidden/deleted target must report unavailable without unhiding it or switching to an unrelated workspace.
5. Transfer only the source archive to a fresh browser profile: following reports missing. Use Locate/import to add the expected destination archive. Return to source and follow successfully. Importing another identity must not silently relink. Explicitly choose a replacement in properties once.
6. Duplicate a page containing local element links and foreign-project links. Local targets inside the copy must point into the copy; foreign references still identify the original foreign project. Remove a target, undo/redo, save and export/reimport; archive integrity and missing feedback remain correct.
7. Switch EN/DE and complete authoring, missing-target and follow actions by keyboard. Verify no external/network resource is fetched for internal navigation, including offline restart. Read-only/future imported data remains preserved.

Repeat core journeys in the Linux AppImage and Firefox. Windows/macOS native acceptance and service-worker/system-webview differences remain real-platform gates; Linux browser tests do not certify them. Automated results and independent review are recorded in the PR.

Validation on 2026-11-09: `pnpm check` passed (33 files, 510 tests), including 31 link-core tests also run independently. Eight Chromium/Firefox navigation cases passed: foreign project/locked element authoring and offline reopen; local centering, undo/redo, persisted camera and ordinary page creation; missing-project import guidance; and hidden foreign targets with German feedback. Independent diff review identified and verified fixes for stale target requests, opaque action metadata, workbook/history page transitions, and delayed focus/camera commit after releasing inert navigation. The same-project selector reselect/refetch issue found by E2E was corrected. Final regression/CI outcomes remain attached to the PR; no unrun real OS acceptance is claimed.
