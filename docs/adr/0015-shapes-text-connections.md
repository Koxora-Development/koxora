# ADR 0015: Portable basic elements and connection editing

- Status: Implemented for Phase 2.3 Product Owner review; merge approval pending
- Date: 2026-10-23
- Scope: EDIT-002, EDIT-003, EDIT-005, EDIT-007, EDIT-008, EDIT-015; CORE-001 through CORE-007, CORE-009, CORE-012 through CORE-019; IO-001, IO-015; OPS-001, OPS-007, OPS-008

## Context

The accepted Phase 2.2 canvas supplies navigation, grid settings and safe read-only previews. Phase 2.3 needs real editable diagrams without introducing a second document model or coupling storage to a rendering library. Existing ZIP validation, recovery, native Save As, optional-content preservation and offline operation remain authoritative. See [ADR 0013](0013-project-storage.md) and [ADR 0014](0014-interactive-canvas.md).

## Decision

Extend `@koxora/editor-core` with a trusted shape registry, geometry, style resolution, connection path generation, hit testing and immutable `applyEdit` transactions. Continue using the interchangeable Studio SVG renderer. No external dependency, schema-version change, migration or new native permission is needed.

The registry provides default dimensions, a vector path, a local containment function and a container capability flag. It includes rectangle, rounded rectangle, ellipse (a circular insertion preset), diamond, triangle, hexagon, parallelogram, standalone text and a basic container. Future trusted shapes can supply the same contract; imported kind names never load code. The container flag establishes a rendering capability, not membership, nested transforms or group manipulation.

Boundary intersection uses a bounded convex ray search against the registry's actual containment geometry, after inverse rotation. Local cardinal anchors rotate with a node; automatic anchors use the direction toward the adjacent endpoint. Straight, orthogonal and cubic paths share this contract. Orthogonal paths use horizontal or vertical center rays before building elbows. This is basic routing, not obstacle avoidance or specialized UML/ER/BPMN semantics. Existing waypoint paths remain intact unless the user explicitly changes routing, which regenerates the path and clears those waypoints.

Layers paint in array order; connections precede nodes within each layer, and node array order breaks ties. Hidden ancestors hide descendants and associated edges. Locked ancestors prevent editing and endpoint picking while leaving content visible. Picking uses rotated contours and reverse paint order. Viewport culling includes strokes, labels and arrowheads. Scene construction caches layer ancestry and inherited known style properties instead of rebuilding style maps for every element.

## Portable fields and compatibility

Existing `node.kind`, `geometry`, `content.text`, `layerId` and `styleId` remain the model. Existing `connection.sourceId`, `targetId`, `layerId`, `relationType` and `waypoints` remain authoritative. Optional versioned namespaces add presentation semantics:

```json
{
  "org.koxora.element": {
    "version": 1,
    "style": {
      "fill": "#ede9fe",
      "stroke": "#7c3aed",
      "strokeWidth": 2,
      "opacity": 1,
      "textColor": "#18243d",
      "fontSize": 16,
      "align": "center",
      "cornerRadius": 16
    }
  },
  "org.koxora.connection": {
    "version": 1,
    "routing": "orthogonal",
    "arrow": true,
    "label": "Yes",
    "sourceAnchor": "auto",
    "targetAnchor": "auto"
  }
}
```

The element namespace belongs in `node.extensions`; the connection namespace belongs in `connection.extensions` and can also contain `style`. Style resolution follows existing referenced styles and parent styles, then inline overrides. Valid cross-document and theme style references remain available. Only appearance fields actually changed by the user become new overrides; a label-only edit preserves unsupported raw styles and their inheritance. Unknown namespace siblings and style fields are preserved.

Readers accept optional compatible content without rewriting it. Known appearance fields are interpreted defensively: six-digit hex colors or `none`, stroke widths 0–32, opacity 0–1, text sizes 8–96 and corner radii 0–128. Invalid optional values render through defaults, never CSS, URLs, HTML, scripts or plugin execution. Unknown kinds receive a bounded rectangle preview. Newer element/connection namespaces, unsupported text payloads and connection options that would lose information through normalization are not edited. Their original data remains exportable. Invalid endpoints, malformed required geometry, duplicate identities and invalid asset references remain rejected by the existing project validator.

## Transactions and application boundary

Phase 2.4 extends these commands with interactive selection/manipulation and bounded forward/inverse history in [ADR 0016](0016-interactive-editing-history.md). Its line/arrow node kinds retain this ADR's appearance and preservation rules.

`applyEdit(project, documentId, pageId, command, now)` returns a new project or throws without mutating its input. Commands provide explicit UUID identities and timestamps, so future undo/history can retain before/after snapshots or replay the same request. Insert, connect, node update and connection update each form one transaction. Validation precedes the application state replacement. Unrelated collections, binary assets, styles, specialized domain models and optional fields retain their values.

Studio snapshots pending navigation before applying a content edit. The current load generation isolates old callbacks from reopened/recovered projects. Content commits reuse autosave, compare-and-swap conflicts, failure retention, export and recovery. Rendering receives a derived scene only and cannot persist anything. Editing-target and tool state are transient and reset when the page/session changes.

## Interaction and accessibility

Insertion is repeatable, centered at the click, with the top-left position snapped to the configured world grid. Enter on the focused canvas inserts at its world center. Standalone text insertion opens its text dialog immediately. A normal short click edits a shape; the explicit Edit tool and element list also reach labels and connections by keyboard. Connection mode picks source then target, highlights the source and supports an accessible element list. Escape clears a pending tool/pointer candidate before exiting expanded mode. The middle mouse button and Space-drag remain navigation overrides; wheel, keyboard and touch navigation remain available. Touch taps activate tools; touch drags/pinches navigate without inserting.

The properties dialog supports Unicode/multiline labels, colors, outline width, opacity, font size, alignment and rounded corners; edges expose labels, path type and arrowheads. Errors are visible within the current editing context. English is the default/fallback and German is fully localized. SVG output uses text nodes only; the element list provides a keyboard-accessible representation. No account, telemetry or network access is introduced.

## Limits and consequences

We continue owning geometry, text layout, interaction and accessibility maintenance. Text editing is limited to 4,096 UTF16 code units; display wraps by Unicode code points with bounded lines, without advanced shaping, rich text or font embedding. Node text exceeding available height is visually abbreviated; the full supported text remains in properties and files. Edge display is limited to eight wrapped lines. Standalone and edge labels use a white halo to remain legible over both canvas themes. This is basic typography; font metrics and complex-language layout need later work.

The existing 1,500-node/1,500-edge visible output cap and linear culling remain. Each edit validates the complete project; large-file editing cost is not claimed to be constant. Automatic self-loop creation, duplicate connections for the same direction, deletion, drag/resize, multiselection, group manipulation, complete undo/redo and obstacle-aware routing remain outside this phase. No imported content is removed to enforce display limits.

[Implementation checks and manual acceptance](../development/shapes-text-connections.md) distinguish actual local/CI evidence from physical Wayland, native GUI and Product Owner acceptance.
