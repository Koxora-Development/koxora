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

type Category = 'all' | 'basic' | 'flowchart' | 'symbols' | 'drawing';
const categories: Category[] = [
  'all',
  'basic',
  'flowchart',
  'symbols',
  'drawing',
];
const categoryTools: Record<Exclude<Category, 'all'>, DiagramTool[]> = {
  basic: [
    'rectangle',
    'rounded-rectangle',
    'ellipse',
    'triangle',
    'hexagon',
    'parallelogram',
    'trapezoid',
    'pentagon',
    'octagon',
    'text',
    'container',
  ],
  flowchart: [
    'rectangle',
    'rounded-rectangle',
    'diamond',
    'parallelogram',
    'document',
    'database',
    'predefined-process',
    'trapezoid',
    'chevron',
    'text',
  ],
  symbols: ['cloud', 'note', 'cross'],
  drawing: ['line', 'arrow', 'freehand'],
};
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
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const t = (key: string) => translate(locale, key as MessageKey);
  const filtered = (nextCategory: Category, nextQuery: string) => {
    const entries: DiagramTool[] =
      nextCategory === 'all'
        ? [...shapeKinds, 'freehand']
        : categoryTools[nextCategory];
    const search = normalize(nextQuery.trim());
    return entries.filter(
      (item) =>
        !search ||
        normalize(
          `${t(toolKey(item))} ${translate('en', toolKey(item))} ${item}`,
        ).includes(search),
    );
  };
  const matches = filtered(category, query);
  const tools: DiagramTool[] = ['select', 'pan', ...matches];
  // Menu/shortcut activation can select a tool outside the current category.
  // Keep that explicit choice visible and retain a keyboard entry point.
  if (!tools.includes(tool)) tools.splice(2, 0, tool);
  const focusTool =
    writable || tool === 'select' || tool === 'pan' ? tool : 'select';
  const updateFilters = (nextCategory: Category, nextQuery: string) => {
    setCategory(nextCategory);
    setQuery(nextQuery);
    // A filtered-out insertion tool must never remain armed invisibly.
    if (
      tool !== 'select' &&
      tool !== 'pan' &&
      !filtered(nextCategory, nextQuery).includes(tool)
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
        <label>
          {t('palette.category')}
          <select
            value={category}
            onChange={(event) =>
              updateFilters(event.target.value as Category, query)
            }
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {t(`palette.category.${item}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('palette.search')}
          <input
            type="search"
            value={query}
            onChange={(event) => updateFilters(category, event.target.value)}
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
      {!matches.length && <p className="element-empty">{t('palette.empty')}</p>}
    </div>
  );
}
