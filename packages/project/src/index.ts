/** Portable JSON values only: extension content is inert and never executed. */
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Extensible {
  [key: string]: Json;
  extensions: { [namespace: string]: Json };
}
export interface Node extends Extensible {
  id: string;
  kind: string;
  x: number;
  y: number;
}
export interface Connection extends Extensible {
  id: string;
  sourceId: string;
  targetId: string;
}
export interface Page extends Extensible {
  id: string;
  type: string;
  title: string;
  nodes: Node[];
  connections: Connection[];
}
export interface Project extends Extensible {
  format: 'koxora-project';
  schemaVersion: string;
  minReaderVersion: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  requiredFeatures: string[];
  pages: Page[];
}
export type ErrorCode =
  'invalid' | 'unsupported' | 'tooLarge' | 'storage' | 'conflict' | 'missing';
export class ProjectError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
  }
}
export const CURRENT_VERSION = '1.0.0';
export const MAX_BYTES = 8 * 1024 * 1024;
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function isId(value: unknown): value is string {
  return typeof value === 'string' && uuid.test(value);
}
function fail(code: ErrorCode = 'invalid'): never {
  throw new ProjectError(code);
}
function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
}
function string(value: unknown, max = 1024): asserts value is string {
  if (typeof value !== 'string' || value.length > max || !value.trim()) fail();
}
function version(value: unknown): number[] {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
  )
    fail();
  const parts = value.split('.').map(Number);
  if (parts.some((p) => !Number.isSafeInteger(p))) fail();
  return parts;
}
function compare(a: number[], b: number[]) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
function json(value: unknown, depth = 0, budget = { remaining: 200000 }): void {
  if (--budget.remaining < 0 || depth > 64) fail('tooLarge');
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return;
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    (!Number.isInteger(value) || Number.isSafeInteger(value))
  )
    return;
  if (Array.isArray(value)) {
    for (const item of value) json(item, depth + 1, budget);
    return;
  }
  record(value);
  if (
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    fail();
  for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) fail();
    json(item, depth + 1, budget);
  }
}
function extensions(value: Record<string, unknown>) {
  record(value.extensions);
}
export function validateProject(input: unknown): asserts input is Project {
  json(input);
  record(input);
  if (input.format !== 'koxora-project') fail();
  const schema = version(input.schemaVersion),
    reader = version(input.minReaderVersion);
  if (schema[0] !== 1 || compare(reader, version(CURRENT_VERSION)) > 0)
    fail('unsupported');
  if (compare(reader, schema) > 0) fail();
  if (
    !Array.isArray(input.requiredFeatures) ||
    input.requiredFeatures.some((f) => typeof f !== 'string')
  )
    fail();
  if (input.requiredFeatures.some((f) => !['nodes', 'connections'].includes(f)))
    fail('unsupported');
  string(input.title);
  extensions(input);
  for (const key of ['createdAt', 'updatedAt']) {
    if (
      typeof input[key] !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input[key]) ||
      !Number.isFinite(Date.parse(input[key])) ||
      new Date(input[key]).toISOString() !== input[key]
    )
      fail();
  }
  if (String(input.updatedAt) < String(input.createdAt)) fail();
  const ids = new Set<string>();
  function id(value: unknown) {
    if (!isId(value) || ids.has(value)) fail();
    ids.add(value);
  }
  id(input.projectId);
  if (
    !Array.isArray(input.pages) ||
    input.pages.length < 1 ||
    input.pages.length > 1000
  )
    fail();
  for (const page of input.pages) {
    record(page);
    id(page.id);
    string(page.title);
    string(page.type);
    extensions(page);
    if (!Array.isArray(page.nodes) || !Array.isArray(page.connections)) fail();
    const nodes = new Set<string>();
    for (const node of page.nodes) {
      record(node);
      id(node.id);
      nodes.add(node.id as string);
      string(node.kind);
      extensions(node);
      if (typeof node.x !== 'number' || typeof node.y !== 'number') fail();
    }
    for (const edge of page.connections) {
      record(edge);
      id(edge.id);
      extensions(edge);
      if (
        !nodes.has(edge.sourceId as string) ||
        !nodes.has(edge.targetId as string)
      )
        fail();
    }
  }
}
export interface Migration {
  from: string;
  to: string;
  migrate: (input: unknown) => unknown;
}
/** Future migrations are explicit, sequential, pure transformations of a copy. No legacy format is invented. */
export function migrateProject(
  input: unknown,
  migrations: readonly Migration[] = [],
): Project {
  json(input);
  record(input);
  version(input.schemaVersion);
  let result: unknown = structuredClone(input);
  const seen = new Set<string>();
  while (true) {
    record(result);
    const current = result.schemaVersion as string;
    const migration = migrations.find((item) => item.from === current);
    if (!migration) break;
    if (
      seen.has(current) ||
      compare(version(migration.to), version(current)) <= 0 ||
      compare(version(migration.to), version(CURRENT_VERSION)) > 0
    )
      fail('unsupported');
    seen.add(current);
    result = migration.migrate(structuredClone(result));
    json(result);
    record(result);
    if (result.schemaVersion !== migration.to) fail();
  }
  validateProject(result);
  return result;
}
export function parseProject(
  text: string,
  migrations: readonly Migration[] = [],
): Project {
  if (new TextEncoder().encode(text).length > MAX_BYTES) fail('tooLarge');
  // JSON.parse accepts duplicate keys with silent last-value wins; reject that ambiguity.
  const objects: (Set<string> | null)[] = [];
  const tokens = /"(?:[^"\\]|\\.)*"|[{}[\]]/g;
  for (const match of text.matchAll(tokens)) {
    const token = match[0];
    if (token === '{') objects.push(new Set());
    else if (token === '[') objects.push(null);
    else if (token === '}' || token === ']') objects.pop();
    else if (/^\s*:/.test(text.slice(match.index! + token.length))) {
      let key: string;
      try {
        key = JSON.parse(token);
      } catch {
        return fail();
      }
      const keys = objects.at(-1);
      if (keys?.has(key)) fail();
      keys?.add(key);
    }
    if (objects.length > 64) fail('tooLarge');
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return fail();
  }
  return migrateProject(value, migrations);
}
function canonical(value: Json): Json {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
export function serializeProject(project: Project): string {
  validateProject(project);
  const text = JSON.stringify(canonical(project), null, 2) + '\n';
  if (new TextEncoder().encode(text).length > MAX_BYTES) fail('tooLarge');
  return text;
}
export function createProject(
  title: string,
  makeId: () => string,
  now: string,
): Project {
  const project: Project = {
    format: 'koxora-project',
    schemaVersion: CURRENT_VERSION,
    minReaderVersion: CURRENT_VERSION,
    projectId: makeId(),
    title,
    createdAt: now,
    updatedAt: now,
    requiredFeatures: ['nodes', 'connections'],
    extensions: {},
    pages: [
      {
        id: makeId(),
        type: 'diagram',
        title,
        nodes: [],
        connections: [],
        extensions: {},
      },
    ],
  };
  validateProject(project);
  return project;
}
