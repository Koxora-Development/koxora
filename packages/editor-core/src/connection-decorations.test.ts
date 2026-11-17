import { describe, expect, it } from 'vitest';
import {
  createProject,
  exportProject,
  importProject,
  validateProject,
  type Project,
  type Json,
} from '@koxora/project';
import {
  applyEdit,
  assertEditableElement,
  buildScene,
  CommandHistory,
  copyElements,
  CONNECTION_KEY,
  CONNECTION_DECORATIONS_FEATURE,
  DEFAULT_CONNECTION,
  ENDPOINT_MARKERS,
  LINE_STYLES,
  hasConnectionDecorations,
  isEndpointMarker,
  isLineStyle,
  readConnection,
  resolveAppearance,
  validConnectionDecorations,
  type ConnectionOptions,
  type EditCommand,
} from './index';

const now = '2026-11-17T10:00:00.000Z';
const id = () => crypto.randomUUID();
const pageOf = (p: Project) => p.documents[0].pages[0];
const run = (p: Project, command: EditCommand) =>
  applyEdit(p, p.documents[0].id, pageOf(p).id, command, now);
function fixture() {
  let p = createProject('Portable connector decorations', id, now);
  for (const x of [-200, 200])
    p = run(p, {
      type: 'insert',
      id: id(),
      kind: 'rectangle',
      layerId: pageOf(p).layers[0].id,
      position: { x, y: 0 },
      snap: false,
    });
  return p;
}
function connected(
  options: ConnectionOptions,
  sourceAttached = false,
  targetAttached = false,
) {
  const p = fixture(),
    page = pageOf(p);
  return run(p, {
    type: 'connect',
    id: id(),
    layerId: page.layers[0].id,
    ...(sourceAttached
      ? { sourceId: page.nodes[0].id }
      : { sourcePoint: { x: -350, y: 0 } }),
    ...(targetAttached
      ? { targetId: page.nodes[1].id }
      : { targetPoint: { x: 350, y: 0 } }),
    options,
  });
}

describe('portable connector decorations', () => {
  it('keeps legacy option objects exact and adds no decoration marker for ordinary arrows', () => {
    const p = connected(DEFAULT_CONNECTION),
      edge = pageOf(p).connections[0];
    expect(readConnection(edge)).toEqual(DEFAULT_CONNECTION);
    expect(Object.hasOwn(readConnection(edge), 'lineStyle')).toBe(false);
    expect(Object.hasOwn(readConnection(edge), 'sourceMarker')).toBe(false);
    expect(Object.hasOwn(readConnection(edge), 'targetMarker')).toBe(false);
    expect(hasConnectionDecorations(DEFAULT_CONNECTION)).toBe(false);
    expect(p.manifest.requiredFeatures).not.toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
  });
  it.each(ENDPOINT_MARKERS)(
    'round trips independent %s markers, line patterns and attached/free endpoints',
    async (marker) => {
      for (const attached of [
        [false, false],
        [true, false],
        [false, true],
        [true, true],
      ]) {
        const lineStyle =
          LINE_STYLES[ENDPOINT_MARKERS.indexOf(marker) % LINE_STYLES.length];
        const options: ConnectionOptions = {
          ...DEFAULT_CONNECTION,
          lineStyle,
          sourceMarker: marker,
          targetMarker: marker === 'none' ? 'bar' : 'none',
        };
        const p = connected(options, attached[0], attached[1]);
        const edge = pageOf(p).connections[0];
        expect(readConnection(edge)).toEqual(options);
        expect(p.manifest.requiredFeatures).toContain(
          CONNECTION_DECORATIONS_FEATURE,
        );
        expect(buildScene(pageOf(p)).connections[0]).toMatchObject({
          lineStyle,
          sourceMarker: options.sourceMarker,
          targetMarker: options.targetMarker,
          editable: true,
        });
        expect((await importProject(await exportProject(p))).documents).toEqual(
          p.documents,
        );
        const missingFeature = structuredClone(p);
        missingFeature.manifest.requiredFeatures =
          missingFeature.manifest.requiredFeatures.filter(
            (f) => f !== CONNECTION_DECORATIONS_FEATURE,
          );
        expect(() => validateProject(missingFeature)).toThrow(/feature/);
      }
    },
  );
  it('validates strict string enums without coercing hostile objects', () => {
    for (const value of [
      null,
      '',
      'future',
      [],
      {},
      { toString: null },
      true,
      7,
    ]) {
      expect(isLineStyle(value)).toBe(false);
      expect(isEndpointMarker(value)).toBe(false);
    }
    for (const value of [null, [], 'dashed']) {
      expect(validConnectionDecorations(value)).toBe(false);
      expect(hasConnectionDecorations(value)).toBe(false);
    }
    expect(validConnectionDecorations({ future: { keep: true } })).toBe(true);
    expect(hasConnectionDecorations({ sourceMarker: 'none' })).toBe(true);
    expect(hasConnectionDecorations({ lineStyle: 'solid' })).toBe(true);
  });
  it('rejects malformed decoration commands atomically and refuses editing malformed stored values', () => {
    const initial = connected(DEFAULT_CONNECTION),
      edge = pageOf(initial).connections[0];
    for (const [key, value] of [
      ['lineStyle', 'dash-dot'],
      ['lineStyle', null],
      ['sourceMarker', 'url(#external)'],
      ['targetMarker', { toString: null }],
      ['targetMarker', ['arrow']],
    ] as const) {
      const before = structuredClone(initial);
      expect(() =>
        run(initial, {
          type: 'updateConnection',
          id: edge.id,
          options: {
            ...DEFAULT_CONNECTION,
            [key]: value,
          } as unknown as ConnectionOptions,
          style: resolveAppearance(edge, [], CONNECTION_KEY),
        }),
      ).toThrow(/invalid/);
      expect(initial).toEqual(before);
      const imported = structuredClone(initial),
        raw = imported.documents[0].pages[0].connections[0].extensions[
          CONNECTION_KEY
        ] as Record<string, Json>;
      raw[key] = value as unknown as Json;
      imported.manifest.requiredFeatures.push(CONNECTION_DECORATIONS_FEATURE);
      expect(() => validateProject(imported)).toThrow(/connectionDecorations/);
      const invalidEdge = pageOf(imported).connections[0];
      expect(() => assertEditableElement(invalidEdge)).toThrow(/unsupported/);
      expect(buildScene(pageOf(imported)).connections[0].editable).toBe(false);
    }
  });
  it('preserves unknown siblings through changes, clearing decorations, history and archive round trips', async () => {
    const initial = connected({
      ...DEFAULT_CONNECTION,
      lineStyle: 'dashed',
      sourceMarker: 'diamond',
      targetMarker: 'open-arrow',
    });
    const edge = pageOf(initial).connections[0],
      raw = edge.extensions[CONNECTION_KEY] as Record<string, Json>;
    raw.future = { keep: ['opaque', 7] };
    edge.extensions['org.example.future'] = { keep: true };
    const history = new CommandHistory(),
      page = pageOf(initial);
    const changed = history.execute(
      initial,
      initial.documents[0].id,
      page.id,
      {
        type: 'updateConnection',
        id: edge.id,
        options: {
          ...readConnection(edge),
          lineStyle: 'dotted',
          targetMarker: 'filled-diamond',
        },
        style: resolveAppearance(edge, [], CONNECTION_KEY),
      },
      now,
    );
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
    const cleared = run(redone, {
      type: 'updateConnection',
      id: edge.id,
      options: { ...DEFAULT_CONNECTION, label: 'Legacy fallback' },
      style: resolveAppearance(edge, [], CONNECTION_KEY),
    });
    const clearedEdge = pageOf(cleared).connections[0];
    expect(
      hasConnectionDecorations(clearedEdge.extensions[CONNECTION_KEY]),
    ).toBe(false);
    expect(cleared.manifest.requiredFeatures).toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
    expect(
      (clearedEdge.extensions[CONNECTION_KEY] as Record<string, Json>).future,
    ).toEqual(raw.future);
    expect(clearedEdge.extensions['org.example.future']).toEqual({
      keep: true,
    });
    expect(
      (await importProject(await exportProject(cleared))).documents,
    ).toEqual(cleared.documents);
  });
  it('adds the feature conservatively through undo and preserves decorations while copying floating edges', () => {
    const initial = connected(DEFAULT_CONNECTION),
      page = pageOf(initial),
      edge = page.connections[0];
    const history = new CommandHistory();
    const decorated = history.execute(
      initial,
      initial.documents[0].id,
      page.id,
      {
        type: 'updateConnection',
        id: edge.id,
        options: {
          ...readConnection(edge),
          lineStyle: 'solid',
          targetMarker: 'circle',
        },
        style: resolveAppearance(edge, [], CONNECTION_KEY),
      },
      now,
    );
    const undone = history.travel(
      decorated,
      initial.documents[0].id,
      page.id,
      'undo',
      now,
    );
    expect(
      hasConnectionDecorations(
        pageOf(undone).connections[0].extensions[CONNECTION_KEY],
      ),
    ).toBe(false);
    expect(undone.manifest.requiredFeatures).toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
    const clipboard = copyElements(pageOf(decorated), [edge.id], decorated);
    const copied = run(decorated, {
      type: 'paste',
      ...clipboard,
      idMap: { [edge.id]: id() },
      offset: { x: 24, y: 24 },
      layerId: page.layers[0].id,
    });
    expect(readConnection(pageOf(copied).connections[1])).toEqual(
      readConnection(pageOf(decorated).connections[0]),
    );
    expect(copied.manifest.requiredFeatures).toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
  });
  it('adds compatibility on paste into an undecorated project and omits explicit undefined option fields', () => {
    const source = connected({
      ...DEFAULT_CONNECTION,
      sourceMarker: 'bar',
      targetMarker: 'diamond',
      lineStyle: 'dashed',
    });
    const edge = pageOf(source).connections[0];
    const clipboard = copyElements(pageOf(source), [edge.id], source);
    const target = fixture();
    expect(target.manifest.requiredFeatures).not.toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
    const pasted = run(target, {
      type: 'paste',
      ...clipboard,
      idMap: { [edge.id]: id() },
      offset: { x: 0, y: 48 },
      layerId: pageOf(target).layers[0].id,
    });
    expect(pasted.manifest.requiredFeatures).toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
    expect(readConnection(pageOf(pasted).connections[0])).toEqual(
      readConnection(edge),
    );
    const plain = connected({
      ...DEFAULT_CONNECTION,
      lineStyle: undefined,
      sourceMarker: undefined,
      targetMarker: undefined,
    });
    expect(readConnection(pageOf(plain).connections[0])).toEqual(
      DEFAULT_CONNECTION,
    );
    expect(plain.manifest.requiredFeatures).not.toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
    validateProject(plain);
  });
  it('keeps every endpoint glyph inside scene bounds for thick strokes and all routes', () => {
    for (const marker of ENDPOINT_MARKERS)
      for (const strokeWidth of [1, 2, 16, 32])
        for (const routing of ['straight', 'orthogonal', 'curved'] as const) {
          const initial = connected({
            ...DEFAULT_CONNECTION,
            routing,
            sourceMarker: marker,
            targetMarker: marker,
          });
          const edge = pageOf(initial).connections[0];
          const p = run(initial, {
            type: 'updateConnection',
            id: edge.id,
            options: readConnection(edge),
            style: {
              ...resolveAppearance(edge, [], CONNECTION_KEY),
              strokeWidth,
            },
          });
          const rendered = buildScene(pageOf(p)).connections[0];
          const padding = Math.max(16, strokeWidth * 3 + strokeWidth / 2);
          for (const point of [rendered.points[0], rendered.points.at(-1)!]) {
            expect(rendered.bounds.x).toBeLessThanOrEqual(point.x - padding);
            expect(rendered.bounds.y).toBeLessThanOrEqual(point.y - padding);
            expect(
              rendered.bounds.x + rendered.bounds.width,
            ).toBeGreaterThanOrEqual(point.x + padding);
            expect(
              rendered.bounds.y + rendered.bounds.height,
            ).toBeGreaterThanOrEqual(point.y + padding);
          }
        }
  });
  it('preserves unmarked future decoration payloads without interpreting them on unrelated edits', async () => {
    const p = connected(DEFAULT_CONNECTION),
      edge = pageOf(p).connections[0];
    edge.extensions[CONNECTION_KEY] = {
      version: 2,
      lineStyle: 'future',
      sourceMarker: { keep: true },
      targetMarker: ['opaque'],
    };
    expect(p.manifest.requiredFeatures).not.toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
    validateProject(p);
    expect(() => assertEditableElement(edge)).toThrow(/unsupported/);
    const reopened = await importProject(await exportProject(p));
    expect(reopened.documents).toEqual(p.documents);
    expect(reopened.manifest.requiredFeatures).not.toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
    const moved = run(reopened, {
      type: 'move',
      ids: [pageOf(reopened).nodes[0].id],
      delta: { x: 24, y: 0 },
      spacing: 1,
      snap: false,
    });
    expect(pageOf(moved).connections[0]).toEqual(edge);
    expect(moved.manifest.requiredFeatures).not.toContain(
      CONNECTION_DECORATIONS_FEATURE,
    );
    expect(() => assertEditableElement(pageOf(moved).connections[0])).toThrow(
      /unsupported/,
    );
  });
});
