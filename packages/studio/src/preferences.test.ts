import { describe, expect, it } from 'vitest';
import {
  preferenceKey,
  readPreferences,
  writePreferences,
} from './preferences';
describe('local guest preferences', () => {
  it('starts in English/light with missing, corrupt or blocked storage', () => {
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
      });
    }
    expect(
      readPreferences({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toEqual({ locale: 'en', theme: 'light' });
  });
  it('round-trips explicit preferences without touching document or unrelated data', () => {
    const storage = new Map([['project', 'User-authored content']]);
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    expect(writePreferences(adapter, { locale: 'de', theme: 'dark' })).toBe(
      true,
    );
    expect(readPreferences(adapter)).toEqual({ locale: 'de', theme: 'dark' });
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
        { locale: 'de', theme: 'dark' },
      ),
    ).toBe(false);
  });
});
