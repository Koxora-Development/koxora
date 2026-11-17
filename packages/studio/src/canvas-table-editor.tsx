import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Node } from '@koxora/project';
import {
  changeTableAxis,
  copyTableText,
  pasteTableText,
  normalizeTableSelection,
  tableCellAnchor,
  tableCellBoxes,
  tableCellSpan,
  tableAxisOffsets,
  tableColumnName,
  tableCellRichText,
  setRegionRichText,
  fromPlainText,
  mergeTableCells,
  splitTableCell,
  formatTableSelection,
  evaluateTable,
  groupEdit,
  MAX_TABLE_ROWS,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_CELL_TEXT,
  MAX_TABLE_TEXT,
  type TableTextRegions,
  type Appearance,
  type EditCommand,
  type Camera,
} from '@koxora/editor-core';
import './canvas-table-editor.css';
import { FontPicker, RichTextEditor } from './rich-text-editor';

type Cell = { row: number; column: number };
/** A transient editing surface follows the actual table, without changing its portable geometry. */
export function CanvasTableEditor({
  item,
  value,
  base,
  locale,
  host,
  initialCell,
  onEdit,
  onClose,
  onHistory,
}: {
  item: Node;
  value: TableTextRegions;
  base: Appearance;
  locale: string;
  host: RefObject<HTMLDivElement | null>;
  initialCell: Cell;
  onEdit: (command: EditCommand) => boolean;
  onClose: () => void;
  onHistory: (direction: 'undo' | 'redo') => boolean;
}) {
  const t = (key: string, values: Record<string, string | number> = {}) =>
    translate(locale, key as MessageKey, values);
  const group = useId();
  const closeLatest = useRef(onClose);
  useEffect(() => {
    closeLatest.current = onClose;
  }, [onClose]);
  const toolbar = useRef<HTMLDivElement>(null),
    layer = useRef<HTMLDivElement>(null);
  const [focusRequest, setFocusRequest] = useState<{
    key: number;
    selection: 'all' | 'end';
  }>({ key: 0, selection: 'all' });
  const pendingCellFocus = useRef<Cell | null>(null);
  const input = useRef<HTMLDivElement>(null),
    grid = useRef<HTMLDivElement>(null);
  const [richToolbar, setRichToolbar] = useState<HTMLDivElement | null>(null);
  const [start, setStart] = useState(initialCell),
    [end, setEnd] = useState(initialCell);
  const [typing, setTyping] = useState(true),
    [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<{
    next: TableTextRegions;
    source: string;
  } | null>(null);
  const [view, setView] = useState({
    width: 1,
    height: 1,
    camera: { x: 0, y: 0, zoom: 1 } as Camera,
  });
  const rows = value.cells.length,
    columns = value.cells[0].length;
  const bounded = (p: Cell) => ({
    row: Math.min(rows - 1, Math.max(0, p.row)),
    column: Math.min(columns - 1, Math.max(0, p.column)),
  });
  const active = tableCellAnchor(
      value,
      bounded(start).row,
      bounded(start).column,
    ),
    last = bounded(end);
  const selection = normalizeTableSelection(value, {
    row: Math.min(active.row, last.row),
    column: Math.min(active.column, last.column),
    rowSpan: Math.abs(last.row - active.row) + 1,
    columnSpan: Math.abs(last.column - active.column) + 1,
  });
  const g = item.geometry;
  const cells = tableCellBoxes(value, g.width, g.height);
  const xs = tableAxisOffsets(value.columnWidths, columns, g.width),
    ys = tableAxisOffsets(value.rowHeights, rows, g.height);
  const results = useMemo(() => evaluateTable(value), [value]);
  const current = cells.find(
    (c) => c.row === active.row && c.column === active.column,
  )!;
  const span = tableCellSpan(value, active.row, active.column);
  const activeRich = useMemo(
    () => tableCellRichText(value, active.row, active.column, base.align),
    [value, active.row, active.column, base.align],
  );
  const editorBase = useMemo(
    () =>
      value.headerRow && active.row === 0
        ? { ...base, fontWeight: 700 as const }
        : base,
    [value.headerRow, active.row, base],
  );
  const activeStyle = {
    ...base,
    ...(value.headerRow && active.row === 0
      ? { fontWeight: 700 as const }
      : {}),
    ...activeRich.paragraphs[0]?.runs[0]?.style,
  };
  const selected = (r: number, c: number) =>
    r >= selection.row &&
    r < selection.row + selection.rowSpan &&
    c >= selection.column &&
    c < selection.column + selection.columnSpan;
  const cellName = (p: Cell) => `${tableColumnName(p.column)}${p.row + 1}`;
  const mirror = (box: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => ({
    ...box,
    x: g.flipX ? g.width - box.x - box.width : box.x,
    y: g.flipY ? g.height - box.y - box.height : box.y,
  });
  function apply(next: TableTextRegions, field?: string) {
    const command: EditCommand = {
      type: 'updateNode',
      id: item.id,
      text: String(item.content.text ?? ''),
      style: base,
      textRegions: next,
    };
    const okay = onEdit(
      field ? groupEdit(command, `${group}:${field}`) : command,
    );
    setFailed(!okay);
    return okay;
  }
  function choose(point: Cell, extend = false) {
    const next = tableCellAnchor(
      value,
      bounded(point).row,
      bounded(point).column,
    );
    if (!extend) setStart(next);
    setEnd(next);
    setTyping(false);
    setFailed(false);
  }
  function focusCell(point: Cell) {
    pendingCellFocus.current = point;
  }
  useLayoutEffect(() => {
    const point = pendingCellFocus.current;
    if (!point) return;
    grid.current
      ?.querySelector<HTMLButtonElement>(
        `[data-canvas-cell="${point.row}-${point.column}"]`,
      )
      ?.focus({ preventScroll: true });
    pendingCellFocus.current = null;
  });
  function source(text: string) {
    const old = tableCellRichText(value, active.row, active.column, base.align);
    const rich = fromPlainText(text, old.paragraphs[0]?.align ?? base.align);
    // Source entry retains the selected cell's display style. Mixed styles stay untouched until edited.
    if (rich.paragraphs[0].runs[0])
      rich.paragraphs[0].runs[0].style = {
        ...old.paragraphs[0]?.runs[0]?.style,
      };
    try {
      apply(
        setRegionRichText(value, { type: 'table-cell', ...active }, rich),
        `cell:${active.row}:${active.column}`,
      );
    } catch {
      setFailed(true);
    }
  }
  function structure(next: TableTextRegions) {
    if (
      value.cells.flat().filter(Boolean).length >
      next.cells.flat().filter(Boolean).length
    )
      setPending({ next, source: JSON.stringify(value) });
    else apply(next);
    setTyping(false);
  }
  function axis(axis: 'row' | 'column', action: 'before' | 'after' | 'delete') {
    try {
      const count = axis === 'row' ? selection.rowSpan : selection.columnSpan;
      const at = selection[axis] + (action === 'after' ? count : 0);
      structure(
        changeTableAxis(
          value,
          axis,
          at,
          action === 'delete' ? count : 1,
          action === 'delete' ? 'delete' : 'insert',
        ),
      );
    } catch {
      setFailed(true);
    }
  }
  function move(key: string, extend = false, backwards = false) {
    let point = { ...active };
    if (key === 'Tab') {
      const index = cells.findIndex(
        (c) => c.row === active.row && c.column === active.column,
      );
      const next = cells[index + (backwards ? -1 : 1)];
      if (next) point = next;
      else if (!backwards && rows < MAX_TABLE_ROWS) {
        if (apply(changeTableAxis(value, 'row', rows, 1, 'insert')))
          point = { row: rows, column: 0 };
      }
    } else {
      const origin = extend ? last : active;
      point = { ...origin };
      if (key === 'ArrowRight') point.column += extend ? 1 : span.columnSpan;
      if (key === 'ArrowLeft') point.column--;
      if (key === 'ArrowDown' || key === 'Enter')
        point.row += extend ? 1 : span.rowSpan;
      if (key === 'ArrowUp') point.row--;
      point = extend
        ? bounded(point)
        : tableCellAnchor(value, bounded(point).row, bounded(point).column);
    }
    if (!extend) setStart({ row: point.row, column: point.column });
    setEnd({ row: point.row, column: point.column });
    setTyping(false);
    focusCell(point);
  }
  useEffect(() => {
    const el = host.current!;
    const toolbarElement = toolbar.current,
      layerElement = layer.current;
    const update = () => {
      const box = el.getBoundingClientRect();
      const camera = JSON.parse(
        el.getAttribute('data-camera') ?? '{"x":0,"y":0,"zoom":1}',
      ) as Camera;
      setView({ width: box.width, height: box.height, camera });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, {
      attributes: true,
      attributeFilter: ['data-camera'],
    });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    const outside = (event: PointerEvent) => {
      const target = event.target as globalThis.Node;
      if (
        !toolbar.current?.contains(target) &&
        !layer.current?.contains(target)
      )
        closeLatest.current();
    };
    document.addEventListener('pointerdown', outside, true);
    return () => {
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener('pointerdown', outside, true);
      if (
        toolbarElement?.contains(document.activeElement) ||
        layerElement?.contains(document.activeElement) ||
        document.activeElement === document.body
      )
        el.focus({ preventScroll: true });
    };
  }, [host]);
  function beginTyping(selection: 'all' | 'end' = 'all') {
    setFocusRequest((previous) => ({ key: previous.key + 1, selection }));
    setTyping(true);
  }
  const drag = useRef<{
    axis: 'row' | 'column';
    index: number;
    x: number;
    y: number;
    weights: number[];
    size: number;
    serial: number;
  } | null>(null);
  const serial = useRef(0);
  function resizeBy(
    axis: 'row' | 'column',
    index: number,
    delta: number,
    weights: number[],
    size: number,
    serial: number,
  ) {
    const field = axis === 'row' ? 'rowHeights' : 'columnWidths';
    const sum = weights.reduce((a, b) => a + b, 0),
      pair = weights[index - 1] + weights[index];
    const next = [...weights];
    next[index - 1] = Math.max(
      1,
      Math.min(10000, pair - 1, weights[index - 1] + (delta / size) * sum),
    );
    next[index] = pair - next[index - 1];
    if (next[index] < 1 || next[index] > 10000) return;
    apply({ ...value, [field]: next }, `resize:${serial}`);
  }
  const editorLimit = Math.min(
    MAX_TABLE_CELL_TEXT,
    value.cells[active.row][active.column].length +
      MAX_TABLE_TEXT -
      value.cells.flat().reduce((sum, c) => sum + c.length, 0),
  );
  const key = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (typing) {
        setTyping(false);
        focusCell(active);
      } else onClose();
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      ['z', 'y'].includes(event.key.toLowerCase())
    ) {
      event.preventDefault();
      event.stopPropagation();
      onHistory(
        event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo',
      );
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      onClose();
      return;
    }
    if (
      !target.matches('[role="gridcell"]') &&
      !target.closest('.canvas-cell-input')
    )
      return;
    if (
      event.key === 'Tab' ||
      (event.key === 'Enter' && !event.altKey && !event.shiftKey)
    ) {
      event.preventDefault();
      move(event.key, false, event.shiftKey);
      return;
    }
    if (typing || target.isContentEditable) return;
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      move(event.key, event.shiftKey);
    } else if (event.key === 'F2') {
      event.preventDefault();
      beginTyping();
    } else if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'a'
    ) {
      event.preventDefault();
      setStart({ row: 0, column: 0 });
      setEnd({ row: rows - 1, column: columns - 1 });
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      let next = value;
      for (const c of cells.filter((c) => selected(c.row, c.column)))
        next = setRegionRichText(
          next,
          { type: 'table-cell', row: c.row, column: c.column },
          fromPlainText('', base.align),
        );
      apply(next);
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      source(event.key);
      beginTyping('end');
    }
  };
  const layerContent = (
    <div
      ref={layer}
      className="canvas-table-layer"
      data-direct-table="true"
      onKeyDown={key}
    >
      <div
        ref={grid}
        className="canvas-table-grid"
        role="grid"
        aria-label={t('directTable.grid')}
        aria-rowcount={rows}
        aria-colcount={columns}
        style={{
          left:
            view.width / 2 +
            (g.x + g.width / 2 - view.camera.x) * view.camera.zoom,
          top:
            view.height / 2 +
            (g.y + g.height / 2 - view.camera.y) * view.camera.zoom,
          width: g.width,
          height: g.height,
          transform: `translate(-50%, -50%) rotate(${g.rotation}deg) scale(${view.camera.zoom})`,
        }}
        onCopy={(event) => {
          if (!grid.current?.contains(event.target as globalThis.Node)) return;
          if ((event.target as HTMLElement).closest('.canvas-cell-input'))
            return;
          event.preventDefault();
          const text = copyTableText(value, selection);
          event.clipboardData.setData('text/plain', text);
          if (value.formulas)
            event.clipboardData.setData(
              'application/x-koxora-table',
              JSON.stringify({ version: 1, ...selection, text }),
            );
        }}
        onPaste={(event) => {
          if (!grid.current?.contains(event.target as globalThis.Node)) return;
          if (
            (event.target as HTMLElement).closest('.canvas-cell-input') ||
            !event.clipboardData.types.includes('text/plain')
          )
            return;
          event.preventDefault();
          try {
            const text = event.clipboardData.getData('text/plain');
            let origin: Cell | undefined;
            const raw = event.clipboardData.getData(
              'application/x-koxora-table',
            );
            if (raw && raw.length <= 140000) {
              try {
                const metadata = JSON.parse(raw);
                if (metadata?.version === 1 && metadata.text === text)
                  origin = { row: metadata.row, column: metadata.column };
              } catch {
                /* Optional source metadata. */
              }
            }
            apply(
              pasteTableText(value, active.row, active.column, text, origin),
            );
          } catch {
            setFailed(true);
          }
        }}
      >
        {value.cells.map((_, row) => (
          <div role="row" key={row} aria-rowindex={row + 1}>
            {cells
              .filter((c) => c.row === row)
              .map((c) => (
                <button
                  type="button"
                  role="gridcell"
                  key={c.column}
                  aria-colindex={c.column + 1}
                  aria-rowspan={c.rowSpan}
                  aria-colspan={c.columnSpan}
                  aria-selected={selected(c.row, c.column)}
                  aria-label={`${cellName(c)}: ${results[c.row][c.column]}`}
                  tabIndex={
                    c.row === active.row && c.column === active.column ? 0 : -1
                  }
                  data-canvas-cell={`${c.row}-${c.column}`}
                  style={{
                    ...mirror(c.box),
                    left: mirror(c.box).x,
                    top: mirror(c.box).y,
                  }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    choose(c, e.shiftKey);
                  }}
                  onPointerEnter={(e) => {
                    if (e.buttons === 1) {
                      setEnd({ row: c.row, column: c.column });
                      setTyping(false);
                    }
                  }}
                  onDoubleClick={() => {
                    choose(c);
                    beginTyping();
                  }}
                >
                  <span className="sr-only">{results[c.row][c.column]}</span>
                </button>
              ))}
          </div>
        ))}
        {typing && (
          <div
            ref={input}
            className="canvas-cell-input"
            style={{
              left: mirror(current.box).x + 2,
              top: mirror(current.box).y + 2,
              width: Math.max(1, current.box.width - 4),
              height: Math.max(1, current.box.height - 4),
            }}
            onKeyDownCapture={(e) => {
              if (!input.current?.contains(e.target as globalThis.Node)) return;
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setTyping(false);
                focusCell(active);
              } else if (
                e.key === 'Tab' ||
                (e.key === 'Enter' && !e.altKey && !e.shiftKey)
              ) {
                e.preventDefault();
                e.stopPropagation();
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onClose();
                else move(e.key, false, e.shiftKey);
              }
            }}
          >
            <RichTextEditor
              key={`${active.row}-${active.column}`}
              value={activeRich}
              base={editorBase}
              locale={locale}
              label={t('regions.cellLabel', {
                row: active.row + 1,
                column: active.column + 1,
              })}
              maxLength={editorLimit}
              embedded
              focusRequest={focusRequest}
              toolbarContainer={richToolbar}
              onChange={(rich) => {
                try {
                  apply(
                    setRegionRichText(
                      value,
                      { type: 'table-cell', ...active },
                      rich,
                    ),
                    `cell:${active.row}:${active.column}`,
                  );
                } catch {
                  setFailed(true);
                }
              }}
            />
          </div>
        )}
        <button
          type="button"
          className="canvas-table-corner"
          aria-label={t('regions.selectAll')}
          onClick={() => {
            setStart({ row: 0, column: 0 });
            setEnd({ row: rows - 1, column: columns - 1 });
            setTyping(false);
          }}
        >
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path d="M 10 2 V 10 H 2 Z" fill="currentColor" />
          </svg>
        </button>
        {value.cells[0].map((_, column) => (
          <button
            type="button"
            className="canvas-table-column"
            key={column}
            aria-label={t('regions.selectColumn', { column: column + 1 })}
            style={{
              left: g.flipX ? g.width - xs[column + 1] : xs[column],
              width: xs[column + 1] - xs[column],
            }}
            onClick={() => {
              setStart({ row: 0, column });
              setEnd({ row: rows - 1, column });
              setTyping(false);
            }}
          >
            {tableColumnName(column)}
          </button>
        ))}
        {value.cells.map((_, row) => (
          <button
            type="button"
            className="canvas-table-row"
            key={row}
            aria-label={t('regions.selectRow', { row: row + 1 })}
            style={{
              top: g.flipY ? g.height - ys[row + 1] : ys[row],
              height: ys[row + 1] - ys[row],
            }}
            onClick={() => {
              setStart({ row, column: 0 });
              setEnd({ row, column: columns - 1 });
              setTyping(false);
            }}
          >
            {row + 1}
          </button>
        ))}
        {(['column', 'row'] as const).flatMap((axis) => {
          const weights =
            value[axis === 'row' ? 'rowHeights' : 'columnWidths'] ??
            Array.from({ length: axis === 'row' ? rows : columns }, () => 100);
          return weights.slice(1).map((_, i) => {
            const index = i + 1;
            const position =
              axis === 'column'
                ? g.flipX
                  ? g.width - xs[index]
                  : xs[index]
                : g.flipY
                  ? g.height - ys[index]
                  : ys[index];
            return (
              <div
                key={`${axis}-${index}`}
                role="separator"
                tabIndex={0}
                aria-label={t(
                  axis === 'row'
                    ? 'directTable.resizeRow'
                    : 'directTable.resizeColumn',
                  { index },
                )}
                aria-orientation={axis === 'row' ? 'horizontal' : 'vertical'}
                aria-valuenow={Math.round(weights[index - 1])}
                aria-valuemin={1}
                aria-valuemax={10000}
                className={`canvas-table-resize ${axis}`}
                style={
                  axis === 'column'
                    ? { left: position - 3, height: 22, top: -22 }
                    : { top: position - 3, width: 26, left: -26 }
                }
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  setTyping(false);
                  drag.current = {
                    axis,
                    index,
                    x: e.clientX,
                    y: e.clientY,
                    weights: [...weights],
                    size: axis === 'row' ? g.height : g.width,
                    serial: ++serial.current,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  const d = drag.current;
                  if (!d) return;
                  const angle = (g.rotation * Math.PI) / 180,
                    dx = e.clientX - d.x,
                    dy = e.clientY - d.y;
                  const delta =
                    ((d.axis === 'column'
                      ? dx * Math.cos(angle) + dy * Math.sin(angle)
                      : -dx * Math.sin(angle) + dy * Math.cos(angle)) /
                      view.camera.zoom) *
                    ((d.axis === 'column' && g.flipX) ||
                    (d.axis === 'row' && g.flipY)
                      ? -1
                      : 1);
                  resizeBy(d.axis, d.index, delta, d.weights, d.size, d.serial);
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onLostPointerCapture={() => {
                  drag.current = null;
                }}
                onKeyDown={(e) => {
                  const plus = axis === 'column' ? 'ArrowRight' : 'ArrowDown',
                    minus = axis === 'column' ? 'ArrowLeft' : 'ArrowUp';
                  if (e.key !== plus && e.key !== minus) return;
                  e.preventDefault();
                  e.stopPropagation();
                  resizeBy(
                    axis,
                    index,
                    (e.key === plus ? 1 : -1) * (e.shiftKey ? 10 : 1),
                    weights,
                    axis === 'row' ? g.height : g.width,
                    ++serial.current,
                  );
                }}
              />
            );
          });
        })}
      </div>
    </div>
  );
  return (
    <>
      <div
        ref={toolbar}
        className="canvas-table-toolbar"
        data-direct-table="true"
        onKeyDown={key}
      >
        <div role="toolbar" aria-label={t('directTable.tools')}>
          <strong>{t('directTable.title')}</strong>
          <span className="canvas-table-address">{cellName(active)}</span>
          <button
            type="button"
            className="button compact"
            onClick={() => {
              beginTyping();
            }}
          >
            {t('directTable.editCell')}
          </button>
          <details>
            <summary>{t('regions.rowColumnActions')}</summary>
            <div className="canvas-table-actions">
              {(['row', 'column'] as const).flatMap((a) =>
                (['before', 'after', 'delete'] as const).map((action) => (
                  <button
                    type="button"
                    className="button compact"
                    key={`${a}-${action}`}
                    disabled={
                      action === 'delete'
                        ? a === 'row'
                          ? selection.rowSpan === rows
                          : selection.columnSpan === columns
                        : a === 'row'
                          ? rows >= MAX_TABLE_ROWS
                          : columns >= MAX_TABLE_COLUMNS
                    }
                    onClick={() => axis(a, action)}
                  >
                    {t(`regions.${a}.${action}`)}
                  </button>
                )),
              )}
            </div>
          </details>
          <button
            type="button"
            className="button compact"
            disabled={selection.rowSpan * selection.columnSpan < 2}
            onClick={() => {
              try {
                const next = mergeTableCells(value, selection, base.align);
                if (apply(next)) {
                  setStart({ row: selection.row, column: selection.column });
                  setEnd({ row: selection.row, column: selection.column });
                  setTyping(false);
                }
              } catch {
                setFailed(true);
              }
            }}
          >
            {t('regions.mergeCells')}
          </button>
          <button
            type="button"
            className="button compact"
            disabled={span.rowSpan * span.columnSpan === 1}
            onClick={() => {
              apply(splitTableCell(value, active.row, active.column));
              setEnd(active);
              setTyping(false);
            }}
          >
            {t('regions.splitCell')}
          </button>
          {!typing && (
            <FontPicker
              locale={locale}
              value={activeStyle.fontFamily}
              onChange={(font) => {
                let next = formatTableSelection(value, selection, {
                  fontFamily: font,
                });
                // Empty paragraphs need a portable style seed for later typing.
                for (const cell of cells.filter((c) =>
                  selected(c.row, c.column),
                )) {
                  const rich = tableCellRichText(
                    next,
                    cell.row,
                    cell.column,
                    base.align,
                  );
                  let changed = false;
                  for (const paragraph of rich.paragraphs)
                    if (!paragraph.runs.length) {
                      paragraph.runs.push({
                        text: '',
                        style: { fontFamily: font },
                      });
                      changed = true;
                    }
                  if (changed)
                    next = setRegionRichText(
                      next,
                      {
                        type: 'table-cell',
                        row: cell.row,
                        column: cell.column,
                      },
                      rich,
                    );
                }
                apply(next);
              }}
            />
          )}
          {!typing &&
            (['bold', 'italic', 'underline'] as const).map((kind) => {
              const enabled =
                kind === 'bold'
                  ? activeStyle.fontWeight === 700
                  : kind === 'italic'
                    ? activeStyle.fontStyle === 'italic'
                    : activeStyle.textDecoration === 'underline';
              return (
                <button
                  type="button"
                  className="button compact"
                  key={kind}
                  aria-label={t(`text.${kind}`)}
                  aria-pressed={enabled}
                  onClick={() =>
                    apply(
                      formatTableSelection(
                        value,
                        selection,
                        kind === 'bold'
                          ? { fontWeight: enabled ? 400 : 700 }
                          : kind === 'italic'
                            ? { fontStyle: enabled ? 'normal' : 'italic' }
                            : {
                                textDecoration: enabled ? 'none' : 'underline',
                              },
                      ),
                    )
                  }
                >
                  {kind === 'bold' ? (
                    <b>B</b>
                  ) : kind === 'italic' ? (
                    <i>I</i>
                  ) : (
                    <u>U</u>
                  )}
                </button>
              );
            })}
          <label hidden={typing}>
            {t('diagram.fontSize')}
            <input
              type="number"
              min={6}
              max={144}
              value={activeStyle.fontSize}
              onChange={(e) => {
                const size = e.target.valueAsNumber;
                if (Number.isFinite(size) && size >= 6 && size <= 144)
                  apply(
                    formatTableSelection(value, selection, { fontSize: size }),
                    'fontSize',
                  );
              }}
            />
          </label>
          <select
            hidden={typing}
            aria-label={t('diagram.align')}
            value={
              tableCellRichText(value, active.row, active.column, base.align)
                .paragraphs[0]?.align ?? base.align
            }
            onChange={(e) =>
              apply(
                formatTableSelection(value, selection, {
                  align: e.target.value as Appearance['align'],
                }),
              )
            }
          >
            {(['left', 'center', 'right'] as const).map((a) => (
              <option key={a} value={a}>
                {t(`align.${a}`)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button compact"
            onClick={() => onHistory('undo')}
          >
            {t('rich.undo')}
          </button>
          <button type="button" className="button compact" onClick={onClose}>
            {t('directTable.finish')}
          </button>
        </div>
        <div ref={setRichToolbar} className="canvas-table-rich-toolbar" />
        <div className="canvas-table-source">
          <label>
            {t('table.source', { cell: cellName(active) })}
            <textarea
              rows={1}
              aria-label={t('table.source', { cell: cellName(active) })}
              value={value.cells[active.row][active.column]}
              maxLength={editorLimit}
              onChange={(e) => source(e.currentTarget.value)}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value.formulas ?? false}
              onChange={(e) =>
                apply({ ...value, formulas: e.currentTarget.checked })
              }
            />
            {t('table.calculate')}
          </label>
          {value.formulas && (
            <output>
              {t('table.result', { value: results[active.row][active.column] })}
            </output>
          )}
        </div>
        <details className="canvas-table-help">
          <summary>{t('controls.help')}</summary>
          <p className="field-help">{t('directTable.help')}</p>
        </details>
        {failed && <p role="alert">{t('diagram.error.invalid')}</p>}
        {pending && (
          <div role="alertdialog" aria-label={t('directTable.confirmDelete')}>
            <p>{t('directTable.deleteHelp')}</p>
            <button
              type="button"
              className="button"
              onClick={() => {
                if (pending.source === JSON.stringify(value))
                  apply(pending.next);
                else setFailed(true);
                setPending(null);
              }}
            >
              {t('directTable.confirmDelete')}
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setPending(null)}
            >
              {t('project.cancel')}
            </button>
          </div>
        )}
      </div>
      {host.current && createPortal(layerContent, host.current)}
    </>
  );
}
