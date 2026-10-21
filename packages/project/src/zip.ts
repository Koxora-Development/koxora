import { check, ProjectError, type ResourceLimits } from './validation';
const encoder = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes)
    value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
export function safePath(path: string) {
  check(
    /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,239}$/.test(path) &&
      !path
        .split('/')
        .some(
          (part) =>
            !part ||
            part === '.' ||
            part === '..' ||
            part.endsWith('.') ||
            /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part),
        ),
    path,
    'archivePath',
  );
}
interface Entry {
  path: string;
  start: number;
  end: number;
  dataStart: number;
  packed: number;
  size: number;
  method: number;
  crc: number;
}
/** ZIP32 profile: STORE/DEFLATE, UTF-8 paths, no encryption, links, volumes or ZIP64. No extraction to disk. */
export async function readZip(
  bytes: Uint8Array,
  budget: ResourceLimits,
): Promise<Record<string, Uint8Array>> {
  check(
    bytes.length <= budget.archiveBytes,
    '$zip',
    'archiveBytes',
    'tooLarge',
  );
  check(bytes.length >= 22, '$zip', 'endRecord');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number) => view.getUint16(at, true),
    u32 = (at: number) => view.getUint32(at, true);
  let end = -1;
  for (
    let at = bytes.length - 22;
    at >= Math.max(0, bytes.length - 22 - 65535);
    at--
  )
    if (u32(at) === 0x06054b50 && at + 22 + u16(at + 20) === bytes.length) {
      end = at;
      break;
    }
  check(end >= 0, '$zip', 'endRecord');
  check(
    u16(end + 4) === 0 && u16(end + 6) === 0 && u16(end + 8) === u16(end + 10),
    '$zip',
    'volumes',
    'unsupported',
  );
  const count = u16(end + 10),
    centralSize = u32(end + 12),
    centralStart = u32(end + 16);
  check(
    count !== 65535 &&
      centralSize !== 0xffffffff &&
      centralStart !== 0xffffffff,
    '$zip',
    'zip64',
    'unsupported',
  );
  check(count > 0 && count <= budget.entries, '$zip', 'entryCount', 'tooLarge');
  check(centralStart + centralSize === end, '$zip', 'centralDirectory');
  const entries: Entry[] = [],
    names = new Set<string>();
  let at = centralStart,
    total = 0;
  function extras(start: number, length: number) {
    const stop = start + length;
    while (start < stop) {
      check(start + 4 <= stop, '$zip', 'extraField');
      const type = u16(start),
        size = u16(start + 2);
      check(type !== 1, '$zip', 'zip64', 'unsupported');
      check(
        ![0x7075, 0x6375].includes(type),
        '$zip',
        'alternateName',
        'unsupported',
      );
      start += 4 + size;
      check(start <= stop, '$zip', 'extraField');
    }
  }
  for (let i = 0; i < count; i++) {
    check(at + 46 <= end && u32(at) === 0x02014b50, '$zip', 'centralEntry');
    const flags = u16(at + 8),
      method = u16(at + 10),
      crc = u32(at + 16),
      packed = u32(at + 20),
      size = u32(at + 24);
    const nameSize = u16(at + 28),
      extraSize = u16(at + 30),
      commentSize = u16(at + 32),
      start = u32(at + 42);
    check(
      at + 46 + nameSize + extraSize + commentSize <= end,
      '$zip',
      'entryBounds',
    );
    check(
      (flags & ~(method === 8 ? 0x80e : 0x808)) === 0 &&
        [0, 8].includes(method),
      '$zip',
      'zipMethod',
      'unsupported',
    );
    check(
      u16(at + 34) === 0 &&
        size !== 0xffffffff &&
        packed !== 0xffffffff &&
        start !== 0xffffffff,
      '$zip',
      'zip64',
      'unsupported',
    );
    const mode = u32(at + 38) >>> 16;
    check(
      (mode & 0xf000) === 0 ||
        (mode & 0xf000) === 0x8000 ||
        (mode & 0xf000) === 0x4000,
      '$zip',
      'linkOrDevice',
    );
    const rawName = bytes.subarray(at + 46, at + 46 + nameSize);
    let path: string;
    try {
      path = new TextDecoder('utf-8', { fatal: true }).decode(rawName);
    } catch {
      throw new ProjectError('invalid', '$zip', 'utf8');
    }
    const directory = path.endsWith('/');
    safePath(directory ? path.slice(0, -1) : path);
    check(!names.has(path.toLowerCase()), path, 'duplicateEntry');
    names.add(path.toLowerCase());
    check(!directory || size === 0, path, 'directoryContent');
    check(
      size <= budget.entryBytes &&
        size <= Math.max(1, packed) * budget.compressionRatio,
      path,
      'expansion',
      'tooLarge',
    );
    total += size;
    check(total <= budget.expandedBytes, path, 'expandedBytes', 'tooLarge');
    extras(at + 46 + nameSize, extraSize);
    check(
      start + 30 <= centralStart && u32(start) === 0x04034b50,
      path,
      'localHeader',
    );
    const localNameSize = u16(start + 26),
      localExtraSize = u16(start + 28),
      dataStart = start + 30 + localNameSize + localExtraSize;
    check(
      dataStart + packed <= centralStart && localNameSize === nameSize,
      path,
      'localBounds',
    );
    check(
      u16(start + 6) === flags && u16(start + 8) === method,
      path,
      'headerMismatch',
    );
    check(
      rawName.every((byte, n) => bytes[start + 30 + n] === byte),
      path,
      'headerNameMismatch',
    );
    extras(start + 30 + localNameSize, localExtraSize);
    let entryEnd = dataStart + packed;
    if (flags & 8) {
      check(entryEnd + 12 <= centralStart, path, 'descriptor');
      const descriptor = u32(entryEnd) === 0x08074b50 ? entryEnd + 4 : entryEnd;
      check(
        descriptor + 12 <= centralStart &&
          u32(descriptor) === crc &&
          u32(descriptor + 4) === packed &&
          u32(descriptor + 8) === size,
        path,
        'descriptor',
      );
      entryEnd = descriptor + 12;
    } else
      check(
        u32(start + 14) === crc &&
          u32(start + 18) === packed &&
          u32(start + 22) === size,
        path,
        'headerMismatch',
      );
    entries.push({
      path,
      start,
      end: entryEnd,
      dataStart,
      packed,
      size,
      method,
      crc,
    });
    at += 46 + nameSize + extraSize + commentSize;
  }
  check(at === end, '$zip', 'centralSize');
  let last = 0;
  for (const entry of [...entries].sort((a, b) => a.start - b.start)) {
    check(entry.start === last, entry.path, 'overlapOrHiddenEntry');
    last = entry.end;
  }
  check(last === centralStart, '$zip', 'hiddenData');
  const result: Record<string, Uint8Array> = Object.create(null);
  for (const entry of entries) {
    const compressed = bytes.slice(
      entry.dataStart,
      entry.dataStart + entry.packed,
    );
    let data: Uint8Array;
    if (entry.method === 0) {
      check(entry.packed === entry.size, entry.path, 'storedSize');
      data = compressed;
    } else {
      // Streaming decompression checks actual output, even when the ZIP header lies.
      const reader = new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'))
        .getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.length;
          check(
            size <= entry.size && size <= budget.entryBytes,
            entry.path,
            'actualExpansion',
            'tooLarge',
          );
          chunks.push(chunk.value);
        }
      } catch (error) {
        await reader.cancel().catch(() => undefined);
        if (error instanceof ProjectError) throw error;
        throw new ProjectError('invalid', entry.path, 'deflate');
      }
      check(size === entry.size, entry.path, 'expandedSize');
      data = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }
    }
    check(crc32(data) === entry.crc, entry.path, 'crc32', 'integrity');
    if (!entry.path.endsWith('/')) result[entry.path] = data;
  }
  return result;
}
/** STORE entries guarantee reproducible archives without platform-specific compressor output. */
export function writeZip(
  files: Record<string, Uint8Array>,
  budget: ResourceLimits,
): Uint8Array {
  const names = Object.keys(files).sort();
  check(
    names.length <= budget.entries && names.length < 65535,
    '$zip',
    'entryCount',
    'tooLarge',
  );
  let contentSize = 0,
    centralSize = 0,
    expanded = 0;
  const used = new Set<string>();
  for (const name of names) {
    safePath(name);
    check(!used.has(name.toLowerCase()), name, 'duplicateEntry');
    used.add(name.toLowerCase());
    const size = files[name].length;
    check(size <= budget.entryBytes, name, 'entryBytes', 'tooLarge');
    expanded += size;
    contentSize += 30 + encoder.encode(name).length + size;
    centralSize += 46 + encoder.encode(name).length;
  }
  check(
    expanded <= budget.expandedBytes &&
      contentSize + centralSize + 22 <= budget.archiveBytes,
    '$zip',
    'archiveBytes',
    'tooLarge',
  );
  check(
    contentSize < 0xffffffff &&
      centralSize < 0xffffffff &&
      expanded < 0xffffffff,
    '$zip',
    'zip64',
    'unsupported',
  );
  const bytes = new Uint8Array(contentSize + centralSize + 22),
    view = new DataView(bytes.buffer);
  const u16 = (at: number, value: number) => view.setUint16(at, value, true),
    u32 = (at: number, value: number) => view.setUint32(at, value, true);
  let offset = 0,
    central = contentSize;
  for (const path of names) {
    const name = encoder.encode(path),
      data = files[path],
      crc = crc32(data);
    u32(offset, 0x04034b50);
    u16(offset + 4, 20);
    u16(offset + 6, 0x800);
    u16(offset + 12, 33);
    u32(offset + 14, crc);
    u32(offset + 18, data.length);
    u32(offset + 22, data.length);
    u16(offset + 26, name.length);
    bytes.set(name, offset + 30);
    bytes.set(data, offset + 30 + name.length);
    u32(central, 0x02014b50);
    u16(central + 4, 20);
    u16(central + 6, 20);
    u16(central + 8, 0x800);
    u16(central + 14, 33);
    u32(central + 16, crc);
    u32(central + 20, data.length);
    u32(central + 24, data.length);
    u16(central + 28, name.length);
    u32(central + 42, offset);
    bytes.set(name, central + 46);
    offset += 30 + name.length + data.length;
    central += 46 + name.length;
  }
  u32(central, 0x06054b50);
  u16(central + 8, names.length);
  u16(central + 10, names.length);
  u32(central + 12, centralSize);
  u32(central + 16, contentSize);
  return bytes;
}
