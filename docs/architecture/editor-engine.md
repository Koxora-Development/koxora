# Editor and diagram engine specification

**Status: proposed architecture for confirmed functional goals.**

## Layers

1. Document model: domain elements, relationships, pages, views, data bindings, styles, metadata.
2. Commands: verifiable add/move/delete/connect/group/style/bind/undo actions, serializable and testable.
3. Rendering/input adapters: Canvas/SVG/DOM as appropriate; selection, hit testing, keyboard, touch, dragging, snapping.
4. Families: graphs, mind maps, BPMN/UML/ER, charts, planning, whiteboard, wireframes, domain symbols.
5. Export adapters: semantic data independent of renderer, with fidelity reports.

## Conceptual extension contract

An engine declares supported types/versions, commands, validation, layouts, renderers, toolbar contributions, and export capabilities. Its core must not depend directly on global network/cloud/filesystem access. Versioned extension schemas must not damage other engines. Interface contributions declare localization keys rather than hardcoded labels.

## Interactions

- Multiple pages/layers, groups/containers, arbitrary sizes, ports/anchors, magnetic connections, routing, alignment/distribution.
- Zoom/pan, minimap, selection areas, multiple selection, copy/paste, undo/redo, search, shortcuts, accessibility.
- Non-destructive automatic layout with preview, manual correction, and undo.
- Large-document culling/virtualization and workers for heavy calculations; measure actual performance.
- Reusable themes, shape libraries, and templates with version/license metadata.

## Incremental validation

Phase 1 proposes a minimal node/edge technical round trip; Phase 2 proposes flowcharts, mind maps, and organization charts. Specialist notations follow. Preserve the full [diagram vision](../product/diagram-types.md) while implementing incrementally.
