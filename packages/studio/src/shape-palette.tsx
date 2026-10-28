import { translate, type MessageKey } from '@koxora/i18n';
import {
  shapeKinds,
  shapeRegistry,
  isShapeKind,
  isDrawing,
} from '@koxora/editor-core';
import type { DiagramTool } from './diagram-tools';
import { PALETTE_KEYS } from './shortcuts';

/** Shared, compact icon toolbar with roving focus and localized tooltips. */
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
  const tools: DiagramTool[] = ['select', 'pan', ...shapeKinds, 'freehand'];
  const icons = {
    freehand: 'M 3 25 Q 7 5 13 16 T 29 6',
    select: 'M 7 4 L 25 18 L 17 19 L 13 27 Z',
    pan: 'M 16 3 V 29 M 3 16 H 29 M 11 8 L 16 3 L 21 8 M 11 24 L 16 29 L 21 24 M 8 11 L 3 16 L 8 21 M 24 11 L 29 16 L 24 21',
  };
  return (
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
      }}
    >
      {tools.map((item) => {
        const name = translate(
          locale,
          (isShapeKind(item) || item === 'freehand'
            ? `shape.${item}`
            : `diagram.${item}`) as MessageKey,
        );
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
            tabIndex={tool === item ? 0 : -1}
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
  );
}
