import { expect, it } from 'vitest';
import { formatStorageSpace } from './storage-space';

it('uses readable binary units and the selected interface locale', () => {
  const bytes = 361678 * 1024 ** 2;
  expect(formatStorageSpace(bytes, 'en')).toBe('353.2 GiB');
  expect(formatStorageSpace(bytes, 'de')).toBe('353,2 GiB');
  expect(formatStorageSpace(2 * 1024 ** 4, 'en')).toBe('2 TiB');
  expect(formatStorageSpace(1024 ** 2, 'en')).toBe('1 MiB');
  expect(formatStorageSpace(1024, 'de')).toBe('1 KiB');
  expect(formatStorageSpace(0, 'de')).toBe('0 B');
});
it('does not present unavailable or invalid filesystem values as free space', () => {
  for (const bytes of [null, undefined, -1, NaN, Infinity, '1024'])
    expect(formatStorageSpace(bytes, 'en')).toBeNull();
});
