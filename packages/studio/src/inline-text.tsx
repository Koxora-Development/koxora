import { useEffect, useId, useRef, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  fromPlainText,
  readRichText,
  resolveAppearance,
  CONNECTION_KEY,
  regionRichText,
  readTextRegions,
  MAX_TABLE_CELL_TEXT,
  MAX_TABLE_TEXT,
  groupEdit,
  type TextRegionTarget,
  type RichText,
  type EditCommand,
} from '@koxora/editor-core';
import type { Connection, Node, Style } from '@koxora/project';
import { RichTextEditor } from './rich-text-editor';
import { TableTextEditor } from './text-regions-editor';
import { useFloatingWindow } from './floating-window';
import './floating-window.css';
export function InlineText({
  item,
  styles,
  locale,
  anchor,
  onApply,
  onCancel,
  region,
}: {
  item: Node | Connection;
  styles: Style[];
  locale: string;
  anchor: { x: number; y: number };
  onApply: (command: EditCommand) => boolean;
  onCancel: () => void;
  region?: TextRegionTarget | null;
}) {
  const t = (k: MessageKey) => translate(locale, k),
    ref = useRef<HTMLDialogElement>(null);
  const moveWindow = useFloatingWindow(ref, anchor);
  const historyGroup = useId();
  const close = useRef(onCancel);
  const failure = useRef(false);
  useEffect(() => {
    close.current = onCancel;
  }, [onCancel]);
  const [base] = useState(() => {
    const appearance = resolveAppearance(
      item,
      styles,
      'kind' in item ? undefined : CONNECTION_KEY,
    );
    const regions = 'kind' in item ? readTextRegions(item as Node) : null;
    return region?.type === 'container-title' ||
      (region?.type === 'table-cell' &&
        region.row === 0 &&
        regions?.type === 'table' &&
        regions.headerRow)
      ? { ...appearance, fontWeight: 700 as const }
      : appearance;
  });
  const [value, setValue] = useState(
    () =>
      (region && 'kind' in item
        ? regionRichText(item as Node, region, base.align)
        : undefined) ??
      readRichText(item) ??
      fromPlainText(
        'kind' in item
          ? String((item as Node).content.text ?? '')
          : String(
              (item.extensions[CONNECTION_KEY] as Record<string, unknown>)
                ?.label ?? '',
            ),
        base.align,
      ),
  );
  const [failed, setFailed] = useState(false);
  const [tableMode, setTableMode] = useState(false);
  useEffect(() => {
    if (tableMode)
      ref.current
        ?.querySelector<HTMLButtonElement>(
          '[data-table-cell][aria-pressed="true"]',
        )
        ?.focus();
  }, [tableMode]);
  const label =
    region?.type === 'container-title'
      ? t('regions.containerTitle')
      : region?.type === 'container-body'
        ? t('regions.containerBody')
        : region?.type === 'table-cell'
          ? translate(locale, 'regions.cellLabel', {
              row: region.row + 1,
              column: region.column + 1,
            })
          : t('diagram.label');
  const regions = 'kind' in item ? readTextRegions(item as Node) : null;
  const maxLength =
    region?.type === 'table-cell' && regions?.type === 'table'
      ? Math.min(
          MAX_TABLE_CELL_TEXT,
          (regions.cells[region.row]?.[region.column]?.length ?? 0) +
            MAX_TABLE_TEXT -
            regions.cells.reduce(
              (total, row) =>
                total + row.reduce((sum, cell) => sum + cell.length, 0),
              0,
            ),
        )
      : 4096;
  useEffect(() => {
    const el = ref.current!;
    el.querySelector<HTMLElement>('[contenteditable]')?.focus();
    const outside = (event: PointerEvent) => {
      if (el.contains(event.target as globalThis.Node)) return;
      if (failure.current) {
        event.preventDefault();
        event.stopPropagation();
        el.querySelector<HTMLElement>('[role="alert"]')?.focus();
      } else close.current();
    };
    const outsideFocus = (event: FocusEvent) => {
      if (el.contains(event.target as globalThis.Node)) return;
      if (failure.current)
        el.querySelector<HTMLElement>('[role="alert"]')?.focus();
      else close.current();
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outsideFocus);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outsideFocus);
    };
  }, []);
  const change = (next: RichText) => {
    setValue(next);
    const accepted = onApply(
      groupEdit(
        region
          ? { type: 'regionText', id: item.id, target: region, value: next }
          : { type: 'richText', id: item.id, value: next },
        historyGroup,
      ),
    );
    failure.current = !accepted;
    setFailed(!accepted);
  };
  return (
    <dialog
      ref={ref}
      className="canvas-text-dialog"
      data-live-editor="true"
      onPointerDown={moveWindow.onPointerDown}
      onPointerMove={moveWindow.onPointerMove}
      onPointerUp={moveWindow.onPointerUp}
      onPointerCancel={moveWindow.onPointerCancel}
      onLostPointerCapture={moveWindow.onLostPointerCapture}
      aria-label={t('rich.inlineTitle')}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          if (!failed) onCancel();
        }
      }}
    >
      <header className="floating-window-header">
        <button
          type="button"
          className="floating-window-handle"
          aria-label={t('window.move')}
          title={t('window.moveHelp')}
          onKeyDown={moveWindow.onKeyDown}
        >
          <span aria-hidden="true">{'⠿'}</span>{' '}
          {tableMode
            ? t('regions.tableStructure')
            : t('window.textTitle' as MessageKey)}
        </button>
        <button
          type="button"
          className="button"
          aria-label={t('office.close')}
          onClick={onCancel}
        >
          ×
        </button>
      </header>
      <p className="floating-window-help">
        {t('window.dragHelp' as MessageKey)}
      </p>
      {!tableMode &&
        region?.type === 'table-cell' &&
        regions?.type === 'table' && (
          <button
            type="button"
            className="button"
            onClick={() => setTableMode(true)}
          >
            {t('regions.editTable')}
          </button>
        )}
      {tableMode && regions?.type === 'table' && 'kind' in item ? (
        <TableTextEditor
          value={regions}
          base={resolveAppearance(item, styles)}
          locale={locale}
          initialCell={region?.type === 'table-cell' ? region : undefined}
          onChange={(textRegions, field) => {
            const command: EditCommand = {
              type: 'updateNode',
              id: item.id,
              text: String((item as Node).content.text ?? ''),
              style: resolveAppearance(item, styles),
              textRegions,
            };
            const accepted = onApply(
              field ? groupEdit(command, `${historyGroup}:${field}`) : command,
            );
            failure.current = !accepted;
            setFailed(!accepted);
          }}
        />
      ) : (
        <RichTextEditor
          value={value}
          base={base}
          locale={locale}
          onChange={change}
          autoFocus
          label={label}
          maxLength={maxLength}
        />
      )}
      {failed && (
        <p role="alert" tabIndex={-1}>
          {t('diagram.error.invalid')}
        </p>
      )}
    </dialog>
  );
}
