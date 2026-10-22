import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import { Dialog } from '@koxora/ui';
import type { Page } from '@koxora/project';
import {
  buildScene,
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
export interface CanvasHandle {
  snapshot: () => CanvasState;
}
interface Props {
  page: Page;
  documentTitle: string;
  locale: string;
  onCommit: (state: CanvasState) => void;
  onPending: (pending: boolean) => void;
  ref?: Ref<CanvasHandle>;
}
export function Canvas({
  page,
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
  const [expanded, setExpanded] = useState(false);
  const [help, setHelp] = useState(false);
  const [limited, setLimited] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null),
    drawing = useRef<SVGGElement>(null),
    pattern = useRef<SVGPatternElement>(null),
    gridRect = useRef<SVGRectElement>(null),
    percent = useRef<HTMLOutputElement>(null);
  const controls = useRef<{
    camera: (action: 'in' | 'out' | 'reset' | 'fit') => void;
    settings: () => void;
  } | null>(null);
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
    const scene = buildScene(page);
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
    let space = false;
    const render = () => {
      frame = 0;
      const nextLimited = renderer.render(scene, state.current, size);
      if (nextLimited !== lastLimited) {
        lastLimited = nextLimited;
        setLimited(nextLimited);
      }
      output.value = new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: 0,
      }).format(state.current.camera.zoom);
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
    const down = (event: PointerEvent) => {
      if (event.button !== 0 && event.button !== 1) return;
      event.preventDefault();
      element.focus({ preventScroll: true });
      element.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, local(event));
      element.classList.add('panning');
    };
    const move = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const before = [...pointers.values()];
      const point = local(event);
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
      pointers.delete(event.pointerId);
      if (element.hasPointerCapture(event.pointerId))
        element.releasePointerCapture(event.pointerId);
      if (!pointers.size) {
        element.classList.remove('panning');
        commit();
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const distance = event.shiftKey ? 160 : 40;
      const directions: Record<string, Point> = {
        ArrowLeft: { x: distance, y: 0 },
        ArrowRight: { x: -distance, y: 0 },
        ArrowUp: { x: 0, y: distance },
        ArrowDown: { x: 0, y: -distance },
      };
      if (directions[event.key]) {
        event.preventDefault();
        change(pan(state.current.camera, directions[event.key]));
        commit();
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
        space = true;
        element.classList.add('hand-ready');
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.key === ' ' && space) {
        space = false;
        element.classList.remove('hand-ready');
      }
    };
    const blur = () => {
      space = false;
      element.classList.remove('hand-ready', 'panning');
      pointers.clear();
      commit();
    };
    const observer = new ResizeObserver(() => {
      size = measure();
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
    render();
    return () => {
      commit();
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      controls.current = null;
      element.removeEventListener('wheel', wheel);
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('lostpointercapture', up);
      element.removeEventListener('keydown', key);
      element.removeEventListener('keyup', keyup);
      element.removeEventListener('blur', blur);
      renderer.clear();
    };
    // A keyed canvas owns one immutable page scene; navigation changes only its camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, locale]);
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
      if (event.key === 'Escape') {
        event.preventDefault();
        setExpanded(false);
      }
      if (event.key !== 'Tab') return;
      const focusable = [
        ...root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
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
  function updateGrid(next: typeof grid) {
    state.current = { ...state.current, grid: next };
    setGrid(next);
    controls.current?.settings();
  }
  return (
    <section
      ref={stage}
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
        className="interactive-canvas"
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
        <p className="canvas-hint" id={`${patternId}-hint`}>
          {t('canvas.hint')}
        </p>
      </div>
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
