import { describe, expect, it } from 'vitest';
import {
  libraryCategories,
  libraryPreferenceKey,
  readLibrarySelection,
  writeLibrarySelection,
  quickElementKinds,
} from './library-preferences';

describe('element library preferences', () => {
  it('bounds a large quick library while retaining the pen and leaving its source intact', () => {
    const elements = [
      ...Array.from({ length: 200 }, (_, index) => `future-${index}`),
      'freehand',
    ];
    const original = [...elements];
    const quick = quickElementKinds(elements);
    expect(quick).toHaveLength(24);
    expect(quick.at(-1)).toBe('freehand');
    expect(new Set(quick).size).toBe(quick.length);
    expect(elements).toEqual(original);
    expect(quickElementKinds(['rectangle', 'freehand'])).toEqual([
      'rectangle',
      'freehand',
    ]);
  });
  it('round trips a stable deduplicated selection and allows no visible libraries', () => {
    const stored = new Map<string, string>();
    const storage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    };
    expect(
      writeLibrarySelection(storage, ['symbols', 'basic', 'symbols'], true),
    ).toBe(true);
    expect(readLibrarySelection(storage)).toEqual(['basic', 'symbols']);
    expect(writeLibrarySelection(storage, [], true)).toBe(true);
    expect(readLibrarySelection(storage)).toEqual([]);
  });

  it('forgets a previous persisted choice when remember is disabled', () => {
    const stored = new Map([
      [libraryPreferenceKey, '{"version":1,"selected":["drawing"]}'],
    ]);
    expect(
      writeLibrarySelection(
        {
          setItem: (key, value) => void stored.set(key, value),
          removeItem: (key) => void stored.delete(key),
        },
        ['basic'],
        false,
      ),
    ).toBe(true);
    expect(stored.has(libraryPreferenceKey)).toBe(false);
    expect(
      readLibrarySelection({ getItem: (key) => stored.get(key) ?? null }),
    ).toEqual(libraryCategories);
  });

  it('retains known categories from future choices and safely falls back on corrupt settings', () => {
    expect(
      readLibrarySelection({
        getItem: () =>
          '{"version":1,"selected":["future","symbols","symbols"]}',
      }),
    ).toEqual(['symbols']);
    for (const source of [
      null,
      '{',
      'null',
      '[]',
      '{"version":2,"selected":[]}',
      '{"version":1,"selected":"all"}',
      '{"version":1,"selected":[7]}',
      '{"version":1,"selected":["future"]}',
    ])
      expect(readLibrarySelection({ getItem: () => source })).toEqual(
        libraryCategories,
      );
  });

  it('blocked preference access leaves a usable default and reports failed writes', () => {
    expect(
      readLibrarySelection({
        getItem() {
          throw new Error('blocked');
        },
      }),
    ).toEqual(libraryCategories);
    const storage = {
      setItem() {
        throw new Error('quota');
      },
      removeItem() {
        throw new Error('blocked');
      },
    };
    expect(writeLibrarySelection(storage, ['basic'], true)).toBe(false);
    expect(writeLibrarySelection(storage, ['basic'], false)).toBe(false);
  });
});
