# User-saved local templates

The Product Owner accepted this Phase 2 slice and it was merged in [PR #64](https://github.com/Koxora-Development/koxora/pull/64) on 2026-11-23 (`ba11a90`). It implements local save and apply for [EDIT-012](../product/feature-catalog.md) and extends the [built-in starter catalog](templates.md).

## Workflow

1. Open a project and choose **File → Save as template**. Studio proposes the current project title as the template name. Saving captures the current project, including edits already applied in the editor.
2. Open **Templates**, select **My templates** in the category filter, and search by name. Use a template to create a separate editable project. The usual protection for unsaved changes still applies when switching projects.
3. To remove a local template, choose Delete and confirm. The original project and projects already created from the template remain available.

The shared Studio interface provides the workflow in English and German on the web and in the desktop app. The template library works offline after Studio is available offline.

## Storage and project identity

Each template is a complete snapshot of the workbook, including documents, pages, elements, assets, and preserved extension data. Later changes to the source project do not update saved snapshots.

Applying a template creates a new project ID and timestamps. Document, page, layer, and element IDs are scoped to the project and are preserved along with their references. Recognized version 2 self-project links on nodes and connections follow the new project ID, including those in embedded template documents. Links to other projects retain their destinations. Opaque data and ambiguous combinations of legacy actions and link extensions are preserved unchanged.

Templates live in IndexedDB for the current browser or desktop app profile independently of the configured desktop project folder. Moving a project folder or exporting a `.koxora` project does not move the template library. Browser and desktop profiles each have their own library. Template import, export and synchronization are outside this slice.

## Acceptance scenarios

- Save a template from a project with multiple pages, formatting and links. Include an edit applied after the last project save. Reopen the template overview after restarting and find the snapshot by name.
- Create two projects from the same snapshot. Check project identities, page and element references, assets, and explicit self-project and cross-project navigation. Edit one generated project and verify the original and next generated instance still match their respective saved versions.
- Cancel switching projects with unsaved work, then apply the template when ready. Cancel template deletion once, confirm it on the next attempt, and verify generated projects still open.
- Repeat the primary workflow offline in each supported interface language. Check keyboard access in the template overview and the save and deletion dialogs.
