import { describe, expect, it } from 'vitest';
import {
  preferenceKey,
  guiScales,
  resolveGuiScale,
  readPreferences,
  writePreferences,
} from './preferences';
describe('local guest preferences', () => {
  it('starts in English/light at compact scale with missing, corrupt or blocked storage', () => {
    for (const raw of [
      null,
      '{',
      'null',
      '5',
      '[]',
      '{"locale":"__proto__","theme":"purple"}',
    ]) {
      expect(readPreferences({ getItem: () => raw })).toEqual({
        locale: 'en',
        theme: 'light',
        guiScale: 100,
      });
    }
    expect(
      readPreferences({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toEqual({ locale: 'en', theme: 'light', guiScale: 100 });
  });
  it('round-trips explicit preferences without touching document or unrelated data', () => {
    const storage = new Map([['project', 'User-authored content']]);
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    expect(
      writePreferences(adapter, { locale: 'de', theme: 'dark', guiScale: 175 }),
    ).toBe(true);
    expect(readPreferences(adapter)).toEqual({
      locale: 'de',
      theme: 'dark',
      guiScale: 175,
    });
    expect(storage.get('project')).toBe('User-authored content');
    expect(storage.size).toBe(2);
    expect(storage.has(preferenceKey)).toBe(true);
  });
  it('reports write failures for a localized session-only warning', () => {
    expect(
      writePreferences(
        {
          setItem: () => {
            throw new Error('quota');
          },
        },
        { locale: 'de', theme: 'dark', guiScale: 175 },
      ),
    ).toBe(false);
  });
});

describe('interface scale compatibility', () => {
  it('reads existing v1 preferences without rewriting them or losing locale/theme', () => {
    const original = JSON.stringify({ locale: 'de', theme: 'dark' });
    const keys: string[] = [];
    expect(
      readPreferences({
        getItem: (key) => {
          keys.push(key);
          return original;
        },
      }),
    ).toEqual({
      locale: 'de',
      theme: 'dark',
      guiScale: 100,
    });
    expect(keys).toEqual(['koxora.preferences.v1']);
  });
  it('rejects nonnumeric, fractional, nonfinite and out-of-range stored scales', () => {
    for (const value of [
      undefined,
      null,
      '150',
      '150%',
      true,
      [],
      {},
      0,
      -100,
      99,
      110,
      125.5,
      201,
      NaN,
      Infinity,
    ]) {
      expect(resolveGuiScale(value)).toBe(100);
      expect(
        readPreferences({
          getItem: () =>
            JSON.stringify({ locale: 'de', theme: 'dark', guiScale: value }),
        }),
      ).toEqual({
        locale: 'de',
        theme: 'dark',
        guiScale: 100,
      });
    }
  });
  it('restores each supported scale from local storage with no network or document changes', () => {
    const records = new Map([
      ['project', 'Keep document geometry and viewport unchanged'],
    ]);
    for (const guiScale of guiScales) {
      const explicit = { locale: 'de', theme: 'dark' as const, guiScale };
      expect(
        writePreferences(
          { setItem: (key, value) => records.set(key, value) },
          explicit,
        ),
      ).toBe(true);
      // A fresh reader represents the next offline application launch.
      expect(
        readPreferences({ getItem: (key) => records.get(key) ?? null }),
      ).toEqual(explicit);
      expect(records.get('project')).toBe(
        'Keep document geometry and viewport unchanged',
      );
      expect([...records.keys()].sort()).toEqual(
        [preferenceKey, 'project'].sort(),
      );
    }
  });
});

it('preserves opt-in system preferences and negotiates registered languages in order', async () => {
  const { systemLocale } = await import('./preferences');
  expect(
    readPreferences({ getItem: () => '{"locale":"system","theme":"system"}' }),
  ).toEqual({ locale: 'system', theme: 'system', guiScale: 100 });
  expect(systemLocale(['fr-FR', 'de-DE', 'en-US'])).toBe('de');
  expect(systemLocale(['en-GB', 'de-DE'])).toBe('en');
  expect(systemLocale(['ja-JP'])).toBe('en');
});
