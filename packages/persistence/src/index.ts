import {
  isId,
  parseProject,
  ProjectError,
  serializeProject,
  type Project,
} from '@koxora/project';
export interface SnapshotStore {
  keys(): Promise<string[]>;
  read(id: string): Promise<string | null>;
  readPrevious?(id: string): Promise<string | null>;
  /** Atomic compare-and-swap. A rejected write must retain the last committed value. */
  write(id: string, expected: string | null, value: string): Promise<void>;
}
interface RecordData {
  current: string;
  previous: string | null;
  recoverySource?: string;
}
export interface OpenProject {
  project: Project;
  token: string;
  recovered: boolean;
}
function envelope(raw: string): RecordData {
  try {
    const data = JSON.parse(raw) as RecordData;
    if (
      !data ||
      typeof data.current !== 'string' ||
      (data.previous !== null && typeof data.previous !== 'string') ||
      (data.recoverySource !== undefined &&
        typeof data.recoverySource !== 'string')
    )
      throw new Error();
    return data;
  } catch {
    throw new ProjectError('invalid');
  }
}
export class ProjectRepository {
  constructor(private readonly store: SnapshotStore) {}
  async list(): Promise<{ id: string; title: string | null }[]> {
    const keys = await this.store.keys();
    const items: { id: string; title: string | null }[] = [];
    // A project can contain large embedded assets. Bound list discovery to one
    // decoded archive at a time rather than multiplying peak memory by count.
    for (const id of keys) {
      try {
        items.push({ id, title: (await this.open(id)).project.manifest.title });
      } catch (error) {
        if (
          error instanceof ProjectError &&
          [
            'invalid',
            'integrity',
            'unsupported',
            'tooLarge',
            'storage',
            'missing',
          ].includes(error.code)
        ) {
          items.push({ id, title: null });
        } else throw error;
      }
    }
    return items;
  }
  async open(id: string, previous = false): Promise<OpenProject> {
    const raw = await this.store.read(id);
    if (raw === null) throw new ProjectError('missing');
    let project: Project;
    try {
      const data = envelope(raw);
      const text = previous ? data.previous : data.current;
      if (text === null) throw new ProjectError('missing');
      project = await parseProject(text);
    } catch (error) {
      if (!previous || !this.store.readPrevious) throw error;
      const backup = await this.store.readPrevious(id);
      if (backup === null) throw error;
      project = await parseProject(envelope(backup).current);
    }
    if (project.manifest.projectId !== id) throw new ProjectError('invalid');
    return { project, token: raw, recovered: previous };
  }
  async save(project: Project, expected: string | null): Promise<string> {
    const current = await serializeProject(project);
    // Retain the prior bytes when the user explicitly restores a previous save.
    let previous: string | null = null;
    let recoverySource: string | undefined;
    if (expected !== null) {
      let old: RecordData;
      try {
        old = envelope(expected);
      } catch {
        old = { current: '', previous: null, recoverySource: expected };
      }
      recoverySource = old.recoverySource;
      if (old.current === current) {
        await this.store.write(project.manifest.projectId, expected, expected);
        return expected;
      }
      // Preserve even an unsupported or corrupt head byte-for-byte. Recovery is
      // explicit; parsing the backup here would silently discard future data.
      previous = old.current || null;
    }
    const next = JSON.stringify({
      current,
      previous,
      ...(recoverySource === undefined ? {} : { recoverySource }),
    });
    await this.store.write(project.manifest.projectId, expected, next);
    return next;
  }
}
export class IndexedDbStore implements SnapshotStore {
  constructor(private readonly factory: () => IDBFactory = () => indexedDB) {}
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      let blocked = false;
      try {
        request = this.factory().open('koxora-projects', 1);
      } catch {
        reject(new ProjectError('storage'));
        return;
      }
      request.onupgradeneeded = () =>
        request.result.createObjectStore('projects');
      request.onerror = () => reject(new ProjectError('storage'));
      request.onblocked = () => {
        blocked = true;
        reject(new ProjectError('storage'));
      };
      request.onsuccess = () => {
        if (blocked) {
          request.result.close();
          return;
        }
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
  }
  private async transaction<T>(
    mode: IDBTransactionMode,
    action: (
      store: IDBObjectStore,
      result: (value: T) => void,
      conflict: () => void,
    ) => void,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      let value: T;
      let conflict = false;
      let tx: IDBTransaction;
      try {
        tx = db.transaction('projects', mode);
        tx.oncomplete = () => {
          db.close();
          resolve(value);
        };
        tx.onabort = tx.onerror = () => {
          db.close();
          reject(new ProjectError(conflict ? 'conflict' : 'storage'));
        };
        action(
          tx.objectStore('projects'),
          (next) => {
            value = next;
          },
          () => {
            conflict = true;
            tx.abort();
          },
        );
      } catch {
        db.close();
        reject(new ProjectError('storage'));
      }
    });
  }
  keys() {
    return this.transaction<string[]>('readonly', (store, done) => {
      const request = store.getAllKeys();
      request.onsuccess = () => done(request.result.filter(isId));
    });
  }
  read(id: string) {
    return this.transaction<string | null>('readonly', (store, done) => {
      const request = store.get(id);
      request.onsuccess = () =>
        done(request.result === undefined ? null : request.result);
    });
  }
  write(id: string, expected: string | null, value: string) {
    if (!isId(id)) return Promise.reject(new ProjectError('invalid'));
    return this.transaction<void>('readwrite', (store, done, conflict) => {
      const request = store.get(id);
      request.onsuccess = () => {
        if ((request.result ?? null) !== expected) {
          conflict();
          return;
        }
        try {
          store.put(value, id);
          done(undefined);
        } catch {
          store.transaction.abort();
        }
      };
    });
  }
}
export type Invoke = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;
export class NativeStore implements SnapshotStore {
  constructor(private readonly invoke: Invoke) {}
  private async call<T>(
    operation: string,
    args?: Record<string, unknown>,
  ): Promise<T> {
    try {
      return await this.invoke<T>(operation, args);
    } catch (error) {
      throw new ProjectError(error === 'conflict' ? 'conflict' : 'storage');
    }
  }
  keys() {
    return this.call<string[]>('project_list');
  }
  read(id: string) {
    return this.call<string | null>('project_read', { id });
  }
  readPrevious(id: string) {
    return this.call<string | null>('project_read_previous', { id });
  }
  write(id: string, expected: string | null, value: string) {
    return this.call<void>('project_write', { id, expected, value });
  }
}
