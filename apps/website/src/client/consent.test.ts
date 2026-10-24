import { describe, expect, it } from 'vitest';
import {
  clearRecord,
  grantedCategories,
  readRecord,
  writeRecord,
  type ConsentRuntimeConfig,
} from './consent';
const config: ConsentRuntimeConfig = {
  version: 2,
  storageKey: 'koxora.website.consent',
  optional: ['statistics', 'media'],
  promptRequired: true,
};
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => void values.delete(key),
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}
describe('stored consent decision', () => {
  it('starts with no decision and no granted purpose', () => {
    expect(readRecord(config, memoryStorage())).toBeNull();
    expect(grantedCategories(null)).toEqual([]);
  });
  it('stores only the version, the time and one boolean per purpose', () => {
    const storage = memoryStorage();
    const record = writeRecord(config, storage, {
      statistics: true,
      media: false,
    });
    expect(Object.keys(record).sort()).toEqual(['choices', 'time', 'version']);
    expect(JSON.parse(storage.getItem(config.storageKey)!)).toEqual(record);
    expect(grantedCategories(record)).toEqual(['statistics']);
  });
  it('asks again when the consent version changed', () => {
    const storage = memoryStorage({
      [config.storageKey]: JSON.stringify({
        version: 1,
        time: '2026-01-01T00:00:00.000Z',
        choices: { statistics: true, media: true },
      }),
    });
    expect(readRecord(config, storage)).toBeNull();
  });
  it('asks again when a new purpose is introduced', () => {
    const storage = memoryStorage({
      [config.storageKey]: JSON.stringify({
        version: 2,
        time: '2026-01-01T00:00:00.000Z',
        choices: { statistics: true },
      }),
    });
    expect(readRecord(config, storage)).toBeNull();
  });
  it('ignores damaged records instead of failing', () => {
    const storage = memoryStorage({ [config.storageKey]: 'not json' });
    expect(readRecord(config, storage)).toBeNull();
    expect(readRecord(config, null)).toBeNull();
  });
  it('removes the decision on withdrawal', () => {
    const storage = memoryStorage();
    writeRecord(config, storage, { statistics: true, media: true });
    clearRecord(config, storage);
    expect(storage.getItem(config.storageKey)).toBeNull();
    expect(readRecord(config, storage)).toBeNull();
  });
  it('works when storage is unavailable', () => {
    const record = writeRecord(config, null, {
      statistics: true,
      media: false,
    });
    expect(grantedCategories(record)).toEqual(['statistics']);
    expect(() => clearRecord(config, null)).not.toThrow();
  });
});
