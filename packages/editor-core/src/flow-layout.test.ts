import { describe, expect, it } from 'vitest';
import { createProject, type Node, type Page } from '@koxora/project';
import { applyEdit } from './editing';
import { flowGeometries } from './flow-layout';
import { buildScene } from './scene';
import { CONNECTION_KEY, type Geometry } from './shapes';
import { intersects, MAX_COORDINATE } from './viewport';

const now = '2026-11-23T12:00:00.000Z';
const id = () => crypto.randomUUID();

function addShape(
  page: Page,
  text: string,
  x: number,
  y: number,
  extras: Partial<Geometry> = {},
): Node {
  const node = {
    id: id(),
    kind: 'rectangle',
    layerId: page.layers[0].id,
    geometry: { x, y, width: 110, height: 48, rotation: 0, ...extras },
    content: { text },
    metadata: {},
    assetIds: [],
    dataBindings: [],
    extensions: {},
  };
  page.nodes.push(node);
  return node;
}

function connect(page: Page, source: Node, target: Node, label = '') {
  const connection = {
    id: id(),
    sourceId: source.id,
    targetId: target.id,
    layerId: page.layers[0].id,
    relationType: 'connection',
    waypoints: label
      ? [
          { x: 65, y: 640 },
          { x: -375, y: 100 },
        ]
      : [],
    extensions: {
      [CONNECTION_KEY]: {
        version: 1,
        arrow: true,
        routing: 'orthogonal',
        label,
      },
    },
  };
  page.connections.push(connection);
  return connection;
}

function newProcess() {
  const project = createProject('Flowchart', id, now);
  const [document] = project.documents;
  const [page] = document.pages;
  return { project, document, page };
}

function approvalFlow() {
  const { project, document, page } = newProcess();
  const submit = addShape(page, 'Submit request', 120, 0);
  const review = addShape(page, 'High risk?', -60, 210);
  review.kind = 'diamond';
  const risk = addShape(page, 'Assess risk', -210, 175, {
    width: 168,
    height: 54,
    rotation: 29,
  });
  const scope = addShape(page, 'Verify scope', 250, 220);
  const approve = addShape(page, 'Approved?', -120, 365);
  approve.kind = 'diamond';
  const record = addShape(page, 'Record outcome', 50, 575);
  const revise = addShape(page, 'Revise request', -85, 510);
  const outside = addShape(page, 'Unselected note', 900, 900);
  connect(page, submit, review);
  connect(page, review, risk);
  connect(page, review, scope);
  connect(page, risk, approve);
  connect(page, scope, approve);
  connect(page, approve, record);
  connect(page, approve, revise);
  const feedback = connect(page, revise, review, 'Review again');
  connect(page, record, outside);
  return {
    project,
    document,
    page,
    submit,
    review,
    risk,
    scope,
    approve,
    record,
    revise,
    outside,
    feedback,
  };
}

describe('selected flowchart layout', () => {
  it.each(['top-down', 'left-right'] as const)(
    'arranges branching, joining and rework in the %s direction',
    (direction) => {
      const {
        project,
        document,
        page,
        submit,
        review,
        risk,
        scope,
        approve,
        record,
        revise,
        outside,
        feedback,
      } = approvalFlow();
      const selection = [
        submit,
        review,
        risk,
        scope,
        approve,
        record,
        revise,
      ].map((node) => node.id);
      selection.push(feedback.id);
      const original = structuredClone(page);
      const scene = buildScene(page);
      const result = flowGeometries(scene, page, selection, direction);
      expect(result).toEqual(
        flowGeometries(
          scene,
          { connections: [...page.connections].reverse() },
          [...selection].reverse(),
          direction,
        ),
      );
      if (!result.ok) throw new Error(result.reason);
      expect(result.geometries).not.toHaveProperty(submit.id);
      expect(result.geometries).not.toHaveProperty(outside.id);
      expect(result.geometries[risk.id]).toMatchObject({
        width: 168,
        height: 54,
        rotation: 29,
      });

      const arranged = applyEdit(
        project,
        document.id,
        page.id,
        { type: 'transform', geometries: result.geometries },
        now,
      );
      const arrangedPage = arranged.documents[0].pages[0];
      expect(page).toEqual(original);
      expect(arrangedPage.connections).toEqual(original.connections);
      expect(arrangedPage.nodes).toEqual(
        original.nodes.map((node) => ({
          ...node,
          geometry: result.geometries[node.id] ?? node.geometry,
        })),
      );
      const arrangedScene = buildScene(arrangedPage);
      const bounds = (node: Node) =>
        arrangedScene.nodes.find(({ id }) => id === node.id)!.bounds;
      const rank = direction === 'top-down' ? 'y' : 'x';
      const rankSize = direction === 'top-down' ? 'height' : 'width';
      const cross = direction === 'top-down' ? 'x' : 'y';
      const crossSize = direction === 'top-down' ? 'width' : 'height';
      const after = (target: Node, source: Node) =>
        expect(bounds(target)[rank]).toBeGreaterThan(
          bounds(source)[rank] + bounds(source)[rankSize],
        );
      after(review, submit);
      after(risk, review);
      after(scope, review);
      expect(bounds(risk)[rank]).toBeCloseTo(bounds(scope)[rank]);
      expect(bounds(scope)[cross]).toBeGreaterThan(
        bounds(risk)[cross] + bounds(risk)[crossSize],
      );
      after(approve, risk);
      after(approve, scope);
      after(record, approve);
      after(revise, approve);
      expect(bounds(record)[rank]).toBeCloseTo(bounds(revise)[rank]);
      for (const [i, node] of arrangedScene.nodes.entries())
        expect(
          arrangedScene.nodes
            .slice(i + 1)
            .some((other) => intersects(node.bounds, other.bounds)),
        ).toBe(false);
      expect(
        flowGeometries(arrangedScene, arrangedPage, selection, direction),
      ).toEqual({ ok: true, geometries: {} });
    },
  );

  it('places multiple starting steps before their shared outcome with one fixed anchor', () => {
    const { page } = newProcess();
    const first = addShape(page, 'First input', -180, 30);
    const second = addShape(page, 'Second input', 180, -100);
    const join = addShape(page, 'Combine', 10, -190);
    connect(page, first, join);
    connect(page, second, join);
    const result = flowGeometries(buildScene(page), page, [
      join.id,
      second.id,
      first.id,
    ]);
    if (!result.ok) throw new Error(result.reason);
    expect(result.geometries).not.toHaveProperty(first.id);
    expect(result.geometries[second.id].y).toBe(first.geometry.y);
    expect(result.geometries[join.id].y).toBeGreaterThan(
      first.geometry.y + first.geometry.height,
    );
  });

  it('anchors a source-free cycle at the first calculated stage', () => {
    const { page } = newProcess();
    const start = addShape(page, 'Start here', 10, 190);
    const middle = addShape(page, 'Middle', -30, 50);
    const later = addShape(page, 'Later', 75, -190);
    connect(page, later, start);
    connect(page, start, middle);
    connect(page, middle, later);
    const selection = [middle.id, later.id, start.id];
    const result = flowGeometries(buildScene(page), page, selection);
    if (!result.ok) throw new Error(result.reason);
    expect(result.geometries).not.toHaveProperty(start.id);
    expect(result.geometries[middle.id].y).toBeGreaterThan(start.geometry.y);
    expect(result.geometries[later.id].y).toBeGreaterThan(
      result.geometries[middle.id].y,
    );
  });

  it('keeps the same ranks and anchor when layout is applied again to a complex cycle', () => {
    const { project, document, page } = newProcess();
    const a = addShape(page, 'Result', 0, 0);
    const b = addShape(page, 'Review', 300, 2700);
    const c = addShape(page, 'Decision', 600, 1800);
    const d = addShape(page, 'Revision', 900, 900);
    for (const [source, target] of [
      [b, c],
      [b, d],
      [c, a],
      [c, b],
      [c, d],
      [d, c],
    ])
      connect(page, source, target);
    const selection = page.nodes.map(({ id }) => id);
    const first = flowGeometries(buildScene(page), page, selection);
    if (!first.ok) throw new Error(first.reason);
    const updated = applyEdit(
      project,
      document.id,
      page.id,
      { type: 'transform', geometries: first.geometries },
      now,
    ).documents[0].pages[0];
    expect(updated.connections).toEqual(page.connections);
    expect(flowGeometries(buildScene(updated), updated, selection)).toEqual({
      ok: true,
      geometries: {},
    });
  });

  it('rejects disconnected shapes and an ineligible selection without changing the project', () => {
    const { page } = newProcess();
    const start = addShape(page, 'Start', 0, 0);
    const end = addShape(page, 'End', 120, 230);
    const separate = addShape(page, 'Unconnected', 450, 60);
    const edge = connect(page, start, end);
    const before = structuredClone(page);
    const scene = buildScene(page);
    expect(
      flowGeometries(scene, page, [start.id, end.id, separate.id]),
    ).toEqual({ ok: false, reason: 'structure' });
    expect(flowGeometries(scene, page, [start.id, edge.id])).toEqual({
      ok: false,
      reason: 'selection',
    });
    expect(page).toEqual(before);
  });

  it('checks obstacles and coordinate limits for the horizontal layout', () => {
    const { page } = newProcess();
    const start = addShape(page, 'Start', 0, 0);
    const end = addShape(page, 'End', -90, 190);
    connect(page, start, end);
    const selection = [start.id, end.id];
    const initial = flowGeometries(
      buildScene(page),
      page,
      selection,
      'left-right',
    );
    if (!initial.ok) throw new Error(initial.reason);
    const target = initial.geometries[end.id];
    addShape(page, 'Occupied', target.x, target.y);
    expect(
      flowGeometries(buildScene(page), page, selection, 'left-right'),
    ).toEqual({ ok: false, reason: 'occupied' });
    start.geometry.x = MAX_COORDINATE - 10;
    expect(
      flowGeometries(buildScene(page), page, selection, 'left-right'),
    ).toEqual({ ok: false, reason: 'bounds' });
  });
});
