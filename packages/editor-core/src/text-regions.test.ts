import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
} from '@koxora/project';
import {
  applyEdit,
  copyElements,
  defaultTextRegions,
  elementDisplayText,
  fromPlainText,
  isTextRegions,
  MAX_TABLE_CELL_TEXT,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_ROWS,
  MAX_TABLE_TEXT,
  readRichText,
  readTextRegions,
  resolveAppearance,
  richTextJson,
  RICH_TEXT_KEY,
  StudioHistory,
  tableTextSummary,
  TEXT_REGIONS_FEATURE,
  TEXT_REGIONS_KEY,
  type EditCommand,
  type TableTextRegions,
} from './index';

const now = '2026-11-14T12:00:00.000Z';
const id = () => crypto.randomUUID();
const table = (
  cells = [
    ['Name', 'Role'],
    ['Ada 世界', 'Lead'],
  ],
): TableTextRegions => ({ version: 1, type: 'table', cells, headerRow: true });
function fixture(kind: 'container' | 'table' = 'table', initialText = '') {
  let project = createProject('Region review', id, now);
  const documentId = project.documents[0].id;
  const pageId = project.documents[0].pages[0].id;
  const layerId = project.documents[0].pages[0].layers[0].id;
  const nodeId = id();
  const run = (command: EditCommand) =>
    (project = applyEdit(project, documentId, pageId, command, now));
  run({
    type: 'insert',
    id: nodeId,
    kind,
    layerId,
    position: { x: 0, y: 0 },
    text: initialText,
  });
  return {
    get project() {
      return project;
    },
    get node() {
      return project.documents[0].pages[0].nodes[0];
    },
    get page() {
      return project.documents[0].pages[0];
    },
    documentId,
    pageId,
    layerId,
    nodeId,
    run,
    update(regions: TableTextRegions) {
      run({
        type: 'updateNode',
        id: nodeId,
        text: String(project.documents[0].pages[0].nodes[0].content.text ?? ''),
        style: resolveAppearance(project.documents[0].pages[0].nodes[0]),
        textRegions: regions,
      });
    },
  };
}

describe('portable independent text regions', () => {
  it('names supported regions without conflating a container title with its body', () => {
    const f = fixture('container', 'Existing body');
    f.run({
      type: 'updateNode',
      id: f.nodeId,
      text: 'Existing body',
      style: resolveAppearance(f.node),
      textRegions: { version: 1, type: 'container', title: 'Panel title' },
    });
    expect(elementDisplayText(f.node)).toBe('Panel title\nExisting body');
    expect(f.node.content.text).toBe('Existing body');
    f.node.extensions[TEXT_REGIONS_KEY] = {
      version: 2,
      type: 'container',
      title: 'Opaque future title',
    };
    expect(elementDisplayText(f.node)).toBe('Existing body');
    const grid = fixture();
    grid.update(table());
    grid.node.content.text = 'Stale fallback';
    expect(elementDisplayText(grid.node)).toBe('Name\tRole\nAda 世界\tLead');
  });
  it('retains an explicit insertion label in the first cell rather than discarding it', () => {
    const f = fixture('table', 'Initial cell');
    expect(readTextRegions(f.node)).toMatchObject({
      cells: [
        ['Initial cell', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
    });
    expect(f.node.content.text).toBe('Initial cell');
  });
  it('creates a table with independent blank cells and an explicit compatibility feature', async () => {
    const f = fixture();
    expect(readTextRegions(f.node)).toEqual(
      table([
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ]),
    );
    expect(f.project.manifest.requiredFeatures).toContain(TEXT_REGIONS_FEATURE);
    f.update(table());
    expect(f.node.content.text).toBe('Name\tRole\nAda 世界\tLead');
    const reopened = await importProject(await exportProject(f.project));
    expect(reopened.documents).toEqual(f.project.documents);
    expect(readTextRegions(reopened.documents[0].pages[0].nodes[0])).toEqual(
      table(),
    );
  });

  it('preserves legacy container body rich text while adding a separate title', async () => {
    const f = fixture('container', 'Body text');
    delete f.node.extensions[TEXT_REGIONS_KEY];
    f.project.manifest.requiredFeatures =
      f.project.manifest.requiredFeatures.filter(
        (feature) => feature !== TEXT_REGIONS_FEATURE,
      );
    const rich = fromPlainText('Body text');
    rich.paragraphs[0].runs[0].style = { fontWeight: 700 };
    f.node.extensions[RICH_TEXT_KEY] = richTextJson(rich);
    expect(defaultTextRegions(f.node)).toEqual({
      version: 1,
      type: 'container',
      title: '',
    });
    validateProject(f.project);
    f.run({
      type: 'updateNode',
      id: f.nodeId,
      text: 'Body text',
      richText: rich,
      style: resolveAppearance(f.node),
      textRegions: { version: 1, type: 'container', title: 'Separate title' },
    });
    expect(f.node.content.text).toBe('Body text');
    expect(readRichText(f.node)).toEqual(rich);
    expect(readTextRegions(f.node)).toEqual({
      version: 1,
      type: 'container',
      title: 'Separate title',
    });
    const reopened = await importProject(await exportProject(f.project));
    expect(reopened.documents).toEqual(f.project.documents);
  });

  it('keeps table drafts, read views, duplicates and source data independent', () => {
    const f = fixture();
    const draft = table();
    f.update(draft);
    draft.cells[0][0] = 'Changed outside command';
    const view = readTextRegions(f.node)!;
    if (view.type !== 'table') throw new Error('Expected table');
    view.cells[0][0] = 'Changed view';
    expect(readTextRegions(f.node)).toEqual(table());
    const clipboard = copyElements(f.page, [f.nodeId], f.project);
    const copied = id();
    f.run({
      type: 'duplicate',
      ids: [f.nodeId],
      idMap: { [f.nodeId]: copied },
      offset: { x: 400, y: 0 },
    });
    expect(clipboard.nodes[0].extensions[TEXT_REGIONS_KEY]).toEqual(table());
    const changed = table([
      ['New', 'Header'],
      ['Other', 'Data'],
    ]);
    f.run({
      type: 'updateNode',
      id: copied,
      text: '',
      style: resolveAppearance(f.page.nodes[1]),
      textRegions: changed,
    });
    expect(readTextRegions(f.node)).toEqual(table());
    expect(readTextRegions(f.page.nodes[1])).toEqual(changed);
    expect(f.page.nodes[1].id).not.toBe(f.node.id);
  });

  it('records cell edits as one history operation and retains conservative compatibility through undo', () => {
    const f = fixture();
    const history = new StudioHistory();
    const before = structuredClone(f.project.documents);
    let project = history.execute(
      f.project,
      f.documentId,
      f.pageId,
      {
        type: 'updateNode',
        id: f.nodeId,
        text: '',
        style: resolveAppearance(f.node),
        textRegions: table(),
      },
      now,
    );
    expect(history.status().undo).toBe(1);
    const after = structuredClone(project.documents);
    project = history.travel(project, f.documentId, f.pageId, 'undo', now);
    expect(project.documents).toEqual(before);
    expect(project.manifest.requiredFeatures).toContain(TEXT_REGIONS_FEATURE);
    project = history.travel(project, f.documentId, f.pageId, 'redo', now);
    expect(project.documents).toEqual(after);
    validateProject(project);
  });

  it('retains optional extension data while updating only supported fields', () => {
    const f = fixture();
    const raw = f.node.extensions[TEXT_REGIONS_KEY] as Record<string, unknown>;
    raw['org.example.keep'] = { arbitrary: ['preserve', 42] };
    const unknown = structuredClone(raw['org.example.keep']);
    f.update(table());
    expect(
      (f.node.extensions[TEXT_REGIONS_KEY] as Record<string, unknown>)[
        'org.example.keep'
      ],
    ).toEqual(unknown);
  });

  it('refuses missing feature declarations and malformed known payloads', () => {
    const f = fixture();
    const missing = structuredClone(f.project);
    missing.manifest.requiredFeatures =
      missing.manifest.requiredFeatures.filter(
        (feature) => feature !== TEXT_REGIONS_FEATURE,
      );
    expect(() => validateProject(missing)).toThrow();
    for (const payload of [
      { version: 1, type: 'table', cells: [], headerRow: true },
      {
        version: 1,
        type: 'table',
        cells: [['one'], ['two', 'three']],
        headerRow: true,
      },
      { version: 1, type: 'table', cells: [[false]], headerRow: true },
      { version: 1, type: 'table', cells: [['x']], headerRow: 'yes' },
      { version: 1, type: 'container', title: 'Wrong node kind' },
    ]) {
      const broken = structuredClone(f.project);
      broken.documents[0].pages[0].nodes[0].extensions[TEXT_REGIONS_KEY] =
        payload;
      expect(() => validateProject(broken)).toThrow();
    }
  });

  it('enforces rectangular table and bounded text before applying any changes', () => {
    const f = fixture();
    const before = structuredClone(f.project);
    const tooManyRows = table(
      Array.from({ length: MAX_TABLE_ROWS + 1 }, () => ['']),
    );
    const tooManyColumns = table([
      Array.from({ length: MAX_TABLE_COLUMNS + 1 }, () => ''),
    ]);
    const longCell = table([['x'.repeat(MAX_TABLE_CELL_TEXT + 1)]]);
    const excessiveTotal = table(
      Array.from({ length: MAX_TABLE_ROWS }, () =>
        Array.from({ length: MAX_TABLE_COLUMNS }, () =>
          'x'.repeat(
            Math.ceil(MAX_TABLE_TEXT / (MAX_TABLE_ROWS * MAX_TABLE_COLUMNS)) +
              1,
          ),
        ),
      ),
    );
    for (const invalid of [
      tooManyRows,
      tooManyColumns,
      longCell,
      excessiveTotal,
    ]) {
      expect(isTextRegions(invalid, 'table')).toBe(false);
      expect(() => f.update(invalid)).toThrow('invalid');
      expect(f.project).toEqual(before);
    }
    const valid = table(
      Array.from({ length: MAX_TABLE_ROWS }, () =>
        Array.from({ length: MAX_TABLE_COLUMNS }, () => ''),
      ),
    );
    expect(isTextRegions(valid, 'table')).toBe(true);
  });

  it('preserves future data as read-only and rejects protected node changes atomically', async () => {
    const f = fixture();
    const future = structuredClone(f.project);
    const payload = { version: 2, type: 'table', futureData: ['unknown', 42] };
    future.documents[0].pages[0].nodes[0].extensions[TEXT_REGIONS_KEY] =
      payload;
    validateProject(future);
    const roundtrip = await importProject(await exportProject(future));
    expect(
      roundtrip.documents[0].pages[0].nodes[0].extensions[TEXT_REGIONS_KEY],
    ).toEqual(payload);
    expect(
      readTextRegions(roundtrip.documents[0].pages[0].nodes[0]),
    ).toBeNull();
    expect(
      defaultTextRegions(roundtrip.documents[0].pages[0].nodes[0]),
    ).toBeNull();
    const before = structuredClone(future);
    expect(() =>
      applyEdit(
        future,
        f.documentId,
        f.pageId,
        {
          type: 'updateNode',
          id: f.nodeId,
          text: '',
          style: resolveAppearance(f.node),
          textRegions: table(),
        },
        now,
      ),
    ).toThrow('unsupported');
    expect(future).toEqual(before);
    f.page.layers[0].locked = true;
    expect(() => f.update(table())).toThrow('layer');
  });

  it('does not reinterpret a previously opaque foreign table kind without our extension', async () => {
    const f = fixture();
    delete f.node.extensions[TEXT_REGIONS_KEY];
    f.node.content.text = 'Foreign drawing data';
    const before = structuredClone(f.project);
    validateProject(f.project);
    expect(
      (await importProject(await exportProject(f.project))).documents,
    ).toEqual(before.documents);
    expect(() =>
      f.run({
        type: 'move',
        ids: [f.nodeId],
        delta: { x: 1, y: 0 },
        snap: false,
        spacing: 24,
      }),
    ).toThrow('unsupported');
    expect(f.project).toEqual(before);
  });

  it('allows normal style/geometry edits but does not let generic label operations overwrite cells', () => {
    const f = fixture();
    f.update(table());
    f.run({
      type: 'updateNode',
      id: f.nodeId,
      text: String(f.node.content.text),
      style: { ...resolveAppearance(f.node), fill: '#123456' },
      geometry: { ...f.node.geometry, width: 500 },
    });
    expect(readTextRegions(f.node)).toEqual(table());
    const before = structuredClone(f.project);
    expect(() =>
      f.run({
        type: 'updateNode',
        id: f.nodeId,
        text: 'Unrelated label',
        style: resolveAppearance(f.node),
      }),
    ).toThrow('unsupported');
    expect(() =>
      f.run({
        type: 'richText',
        id: f.nodeId,
        value: fromPlainText('Overwrite'),
      }),
    ).toThrow();
    expect(f.project).toEqual(before);
    expect(tableTextSummary(table())).toBe('Name\tRole\nAda 世界\tLead');
  });
  it('keeps foreign global rich-text on a table intact and refuses edits that would ignore it', async () => {
    const f = fixture();
    f.update(table());
    const globalRich = fromPlainText(String(f.node.content.text));
    f.node.extensions[RICH_TEXT_KEY] = richTextJson(globalRich);
    validateProject(f.project);
    const before = structuredClone(f.project);
    expect(() => f.update(table([['Changed']]))).toThrow('unsupported');
    expect(f.project).toEqual(before);
    const reopened = await importProject(await exportProject(f.project));
    expect(
      reopened.documents[0].pages[0].nodes[0].extensions[RICH_TEXT_KEY],
    ).toEqual(globalRich);
    expect(reopened.documents).toEqual(before.documents);
  });
});
