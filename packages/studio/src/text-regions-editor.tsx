import { useId, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import { Dialog } from '@koxora/ui';
import {
  FONT_FAMILIES,
  fromPlainText,
  plainText,
  tableCellAnchor,
  tableCellSpan,
  tableCellRichText,
  normalizeTableSelection,
  mergeTableCells,
  splitTableCell,
  resizeTable,
  setRegionRichText,
  MAX_REGION_TITLE,
  MAX_TABLE_ROWS,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_CELL_TEXT,
  MAX_TABLE_TEXT,
  type Appearance,
  type RichText,
  type TextRegions,
  type TableTextRegions,
} from '@koxora/editor-core';
import { RichTextEditor } from './rich-text-editor';
import './text-regions-editor.css';

interface Props {
  value: TextRegions;
  base: Appearance;
  locale: string;
  onChange: (value: TextRegions, field?: string) => void;
}
interface CellPosition {
  row: number;
  column: number;
}

/** Region changes flow directly to the live element properties. */
export function TextRegionsEditor({ value, base, locale, onChange }: Props) {
  if (value.type === 'container')
    return (
      <fieldset className="label-editor text-region-title">
        <legend>
          {translate(locale, 'regions.containerTitle' as MessageKey)}
        </legend>
        <RichTextEditor
          value={value.titleRichText ?? fromPlainText(value.title, base.align)}
          base={{ ...base, fontWeight: 700 }}
          locale={locale}
          label={translate(locale, 'regions.containerTitle' as MessageKey)}
          maxLength={MAX_REGION_TITLE}
          onChange={(rich) =>
            onChange(
              setRegionRichText(value, { type: 'container-title' }, rich),
              'container-title',
            )
          }
        />
      </fieldset>
    );
  return (
    <TableTextEditor
      value={value}
      base={base}
      locale={locale}
      onChange={onChange}
    />
  );
}

function CellPreview({ value }: { value: RichText }) {
  return value.paragraphs.map((paragraph, index) => (
    <span
      className="table-cell-paragraph"
      key={index}
      style={{ textAlign: paragraph.align }}
    >
      {paragraph.runs.length
        ? paragraph.runs.map((run, i) => (
            <span
              key={i}
              style={{
                fontFamily: run.style.fontFamily
                  ? FONT_FAMILIES[run.style.fontFamily]
                  : undefined,
                fontSize: run.style.fontSize
                  ? `${run.style.fontSize}px`
                  : undefined,
                fontWeight: run.style.fontWeight,
                fontStyle: run.style.fontStyle,
                textDecoration: run.style.textDecoration,
                color: run.style.textColor?.startsWith('#')
                  ? run.style.textColor
                  : undefined,
              }}
            >
              {run.text}
            </span>
          ))
        : '\u00a0'}
    </span>
  ));
}

function TableTextEditor({
  value,
  base,
  locale,
  onChange,
}: Omit<Props, 'value'> & { value: TableTextRegions }) {
  const t = (key: string, values: Record<string, string | number> = {}) =>
    translate(locale, key as MessageKey, values);
  const [pending, setPending] = useState<{
    rows: number;
    columns: number;
    nonempty: number;
  } | null>(null);
  const [start, setStart] = useState<CellPosition>({ row: 0, column: 0 });
  const [end, setEnd] = useState<CellPosition>({ row: 0, column: 0 });
  const [failure, setFailure] = useState(false);
  const [revision, setRevision] = useState(0);
  const caption = useId();
  const rows = value.cells.length;
  const columns = value.cells[0].length;
  const bounded = (point: CellPosition): CellPosition => ({
    row: Math.min(rows - 1, point.row),
    column: Math.min(columns - 1, point.column),
  });
  const active = tableCellAnchor(
    value,
    bounded(start).row,
    bounded(start).column,
  );
  const last = bounded(end);
  const selection = normalizeTableSelection(value, {
    row: Math.min(active.row, last.row),
    column: Math.min(active.column, last.column),
    rowSpan: Math.abs(last.row - active.row) + 1,
    columnSpan: Math.abs(last.column - active.column) + 1,
  });
  const span = tableCellSpan(value, active.row, active.column);
  const activeText = tableCellRichText(
    value,
    active.row,
    active.column,
    base.align,
  );
  const characters = value.cells.reduce(
    (total, row) => total + row.reduce((sum, cell) => sum + cell.length, 0),
    0,
  );
  const editorLimit = Math.min(
    MAX_TABLE_CELL_TEXT,
    plainText(activeText).length + MAX_TABLE_TEXT - characters,
  );
  const selected = (row: number, column: number) =>
    row >= selection.row &&
    row < selection.row + selection.rowSpan &&
    column >= selection.column &&
    column < selection.column + selection.columnSpan;
  const cellLabel = (row: number, column: number) =>
    t('regions.cellLabel', { row: row + 1, column: column + 1 });

  function choose(row: number, column: number, extend: boolean) {
    const point = tableCellAnchor(value, row, column);
    setFailure(false);
    if (!extend) setStart(point);
    setEnd(point);
  }
  function resize(nextRows: number, nextColumns: number) {
    onChange(resizeTable(value, nextRows, nextColumns));
    setRevision((current) => current + 1);
    setStart((point) => ({
      row: Math.min(point.row, nextRows - 1),
      column: Math.min(point.column, nextColumns - 1),
    }));
    setEnd((point) => ({
      row: Math.min(point.row, nextRows - 1),
      column: Math.min(point.column, nextColumns - 1),
    }));
    setFailure(false);
  }
  function requestResize(nextRows: number, nextColumns: number) {
    if (nextRows === rows && nextColumns === columns) return;
    const nonempty = value.cells.reduce(
      (count, row, rowIndex) =>
        count +
        row.filter(
          (cell, columnIndex) =>
            (rowIndex >= nextRows || columnIndex >= nextColumns) &&
            cell.length > 0,
        ).length,
      0,
    );
    if (nonempty)
      setPending({ rows: nextRows, columns: nextColumns, nonempty });
    else resize(nextRows, nextColumns);
  }
  function merge() {
    try {
      const next = mergeTableCells(value, selection, base.align);
      setStart({ row: selection.row, column: selection.column });
      setEnd({ row: selection.row, column: selection.column });
      setFailure(false);
      setRevision((current) => current + 1);
      onChange(next);
    } catch {
      setFailure(true);
    }
  }
  function split() {
    onChange(splitTableCell(value, active.row, active.column));
    setRevision((current) => current + 1);
    setEnd(active);
    setFailure(false);
  }
  function rangeControl(key: 'start' | 'end', axis: keyof CellPosition) {
    const point = key === 'start' ? bounded(start) : last;
    const count = axis === 'row' ? rows : columns;
    const label = `regions.${key}${axis === 'row' ? 'Row' : 'Column'}`;
    return (
      <label>
        {t(label)}
        <select
          value={point[axis]}
          onChange={(event) => {
            const next = {
              ...point,
              [axis]: Number(event.currentTarget.value),
            };
            (key === 'start' ? setStart : setEnd)(next);
            setFailure(false);
          }}
        >
          {Array.from({ length: count }, (_, index) => (
            <option value={index} key={index}>
              {new Intl.NumberFormat(locale).format(index + 1)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div
      className="text-regions-editor"
      onKeyDown={(event) => {
        // The resize confirmation must resolve before the enclosing form can apply.
        if (
          pending &&
          (event.ctrlKey || event.metaKey) &&
          event.key === 'Enter'
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <fieldset className="table-structure-fields">
        <legend>{t('regions.tableStructure')}</legend>
        <div className="table-dimension-fields">
          <label>
            {t('regions.rows')}
            <select
              value={rows}
              onChange={(event) =>
                requestResize(Number(event.currentTarget.value), columns)
              }
            >
              {Array.from(
                { length: MAX_TABLE_ROWS },
                (_, index) => index + 1,
              ).map((count) => (
                <option value={count} key={count}>
                  {new Intl.NumberFormat(locale).format(count)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('regions.columns')}
            <select
              value={columns}
              onChange={(event) =>
                requestResize(rows, Number(event.currentTarget.value))
              }
            >
              {Array.from(
                { length: MAX_TABLE_COLUMNS },
                (_, index) => index + 1,
              ).map((count) => (
                <option value={count} key={count}>
                  {new Intl.NumberFormat(locale).format(count)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.headerRow}
            onChange={(event) =>
              onChange({ ...value, headerRow: event.currentTarget.checked })
            }
          />
          {t('regions.headerRow')}
        </label>
      </fieldset>
      <p className="field-help">{t('regions.selectionHelp')}</p>
      <div
        className="table-cell-scroll"
        role="region"
        aria-labelledby={caption}
        tabIndex={0}
      >
        <table className="table-cell-editor">
          <caption id={caption}>{t('regions.cellContents')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('regions.rowColumn')}</th>
              {value.cells[0].map((_, column) => (
                <th scope="col" key={column}>
                  {t('regions.columnNumber', { column: column + 1 })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.cells.map((cells, row) => (
              <tr key={row}>
                <th scope="row">{t('regions.rowNumber', { row: row + 1 })}</th>
                {cells.map((_, column) => {
                  const anchor = tableCellAnchor(value, row, column);
                  if (anchor.row !== row || anchor.column !== column)
                    return null;
                  const cellSpan = tableCellSpan(value, row, column);
                  const Cell = value.headerRow && row === 0 ? 'th' : 'td';
                  return (
                    <Cell
                      key={column}
                      rowSpan={cellSpan.rowSpan}
                      colSpan={cellSpan.columnSpan}
                      scope={Cell === 'th' ? 'col' : undefined}
                      className={
                        Cell === 'th' ? 'table-header-cell' : undefined
                      }
                    >
                      <button
                        type="button"
                        className="table-cell-button"
                        data-table-cell={`${row}-${column}`}
                        aria-label={cellLabel(row, column)}
                        aria-pressed={selected(row, column)}
                        onClick={(event) => choose(row, column, event.shiftKey)}
                        onKeyDown={(event) => {
                          const delta =
                            event.key === 'ArrowRight'
                              ? [0, 1]
                              : event.key === 'ArrowLeft'
                                ? [0, -1]
                                : event.key === 'ArrowDown'
                                  ? [1, 0]
                                  : event.key === 'ArrowUp'
                                    ? [-1, 0]
                                    : null;
                          if (!delta) return;
                          event.preventDefault();
                          const nextRow = Math.max(
                            0,
                            Math.min(
                              rows - 1,
                              row +
                                delta[0] *
                                  (delta[0] > 0 ? cellSpan.rowSpan : 1),
                            ),
                          );
                          const nextColumn = Math.max(
                            0,
                            Math.min(
                              columns - 1,
                              column +
                                delta[1] *
                                  (delta[1] > 0 ? cellSpan.columnSpan : 1),
                            ),
                          );
                          const next = tableCellAnchor(
                            value,
                            nextRow,
                            nextColumn,
                          );
                          choose(next.row, next.column, event.shiftKey);
                          event.currentTarget
                            .closest('table')
                            ?.querySelector<HTMLButtonElement>(
                              `[data-table-cell="${next.row}-${next.column}"]`,
                            )
                            ?.focus();
                        }}
                      >
                        <CellPreview
                          value={tableCellRichText(
                            value,
                            row,
                            column,
                            base.align,
                          )}
                        />
                      </button>
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="table-range-controls" data-property-transient>
        <summary>{t('regions.selectionRange')}</summary>
        <div className="table-dimension-fields">
          {rangeControl('start', 'row')}
          {rangeControl('start', 'column')}
        </div>
        <div className="table-dimension-fields">
          {rangeControl('end', 'row')}
          {rangeControl('end', 'column')}
        </div>
      </details>
      <div className="table-merge-actions">
        <button
          className="button"
          type="button"
          disabled={selection.rowSpan === 1 && selection.columnSpan === 1}
          onClick={merge}
        >
          {t('regions.mergeCells')}
        </button>
        <button
          className="button"
          type="button"
          disabled={span.rowSpan === 1 && span.columnSpan === 1}
          onClick={split}
        >
          {t('regions.splitCell')}
        </button>
      </div>
      {failure && <p role="alert">{t('regions.mergeLimit')}</p>}
      <fieldset className="label-editor table-active-cell-editor">
        <legend>
          {t('regions.editCell', {
            row: active.row + 1,
            column: active.column + 1,
          })}
        </legend>
        <RichTextEditor
          key={`${active.row}-${active.column}-${revision}`}
          value={activeText}
          base={{
            ...base,
            fontWeight:
              value.headerRow && active.row === 0 ? 700 : base.fontWeight,
          }}
          locale={locale}
          label={cellLabel(active.row, active.column)}
          maxLength={editorLimit}
          onChange={(rich) =>
            onChange(
              setRegionRichText(
                value,
                { type: 'table-cell', row: active.row, column: active.column },
                rich,
              ),
              `cell:${active.row}:${active.column}`,
            )
          }
        />
      </fieldset>
      {characters >= MAX_TABLE_TEXT && (
        <p className="field-help" role="status">
          {t('regions.tableLimit')}
        </p>
      )}
      {pending && (
        <Dialog
          title={t('regions.resizeTitle')}
          onCancel={() => setPending(null)}
        >
          <p>{t('regions.resizeDescription', { count: pending.nonempty })}</p>
          <div className="dialog-actions">
            <button
              type="button"
              className="button"
              onClick={() => setPending(null)}
            >
              {t('project.cancel')}
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => {
                resize(pending.rows, pending.columns);
                setPending(null);
              }}
            >
              {t('regions.resizeConfirm')}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
