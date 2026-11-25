# Automatic layout for hierarchies and flowcharts

The Product Owner accepted this Phase 2 package, and it was merged in [PR #65](https://github.com/Koxora-Development/koxora/pull/65) on 2026-11-24 (`10baa38`). It adds layout commands for connected shapes, organization charts and process diagrams and addresses EDIT-006, EDIT-007, DIAG-005 and DIAG-007. [Feature catalog](../product/feature-catalog.md)

## Workflow

1. Select the connected shapes you want to arrange. Start with **Small team** to try a hierarchy or **Approval and rework** to try a flowchart.
2. Open **Format → Automatic layout** or open **Automatic layout** in the canvas selection menu. Choose **Hierarchy** or **Flowchart** and a **top to bottom** or **left to right** direction. Hover over or focus an option to preview it. Activate the option to apply it. Leave the option or press Escape to dismiss the preview.
3. Use Undo or Redo to reverse or restore the entire layout in one step. Continue with Studio's usual editing tools.

## How layout uses connections

Select two or more visible editable diagram shapes, text elements or junctions. Selecting the connections themselves is optional. Both layouts use visible editable connections with both ends attached to selected elements. Their stored source and target set the direction.

- **Hierarchy** expects one directed tree with a single root and one parent per child. The root anchors the layout and siblings follow their starting order across the layout direction.
- **Flowchart** accepts one connected process graph with branches, joins, multiple starts and return paths. Studio uses the diagram's stacking order to decide which connections set the stages and preserves every return connection in the diagram. The first start across the layout direction anchors the result. In a flow without a start, the first shape across the calculated opening stage anchors it. Applying the same layout again keeps the same stages.

Both layouts use rendered bounds to space nodes. Studio reports an invalid selection, an overlap with an unselected visible shape or drawing, or a position beyond the supported canvas limits before applying an edit.

Swimlanes protect occupied lane bounds during automatic layout so the layout does not move steps across roles. Use the swimlane tools to organize a flow by role. [Swimlane authoring](swimlanes.md)

The committed layout updates the affected positions through the existing project format. It preserves dimensions, rotation, styles, connection waypoints, layers and links. Browser and desktop Studio share the workflow in English and German. The German menu is **Format → Automatische Anordnung**.

## Acceptance scenarios

- Use the team chart or create an uneven tree spanning three levels. Preview and dismiss with the keyboard. Apply in both directions and verify root position, sibling order, spacing and Undo/Redo.
- Arrange the approval process in both directions. Check that branches rejoin, the rework path stays connected and the chosen start retains its position. Try a connected flow with two starts leading to the same step.
- Try a disconnected flowchart, a hierarchy with more than one parent for a child, and an occupied target position. Check the feedback and compare the original positions.
- Save and reopen a resulting `.koxora` project. Check the layout, connection waypoints, styles and links.
