# Future Studio design presets and customization

**Status: requested future planning, not implemented by Issue #57.** The Product Owner requests more design templates and the ability to customize the Studio interface. This plan complements [element transforms and current interface changes](../development/element-transforms.md); it commits no release date or additional implementation scope.

Relevant [catalog](../product/feature-catalog.md) requirements are CORE-001/002/003/004/013/014/015/016 for local, accessible, multilingual UI preferences, and EDIT-008/012 for reusable document styles and local templates. The catalog remains unchanged. Public template browsing and marketplace distribution remain later PLAT-007/010 work.

## Proposed delivery sequence

| Step | Scope | Acceptance before advancing |
| --- | --- | --- |
| 1. Curated interface presets | Additional coordinated light/dark design presets and accent palettes, alongside the existing light, dark and system choices. Define shared color, focus, border and spacing tokens first. | Preview and apply a preset locally; Cancel and Reset restore a known usable appearance. Text, focus and selected/disabled states have sufficient contrast in every preset. EN/DE and all supported interface scales remain usable. |
| 2. Personal interface customization | Customize accent and surface colors within validated token controls; save named personal presets. Extend panel visibility/order, panel widths and toolbar density only where there is a clear keyboard-accessible reset path. | Preferences survive offline restart on browser and desktop without changing document content, canvas geometry or exports. Invalid settings fall back safely. Small-window reflow keeps settings and reset reachable; manual layouts never strand essential controls offscreen. |
| 3. More local design templates | Add curated document starters and reusable style presets, initially for simple flowcharts, mind maps and planning boards where supported by the editor. Provide previews and categories on the library's planned-template entry point. Allow saving a local document as a reusable template. | Creating from a template makes a separate project with fresh identities and valid internal references. It never overwrites the template or an open project. Templates work offline, retain editable content and round-trip through the native format. Unsupported capabilities are disclosed instead of implied. |
| 4. Portable personal presets | After the local model is stable, consider versioned import/export of UI presets and local templates. Keep UI preference files separate from project content. | Validate untrusted input, retain compatible unknown data and reject unsupported required features without executing CSS, scripts or remote resources. Preview imported changes and retain Reset. No account or cloud dependency is introduced. |

## Product boundaries

UI themes style Studio controls; document templates style or populate diagram content. Applying a UI theme must not recolor a diagram or change its exported appearance. Choosing System default remains an explicit preference and must not override an explicit language or theme. Any system-derived palette behavior needs a documented fallback and user-visible preview.

Start with maintained presets and declarative controls. Arbitrary user CSS, executable theme plugins, remote fonts, shared accounts, paid templates and marketplace publication are outside the initial plan. Asset provenance and font/icon licensing must be established before bundling templates. Exact preset artwork, token limits and the first template set remain design decisions for their implementation assignment.

## Cross-cutting acceptance

All stages require English/German resources, keyboard operation, visible focus, readable contrast, and testing at 100–200% interface scale in small and large windows. Respect reduced-motion preferences if animated previews are introduced. Preserve local-first operation and existing preferences through versioned migration. Test preview/cancel/reset, corrupt preferences, unsupported imported presets and offline restart without altering user documents. Browser checks and target-native visual review are both required; cloud synchronization is optional future work.
