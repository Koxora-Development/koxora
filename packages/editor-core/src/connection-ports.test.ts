import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
  type Json,
  type Project,
} from '@koxora/project';
import {
  anchorPoint,
  applyEdit,
  applyWorkbook,
  assertEditableElement,
  boundaryPoint,
  buildScene,
  CommandHistory,
  connectionPath,
  connectionPortsForNode,
  CONNECTION_KEY,
  CONNECTION_PORTS_FEATURE,
  containsShape,
  copyElements,
  DEFAULT_CONNECTION,
  hasConnectionPorts,
  isConnectionAnchor,
  LEGACY_CONNECTION_ANCHORS,
  readConnection,
  reflectPoint,
  resolveAppearance,
  rotatePoint,
  shapeCenter,
  shapeRegistry,
  type Anchor,
  type EditCommand,
  type Geometry,
  type ShapeKind,
} from './index';

const now = '2026-11-17T10:00:00.000Z';
const id = () => crypto.randomUUID();
const pageOf = (project: Project) => project.documents[0].pages[0];
const run = (project: Project, command: EditCommand) =>
  applyEdit(project, project.documents[0].id, pageOf(project).id, command, now);
const geometry: Geometry = {
  x: -80,
  y: 40,
  width: 160,
  height: 88,
  rotation: 0,
};
function fixture() {
  let project = createProject('Stable local connection ports', id, now);
  for (const x of [-300, 300])
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
function connected(
  sourceAnchor: Anchor = { x: 0.25, y: 0 },
  targetAnchor: Anchor = 'west',
) {
  const project = fixture(),
    page = pageOf(project);
  return run(project, {
    type: 'connect',
    id: id(),
    sourceId: page.nodes[0].id,
    targetId: page.nodes[1].id,
    layerId: page.layers[0].id,
    options: { ...DEFAULT_CONNECTION, sourceAnchor, targetAnchor },
  });
}

describe('adaptive contour ports', () => {
  it('scales rectangular and equipment port counts with dimensions while bounding density', () => {
    const ports = (kind: ShapeKind, width: number, height: number) =>
      connectionPortsForNode({
        kind,
        geometry: { ...geometry, width, height },
      });
    expect(ports('rectangle', 160, 88)).toHaveLength(4);
    expect(ports('rectangle', 360, 100)).toHaveLength(8);
    expect(ports('rectangle', 360, 240)).toHaveLength(12);
    expect(ports('table', 640, 480)).toHaveLength(20);
    expect(ports('network-switch', 360, 100)).toHaveLength(8);
    expect(ports('server', 160, 360)).toHaveLength(8);
    expect(ports('rectangle', 1e8, 1e8)).toHaveLength(28);
    expect(ports('triangle', 144, 120)).toHaveLength(6);
    expect(ports('hexagon', 176, 96)).toHaveLength(8);
    expect(ports('ellipse', 128, 128)).toHaveLength(4);
    expect(ports('ellipse', 280, 180)).toHaveLength(8);
    expect(ports('ellipse', 500, 300)).toHaveLength(12);
    expect(ports('ellipse', 1e8, 1e8)).toHaveLength(24);
    expect(ports('line', 400, 1)).toEqual([]);
    expect(connectionPortsForNode({ kind: 'freehand', geometry })).toEqual([]);
  });
  it.each([
    'rectangle',
    'rounded-rectangle',
    'ellipse',
    'triangle',
    'diamond',
    'hexagon',
    'cross',
    'star-5',
    'cloud',
    'server',
    'network-switch',
  ] as ShapeKind[])(
    '%s ports agree with the visible contour after reflection and rotation',
    (kind) => {
      const definition = shapeRegistry[kind];
      const node = {
        kind,
        geometry: {
          ...geometry,
          width: definition.width * 2.3,
          height: definition.height * 1.7,
          rotation: 37,
          flipX: true,
          flipY: true,
        },
      };
      const center = shapeCenter(node.geometry),
        ports = connectionPortsForNode(node);
      expect(ports.length).toBeGreaterThanOrEqual(4);
      expect(ports.length).toBeLessThanOrEqual(28);
      for (const port of ports) {
        expect(isConnectionAnchor(port.anchor)).toBe(true);
        expect(port.point).toEqual(anchorPoint(node, center, port.anchor));
        expect(
          containsShape(kind, node.geometry, {
            x: center.x + (port.point.x - center.x) * 0.999,
            y: center.y + (port.point.y - center.y) * 0.999,
          }),
        ).toBe(true);
        expect(
          containsShape(kind, node.geometry, {
            x: center.x + (port.point.x - center.x) * 1.001,
            y: center.y + (port.point.y - center.y) * 1.001,
          }),
        ).toBe(false);
      }
    },
  );
  it('preserves exact legacy cardinal and automatic geometry', () => {
    const node = {
      kind: 'triangle',
      geometry: { ...geometry, rotation: 63, flipX: true, flipY: true },
    };
    const center = shapeCenter(node.geometry),
      toward = { x: 300, y: -400 };
    for (const [anchor, direction] of [
      ['north', { x: 0, y: -1 }],
      ['east', { x: 1, y: 0 }],
      ['south', { x: 0, y: 1 }],
      ['west', { x: -1, y: 0 }],
    ] as const)
      expect(anchorPoint(node, toward, anchor)).toEqual(
        boundaryPoint(
          node.kind,
          node.geometry,
          rotatePoint(
            reflectPoint(
              { x: center.x + direction.x, y: center.y + direction.y },
              node.geometry,
            ),
            center,
            node.geometry.rotation,
          ),
        ),
      );
    expect(anchorPoint(node, toward, 'auto')).toEqual(
      boundaryPoint(node.kind, node.geometry, toward),
    );
    expect(
      pageOf(connected('north', 'south')).connections[0].extensions[
        CONNECTION_KEY
      ],
    ).toMatchObject({ sourceAnchor: 'north', targetAnchor: 'south' });
    expect(connected('north', 'south').manifest.requiredFeatures).not.toContain(
      CONNECTION_PORTS_FEATURE,
    );
  });
  it('retains the same normalized location when candidate density changes and applies local flips before rotation', () => {
    const anchor: Anchor = { x: 0.25, y: 0 },
      toward = { x: 1000, y: 1000 };
    for (const width of [360, 80]) {
      const node = {
        kind: 'rectangle',
        geometry: {
          ...geometry,
          width,
          rotation: 90,
          flipX: true,
          flipY: true,
        },
      };
      const local = { x: node.geometry.x + width * 0.25, y: node.geometry.y };
      const expected = rotatePoint(
        reflectPoint(local, node.geometry),
        shapeCenter(node.geometry),
        node.geometry.rotation,
      );
      const point = anchorPoint(node, toward, anchor);
      expect(point.x).toBeCloseTo(expected.x, 8);
      expect(point.y).toBeCloseTo(expected.y, 8);
      expect(
        connectionPortsForNode(node).some(
          (port) =>
            typeof port.anchor === 'object' &&
            port.anchor.x === 0.25 &&
            port.anchor.y === 0,
        ),
      ).toBe(width === 360);
    }
    let project = connected(anchor);
    const source = pageOf(project).nodes[0];
    project = run(project, {
      type: 'transform',
      geometries: {
        [source.id]: {
          ...source.geometry,
          width: 80,
          height: 64,
          rotation: 39,
          flipX: true,
        },
      },
    });
    expect(readConnection(pageOf(project).connections[0]).sourceAnchor).toEqual(
      anchor,
    );
  });
});

describe('portable normalized anchors', () => {
  it('isolates mutable anchors at read, connect and update boundaries so history cannot drift', () => {
    const initial = fixture(),
      page = pageOf(initial),
      history = new CommandHistory();
    const sourceAnchor = { x: 0.25, y: 0, metadata: { keep: 'original' } };
    const targetAnchor = { x: 1, y: 0.75, metadata: { keep: 'target' } };
    const connectedProject = history.execute(
      initial,
      initial.documents[0].id,
      page.id,
      {
        type: 'connect',
        id: id(),
        sourceId: page.nodes[0].id,
        targetId: page.nodes[1].id,
        layerId: page.layers[0].id,
        options: { ...DEFAULT_CONNECTION, sourceAnchor, targetAnchor },
      },
      now,
    );
    const snapshot = structuredClone(connectedProject);
    sourceAnchor.x = 0.9;
    sourceAnchor.metadata.keep = 'mutated input';
    targetAnchor.metadata.keep = 'mutated target';
    const edge = pageOf(connectedProject).connections[0];
    const read = readConnection(edge);
    (read.sourceAnchor as typeof sourceAnchor).metadata.keep = 'mutated read';
    (read.targetAnchor as typeof targetAnchor).x = 0.2;
    expect(connectedProject).toEqual(snapshot);
    const undo = history.travel(
      connectedProject,
      initial.documents[0].id,
      page.id,
      'undo',
      now,
    );
    const redo = history.travel(
      undo,
      initial.documents[0].id,
      page.id,
      'redo',
      now,
    );
    expect(redo.documents).toEqual(snapshot.documents);
    const updateAnchor = { x: 0, y: 0.25, metadata: { keep: 'updated' } };
    const updated = history.execute(
      connectedProject,
      initial.documents[0].id,
      page.id,
      {
        type: 'updateConnection',
        id: edge.id,
        options: { ...readConnection(edge), sourceAnchor: updateAnchor },
        style: resolveAppearance(edge, [], CONNECTION_KEY),
      },
      now,
    );
    const updateSnapshot = structuredClone(updated);
    updateAnchor.y = 0.9;
    updateAnchor.metadata.keep = 'mutated update input';
    expect(updated).toEqual(updateSnapshot);
    expect(
      history.travel(updated, initial.documents[0].id, page.id, 'undo', now)
        .documents,
    ).toEqual(connectedProject.documents);
  });
  it('validates bounded finite coordinates without coercion or a center direction', () => {
    for (const anchor of [
      ...LEGACY_CONNECTION_ANCHORS,
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0.1, y: 0.75 },
    ])
      expect(isConnectionAnchor(anchor)).toBe(true);
    for (const value of [
      undefined,
      null,
      [],
      {},
      'center',
      3,
      { x: '0', y: 0 },
      { x: 0.5, y: 0.5 },
      { x: NaN, y: 1 },
      { x: 0, y: Infinity },
      { x: -0.1, y: 1 },
      { x: 0, y: 1.01 },
      { toString: null },
    ])
      expect(isConnectionAnchor(value)).toBe(false);
    expect(hasConnectionPorts({ sourceAnchor: { x: 0.1, y: 0 } })).toBe(true);
    expect(hasConnectionPorts(DEFAULT_CONNECTION)).toBe(false);
  });
  it('requires the feature for normalized anchors and junction nodes while rejecting malformed known anchors atomically', () => {
    const initial = connected(),
      edge = pageOf(initial).connections[0];
    expect(initial.manifest.requiredFeatures).toContain(
      CONNECTION_PORTS_FEATURE,
    );
    const missing = structuredClone(initial);
    missing.manifest.requiredFeatures =
      missing.manifest.requiredFeatures.filter(
        (feature) => feature !== CONNECTION_PORTS_FEATURE,
      );
    expect(() => validateProject(missing)).toThrow(/feature/);
    for (const sourceAnchor of [
      { x: 0.5, y: 0.5 },
      { x: -1, y: 0 },
      { x: 1, y: 2 },
      { x: NaN, y: 0 },
      { x: 0, y: Infinity },
      'future',
    ]) {
      const snapshot = structuredClone(initial);
      expect(() =>
        run(initial, {
          type: 'updateConnection',
          id: edge.id,
          options: {
            ...readConnection(edge),
            sourceAnchor: sourceAnchor as Anchor,
          },
          style: resolveAppearance(edge, [], CONNECTION_KEY),
        }),
      ).toThrow(/invalid/);
      expect(initial).toEqual(snapshot);
      const malformed = structuredClone(initial),
        raw = pageOf(malformed).connections[0].extensions[
          CONNECTION_KEY
        ] as Record<string, Json>;
      raw.sourceAnchor = sourceAnchor;
      expect(() => validateProject(malformed)).toThrow();
      expect(() =>
        assertEditableElement(pageOf(malformed).connections[0]),
      ).toThrow(/unsupported/);
      expect(buildScene(pageOf(malformed)).connections[0].editable).toBe(false);
    }
    const junctionBase = fixture();
    const junction = run(junctionBase, {
      type: 'insert',
      id: id(),
      kind: 'junction',
      layerId: pageOf(junctionBase).layers[0].id,
      position: { x: 0, y: 0 },
      snap: false,
    });
    junction.manifest.requiredFeatures =
      junction.manifest.requiredFeatures.filter(
        (feature) => feature !== CONNECTION_PORTS_FEATURE,
      );
    expect(() => validateProject(junction)).toThrow(/feature/);
  });
  it('preserves unknown siblings, anchor metadata, features and identities through editing, history, duplication and native archives', async () => {
    const initial = connected(),
      page = pageOf(initial),
      edge = page.connections[0];
    const raw = edge.extensions[CONNECTION_KEY] as Record<string, Json>;
    raw.future = { keep: ['opaque', 7] };
    raw.sourceAnchor = { x: 0.25, y: 0, metadata: { keep: true } };
    edge.extensions['org.example.future'] = { keep: true };
    edge.waypoints = [{ x: -5, y: 100 }];
    const history = new CommandHistory();
    const changed = history.execute(
      initial,
      initial.documents[0].id,
      page.id,
      {
        type: 'updateConnection',
        id: edge.id,
        options: { ...readConnection(edge), label: 'Retain ports' },
        style: resolveAppearance(edge, [], CONNECTION_KEY),
      },
      now,
    );
    expect(
      pageOf(changed).connections[0].extensions[CONNECTION_KEY],
    ).toMatchObject({ future: raw.future, sourceAnchor: raw.sourceAnchor });
    expect(pageOf(changed).connections[0].waypoints).toEqual(edge.waypoints);
    const undone = history.travel(
      changed,
      initial.documents[0].id,
      page.id,
      'undo',
      now,
    );
    expect(undone.documents).toEqual(initial.documents);
    const redone = history.travel(
      undone,
      initial.documents[0].id,
      page.id,
      'redo',
      now,
    );
    expect(redone.documents).toEqual(changed.documents);
    const selected = page.nodes.map((node) => node.id),
      clipboard = copyElements(page, selected, initial);
    const idMap = Object.fromEntries(
      [...clipboard.nodes, ...clipboard.connections].map((item) => [
        item.id,
        id(),
      ]),
    );
    const duplicate = run(initial, {
      type: 'duplicate',
      ids: selected,
      idMap,
      offset: { x: 20, y: 30 },
    });
    expect(pageOf(duplicate).connections[1]).toMatchObject({
      sourceId: idMap[edge.sourceId!],
      targetId: idMap[edge.targetId!],
      extensions: edge.extensions,
    });
    expect(
      (await importProject(await exportProject(duplicate))).documents,
    ).toEqual(duplicate.documents);
    const cleared = run(changed, {
      type: 'updateConnection',
      id: edge.id,
      options: DEFAULT_CONNECTION,
      style: resolveAppearance(edge, [], CONNECTION_KEY),
    });
    expect(cleared.manifest.requiredFeatures).toContain(
      CONNECTION_PORTS_FEATURE,
    );
    const legacy = connected('east', 'west'),
      legacyEdge = pageOf(legacy).connections[0],
      featureHistory = new CommandHistory();
    const newlyAnchored = featureHistory.execute(
      legacy,
      legacy.documents[0].id,
      pageOf(legacy).id,
      {
        type: 'updateConnection',
        id: legacyEdge.id,
        options: {
          ...readConnection(legacyEdge),
          sourceAnchor: { x: 0.25, y: 0 },
        },
        style: resolveAppearance(legacyEdge, [], CONNECTION_KEY),
      },
      now,
    );
    expect(
      featureHistory.travel(
        newlyAnchored,
        legacy.documents[0].id,
        pageOf(legacy).id,
        'undo',
        now,
      ).manifest.requiredFeatures,
    ).toContain(CONNECTION_PORTS_FEATURE);
  });
  it('preserves future extension versions read-only without interpreting their anchor-looking fields or adding a feature', async () => {
    const project = connected('east', 'west'),
      edge = pageOf(project).connections[0];
    edge.extensions[CONNECTION_KEY] = {
      version: 2,
      sourceAnchor: { x: 0.1, y: 0 },
      targetAnchor: { x: -2, y: 9 },
      future: { keep: true },
    };
    validateProject(project);
    expect(() => assertEditableElement(edge)).toThrow(/unsupported/);
    expect(buildScene(pageOf(project)).connections[0].editable).toBe(false);
    expect(readConnection(edge).sourceAnchor).toBe('auto');
    const changed = run(project, {
      type: 'insert',
      id: id(),
      kind: 'ellipse',
      layerId: pageOf(project).layers[0].id,
      position: { x: 0, y: 300 },
    });
    expect(changed.manifest.requiredFeatures).not.toContain(
      CONNECTION_PORTS_FEATURE,
    );
    expect(pageOf(changed).connections[0]).toEqual(edge);
    expect(
      (await importProject(await exportProject(changed))).documents,
    ).toEqual(changed.documents);
    const unknownFeature = structuredClone(changed);
    unknownFeature.manifest.requiredFeatures.push('future-ports-v2');
    expect(() => validateProject(unknownFeature)).toThrow(/unsupported/);
  });
});

describe('ordinary shared junctions', () => {
  function branched() {
    let project = fixture();
    for (const position of [
      { x: 200, y: -200 },
      { x: 200, y: 200 },
    ])
      project = run(project, {
        type: 'insert',
        id: id(),
        kind: 'ellipse',
        layerId: pageOf(project).layers[0].id,
        position,
        snap: false,
      });
    project = run(project, {
      type: 'insert',
      id: id(),
      kind: 'junction',
      layerId: pageOf(project).layers[0].id,
      position: { x: 0, y: 0 },
      snap: false,
    });
    const page = pageOf(project),
      junction = page.nodes[4];
    for (const [index, node] of page.nodes.slice(0, 4).entries())
      project = run(project, {
        type: 'connect',
        id: id(),
        sourceId: index === 0 ? node.id : junction.id,
        targetId: index === 0 ? junction.id : node.id,
        layerId: page.layers[0].id,
        options: {
          ...DEFAULT_CONNECTION,
          routing: (['straight', 'orthogonal', 'curved'] as const)[index % 3],
          sourceAnchor: index === 0 ? { x: 1, y: 0.25 } : 'north',
          targetAnchor: index === 0 ? 'south' : 'west',
          label: `Branch ${index}`,
        },
      });
    return project;
  }
  it('joins one source and three targets at exactly one center through movement, resizing, rotation and reflection', () => {
    let project = branched();
    let junction = pageOf(project).nodes[4];
    expect(junction.geometry).toMatchObject({ width: 16, height: 16 });
    expect(junction.content.text).toBe('');
    expect(resolveAppearance(junction).fill).toBe(
      resolveAppearance(junction).stroke,
    );
    for (const transformed of [false, true]) {
      if (transformed) {
        project = run(project, {
          type: 'transform',
          geometries: {
            [junction.id]: {
              ...junction.geometry,
              x: 30,
              y: -40,
              width: 48,
              height: 32,
              rotation: 129,
              flipX: true,
              flipY: true,
            },
          },
        });
        junction = pageOf(project).nodes[4];
      }
      const center = shapeCenter(junction.geometry),
        page = pageOf(project);
      expect(connectionPortsForNode(junction)).toEqual([
        { anchor: 'auto', point: center },
      ]);
      for (const anchor of [...LEGACY_CONNECTION_ANCHORS, { x: 0, y: 1 }])
        expect(anchorPoint(junction, { x: 300, y: -400 }, anchor)).toEqual(
          center,
        );
      for (const edge of page.connections) {
        const source = page.nodes.find((node) => node.id === edge.sourceId)!,
          target = page.nodes.find((node) => node.id === edge.targetId)!;
        const path = connectionPath(source, target, readConnection(edge));
        expect(
          edge.sourceId === junction.id ? path.points[0] : path.points.at(-1),
        ).toEqual(center);
      }
    }
  });
  it('preserves branch identities and shared endpoints through duplicate, page copy, detach/reattach, deletion, history and native reopening', async () => {
    const initial = branched(),
      page = pageOf(initial),
      junction = page.nodes[4],
      selected = page.nodes.map((node) => node.id),
      history = new CommandHistory();
    const clipboard = copyElements(page, selected, initial),
      idMap = Object.fromEntries(
        [...clipboard.nodes, ...clipboard.connections].map((item) => [
          item.id,
          id(),
        ]),
      );
    const duplicated = run(initial, {
      type: 'duplicate',
      ids: selected,
      idMap,
      offset: { x: 100, y: 100 },
    });
    expect(
      pageOf(duplicated)
        .connections.slice(4)
        .every(
          (edge) =>
            edge.sourceId === idMap[junction.id] ||
            edge.targetId === idMap[junction.id],
        ),
    ).toBe(true);
    const pageCopy = applyWorkbook(
      initial,
      { type: 'duplicatePage', pageId: page.id, title: 'Branches copy' },
      id,
      now,
    ).documents[0].pages[1];
    const copiedJunction = pageCopy.nodes.find(
      (node) => node.kind === 'junction',
    )!;
    expect(
      pageCopy.connections.every(
        (edge) =>
          edge.sourceId === copiedJunction.id ||
          edge.targetId === copiedJunction.id,
      ),
    ).toBe(true);
    const edge = page.connections[1];
    const detached = history.execute(
      initial,
      initial.documents[0].id,
      page.id,
      {
        type: 'updateConnection',
        id: edge.id,
        source: { point: { x: 50, y: 70 } },
        options: readConnection(edge),
        style: resolveAppearance(edge, [], CONNECTION_KEY),
      },
      now,
    );
    expect(pageOf(detached).connections[1]).toMatchObject({
      id: edge.id,
      sourcePoint: { x: 50, y: 70 },
    });
    expect(
      history.travel(detached, initial.documents[0].id, page.id, 'undo', now)
        .documents,
    ).toEqual(initial.documents);
    const reattached = run(detached, {
      type: 'updateConnection',
      id: edge.id,
      source: { nodeId: junction.id },
      options: readConnection(edge),
      style: resolveAppearance(edge, [], CONNECTION_KEY),
    });
    expect(pageOf(reattached).connections[1].sourceId).toBe(junction.id);
    const deleted = history.execute(
      reattached,
      initial.documents[0].id,
      page.id,
      { type: 'delete', ids: [junction.id] },
      now,
    );
    expect(pageOf(deleted).connections).toHaveLength(0);
    const restored = history.travel(
      deleted,
      initial.documents[0].id,
      page.id,
      'undo',
      now,
    );
    expect(restored.documents).toEqual(reattached.documents);
    expect(
      (await importProject(await exportProject(restored))).documents,
    ).toEqual(restored.documents);
    expect(deleted.manifest.requiredFeatures).toContain(
      CONNECTION_PORTS_FEATURE,
    );
  });
});
