import { describe, expect, it } from 'vitest';
import { createProject, exportProject, importProject } from '@koxora/project';
import { applyEdit } from './editing';
import { fromPlainText } from './rich-text';
import { groupEdit, StudioHistory } from './studio-history';
import { resolveAppearance } from './shapes';

const start = Date.parse('2026-11-15T08:00:00.000Z');
const time = (offset = 0) => new Date(start + offset).toISOString();
const id = () => crypto.randomUUID();
function fixture() {
  let project = createProject('Live fields', id, time());
  const documentId = project.documents[0].id;
  const pageId = project.documents[0].pages[0].id;
  const nodeId = id();
  project = applyEdit(
    project,
    documentId,
    pageId,
    {
      type: 'insert',
      id: nodeId,
      kind: 'rectangle',
      position: { x: 0, y: 0 },
      layerId: project.documents[0].pages[0].layers[0].id,
      text: 'Original',
    },
    time(),
  );
  return { project, documentId, pageId, nodeId };
}

describe('bounded live-edit history groups', () => {
  it('keeps 500 live text changes portable and undoable as one field edit', async () => {
    const f = fixture();
    const h = new StudioHistory();
    let project = f.project;
    for (let i = 1; i <= 500; i++)
      project = h.execute(
        project,
        f.documentId,
        f.pageId,
        groupEdit(
          {
            type: 'richText',
            id: f.nodeId,
            value: fromPlainText('x'.repeat(i)),
          },
          'label-session',
        ),
        time(i * 10),
      );
    expect(h.status()).toEqual({ undo: 1, redo: 0 });
    expect(project.documents[0].pages[0].nodes[0].content.text).toBe(
      'x'.repeat(500),
    );
    expect(JSON.stringify(project)).not.toContain('historyGroup');
    const reopened = await importProject(await exportProject(project));
    expect(reopened.documents).toEqual(project.documents);
    const undone = h.travel(
      project,
      f.documentId,
      f.pageId,
      'undo',
      time(5010),
    );
    expect(undone.documents).toEqual(f.project.documents);
    const redone = h.travel(undone, f.documentId, f.pageId, 'redo', time(5020));
    expect(redone.documents).toEqual(project.documents);
  });

  it('leaves the caller command untouched and separates different live fields', () => {
    const f = fixture();
    const h = new StudioHistory();
    const command = {
      type: 'format' as const,
      ids: [f.nodeId],
      patch: { fill: '#ff0000' },
    };
    const grouped = groupEdit(command, 'fill-session');
    expect(command).not.toHaveProperty('historyGroup');
    let project = h.execute(
      f.project,
      f.documentId,
      f.pageId,
      grouped,
      time(10),
    );
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      groupEdit(
        { type: 'format', ids: [f.nodeId], patch: { fontSize: 24 } },
        'size-session',
      ),
      time(20),
    );
    expect(h.status()).toEqual({ undo: 2, redo: 0 });
    project = h.travel(project, f.documentId, f.pageId, 'undo', time(30));
    const appearance = resolveAppearance(
      project.documents[0].pages[0].nodes[0],
    );
    expect(appearance.fill).toBe('#ff0000');
    expect(appearance.fontSize).toBe(16);
  });

  it('does not absorb a non-grouped movement between text changes', () => {
    const f = fixture();
    const h = new StudioHistory();
    const label = (text: string) =>
      groupEdit(
        { type: 'richText', id: f.nodeId, value: fromPlainText(text) },
        'same-label',
      );
    let project = h.execute(
      f.project,
      f.documentId,
      f.pageId,
      label('First'),
      time(10),
    );
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      {
        type: 'move',
        ids: [f.nodeId],
        delta: { x: 50, y: 0 },
        spacing: 24,
        snap: false,
      },
      time(20),
    );
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      label('Second'),
      time(30),
    );
    expect(h.status().undo).toBe(3);
    project = h.travel(project, f.documentId, f.pageId, 'undo', time(40));
    const node = project.documents[0].pages[0].nodes[0];
    expect(node.content.text).toBe('First');
    expect(node.geometry.x).toBe(
      f.project.documents[0].pages[0].nodes[0].geometry.x + 50,
    );
  });

  it('ends a group after a pause, an attempted undo/redo, or a workbook command', () => {
    const f = fixture();
    const h = new StudioHistory();
    const label = (text: string) =>
      groupEdit(
        { type: 'richText', id: f.nodeId, value: fromPlainText(text) },
        'label',
      );
    let project = h.execute(
      f.project,
      f.documentId,
      f.pageId,
      label('First'),
      time(10),
    );
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      label('After pause'),
      time(2000),
    );
    expect(h.status().undo).toBe(2);
    project = h.travel(project, f.documentId, f.pageId, 'redo', time(2010));
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      label('After empty redo'),
      time(2020),
    );
    expect(h.status().undo).toBe(3);
    project = h.workbook(
      project,
      {
        type: 'renamePage',
        pageId: f.pageId,
        title: project.documents[0].pages[0].title,
      },
      id,
      time(2030),
    );
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      label('After workbook'),
      time(2040),
    );
    expect(h.status().undo).toBe(4);
    expect(project.documents[0].pages[0].nodes[0].content.text).toBe(
      'After workbook',
    );
  });

  it('ends a group even if an intervening ungrouped control makes no change', () => {
    const f = fixture();
    const h = new StudioHistory();
    const label = (text: string) =>
      groupEdit(
        { type: 'richText', id: f.nodeId, value: fromPlainText(text) },
        'label',
      );
    let project = h.execute(
      f.project,
      f.documentId,
      f.pageId,
      label('First'),
      time(10),
    );
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      { type: 'format', ids: [f.nodeId], patch: {} },
      time(20),
    );
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      label('Second'),
      time(30),
    );
    expect(h.status().undo).toBe(2);
    expect(project.documents[0].pages[0].nodes[0].content.text).toBe('Second');
  });

  it('removes a group that returns a field exactly to its original value', () => {
    const f = fixture();
    const h = new StudioHistory();
    const original = '#123456';
    f.project = applyEdit(
      f.project,
      f.documentId,
      f.pageId,
      { type: 'format', ids: [f.nodeId], patch: { fill: original } },
      time(),
    );
    let project = h.execute(
      f.project,
      f.documentId,
      f.pageId,
      groupEdit(
        { type: 'format', ids: [f.nodeId], patch: { fill: '#ff0000' } },
        'fill',
      ),
      time(10),
    );
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      groupEdit(
        { type: 'format', ids: [f.nodeId], patch: { fill: original } },
        'fill',
      ),
      time(20),
    );
    expect(project.documents).toEqual(f.project.documents);
    expect(h.status()).toEqual({ undo: 0, redo: 0 });
  });

  it('rejects an oversized replacement atomically and keeps the previous grouped baseline', () => {
    const f = fixture();
    const h = new StudioHistory(100, 2500);
    const label = (text: string) =>
      groupEdit(
        { type: 'richText', id: f.nodeId, value: fromPlainText(text) },
        'label',
      );
    let project = h.execute(
      f.project,
      f.documentId,
      f.pageId,
      label('Small'),
      time(10),
    );
    const saved = JSON.stringify(project);
    const status = h.status();
    expect(() =>
      h.execute(
        project,
        f.documentId,
        f.pageId,
        label('x'.repeat(2000)),
        time(20),
      ),
    ).toThrow('historyLimit');
    expect(JSON.stringify(project)).toBe(saved);
    expect(h.status()).toEqual(status);
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      label('Still small'),
      time(30),
    );
    expect(h.status()).toEqual({ undo: 1, redo: 0 });
    project = h.travel(project, f.documentId, f.pageId, 'undo', time(40));
    expect(project.documents).toEqual(f.project.documents);
  });

  it('retains redo after a rejected live edit and separates a successful new branch', () => {
    const f = fixture();
    const h = new StudioHistory(100, 2500);
    const label = (text: string) =>
      groupEdit(
        { type: 'richText', id: f.nodeId, value: fromPlainText(text) },
        'label',
      );
    let project = h.execute(
      f.project,
      f.documentId,
      f.pageId,
      label('First'),
      time(10),
    );
    project = h.travel(project, f.documentId, f.pageId, 'undo', time(20));
    expect(() =>
      h.execute(
        project,
        f.documentId,
        f.pageId,
        label('x'.repeat(2000)),
        time(30),
      ),
    ).toThrow('historyLimit');
    expect(h.status()).toEqual({ undo: 0, redo: 1 });
    project = h.execute(
      project,
      f.documentId,
      f.pageId,
      label('New branch'),
      time(40),
    );
    expect(h.status()).toEqual({ undo: 1, redo: 0 });
    project = h.travel(project, f.documentId, f.pageId, 'undo', time(50));
    expect(project.documents).toEqual(f.project.documents);
  });
});
