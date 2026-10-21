import type { Json } from './types';
export type ErrorCode =
  | 'invalid'
  | 'unsupported'
  | 'tooLarge'
  | 'integrity'
  | 'storage'
  | 'conflict'
  | 'missing';
export class ProjectError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly path = '$',
    public readonly reason: string = code,
  ) {
    super(`${code}: ${path} (${reason})`);
  }
}
export interface ResourceLimits {
  archiveBytes: number;
  expandedBytes: number;
  entryBytes: number;
  jsonBytes: number;
  entries: number;
  compressionRatio: number;
  depth: number;
  values: number;
}
/** Budgets cover portable in-memory projects; callers may lower them without changing the file schema. */
export const DEFAULT_LIMITS: Readonly<ResourceLimits> = Object.freeze({
  archiveBytes: 64 * 1024 * 1024,
  expandedBytes: 64 * 1024 * 1024,
  entryBytes: 32 * 1024 * 1024,
  jsonBytes: 8 * 1024 * 1024,
  entries: 4096,
  compressionRatio: 200,
  depth: 64,
  values: 1000000,
});
export function limits(options: Partial<ResourceLimits> = {}): ResourceLimits {
  const result = { ...DEFAULT_LIMITS, ...options };
  for (const [key, value] of Object.entries(result))
    if (!Number.isSafeInteger(value) || value < 1)
      throw new ProjectError('invalid', key, 'limit');
  return result;
}
export function check(
  condition: unknown,
  path: string,
  reason = 'schema',
  code: ErrorCode = 'invalid',
): asserts condition {
  if (!condition) throw new ProjectError(code, path, reason);
}
export function record(
  value: unknown,
  path: string,
): asserts value is Record<string, unknown> {
  check(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    path,
    'object',
  );
}
export function text(
  value: unknown,
  path: string,
  max = 4096,
): asserts value is string {
  check(
    typeof value === 'string' && value.trim().length > 0 && value.length <= max,
    path,
    'text',
  );
}
export function array(
  value: unknown,
  path: string,
): asserts value is unknown[] {
  check(Array.isArray(value), path, 'array');
}
export function number(
  value: unknown,
  path: string,
  min = -Number.MAX_SAFE_INTEGER,
): asserts value is number {
  check(
    typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= min &&
      (!Number.isInteger(value) || Number.isSafeInteger(value)),
    path,
    'number',
  );
}
export function boolean(
  value: unknown,
  path: string,
): asserts value is boolean {
  check(typeof value === 'boolean', path, 'boolean');
}
export const isId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    value,
  );
export function id(value: unknown, path: string): asserts value is string {
  check(isId(value), path, 'uuid');
}
export function namespace(value: unknown, path: string) {
  text(value, path);
  check(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(value), path, 'namespace');
}
export function version(value: unknown, path: string): number[] {
  text(value, path);
  check(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value),
    path,
    'version',
  );
  const parts = value.split('.').map(Number);
  check(parts.every(Number.isSafeInteger), path, 'version');
  return parts;
}
export function compatible(value: unknown, path: string) {
  const v = version(value, path);
  check(v[0] === 1, path, 'version', 'unsupported');
}
export function reader(value: unknown, path: string) {
  const v = version(value, path);
  check(
    v[0] < 1 || (v[0] === 1 && v[1] === 0 && v[2] === 0),
    path,
    'reader',
    'unsupported',
  );
}
export function json(
  value: unknown,
  path = '$',
  budget = { left: DEFAULT_LIMITS.values },
  depth = 0,
  maxDepth = DEFAULT_LIMITS.depth,
): asserts value is Json {
  check(
    --budget.left >= 0 && depth <= maxDepth,
    path,
    'complexity',
    'tooLarge',
  );
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return;
  if (typeof value === 'number') {
    number(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) =>
      json(v, `${path}[${i}]`, budget, depth + 1, maxDepth),
    );
    return;
  }
  record(value, path);
  check(
    Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null,
    path,
    'plainObject',
  );
  for (const [key, item] of Object.entries(value)) {
    check(
      !['__proto__', 'prototype', 'constructor'].includes(key),
      `${path}.${key}`,
      'unsafeKey',
    );
    json(item, `${path}.${key}`, budget, depth + 1, maxDepth);
  }
}
export function parseJson(
  bytes: Uint8Array,
  path: string,
  budget: ResourceLimits,
  values = { left: budget.values },
): unknown {
  check(bytes.length <= budget.jsonBytes, path, 'jsonBytes', 'tooLarge');
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ProjectError('invalid', path, 'utf8');
  }
  const objects: (Set<string> | null)[] = [];
  try {
    // Scan without recursive regular expressions: a single large string must
    // not exhaust the regexp engine's stack. JSON.parse checks grammar below.
    for (let at = 0; at < source.length; at++) {
      const token = source[at];
      if (token === '{') objects.push(new Set());
      else if (token === '[') objects.push(null);
      else if (token === '}' || token === ']') objects.pop();
      else if (token === '"') {
        const start = at++;
        while (at < source.length && source[at] !== '"') {
          if (source[at] === '\\') at++;
          at++;
        }
        let next = at + 1;
        while (next < source.length && /[ \t\r\n]/.test(source[next])) next++;
        if (source[next] === ':') {
          const key: string = JSON.parse(source.slice(start, at + 1));
          const keys = objects.at(-1);
          check(!keys?.has(key), path, 'duplicateKey');
          keys?.add(key);
        }
      }
      check(objects.length <= budget.depth, path, 'depth', 'tooLarge');
    }
    const result: unknown = JSON.parse(source);
    json(result, path, values, 0, budget.depth);
    return result;
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectError('invalid', path, 'json');
  }
}
export function canonical(
  value: unknown,
  budget: ResourceLimits = DEFAULT_LIMITS,
): string {
  json(value, '$', { left: budget.values }, 0, budget.depth);
  function ordered(v: Json): Json {
    if (Array.isArray(v)) return v.map(ordered);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((key) => [key, ordered(v[key]!)]),
      );
    return v;
  }
  return JSON.stringify(ordered(value), null, 2) + '\n';
}
export async function sha256(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer),
    ),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
}
