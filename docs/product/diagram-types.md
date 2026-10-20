# Diagram families and visualization scope

**Status: confirmed long-term vision; implementation is incremental.** See the [catalog](feature-catalog.md).

| Family | Examples | Semantics and validation |
| --- | --- | --- |
| Thinking and learning | Mind map, concept map, brainstorming, knowledge map | Hierarchical/semantic relations, free layout, folding |
| Processes | Flowchart, BPMN, swimlane, decision tree, process diagram | Routing, notation, gateways, hierarchy |
| Software and systems | UML class, sequence, state, use case, activity, component, deployment; C4 | Typed entities and notation-correct relationships |
| Databases | ERD, relationships, cardinalities, schemas | Relational semantics, column/type information |
| Infrastructure | Network, cloud, data center, IT architecture | Devices, ports, zones, templates, icons |
| Planning | Gantt, timeline, Kanban, roadmap, calendar, organization chart | Time axes, dependencies, hierarchies |
| Data analysis | Line, bar, column, pie, area, scatter, bubble | Typed datasets, axes, filters, aggregation |
| Advanced data visualization | Sankey, heatmap, treemap, funnel, radar, histogram, box plot | Statistical semantics, legends, scales |
| UX and design | Wireframe, user flow, storyboard, mockup, infographic | Component libraries, layouts, export fidelity |
| Creative and whiteboard | Freehand, sticky notes, shapes, text, workshops | Infinite canvas, ink, precision |
| Engineering and science | Electrical, logic, block, signal-flow diagrams; specialist symbols | Domain-specific shape libraries and validation |
| Presentation and interaction | Zoom paths, clickable visual documents, animation | Navigation, filtering, tooltips, timeline |

## Architecture and evolution

1. Share base canvas/input systems without forcing every family into an identical node/edge model.
2. Keep domain models separate from optional layout/views and reusable style, asset, and interaction layers.
3. Engines can share a document with multiple pages/views.
4. Maintain explicit support matrices for draw.io, Mermaid, and PlantUML imports; label lossy round trips.
5. Register diagram properties and export/interaction capabilities per engine.
6. Provide reference projects per family covering creation, layout, refresh, undo, saving, migration, export, and reimport.

None of these application features exists in the Phase 0 baseline.
