# Studio Phase 2.6: explicit diagram links

This implements the first milestone of [Issue #24](https://github.com/Koxora-Development/koxora/issues/24): external URLs and same-project page links after accepted Phase 2.5. Requirements: EDIT-011, CORE-001–006, CORE-010, CORE-015–017 and IO-001. Product Owner acceptance and merge remain pending. Cross-project references, element deep links, interactive HTML/PDF exports and desktop storage/file-association issues #14/#35 remain subsequent assignments.

## Using links

Select one editable shape, text element, freehand stroke, drawing line/arrow or semantic connector and open **Element properties → Interactions / Links**. Choose **External URL** or **Page in this project**; pages are grouped by document. **Apply changes** commits geometry/text/link changes together as one undo step. **Remove link** clears the draft link and becomes effective on Apply; Cancel leaves the original intact.

Normal clicks, dragging, connecting and text editing do not follow links. Select an element and use **Open link** in the toolbar, the selection/context menu, or **Alt+Enter** while the Select tool and canvas are active. The visible buttons also work with keyboard and touch. A linked element's tooltip shows its destination and the follow instructions; external destinations are explicitly labeled. Locked, hidden and unsupported elements cannot activate a link. Links are not automatically run on hover, focus, project open or page navigation.

Page navigation works offline across documents in the current project. It retains the source camera, restores the destination view, announces the page and focuses the canvas. Names and ordering are presentation only: the link stores a stable page UUID. A missing connector destination, for example after editing with an older reader, produces an explicit message and can be repaired by selecting another page in Properties. No filesystem search or automatic target replacement occurs. The existing core schema rejects dangling node-action page references at import.

External links open in a separate browser context, without opener access or referrer, or through the desktop's default system handler. Only absolute HTTP(S) and nonempty `mailto:` destinations are permitted. Credentials, control characters, backslashes, encoded CR/LF, other schemes, and URLs exceeding 2,048 characters after URL canonicalization are rejected at authoring and activation. Rust validates again at the IPC boundary. External availability and browser popup/mail-handler settings remain outside Studio's control; the UI reports handoff rather than successful remote page delivery. Do not put secrets in authored URLs: URLs are portable document content, not a credential store.

## Storage and preservation

ZIP/core schema versions stay at `1.0.0`. Existing `document.actions` records represent node links using `trigger: "click"`, `operation: "url"` with `parameters.url`, or `operation: "navigate"` with `parameters.pageId`. Action IDs and order are retained on edit; unrelated actions and optional extension data remain intact. Multiple link actions, hover/focus link actions or unknown action/parameter fields are preserved but cannot be authored or activated in this milestone.

The existing v1 action target is a node UUID; widening it to semantic connectors would make older readers reject a project. Semantic connectors therefore use an optional extension:

```json
{ "org.koxora.link": { "version": 1, "type": "page", "pageId": "PAGE-UUID" } }
```

For a URL, the payload is `{ "version": 1, "type": "url", "url": "https://example.com/" }`. These are the only understood fields. Unknown versions, extra fields and unsafe URLs remain inert and untouched. Old readers preserve this optional extension but do not execute it or enforce its target references. This additive extension follows the optional-data pattern of [ADR 0018](../adr/0018-workbook-rich-text.md); no cross-project or deep-element semantics are inferred.

Both history implementations record action changes. Element duplication/copy/paste carries known node actions with fresh action IDs; connector extensions follow their elements. Unsupported node-action semantics block copying rather than silently losing or remapping unknown references. Page duplication remaps self-page links for both storage forms. Page moves retain project-scoped action ownership; deleting a former owner document rehomes understood actions to the retained source nodes' documents. Unknown retained actions/animations still block deletion. Existing semantic deletion guards protect referenced pages/documents and may require removing source actions before deleting a linked page. Deleting a linked element removes only understood owned actions atomically; opaque referenced data continues to block deletion.

Native `.koxora` save/reopen/import/export retains these records and opaque data. No new HTML, SVG, PDF or raster exporter is provided, and no interactive-export parity is claimed.

## Desktop boundary and dependency

The only additional frontend capability is `allow-open-external-url`, restricted to the existing local main window. Its Rust command validates and calls the official `tauri-plugin-opener` API with the system default application. No general opener, path, shell, filesystem or remote-window permissions are granted. The plugin's automatic JavaScript link interception is explicitly disabled, so every opening goes through the custom validation boundary. `url` was already in the lockfile and is now a direct dependency. The plugin is pinned to 2.7.2; see [dependency review](dependencies.md).

## Verification and Product Owner review

Run `pnpm check`, `pnpm build`, and `pnpm exec playwright test tests/browser/links.spec.ts`. The link suite exercises actual authoring, history, safe external tabs, keyboard navigation, German controls, missing/future connector data, offline reopen and the desktop IPC contract. Core tests also cover archive round trips, source-page moves followed by original-document deletion, canonical URL bounds, copying and reference protection. The PR records actual results and platform limitations; a browser IPC harness does not prove a native system handler opened.

For screenshots, use `KOXORA_CAPTURE=1` with the Chromium link suite. Manually check:

1. Add/edit/remove a URL and page link on a shape and connector. Cancel a draft, then apply and undo/redo another. Move and edit linked elements; ordinary editing must not navigate.
2. Rename/reorder/move the destination and source pages. Follow across documents, export/import and reopen offline. Duplicate linked elements and a self-linked page. Attempt deletion of a referenced destination; inspect the explanation and undo a permitted deletion.
3. Follow a website and `mailto:` link on native Linux/Windows/macOS using keyboard, pointer and touch. Test missing handlers and offline destinations. Recheck visible destination labels, screen-reader announcements, focus, German/English and narrow windows.
4. Import a future connector link or multiple node links. Confirm the configuration is preserved and inactive, including after unrelated edits and export.

Independent technical review complements manual acceptance. Merge, native distribution and public deployment each require the applicable Product Owner decision.
