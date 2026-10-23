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
import { Dialog } from '@koxora/ui';
import type { Page, Style, Node } from '@koxora/project';
import {
  buildScene,
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
import { DiagramTools, ElementDialog, type DiagramTool } from './diagram-tools';
export interface CanvasHandle {
  snapshot: () => CanvasState;
}
interface Props {
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
  function select(ids: string[]) {
    selection.current = ids;
    setSelectedState(ids);
    controls.current?.refresh();
  }
  const cancelInput = useRef<() => boolean>(() => false);
  const spaceHeld = useRef(false);
  const [editError, setEditError] = useState<MessageKey | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
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
  const scene = useMemo(
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
  function activate(next: DiagramTool) {
    cancelInput.current();
    setTool(next);
    setSource(null);
    setContextMenu(false);
  }
  function pick(id: string) {
    const item =
      page.nodes.find((n) => n.id === id) ??
      page.connections.find((e) => e.id === id);
    if (!item) return;
    try {
      assertEditableElement(item);
    } catch {
      setEditError('diagram.error.unsupported');
      return;
    }
    setEditError(null);
    if (tool === 'connect') {
      if (!page.nodes.some((n) => n.id === id && !isDrawing(n.kind))) return;
      if (!source) setSource(id);
      else if (source === id) setEditError('diagram.error.endpoint');
      else if (
        page.connections.some(
          (e) =>
            (e.sourceId === source && e.targetId === id) ||
            (!options.arrow && e.sourceId === id && e.targetId === source),
        )
      )
        setEditError('diagram.error.duplicate');
      else if (
        onEdit({
          type: 'connect',
          id: crypto.randomUUID(),
          sourceId: source,
          targetId: id,
          layerId,
          options,
        })
      )
        setSource(null);
      else setEditError('diagram.error.invalid');
    } else {
      select([id]);
      setEditing(id);
    }
  }
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
        if (tool === 'text') setEditing(id);
      }
    } else {
      const node = pickNode(scene, point, 6 / state.current.camera.zoom);
      const edge =
        id && scene.connections.find((e) => e.id === id && e.editable);
      if (node) pick(node.id);
      else if (edge && tool !== 'connect') pick(edge.id);
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
  const [expanded, setExpanded] = useState(false);
  const [help, setHelp] = useState(false);
  const [limited, setLimited] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null),
    drawing = useRef<SVGGElement>(null),
    pattern = useRef<SVGPatternElement>(null),
    gridRect = useRef<SVGRectElement>(null),
    percent = useRef<HTMLOutputElement>(null);
  const interaction = useRef<{
    tool: DiagramTool;
    act: typeof act;
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
      const nextLimited = renderer.render(
        preview,
        state.current,
        size,
        interaction.current.source,
        selection.current,
        marquee,
        snapping,
      );
      if (nextLimited !== lastLimited) {
        lastLimited = nextLimited;
        setLimited(nextLimited);
      }
      output.value = new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: 0,
      }).format(state.current.camera.zoom);
      element.dataset.snapping = String(snapping);
      element.dataset.selection = JSON.stringify(selection.current);
      element.dataset.camera = JSON.stringify(state.current.camera);
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
      kind: 'move' | 'resize' | 'marquee' | 'insert' | 'pick';
      start: Point;
      screen: Point;
      moved: boolean;
      originals: Node[];
      base: string[];
      handle?: string;
      edgeId?: string;
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
      let kind: Gesture['kind'] = isShapeKind(active.tool)
        ? 'insert'
        : active.tool === 'connect' || active.tool === 'edit'
          ? 'pick'
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
        else if (done.kind === 'pick' && !done.moved)
          interaction.current.act(done.start, done.edgeId);
      }
      resetPreview();
      if (!pointers.size) {
        element.classList.remove('panning');
        commit();
      }
    };
    const key = (event: KeyboardEvent) => {
      const active = interaction.current;
      const modifier = event.ctrlKey || event.metaKey;
      const letter = event.key.toLowerCase();
      if (modifier && ['a', 'd', 'c', 'v', 'z', 'y'].includes(letter)) {
        event.preventDefault();
        if (letter === 'a') {
          cancelGesture();
          active.select(
            [...scene.nodes, ...scene.connections]
              .filter((n) => n.editable)
              .map((n) => n.id),
          );
        } else
          active.command(
            letter === 'd'
              ? 'duplicate'
              : letter === 'c'
                ? 'copy'
                : letter === 'v'
                  ? 'paste'
                  : letter === 'y' || event.shiftKey
                    ? 'redo'
                    : 'undo',
          );
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
        if (isShapeKind(active.tool)) active.act(state.current.camera);
        else active.command('properties');
        return;
      }
      if (modifier) return;
      const directions: Record<string, Point> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
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
      } else if (['+', '=', '-', '0', 'Home'].includes(event.key)) {
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
    };
    // Content transactions replace the scene; navigation retains the current scene.
  }, [content, scene, locale, layerId, styles]);
  useEffect(() => {
    if (!expanded) return;
    const root = stage.current!;
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
  }, [expanded]);
  useEffect(() => {
    controls.current?.refresh();
  }, [source]);
  function updateGrid(next: typeof grid) {
    state.current = { ...state.current, grid: next };
    setGrid(next);
    controls.current?.settings();
  }
  return (
    <section
      ref={stage}
      onKeyDown={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          !event.defaultPrevented &&
          event.target instanceof Element &&
          !event.target.closest(
            'input, textarea, select, dialog, [contenteditable="true"], .interactive-canvas',
          )
        ) {
          const letter = event.key.toLowerCase();
          if (letter === 'z' || letter === 'y') {
            event.preventDefault();
            command(letter === 'y' || event.shiftKey ? 'redo' : 'undo');
          } else if (letter === 'a') {
            event.preventDefault();
            select(
              [...scene.nodes, ...scene.connections]
                .filter((n) => n.editable)
                .map((n) => n.id),
            );
          } else if (['d', 'c', 'v'].includes(letter)) {
            event.preventDefault();
            command(
              letter === 'd' ? 'duplicate' : letter === 'c' ? 'copy' : 'paste',
            );
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
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded ? true : undefined}
      className={`canvas-stage interactive-stage ${expanded ? 'canvas-expanded' : ''}`}
      aria-label={t('workspace.canvas')}
    >
      <div className="canvas-toolbar">
        <span>
          <span dir="auto">{documentTitle}</span>
          <span className="breadcrumb-separator">/</span>
          <span dir="auto">{page.title}</span>
        </span>
        <button
          className="button compact"
          aria-pressed={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {t(expanded ? 'canvas.restore' : 'canvas.expand')}
        </button>
      </div>
      <DiagramTools
        page={page}
        styles={styles}
        locale={locale}
        tool={tool}
        source={source}
        layerId={layerId}
        setLayer={setLayerId}
        activate={activate}
        pick={pick}
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
        <button
          className="button compact"
          disabled={editableSelection.length !== 1}
          onClick={() => command('properties')}
        >
          {t('diagram.properties')}
        </button>
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
        <details className="editing-more">
          <summary>{t('editing.more')}</summary>
          <div>
            <button
              className="button compact"
              disabled={!editableSelection.length}
              onClick={() => command('copy')}
            >
              {t('editing.copy')}
            </button>
            <button
              className="button compact"
              disabled={!hasClipboard}
              onClick={() => command('paste')}
            >
              {t('editing.paste')}
            </button>
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
                  editableSelection.length <
                  (mode === 'horizontal' || mode === 'vertical' ? 3 : 2)
                }
                onClick={() => command(mode)}
              >
                {t(`editing.align.${mode}`)}
              </button>
            ))}
          </div>
        </details>
      </div>
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
      {editing && (
        <ElementDialog
          key={editing}
          page={page}
          styles={styles}
          id={editing}
          locale={locale}
          onApply={onEdit}
          onCancel={() => setEditing(null)}
        />
      )}
      <div className="canvas-options">
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
        <button className="button compact" onClick={() => setHelp(true)}>
          {t('canvas.help')}
        </button>
      </div>
      <div
        ref={host}
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu(true);
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
          className="editing-context"
          role="group"
          aria-label={t('editing.actions')}
        >
          {(
            ['properties', 'duplicate', 'delete', 'copy', 'paste'] as const
          ).map((action) => (
            <button
              key={action}
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
            onClick={() => setContextMenu(false)}
          >
            {t('project.cancel')}
          </button>
        </div>
      )}
      <div className="canvas-navigation">
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
        <Dialog title={t('canvas.help')} onCancel={() => setHelp(false)}>
          <p>{t('canvas.helpBody')}</p>
          <p>{t('canvas.snapHelp')}</p>
          <button className="button" onClick={() => setHelp(false)}>
            {t('project.cancel')}
          </button>
        </Dialog>
      )}
    </section>
  );
}
