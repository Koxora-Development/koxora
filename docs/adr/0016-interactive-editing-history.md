# ADR 0016: Interactive editing and bounded command history

- Status: Implemented for Phase 2.4 review; Product Owner acceptance and merge pending
- Date: 2026-10-23
- References: [Issue #13](https://github.com/Koxora-Development/koxora/issues/13); EDIT-002 through EDIT-005, EDIT-007, EDIT-008, EDIT-015; CORE-001 through CORE-006, CORE-015 through CORE-017; IO-001; OPS-001
- Roles: agent implementation and independent review; Product Owner acceptance

## Context and alternatives

The accepted Phase 2.3 (`e2bd42c02ccf146555a48f19650c47d800ad8388`) creates shapes and semantic connections, but lacks everyday manipulation, selection and history. A second scene store or external editor would duplicate the portable document and invalidate established preservation boundaries. Whole-project undo snapshots would retain unrelated binary resources and increase memory use. Serializing or validating on every pointer event would make drag performance depend on archive size.

## Decision

Extend the existing immutable document commands in `@koxora/editor-core`. Studio owns tool state, selected IDs, pointer capture and keyboard routing. The SVG adapter receives derived geometry and selection overlays. Persistence still receives only validated projects through the existing repository. There is no new runtime dependency, platform permission or storage-directory assumption.

```text
pointer / keyboard / accessible controls
                  |
      transient tool + selected IDs
                  |
 world transform / snap / preview geometry ---> SVG adapter
                  |
          completed command
                  |
 editor-core applyEdit + validateProject <--> bounded command history
                  |
       shared Project / autosave
                  |
      existing IndexedDB / native CAS
```

Move/resize previews are computed at most once per animation frame. They reuse unchanged scene entries and resolved appearance. Only changed nodes and incident connections receive new geometry; the renderer retains unchanged SVG elements. The existing linear scene scan/culling and 1,500-visible-nodes/1,500-visible-connections caps remain. Final pointer release makes one transaction; cancellation, blur, capture loss, resizing the viewport, tool changes and unmount discard the draft. Camera navigation retains the established separate commit path.

Project state has a synchronously updated session reference as well as React rendering state. Consecutive commands in one event turn therefore see the preceding transaction. Keyboard nudging is a relative command, preventing repeated keys from calculating against a stale rendered geometry. The source project is never mutated.

## Reversible commands and limits

`CommandHistory.execute` records forward/inverse element changes for insertion, text/style updates, relative movement, absolute transforms, connection changes, deletion, duplication and internal paste. Each entry stores only changed nodes/connections and their original/new array positions. Undo/redo checks expected element content, validates the restored project and only then moves the history cursor. Camera, title, assets, optional archive resources and unrelated document fields are taken from the current project rather than an old snapshot.

History is keyed by project/document/page, session-only, and reset on opening/importing/recovering a project. Switching pages isolates their branches. New edits discard that page's redo branch. Across all page branches, retention defaults to 100 transactions and an estimated 16 MiB of JSON UTF16 payload. Eviction removes oldest transactions; evicting a redo prerequisite clears that redo chain. A single command larger than the budget is applied and clears the affected undo chain. This is a bounded payload estimate, not a JavaScript heap guarantee. Disabled buttons, shortcut feedback and help expose unavailable history. No persistent history is claimed. Project renaming and viewport navigation are deliberately outside diagram history.

## Standalone drawing lines

Use the existing shape/node collection with new trusted kinds `line` and `arrow`. These are actual drawing objects with no source/target node IDs, not artificial endpoint nodes. Their rotated geometry encodes a horizontal local segment `(0, height/2)` to `(width, height/2)`. `lineEndpoints` converts to world coordinates; endpoint dragging preserves the fixed endpoint even at the minimum length. Labels and stroke properties use the existing element namespace. Optional `node.extensions["org.koxora.line"]` stores `{version:1,startArrow:boolean,endArrow:boolean}`; default end head follows the `arrow` kind.

No ZIP/schema bump or migration is necessary: kind strings, geometry and extensible dictionaries already exist. Phase 2.3 readers preserve these kinds as read-only bounding previews. Invalid/newer drawing options are protected from editing; unknown compatible fields remain intact. Semantic connectors stay in the connection collection and cannot be created with drawing lines as endpoints. Straight, orthogonal and curved routes retain the trusted anchor architecture. Explicit route changes alone replace imported waypoints.

## Referential integrity and imported content

Hidden/locked ancestor layers and unsupported kind/version/text payloads cannot become editing selections. Transform commands recheck these constraints. Resizing newly changes dimensions only within finite bounds and an 8-unit minimum (1-unit height for lines). Translation and duplication preserve valid smaller imported geometry without normalizing it.

Deleting shapes also removes incident editable supported connections in the same transaction. A locked or unsupported incident connection blocks the entire deletion. Relationships, domain-model references, actions and animations referencing deleted identities block the operation rather than being silently rewritten. Project validation also catches remaining modeled references. Deleting an independent supported connection does not remove its endpoints.

Duplication assigns new UUIDs, preserves relative geometry/appearance/text, copies supported connections between duplicated nodes and remaps both endpoints. Selected connections whose endpoints are not both copied are rejected. Copied waypoint coordinates receive the same translation; opaque metadata is retained without guessed rewrites. Internal copy/paste is scoped to the mounted canvas session and does not read or replace system clipboard text. Page/project changes clear that clipboard.

## Renaming and storage boundaries

Inline titles on dashboard/workspace and the inspector draft use Enter or blur to commit, Escape to discard. Titles are trimmed, nonempty, at most 1,024 UTF16 code units and contain no control characters. Only manifest title/update time changes; the project ID, document titles, resources and optional extensions remain intact. Dashboard writes use the repository's current compare-and-swap token. Save failure retains the visible draft/session change and exposes the repository error.

[Issue #14](https://github.com/Koxora-Development/koxora/issues/14) stays open for a separate desktop/settings milestone. No storage paths, native generation logic, Save As semantics or migration behavior change here.

## Verification and consequences

See [development and acceptance](../development/interactive-editing.md) for commands, performance evidence, automated cases and physical platform checks. We continue to own interaction/accessibility maintenance. Containers do not yet transform a membership hierarchy; rotation handles, object-to-object guides, obstacle routing, specialized domain editing and cross-page/system clipboard interchange remain later work. Existing arbitrary shape rotation is respected during resizing. These limits do not defer the mandatory direct-insertion, movement, resizing, free-arrow, rename or undo workflows.
