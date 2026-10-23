import { translate, type MessageKey } from '@koxora/i18n';
import {
  shapeKinds,
  shapeRegistry,
  isShapeKind,
  isDrawing,
} from '@koxora/editor-core';
import type { DiagramTool } from './diagram-tools';

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
  const tools: DiagramTool[] = [
    'select',
    'pan',
    ...shapeKinds,
    'connect',
    'edit',
  ];
  const icons = {
    select: 'M 7 4 L 25 18 L 17 19 L 13 27 Z',
    pan: 'M 16 3 V 29 M 3 16 H 29 M 11 8 L 16 3 L 21 8 M 11 24 L 16 29 L 21 24 M 8 11 L 3 16 L 8 21 M 24 11 L 29 16 L 24 21',
    connect: 'M 3 7 H 10 V 25 H 29 M 24 20 L 29 25 L 24 30',
    edit: 'M 6 25 L 8 19 L 23 4 L 28 9 L 13 24 Z M 7 26 H 27',
  };
  return (
    <div
      className="shape-palette"
      role="toolbar"
      aria-label={translate(locale, 'diagram.tools')}
      onKeyDown={(event) => {
        if (
          ![
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
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
      }}
    >
      {tools.map((item) => {
        const name = translate(
          locale,
          (isShapeKind(item)
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
            title={name}
            aria-label={name}
            aria-pressed={tool === item}
            tabIndex={tool === item ? 0 : -1}
            disabled={!writable && (isShapeKind(item) || item === 'connect')}
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
