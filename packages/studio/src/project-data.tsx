import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import {
  createDelimitedDataset,
  DelimitedDataError,
  describeDelimited,
  MAX_DELIMITED_BYTES,
  parseDelimited,
  type DatasetCellEdit,
  type DelimitedSheet,
  type Delimiter,
  type EditableType,
} from '@koxora/editor-core';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Dataset, Field, Json } from '@koxora/project';
import { Dialog } from '@koxora/ui';
import { DatasetCellEditor } from './dataset-cell-editor';
import './project-data.css';

const typeOptions = ['string', 'number', 'boolean', 'date'] as const;
const delimiterOptions = [
  ['auto', 'data.delimiter.auto'],
  [',', 'data.delimiter.comma'],
  [';', 'data.delimiter.semicolon'],
  ['\t', 'data.delimiter.tab'],
] as const;
const rowsPerPage = 25;
const columnsPerPage = 16;

type Issue = {
  key: MessageKey;
  row?: number;
  column?: number;
};

type CellPosition = { row: number; column: number };

function importIssue(error: unknown): Issue {
  return error instanceof DelimitedDataError
    ? { key: `data.error.${error.code}`, row: error.row, column: error.column }
    : { key: 'data.error.project' };
}

function displayCell(value: Json | undefined): string {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > 2048 ? `${text.slice(0, 2048)}…` : text;
}

function DatasetTable({
  locale,
  columns,
  rowCount,
  cell,
  onTypeChange,
  editing,
  busy = false,
}: {
  locale: string;
  columns: readonly Pick<Field, 'name' | 'type'>[];
  rowCount: number;
  cell: (row: number, column: number) => Json | undefined;
  onTypeChange?: (column: number, type: EditableType) => void;
  editing?: {
    fields: readonly Field[];
    cancelButton: RefObject<HTMLButtonElement | null>;
    onSave: (
      row: number,
      fieldId: string,
      value: DatasetCellEdit['value'],
    ) => Promise<MessageKey | null>;
  };
  busy?: boolean;
}) {
  const [rowPage, setRowPage] = useState(0);
  const [columnPage, setColumnPage] = useState(0);
  const [cursor, setCursor] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const tableBody = useRef<HTMLTableSectionElement>(null);
  const restoreFocus = useRef<CellPosition | null>(null);
  const helpId = useId();
  const t = (key: MessageKey, values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const rowStart = rowPage * rowsPerPage;
  const rowEnd = Math.min(rowStart + rowsPerPage, rowCount);
  const columnStart = columnPage * columnsPerPage;
  const columnEnd = Math.min(columnStart + columnsPerPage, columns.length);
  const visibleColumns = columns.slice(columnStart, columnEnd);
  const editableColumns = editing
    ? visibleColumns.flatMap(({ type }, index) =>
        type === 'json' ? [] : [columnStart + index],
      )
    : [];
  const tabStop =
    cursor &&
    cursor.row >= rowStart &&
    cursor.row < rowEnd &&
    editableColumns.includes(cursor.column)
      ? cursor
      : { row: rowStart, column: editableColumns[0] };
  const hasEditableCells = rowCount > 0 && editableColumns.length > 0;
  const editingField = editingCell && editing?.fields[editingCell.column];
  const navigationDisabled = busy || !!editingCell;

  function focusCell({ row, column }: CellPosition) {
    tableBody.current
      ?.querySelector<HTMLTableCellElement>(
        `[data-edit-row="${row}"][data-edit-column="${column}"]`,
      )
      ?.focus();
  }

  useLayoutEffect(() => {
    if (busy || editingCell || !restoreFocus.current) return;
    focusCell(restoreFocus.current);
    restoreFocus.current = null;
  }, [busy, editingCell]);

  function finishEditing() {
    restoreFocus.current = editingCell;
    setEditingCell(null);
  }

  function startEditing(position: CellPosition) {
    if (navigationDisabled) return;
    setCursor(position);
    setEditingCell(position);
  }

  function onCellKeyDown(
    event: KeyboardEvent<HTMLTableCellElement>,
    row: number,
    column: number,
  ) {
    if (navigationDisabled || event.altKey || event.ctrlKey || event.metaKey)
      return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startEditing({ row, column });
      return;
    }
    const index = editableColumns.indexOf(column);
    let target: CellPosition;
    switch (event.key) {
      case 'ArrowLeft':
        target = { row, column: editableColumns[Math.max(index - 1, 0)] };
        break;
      case 'ArrowRight':
        target = {
          row,
          column:
            editableColumns[Math.min(index + 1, editableColumns.length - 1)],
        };
        break;
      case 'ArrowUp':
        target = { row: Math.max(row - 1, rowStart), column };
        break;
      case 'ArrowDown':
        target = { row: Math.min(row + 1, rowEnd - 1), column };
        break;
      default:
        return;
    }
    event.preventDefault();
    focusCell(target);
  }

  return (
    <div className="project-data-preview">
      <p className="project-data-meta" role="status">
        {t('data.summary', { rows: rowCount, columns: columns.length })}
      </p>
      {hasEditableCells && (
        <p id={helpId} className="project-data-meta">
          {t('data.cellHelp')}
        </p>
      )}
      {!!columns.length && (
        <div
          className="project-data-table-scroll"
          tabIndex={hasEditableCells ? -1 : 0}
          role="region"
          aria-label={t('data.preview')}
        >
          <table
            aria-label={t('data.preview')}
            aria-describedby={hasEditableCells ? helpId : undefined}
          >
            <thead>
              <tr>
                {visibleColumns.map((column, index) => (
                  <th key={columnStart + index} scope="col">
                    <span title={column.name}>{column.name}</span>
                    {onTypeChange ? (
                      <select
                        aria-label={t('data.columnType', { name: column.name })}
                        value={column.type}
                        disabled={busy}
                        onChange={(event) =>
                          onTypeChange(
                            columnStart + index,
                            event.currentTarget.value as EditableType,
                          )
                        }
                      >
                        {typeOptions.map((type) => (
                          <option key={type} value={type}>
                            {t(`data.type.${type}`)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <small>{t(`data.type.${column.type}`)}</small>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={tableBody}>
              {Array.from({ length: rowEnd - rowStart }, (_, offset) => {
                const row = rowStart + offset;
                return (
                  <tr key={row}>
                    {visibleColumns.map((_, index) => {
                      const column = columnStart + index;
                      const value = cell(row, column);
                      const content =
                        editing && value === null ? (
                          <span className="project-data-null">
                            {t('data.cellNull')}
                          </span>
                        ) : (
                          displayCell(value)
                        );
                      if (!editableColumns.includes(column))
                        return <td key={column}>{content}</td>;
                      return (
                        <td
                          key={column}
                          data-edit-row={row}
                          data-edit-column={column}
                          data-editing={
                            editingCell?.row === row &&
                            editingCell.column === column
                              ? true
                              : undefined
                          }
                          tabIndex={
                            !navigationDisabled &&
                            row === tabStop.row &&
                            column === tabStop.column
                              ? 0
                              : -1
                          }
                          onFocus={() => {
                            if (!navigationDisabled) setCursor({ row, column });
                          }}
                          onClick={() => startEditing({ row, column })}
                          onKeyDown={(event) =>
                            onCellKeyDown(event, row, column)
                          }
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && editingCell && editingField && (
        <DatasetCellEditor
          locale={locale}
          rowIndex={editingCell.row}
          field={editingField}
          value={cell(editingCell.row, editingCell.column)}
          busy={busy}
          cancelButton={editing.cancelButton}
          onCancel={finishEditing}
          onSave={async (value) => {
            const failure = await editing.onSave(
              editingCell.row,
              editingField.id,
              value,
            );
            if (!failure) finishEditing();
            return failure;
          }}
        />
      )}
      {!rowCount && <p className="project-data-meta">{t('data.noRows')}</p>}
      {rowCount > rowsPerPage && (
        <nav className="project-data-pages" aria-label={t('data.rowPages')}>
          <button
            type="button"
            className="button"
            disabled={navigationDisabled || !rowPage}
            onClick={() => setRowPage(rowPage - 1)}
          >
            {t('data.previousRows')}
          </button>
          <span role="status">
            {t('data.rowRange', { first: rowStart + 1, last: rowEnd })}
          </span>
          <button
            type="button"
            className="button"
            disabled={navigationDisabled || rowEnd === rowCount}
            onClick={() => setRowPage(rowPage + 1)}
          >
            {t('data.nextRows')}
          </button>
        </nav>
      )}
      {columns.length > columnsPerPage && (
        <nav className="project-data-pages" aria-label={t('data.columnPages')}>
          <button
            type="button"
            className="button"
            disabled={navigationDisabled || !columnPage}
            onClick={() => setColumnPage(columnPage - 1)}
          >
            {t('data.previousColumns')}
          </button>
          <span role="status">
            {t('data.columnRange', { first: columnStart + 1, last: columnEnd })}
          </span>
          <button
            type="button"
            className="button"
            disabled={navigationDisabled || columnEnd === columns.length}
            onClick={() => setColumnPage(columnPage + 1)}
          >
            {t('data.nextColumns')}
          </button>
        </nav>
      )}
    </div>
  );
}

export function ProjectData({
  locale,
  datasets,
  onAdd,
  onRemove,
  onEditCell,
  onClose,
}: {
  locale: string;
  datasets: readonly Dataset[];
  onAdd: (dataset: Dataset) => Promise<MessageKey | null>;
  onRemove: (id: string) => Promise<MessageKey | null>;
  onEditCell: (change: DatasetCellEdit) => Promise<MessageKey | null>;
  onClose: () => void;
}) {
  const t = (key: MessageKey, values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const [mode, setMode] = useState<'saved' | 'import'>(
    datasets.length ? 'saved' : 'import',
  );
  const [selectedId, setSelectedId] = useState(datasets[0]?.id ?? '');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [source, setSource] = useState<{
    generation: number;
    name: string;
    bytes: Uint8Array;
  } | null>(null);
  const [delimiter, setDelimiter] = useState<Delimiter | 'auto'>('auto');
  const [header, setHeader] = useState(true);
  const [title, setTitle] = useState('');
  const [overrides, setOverrides] = useState<
    Partial<Record<number, EditableType>>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issue, setIssue] = useState<Issue | null>(null);
  const request = useRef(0);
  const filePicker = useRef<HTMLInputElement>(null);
  const transaction = useRef(false);
  const cancelCellEdit = useRef<HTMLButtonElement>(null);
  const nextFocus = useRef<'saved' | 'remove' | null>(null);
  const savedTab = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const cancelRemove = useRef<HTMLButtonElement>(null);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  useLayoutEffect(() => {
    if (saving) return;
    if (nextFocus.current === 'saved') savedTab.current?.focus();
    else if (nextFocus.current === 'remove') removeButton.current?.focus();
    else if (removeId) cancelRemove.current?.focus();
    nextFocus.current = null;
  }, [removeId, saving]);

  const selected =
    datasets.find((dataset) => dataset.id === selectedId) ?? datasets[0];
  const parsed = useMemo<{
    sheet: DelimitedSheet | null;
    issue: Issue | null;
  }>(() => {
    if (!source) return { sheet: null, issue: null };
    try {
      return {
        sheet: parseDelimited(
          source.bytes,
          delimiter === 'auto' ? undefined : delimiter,
        ),
        issue: null,
      };
    } catch (error) {
      return { sheet: null, issue: importIssue(error) };
    }
  }, [source, delimiter]);
  const { preview, previewIssue } = useMemo(() => {
    if (!parsed.sheet) return { preview: null, previewIssue: null };
    try {
      return {
        preview: describeDelimited(parsed.sheet, header, (index) =>
          translate(locale, 'data.columnName', { index: index + 1 }),
        ),
        previewIssue: null,
      };
    } catch (error) {
      return { preview: null, previewIssue: importIssue(error) };
    }
  }, [parsed.sheet, header, locale]);
  const displayedIssue =
    mode === 'import' ? (issue ?? parsed.issue ?? previewIssue) : issue;

  function switchMode(next: typeof mode) {
    setMode(next);
    setIssue(null);
    setRemoveId(null);
  }

  function resetMapping() {
    setOverrides({});
    setIssue(null);
  }

  async function readFile(file: File) {
    const generation = ++request.current;
    setSource(null);
    setLoading(false);
    setDelimiter('auto');
    setHeader(true);
    resetMapping();
    setTitle(file.name.replace(/\.(csv|tsv|tab)$/i, '').trim());
    if (file.size > MAX_DELIMITED_BYTES) {
      setIssue({ key: 'data.error.limit' });
      return;
    }
    setLoading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (generation === request.current)
        setSource({ generation, name: file.name, bytes });
    } catch {
      if (generation === request.current) setIssue({ key: 'data.error.read' });
    } finally {
      if (generation === request.current) setLoading(false);
    }
  }

  async function changeDataset(
    update: () => Promise<MessageKey | null>,
    showIssue = true,
  ): Promise<MessageKey | null> {
    if (transaction.current) return 'data.error.project';
    transaction.current = true;
    setSaving(true);
    setIssue(null);
    try {
      const failure = await update();
      if (failure && showIssue) setIssue({ key: failure });
      return failure;
    } catch (error) {
      const failure = importIssue(error);
      if (showIssue) setIssue(failure);
      return failure.key;
    } finally {
      transaction.current = false;
      setSaving(false);
    }
  }

  function addDataset() {
    const { sheet } = parsed;
    if (!sheet || !preview?.rows.length) return;
    void changeDataset(async () => {
      const dataset = createDelimitedDataset(sheet, {
        title: title.trim(),
        header,
        types: preview.fields.map(
          (column, index) => overrides[index] ?? column.type,
        ),
        fallbackName: (index) => t('data.columnName', { index: index + 1 }),
        makeId: () => crypto.randomUUID(),
      });
      const failure = await onAdd(dataset);
      if (failure) return failure;
      nextFocus.current = 'saved';
      setSelectedId(dataset.id);
      setSource(null);
      switchMode('saved');
      return null;
    });
  }

  function close() {
    if (!transaction.current) onClose();
  }

  function cancelDialog() {
    if (transaction.current) return;
    if (cancelCellEdit.current) cancelCellEdit.current.click();
    else close();
  }

  return (
    <Dialog
      title={t('data.title')}
      onCancel={cancelDialog}
      className="project-data-dialog"
    >
      <div
        className="project-data-switch"
        role="group"
        aria-label={t('data.title')}
      >
        <button
          type="button"
          ref={savedTab}
          className="button"
          aria-pressed={mode === 'saved'}
          disabled={saving}
          onClick={() => switchMode('saved')}
        >
          {t('data.saved')}
        </button>
        <button
          type="button"
          className="button"
          aria-pressed={mode === 'import'}
          disabled={saving}
          onClick={() => switchMode('import')}
        >
          {t('data.newImport')}
        </button>
      </div>
      <div className="project-data-body" aria-busy={saving}>
        {mode === 'import' ? (
          <>
            <div className="project-data-field project-data-file">
              <span>{t('data.file')}</span>
              <button
                type="button"
                className="button"
                disabled={saving}
                onClick={() => filePicker.current?.click()}
              >
                {t('data.chooseFile')}
              </button>
              <input
                type="file"
                ref={filePicker}
                hidden
                aria-label={t('data.file')}
                accept=".csv,.tsv,.tab,text/csv,text/tab-separated-values"
                disabled={saving}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  if (file) void readFile(file);
                }}
              />
            </div>
            {loading && (
              <p role="status" className="project-data-meta">
                {t('data.reading')}
              </p>
            )}
            {source && (
              <>
                <p className="project-data-meta">
                  {parsed.sheet
                    ? t('data.source', {
                        name: source.name,
                        encoding: parsed.sheet.encoding.toUpperCase(),
                      })
                    : source.name}
                </p>
                <div className="project-data-fields">
                  <label className="project-data-field">
                    {t('data.name')}
                    <input
                      type="text"
                      value={title}
                      disabled={saving}
                      onChange={(event) => {
                        setTitle(event.currentTarget.value);
                        setIssue(null);
                      }}
                    />
                  </label>
                  <label className="project-data-field">
                    {t('data.delimiter')}
                    <select
                      value={delimiter}
                      disabled={saving}
                      onChange={(event) => {
                        setDelimiter(
                          event.currentTarget.value as Delimiter | 'auto',
                        );
                        resetMapping();
                      }}
                    >
                      {delimiterOptions.map(([id, label]) => (
                        <option key={id} value={id}>
                          {id === 'auto' && parsed.sheet && delimiter === 'auto'
                            ? t('data.delimiter.detected', {
                                delimiter: t(
                                  delimiterOptions.find(
                                    ([value]) =>
                                      value === parsed.sheet?.delimiter,
                                  )![1],
                                ),
                              })
                            : t(label)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={header}
                    disabled={saving}
                    onChange={(event) => {
                      setHeader(event.currentTarget.checked);
                      resetMapping();
                    }}
                  />
                  {t('data.header')}
                </label>
              </>
            )}
            {preview && (
              <DatasetTable
                key={`${source?.generation}:${delimiter}:${header}`}
                locale={locale}
                columns={preview.fields.map((field, index) => ({
                  ...field,
                  type: overrides[index] ?? field.type,
                }))}
                rowCount={preview.rows.length}
                cell={(row, column) => preview.rows[row]?.[column]}
                busy={saving}
                onTypeChange={(index, type) => {
                  setOverrides((current) => ({ ...current, [index]: type }));
                  setIssue(null);
                }}
              />
            )}
          </>
        ) : selected ? (
          <>
            <label className="project-data-field">
              {t('data.selected')}
              <select
                value={selected.id}
                disabled={saving}
                onChange={(event) => {
                  setSelectedId(event.currentTarget.value);
                  setRemoveId(null);
                  setIssue(null);
                }}
              >
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.title}
                  </option>
                ))}
              </select>
            </label>
            <DatasetTable
              key={selected.id}
              locale={locale}
              columns={selected.fields}
              rowCount={selected.rows.length}
              cell={(row, column) =>
                selected.rows[row]?.[selected.fields[column].id]
              }
              busy={saving}
              editing={{
                fields: selected.fields,
                cancelButton: cancelCellEdit,
                onSave: (rowIndex, fieldId, value) =>
                  changeDataset(
                    () =>
                      onEditCell({
                        datasetId: selected.id,
                        rowIndex,
                        fieldId,
                        value,
                      }),
                    false,
                  ),
              }}
            />
            <div className="project-data-remove">
              {removeId === selected.id ? (
                <>
                  <p>{t('data.removeQuestion', { title: selected.title })}</p>
                  <button
                    type="button"
                    className="button"
                    ref={cancelRemove}
                    disabled={saving}
                    onClick={() => {
                      nextFocus.current = 'remove';
                      setRemoveId(null);
                      setIssue(null);
                    }}
                  >
                    {t('project.cancel')}
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={saving}
                    onClick={() =>
                      void changeDataset(async () => {
                        const failure = await onRemove(selected.id);
                        if (failure) return failure;
                        nextFocus.current = 'saved';
                        setRemoveId(null);
                        setSelectedId('');
                        return null;
                      })
                    }
                  >
                    {t('data.confirmRemove')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="button"
                  ref={removeButton}
                  disabled={saving}
                  onClick={() => {
                    setRemoveId(selected.id);
                    setIssue(null);
                  }}
                >
                  {t('data.remove')}
                </button>
              )}
            </div>
          </>
        ) : (
          <p>{t('data.noDatasets')}</p>
        )}
      </div>
      {displayedIssue && (
        <p className="error project-data-error" role="alert">
          {t(displayedIssue.key)}{' '}
          {displayedIssue.row !== undefined &&
          displayedIssue.column !== undefined
            ? t('data.error.position', {
                row: displayedIssue.row,
                column: displayedIssue.column,
              })
            : displayedIssue.row !== undefined
              ? t('data.error.row', { row: displayedIssue.row })
              : ''}
        </p>
      )}
      {saving && (
        <p className="project-data-working" role="status">
          {t('project.saving')}
        </p>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="button"
          disabled={saving}
          onClick={close}
        >
          {t('office.close')}
        </button>
        {mode === 'import' && source && (
          <button
            type="button"
            className="button primary"
            disabled={saving || !preview?.rows.length || !title.trim()}
            onClick={addDataset}
          >
            {t('data.import')}
          </button>
        )}
      </div>
    </Dialog>
  );
}
