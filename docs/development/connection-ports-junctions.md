# Connection ports, junctions and the shared symbol strip

Status: accepted and merged in [PR #62](https://github.com/Koxora-Development/koxora/pull/62) on 2026-11-23 (`27527a7`), following the 2026-11-17 screenshot review. Public release and deployment remain separate decisions.

Relevant requirements are EDIT-003/005/007/008/015 and CORE-001–008/012/014/015/016. The existing [connection styles](connection-styles.md), [shape and connection authoring](shapes-text-connections.md), [element transforms](element-transforms.md) and [native preservation rules](../architecture/project-format.md) remain applicable.

## Shared Shapes and Connections strip

Shapes and connection presets share one compact area with explicit tabs. The selected tab determines which tools are visible while the armed insertion tool remains understandable. Switching tabs must not silently change the next insertion or conceal an active tool. Existing search, category selection, page controls, mouse-wheel paging and keyboard access continue to provide access to the complete enabled catalog.

The number of visible shapes follows the actual space available for the strip. Measure the strip rather than assuming a fixed 23-item limit or relying only on window width: neighboring controls, the navigator, properties, interface scale and accessibility settings also affect usable width. Resize and layout changes must update capacity without clipping controls or losing the selected tool. Large catalogs remain paged instead of rendering every symbol into one toolbar.

Line, Arrow and Junction appear in Connections rather than being duplicated in Shapes or its browser. The Drawing shape category retains Freehand. Existing stored line/arrow nodes and menu insertion remain supported.

Connection insertion settings live in an on-demand Connection options popup beside the tool actions. Repeat insertion, routing, endpoint symbols, layer selection and connection by name remain available there without a permanent extra canvas row or explanatory sentence. The popup is constrained to the visible viewport, supports keyboard entry and Escape, and closes on an outside pointer action.

Connection previews need enough width and height to distinguish routing, dashed/dotted strokes and endpoint symbols. A compact strip must retain readable previews and localized accessible names. Keyboard and touch users must be able to select the same presets as mouse users; preview detail must not depend on hover.

## Adaptive shape ports

Eligible shapes expose attachment points appropriate to their contour instead of only four generic positions. Larger elements offer additional useful positions, while a bounded density keeps small elements legible and prevents overlapping targets. Ports on a diamond, ellipse or concave symbol must follow that shape's visible boundary rather than an unrelated bounding rectangle. Any excluded element kinds and fallback contours must be reported honestly.

A chosen port records an element-local normalized anchor `{x:number,y:number}`. Its coordinates describe a direction from the element center, projected onto the visible shape contour. Moving the element moves the attachment with it; resizing derives the new boundary point from that same normalized direction. Reflection occurs in local coordinates before rotation, matching the existing geometry contract. Rotating or reflecting an element must keep a manually chosen anchor attached to that same local location instead of selecting a new nearest port.

A later size change may offer a different set of visible candidate ports. That must not quantize or discard an already stored anchor merely because its exact candidate is no longer displayed. Automatic attachment remains available through the existing `auto` anchor behavior. Existing cardinal string anchors retain their established north/east/south/west semantics.

Port rendering, pointer hit testing, drawing and endpoint attachment/detachment must agree on the same coordinates. At distant zoom levels, visible markers are thinned to an 18-pixel center spacing. Rendering is bounded to 1,024 buttons and 256 nearby eligible nodes, prioritizing the current source and keyboard-focused node. Up to 32 saved positions per node supplement the ordinary candidates. These display limits do not change stored anchors or the exact position in the properties selector; ordinary shape-body attachment and connection by name remain available. Existing connection line styles, markers, labels, explicit waypoints, attached/floating endpoints and history retain their behavior. Port indicators are editing affordances; they do not enter exported document content as extra visible shapes.

## Explicit junction/splitter

The library provides an explicitly insertable small junction point with node kind `junction`. It is an ordinary node with its own stable identity and geometry, not a hidden placeholder or an implicit graph relationship. Users can select, move, duplicate and delete it through the existing element commands.

All connections attached to a junction meet at its exact center. Drawing a source-to-junction edge and three separate junction-to-target edges therefore creates a visible shared branch point. Moving the junction moves the meeting point of every attached edge together; resizing, rotation and reflection must not cause each edge to drift to a different side of the symbol. Multiple connections can share that same anchor without displacing one another.

This first milestone uses ordinary pairwise connections. Users insert the junction and connect its branches deliberately. Clicking an existing edge does not automatically split it, and this contract does not introduce a hyperedge, automatic edge-to-edge attachment, router configuration or network-specific port metadata. Any later automatic split operation needs its own data-preservation and history design.

## Portable compatibility

New normalized-anchor and junction semantics require `connection-ports-v1` in the project's required features. The new behavior uses the existing node/connection model and extension boundary, without a core schema-version, native-permission, dependency or external-asset change.

Within version-1 `org.koxora.connection`, `sourceAnchor` and `targetAnchor` accept the existing strings or a normalized `{x:number,y:number}` object. Both coordinates must be finite and within `[0,1]`. The exact center `{x:0.5,y:0.5}` is invalid because it has no direction to project. A junction instead uses legacy `auto` and resolves to its exact center. Invalid known values are rejected atomically. Existing `auto`, `north`, `east`, `south` and `west` string anchors keep their previous storage and meaning; reading or ordinarily editing a legacy connection must not rewrite those strings into normalized coordinates.

For example, an attached source can retain a noncardinal local direction while the target uses automatic attachment:

```json
{
  "org.koxora.connection": {
    "version": 1,
    "sourceAnchor": { "x": 1, "y": 0.25 },
    "targetAnchor": "auto"
  }
}
```

This is an extension-map excerpt, not a complete connection or project. Its normalized source anchor requires `connection-ports-v1`; a `junction` node requires the same feature even before an edge is attached. Existing endpoint IDs/points and unrelated connection options retain their normal representation.

Unsupported future extension versions, including version 2 payloads, remain preserved and read-only under the existing compatibility rules. Do not reinterpret their anchor-looking fields as the supported version-1 profile or flatten them into legacy defaults. Unknown siblings remain intact. Unknown required features still fail safely while preserving the active project and source file.

The new required feature is retained conservatively through history and later edits. Older readers must refuse a project requiring these semantics instead of silently routing normalized anchors differently or treating a junction as an unrelated fallback shape. Native export/import and local save/reopen retain stable identities, endpoint references and normalized locations. Copy/duplicate remaps duplicated identities through the existing rules while preserving valid branch endpoints; no junction branch may silently detach or bind to the wrong copy.

## Acceptance and evidence

Test English and German, both themes, 100% and 200% interface scale, enhanced accessibility, wide/narrow windows and changes to panel visibility. Switch Shapes/Connections tabs, page with buttons/wheel/keyboard and resize the available strip while a nonfirst-page tool is armed. Verify capacity changes follow actual width, controls stay reachable and connection previews visibly distinguish routing and endpoint symbols.

Draw between representative rectangular, rounded, curved, polygonal and concave shapes at small and large sizes. Verify additional ports on larger eligible elements, visible-contour placement and pointer target agreement. Choose noncardinal ports, then move, resize, rotate and reflect each endpoint. Verify the saved normalized location survives a change in candidate-port density. Compare existing cardinal/automatic connections against the previous behavior.

Insert one junction, connect a source to it and connect it to three targets. Verify every branch meets exactly at the center before and after movement, resizing, rotation and reflection. Exercise endpoint reattachment/detachment, copying/duplication, deletion, Undo/Redo, local reopening and native export/import. Confirm ordinary edge labels, decorations and waypoints survive.

Include malformed/nonfinite/out-of-range anchor rejection, unsupported future payload preservation, missing-feature refusal and older-reader refusal. Record actual core, browser, archive/history and independent-review evidence in the PR handover; earlier review-build results do not establish that this follow-up passes. Physical desktop/touch/assistive-technology checks and remote browser-engine results remain separate evidence.
