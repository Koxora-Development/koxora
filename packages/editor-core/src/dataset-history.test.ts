import { describe, expect, it } from 'vitest';
import {
  COLLECTIONS,
  createProject,
  DEFAULT_LIMITS,
  exportProject,
  importProject,
  synchronizeIndexes,
  type Dataset,
} from '@koxora/project';
import { buildDataChart } from './data-charts';
import { applyEdit } from './editing';
import { activePageId, selectPage, writeCanvas } from './project-view';
import { StudioHistory } from './studio-history';
import { copyTemplateProject } from './templates';
import { applyWorkbook } from './workbook';

const now = '2026-11-25T10:00:00.000Z';
const makeId = () => crypto.randomUUID();

function dataset(title: string): Dataset {
  const fieldId = makeId();
  return {
    id: makeId(),
    schemaVersion: '1.0.0',
    title,
    fields: [
      {
        id: fieldId,
        name: 'Count',
        type: 'number',
        nullable: false,
        extensions: {},
      },
    ],
    rows: [{ [fieldId]: 12 }],
    source: { type: 'csv' },
    extensions: {},
  };
}

describe('studio dataset history', () => {
  it('interleaves stored data and canvas edits while dataset travel preserves the current view', async () => {
    const history = new StudioHistory();
    const base = createProject('Workbook', makeId, now);
    const documentId = base.documents[0].id;
    const book = applyWorkbook(
      base,
      { type: 'newPage', title: 'Details', documentId },
      makeId,
      now,
    );
    const [first, second] = book.documents[0].pages;
    const input = dataset('Orders');
    const added = await history.addDataset(book, input, now);
    input.rows[0][input.fields[0].id] = 99;
    expect(added.datasets[0].rows[0]).toEqual({ [input.fields[0].id]: 12 });
    expect(added.indexes.datasets.items.map((item) => item.id)).toEqual([
      input.id,
    ]);
    expect(base.datasets).toEqual([]);

    const nodeId = makeId();
    const drawn = history.execute(
      added,
      documentId,
      first.id,
      {
        type: 'insert',
        id: nodeId,
        kind: 'rectangle',
        position: { x: 0, y: 0 },
        layerId: first.layers[0].id,
      },
      now,
    );
    const undoDrawing = history.travel(
      drawn,
      documentId,
      first.id,
      'undo',
      now,
    );
    expect(undoDrawing.documents[0].pages[0].nodes).toEqual([]);
    expect(undoDrawing.datasets).toEqual(added.datasets);

    const viewed = writeCanvas(
      selectPage(undoDrawing, documentId, second.id),
      documentId,
      second.id,
      {
        camera: { x: 80, y: -120, zoom: 2 },
        grid: { visible: false, snap: true, spacing: 24 },
      },
    );
    const undoData = history.travel(viewed, documentId, second.id, 'undo', now);
    expect(undoData.datasets).toEqual([]);
    expect(undoData.indexes.datasets.items).toEqual([]);
    expect(activePageId(undoData)).toBe(second.id);
    expect(undoData.documents).toBe(viewed.documents);

    const redoData = history.travel(
      undoData,
      documentId,
      second.id,
      'redo',
      now,
    );
    expect(redoData.datasets).toEqual(added.datasets);
    expect(activePageId(redoData)).toBe(second.id);
    const redoDrawing = history.travel(
      redoData,
      documentId,
      second.id,
      'redo',
      now,
    );
    expect(redoDrawing.documents[0].pages[0].nodes[0].id).toBe(nodeId);
    expect(redoDrawing.datasets).toEqual(added.datasets);
  });

  it('removes reopened data from the archive and restores its order and opaque descriptors on undo', async () => {
    const history = new StudioHistory();
    const base = createProject('Workbook', makeId, now);
    const first = dataset('January');
    const second = dataset('February');
    const populated = await history.addDataset(
      await history.addDataset(base, first, now),
      second,
      now,
    );
    populated.indexes.datasets.items[0].extensions['org.example.index'] = {
      position: 4,
    };
    const reopened = await importProject(await exportProject(populated));
    const path = `datasets/${first.id}.json`;
    reopened.manifest.resources[path].extensions['org.example.resource'] = {
      tag: 'old',
    };
    const undo = new StudioHistory();
    const removed = undo.removeDataset(reopened, first.id, now);
    expect(removed.datasets.map((item) => item.id)).toEqual([second.id]);
    expect(removed.manifest.resources[path]).toBeUndefined();
    const roundTrip = await importProject(await exportProject(removed));
    expect(roundTrip.datasets.map((item) => item.id)).toEqual([second.id]);

    const doc = reopened.documents[0];
    const restored = undo.travel(removed, doc.id, doc.pages[0].id, 'undo', now);
    expect(restored.datasets).toEqual(reopened.datasets);
    expect(restored.indexes.datasets).toEqual(reopened.indexes.datasets);
    const restoredArchive = await importProject(await exportProject(restored));
    expect(restoredArchive.manifest.resources[path].extensions).toEqual({
      'org.example.resource': { tag: 'old' },
    });
    expect(
      undo.travel(restored, doc.id, doc.pages[0].id, 'redo', now).datasets,
    ).toEqual(removed.datasets);
  });

  it.each(['node', 'filter', 'model', 'template'] as const)(
    'rejects removing data used by a %s',
    async (reference) => {
      const base = createProject('Workbook', makeId, now);
      const data = dataset('Orders');
      const current = await new StudioHistory().addDataset(base, data, now);
      const standalone =
        reference === 'template'
          ? createProject('Template', makeId, now)
          : current;
      const doc = standalone.documents[0];
      const page = doc.pages[0];
      const id = makeId();
      const drawn = applyEdit(
        standalone,
        doc.id,
        page.id,
        {
          type: 'insert',
          id,
          kind: 'rectangle',
          position: { x: 0, y: 0 },
          layerId: page.layers[0].id,
        },
        now,
      );
      const edited = drawn.documents[0];
      const binding = { datasetId: data.id, fieldId: data.fields[0].id };
      if (reference === 'model')
        edited.domainModels.push({
          namespace: 'org.example.data',
          schemaVersion: '1.0.0',
          required: false,
          references: [binding.fieldId],
          data: {},
          extensions: {},
        });
      else if (reference === 'filter')
        edited.actions.push({
          id: makeId(),
          targetId: id,
          trigger: 'click',
          operation: 'filter',
          parameters: { ...binding, value: 12 },
          extensions: {},
        });
      else edited.pages[0].nodes[0].dataBindings = [binding];

      const bound =
        reference === 'template'
          ? synchronizeIndexes({
              ...current,
              templates: [
                {
                  id: makeId(),
                  schemaVersion: '1.0.0',
                  title: 'Template',
                  document: edited,
                  extensions: {},
                },
              ],
            })
          : drawn;
      const history = new StudioHistory();
      expect(() => history.removeDataset(bound, data.id, now)).toThrow(
        'references',
      );
      expect(history.status()).toEqual({ undo: 0, redo: 0 });
      expect(bound.datasets).toEqual([data]);
    },
  );

  it('leaves history and project untouched when the entry is too large or the ID is missing', async () => {
    const history = new StudioHistory(100, 128);
    const base = createProject('Workbook', makeId, now);
    await expect(
      history.addDataset(base, dataset('Orders'), now),
    ).rejects.toThrow('historyLimit');
    expect(history.removeDataset(base, makeId(), now)).toBe(base);
    expect(history.status()).toEqual({ undo: 0, redo: 0 });
    expect(base.datasets).toEqual([]);
  });

  it('rejects imports that exceed the whole archive entry limit before changing history', async () => {
    const history = new StudioHistory();
    const base = createProject('Workbook', makeId, now);
    const optionalFileCount =
      DEFAULT_LIMITS.entries - 1 - COLLECTIONS.length - base.documents.length;
    const bounded = {
      ...base,
      files: Object.fromEntries(
        Array.from({ length: optionalFileCount }, (_, index) => [
          `extensions/org.example.fixture/item-${index}`,
          new Uint8Array(),
        ]),
      ),
    };
    await expect(exportProject(bounded)).resolves.toBeInstanceOf(Uint8Array);
    await expect(
      history.addDataset(bounded, dataset('Orders'), now),
    ).rejects.toMatchObject({
      code: 'tooLarge',
      reason: 'entryCount',
    });
    expect(history.status()).toEqual({ undo: 0, redo: 0 });
    expect(bounded.datasets).toEqual([]);
  });

  it('checks the current project after archive preflight before appending history', async () => {
    const history = new StudioHistory();
    const base = createProject('Workbook', makeId, now);
    let current = true;
    const pending = history.addDataset(
      base,
      dataset('Orders'),
      now,
      () => current,
    );
    current = false;
    await expect(pending).rejects.toMatchObject({ code: 'conflict' });
    expect(history.status()).toEqual({ undo: 0, redo: 0 });
    expect(base.datasets).toEqual([]);
  });

  it('edits one typed cell and updates a bound chart without rewriting the drawing or template snapshot', async () => {
    const base = createProject('Workbook', makeId, now);
    const data = dataset('Orders');
    const count = data.fields[0].id;
    const label = makeId();
    data.fields.push({
      id: label,
      name: 'Month',
      type: 'string',
      nullable: false,
      extensions: {},
    });
    data.rows = [
      { [count]: 12, [label]: 'January' },
      { [count]: 15, [label]: 'February' },
    ];
    // This metadata would exceed the history budget if the entry retained a full dataset.
    data.source.description = 'a'.repeat(2000);
    const imported = await new StudioHistory().addDataset(base, data, now);
    const doc = imported.documents[0];
    const page = doc.pages[0];
    const charted = applyEdit(
      imported,
      doc.id,
      page.id,
      {
        type: 'insertChart',
        id: makeId(),
        layerId: page.layers[0].id,
        position: { x: 0, y: 0 },
        settings: {
          type: 'line',
          palette: 'ocean',
          title: 'Orders',
          datasetId: data.id,
          categoryFieldId: label,
          valueFieldId: count,
        },
      },
      now,
    );
    const template = copyTemplateProject(charted, makeId, now);
    const history = new StudioHistory(20, 512);
    const change = {
      datasetId: data.id,
      rowIndex: 0,
      fieldId: count,
      value: 40,
    };
    const next = await history.editDatasetCell(charted, change, now);
    const chart = charted.documents[0].pages[0].nodes[0];
    expect(buildDataChart(chart, next.datasets)?.points[0]).toEqual({
      label: 'January',
      value: 40,
    });
    expect(next.documents).toBe(charted.documents);
    expect(next.indexes).toBe(charted.indexes);
    expect(next.datasets[0].fields).toBe(charted.datasets[0].fields);
    expect(next.datasets[0].source).toBe(charted.datasets[0].source);
    expect(next.datasets[0].rows[1]).toBe(charted.datasets[0].rows[1]);
    expect(template.datasets[0].rows[0][count]).toBe(12);
    const undone = history.travel(next, doc.id, page.id, 'undo', now);
    expect(buildDataChart(chart, undone.datasets)?.points[0].value).toBe(12);
    const redone = history.travel(undone, doc.id, page.id, 'redo', now);
    expect(buildDataChart(chart, redone.datasets)?.points[0].value).toBe(40);
    expect((await importProject(await exportProject(redone))).datasets).toEqual(
      redone.datasets,
    );
  });

  it('leaves a typed edit and its history atomic on invalid, unchanged and stale inputs', async () => {
    const base = createProject('Workbook', makeId, now);
    const data = dataset('Orders');
    const imported = await new StudioHistory().addDataset(base, data, now);
    const history = new StudioHistory();
    const edit = {
      datasetId: data.id,
      fieldId: data.fields[0].id,
      rowIndex: 0,
    };
    await expect(
      history.editDatasetCell(imported, { ...edit, value: '12' }, now),
    ).rejects.toMatchObject({ reason: 'number' });
    await expect(
      history.editDatasetCell(imported, { ...edit, value: null }, now),
    ).rejects.toMatchObject({ reason: 'nullable' });
    await expect(
      history.editDatasetCell(
        imported,
        { ...edit, rowIndex: 100, value: 12 },
        now,
      ),
    ).rejects.toThrow('invalid');
    await expect(
      history.editDatasetCell(imported, { ...edit, value: 12 }, now),
    ).resolves.toBe(imported);
    let canCommit = true;
    const pending = history.editDatasetCell(
      imported,
      { ...edit, value: 40 },
      now,
      () => canCommit,
    );
    canCommit = false;
    await expect(pending).rejects.toMatchObject({ code: 'conflict' });
    expect(history.status()).toEqual({ undo: 0, redo: 0 });
    expect(imported.datasets[0].rows[0][edit.fieldId]).toBe(12);
  });
});
