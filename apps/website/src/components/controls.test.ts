import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  controlIcons,
  controlMetrics,
  appearanceIconFor,
  languagePictogram,
} from '@koxora/ui/control-icons';
const tokens = readFileSync(
  fileURLToPath(new URL('../styles/tokens.css', import.meta.url)),
  'utf8',
);
function token(name: string): number {
  const match = new RegExp(`--${name}:\\s*(\\d+)px`).exec(tokens);
  if (!match) throw new Error(`Missing token: --${name}`);
  return Number(match[1]);
}
describe('shared header controls', () => {
  it('draws the appearance and language icons from the shared artwork', () => {
    for (const name of ['sun', 'moon', 'globe', 'check'] as const)
      expect(controlIcons[name].paths.length, name).toBeGreaterThan(0);
    expect(controlIcons.sun.circles).toHaveLength(1);
  });
  it('keeps the stylesheet metrics and the shared metrics in step', () => {
    // The studio reads the numbers from the module and the website from the
    // tokens, so a change in one place has to reach the other.
    expect(token('control-size')).toBe(controlMetrics.buttonSize);
    expect(token('control-touch')).toBe(controlMetrics.touchTarget);
    expect(token('control-icon')).toBe(controlMetrics.iconSize);
    expect(token('control-menu-width')).toBe(controlMetrics.menuWidth);
    expect(token('control-menu-offset')).toBe(controlMetrics.menuOffset);
  });
  it('names the appearance the control switches to, not the current one', () => {
    expect(appearanceIconFor('dark')).toBe('sun');
    expect(appearanceIconFor('light')).toBe('moon');
  });
  it('falls back to a neutral language code where no flag is defined', () => {
    expect(languagePictogram('en')).toBe('🇬🇧');
    expect(languagePictogram('de')).toBe('🇩🇪');
    expect(languagePictogram('fr')).toBe('FR');
  });
});
