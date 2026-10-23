import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createProject,
  exportProject,
  importProject,
  type Node,
} from '@koxora/project';
import {
  activePageId,
  buildScene,
  CANVAS_KEY,
  clampZoom,
  fitBounds,
  gridStep,
  normalizeCamera,
  pan,
  pinch,
  readCanvas,
  screenToWorld,
  selectPage,
  snapPoint,
  visibleBounds,
  visibleScene,
  wheelDelta,
  WORKSPACE_KEY,
  worldToScreen,
  writeCanvas,
  zoomAt,
} from './index';
const make = () =>
  createProject(
    'Canvas',
    () => crypto.randomUUID(),
    '2026-01-01T00:00:00.000Z',
  );
const size = { width: 1200, height: 800 };
describe('platform-independent viewport', () => {
  it.each([0.02, 0.25, 1, 2, 16])(
    'round-trips coordinates at zoom %s, including negative and large worlds',
    (zoom) => {
      const camera = { x: 1e9, y: -1e9, zoom };
      for (const point of [
        { x: 0, y: 0 },
        { x: -123.5, y: 79.125 },
        { x: 1e9 + 20, y: -1e9 - 90 },
      ]) {
        const result = screenToWorld(
          worldToScreen(point, camera, size),
          camera,
          size,
        );
        expect(result.x).toBeCloseTo(point.x, 4);
        expect(result.y).toBeCloseTo(point.y, 4);
      }
    },
  );
  it('anchors zoom at the pointer even when reaching either limit', () => {
    const camera = { x: -200, y: 300, zoom: 0.5 },
      anchor = { x: 37, y: 175 };
    const world = screenToWorld(anchor, camera, size);
    for (const requested of [1e-9, 0.7, 1e8])
      expect(
        worldToScreen(world, zoomAt(camera, requested, anchor, size), size),
      ).toEqual(
        expect.objectContaining({
          x: expect.closeTo(anchor.x, 6),
          y: expect.closeTo(anchor.y, 6),
        }),
      );
  });
  it('pans in CSS pixels, repeatedly without accumulating a zoom-dependent offset', () => {
    const initial = { x: -2000, y: 3000, zoom: 0.25 };
    let camera = initial;
    for (let i = 0; i < 10000; i++) {
      camera = pan(camera, { x: 5, y: -7 });
      camera = pan(camera, { x: -5, y: 7 });
    }
    expect(camera).toEqual(initial);
    expect(pan(initial, { x: 20, y: 30 })).toEqual({
      x: -2080,
      y: 2880,
      zoom: 0.25,
    });
  });
  it('keeps the world center stable across resize and device scale changes', () => {
    const camera = { x: 50, y: -70, zoom: 2 };
    for (const size of [
      { width: 400, height: 300 },
      { width: 1920, height: 1080 },
    ])
      expect(
        screenToWorld({ x: size.width / 2, y: size.height / 2 }, camera, size),
      ).toEqual({ x: 50, y: -70 });
  });
  it('pinches around the initial midpoint and translates with the fingers', () => {
    const result = pinch(
      { x: 0, y: 0, zoom: 1 },
      [
        { x: 500, y: 400 },
        { x: 700, y: 400 },
      ],
      [
        { x: 450, y: 450 },
        { x: 850, y: 450 },
      ],
      size,
    );
    expect(result).toEqual({ x: -25, y: -25, zoom: 2 });
  });
  it('fits rotated scene bounds and empty pages, respecting padding', () => {
    const bounds = { x: -400, y: -200, width: 800, height: 400 };
    const camera = fitBounds(bounds, size);
    expect(worldToScreen(bounds, camera, size).x).toBeGreaterThanOrEqual(48);
    expect(fitBounds(null, size)).toEqual({ x: 0, y: 0, zoom: 1 });
  });
  it('normalizes nonfinite values and supports explicit zoom limits', () => {
    expect(normalizeCamera({ x: Infinity, y: NaN, zoom: NaN })).toEqual({
      x: 0,
      y: 0,
      zoom: 1,
    });
    expect(clampZoom(10, { min: 0.1, max: 4 })).toBe(4);
    expect(() => clampZoom(1, { min: 0, max: 1 })).toThrow();
    expect(wheelDelta({ x: 1, y: 2 }, 1, size)).toEqual({ x: 16, y: 32 });
    expect(wheelDelta({ x: 0, y: 1 }, 2, size).y).toBe(800);
  });
});
describe('world grid', () => {
  it('snaps positive and negative coordinates independently of camera and visibility', () => {
    expect(snapPoint({ x: 23, y: -23 }, 10)).toEqual({ x: 20, y: -20 });
    expect(snapPoint({ x: 23, y: -23 }, 10, false)).toEqual({ x: 23, y: -23 });
    expect(snapPoint({ x: 23, y: -23 }, 10, true, { x: 2, y: 2 })).toEqual({
      x: 22,
      y: -18,
    });
    expect(() => snapPoint({ x: 0, y: 0 }, 0)).toThrow();
  });
  it('coarsens the rendered grid to at least 12 CSS pixels without changing snap spacing', () => {
    for (const zoom of [0.02, 0.1, 1, 16]) {
      const step = gridStep(24, zoom);
      expect(step * zoom).toBeGreaterThanOrEqual(12);
      expect(step % 24).toBe(0);
    }
  });
});
describe('portable view settings', () => {
  it('round-trips navigation, grid and active page while preserving unknown content and binary assets', async () => {
    const original = await importProject(
      new Uint8Array(
        readFileSync('packages/project/fixtures/complete-v1.koxora'),
      ),
    );
    const document = original.documents.at(-1)!,
      page = document.pages.at(-1)!;
    page.viewport.future = { kept: true };
    page.presentation[CANVAS_KEY] = { version: 1, future: { kept: true } };
    original.manifest.extensions[WORKSPACE_KEY] = {
      version: 1,
      future: 'retained',
    };
    const state = {
      camera: { x: -45, y: 987, zoom: 2.5 },
      grid: { visible: false, snap: true, spacing: 16 },
    };
    const next = selectPage(
      writeCanvas(original, document.id, page.id, state),
      document.id,
      page.id,
    );
    const restored = await importProject(await exportProject(next));
    const result = restored.documents.at(-1)!.pages.at(-1)!;
    expect(readCanvas(result)).toMatchObject(state);
    expect(activePageId(restored)).toBe(page.id);
    expect(result.viewport.future).toEqual({ kept: true });
    expect(result.presentation[CANVAS_KEY]).toMatchObject({
      future: { kept: true },
    });
    expect(restored.manifest.extensions[WORKSPACE_KEY]).toMatchObject({
      future: 'retained',
    });
    expect(result.nodes).toEqual(page.nodes);
    expect(result.connections).toEqual(page.connections);
    for (const asset of original.assets)
      expect(restored.files[asset.path]).toEqual(original.files[asset.path]);
    expect(original.documents.at(-1)!.pages.at(-1)!.viewport.zoom).not.toBe(
      2.5,
    );
  });
  it('does not modify untouched imports or unknown newer settings', () => {
    const project = make(),
      doc = project.documents[0],
      page = doc.pages[0];
    expect(writeCanvas(project, doc.id, page.id, readCanvas(page))).toBe(
      project,
    );
    page.presentation[CANVAS_KEY] = { version: 2, future: 'keep' };
    project.manifest.extensions[WORKSPACE_KEY] = {
      version: 2,
      pageId: 'unknown',
    };
    expect(readCanvas(page).writable).toBe(false);
    expect(
      writeCanvas(project, doc.id, page.id, {
        camera: { x: 10, y: 20, zoom: 2 },
        grid: { visible: false, snap: true, spacing: 10 },
      }),
    ).toBe(project);
    expect(selectPage(project, doc.id, page.id)).toBe(project);
  });
  it('falls back for malformed optional settings, missing pages and out-of-range saved views without rewriting on read', () => {
    const project = make(),
      page = project.documents[0].pages[0];
    page.viewport.zoom = 1000;
    page.presentation[CANVAS_KEY] = {
      version: 1,
      spacing: -20,
      visible: 'wrong',
    };
    expect(readCanvas(page)).toMatchObject({
      adjusted: true,
      grid: { spacing: 24, visible: true },
    });
    expect(page.viewport.zoom).toBe(1000);
    expect(activePageId(project)).toBe(page.id);
    expect(selectPage(project, 'missing', 'missing')).toBe(project);
  });
});
describe('safe read-only scene adapter', () => {
  it('includes rotated bounds and connections while culling distant geometry and respecting hidden parents', () => {
    const page = make().documents[0].pages[0],
      layerId = page.layers[0].id;
    const node = (id: string, x: number): Node => ({
      id,
      kind: 'future-kind',
      layerId,
      geometry: { x, y: 0, width: 100, height: 20, rotation: 90 },
      content: { text: '<script>unsafe</script>' },
      metadata: {},
      assetIds: [],
      dataBindings: [],
      extensions: {},
    });
    page.nodes = [node('a', 0), node('b', 1e6)];
    page.connections = [
      {
        id: 'edge',
        sourceId: 'a',
        targetId: 'b',
        layerId,
        relationType: 'future',
        waypoints: [],
        extensions: {},
      },
    ];
    const scene = buildScene(page);
    // Culling now includes the visible 2-unit outline.
    expect(scene.nodes[0].bounds.width).toBeCloseTo(22);
    expect(scene.nodes[0].bounds.height).toBeCloseTo(102);
    expect(scene.nodes[0].label).toBe('<script>unsafe</script>');
    expect(
      visibleScene(scene, visibleBounds({ x: 0, y: 0, zoom: 1 }, size)).nodes,
    ).toHaveLength(1);
    expect(scene.connections).toHaveLength(1);
    page.layers.push({
      id: 'parent',
      title: '',
      visible: false,
      locked: false,
      extensions: {},
    });
    page.layers[0].parentId = 'parent';
    expect(buildScene(page).nodes).toHaveLength(0);
    expect(buildScene(page).connections).toHaveLength(0);
  });
});

it('resolves deep layer visibility with linear ancestor access', () => {
  const page = make().documents[0].pages[0];
  let reads = 0;
  page.layers = Array.from({ length: 8000 }, (_, index) => {
    const layer = {
      id: String(index),
      title: '',
      visible: true,
      locked: false,
      extensions: {},
    };
    Object.defineProperty(layer, 'parentId', {
      get: () => {
        reads++;
        return index ? String(index - 1) : undefined;
      },
    });
    return layer;
  });
  page.nodes = page.layers.map((layer) => ({
    id: layer.id,
    kind: 'rectangle',
    layerId: layer.id,
    geometry: { x: 0, y: 0, width: 10, height: 10, rotation: 0 },
    content: {},
    metadata: {},
    assetIds: [],
    dataBindings: [],
    extensions: {},
  }));
  expect(buildScene(page).nodes).toHaveLength(8000);
  expect(reads).toBeLessThanOrEqual(16000);
});

it('keeps an out-of-range imported camera intact when changing only grid visibility', () => {
  const project = make(),
    doc = project.documents[0],
    page = doc.pages[0];
  page.viewport.zoom = 1000;
  const state = readCanvas(page);
  const result = writeCanvas(project, doc.id, page.id, {
    ...state,
    grid: { ...state.grid, visible: false },
  });
  expect(result.documents[0].pages[0].viewport.zoom).toBe(1000);
  expect(readCanvas(result.documents[0].pages[0]).grid.visible).toBe(false);
});
