import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

/** Categories filter the shared registry; imported kind strings never load assets or code. */
export function ShapePalette({
  locale,
  tool,
  activate,
  writable,
}: {
  locale: string;
  tool: DiagramTool;
  activate: (tool: DiagramTool) => void;
  writable: boolean;
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
  const [browserOpen, setBrowserOpen] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [quickCategory, setQuickCategory] = useState<LibraryCategory | 'all'>(
    'all',
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const strip = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = strip.current!;
    const measure = () => {
      const toolbar = element.querySelector<HTMLElement>('.shape-palette')!;
      const button = toolbar.querySelector<HTMLElement>('.palette-tool');
      const width = button?.getBoundingClientRect().width ?? 27;
      const gap = Number.parseFloat(getComputedStyle(toolbar).columnGap) || 1;
      const padding = getComputedStyle(toolbar);
      const available =
        toolbar.clientWidth -
        Number.parseFloat(padding.paddingLeft) -
        Number.parseFloat(padding.paddingRight);
      // Navigation, the pen and a possibly pinned current tool remain visible.
      setPageSize(
        Math.max(1, Math.min(23, Math.floor(available / (width + gap)) - 4)),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
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
    const entries = [...shapeKinds, 'freehand' as const].filter((kind) =>
      allowed.has(kind),
    );
    const search = normalize(nextQuery.trim());
    return entries.filter(
      (item) =>
        !search ||
        normalize(
          `${t(toolKey(item))} ${translate('en', toolKey(item))} ${item}`,
        ).includes(search),
    );
  };
  const currentCategory = categories.includes(quickCategory as LibraryCategory)
    ? quickCategory
    : 'all';
  const matches = filtered(
    currentCategory === 'all' ? categories : [currentCategory],
    query,
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const wheelPages = useRef({ page: currentPage, count: pageCount });
  const wheelMotion = useRef({
    amount: 0,
    direction: 0,
    lastEvent: 0,
    nextPage: 0,
  });
  useLayoutEffect(() => {
    wheelPages.current = { page: currentPage, count: pageCount };
  }, [currentPage, pageCount]);
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
      setPage(next);
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
  if (!tools.includes(tool)) tools.splice(2, 0, tool);
  // Preserve the pen's established quick/End-key entry point when enabled.
  if (matches.includes('freehand') && !tools.includes('freehand'))
    tools.push('freehand');
  const focusTool =
    writable || tool === 'select' || tool === 'pan' ? tool : 'select';
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
    <div className="element-library">
      <div
        className="element-filters"
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
          onClick={() => setBrowserOpen(true)}
        >
          {t('palette.browseElements')}
        </button>
        <label>
          {t('palette.search')}
          <input
            type="search"
            value={query}
            onChange={(event) => updateFilters(categories, event.target.value)}
          />
        </label>
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
      <div className="palette-strip" ref={strip} title={t('palette.wheelHelp')}>
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
      {!matches.length && (
        <p className="element-empty">
          {t(categories.length ? 'palette.empty' : 'palette.noCategories')}
        </p>
      )}
      {storageFailed && (
        <p className="element-empty" role="status">
          {t('palette.rememberFailed')}
        </p>
      )}
      {browserOpen && (
        <BrowseElements
          locale={locale}
          tools={filtered(categories, '') as LibraryElement[]}
          initialQuery={query}
          active={tool}
          writable={writable}
          onCancel={() => setBrowserOpen(false)}
          onChoose={(kind) => {
            const index = matches.indexOf(kind);
            if (index >= 0) setPage(Math.floor(index / pageSize));
            activate(kind);
            setBrowserOpen(false);
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
