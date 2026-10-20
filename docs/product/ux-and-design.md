# Visual direction and UX principles

**Status: design concept; no approved logo, design system, or Figma artifact.**

## Brand direction

- Confirmed name: Koxora; lowercase `koxora` is a typographic preference.
- Logo concept: a geometric K made of connected points/edges, with favicon, desktop, CI, and monochrome variants.
- Character: a calm, professional editor approachable by beginners.
- Working slogan: Make ideas visible. One canvas. Endless possibilities. Legal and advertising review is outstanding.

## Provisional design tokens

| Token | Candidate value | Use |
| --- | --- | --- |
| Indigo | `#7568F6` | Primary actions, active tools |
| Cyan | `#45C5CF` | Accent, data relationships |
| Dark Ink | `#10131E` | Dark surfaces/main text on light backgrounds |
| Cloud White | `#F5F6FA` | Light canvas/interface surfaces |
| Lilac | `#B78BFC` | Secondary accents and illustrations |

## Editor interaction

A canvas with a left tool/shape palette and document/page tree, contextual properties on the right, and global actions above. Support focus modes, collapsible panels, responsive layout, and distinct saved/unsaved/synced/offline/conflict states. Include command palette, shortcuts, zoom/pan, snapping, alignment, multiple selection, copy/paste, undo/redo, autosave, and recovery.

## Website interaction

Use a localized browser-start action without registration; illustrative key `actions.openEditor`. Show real screenshots/demos, diagram families, downloads for all systems, privacy/offline/portability benefits, and clear core/cloud boundaries. Never advertise planned features as available. Illustrative keys are documentation examples, not an implemented key registry.

## Usability and accessibility

- Light/dark choice can follow a system theme preference; this is separate from language, which defaults to English.
- Localize every interface string and accessible label. German must be independently selectable from inception. Test English/German text expansion, formatting, and later RTL readiness.
- Provide contrast, scalable typography, keyboard/screen-reader alternatives for graphical content, and labeled controls.
- Evaluate mouse, keyboard, trackpad, touch, and stylus by platform; respect reduced motion.
- Test concrete tasks: start a diagram, edit a complex element, export, identify offline/storage state.
