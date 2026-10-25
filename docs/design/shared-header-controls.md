# Shared header controls: appearance and language

**Status: implemented on the website, specified for the studio, 2026-10-25.** The Product Owner asked for one recognizable appearance switch and one recognizable language switch across Koxora, identical in look and in behaviour. This document is the contract. Website W1 implements it in `apps/website`; Studio 2.5 implements the same contract in its own branch under [Issue #19](https://github.com/Koxora-Development/koxora/issues/19). Nothing here is a studio change: it is what the studio change has to match.

Related: [W1 implementation notes](../platform/website-w1.md), [internationalization](../product/internationalization.md), [Issue #21](https://github.com/Koxora-Development/koxora/issues/21).

## 1. One source for the artwork, two renderers

The website renders static HTML at build time and ships no React runtime, so a shared React component is not available to it. What is shared is the artwork and the metrics, as plain data:

```ts
import {
  appearanceIconFor,
  controlIcons,
  controlIconGrid,
  controlMetrics,
  languagePictogram,
} from '@koxora/ui/control-icons';
```

`packages/ui/src/control-icons.ts` has no React import and no asset import, so both a build-time renderer and a React component can read it. Each surface draws its own element from the same path data on the same 24-unit grid, with the same stroke width, caps and joins. Copying a path string into a component instead is the one thing that breaks this contract silently.

The website repeats the metrics as CSS custom properties in `apps/website/src/styles/tokens.css`, and `apps/website/src/components/controls.test.ts` fails if the two ever disagree.

## 2. Geometry and surface

| Property     | Value                                                             | Token                                           |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------- |
| Button       | Circle, 36 × 36                                                   | `--control-size`, `controlMetrics.buttonSize`   |
| Hit area     | 44 × 44, centred on the circle                                    | `--control-touch`, `controlMetrics.touchTarget` |
| Icon         | 17 × 17, `currentColor` stroke                                    | `--control-icon`, `controlMetrics.iconSize`     |
| Border       | 1px `--border`, `--border-strong` on hover                        | —                                               |
| Surface      | `--panel-2`, `--panel-3` on hover                                 | —                                               |
| Icon colour  | `--violet-strong`                                                 | —                                               |
| Menu width   | 232, capped at the viewport less 32                               | `--control-menu-width`                          |
| Menu offset  | 10 below the button                                               | `--control-menu-offset`                         |
| Menu surface | `--panel`, 1px `--border-strong`, `--radius-sm`, `--shadow`       | —                                               |
| Focus        | The project-wide `:focus-visible` outline, 2px `--cyan`, offset 4 | —                                               |

Both buttons sit in the same row, the language switch first, the appearance switch second, the primary action last. Transitions are 120 ms and only inside `@media (prefers-reduced-motion: no-preference)`.

## 3. The appearance control

- **Icon mapping, the one convention:** the control shows the appearance it switches **to**. A sun while the dark appearance is active, a moon while the light one is. `appearanceIconFor('dark') === 'sun'`.
- **Default:** follow the operating system preference while no choice is stored, including when that preference changes during the visit. A stored choice always wins.
- **One press switches:** click, tap, Enter and Space all do the same thing. There is no dropdown and no third visible state.
- **Storage:** the website stores `koxora.website.theme` with the value `light` or `dark` under its own origin. The studio keeps its existing preference record and its existing value. The two origins are separate, so a choice does not travel between them, and neither surface claims it does.
- **Accessible name**, which states the action and changes with the state:

  | State        | English                        | German                           |
  | ------------ | ------------------------------ | -------------------------------- |
  | Dark active  | Switch to the light appearance | Zur hellen Darstellung wechseln  |
  | Light active | Switch to the dark appearance  | Zur dunklen Darstellung wechseln |

  The same text is the button's `title`, so a pointer user sees it too.

- **Without scripting** the control is not rendered at all, rather than shown inert.

## 4. The language control

- **Trigger:** the globe icon in the same circle. Its accessible name and its `title` are "Choose language" and "Sprache wählen". A chevron is available in the shared artwork for a wider trigger; the website trigger is the compact circle, so it carries the globe alone.
- **Menu:** a popover under the trigger with that same text as a heading, then one entry per language.
- **Entries:** the native written name of the language — English, Deutsch — next to an optional pictogram. A flag stands for a country, not for a language, so the pictogram is decorative and hidden from assistive technology, and a locale without one falls back to its neutral language code. `languagePictogram` is the single place that decides this.
- **Current language:** marked by `aria-current="true"`, a check mark and a bolder weight, never by colour alone, and with a visually hidden "Current language" so a screen reader says which one it is.
- **Opening:** click, tap, Enter and Space toggle it. `ArrowDown` and `ArrowUp` on the trigger open it and move into the list. Where a precise pointer exists, hover opens it as well; the gap between trigger and menu belongs to the menu, so a pointer travelling down does not close it, and the first press after a hover keeps the menu open rather than closing what the hover just opened.
- **Closing:** Escape closes it and returns the focus to the trigger, and stops there rather than also closing the collapsed header menu around it. A press outside, or moving the focus out with Tab, closes it without taking the focus back.
- **Keyboard inside the menu:** `ArrowDown` and `ArrowUp` cycle, `Home` and `End` jump to the ends.
- **Placement:** aligned to the right edge of the trigger on wide layouts, to the left edge where the header collapses, and never outside the viewport.
- **Without scripting** the entries stay visible as a plain row of links and the trigger is not rendered. This is why the entries are ordinary links and not buttons.

### What each surface does with a choice

|                   | Website                                                                      | Studio                                                  |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Effect            | Navigates to the equivalent page in the other language                       | Changes the interface language only                     |
| Content           | —                                                                            | Project and diagram text is never translated or altered |
| Addresses         | Localized route mapping, so `hreflang`, canonical and redirects stay correct | —                                                       |
| Persistence       | The address carries the language; nothing is stored                          | The existing interface preference record                |
| Without scripting | Ordinary links still navigate                                                | Not applicable                                          |

## 5. Languages

English is the default and the fallback; German is complete. The list is built from the locale registry, not from a hard-coded pair, so a third language is a registry entry and a message file, with no branch anywhere in the controls. Only languages the surface actually has are offered.

## 6. Tests this contract needs

The website covers all of these in `tests/website/controls.spec.ts` and `apps/website/src/components/controls.test.ts`. The studio needs its own equivalents.

- Both controls are the same size and the same button.
- The trigger names itself and its menu in both languages.
- A press opens and a second press closes; the keyboard opens, walks and closes with the focus restored.
- A press outside closes without moving the focus.
- The current language is marked by more than a colour.
- Every entry shows its own language in that language, and the pictogram is hidden from assistive technology.
- Choosing a language keeps the reader on the same page (website) and leaves project content untouched (studio).
- The menu stays inside the viewport on phone, tablet and desktop.
- Without scripting the language links stay reachable and no inert control is offered (website).
- The appearance control offers the appearance it switches to, in both states.
- The stylesheet metrics and the shared metrics agree.

## 7. Open points

1. The studio side is not implemented here. Until it is, the two surfaces differ, and no claim of parity should be made in release notes.
2. Preferences do not travel between `koxora.app` and `app.koxora.app`, because browser storage belongs to one address. A shared preference would need a deliberate mechanism and its own privacy assessment; none exists.
3. The flag pictograms are a starting convention. If a language without an obvious flag is added, switch the whole list to neutral language codes rather than inventing one for it.
