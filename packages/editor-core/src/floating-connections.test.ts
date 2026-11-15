import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
  FLOATING_CONNECTIONS_FEATURE,
  FREEHAND_TEXT_FEATURE,
  FREEHAND_TEXT_KEY,
  type Project,
} from '@koxora/project';
import {
  applyEdit,
  applyWorkbook,
  assertEditableElement,
  CommandHistory,
  connectionPath,
  copyElements,
  DEFAULT_CONNECTION,
  CONNECTION_KEY,
  ELEMENT_KEY,
  FREEHAND_KEY,
  fromPlainText,
  readConnection,
  readConnectionEndpoints,
  readRichText,
  resolveAppearance,
  type EditCommand,
} from './index';

const now = '2026-11-15T10:00:00.000Z';
const id = () => crypto.randomUUID();
const pageOf = (project: Project) => project.documents[0].pages[0];
const run = (project: Project, command: EditCommand) =>
  applyEdit(project, project.documents[0].id, pageOf(project).id, command, now);
function fixture() {
  let project = createProject('Flexible connectors', id, now);
  for (const x of [-200, 200])
    project = run(project, {
      type: 'insert',
      id: id(),
      kind: 'rectangle',
      layerId: pageOf(project).layers[0].id,
      position: { x, y: 0 },
      snap: false,
    });
  return project;
}
function connect(
  project: Project,
  sourceAttached: boolean,
  targetAttached: boolean,
) {
  const page = pageOf(project);
  return run(project, {
    type: 'connect',
    id: id(),
    layerId: page.layers[0].id,
    ...(sourceAttached
      ? { sourceId: page.nodes[0].id }
      : { sourcePoint: { x: -360, y: 80 } }),
    ...(targetAttached
      ? { targetId: page.nodes[1].id }
      : { targetPoint: { x: 360, y: 80 } }),
    options: { ...DEFAULT_CONNECTION, startArrow: true, arrow: true },
  });
}

describe('explicit connector endpoints', () => {
  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])(
    'round-trips source attached=%s / target attached=%s with two independent heads',
    async (sourceAttached, targetAttached) => {
      const project = connect(fixture(), sourceAttached, targetAttached);
      const page = pageOf(project),
        edge = page.connections[0];
      expect(readConnection(edge)).toMatchObject({
        startArrow: true,
        arrow: true,
      });
      expect(project.manifest.requiredFeatures).toContain(
        FLOATING_CONNECTIONS_FEATURE,
      );
      const ends = readConnectionEndpoints(edge)!;
      expect(ends.source).toEqual(
        sourceAttached
          ? { nodeId: page.nodes[0].id }
          : { point: { x: -360, y: 80 } },
      );
      expect(ends.target).toEqual(
        targetAttached
          ? { nodeId: page.nodes[1].id }
          : { point: { x: 360, y: 80 } },
      );
      const path = connectionPath(
        sourceAttached ? page.nodes[0] : edge.sourcePoint!,
        targetAttached ? page.nodes[1] : edge.targetPoint!,
        readConnection(edge),
      );
      if (!sourceAttached) expect(path.points[0]).toEqual(edge.sourcePoint);
      if (!targetAttached) expect(path.points.at(-1)).toEqual(edge.targetPoint);
      expect(
        path.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      ).toBe(true);
      expect(
        (await importProject(await exportProject(project))).documents,
      ).toEqual(project.documents);
      const noFeature = structuredClone(project);
      noFeature.manifest.requiredFeatures =
        noFeature.manifest.requiredFeatures.filter(
          (f) => f !== FLOATING_CONNECTIONS_FEATURE,
        );
      expect(() => validateProject(noFeature)).toThrow();
    },
  );

  it('detaches and reattaches either endpoint atomically without replacing the edge identity', () => {
    const project = connect(fixture(), true, true);
    const page = pageOf(project),
      edge = page.connections[0],
      history = new CommandHistory();
    const detached = history.execute(
      project,
      project.documents[0].id,
      page.id,
      {
        type: 'updateConnection',
        id: edge.id,
        options: readConnection(edge),
        style: resolveAppearance(edge, [], CONNECTION_KEY),
        source: { point: { x: -400, y: -100 } },
        target: { point: { x: 400, y: 100 } },
      },
      now,
    );
    const floating = pageOf(detached).connections[0];
    expect(floating.id).toBe(edge.id);
    expect(floating.sourceId).toBeUndefined();
    expect(floating.targetId).toBeUndefined();
    const undone = history.travel(
      detached,
      project.documents[0].id,
      page.id,
      'undo',
      now,
    );
    expect(undone.documents).toEqual(project.documents);
    expect(
      history.travel(undone, project.documents[0].id, page.id, 'redo', now)
        .documents,
    ).toEqual(detached.documents);
    const attached = run(detached, {
      type: 'updateConnection',
      id: edge.id,
      options: readConnection(floating),
      style: resolveAppearance(floating, [], CONNECTION_KEY),
      source: { nodeId: page.nodes[1].id },
      target: { nodeId: page.nodes[0].id },
    });
    expect(pageOf(attached).connections[0]).toMatchObject({
      sourceId: page.nodes[1].id,
      targetId: page.nodes[0].id,
    });
    expect(pageOf(attached).connections[0].sourcePoint).toBeUndefined();
    expect(pageOf(attached).connections[0].targetPoint).toBeUndefined();
  });

  it('keeps floating endpoints fixed while attached geometry moves and supports every route', () => {
    let project = connect(fixture(), true, false);
    const page = pageOf(project),
      edge = page.connections[0],
      free = edge.targetPoint!;
    project = run(project, {
      type: 'move',
      ids: [page.nodes[0].id],
      delta: { x: 100, y: 50 },
      spacing: 1,
      snap: false,
    });
    const moved = pageOf(project);
    for (const routing of ['straight', 'orthogonal', 'curved'] as const) {
      const path = connectionPath(moved.nodes[0], free, {
        ...readConnection(edge),
        routing,
      });
      expect(path.points.at(-1)).toEqual(free);
      expect(path.path).not.toContain('NaN');
    }
    expect(moved.connections[0].targetPoint).toEqual(free);
  });

  it('copies fully floating edges alone and remaps mixed endpoints with their selected node', () => {
    for (const sourceAttached of [false, true]) {
      const project = connect(fixture(), sourceAttached, false),
        page = pageOf(project),
        edge = page.connections[0];
      edge.targetPoint!.metadata = { retained: true };
      edge.waypoints = [{ x: 15, y: 40 }];
      const selected = sourceAttached ? [page.nodes[0].id] : [edge.id];
      const clipboard = copyElements(page, selected, project);
      expect(clipboard.connections).toHaveLength(1);
      const idMap = Object.fromEntries(
        [...clipboard.nodes, ...clipboard.connections].map((item) => [
          item.id,
          id(),
        ]),
      );
      const copied = run(project, {
        type: 'duplicate',
        ids: selected,
        idMap,
        offset: { x: 20, y: -30 },
      });
      const duplicate = pageOf(copied).connections[1];
      expect(duplicate.targetPoint).toEqual({
        x: 380,
        y: 50,
        metadata: { retained: true },
      });
      expect(duplicate.waypoints).toEqual([{ x: 35, y: 10 }]);
      if (sourceAttached)
        expect(duplicate.sourceId).toBe(idMap[page.nodes[0].id]);
      else expect(duplicate.sourcePoint).toEqual({ x: -340, y: 50 });
      validateProject(copied);
      const duplicatedPage = applyWorkbook(
        project,
        { type: 'duplicatePage', pageId: page.id, title: 'Copy' },
        id,
        now,
      );
      const pageCopy = duplicatedPage.documents[0].pages.find(
        (p) => p.id !== page.id,
      )!;
      expect(pageCopy.connections[0].targetPoint).toEqual(edge.targetPoint);
      expect(pageCopy.connections[0].sourceId).toBe(
        sourceAttached ? pageCopy.nodes[0].id : undefined,
      );
    }
  });

  it('rejects ambiguous, missing, out-of-range or protected endpoints without mutating the project', () => {
    const project = fixture(),
      page = pageOf(project),
      original = structuredClone(project);
    const command = {
      type: 'connect' as const,
      id: id(),
      layerId: page.layers[0].id,
      targetPoint: { x: 200, y: 0 },
      options: DEFAULT_CONNECTION,
    };
    for (const source of [
      {},
      { sourceId: page.nodes[0].id, sourcePoint: { x: 0, y: 0 } },
      { sourcePoint: { x: Infinity, y: 0 } },
      { sourcePoint: { x: 1e9 + 1, y: 0 } },
      { sourcePoint: { x: 200, y: 0 } },
      { sourceId: 'missing' },
    ])
      expect(() => run(project, { ...command, ...source })).toThrow();
    expect(project).toEqual(original);
    const locked = structuredClone(project);
    pageOf(locked).layers[0].locked = true;
    expect(() => connect(locked, true, false)).toThrow();
    const valid = connect(project, false, false);
    const broken = structuredClone(valid);
    pageOf(broken).connections[0].sourceId = page.nodes[0].id;
    expect(() => validateProject(broken)).toThrow();
    expect(() =>
      assertEditableElement(pageOf(broken).connections[0]),
    ).toThrow();
  });

  it('does not reinterpret opaque point metadata as node geometry and preserves unknown data', () => {
    const project = connect(fixture(), false, false),
      edge = pageOf(project).connections[0];
    edge.sourcePoint!.geometry = { unfamiliar: 'metadata' };
    edge.extensions['org.example.keep'] = { untouched: [1, 2, 3] };
    expect(readConnectionEndpoints(edge)!.source).toEqual({
      point: { x: -360, y: 80 },
    });
    const path = connectionPath(
      edge.sourcePoint!,
      edge.targetPoint!,
      readConnection(edge),
    );
    expect(path.points[0].x).toBe(-360);
    const updated = run(project, {
      type: 'updateConnection',
      id: edge.id,
      options: { ...readConnection(edge), arrow: false },
      style: resolveAppearance(edge, [], CONNECTION_KEY),
    });
    expect(pageOf(updated).connections[0].sourcePoint).toEqual(
      edge.sourcePoint,
    );
    expect(
      pageOf(updated).connections[0].extensions['org.example.keep'],
    ).toEqual({ untouched: [1, 2, 3] });
  });

  it('uses attached node geometry when preserved opaque sibling fields also look like free point coordinates', async () => {
    const project = connect(fixture(), true, true),
      page = pageOf(project),
      [source, target] = page.nodes,
      edge = page.connections[0];
    const expected = connectionPath(source, target, readConnection(edge));
    source.x = 123456;
    source.y = -654321;
    target.x = -456789;
    target.y = 987654;
    const sourceData = structuredClone(source),
      targetData = structuredClone(target);
    validateProject(project);
    for (const routing of ['straight', 'orthogonal', 'curved'] as const) {
      const options = { ...readConnection(edge), routing };
      const plainSource = { ...source },
        plainTarget = { ...target };
      delete plainSource.x;
      delete plainSource.y;
      delete plainTarget.x;
      delete plainTarget.y;
      expect(connectionPath(source, target, options)).toEqual(
        connectionPath(plainSource, plainTarget, options),
      );
      expect(
        connectionPath(source, { x: 400, y: 0 }, options).points[0],
      ).toEqual(
        connectionPath(plainSource, { x: 400, y: 0 }, options).points[0],
      );
      expect(
        connectionPath({ x: -400, y: 0 }, target, options).points.at(-1),
      ).toEqual(
        connectionPath({ x: -400, y: 0 }, plainTarget, options).points.at(-1),
      );
    }
    expect(connectionPath(source, target, readConnection(edge))).toEqual(
      expected,
    );
    const reopened = await importProject(await exportProject(project));
    expect(pageOf(reopened).nodes).toEqual([sourceData, targetData]);
    expect(source).toEqual(sourceData);
    expect(target).toEqual(targetData);
  });
});

describe('freehand text authoring', () => {
  it('retains centered formatted text and normalized stroke data through history and an archive', async () => {
    let project = createProject('Labelled sketch', id, now);
    project = run(project, {
      type: 'freehand',
      id: id(),
      layerId: pageOf(project).layers[0].id,
      points: [
        { x: 0, y: 0 },
        { x: 120, y: 50 },
        { x: 240, y: 0 },
      ],
      stroke: '#123456',
      strokeWidth: 3,
    });
    const before = project,
      stroke = pageOf(project).nodes[0],
      history = new CommandHistory();
    const rich = fromPlainText('Centered sketch label');
    rich.paragraphs[0].runs[0].style = {
      fontFamily: 'serif',
      fontWeight: 700,
      fontStyle: 'italic',
      textColor: '#ff00ff',
    };
    project = history.execute(
      project,
      project.documents[0].id,
      pageOf(project).id,
      { type: 'richText', id: stroke.id, value: rich },
      now,
    );
    const labelled = pageOf(project).nodes[0];
    expect(readRichText(labelled)).toEqual(rich);
    expect(labelled.extensions[FREEHAND_KEY]).toEqual(
      stroke.extensions[FREEHAND_KEY],
    );
    expect(labelled.extensions[FREEHAND_TEXT_KEY]).toEqual({ version: 1 });
    expect(project.manifest.requiredFeatures).toContain(FREEHAND_TEXT_FEATURE);
    expect(
      (await importProject(await exportProject(project))).documents,
    ).toEqual(project.documents);
    expect(
      history.travel(
        project,
        project.documents[0].id,
        pageOf(project).id,
        'undo',
        now,
      ).documents,
    ).toEqual(before.documents);
    const unmarked = structuredClone(project);
    unmarked.manifest.requiredFeatures =
      unmarked.manifest.requiredFeatures.filter(
        (feature) => feature !== FREEHAND_TEXT_FEATURE,
      );
    expect(() => validateProject(unmarked)).toThrow();
    const future = structuredClone(project);
    pageOf(future).nodes[0].extensions[FREEHAND_TEXT_KEY] = {
      version: 2,
      future: true,
    };
    validateProject(future);
    expect(() => assertEditableElement(pageOf(future).nodes[0])).toThrow();
  });

  it('accepts and preserves preexisting opaque freehand content without inventing a new profile', async () => {
    const project = createProject('Imported drawing', id, now),
      page = pageOf(project);
    page.nodes.push({
      id: id(),
      kind: 'freehand',
      layerId: page.layers[0].id,
      geometry: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
      content: { text: 'Opaque old text', foreign: true },
      metadata: {},
      assetIds: [],
      dataBindings: [],
      extensions: {
        [ELEMENT_KEY]: { version: 1 },
        [FREEHAND_KEY]: { version: 2, points: [[0, 0]], foreign: true },
      },
    });
    validateProject(project);
    const next = run(project, {
      type: 'insert',
      id: id(),
      kind: 'rectangle',
      layerId: page.layers[0].id,
      position: { x: 300, y: 0 },
    });
    expect(pageOf(next).nodes[0]).toEqual(page.nodes[0]);
    expect(next.manifest.requiredFeatures).not.toContain(FREEHAND_TEXT_FEATURE);
    expect((await importProject(await exportProject(next))).documents).toEqual(
      next.documents,
    );
  });
});
