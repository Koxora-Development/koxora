import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  shapeKinds,
  shapeRegistry,
  isShapeKind,
  isDrawing,
} from '@koxora/editor-core';
import type { DiagramTool } from './diagram-tools';
import { PALETTE_KEYS } from './shortcuts';
import './shape-palette.css';

import {
  libraryCategories,
  libraryElementKinds,
  readLibrarySelection,
  writeLibrarySelection,
  type LibraryCategory,
  type LibraryElement,
} from './library-preferences';
import { BrowseElements, ShapeCategories } from './shape-categories';

let sessionSelection: LibraryCategory[] | null = null;
let sessionRemember = true;

const normalize = (value: string) =>
  value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
const toolKey = (item: DiagramTool) =>
  (isShapeKind(item) || item === 'freehand'
    ? `shape.${item}`
    : `diagram.${item}`) as MessageKey;
const catalogTools: LibraryElement[] = [
  ...shapeKinds,
  'freehand' as const,
].filter((kind) => !isDrawing(kind) && kind !== 'junction');
type PaletteMode = 'shapes' | 'connections';
export interface ShapePaletteHandle {
  browse: (mode: PaletteMode) => void;
}

/** Categories filter the shared registry; imported kind strings never load assets or code. */
export function ShapePalette({
  ref,
  focusCanvas,
  locale,
  tool,
  activate,
  writable,
  connectionTools,
  connectionActive = false,
}: {
  ref: Ref<ShapePaletteHandle>;
  focusCanvas: () => void;
  locale: string;
  tool: DiagramTool;
  activate: (tool: DiagramTool) => void;
  writable: boolean;
  connectionTools?: (
    query: string,
    actionsContainer: HTMLDivElement | null,
  ) => ReactNode;
  connectionActive?: boolean;
}) {
  const [categories, setCategories] = useState<LibraryCategory[]>(() =>
    sessionSelection
      ? [...sessionSelection]
      : readLibrarySelection({
          getItem: (key) => localStorage.getItem(key),
        }),
  );
  const [remember, setRemember] = useState(sessionRemember);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [browser, setBrowser] = useState<'enabled' | 'catalog' | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [connectionQuery, setConnectionQuery] = useState('');
  const [mode, setMode] = useState<PaletteMode>(
    connectionActive ? 'connections' : 'shapes',
  );
  const [seenTool, setSeenTool] = useState(tool);
  if (tool !== seenTool) {
    setSeenTool(tool);
    if (connectionActive) setMode('connections');
    else if (isShapeKind(tool) || tool === 'freehand') setMode('shapes');
  }
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [connectionActions, setConnectionActions] =
    useState<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState(false);
  const [inlineFilters, setInlineFilters] = useState(false);
  const ribbonId = useId();
  const ribbon = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  useImperativeHandle(
    ref,
    () => ({
      browse: (next) => {
        if (!writable) return;
        if (next === 'shapes') setBrowser('catalog');
        else {
          setMode('connections');
          setConnectionQuery('');
          searchInput.current?.focus();
        }
      },
    }),
    [writable],
  );
  const [quickCategory, setQuickCategory] = useState<LibraryCategory | 'all'>(
    'all',
  );
  const [pageAnchor, setPageAnchor] = useState(0);
  const [capacity, setCapacity] = useState(16);
  const strip = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = strip.current!;
    const root = ribbon.current!;
    const measure = () => {
      const toolbar = element.querySelector<HTMLElement>('.shape-palette')!;
      const button = toolbar.querySelector<HTMLElement>('.palette-tool');
      const width = button?.getBoundingClientRect().width ?? 27;
      const padding = getComputedStyle(toolbar);
      const gap = Number.parseFloat(padding.columnGap) || 1;
      const available =
        toolbar.clientWidth -
        Number.parseFloat(padding.paddingLeft) -
        Number.parseFloat(padding.paddingRight);
      if (available > 0 && width > 0) {
        setMeasured(true);
        setCapacity(Math.max(1, Math.floor((available + gap) / (width + gap))));
      }
      const scale =
        Number.parseFloat(
          getComputedStyle(root).getPropertyValue('--ui-scale'),
        ) || 1;
      setInlineFilters(root.clientWidth >= 860 * scale);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  const t = (key: string) => translate(locale, key as MessageKey);
  const filtered = (
    selected: readonly LibraryCategory[],
    nextQuery: string,
  ) => {
    const allowed = new Set(
      selected.flatMap((category) => [...libraryElementKinds[category]]),
    );
    const search = normalize(nextQuery.trim());
    return catalogTools.filter(
      (item) =>
        allowed.has(item) &&
        (!search ||
          normalize(
            `${t(toolKey(item))} ${translate('en', toolKey(item))} ${item}`,
          ).includes(search)),
    );
  };
  const currentCategory = categories.includes(quickCategory as LibraryCategory)
    ? quickCategory
    : 'all';
  const matches = filtered(
    currentCategory === 'all' ? categories : [currentCategory],
    query,
  );
  // Reserve a current-tool slot so arming a shape cannot shift page boundaries.
  const pinTool =
    tool !== 'select' &&
    tool !== 'pan' &&
    !isDrawing(tool) &&
    tool !== 'junction';
  const reservePen = matches.includes('freehand') ? 1 : 0;
  const pageSize = Math.max(
    1,
    Math.min(matches.length || 1, capacity - 3 - reservePen),
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  // An exact catalog position survives repeated width changes without drift.
  const currentPage = Math.min(
    Math.floor(pageAnchor / pageSize),
    pageCount - 1,
  );
  const setPage = (next: number) => setPageAnchor(next * pageSize);
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
  }, [currentCategory, query, pageSize, pageCount]);
  useEffect(() => {
    const element = strip.current!;
    const wheel = (event: WheelEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        wheelPages.current.count < 2 ||
        (event.target instanceof Element &&
          event.target.closest(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="listbox"]',
          ))
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
      if (!Number.isFinite(delta) || delta === 0) return;
      // A nonpassive native listener is required to contain scrolling here.
      // At either end, keep the strip still rather than moving the workbench.
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      const motion = wheelMotion.current;
      const direction = Math.sign(delta);
      if (direction !== motion.direction || now - motion.lastEvent > 160)
        motion.amount = 0;
      motion.direction = direction;
      motion.lastEvent = now;
      if (now < motion.nextPage) return;
      motion.amount += delta;
      // Accumulate small trackpad deltas; a mouse notch advances one page.
      if (Math.abs(motion.amount) < 48) return;
      motion.amount = 0;
      motion.nextPage = now + 240;
      const current = wheelPages.current;
      const next = Math.max(
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
  const pageStart = currentPage * pageSize;
  const tools: DiagramTool[] = [
    'select',
    'pan',
    ...matches.slice(pageStart, pageStart + pageSize),
  ];
  // Menu/shortcut activation can select a tool outside the current category.
  // Keep that explicit choice visible and retain a keyboard entry point.
  if (pinTool && !tools.includes(tool)) tools.splice(2, 0, tool);
  // Preserve the pen's established quick/End-key entry point when enabled.
  if (matches.includes('freehand') && !tools.includes('freehand'))
    tools.push('freehand');
  const focusTool =
    tools.includes(tool) && (writable || tool === 'select' || tool === 'pan')
      ? tool
      : 'select';
  const updateFilters = (
    nextCategories: LibraryCategory[],
    nextQuery: string,
  ) => {
    setCategories(nextCategories);
    setQuery(nextQuery);
    setPage(0);
    // A filtered-out insertion tool must never remain armed invisibly.
    if (
      tool !== 'select' &&
      tool !== 'pan' &&
      mode === 'shapes' &&
      !connectionActive &&
      !filtered(nextCategories, nextQuery).includes(tool)
    )
      activate('select');
  };
  const icons = {
    freehand: 'M 3 25 Q 7 5 13 16 T 29 6',
    select: 'M 7 4 L 25 18 L 17 19 L 13 27 Z',
    pan: 'M 16 3 V 29 M 3 16 H 29 M 11 8 L 16 3 L 21 8 M 11 24 L 16 29 L 21 24 M 8 11 L 3 16 L 8 21 M 24 11 L 29 16 L 24 21',
  };
  return (
    <div
      className="element-library compact-tool-ribbon"
      ref={ribbon}
      data-ribbon-mode={mode}
      data-palette-measured={measured}
      data-palette-capacity={capacity}
      data-palette-page-size={pageSize}
    >
      <div className="ribbon-header">
        {connectionTools && (
          <div
            className="ribbon-mode-tabs"
            role="tablist"
            aria-label={t('ribbon.heading')}
            onKeyDown={(event) => {
              if (
                !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 'shapes'
                  : event.key === 'End'
                    ? 'connections'
                    : mode === 'shapes'
                      ? 'connections'
                      : 'shapes';
              setMode(next);
              requestAnimationFrame(() =>
                ribbon.current
                  ?.querySelector<HTMLButtonElement>(
                    `[data-ribbon-tab="${next}"]`,
                  )
                  ?.focus(),
              );
            }}
          >
            {(['shapes', 'connections'] as const).map((value) => (
              <button
                type="button"
                role="tab"
                key={value}
                data-ribbon-tab={value}
                id={`${ribbonId}-${value}-tab`}
                aria-controls={`${ribbonId}-${value}-panel`}
                aria-selected={mode === value}
                tabIndex={mode === value ? 0 : -1}
                onClick={() => {
                  setMode(value);
                }}
              >
                {t(`ribbon.${value}`)}
              </button>
            ))}
          </div>
        )}
        <label className="ribbon-search">
          <span className="sr-only">{t('palette.search')}</span>
          <input
            ref={searchInput}
            type="search"
            value={mode === 'shapes' ? query : connectionQuery}
            placeholder={t('palette.search')}
            onChange={(event) => {
              if (mode === 'connections')
                setConnectionQuery(event.target.value);
              else updateFilters(categories, event.target.value);
            }}
          />
        </label>
        <div
          ref={setConnectionActions}
          className="ribbon-connection-actions"
          hidden={mode !== 'connections'}
        />
        {mode === 'shapes' && connectionActive && (
          <span className="ribbon-active-label" role="status">
            {translate(locale, 'ribbon.activeTool' as MessageKey, {
              tool: t(toolKey(tool)),
            })}
          </span>
        )}
        <button
          type="button"
          className="button compact ribbon-filter-toggle"
          hidden={inlineFilters || mode !== 'shapes'}
          aria-label={t('ribbon.libraries')}
          title={t('ribbon.libraries')}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((value) => !value)}
        >
          {'☷'}
        </button>
        <div
          className="element-filters ribbon-shape-filters"
          hidden={mode !== 'shapes' || (!inlineFilters && !filtersOpen)}
          role="group"
          aria-label={t('palette.filters')}
        >
          <button
            className="button compact category-picker-button"
            type="button"
            aria-label={t('palette.chooseCategories')}
            onClick={() => setCategoriesOpen(true)}
          >
            {t('palette.chooseCategories')}
            <span className="category-picker-count" aria-hidden="true">
              {categories.length}/{libraryCategories.length}
            </span>
          </button>
          <button
            className="button compact"
            type="button"
            onClick={() => setBrowser('enabled')}
          >
            {t('palette.browseElements')}
          </button>
          <label className="quick-library-filter">
            {t('palette.quickCategory')}
            <select
              value={currentCategory}
              onChange={(event) => {
                setQuickCategory(event.target.value as LibraryCategory | 'all');
                setPage(0);
              }}
            >
              <option value="all">{t('palette.allEnabled')}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {t(`palette.category.${category}`)}
                </option>
              ))}
            </select>
          </label>
          <span className="element-results" role="status">
            {translate(locale, 'palette.results' as MessageKey, {
              count: matches.length,
            })}
          </span>
        </div>
      </div>
      <div
        role={connectionTools ? 'tabpanel' : undefined}
        id={`${ribbonId}-shapes-panel`}
        aria-labelledby={connectionTools ? `${ribbonId}-shapes-tab` : undefined}
        hidden={mode !== 'shapes'}
      >
        <div
          className="palette-strip"
          ref={strip}
          title={t('palette.wheelHelp')}
        >
          <button
            type="button"
            className="button palette-page-button"
            aria-label={t('palette.previousPage')}
            title={t('palette.previousPage')}
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            {'‹'}
          </button>
          <div
            className="shape-palette"
            role="toolbar"
            aria-label={translate(locale, 'diagram.tools')}
            onKeyDown={(event) => {
              if (!PALETTE_KEYS.includes(event.key)) return;
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
                        (['ArrowLeft', 'ArrowUp'].includes(event.key)
                          ? -1
                          : 1) +
                        buttons.length) %
                      buttons.length;
              buttons[next]?.focus();
              buttons[next]?.scrollIntoView({
                block: 'nearest',
                inline: 'nearest',
              });
            }}
          >
            {tools.map((item) => {
              const name = t(toolKey(item));
              const path = isShapeKind(item)
                ? isDrawing(item)
                  ? 'M 3 16 H 29'
                  : item === 'text'
                    ? 'M 6 6 H 26 M 16 6 V 27 M 11 27 H 21'
                    : shapeRegistry[item].path(26, 22, 5)
                : icons[item];
              return (
                <button
                  key={item}
                  className="palette-tool"
                  data-library-kind={
                    isShapeKind(item) || item === 'freehand' ? item : undefined
                  }
                  title={`${name} — ${translate(locale, item === 'freehand' ? 'freehand.help' : isDrawing(item) ? 'diagram.linkHelp' : item === 'select' ? 'diagram.selectHelp' : item === 'pan' ? 'diagram.panHelp' : 'diagram.toolHelp')}`}
                  aria-label={name}
                  aria-pressed={tool === item}
                  tabIndex={focusTool === item ? 0 : -1}
                  disabled={
                    !writable && (isShapeKind(item) || item === 'freehand')
                  }
                  onClick={() => activate(item)}
                >
                  <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path
                      d={path}
                      transform={
                        isShapeKind(item) && !isDrawing(item) && item !== 'text'
                          ? 'translate(3 5)'
                          : undefined
                      }
                    />
                    {item === 'arrow' && <path d={'M 22 10 L 29 16 L 22 22'} />}
                  </svg>
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="button palette-page-button"
            aria-label={t('palette.nextPage')}
            title={t('palette.nextPage')}
            disabled={currentPage + 1 >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            {'›'}
          </button>
        </div>
        <p className="palette-page-status" role="status">
          {translate(locale, 'palette.pageStatus' as MessageKey, {
            start: matches.length ? pageStart + 1 : 0,
            end: Math.min(pageStart + pageSize, matches.length),
            count: matches.length,
          })}
        </p>
      </div>
      {connectionTools && (
        <div
          role="tabpanel"
          id={`${ribbonId}-connections-panel`}
          aria-labelledby={`${ribbonId}-connections-tab`}
          hidden={mode !== 'connections'}
        >
          {connectionTools(connectionQuery, connectionActions)}
        </div>
      )}
      {mode === 'shapes' && !matches.length && (
        <p className="element-empty">
          {t(categories.length ? 'palette.empty' : 'palette.noCategories')}
        </p>
      )}
      {storageFailed && (
        <p className="element-empty" role="status">
          {t('palette.rememberFailed')}
        </p>
      )}
      {browser && (
        <BrowseElements
          locale={locale}
          tools={
            browser === 'catalog' ? catalogTools : filtered(categories, '')
          }
          initialQuery={browser === 'catalog' ? '' : query}
          fullCatalog={browser === 'catalog'}
          active={tool}
          writable={writable}
          onCancel={() => setBrowser(null)}
          onChoose={(kind) => {
            const index = matches.indexOf(kind);
            if (index >= 0) setPage(Math.floor(index / pageSize));
            activate(kind);
            setBrowser(null);
            if (browser === 'catalog') {
              setMode('shapes');
              requestAnimationFrame(focusCanvas);
            }
          }}
        />
      )}
      {categoriesOpen && (
        <ShapeCategories
          locale={locale}
          selected={categories}
          remember={remember}
          onCancel={() => setCategoriesOpen(false)}
          onApply={(selected, keep) => {
            sessionSelection = [...selected];
            sessionRemember = keep;
            setRemember(keep);
            updateFilters(selected, query);
            setStorageFailed(
              !writeLibrarySelection(
                {
                  setItem: (key, value) => localStorage.setItem(key, value),
                  removeItem: (key) => localStorage.removeItem(key),
                },
                selected,
                keep,
              ),
            );
          }}
        />
      )}
    </div>
  );
}
