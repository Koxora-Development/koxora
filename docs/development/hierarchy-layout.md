# Hierarchy layout

This Phase 2 slice adds an explicit layout action for connected shapes and organization charts. It covers part of EDIT-006 (automatic layout), EDIT-007 (manual control) and DIAG-007 (organization charts) in the [feature catalog](../product/feature-catalog.md). Product Owner acceptance is pending.

## Workflow

1. Connect editable shapes from parent to child and select the whole branch you want to arrange. The **Small team** built-in template provides a starting example.
2. Open **Format → Lay out hierarchy** or find the same command under **Align / Distribute** on the canvas. Hover over it or focus it to preview the positions. Activate the command to apply the layout. Leave the command or press Escape to dismiss the preview.
3. Use Undo or Redo to reverse or restore the entire layout in one step. The shapes remain editable through the usual tools.

Select two or more visible editable diagram shapes, text elements or junctions. Selecting the connections themselves is optional. The layout uses visible editable connections with both ends attached to selected elements. The connection's source is the parent and its target is the child. The selection must form one connected tree with a single root and one parent per child.

The command arranges the selection from top to bottom using rendered bounds. The root stays in place and siblings follow the starting horizontal order of their centers. Studio reports an invalid hierarchy, an overlap with an unselected visible shape or drawing, or a position beyond the supported canvas limits before applying any edit.

The committed layout writes ordinary geometry through the existing project format and preserves styles, connection waypoints, layers, links and other project data. **Hierarchie anordnen** is the German command name. Browser and desktop Studio share the same workflow.

## Acceptance scenarios

- Use the team chart or create an uneven tree spanning three levels. Preview and dismiss with the keyboard, then apply and verify root position, sibling order, spacing, connections and Undo/Redo.
- Try a disconnected selection, a cycle, multiple parents and an occupied target position. Check the feedback and compare the original positions.
- Save and reopen the resulting `.koxora` project and check that the layout and existing project data survive.
