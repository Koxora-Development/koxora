import { deflateRawSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { DEFAULT_LIMITS, parseJson } from './validation';
import { crc32, readZip, writeZip } from './zip';
const encoder = new TextEncoder();
/** Independent test writer for DEFLATE and data-descriptor inputs. */
function compressed(
  name: string,
  data: Uint8Array,
  descriptor = false,
  advertisedSize = data.length,
) {
  const path = encoder.encode(name),
    packed = deflateRawSync(data);
  const start = 30 + path.length,
    central = start + packed.length + (descriptor ? 16 : 0),
    end = central + 46 + path.length;
  const bytes = new Uint8Array(end + 22),
    v = new DataView(bytes.buffer),
    flags = descriptor ? 0x808 : 0x800;
  const u16 = (at: number, n: number) => v.setUint16(at, n, true),
    u32 = (at: number, n: number) => v.setUint32(at, n, true);
  u32(0, 0x04034b50);
  u16(4, 20);
  u16(6, flags);
  u16(8, 8);
  u16(26, path.length);
  bytes.set(path, 30);
  bytes.set(packed, start);
  if (descriptor) {
    const at = start + packed.length;
    u32(at, 0x08074b50);
    u32(at + 4, crc32(data));
    u32(at + 8, packed.length);
    u32(at + 12, advertisedSize);
  } else {
    u32(14, crc32(data));
    u32(18, packed.length);
    u32(22, advertisedSize);
  }
  u32(central, 0x02014b50);
  u16(central + 4, 20);
  u16(central + 6, 20);
  u16(central + 8, flags);
  u16(central + 10, 8);
  u32(central + 16, crc32(data));
  u32(central + 20, packed.length);
  u32(central + 24, advertisedSize);
  u16(central + 28, path.length);
  bytes.set(path, central + 46);
  u32(end, 0x06054b50);
  u16(end + 8, 1);
  u16(end + 10, 1);
  u32(end + 12, 46 + path.length);
  u32(end + 16, central);
  return bytes;
}
function archive() {
  return writeZip(
    {
      'a.json': encoder.encode('{"value":42}'),
      'b.bin': Uint8Array.from([0, 255, 128]),
    },
    DEFAULT_LIMITS,
  );
}
function central(bytes: Uint8Array) {
  return new DataView(bytes.buffer).getUint32(bytes.length - 6, true);
}
it.each([false, true])(
  'reads independently compressed archives (descriptor=%s)',
  async (descriptor) => {
    const data = encoder.encode('Unicode 世界 مرحبا');
    expect(
      (
        await readZip(
          compressed('document.json', data, descriptor),
          DEFAULT_LIMITS,
        )
      )['document.json'],
    ).toEqual(data);
  },
);
it('detects CRC corruption, truncation and trailing garbage', async () => {
  const bytes = archive();
  bytes[36] ^= 1;
  await expect(readZip(bytes, DEFAULT_LIMITS)).rejects.toMatchObject({
    code: 'integrity',
  });
  await expect(
    readZip(archive().slice(0, -1), DEFAULT_LIMITS),
  ).rejects.toMatchObject({ code: 'invalid' });
  await expect(
    readZip(new Uint8Array([...archive(), 1]), DEFAULT_LIMITS),
  ).rejects.toMatchObject({ code: 'invalid' });
});
it.each([
  '../x',
  '/tmp/x',
  'C:/x',
  'a/../x',
  'a\\x',
  'a//x',
  'a/./x',
  'a/CON.txt',
  'a.',
])('rejects unsafe path %s', async (path) => {
  await expect(
    readZip(compressed(path, encoder.encode('data')), DEFAULT_LIMITS),
  ).rejects.toMatchObject({ reason: 'archivePath' });
  expect(() =>
    writeZip({ [path]: new Uint8Array() }, DEFAULT_LIMITS),
  ).toThrow();
});
it('rejects duplicate and case-aliased entries', async () => {
  const duplicate = writeZip(
    { 'a.json': new Uint8Array(), 'b.json': new Uint8Array() },
    DEFAULT_LIMITS,
  );
  const dc = central(duplicate),
    dv = new DataView(duplicate.buffer),
    dn = dc + 52,
    dl = dv.getUint32(dn + 42, true);
  duplicate.set(encoder.encode('A.JSON'), dn + 46);
  duplicate.set(encoder.encode('A.JSON'), dl + 30);
  await expect(readZip(duplicate, DEFAULT_LIMITS)).rejects.toMatchObject({
    reason: 'duplicateEntry',
  });
});
it.each([
  ['encryption', (v: DataView, c: number) => v.setUint16(c + 8, 0x801, true)],
  ['ZIP64', (v: DataView, c: number) => v.setUint32(c + 24, 0xffffffff, true)],
  [
    'symlink',
    (v: DataView, c: number) => v.setUint32(c + 38, 0xa0000000, true),
  ],
  ['overlap', (v: DataView, c: number) => v.setUint32(c + 42, 1, true)],
  ['header mismatch', (v: DataView) => v.setUint32(14, 123, true)],
  ['central size', (v: DataView) => v.setUint32(v.byteLength - 10, 1, true)],
] as const)('rejects %s', async (_name, change) => {
  const bytes = archive();
  change(new DataView(bytes.buffer), central(bytes));
  await expect(readZip(bytes, DEFAULT_LIMITS)).rejects.toThrow();
});
it('rejects claimed ZIP bombs and boundedly stops dishonest DEFLATE expansion', async () => {
  const data = new Uint8Array(1024 * 1024);
  await expect(
    readZip(compressed('bomb.bin', data), DEFAULT_LIMITS),
  ).rejects.toMatchObject({ code: 'tooLarge', reason: 'expansion' });
  await expect(
    readZip(compressed('lying.bin', data, false, 10), DEFAULT_LIMITS),
  ).rejects.toMatchObject({ code: 'tooLarge', reason: 'actualExpansion' });
});
it('rejects malformed DEFLATE and data descriptors', async () => {
  const bytes = compressed('x', encoder.encode('hello'), true);
  bytes[31] = 255;
  await expect(readZip(bytes, DEFAULT_LIMITS)).rejects.toMatchObject({
    code: 'invalid',
  });
  const descriptor = compressed('x', encoder.encode('hello'), true);
  descriptor[central(descriptor) - 1] ^= 1;
  await expect(readZip(descriptor, DEFAULT_LIMITS)).rejects.toMatchObject({
    reason: 'descriptor',
  });
});
it.each([
  '{"x":1,"x":2}',
  '{"x":1,"\\u0078":2}',
  '{"__proto__":{}}',
  '{"n":9007199254740992}',
  '{"n":1e999}',
  '[1,]',
])('rejects ambiguous or nonportable JSON %s', (source) => {
  expect(() =>
    parseJson(encoder.encode(source), 'fixture', DEFAULT_LIMITS),
  ).toThrow();
});
it('rejects invalid UTF-8 and excessive JSON depth before JSON.parse', () => {
  expect(() =>
    parseJson(Uint8Array.from([255]), 'fixture', DEFAULT_LIMITS),
  ).toThrow();
  expect(() =>
    parseJson(
      encoder.encode('['.repeat(100) + '0' + ']'.repeat(100)),
      'fixture',
      DEFAULT_LIMITS,
    ),
  ).toThrow();
});
it('parses large strings without regexp stack exhaustion', () => {
  const source = JSON.stringify({ text: '\\"'.repeat(400000) });
  expect(parseJson(encoder.encode(source), 'fixture', DEFAULT_LIMITS)).toEqual(
    JSON.parse(source),
  );
});
it('shares a JSON value budget across archive entries', () => {
  const values = { left: 5 };
  parseJson(encoder.encode('[1,2]'), 'first.json', DEFAULT_LIMITS, values);
  expect(() =>
    parseJson(encoder.encode('[3,4]'), 'second.json', DEFAULT_LIMITS, values),
  ).toThrow();
});
