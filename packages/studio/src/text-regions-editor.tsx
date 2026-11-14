import { useId, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import { Dialog } from '@koxora/ui';
import {
  MAX_REGION_TITLE,
  MAX_TABLE_ROWS,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_CELL_TEXT,
  MAX_TABLE_TEXT,
  type TextRegions,
  type TableTextRegions,
} from '@koxora/editor-core';
import './text-regions-editor.css';

interface Props {
  value: TextRegions;
  locale: string;
  onChange: (value: TextRegions) => void;
}

/** Structured regions are controlled drafts; applying the enclosing form commits them. */
export function TextRegionsEditor({ value, locale, onChange }: Props) {
  if (value.type === 'container')
    return (
      <label className="text-region-title">
        {translate(locale, 'regions.containerTitle' as MessageKey)}
        <input
          type="text"
          value={value.title}
          maxLength={MAX_REGION_TITLE}
          onChange={(event) =>
            onChange({ ...value, title: event.currentTarget.value })
          }
        />
      </label>
    );
  return <TableTextEditor value={value} locale={locale} onChange={onChange} />;
}

function TableTextEditor({
  value,
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
  const caption = useId();
  const rows = value.cells.length;
  const columns = value.cells[0].length;
  const characters = value.cells.reduce(
    (total, row) => total + row.reduce((sum, cell) => sum + cell.length, 0),
    0,
  );

  function resize(nextRows: number, nextColumns: number) {
    onChange({
      ...value,
      cells: Array.from({ length: nextRows }, (_, row) =>
        Array.from(
          { length: nextColumns },
          (_, column) => value.cells[row]?.[column] ?? '',
        ),
      ),
    });
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

  function updateCell(row: number, column: number, text: string) {
    onChange({
      ...value,
      cells: value.cells.map((cells, rowIndex) =>
        rowIndex === row
          ? cells.map((cell, columnIndex) =>
              columnIndex === column ? text : cell,
            )
          : cells,
      ),
    });
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
                {cells.map((cell, column) => {
                  const Cell = value.headerRow && row === 0 ? 'th' : 'td';
                  return (
                    <Cell
                      key={column}
                      scope={Cell === 'th' ? 'col' : undefined}
                      className={
                        Cell === 'th' ? 'table-header-cell' : undefined
                      }
                    >
                      <textarea
                        rows={2}
                        aria-label={t('regions.cellLabel', {
                          row: row + 1,
                          column: column + 1,
                        })}
                        value={cell}
                        maxLength={Math.min(
                          MAX_TABLE_CELL_TEXT,
                          cell.length + MAX_TABLE_TEXT - characters,
                        )}
                        onChange={(event) =>
                          updateCell(row, column, event.currentTarget.value)
                        }
                      />
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
