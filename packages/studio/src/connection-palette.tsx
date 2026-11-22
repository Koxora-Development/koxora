import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DiagramTool } from './diagram-tools';
import { createPortal } from 'react-dom';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  ENDPOINT_MARKERS,
  LINE_STYLES,
  isDrawing,
  isShapeKind,
  shapeRegistry,
  type ConnectionOptions,
  type EndpointMarker,
} from '@koxora/editor-core';
import {
  connectionPresets,
  connectionPresetMatches,
  applyConnectionPreset,
} from './connection-presets';
import { connectionMarkerGeometry } from './connection-marker';
import './connection-palette.css';
function Marker({
  kind,
  x,
  y,
  reverse = false,
}: {
  kind: EndpointMarker;
  x: number;
  y: number;
  reverse?: boolean;
}) {
  if (kind === 'none') return null;
  const marker = connectionMarkerGeometry(kind, 7);
  return (
    <path
      d={marker.path}
      fill={
        marker.filled
          ? 'currentColor'
          : kind === 'diamond' || kind === 'circle'
            ? 'var(--surface)'
            : 'none'
      }
      stroke="currentColor"
      strokeWidth={1.4}
      transform={`translate(${x} ${y}) rotate(${reverse ? 180 : 0})`}
    />
  );
}
function ConnectionPreview({
  options,
}: {
  options: Pick<
    ConnectionOptions,
    | 'routing'
    | 'lineStyle'
    | 'sourceMarker'
    | 'targetMarker'
    | 'arrow'
    | 'startArrow'
  >;
}) {
  const curved = options.routing === 'curved';
  const elbow = options.routing === 'orthogonal';
  return (
    <svg viewBox="0 0 56 32" aria-hidden="true">
      <path
        d={
          curved
            ? 'M 6 24 C 24 24 32 8 50 8'
            : elbow
              ? 'M 6 24 H 28 V 8 H 50'
              : 'M 6 16 H 50'
        }
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeDasharray={
          options.lineStyle === 'dashed'
            ? '5 3'
            : options.lineStyle === 'dotted'
              ? '0 4'
              : undefined
        }
        strokeLinecap={options.lineStyle === 'dotted' ? 'round' : undefined}
      />
      <Marker
        kind={options.sourceMarker ?? (options.startArrow ? 'arrow' : 'none')}
        x={6}
        y={elbow || curved ? 24 : 16}
        reverse
      />
      <Marker
        kind={options.targetMarker ?? (options.arrow ? 'arrow' : 'none')}
        x={50}
        y={elbow || curved ? 8 : 16}
      />
    </svg>
  );
}
export function ConnectionPalette({
  locale,
  options,
  active,
  writable,
  onChoose,
  query = '',
  tool,
  activate,
  connectionExtra,
  actionsContainer,
}: {
  locale: string;
  options: ConnectionOptions;
  active: boolean;
  writable: boolean;
  onChoose: (options: ConnectionOptions) => void;
  query?: string;
  tool?: DiagramTool;
  activate?: (tool: DiagramTool) => void;
  connectionExtra?: ReactNode;
  actionsContainer?: HTMLElement | null;
}) {
  const t = (key: string) => translate(locale, key as MessageKey);
  const normalize = (value: string) =>
    value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
  const search = normalize(query.trim());
  const matches = connectionPresets.filter(
    (preset) =>
      !search ||
      normalize(
        `${t(`line.${preset.id}`)} ${translate('en', `line.${preset.id}` as MessageKey)} ${preset.id}`,
      ).includes(search),
  );
  const [pageAnchor, setPageAnchor] = useState(0),
    [pageSize, setPageSize] = useState(12);
  const [seenQuery, setSeenQuery] = useState(query);
  if (query !== seenQuery) {
    setSeenQuery(query);
    setPageAnchor(0);
  }
  const strip = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = strip.current!;
    const measure = () => {
      const toolbar = element.querySelector<HTMLElement>(
        '.connection-palette',
      )!;
      const button = toolbar.querySelector<HTMLElement>('.connection-preset');
      const style = getComputedStyle(toolbar),
        gap = Number.parseFloat(style.columnGap) || 3;
      const scale =
        Number.parseFloat(style.getPropertyValue('--ui-scale')) || 1;
      const width = button?.getBoundingClientRect().width || 64 * scale;
      const available =
        toolbar.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight);
      if (available > 0)
        setPageSize(Math.max(1, Math.floor((available + gap) / (width + gap))));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const setPage = (next: number) => setPageAnchor(next * pageSize);
  const currentPage = Math.min(
      Math.floor(pageAnchor / pageSize),
      pageCount - 1,
    ),
    pageStart = currentPage * pageSize;
  const activeIndex = active
    ? matches.findIndex((preset) => connectionPresetMatches(options, preset))
    : -1;
  const activeId = activeIndex >= 0 ? matches[activeIndex].id : null;
  const [seenActive, setSeenActive] = useState(activeId);
  if (activeId !== seenActive) {
    setSeenActive(activeId);
    if (activeIndex >= 0) setPage(Math.floor(activeIndex / pageSize));
  }
  const wheelPages = useRef({
    page: currentPage,
    count: pageCount,
    size: pageSize,
  });
  const wheelMotion = useRef({
    amount: 0,
    direction: 0,
    lastEvent: 0,
    nextPage: 0,
  });
  useLayoutEffect(() => {
    wheelPages.current = {
      page: currentPage,
      count: pageCount,
      size: pageSize,
    };
  }, [currentPage, pageCount, pageSize]);
  useEffect(() => {
    wheelMotion.current = {
      amount: 0,
      direction: 0,
      lastEvent: 0,
      nextPage: 0,
    };
  }, [query, pageSize, pageCount]);
  useEffect(() => {
    const element = strip.current!;
    const wheel = (event: WheelEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        wheelPages.current.count < 2
      )
        return;
      const axis =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? Math.max(1, element.clientWidth)
            : 1;
      const delta = axis * unit;
      if (!Number.isFinite(delta) || !delta) return;
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now(),
        motion = wheelMotion.current,
        direction = Math.sign(delta);
      if (direction !== motion.direction || now - motion.lastEvent > 160)
        motion.amount = 0;
      motion.direction = direction;
      motion.lastEvent = now;
      if (now < motion.nextPage) return;
      motion.amount += delta;
      if (Math.abs(motion.amount) < 48) return;
      motion.amount = 0;
      motion.nextPage = now + 240;
      const current = wheelPages.current,
        next = Math.max(
          0,
          Math.min(current.count - 1, current.page + direction),
        );
      if (next === current.page) return;
      current.page = next;
      setPageAnchor(next * current.size);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  const batch = matches.slice(pageStart, pageStart + pageSize);
  const currentPreset = active
    ? connectionPresets.find((preset) =>
        connectionPresetMatches(options, preset),
      )
    : undefined;
  const currentLabel = translate(locale, 'ribbon.activeTool' as MessageKey, {
    tool: currentPreset ? t(`line.${currentPreset.id}`) : t('line.options'),
  });
  const batchHasActive = batch.some((preset) => preset.id === activeId);
  const actions = (
    <>
      {activate && (
        <div
          className="connection-navigation"
          role="toolbar"
          aria-label={t('diagram.tools')}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
              return;
            event.preventDefault();
            const buttons = [...event.currentTarget.querySelectorAll('button')];
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            buttons[
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (index +
                      (event.key === 'ArrowLeft' ? -1 : 1) +
                      buttons.length) %
                    buttons.length
            ]?.focus();
          }}
        >
          {(['select', 'pan'] as const).map((kind) => (
            <button
              type="button"
              key={kind}
              className="connection-nav"
              aria-label={t(`diagram.${kind}`)}
              aria-pressed={tool === kind}
              tabIndex={
                tool === kind || (tool !== 'pan' && kind === 'select') ? 0 : -1
              }
              onClick={() => activate(kind)}
            >
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d={
                    kind === 'select'
                      ? 'M 7 4 L 25 18 L 17 19 L 13 27 Z'
                      : 'M 16 3 V 29 M 3 16 H 29 M 11 8 L 16 3 L 21 8 M 11 24 L 16 29 L 21 24'
                  }
                />
              </svg>
            </button>
          ))}
        </div>
      )}
      {connectionExtra && (
        <div className="connection-extra">{connectionExtra}</div>
      )}
      {active && !batchHasActive && (
        <button
          type="button"
          className="connection-preset connection-current-preset"
          aria-label={currentLabel}
          title={currentLabel}
          aria-pressed="true"
          disabled={!writable}
          onClick={() => onChoose(options)}
        >
          <ConnectionPreview options={options} />
        </button>
      )}
      {activate &&
        tool &&
        tool !== 'select' &&
        tool !== 'pan' &&
        !isDrawing(tool) &&
        tool !== 'junction' && (
          <button
            type="button"
            className="connection-nav connection-current-tool"
            aria-pressed="true"
            aria-label={t(`shape.${tool}`)}
            title={t(`shape.${tool}`)}
            onClick={() => activate(tool)}
          >
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path
                d={
                  tool === 'text'
                    ? 'M 6 6 H 26 M 16 6 V 27 M 11 27 H 21'
                    : isShapeKind(tool)
                      ? shapeRegistry[tool].path(26, 22, 5)
                      : 'M 3 25 Q 7 5 13 16 T 29 6'
                }
                transform={
                  isShapeKind(tool) && tool !== 'text'
                    ? 'translate(3 5)'
                    : undefined
                }
              />
            </svg>
          </button>
        )}
    </>
  );
  return (
    <section className="connection-library" aria-label={t('line.library')}>
      {actionsContainer && createPortal(actions, actionsContainer)}
      <div
        className="connection-palette-strip"
        ref={strip}
        title={t('palette.wheelHelp')}
      >
        <button
          type="button"
          className="button connection-page-button"
          disabled={currentPage === 0}
          aria-label={t('ribbon.previousConnections')}
          onClick={() => setPage(currentPage - 1)}
        >
          {'‹'}
        </button>
        <div
          role="toolbar"
          aria-label={t('line.library')}
          className="connection-palette"
          onKeyDown={(event) => {
            if (['PageUp', 'PageDown'].includes(event.key)) {
              event.preventDefault();
              setPage(
                Math.max(
                  0,
                  Math.min(
                    pageCount - 1,
                    currentPage + (event.key === 'PageUp' ? -1 : 1),
                  ),
                ),
              );
              requestAnimationFrame(() =>
                strip.current
                  ?.querySelector<HTMLButtonElement>('.connection-preset')
                  ?.focus(),
              );
              return;
            }
            if (
              ![
                'ArrowRight',
                'ArrowLeft',
                'ArrowDown',
                'ArrowUp',
                'Home',
                'End',
              ].includes(event.key)
            )
              return;
            event.preventDefault();
            const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                'button:not(:disabled)',
              ),
            ];
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (index +
                      (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) +
                      buttons.length) %
                    buttons.length;
            buttons[next]?.focus();
            buttons[next]?.scrollIntoView({
              block: 'nearest',
              inline: 'nearest',
            });
          }}
        >
          {!actionsContainer && actions}
          {batch.map((preset, index) => (
            <button
              className="connection-preset"
              type="button"
              key={preset.id}
              data-connection-preset={preset.id}
              disabled={!writable}
              title={t(`line.${preset.id}`)}
              aria-label={t(`line.${preset.id}`)}
              aria-pressed={active && connectionPresetMatches(options, preset)}
              tabIndex={
                activeId === preset.id || (!batchHasActive && index === 0)
                  ? 0
                  : -1
              }
              onClick={() => onChoose(applyConnectionPreset(options, preset))}
            >
              <ConnectionPreview options={preset} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="button connection-page-button"
          disabled={currentPage + 1 >= pageCount}
          aria-label={t('ribbon.nextConnections')}
          onClick={() => setPage(currentPage + 1)}
        >
          {'›'}
        </button>
      </div>
      <p className="connection-page-status" role="status">
        {translate(locale, 'ribbon.connectionResults' as MessageKey, {
          start: matches.length ? pageStart + 1 : 0,
          end: Math.min(pageStart + pageSize, matches.length),
          count: matches.length,
        })}
      </p>
      {!matches.length && <p className="element-empty">{t('palette.empty')}</p>}
    </section>
  );
}
export function ConnectionStyleFields({
  locale,
  options,
  onChange,
}: {
  locale: string;
  options: ConnectionOptions;
  onChange: (value: ConnectionOptions) => void;
}) {
  const t = (key: string) => translate(locale, key as MessageKey);
  return (
    <details className="connection-style-fields">
      <summary>{t('line.details')}</summary>
      <div>
        <label>
          {t('line.pattern')}
          <select
            value={options.lineStyle ?? 'solid'}
            onChange={(e) =>
              onChange({
                ...options,
                lineStyle: e.target.value as ConnectionOptions['lineStyle'],
              })
            }
          >
            {LINE_STYLES.map((style) => (
              <option key={style} value={style}>
                {t(`line.pattern.${style}`)}
              </option>
            ))}
          </select>
        </label>
        {(['source', 'target'] as const).map((side) => (
          <label key={side}>
            {t(`line.${side}Marker`)}
            <select
              value={
                options[side === 'source' ? 'sourceMarker' : 'targetMarker'] ??
                ((side === 'source' ? options.startArrow : options.arrow)
                  ? 'arrow'
                  : 'none')
              }
              onChange={(e) =>
                onChange({
                  ...options,
                  [side === 'source' ? 'sourceMarker' : 'targetMarker']:
                    e.target.value,
                  [side === 'source' ? 'startArrow' : 'arrow']:
                    e.target.value === 'arrow' ||
                    e.target.value === 'open-arrow',
                })
              }
            >
              {ENDPOINT_MARKERS.map((marker) => (
                <option key={marker} value={marker}>
                  {t(`line.marker.${marker}`)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </details>
  );
}
