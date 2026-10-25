import { InlineText } from './inline-text';
import { FormatSelection } from './format-selection';
import {
  useEffect,
  useMemo,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Page, Style, Node } from '@koxora/project';
import {
  buildScene,
  plainText,
  type RichText,
  alignedGeometries,
  copyElements,
  movedGeometries,
  marqueeSelection,
  toggleSelection,
  resizeGeometry,
  lineGeometry,
  lineEndpoints,
  isDrawing,
  transformScene,
  snapPoint,
  type Geometry,
  type Bounds,
  type ResizeHandle,
  type Alignment,
  DEFAULT_CONNECTION,
  assertEditableElement,
  connectionError,
  anchorPoint,
  readConnection,
  type Anchor,
  screenToWorld,
  pickNode,
  layerStates,
  isShapeKind,
  type EditCommand,
  fitBounds,
  pan,
  pinch,
  readCanvas,
  wheelDelta,
  zoomAt,
  type Camera,
  type CanvasState,
  type Point,
} from '@koxora/editor-core';
import { SvgRenderer } from './svg-renderer';
import { ConnectionPorts, type Port } from './connection-ports';
import { KeyboardShortcuts } from './keyboard-shortcuts';
import {
  editingShortcut,
  helpShortcut,
  PAN_KEYS,
  ZOOM_KEYS,
} from './shortcuts';
import { DiagramTools, ElementDialog, type DiagramTool } from './diagram-tools';
export interface CanvasHandle {
  snapshot: () => CanvasState;
}
interface Props {
  expanded: boolean;
  onExpanded: (value: boolean) => void;
  page: Page;
  styles: Style[];
  onEdit: (command: EditCommand) => boolean;
  history: { undo: number; redo: number };
  onHistory: (direction: 'undo' | 'redo') => boolean;
  documentTitle: string;
  locale: string;
  onCommit: (state: CanvasState) => void;
  onPending: (pending: boolean) => void;
  ref?: Ref<CanvasHandle>;
}
export function Canvas({
  expanded,
  onExpanded: setExpanded,
  page,
  styles,
  onEdit,
  history,
  onHistory,
  documentTitle,
  locale,
  onCommit,
  onPending,
  ref,
}: Props) {
  const t = (key: MessageKey) => translate(locale, key);
  const [initial] = useState(() => readCanvas(page));
  const state = useRef<CanvasState>(initial);
  const [grid, setGrid] = useState(initial.grid);
  const controls = useRef<{
    camera: (action: 'in' | 'out' | 'reset' | 'fit') => void;
    settings: () => void;
    refresh: () => void;
    focus: () => void;
  } | null>(null);
  const [tool, setTool] = useState<DiagramTool>('select');
  const [repeat, setRepeat] = useState(false);
  const [selected, setSelectedState] = useState<string[]>([]);
  const selection = useRef<string[]>([]);
  const clipboard = useRef<ReturnType<typeof copyElements> | null>(null);
  const [hasClipboard, setHasClipboard] = useState(false);
  const [feedback, setFeedback] = useState<MessageKey | null>(null);
  const [contextMenu, setContextMenu] = useState(false);
  const contextRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (contextMenu)
      contextRoot.current
        ?.querySelector<HTMLElement>('button:not(:disabled)')
        ?.focus();
  }, [contextMenu]);
  const [formatting, setFormatting] = useState<string[] | null>(null);
  const [objects, setObjects] = useState(false);
  function select(ids: string[]) {
    selection.current = ids;
    setSelectedState(ids);
    controls.current?.refresh();
  }
  const cancelInput = useRef<() => boolean>(() => false);
  const spaceHeld = useRef(false);
  const [editError, setEditError] = useState<MessageKey | null>(null);
  const [source, setSourceState] = useState<string | null>(null);
  const sourceRef = useRef<string | null>(null);
  const sourceAnchor = useRef<Anchor>('auto');
  function setSource(id: string | null, anchor: Anchor = 'auto') {
    sourceAnchor.current = anchor;
    sourceRef.current = id;
    setSourceState(id);
    controls.current?.refresh();
  }
  const [editing, setEditing] = useState<string | null>(null);
  const [inline, setInline] = useState(false);
  const [textPreview, setTextPreview] = useState<RichText | null>(null);
  const [textAnchor, setTextAnchor] = useState({ x: 120, y: 240 });
  function closeEditing() {
    setEditing(null);
    setInline(false);
    setTextPreview(null);
  }

  const [options, setOptions] = useState(DEFAULT_CONNECTION);
  const [layerId, setLayerId] = useState(
    () =>
      page.layers.find((l) => layerStates(page.layers).get(l.id)?.editable)
        ?.id ?? '',
  );
  const content = useMemo(
    () => ({
      id: page.id,
      nodes: page.nodes,
      connections: page.connections,
      layers: page.layers,
    }),
    [page.id, page.nodes, page.connections, page.layers],
  );
  const baseScene = useMemo(
    () =>
      buildScene(
        {
          nodes: page.nodes,
          connections: page.connections,
          layers: page.layers,
        },
        styles,
      ),
    [page.nodes, page.connections, page.layers, styles],
  );
  const scene = useMemo(
    () =>
      textPreview && editing
        ? {
            ...baseScene,
            nodes: baseScene.nodes.map((n) =>
              n.id === editing
                ? { ...n, richText: textPreview, label: plainText(textPreview) }
                : n,
            ),
            connections: baseScene.connections.map((e) =>
              e.id === editing
                ? { ...e, richText: textPreview, label: plainText(textPreview) }
                : e,
            ),
          }
        : baseScene,
    [baseScene, textPreview, editing],
  );
  function activate(next: DiagramTool) {
    cancelInput.current();
    setTool(next);
    setSource(null);
    setEditError(null);
    setContextMenu(false);
  }
  function pick(id: string, direct = false) {
    const item =
      page.nodes.find((n) => n.id === id) ??
      page.connections.find((e) => e.id === id);
    if (!item) return;
    if (!layerStates(page.layers).get(item.layerId)?.editable) {
      setEditError('diagram.error.layer');
      return;
    }
    try {
      assertEditableElement(item);
    } catch {
      setEditError('diagram.error.unsupported');
      return;
    }
    setEditError(null);
    select([id]);
    setInline(direct);
    setTextPreview(null);
    const box = host.current?.getBoundingClientRect();
    if (box) {
      const n = scene.nodes.find((n) => n.id === id);
      const e = scene.connections.find((e) => e.id === id);
      const p = n ? n.geometry : e?.labelPoint;
      if (p)
        setTextAnchor({
          x:
            box.left +
            box.width / 2 +
            (p.x - state.current.camera.x) * state.current.camera.zoom,
          y:
            box.top +
            box.height / 2 +
            (p.y - state.current.camera.y) * state.current.camera.zoom -
            100,
        });
    }
    setEditing(id);
  }
  function link(id: string | null, anchor: Anchor = 'auto', from?: Port) {
    if (!isDrawing(tool)) return;
    if (!id) {
      setSource(null);
      return;
    }
    const start = sourceRef.current
      ? { id: sourceRef.current, anchor: sourceAnchor.current }
      : from;
    const error = connectionError(
      page,
      start?.id ?? id,
      start ? id : null,
      layerId,
      tool === 'arrow',
    );
    if (error) {
      setEditError(`diagram.error.${error}`);
      return;
    }
    setEditError(null);
    if (!start) {
      setSource(id, anchor);
      return;
    }
    const edgeId = crypto.randomUUID();
    if (
      onEdit({
        type: 'connect',
        id: edgeId,
        sourceId: start.id,
        targetId: id,
        layerId,
        options: {
          ...options,
          arrow: tool === 'arrow',
          sourceAnchor: start.anchor,
          targetAnchor: anchor,
        },
      })
    ) {
      setSource(null);
      select([edgeId]);
      controls.current?.focus();
      if (!repeat) activate('select');
    } else setEditError('diagram.error.invalid');
  }
  const candidates = useMemo(() => {
    if (!isDrawing(tool) || !layerStates(page.layers).get(layerId)?.editable)
      return [];
    const excluded = new Set([source]);
    if (source)
      for (const edge of page.connections) {
        if (edge.sourceId === source) excluded.add(edge.targetId);
        if (tool === 'line' && edge.targetId === source)
          excluded.add(edge.sourceId);
      }
    return scene.nodes
      .filter((n) => n.editable && !isDrawing(n.kind) && !excluded.has(n.id))
      .map((n) => n.id);
  }, [scene, source, tool, page.layers, page.connections, layerId]);
  function act(point: Point, id?: string, geometry?: Geometry, snap?: boolean) {
    if (isShapeKind(tool)) {
      const id = crypto.randomUUID();
      if (
        onEdit({
          type: 'insert',
          id,
          kind: tool,
          position: point,
          layerId,
          geometry,
          snap,
          text: tool === 'text' ? t('diagram.newText') : '',
        })
      ) {
        select([id]);
        if (!repeat) activate('select');
        if (tool === 'text') {
          setInline(true);
          setTextPreview(null);
          setEditing(id);
        }
      }
    } else {
      const node = pickNode(scene, point, 6 / state.current.camera.zoom);
      const edge =
        id && scene.connections.find((e) => e.id === id && e.editable);
      if (node) pick(node.id, true);
      else if (edge) pick(edge.id, true);
    }
  }
  const editableSelection = selected.filter((id) =>
    [...scene.nodes, ...scene.connections].some(
      (n) => n.id === id && n.editable,
    ),
  );
  function command(
    action:
      | 'delete'
      | 'duplicate'
      | 'copy'
      | 'paste'
      | 'undo'
      | 'redo'
      | 'properties'
      | Alignment,
  ) {
    cancelInput.current();
    if (action !== 'properties') controls.current?.focus();
    setSource(null);
    setContextMenu(false);
    setFeedback(null);
    const ids = selection.current.filter((id) =>
      [...scene.nodes, ...scene.connections].some(
        (n) => n.id === id && n.editable,
      ),
    );
    try {
      if (action === 'undo' || action === 'redo') {
        if (onHistory(action)) select([]);
        else setFeedback('editing.noHistory');
      } else if (action === 'properties') {
        if (ids.length === 1) pick(ids[0]);
        else if (ids.length > 1) setFormatting(ids);
      } else if (action === 'delete') {
        if (ids.length && onEdit({ type: 'delete', ids })) select([]);
      } else if (action === 'copy') {
        clipboard.current = copyElements(page, ids);
        setHasClipboard(true);
        setFeedback('editing.copied');
      } else if (action === 'duplicate' || action === 'paste') {
        const content =
          action === 'paste' ? clipboard.current : copyElements(page, ids);
        if (!content) return;
        const idMap = Object.fromEntries(
          [...content.nodes, ...content.connections].map((n) => [
            n.id,
            crypto.randomUUID(),
          ]),
        );
        const offset = {
          x: state.current.grid.spacing,
          y: state.current.grid.spacing,
        };
        if (
          onEdit(
            action === 'paste'
              ? { type: 'paste', ...content, idMap, offset, layerId }
              : { type: 'duplicate', ids, idMap, offset },
          )
        )
          select(Object.values(idMap));
      } else {
        const geometries = alignedGeometries(scene, ids, action);
        if (Object.keys(geometries).length)
          onEdit({ type: 'transform', geometries });
      }
    } catch {
      setEditError('diagram.error.unsupported');
    }
  }
  const [help, setHelp] = useState(false);
  const [limited, setLimited] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null),
    drawing = useRef<SVGGElement>(null),
    pattern = useRef<SVGPatternElement>(null),
    gridRect = useRef<SVGRectElement>(null),
    portRoot = useRef<HTMLDivElement>(null),
    percent = useRef<HTMLOutputElement>(null);
  const interaction = useRef<{
    tool: DiagramTool;
    act: typeof act;
    link: typeof link;
    candidates: string[];
    activate: typeof activate;
    source: string | null;
    command: typeof command;
    select: typeof select;
    onEdit: typeof onEdit;
  }>(null!);
  useEffect(() => {
    interaction.current = {
      tool,
      act,
      link,
      candidates,
      activate,
      source,
      command,
      select,
      onEdit,
    };
  });
  const callbacks = useRef({ onCommit, onPending });
  useEffect(() => {
    callbacks.current = { onCommit, onPending };
  }, [onCommit, onPending]);
  useImperativeHandle(ref, () => ({ snapshot: () => state.current }), []);
  const patternId = useId().replace(/:/g, '');
  useEffect(() => {
    const element = host.current!,
      output = percent.current!;
    const renderer = new SvgRenderer(
      drawing.current!,
      pattern.current!,
      gridRect.current!,
    );

    const ports = new ConnectionPorts(portRoot.current!, locale);
    let cursorPoint: Point | null = null;
    const writableLayer = layerStates(content.layers).get(layerId)?.editable;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };
    let size = measure();
    let frame = 0,
      timer = 0,
      pending = false;
    let lastLimited = false;
    const pointers = new Map<number, Point>();
    const captures = new Set<number>();
    let pendingMove: PointerEvent | null = null;
    let preview = scene;
    let marquee: Bounds | null = null;
    let snapping = false;
    const render = () => {
      if (pendingMove) {
        const move = pendingMove;
        pendingMove = null;
        updateGesture(move);
      }
      frame = 0;
      const active = interaction.current;
      const pendingSource = sourceRef.current
        ? { id: sourceRef.current, anchor: sourceAnchor.current }
        : gesture?.kind === 'link' && gesture.moved
          ? (gesture.linkStart ?? null)
          : null;
      const origin =
        pendingSource && scene.nodes.find((n) => n.id === pendingSource.id);
      const validSource =
        origin?.editable && !isDrawing(origin.kind) && writableLayer;
      const cursorWorld =
        cursorPoint && screenToWorld(cursorPoint, state.current.camera, size);
      const linkPreview =
        validSource && origin && cursorWorld && pendingSource
          ? {
              start: anchorPoint(
                origin,
                cursorWorld,
                pendingSource.anchor,
                origin.style.cornerRadius,
              ),
              end: cursorWorld,
              arrow: active.tool === 'arrow',
            }
          : null;
      ports.render(
        scene,
        state.current,
        size,
        isDrawing(active.tool) ? active.candidates : [],
        validSource ? pendingSource : null,
      );
      const nextLimited = renderer.render(
        preview,
        state.current,
        size,
        sourceRef.current,
        isDrawing(active.tool) ? [] : selection.current,
        marquee,
        snapping,
        sourceRef.current ? active.candidates : [],
        linkPreview,
      );
      if (nextLimited !== lastLimited) {
        lastLimited = nextLimited;
        setLimited(nextLimited);
      }
      output.value = new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: 0,
      }).format(state.current.camera.zoom);
      element.setAttribute('data-snapping', String(snapping));
      element.setAttribute('data-selection', JSON.stringify(selection.current));
      element.setAttribute('data-camera', JSON.stringify(state.current.camera));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    const commit = () => {
      window.clearTimeout(timer);
      if (pending) {
        pending = false;
        callbacks.current.onCommit(state.current);
        callbacks.current.onPending(false);
      }
    };
    const change = (camera: Camera) => {
      state.current = { ...state.current, camera };
      if (!pending) {
        pending = true;
        callbacks.current.onPending(true);
      }
      schedule();
    };
    const center = () => ({ x: size.width / 2, y: size.height / 2 });
    const zoom = (factor: number, anchor = center()) =>
      change(
        zoomAt(
          state.current.camera,
          state.current.camera.zoom * factor,
          anchor,
          size,
        ),
      );
    controls.current = {
      refresh: schedule,
      focus: () => element.focus({ preventScroll: true }),
      camera(action) {
        if (action === 'fit') change(fitBounds(scene.bounds, size));
        else if (action === 'reset')
          change(zoomAt(state.current.camera, 1, center(), size));
        else zoom(action === 'in' ? 1.25 : 0.8);
        commit();
      },
      settings() {
        schedule();
        callbacks.current.onCommit(state.current);
      },
    };
    const local = (event: { clientX: number; clientY: number }): Point => {
      const rect = element.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelGesture();
      const delta = wheelDelta(
        { x: event.deltaX, y: event.deltaY },
        event.deltaMode,
        size,
      );
      if (event.ctrlKey || event.metaKey)
        zoom(
          Math.exp(-Math.max(-500, Math.min(500, delta.y)) * 0.002),
          local(event),
        );
      else
        change(
          pan(
            state.current.camera,
            event.shiftKey
              ? { x: -delta.y - delta.x, y: 0 }
              : { x: -delta.x, y: -delta.y },
          ),
        );
      window.clearTimeout(timer);
      timer = window.setTimeout(commit, 180);
    };
    type Gesture = {
      id: number;
      kind: 'move' | 'resize' | 'marquee' | 'insert' | 'link';
      start: Point;
      screen: Point;
      moved: boolean;
      originals: Node[];
      base: string[];
      handle?: string;
      edgeId?: string;
      linkStart?: Port;
      single?: string;
      geometries: Record<string, Geometry>;
      geometry?: Geometry;
      snap?: boolean;
    };
    let gesture: Gesture | null = null;
    const world = (p: Point) => screenToWorld(p, state.current.camera, size);
    const resetPreview = () => {
      pendingMove = null;
      preview = scene;
      marquee = null;
      snapping = false;
      schedule();
    };
    const cancelGesture = () => {
      gesture = null;
      resetPreview();
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 && event.button !== 1) return;
      event.preventDefault();
      element.focus({ preventScroll: true });
      element.setPointerCapture(event.pointerId);
      captures.add(event.pointerId);
      const point = local(event),
        start = world(point),
        active = interaction.current;
      if (event.pointerType === 'touch') pointers.set(event.pointerId, point);
      if (pointers.size > 1) {
        cancelGesture();
        element.classList.add('panning');
        return;
      }
      if (active.tool === 'pan' || spaceHeld.current || event.button === 1) {
        cancelGesture();
        pointers.set(event.pointerId, point);
        element.classList.add('panning');
        return;
      }
      const target = event.target as Element;
      const handle = target.closest('[data-resize-id]');
      let node = pickNode(scene, start, 6 / state.current.camera.zoom);
      const edgeId = target
        .closest('[data-connection-id]')
        ?.getAttribute('data-connection-id');
      const edge = scene.connections.find((e) => e.id === edgeId && e.editable);
      if (edge && node && edge.layerOrder > node.layerOrder) node = undefined;
      const hit = node?.id ?? edge?.id;
      const port = isDrawing(active.tool) ? ports.hit(point) : undefined;
      const drawingHit = isDrawing(active.tool)
        ? pickNode(scene, start, 6 / state.current.camera.zoom, false)
        : undefined;
      let kind: Gesture['kind'] =
        isDrawing(active.tool) && (port || drawingHit || sourceRef.current)
          ? 'link'
          : isShapeKind(active.tool)
            ? 'insert'
            : hit
              ? 'move'
              : 'marquee';
      let originals: Node[] = [];
      if (active.tool === 'select') {
        if (handle) {
          const n = content.nodes.find(
            (n) => n.id === handle.getAttribute('data-resize-id'),
          );
          if (n && scene.nodes.some((s) => s.id === n.id && s.editable)) {
            kind = 'resize';
            originals = [n];
          }
        } else if (hit) {
          if (event.shiftKey)
            active.select(toggleSelection(selection.current, hit, true));
          else if (!selection.current.includes(hit)) active.select([hit]);
          originals = content.nodes.filter(
            (n) =>
              selection.current.includes(n.id) &&
              scene.nodes.some((s) => s.id === n.id && s.editable),
          );
          if (!selection.current.includes(hit)) {
            pointers.delete(event.pointerId);
            return;
          }
        } else if (!event.shiftKey) active.select([]);
      }
      gesture = {
        id: event.pointerId,
        kind,
        start,
        screen: point,
        moved: false,
        originals,
        base: [...selection.current],
        handle: handle?.getAttribute('data-handle') ?? undefined,
        edgeId: edge?.id,
        linkStart:
          port ??
          (drawingHit ? { id: drawingHit.id, anchor: 'auto' } : undefined),
        single: !event.shiftKey ? hit : undefined,
        geometries: {},
      };
    };
    const updateGesture = (event: PointerEvent) => {
      if (!gesture || gesture.id !== event.pointerId) return false;
      const p = local(event),
        raw = world(p);
      if (Math.hypot(p.x - gesture.screen.x, p.y - gesture.screen.y) > 3)
        gesture.moved = true;
      if (!gesture.moved) return true;
      const grid = state.current.grid,
        snap = grid.snap && !event.altKey;
      const point = snapPoint(raw, grid.spacing, snap);
      snapping = snap && ['move', 'resize', 'insert'].includes(gesture.kind);
      gesture.snap = snap;
      if (gesture.kind === 'move')
        gesture.geometries = movedGeometries(
          gesture.originals,
          { x: raw.x - gesture.start.x, y: raw.y - gesture.start.y },
          grid.spacing,
          snap,
        );
      else if (gesture.kind === 'resize' && gesture.originals[0]) {
        const n = gesture.originals[0];
        if (isDrawing(n.kind)) {
          const [a, b] = lineEndpoints(n.geometry);
          gesture.geometries = {
            [n.id]: {
              ...n.geometry,
              ...lineGeometry(
                gesture.handle === 'start' ? point : a,
                gesture.handle === 'end' ? point : b,
                gesture.handle === 'start' ? 'end' : 'start',
              ),
            },
          };
        } else
          gesture.geometries = {
            [n.id]: resizeGeometry(
              n.geometry,
              gesture.handle as ResizeHandle,
              point,
              event.shiftKey,
            ),
          };
      } else if (gesture.kind === 'marquee' || gesture.kind === 'insert') {
        const a =
          gesture.kind === 'insert'
            ? snapPoint(gesture.start, grid.spacing, snap)
            : gesture.start;
        const b = gesture.kind === 'insert' ? point : raw;
        marquee = {
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(b.x - a.x),
          height: Math.abs(b.y - a.y),
        };
        if (
          gesture.kind === 'insert' &&
          isShapeKind(interaction.current.tool)
        ) {
          const tool = interaction.current.tool;
          gesture.geometry = isDrawing(tool)
            ? lineGeometry(a, b)
            : {
                ...marquee,
                width: Math.max(8, marquee.width),
                height: Math.max(8, marquee.height),
                rotation: 0,
              };
          if (event.shiftKey && !isDrawing(tool))
            gesture.geometry.height = gesture.geometry.width;
          const temporary: Node = {
            id: 'preview',
            kind: tool,
            layerId,
            geometry: gesture.geometry,
            content: {},
            metadata: {},
            assetIds: [],
            dataBindings: [],
            extensions: {},
          };
          const addition = buildScene(
            { ...content, nodes: [temporary], connections: [] },
            styles,
          );
          preview = { ...scene, nodes: [...scene.nodes, ...addition.nodes] };
          marquee = null;
        }
      }
      if (Object.keys(gesture.geometries).length)
        preview = transformScene(scene, content, gesture.geometries);
      schedule();
      return true;
    };
    const move = (event: PointerEvent) => {
      cursorPoint = local(event);
      if (isDrawing(interaction.current.tool)) schedule();
      if (gesture?.id === event.pointerId) {
        pendingMove = event;
        schedule();
        if (pointers.has(event.pointerId))
          pointers.set(event.pointerId, local(event));
        return;
      }
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const before = [...pointers.values()],
        point = local(event);
      pointers.set(event.pointerId, point);
      const after = [...pointers.values()];
      if (before.length === 2)
        change(
          pinch(
            state.current.camera,
            [before[0], before[1]],
            [after[0], after[1]],
            size,
          ),
        );
      else if (before.length === 1)
        change(
          pan(state.current.camera, {
            x: point.x - previous.x,
            y: point.y - previous.y,
          }),
        );
    };
    const up = (event: PointerEvent) => {
      pendingMove = null;
      captures.delete(event.pointerId);
      if (event.type === 'pointerup') updateGesture(event);
      const done = gesture?.id === event.pointerId ? gesture : null;
      const selectionBounds = marquee;
      gesture = null;
      pointers.delete(event.pointerId);
      if (element.hasPointerCapture(event.pointerId))
        element.releasePointerCapture(event.pointerId);
      if (done && event.type === 'pointerup') {
        commit();
        if (
          (done.kind === 'move' || done.kind === 'resize') &&
          done.moved &&
          Object.keys(done.geometries).length
        )
          interaction.current.onEdit({
            type: 'transform',
            geometries: done.geometries,
          });
        else if (done.kind === 'marquee' && done.moved && selectionBounds)
          interaction.current.select([
            ...new Set([
              ...done.base,
              ...marqueeSelection(scene, selectionBounds),
            ]),
          ]);
        else if (done.kind === 'move' && !done.moved && done.single)
          interaction.current.select([done.single]);
        else if (done.kind === 'insert')
          interaction.current.act(
            done.start,
            undefined,
            done.geometry,
            state.current.grid.snap && !event.altKey,
          );
        else if (done.kind === 'link') {
          const p = local(event);
          const node = pickNode(
            scene,
            world(p),
            6 / state.current.camera.zoom,
            false,
          );
          const target =
            ports.hit(p) ??
            (node ? { id: node.id, anchor: 'auto' as const } : undefined);
          if (done.moved) {
            const start = sourceRef.current
              ? { id: sourceRef.current, anchor: sourceAnchor.current }
              : done.linkStart;
            if (start && target && target.id !== start.id)
              interaction.current.link(target.id, target.anchor, start);
            else interaction.current.link(null);
          } else interaction.current.link(target?.id ?? null, target?.anchor);
        }
      }
      if (event.type === 'pointercancel') interaction.current.link(null);
      resetPreview();
      if (!pointers.size) {
        element.classList.remove('panning');
        commit();
      }
    };
    const key = (event: KeyboardEvent) => {
      const active = interaction.current;
      if (ports.key(event)) return;
      if (
        event.target instanceof HTMLButtonElement &&
        event.target.dataset.portNode &&
        ['Enter', ' '].includes(event.key)
      ) {
        event.preventDefault();
        active.link(
          event.target.dataset.portNode,
          event.target.dataset.portAnchor as Anchor,
        );
        schedule();
        return;
      }
      const modifier = event.ctrlKey || event.metaKey;
      const shortcut = editingShortcut(event);
      if (shortcut) {
        event.preventDefault();
        if (shortcut === 'selectAll') {
          cancelGesture();
          active.select(
            [...scene.nodes, ...scene.connections]
              .filter((n) => n.editable)
              .map((n) => n.id),
          );
        } else active.command(shortcut);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        active.command('delete');
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
        if (isShapeKind(active.tool)) {
          if (!sourceRef.current) active.act(state.current.camera);
        } else active.command('properties');
        return;
      }
      if (modifier) return;
      const directions: Record<string, Point> = PAN_KEYS;
      if (directions[event.key]) {
        event.preventDefault();
        const direction = directions[event.key];
        const nodes = content.nodes.filter(
          (n) =>
            selection.current.includes(n.id) &&
            scene.nodes.some((s) => s.id === n.id && s.editable),
        );
        if (nodes.length && active.tool === 'select') {
          const distance =
            (state.current.grid.snap && !event.altKey
              ? state.current.grid.spacing
              : 1) * (event.shiftKey ? 10 : 1);
          active.onEdit({
            type: 'move',
            ids: nodes.map((n) => n.id),
            delta: { x: direction.x * distance, y: direction.y * distance },
            spacing: state.current.grid.spacing,
            snap: state.current.grid.snap && !event.altKey,
          });
        } else {
          const distance = event.shiftKey ? 160 : 40;
          change(
            pan(state.current.camera, {
              x: -direction.x * distance,
              y: -direction.y * distance,
            }),
          );
          commit();
        }
      } else if (ZOOM_KEYS.includes(event.key)) {
        event.preventDefault();
        controls.current?.camera(
          event.key === '-'
            ? 'out'
            : event.key === '0'
              ? 'reset'
              : event.key === 'Home'
                ? 'fit'
                : 'in',
        );
      } else if (event.key === ' ') {
        event.preventDefault();
        spaceHeld.current = true;
        element.classList.add('hand-ready');
      }
    };
    const spaceDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (
        event.key === ' ' &&
        !(
          event.target instanceof Element &&
          event.target.closest(
            'input, textarea, select, dialog, [contenteditable="true"]',
          )
        )
      )
        spaceHeld.current = true;
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        spaceHeld.current = false;
        element.classList.remove('hand-ready');
      }
    };
    const blur = () => {
      const active = !!gesture || !!pointers.size;
      cancelGesture();
      element.classList.remove('hand-ready', 'panning');
      const captured = [...captures];
      captures.clear();
      pointers.clear();
      for (const id of captured)
        if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
      commit();
      return active;
    };
    cancelInput.current = blur;
    const windowBlur = () => {
      spaceHeld.current = false;
      blur();
      interaction.current.link(null);
    };
    const doubleClick = (event: MouseEvent) => {
      if (interaction.current.tool === 'select')
        interaction.current.act(
          world(local(event)),
          (event.target as Element)
            .closest('[data-connection-id]')
            ?.getAttribute('data-connection-id') ?? undefined,
        );
    };
    const portClick = (event: MouseEvent) => {
      const button = (event.target as Element).closest<HTMLButtonElement>(
        '[data-port-node]',
      );
      if (button && event.detail === 0)
        interaction.current.link(
          button.dataset.portNode!,
          button.dataset.portAnchor as Anchor,
        );
    };
    element.addEventListener('click', portClick);
    element.addEventListener('dblclick', doubleClick);
    const observer = new ResizeObserver(() => {
      const next = measure();
      // A resized surface changes local pointer coordinates; end the old gesture.
      if (next.width !== size.width || next.height !== size.height) blur();
      size = next;
      schedule();
    });
    observer.observe(element);
    element.addEventListener('wheel', wheel, { passive: false });
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('lostpointercapture', up);
    element.addEventListener('keydown', key);
    element.addEventListener('keyup', keyup);
    element.addEventListener('blur', blur);
    window.addEventListener('keydown', spaceDown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', windowBlur);
    render();
    return () => {
      blur();
      element.removeEventListener('click', portClick);
      element.removeEventListener('dblclick', doubleClick);
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      controls.current = null;
      cancelInput.current = () => false;
      element.removeEventListener('wheel', wheel);
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('lostpointercapture', up);
      element.removeEventListener('keydown', key);
      element.removeEventListener('keyup', keyup);
      element.removeEventListener('blur', blur);
      window.removeEventListener('keydown', spaceDown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', windowBlur);
      renderer.clear();
      ports.clear();
    };
    // Content transactions replace the scene; navigation retains the current scene.
  }, [content, scene, locale, layerId, styles]);
  useEffect(() => {
    if (!expanded) return;
    const root =
      stage.current!.closest<HTMLElement>('.canvas-workbook') ?? stage.current!;
    const previous = document.activeElement as HTMLElement | null;
    const hidden: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement = root;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children)
        if (sibling !== branch && sibling instanceof HTMLElement) {
          hidden.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      branch = branch.parentElement;
    }
    const keydown = (event: KeyboardEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('dialog[open]')
      )
        return;
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        if (
          cancelInput.current() ||
          interaction.current.tool !== 'select' ||
          selection.current.length
        ) {
          interaction.current.select([]);
          interaction.current.activate('select');
          return;
        }
        setExpanded(false);
      }
      if (event.key !== 'Tab') return;
      const focusable = [
        ...root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ];
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    root.addEventListener('keydown', keydown);
    return () => {
      root.removeEventListener('keydown', keydown);
      for (const item of hidden) item.element.inert = item.inert;
      if (previous?.isConnected) previous.focus();
    };
  }, [expanded, setExpanded]);
  useEffect(() => {
    controls.current?.refresh();
  }, [source, tool, candidates]);
  function updateGrid(next: typeof grid) {
    state.current = { ...state.current, grid: next };
    setGrid(next);
    controls.current?.settings();
  }
  return (
    <section
      ref={stage}
      onKeyDown={(event) => {
        if (event.target instanceof Element && event.target.closest('dialog'))
          return;
        if (
          helpShortcut(event.key) &&
          !(
            event.target instanceof Element &&
            event.target.closest(
              'input,textarea,select,dialog,[contenteditable="true"]',
            )
          )
        ) {
          event.preventDefault();
          cancelInput.current();
          setHelp(true);
          return;
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          !event.defaultPrevented &&
          event.target instanceof Element &&
          !event.target.closest(
            'input, textarea, select, dialog, [contenteditable="true"], .interactive-canvas',
          )
        ) {
          const shortcut = editingShortcut(event);
          if (shortcut === 'selectAll') {
            event.preventDefault();
            select(
              [...scene.nodes, ...scene.connections]
                .filter((n) => n.editable)
                .map((n) => n.id),
            );
          } else if (shortcut) {
            event.preventDefault();
            command(shortcut);
          }
        }

        if (
          event.key === 'Escape' &&
          !editing &&
          (cancelInput.current() ||
            tool !== 'select' ||
            selected.length ||
            contextMenu)
        ) {
          event.preventDefault();
          event.stopPropagation();
          activate('select');
          select([]);
        }
      }}
      className={`canvas-stage interactive-stage ${expanded ? 'canvas-expanded' : ''}`}
      aria-label={t('workspace.canvas')}
    >
      <div className="canvas-toolbar">
        <span>
          <span dir="auto">{documentTitle}</span>
          <span className="breadcrumb-separator">/</span>
          <span dir="auto">{page.title}</span>
        </span>
        <div className="canvas-header-actions">
          <button className="button compact" onClick={() => setHelp(true)}>
            {t('canvas.help')}
          </button>
          <button
            className="button compact"
            aria-pressed={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {t(expanded ? 'canvas.restore' : 'canvas.expand')}
          </button>
        </div>
      </div>
      <DiagramTools
        page={page}
        locale={locale}
        tool={tool}
        source={source}
        candidates={candidates}
        layerId={layerId}
        setLayer={(id) => {
          cancelInput.current();
          setSource(null);
          setLayerId(id);
        }}
        activate={activate}
        link={link}
        options={options}
        setOptions={setOptions}
        repeat={repeat}
        setRepeat={setRepeat}
      />
      <div
        className="editing-toolbar"
        role="group"
        aria-label={t('editing.actions')}
      >
        <button
          className="button compact"
          disabled={!history.undo}
          title={t('editing.undoHelp')}
          onClick={() => command('undo')}
        >
          {t('editing.undo')}
        </button>
        <button
          className="button compact"
          disabled={!history.redo}
          title={t('editing.redoHelp')}
          onClick={() => command('redo')}
        >
          {t('editing.redo')}
        </button>
        <span className="selection-count" role="status">
          {translate(locale, 'editing.selected', {
            count: editableSelection.length,
          })}
        </span>
        {!!editableSelection.length && (
          <>
            <button
              className="button compact"
              onClick={() => command('properties')}
            >
              {t('diagram.properties')}
            </button>
            {editableSelection.length === 1 && (
              <button
                className="button compact"
                onClick={() => pick(editableSelection[0], true)}
              >
                {t('rich.edit')}
              </button>
            )}
            <button
              className="button compact"
              disabled={!editableSelection.length}
              onClick={() => command('duplicate')}
            >
              {t('editing.duplicate')}
            </button>
            <button
              className="button compact"
              disabled={!editableSelection.length}
              onClick={() => command('delete')}
            >
              {t('editing.delete')}
            </button>
          </>
        )}
        <button
          className="button compact"
          onClick={() => setObjects(!objects)}
          aria-expanded={objects}
        >
          {t('format.objects')}
        </button>
        <button
          className="button compact"
          disabled={!hasClipboard}
          onClick={() => command('paste')}
        >
          {t('editing.paste')}
        </button>
        {editableSelection.filter((id) => scene.nodes.some((n) => n.id === id))
          .length >= 2 && (
          <details className="selection-align">
            <summary>{t('format.align')}</summary>
            <div>
              {(
                [
                  'left',
                  'center',
                  'right',
                  'top',
                  'middle',
                  'bottom',
                  'horizontal',
                  'vertical',
                ] as const
              ).map((mode) => (
                <button
                  key={mode}
                  className="button compact"
                  disabled={
                    editableSelection.filter((id) =>
                      scene.nodes.some((n) => n.id === id),
                    ).length <
                    (mode === 'horizontal' || mode === 'vertical' ? 3 : 2)
                  }
                  onClick={() => command(mode)}
                >
                  {t(`editing.align.${mode}`)}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
      {objects && (
        <aside className="objects-panel" aria-label={t('format.objects')}>
          <label className="element-picker">
            {t('diagram.target')}
            <select
              aria-label={t('diagram.target')}
              defaultValue=""
              onChange={(event) => {
                const id = event.target.value;
                if (id) pick(id);
                event.target.value = '';
              }}
            >
              <option value="">{t('diagram.choose')}</option>
              {[
                ...page.nodes.map((item) => ({
                  id: item.id,
                  text:
                    typeof item.content.text === 'string' && item.content.text
                      ? item.content.text
                      : item.kind,
                })),
                ...page.connections.map((item) => ({
                  id: item.id,
                  text:
                    readConnection(item).label || t('diagram.connectionName'),
                })),
              ].map((item, i) => (
                <option key={item.id} value={item.id}>
                  {translate(locale, 'diagram.nodeName', {
                    index: i + 1,
                    text: item.text.slice(0, 80),
                  })}
                </option>
              ))}
            </select>
          </label>{' '}
        </aside>
      )}
      {formatting && (
        <FormatSelection
          ids={formatting}
          page={page}
          styles={styles}
          locale={locale}
          onApply={onEdit}
          onClose={() => {
            setFormatting(null);
            requestAnimationFrame(() => controls.current?.focus());
          }}
        />
      )}
      {feedback && (
        <p className="diagram-guidance" role="status">
          {t(feedback)}
        </p>
      )}
      {editError && (
        <p className="canvas-disclosure" role="alert">
          {t(editError)}
        </p>
      )}
      {editing && inline && (
        <InlineText
          key={editing}
          item={
            (page.nodes.find((n) => n.id === editing) ??
              page.connections.find((e) => e.id === editing))!
          }
          styles={styles}
          locale={locale}
          anchor={textAnchor}
          onApply={onEdit}
          onPreview={setTextPreview}
          onCancel={closeEditing}
        />
      )}
      {editing && !inline && (
        <ElementDialog
          key={editing}
          page={page}
          styles={styles}
          id={editing}
          locale={locale}
          onApply={onEdit}
          onCancel={closeEditing}
        />
      )}
      <div
        ref={host}
        onContextMenu={(event) => {
          event.preventDefault();
          const id =
            (event.target as Element)
              .closest('[data-node-id],[data-connection-id]')
              ?.getAttribute('data-node-id') ??
            (event.target as Element)
              .closest('[data-connection-id]')
              ?.getAttribute('data-connection-id');
          if (id && !selection.current.includes(id)) select([id]);
          setContextMenu(true);
        }}
        onKeyDown={(event) => {
          if (
            event.key === 'ContextMenu' ||
            (event.shiftKey && event.key === 'F10')
          ) {
            event.preventDefault();
            setContextMenu(true);
          }
        }}
        className={`interactive-canvas ${tool === 'select' ? 'select-active' : tool !== 'pan' ? 'tool-active' : ''}`}
        tabIndex={0}
        role="region"
        aria-label={t('canvas.navigation')}
        aria-describedby={`${patternId}-hint`}
      >
        <svg className="canvas-svg" aria-hidden="true">
          <defs>
            <pattern
              ref={pattern}
              id={patternId}
              patternUnits="userSpaceOnUse"
              width={24}
              height={24}
            >
              <circle cx={1} cy={1} r={1} className="grid-dot" />
            </pattern>
          </defs>
          <rect
            ref={gridRect}
            width="100%"
            height="100%"
            fill={`url(#${patternId})`}
          />
          <g ref={drawing} />
        </svg>
        <div
          ref={portRoot}
          className="connection-ports"
          role="group"
          aria-label={t('ports.heading')}
        />
        {!page.nodes.length && !page.connections.length && (
          <div className="canvas-welcome">
            <h2>{t('canvas.emptyTitle')}</h2>
            <p>{t('canvas.emptyDescription')}</p>
          </div>
        )}
        <p
          className={`canvas-hint ${page.nodes.length ? 'with-content' : ''}`}
          id={`${patternId}-hint`}
        >
          {t('canvas.hint')}
        </p>
      </div>
      {contextMenu && (
        <div
          ref={contextRoot}
          className="editing-context"
          role="menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu(false);
              controls.current?.focus();
            } else if (
              [
                'ArrowLeft',
                'ArrowRight',
                'ArrowDown',
                'ArrowUp',
                'Home',
                'End',
              ].includes(e.key)
            ) {
              e.preventDefault();
              const items = [
                  ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                    'button:not(:disabled)',
                  ),
                ],
                i = items.indexOf(document.activeElement as HTMLButtonElement);
              items[
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? items.length - 1
                    : (i +
                        (['ArrowRight', 'ArrowDown'].includes(e.key)
                          ? 1
                          : items.length - 1)) %
                      items.length
              ]?.focus();
            }
          }}
          aria-label={t('editing.actions')}
        >
          {(
            ['properties', 'duplicate', 'delete', 'copy', 'paste'] as const
          ).map((action) => (
            <button
              key={action}
              role="menuitem"
              className="button compact"
              disabled={
                action === 'paste' ? !hasClipboard : !editableSelection.length
              }
              onClick={() => command(action)}
            >
              {t(
                action === 'properties'
                  ? 'diagram.properties'
                  : `editing.${action}`,
              )}
            </button>
          ))}
          <button
            className="button compact"
            role="menuitem"
            onClick={() => {
              setContextMenu(false);
              controls.current?.focus();
            }}
          >
            {t('project.cancel')}
          </button>
        </div>
      )}
      <div className="canvas-navigation canvas-options">
        <button
          className="button compact"
          aria-label={t('canvas.zoomOut')}
          onClick={() => controls.current?.camera('out')}
        >
          {t('canvas.minus')}
        </button>
        <output aria-live="off" ref={percent} aria-label={t('canvas.zoom')} />
        <button
          className="button compact"
          aria-label={t('canvas.zoomIn')}
          onClick={() => controls.current?.camera('in')}
        >
          {t('canvas.plus')}
        </button>
        <button
          className="button compact"
          onClick={() => controls.current?.camera('reset')}
        >
          {t('canvas.reset')}
        </button>
        <button
          className="button compact"
          onClick={() => controls.current?.camera('fit')}
        >
          {t('canvas.fit')}
        </button>
        <button
          className="button compact"
          aria-pressed={grid.visible}
          disabled={!initial.writable}
          onClick={() => updateGrid({ ...grid, visible: !grid.visible })}
        >
          {t('canvas.grid')}
        </button>
        <button
          className="button compact"
          aria-pressed={grid.snap}
          title={t('canvas.snapHelp')}
          disabled={!initial.writable}
          onClick={() => updateGrid({ ...grid, snap: !grid.snap })}
        >
          {t('canvas.snap')}
        </button>
        <label>
          {t('canvas.spacing')}
          <input
            type="number"
            min={1}
            max={1024}
            step={1}
            value={grid.spacing}
            disabled={!initial.writable}
            onChange={(event) => {
              const spacing = event.currentTarget.valueAsNumber;
              if (spacing >= 1 && spacing <= 1024)
                updateGrid({ ...grid, spacing });
            }}
          />
        </label>
      </div>
      <div className="canvas-status">
        <span>
          {translate(locale, 'workspace.pageContent', {
            nodes: page.nodes.length,
            connections: page.connections.length,
          })}
        </span>
        <span>{t('status.local')}</span>
      </div>
      {(page.nodes.length > 0 || page.connections.length > 0) && (
        <p className="canvas-disclosure">{t('canvas.preview')}</p>
      )}
      {limited && (
        <p className="canvas-disclosure" role="status">
          {t('canvas.limited')}
        </p>
      )}
      {(!initial.writable || initial.adjusted) && (
        <p className="canvas-disclosure" role="status">
          {t(initial.writable ? 'canvas.adjusted' : 'canvas.future')}
        </p>
      )}
      {help && (
        <KeyboardShortcuts locale={locale} onClose={() => setHelp(false)} />
      )}
    </section>
  );
}
