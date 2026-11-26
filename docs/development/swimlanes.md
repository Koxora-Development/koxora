# Swimlane authoring

The Product Owner accepted this Phase 2 package, and it was merged in [PR #66](https://github.com/Koxora-Development/koxora/pull/66) on 2026-11-25 (`1b123b8`). It implements the named lanes portion of DIAG-005. [Feature catalog](../product/feature-catalog.md)

## Create a cross-functional flow

1. Use the **Flowchart** shape library or **Insert → Shapes and symbols…** to choose **Horizontal swimlane** or **Vertical swimlane**. Resize each lane and edit its heading through the normal inline text editor or element properties.
2. Place ordinary process shapes inside the lane bodies. Drag a step into another lane to change its role in the diagram. Connect the process shapes with the normal Line or Arrow tools, including across lane boundaries.
3. Click a lane's heading, outline or empty body to select it, or drag from one of those areas to move it. Shift-drag from the empty body to draw a selection rectangle. To move a lane with its steps, choose **Select lane and steps** in **Edit** or the canvas context menu. Undo or redo the resulting move in one step.

The **Service request** starter demonstrates a connected process across three named horizontal lanes. The browser and desktop app share the workflow in English and German.

## Drawing and storage behavior

Each lane is an independent node of kind `swimlane-horizontal` or `swimlane-vertical`. Lanes draw below shapes and connections in the same layer. Click a step or connection over the lane body to select that item. **Select lane and steps** selects the lane and the editable steps wholly inside its body. The heading is outside that selection area. Ordinary connection endpoints and styles carry the flow across lane boundaries.

When you drag an unrotated lane close to another in the same layer with the same orientation and heading side, Studio aligns their heading edges and brings the adjoining edges flush. Hold Alt for free placement. Each lane keeps its own size, and the project stores its resulting position as ordinary geometry.

Automatic hierarchy and flowchart layouts ask for manual positioning when a selection includes a lane or overlaps its bounds. The editor's usual positioning tools move steps between lanes.

Projects that create a swimlane declare the `swimlanes-v1` required feature. The native `.koxora` archive and local template snapshot retain lane shapes, text, geometry, layers and process connections. Readers that lack the required feature report an unsupported archive. See the [project format](../architecture/project-format.md) and the [local template guide](local-templates.md).

## Acceptance scenarios

- Create and rename horizontal and vertical lanes with the keyboard in English and German. Add steps, move a step to another lane and attach a connector across lanes. Confirm that a step remains visible and selectable over the lane body.
- Click and drag on a blank area inside a lane. Select a foreground shape and connection over the body, then start a Shift-drag there on blank space and check the selection rectangle.
- Drag two horizontal lanes until their adjoining edges meet and their left starts align. Repeat with vertical lanes and their top starts. Check the lane sizes, then repeat while holding Alt and verify free placement. Try an opposite-orientation lane or a lane on another layer and check that the edges stay where you place them.
- Use Select lane and steps with steps fully inside, partly outside and locked. Confirm that only the editable contained steps join the lane selection. Move the selection and check one-step Undo and Redo. Try an empty lane and check the feedback.
- Resize a lane and verify it changes the displayed boundary. Try automatic layout in a lane-based flow and verify that the layout guard protects the existing lane assignments.
- Save and reopen the service-request example offline, export and import its `.koxora` archive, and save and apply it as a local template. Confirm the lane headings, step placement and cross-lane connectors in each reopened project.
