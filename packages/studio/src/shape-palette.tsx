import { useState } from 'react';
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
  quickElementKinds,
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
  const matches = filtered(categories, query);
  const tools: DiagramTool[] = ['select', 'pan', ...quickElementKinds(matches)];
  // Menu/shortcut activation can select a tool outside the current category.
  // Keep that explicit choice visible and retain a keyboard entry point.
  if (!tools.includes(tool)) tools.splice(2, 0, tool);
  const focusTool =
    writable || tool === 'select' || tool === 'pan' ? tool : 'select';
  const updateFilters = (
    nextCategories: LibraryCategory[],
    nextQuery: string,
  ) => {
    setCategories(nextCategories);
    setQuery(nextQuery);
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
        <span className="element-results" role="status">
          {translate(locale, 'palette.results' as MessageKey, {
            count: matches.length,
          })}
        </span>
      </div>
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
              title={`${name} — ${translate(locale, item === 'freehand' ? 'freehand.help' : isDrawing(item) ? 'diagram.linkHelp' : item === 'select' ? 'diagram.selectHelp' : item === 'pan' ? 'diagram.panHelp' : 'diagram.toolHelp')}`}
              aria-label={name}
              aria-pressed={tool === item}
              tabIndex={focusTool === item ? 0 : -1}
              disabled={!writable && (isShapeKind(item) || item === 'freehand')}
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
            setCategoriesOpen(false);
          }}
        />
      )}
    </div>
  );
}
