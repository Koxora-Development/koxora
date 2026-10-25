// Single source of truth for the two shared header controls: the appearance
// switch and the language switch. The marketing website renders its pages to
// HTML at build time and ships no React runtime, so the shared part is the
// artwork and the metrics as plain data, not a component. Both surfaces draw
// their own markup from these values, which is what keeps them identical.
//
// See docs/design/shared-header-controls.md for the full interaction contract.
export type ControlIconName = 'sun' | 'moon' | 'globe' | 'check' | 'chevron';
export interface ControlIcon {
  /** Circles drawn before the paths, each as [cx, cy, r] on the same grid. */
  readonly circles?: readonly (readonly [number, number, number])[];
  readonly paths: readonly string[];
}
/** Drawing conventions every control icon shares. */
export const controlIconGrid = {
  viewBox: '0 0 24 24',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
export const controlIcons: Record<ControlIconName, ControlIcon> = {
  sun: {
    circles: [[12, 12, 4.2]],
    paths: [
      'M12 2.6v2.1M12 19.3v2.1M4.4 4.4l1.5 1.5M18.1 18.1l1.5 1.5M2.6 12h2.1M19.3 12h2.1M4.4 19.6l1.5-1.5M18.1 5.9l1.5-1.5',
    ],
  },
  moon: {
    paths: ['M20.2 14.2A8.4 8.4 0 0 1 9.8 3.8a8.4 8.4 0 1 0 10.4 10.4'],
  },
  globe: {
    paths: [
      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
      'M3.2 12h17.6',
      'M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18',
    ],
  },
  check: { paths: ['m5 12.5 4.5 4.5L19 7'] },
  // Optional, for a surface whose language trigger is wider than a circle.
  // The website trigger is the same compact circle as the appearance
  // control, so it carries the globe alone.
  chevron: { paths: ['m6.5 10 5.5 5 5.5-5'] },
};
/** Shared button and menu metrics, in CSS pixels. */
export const controlMetrics = {
  /** Visible diameter of a round icon button in the header. */
  buttonSize: 36,
  /** Minimum hit area, met with padding where the visible button is smaller. */
  touchTarget: 44,
  iconSize: 17,
  /** Width of the language menu. */
  menuWidth: 232,
  /** Vertical distance between the trigger and the menu it opens. */
  menuOffset: 10,
} as const;
/**
 * The controls name their target state, not their current one: while the dark
 * appearance is active the button offers a sun, and while the light one is it
 * offers a moon. Both surfaces follow this one convention.
 */
export function appearanceIconFor(active: 'light' | 'dark'): 'sun' | 'moon' {
  return active === 'dark' ? 'sun' : 'moon';
}
/**
 * Optional pictograms for the language menu. A flag stands for a country, not
 * for a language, so it is decorative here: the native language name carries
 * the meaning and the pictogram is hidden from assistive technology. A locale
 * without an entry falls back to its neutral language code, which is how
 * further languages are added without inventing a flag for them.
 */
export const languagePictograms: Record<string, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
};
export function languagePictogram(locale: string): string {
  return languagePictograms[locale] ?? locale.toUpperCase();
}
