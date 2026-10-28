import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
} from '@koxora/project';
import {
  activePageId,
  applyEdit,
  applyWorkbook,
  StudioHistory,
  DEFAULT_CONNECTION,
  DEFAULT_APPEARANCE,
  ELEMENT_KEY,
  RICH_TEXT_KEY,
  fromPlainText,
  readRichText,
  plainText,
  isRichText,
  richTextJson,
  resolveAppearance,
  buildScene,
  type RichText,
} from './index';
const now = '2026-10-25T10:00:00.000Z';
const id = () => crypto.randomUUID();
function fixture() {
  let project = createProject('Workbook', id, now);
  const d = project.documents[0],
    p = d.pages[0];
  for (const [i, x] of [-150, 150].entries())
    project = applyEdit(
      project,
      d.id,
      p.id,
      {
        type: 'insert',
        id: id(),
        kind: i ? 'ellipse' : 'rectangle',
        position: { x, y: 0 },
        layerId: p.layers[0].id,
        text: i ? 'Review' : 'Hello world',
      },
      now,
    );
  return project;
}
describe('workbook operations', () => {
  it('keeps stable IDs, order, views, unknown values and assets across an offline ZIP roundtrip', async () => {
    let p = fixture();
    const d = p.documents[0],
      first = d.pages[0];
    first.extensions['org.example.keep'] = { opaque: [1, 'unchanged'] };
    first.viewport = { x: 45, y: -70, zoom: 1.7 };
    p = applyWorkbook(
      p,
      { type: 'newPage', documentId: d.id, title: 'Details' },
      id,
      now,
    );
    const second = p.documents[0].pages[1];
    p = applyWorkbook(
      p,
      { type: 'renamePage', pageId: first.id, title: 'Overview' },
      id,
      now,
    );
    p = applyWorkbook(
      p,
      { type: 'movePage', pageId: first.id, documentId: d.id, index: 1 },
      id,
      now,
    );
    p = applyWorkbook(
      p,
      { type: 'newDocument', title: 'Second document' },
      id,
      now,
    );
    const other = p.documents[1];
    p = applyWorkbook(
      p,
      { type: 'movePage', pageId: first.id, documentId: other.id, index: 1 },
      id,
      now,
    );
    const loaded = await importProject(await exportProject(p));
    expect(loaded.documents).toEqual(p.documents);
    expect(activePageId(loaded)).toBe(first.id);
    expect(p.documents[0].pages[0].id).toBe(second.id);
    expect(p.documents[1].pages[1].viewport).toEqual(first.viewport);
    expect(p.documents[1].pages[1].extensions).toEqual(first.extensions);
  });
  it('duplicates layers, nodes, ports, edges, actions and self-page references with fresh identities', () => {
    let p = fixture();
    const d = p.documents[0],
      page = d.pages[0];
    p = applyEdit(
      p,
      d.id,
      page.id,
      {
        type: 'connect',
        id: id(),
        sourceId: page.nodes[0].id,
        targetId: page.nodes[1].id,
        layerId: page.layers[0].id,
        options: {
          ...DEFAULT_CONNECTION,
          sourceAnchor: 'east',
          targetAnchor: 'west',
        },
      },
      now,
    );
    p.documents[0].actions.push({
      id: id(),
      targetId: page.nodes[0].id,
      trigger: 'click',
      operation: 'navigate',
      parameters: { pageId: page.id },
      extensions: {},
    });
    p = applyWorkbook(
      p,
      { type: 'duplicatePage', pageId: page.id, title: 'Copy' },
      id,
      now,
    );
    const copy = p.documents[0].pages[1];
    expect(copy.nodes.map((n) => n.id)).not.toEqual(
      page.nodes.map((n) => n.id),
    );
    expect(copy.connections[0].sourceId).toBe(copy.nodes[0].id);
    expect(copy.connections[0].targetId).toBe(copy.nodes[1].id);
    expect(p.documents[0].actions[1].parameters.pageId).toBe(copy.id);
    expect(p.documents[0].actions[1].targetId).toBe(copy.nodes[0].id);
    validateProject(p);
  });
  it('protects last pages and referenced pages without changing source data', () => {
    let p = fixture();
    const d = p.documents[0],
      page = d.pages[0];
    expect(() =>
      applyWorkbook(p, { type: 'deletePage', pageId: page.id }, id, now),
    ).toThrow('lastPage');
    p = applyWorkbook(
      p,
      { type: 'newPage', documentId: d.id, title: 'Other' },
      id,
      now,
    );
    p.documents[0].actions.push({
      id: id(),
      targetId: page.nodes[0].id,
      trigger: 'click',
      operation: 'navigate',
      parameters: { pageId: page.id },
      extensions: {},
    });
    const json = JSON.stringify(p);
    expect(() =>
      applyWorkbook(p, { type: 'deletePage', pageId: page.id }, id, now),
    ).toThrow('references');
    expect(JSON.stringify(p)).toBe(json);
  });
  it('undoes edits, page deletion and cross-document moves chronologically without resetting cameras', () => {
    let p = fixture();
    const d = p.documents[0],
      page = d.pages[0],
      h = new StudioHistory();
    p = h.workbook(
      p,
      { type: 'newPage', documentId: d.id, title: 'Second' },
      id,
      now,
    );
    p = h.execute(
      p,
      d.id,
      page.id,
      {
        type: 'format',
        ids: page.nodes.map((n) => n.id),
        patch: { fill: '#ff0000' },
      },
      now,
    );
    p = h.workbook(p, { type: 'deletePage', pageId: page.id }, id, now);
    expect(p.documents[0].pages).toHaveLength(1);
    p = h.travel(p, d.id, activePageId(p), 'undo', now);
    expect(
      p.documents[0].pages[0].nodes[0].extensions[ELEMENT_KEY],
    ).toMatchObject({ style: { fill: '#ff0000' } });
    p.documents[0].pages[0] = {
      ...p.documents[0].pages[0],
      viewport: { x: 100, y: 200, zoom: 2 },
    };
    p = h.travel(p, d.id, page.id, 'undo', now);
    expect(resolveAppearance(p.documents[0].pages[0].nodes[0]).fill).toBe(
      DEFAULT_APPEARANCE.fill,
    );
    expect(p.documents[0].pages[0].viewport.zoom).toBe(2);
    p = h.travel(p, d.id, page.id, 'redo', now);
    p = h.travel(p, d.id, page.id, 'redo', now);
    expect(p.documents[0].pages).toHaveLength(1);
  });
  it('charges changed fields only and retains undo with large unrelated metadata', () => {
    let p = fixture();
    const d = p.documents[0],
      page = d.pages[0];
    page.nodes[0].metadata.opaque = 'x'.repeat(4.1 * 1024 * 1024);
    const h = new StudioHistory();
    p = h.execute(
      p,
      d.id,
      page.id,
      {
        type: 'move',
        ids: [page.nodes[1].id],
        delta: { x: 1, y: 0 },
        spacing: 24,
        snap: false,
      },
      now,
    );
    expect(h.status().undo).toBe(1);
    p = h.travel(p, d.id, page.id, 'undo', now);
    expect(p.documents[0].pages[0].nodes[1].geometry).toEqual(
      page.nodes[1].geometry,
    );
  });
});
describe('structured rich text and batch edits', () => {
  const rich: RichText = {
    version: 1,
    paragraphs: [
      {
        align: 'left',
        runs: [
          { text: 'Hello ', style: { fontFamily: 'georgia', fontWeight: 700 } },
          {
            text: 'world',
            style: {
              fontFamily: 'consolas',
              textColor: '#008080',
              fontSize: 28,
            },
          },
        ],
      },
      {
        align: 'right',
        runs: [
          {
            text: 'Grüße 世界',
            style: { fontStyle: 'italic', textDecoration: 'underline' },
          },
        ],
      },
    ],
  };
  it('roundtrips safe runs with matching plain text on shapes and connectors', async () => {
    let p = fixture();
    const d = p.documents[0],
      page = d.pages[0];
    p = applyEdit(
      p,
      d.id,
      page.id,
      { type: 'richText', id: page.nodes[0].id, value: rich },
      now,
    );
    p = applyEdit(
      p,
      d.id,
      page.id,
      {
        type: 'connect',
        id: id(),
        sourceId: page.nodes[0].id,
        targetId: page.nodes[1].id,
        layerId: page.layers[0].id,
        options: DEFAULT_CONNECTION,
      },
      now,
    );
    p = applyEdit(
      p,
      d.id,
      page.id,
      {
        type: 'richText',
        id: p.documents[0].pages[0].connections[0].id,
        value: rich,
      },
      now,
    );
    const loaded = await importProject(await exportProject(p));
    expect(loaded.documents).toEqual(p.documents);
    expect(loaded.documents[0].pages[0].nodes[0].content.text).toBe(
      plainText(rich),
    );
    expect(readRichText(loaded.documents[0].pages[0].connections[0])).toEqual(
      rich,
    );
    expect(buildScene(loaded.documents[0].pages[0]).nodes[0].richText).toEqual(
      rich,
    );
  });
  it('applies only edited attributes atomically and preserves other run formatting through undo', () => {
    let p = fixture();
    const d = p.documents[0],
      page = d.pages[0];
    p = applyEdit(
      p,
      d.id,
      page.id,
      { type: 'richText', id: page.nodes[0].id, value: rich },
      now,
    );
    const before = p;
    const h = new StudioHistory();
    p = h.execute(
      p,
      d.id,
      page.id,
      {
        type: 'format',
        ids: page.nodes.map((n) => n.id),
        patch: { fill: '#123456' },
      },
      now,
    );
    expect(readRichText(p.documents[0].pages[0].nodes[0])).toEqual(rich);
    expect(
      p.documents[0].pages[0].nodes.map((n) => resolveAppearance(n).fill),
    ).toEqual(['#123456', '#123456']);
    p = h.execute(
      p,
      d.id,
      page.id,
      {
        type: 'format',
        ids: page.nodes.map((n) => n.id),
        patch: { fontFamily: 'arial' },
      },
      now,
    );
    expect(
      readRichText(p.documents[0].pages[0].nodes[0])?.paragraphs[0].runs[1]
        .style,
    ).toEqual({ ...rich.paragraphs[0].runs[1].style, fontFamily: 'arial' });
    p = h.travel(p, d.id, page.id, 'undo', now);
    p = h.travel(p, d.id, page.id, 'undo', now);
    expect(p.documents).toEqual(before.documents);
  });
  it.each([
    null,
    { version: 2, paragraphs: [] },
    {
      version: 1,
      paragraphs: [
        {
          align: 'left',
          runs: [
            {
              text: 'unsafe',
              style: { fontFamily: 'url(https://invalid.test)' },
            },
          ],
        },
      ],
    },
    {
      version: 1,
      paragraphs: [
        {
          align: 'left',
          runs: [{ text: 'x', style: { textColor: 'red; background:url(x)' } }],
        },
      ],
    },
    fromPlainText('x'.repeat(4097)),
  ])('rejects unsupported or unsafe content without executing it', (value) => {
    expect(isRichText(value)).toBe(false);
  });
  it('makes unknown rich extensions read-only and rejects stale plain-text rewrites', () => {
    let p = fixture();
    const d = p.documents[0],
      page = d.pages[0];
    page.nodes[0].extensions[RICH_TEXT_KEY] = {
      version: 2,
      opaque: 'preserve',
    };
    expect(buildScene(page).nodes[0].editable).toBe(false);
    expect(() =>
      applyEdit(
        p,
        d.id,
        page.id,
        { type: 'richText', id: page.nodes[0].id, value: rich },
        now,
      ),
    ).toThrow('unsupported');
    delete page.nodes[0].extensions[RICH_TEXT_KEY];
    p = applyEdit(
      p,
      d.id,
      page.id,
      { type: 'richText', id: page.nodes[0].id, value: rich },
      now,
    );
    expect(() =>
      applyEdit(
        p,
        d.id,
        page.id,
        {
          type: 'updateNode',
          id: page.nodes[0].id,
          text: 'flatten',
          style: DEFAULT_APPEARANCE,
        },
        now,
      ),
    ).toThrow('unsupported');
    expect(p.documents[0].pages[0].nodes[0].extensions[RICH_TEXT_KEY]).toEqual(
      richTextJson(rich),
    );
  });
});

it('duplicates project-scoped actions after moving the page to another document', () => {
  let p = fixture();
  const doc = p.documents[0],
    page = doc.pages[0];
  p.documents[0].actions.push({
    id: id(),
    targetId: page.nodes[0].id,
    trigger: 'click',
    operation: 'tooltip',
    parameters: { text: 'Keep this action' },
    extensions: {},
  });
  p = applyWorkbook(
    p,
    { type: 'newPage', documentId: doc.id, title: 'Keep' },
    id,
    now,
  );
  p = applyWorkbook(p, { type: 'newDocument', title: 'Destination' }, id, now);
  const target = p.documents[1].id;
  p = applyWorkbook(
    p,
    { type: 'movePage', pageId: page.id, documentId: target, index: 1 },
    id,
    now,
  );
  p = applyWorkbook(
    p,
    { type: 'duplicatePage', pageId: page.id, title: 'Copy' },
    id,
    now,
  );
  const copy = p.documents[1].pages[2];
  expect(
    p.documents
      .flatMap((d) => d.actions)
      .filter((a) => a.targetId === copy.nodes[0].id),
  ).toHaveLength(1);
  expect(p.documents[1].actions[0].parameters.text).toBe('Keep this action');
});
it('refuses an individually oversized history command before changing prior history', () => {
  let p = fixture();
  const doc = p.documents[0],
    page = doc.pages[0];
  const h = new StudioHistory(100, 2000);
  p = h.execute(
    p,
    doc.id,
    page.id,
    {
      type: 'move',
      ids: [page.nodes[0].id],
      delta: { x: 1, y: 0 },
      snap: false,
      spacing: 24,
    },
    now,
  );
  const status = h.status();
  expect(() =>
    h.execute(
      p,
      doc.id,
      page.id,
      {
        type: 'richText',
        id: page.nodes[0].id,
        value: fromPlainText('x'.repeat(3000)),
      },
      now,
    ),
  ).toThrow('historyLimit');
  expect(h.status()).toEqual(status);
  expect(p.documents[0].pages[0].nodes[0].content.text).toBe('Hello world');
});
it('keeps a moved page camera through project undo and redo', () => {
  let p = fixture();
  const doc = p.documents[0],
    page = doc.pages[0];
  p = applyWorkbook(
    p,
    { type: 'newPage', documentId: doc.id, title: 'Keep' },
    id,
    now,
  );
  p = applyWorkbook(p, { type: 'newDocument', title: 'Target' }, id, now);
  const h = new StudioHistory();
  p = h.workbook(
    p,
    {
      type: 'movePage',
      pageId: page.id,
      documentId: p.documents[1].id,
      index: 1,
    },
    id,
    now,
  );
  p.documents[1].pages[1] = {
    ...p.documents[1].pages[1],
    viewport: { x: 400, y: 600, zoom: 3 },
  };
  p = h.travel(p, doc.id, page.id, 'undo', now);
  expect(p.documents[0].pages[0].viewport.zoom).toBe(3);
  p = h.travel(p, doc.id, page.id, 'redo', now);
  expect(p.documents[1].pages[1].viewport.zoom).toBe(3);
});

it.each(['Hello\r\nworld', 'Hello\rworld', 'Hello\nworld'])(
  'opens legacy line endings as safe paragraphs without mutating the source: %j',
  (text) => {
    const p = fixture(),
      doc = p.documents[0],
      page = doc.pages[0],
      node = page.nodes[0];
    node.content.text = text;
    const rich = fromPlainText(text);
    expect(isRichText(rich)).toBe(true);
    expect(plainText(rich)).toBe('Hello\nworld');
    expect(node.content.text).toBe(text);
    const next = applyEdit(
      p,
      doc.id,
      page.id,
      { type: 'richText', id: node.id, value: rich },
      now,
    );
    expect(next.documents[0].pages[0].nodes[0].content.text).toBe(
      'Hello\nworld',
    );
    expect(node.content.text).toBe(text);
  },
);

it('leaves text-only nodes untouched when batch editing shape borders and fills', () => {
  const project = fixture(),
    doc = project.documents[0],
    page = doc.pages[0];
  page.nodes[1].kind = 'text';
  const next = applyEdit(
    project,
    doc.id,
    page.id,
    {
      type: 'format',
      ids: page.nodes.map((n) => n.id),
      patch: { fill: '#123456', stroke: '#654321', strokeWidth: 4 },
    },
    now,
  );
  expect(resolveAppearance(next.documents[0].pages[0].nodes[0])).toMatchObject({
    fill: '#123456',
    stroke: '#654321',
    strokeWidth: 4,
  });
  expect(next.documents[0].pages[0].nodes[1]).toEqual(page.nodes[1]);
});
