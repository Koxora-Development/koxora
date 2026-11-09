import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  safeExternalUrl,
  type Project,
} from '@koxora/project';
import {
  applyEdit,
  applyWorkbook,
  CommandHistory,
  StudioHistory,
  copyElements,
  elementLink,
  LINK_KEY,
  DEFAULT_CONNECTION,
  type LinkTarget,
} from './index';
const now = '2026-10-30T10:00:00.000Z';
const id = () => crypto.randomUUID();
function fixture() {
  let project = createProject('Links', id, now);
  const d = project.documents[0],
    p = d.pages[0];
  for (const x of [-150, 150])
    project = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'insert',
        id: id(),
        kind: 'rectangle',
        position: { x, y: 0 },
        layerId: p.layers[0].id,
      },
      now,
    );
  const [a, b] = project.documents[0].pages[0].nodes;
  project = applyEdit(
    project,
    d.id,
    p.id,
    {
      type: 'connect',
      id: id(),
      sourceId: a.id,
      targetId: b.id,
      layerId: p.layers[0].id,
      options: DEFAULT_CONNECTION,
    },
    now,
  );
  return applyWorkbook(
    project,
    { type: 'newPage', documentId: d.id, title: 'Details' },
    id,
    now,
  );
}
function setLink(
  project: Project,
  elementId: string,
  target: LinkTarget | null,
) {
  const doc = project.documents.find((d) =>
    d.pages.some((p) =>
      [...p.nodes, ...p.connections].some((n) => n.id === elementId),
    ),
  )!;
  const page = doc.pages.find((p) =>
    [...p.nodes, ...p.connections].some((n) => n.id === elementId),
  )!;
  return applyEdit(
    project,
    doc.id,
    page.id,
    { type: 'link', id: elementId, link: { target, actionId: id() } },
    now,
  );
}
describe('explicit diagram links', () => {
  it.each([
    'https://example.com/a?query=test#anchor',
    'http://localhost:8080/',
    'mailto:hello@example.com?subject=Hello%20world',
  ])('allows %s', (url) => expect(safeExternalUrl(url)).not.toBeNull());
  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///tmp/a',
    '//example.com',
    'https:example.com',
    'https://user:pass@example.com',
    'https://user@example.com',
    ' https://example.com',
    'https://exa\nmple.com',
    'https://example.com\\a',
    'mailto:',
    'mailto://example.com',
    'mailto:a@example.com?subject=hi%0d%0aBcc:test@example.com',
  ])('rejects %s', (url) => expect(safeExternalUrl(url)).toBeNull());
  it('bounds canonical URLs consistently with the native opener', () => {
    expect(
      safeExternalUrl('https://example.com/' + '界'.repeat(500)),
    ).toBeNull();
    expect(
      safeExternalUrl('https://example.com/' + '界'.repeat(20)),
    ).not.toBeNull();
  });
  it('preserves action order and extension data when editing links', () => {
    let project = fixture();
    const node = project.documents[0].pages[0].nodes[0];
    project = setLink(project, node.id, {
      type: 'url',
      url: 'https://example.com/',
    });
    const action = project.documents[0].actions[0];
    action.extensions['org.example.keep'] = { opaque: true };
    const tooltip = {
      id: id(),
      targetId: node.id,
      trigger: 'hover',
      operation: 'tooltip',
      parameters: { text: 'Keep me' },
      extensions: {},
    };
    project.documents[0].actions.push(tooltip);
    project = setLink(project, node.id, {
      type: 'page',
      pageId: project.documents[0].pages[1].id,
    });
    expect(project.documents[0].actions.map((a) => a.id)).toEqual([
      action.id,
      tooltip.id,
    ]);
    expect(project.documents[0].actions[0].extensions).toEqual(
      action.extensions,
    );
    expect(project.documents[0].actions[1]).toEqual(tooltip);
  });
  it('retains links across page rename, reorder, moves, owner deletion and ZIP round trips', async () => {
    let project = fixture();
    const d = project.documents[0],
      p = d.pages[0],
      dest = d.pages[1];
    project = setLink(project, p.nodes[0].id, {
      type: 'page',
      pageId: dest.id,
    });
    project = setLink(project, p.connections[0].id, {
      type: 'url',
      url: 'https://example.com/',
    });
    project = applyWorkbook(
      project,
      { type: 'renamePage', pageId: dest.id, title: 'Renamed' },
      id,
      now,
    );
    project = applyWorkbook(
      project,
      { type: 'movePage', pageId: dest.id, documentId: d.id, index: 0 },
      id,
      now,
    );
    project = applyWorkbook(
      project,
      { type: 'newDocument', title: 'New owner' },
      id,
      now,
    );
    const owner = project.documents[1].id;
    project = applyWorkbook(
      project,
      { type: 'movePage', pageId: p.id, documentId: owner, index: 1 },
      id,
      now,
    );
    // Keep the destination outside the deleted original owner as well.
    project = applyWorkbook(
      project,
      { type: 'newPage', documentId: d.id, title: 'Empty' },
      id,
      now,
    );
    project = applyWorkbook(
      project,
      { type: 'movePage', pageId: dest.id, documentId: owner, index: 2 },
      id,
      now,
    );
    const before = project,
      history = new StudioHistory();
    project = history.workbook(
      project,
      { type: 'deleteDocument', documentId: d.id },
      id,
      now,
    );
    expect(elementLink(project, p.nodes[0].id)).toEqual(
      elementLink(before, p.nodes[0].id),
    );
    expect(history.travel(project, owner, p.id, 'undo', now).documents).toEqual(
      before.documents,
    );
    const loaded = await importProject(await exportProject(project));
    expect(loaded.documents).toEqual(project.documents);
    expect(elementLink(loaded, p.connections[0].id)).toEqual({
      state: 'ready',
      target: { type: 'url', url: 'https://example.com/' },
    });
  });
  it.each([StudioHistory, CommandHistory])(
    'undoes link creation, replacement and removal using %s',
    (History) => {
      let project = fixture();
      const d = project.documents[0],
        p = d.pages[0],
        history = new History();
      for (const element of [p.nodes[0], p.connections[0]]) {
        const before = project;
        project = history.execute(
          project,
          d.id,
          p.id,
          {
            type: 'link',
            id: element.id,
            link: {
              target: { type: 'page', pageId: d.pages[1].id },
              actionId: id(),
            },
          },
          now,
        );
        expect(elementLink(project, element.id).state).toBe('ready');
        project = history.travel(project, d.id, p.id, 'undo', now);
        expect(project.documents).toEqual(before.documents);
        project = history.travel(project, d.id, p.id, 'redo', now);
        project = history.execute(
          project,
          d.id,
          p.id,
          {
            type: 'link',
            id: element.id,
            link: { target: null, actionId: id() },
          },
          now,
        );
        expect(elementLink(project, element.id).state).toBe('none');
        project = history.travel(project, d.id, p.id, 'undo', now);
        expect(elementLink(project, element.id).state).toBe('ready');
      }
    },
  );
  it('duplicates and pastes node actions, connector links and self-page targets', () => {
    let project = fixture();
    const d = project.documents[0],
      p = d.pages[0];
    for (const n of [p.nodes[0], p.connections[0]])
      project = setLink(project, n.id, { type: 'page', pageId: p.id });
    const content = copyElements(
      project.documents[0].pages[0],
      p.nodes.map((n) => n.id),
      project,
    );
    const idMap = Object.fromEntries(
      [...content.nodes, ...content.connections, ...content.actions].map(
        (n) => [n.id, id()],
      ),
    );
    for (const type of ['duplicate', 'paste'] as const) {
      const result = applyEdit(
        project,
        d.id,
        type === 'paste' ? d.pages[1].id : p.id,
        type === 'duplicate'
          ? {
              type,
              ids: p.nodes.map((n) => n.id),
              idMap,
              offset: { x: 20, y: 20 },
            }
          : {
              type,
              ...content,
              idMap,
              offset: { x: 20, y: 20 },
              layerId: d.pages[1].layers[0].id,
            },
        now,
      );
      for (const n of [p.nodes[0], p.connections[0]])
        expect(elementLink(result, idMap[n.id])).toEqual(
          elementLink(project, n.id),
        );
    }
    const copied = applyWorkbook(
        project,
        { type: 'duplicatePage', pageId: p.id, title: 'Copy' },
        id,
        now,
      ),
      page = copied.documents[0].pages[1];
    for (const n of [page.nodes[0], page.connections[0]])
      expect(elementLink(copied, n.id)).toEqual({
        state: 'ready',
        target: { type: 'page', pageId: page.id },
      });
  });
  it('protects destinations and deletes linked elements and their owned actions atomically', () => {
    let project = fixture();
    const d = project.documents[0],
      p = d.pages[0];
    project = setLink(project, p.nodes[0].id, {
      type: 'page',
      pageId: d.pages[1].id,
    });
    expect(() =>
      applyWorkbook(
        project,
        { type: 'deletePage', pageId: d.pages[1].id },
        id,
        now,
      ),
    ).toThrow('references');
    const history = new StudioHistory(),
      removed = history.execute(
        project,
        d.id,
        p.id,
        { type: 'delete', ids: [p.nodes[0].id] },
        now,
      );
    expect(removed.documents[0].actions).toHaveLength(0);
    expect(history.travel(removed, d.id, p.id, 'undo', now).documents).toEqual(
      project.documents,
    );
    project = setLink(project, p.nodes[0].id, null);
    project = setLink(project, p.connections[0].id, {
      type: 'page',
      pageId: d.pages[1].id,
    });
    expect(() =>
      applyWorkbook(
        project,
        { type: 'deletePage', pageId: d.pages[1].id },
        id,
        now,
      ),
    ).toThrow('references');
  });
  it('keeps future, multiple and hover configurations inert and preserved', async () => {
    let project = fixture();
    const p = project.documents[0].pages[0];
    project = setLink(project, p.nodes[0].id, {
      type: 'url',
      url: 'https://example.com/',
    });
    project.documents[0].actions[0].parameters.future = true;
    expect(elementLink(project, p.nodes[0].id).state).toBe('unsupported');
    expect(() => setLink(project, p.nodes[0].id, null)).toThrow();
    delete project.documents[0].actions[0].parameters.future;
    project.documents[0].actions[0].trigger = 'hover';
    expect(elementLink(project, p.nodes[0].id).state).toBe('unsupported');
    project.documents[0].actions[0].trigger = 'click';
    project.documents[0].actions.push({
      ...project.documents[0].actions[0],
      id: id(),
    });
    expect(elementLink(project, p.nodes[0].id).state).toBe('unsupported');
    project.documents[0].pages[0].connections[0].extensions[LINK_KEY] = {
      version: 2,
      type: 'url',
      url: 'https://example.com/',
    };
    expect(elementLink(project, p.connections[0].id).state).toBe('unsupported');
    expect(() => setLink(project, p.connections[0].id, null)).toThrow();
    expect(
      (await importProject(await exportProject(project))).documents,
    ).toEqual(project.documents);
  });
  it('rejects unsafe, missing and locked destinations without mutation', () => {
    const project = fixture(),
      p = project.documents[0].pages[0],
      before = structuredClone(project);
    expect(() =>
      setLink(project, p.nodes[0].id, { type: 'url', url: 'file:///tmp/a' }),
    ).toThrow();
    expect(() =>
      setLink(project, p.nodes[0].id, { type: 'page', pageId: id() }),
    ).toThrow();
    expect(project).toEqual(before);
    p.layers[0].locked = true;
    expect(() =>
      setLink(project, p.nodes[0].id, {
        type: 'url',
        url: 'https://example.com/',
      }),
    ).toThrow('layer');
  });
});

describe('portable project and element destinations', () => {
  it('round trips stable foreign project/page/element IDs without paths or title coupling', async () => {
    let project = fixture();
    const p = project.documents[0].pages[0];
    const target: LinkTarget = {
      type: 'project',
      projectId: id(),
      pageId: id(),
      elementId: id(),
    };
    for (const item of [p.nodes[0], p.connections[0]])
      project = setLink(project, item.id, target);
    project.manifest.title = 'Renamed source';
    const loaded = await importProject(await exportProject(project));
    for (const item of [p.nodes[0], p.connections[0]])
      expect(elementLink(loaded, item.id)).toEqual({ state: 'ready', target });
    expect(JSON.stringify(loaded.documents)).not.toContain('file://');
  });
  it('remaps local element targets inside duplicated pages and retains foreign identities', () => {
    let project = fixture();
    const d = project.documents[0],
      p = d.pages[0];
    project = setLink(project, p.nodes[0].id, {
      type: 'element',
      pageId: p.id,
      elementId: p.nodes[1].id,
    });
    const foreign: LinkTarget = {
      type: 'project',
      projectId: id(),
      pageId: id(),
      elementId: id(),
    };
    project = setLink(project, p.connections[0].id, foreign);
    const result = applyWorkbook(
      project,
      { type: 'duplicatePage', pageId: p.id, title: 'Copy' },
      id,
      now,
    );
    const copy = result.documents[0].pages.find(
      (page) => page.title === 'Copy',
    )!;
    expect(elementLink(result, copy.nodes[0].id)).toEqual({
      state: 'ready',
      target: { type: 'element', pageId: copy.id, elementId: copy.nodes[1].id },
    });
    expect(elementLink(result, copy.connections[0].id)).toEqual({
      state: 'ready',
      target: foreign,
    });
  });
  it('retains opaque action metadata inertly when converting or removing a legacy link', async () => {
    let project = fixture();
    const p = project.documents[0].pages[0],
      source = p.nodes[0].id;
    project = setLink(project, source, {
      type: 'url',
      url: 'https://example.com/',
    });
    const original = project.documents[0].actions[0];
    original.extensions['future.example'] = { opaque: true };
    project = setLink(project, source, {
      type: 'element',
      pageId: p.id,
      elementId: p.nodes[1].id,
    });
    const loaded = await importProject(await exportProject(project));
    expect(loaded.documents[0].actions).toHaveLength(0);
    expect(
      JSON.stringify(loaded.documents[0].pages[0].nodes[0].extensions),
    ).toContain('future.example');
    expect(elementLink(loaded, source).state).toBe('ready');
    project = setLink(loaded, source, null);
    expect(elementLink(project, source).state).toBe('none');
    expect(JSON.stringify(project.documents)).toContain('future.example');
  });
  it('rejects arbitrary paths, partial identities and unknown semantics without rewriting them', () => {
    const project = fixture();
    const p = project.documents[0].pages[0];
    expect(() =>
      setLink(project, p.nodes[0].id, {
        type: 'project',
        projectId: '../../private',
      }),
    ).toThrow();
    expect(() =>
      setLink(project, p.nodes[0].id, {
        type: 'project',
        projectId: id(),
        elementId: id(),
      }),
    ).toThrow();
    p.nodes[0].extensions[LINK_KEY] = {
      version: 3,
      type: 'project',
      projectId: id(),
      future: { keep: true },
    };
    expect(elementLink(project, p.nodes[0].id)).toEqual({
      state: 'unsupported',
    });
    expect(() => setLink(project, p.nodes[0].id, null)).toThrow();
  });
  it('preserves missing imported local targets so deletion produces an explicit missing destination', async () => {
    let project = fixture();
    const p = project.documents[0].pages[0];
    const target: LinkTarget = {
      type: 'element',
      pageId: p.id,
      elementId: p.nodes[1].id,
    };
    project = setLink(project, p.nodes[0].id, target);
    project = applyEdit(
      project,
      project.documents[0].id,
      p.id,
      { type: 'delete', ids: [p.nodes[1].id] },
      now,
    );
    const loaded = await importProject(await exportProject(project));
    expect(elementLink(loaded, p.nodes[0].id)).toEqual({
      state: 'ready',
      target,
    });
  });
  it('undoes and redoes new destinations through the ordinary command history', () => {
    let project = fixture();
    const d = project.documents[0],
      p = d.pages[0],
      history = new StudioHistory();
    const target: LinkTarget = {
      type: 'element',
      pageId: p.id,
      elementId: p.nodes[1].id,
    };
    project = history.execute(
      project,
      d.id,
      p.id,
      { type: 'link', id: p.nodes[0].id, link: { target, actionId: id() } },
      now,
    );
    project = history.travel(project, d.id, p.id, 'undo', now);
    expect(elementLink(project, p.nodes[0].id).state).toBe('none');
    project = history.travel(project, d.id, p.id, 'redo', now);
    expect(elementLink(project, p.nodes[0].id)).toEqual({
      state: 'ready',
      target,
    });
  });
});
