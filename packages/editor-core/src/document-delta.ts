import type { Json, Project } from '@koxora/project';
type Step = string | number | { id: string };
type Value = Json | undefined;
type RecordValue = Record<string, Value>;
interface Field {
  kind: 'field';
  path: Step[];
  before: Value;
  after: Value;
}
interface Order {
  kind: 'order';
  path: Step[];
  before: string[];
  after: string[];
  removed: Value[];
  added: Value[];
}
export type DocumentDelta = (Field | Order)[];
const record = (v: Value): v is RecordValue =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const identified = (v: Json[]) =>
  v.every((x) => record(x) && typeof x.id === 'string');
/** ID-addressed deltas avoid retaining unchanged pages, assets and opaque metadata. */
export function documentDelta(
  before: Project['documents'],
  after: Project['documents'],
): DocumentDelta {
  const result: DocumentDelta = [];
  function visit(b: Value, a: Value, path: Step[]) {
    if (b === a) return;
    if (
      Array.isArray(b) &&
      Array.isArray(a) &&
      identified(b) &&
      identified(a)
    ) {
      const old = new Map(b.map((x) => [(x as RecordValue).id as string, x])),
        next = new Map(a.map((x) => [(x as RecordValue).id as string, x]));
      for (const [id, item] of old)
        if (next.has(id)) visit(item, next.get(id), [...path, { id }]);
      const before = [...old.keys()],
        after = [...next.keys()];
      if (JSON.stringify(before) !== JSON.stringify(after))
        result.push({
          kind: 'order',
          path,
          before,
          after,
          removed: b.filter((x) => !next.has((x as RecordValue).id as string)),
          added: a.filter((x) => !old.has((x as RecordValue).id as string)),
        });
    } else if (record(b) && record(a)) {
      for (const key of new Set([...Object.keys(b), ...Object.keys(a)]))
        visit(b[key], a[key], [...path, key]);
    } else if (JSON.stringify(b) !== JSON.stringify(a))
      result.push({ kind: 'field', path, before: b, after: a });
  }
  visit(before, after, []);
  return result;
}
export function restoreDocuments(
  documents: Project['documents'],
  delta: DocumentDelta,
  undo: boolean,
): Project['documents'] {
  let root: Value = documents;
  function update(
    value: Value,
    path: Step[],
    fn: (value: Value) => Value,
  ): Value {
    if (!path.length) return fn(value);
    const [step, ...rest] = path;
    if (Array.isArray(value)) {
      const index =
        typeof step === 'object'
          ? value.findIndex((x) => record(x) && x.id === step.id)
          : Number(step);
      if (index < 0 || index >= value.length)
        throw new Error('History path is missing');
      const next = [...value];
      next[index] = update(value[index], rest, fn) as Json;
      return next;
    }
    if (!record(value) || typeof step === 'object')
      throw new Error('History path is invalid');
    const next = { ...value },
      v = update(value[String(step)], rest, fn);
    if (v === undefined) delete next[String(step)];
    else next[String(step)] = v;
    return next;
  }
  for (const patch of delta)
    root = update(root, patch.path, (value) => {
      if (patch.kind === 'field') {
        const expected = undo ? patch.after : patch.before;
        if (JSON.stringify(value) !== JSON.stringify(expected))
          throw new Error('History conflict');
        return undo ? patch.before : patch.after;
      }
      if (!Array.isArray(value)) throw new Error('History array missing');
      const order = undo ? patch.before : patch.after;
      const current = new Map(
        value.map((x) => [(x as RecordValue).id as string, x]),
      );
      for (const x of undo ? patch.removed : patch.added)
        current.set((x as RecordValue).id as string, x as Json);
      return order.map((id) => {
        const item = current.get(id);
        if (!item) throw new Error('History item missing');
        return item;
      });
    });
  return root as Project['documents'];
}
