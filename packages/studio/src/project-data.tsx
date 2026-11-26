import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  chartFields,
  createDelimitedDataset,
  DelimitedDataError,
  describeDelimited,
  MAX_DELIMITED_BYTES,
  parseDelimited,
  type ChartSettings,
  type DelimitedSheet,
  type Delimiter,
  type EditableType,
} from '@koxora/editor-core';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Dataset, Field, Json } from '@koxora/project';
import { Dialog } from '@koxora/ui';
import { ChartSettingsForm } from './chart-settings';
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
  busy = false,
}: {
  locale: string;
  columns: readonly Pick<Field, 'name' | 'type'>[];
  rowCount: number;
  cell: (row: number, column: number) => Json | undefined;
  onTypeChange?: (column: number, type: EditableType) => void;
  busy?: boolean;
}) {
  const [rowPage, setRowPage] = useState(0);
  const [columnPage, setColumnPage] = useState(0);
  const t = (key: MessageKey, values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const rowStart = rowPage * rowsPerPage;
  const rowEnd = Math.min(rowStart + rowsPerPage, rowCount);
  const columnStart = columnPage * columnsPerPage;
  const columnEnd = Math.min(columnStart + columnsPerPage, columns.length);
  const visibleColumns = columns.slice(columnStart, columnEnd);

  return (
    <div className="project-data-preview">
      <p className="project-data-meta" role="status">
        {t('data.summary', { rows: rowCount, columns: columns.length })}
      </p>
      {!!columns.length && (
        <div
          className="project-data-table-scroll"
          tabIndex={0}
          role="region"
          aria-label={t('data.preview')}
        >
          <table aria-label={t('data.preview')}>
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
            <tbody>
              {Array.from({ length: rowEnd - rowStart }, (_, row) => (
                <tr key={rowStart + row}>
                  {visibleColumns.map((_, index) => (
                    <td key={columnStart + index}>
                      {displayCell(cell(rowStart + row, columnStart + index))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!rowCount && <p className="project-data-meta">{t('data.noRows')}</p>}
      {rowCount > rowsPerPage && (
        <nav className="project-data-pages" aria-label={t('data.rowPages')}>
          <button
            type="button"
            className="button"
            disabled={!rowPage}
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
            disabled={rowEnd === rowCount}
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
            disabled={!columnPage}
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
            disabled={columnEnd === columns.length}
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
  onCreateChart,
  onClose,
}: {
  locale: string;
  datasets: readonly Dataset[];
  onAdd: (dataset: Dataset) => Promise<MessageKey | null>;
  onRemove: (id: string) => Promise<MessageKey | null>;
  onCreateChart: (settings: ChartSettings) => boolean;
  onClose: () => void;
}) {
  const t = (key: MessageKey, values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const [mode, setMode] = useState<'saved' | 'import'>(
    datasets.length ? 'saved' : 'import',
  );
  const [selectedId, setSelectedId] = useState(datasets[0]?.id ?? '');
  const [chartDatasetId, setChartDatasetId] = useState<string | null>(null);
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
  const nextFocus = useRef<'saved' | 'remove' | 'chart' | null>(null);
  const savedTab = useRef<HTMLButtonElement>(null);
  const chartButton = useRef<HTMLButtonElement>(null);
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
    else if (nextFocus.current === 'chart') chartButton.current?.focus();
    else if (removeId) cancelRemove.current?.focus();
    nextFocus.current = null;
  }, [chartDatasetId, removeId, saving]);

  const selected =
    datasets.find((dataset) => dataset.id === selectedId) ?? datasets[0];
  const canChart = selected && chartFields(selected).categories.length > 0;
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

  async function changeDataset(update: () => Promise<MessageKey | null>) {
    if (transaction.current) return;
    transaction.current = true;
    setSaving(true);
    setIssue(null);
    try {
      const failure = await update();
      if (failure) setIssue({ key: failure });
    } catch (error) {
      setIssue(importIssue(error));
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

  if (chartDatasetId) {
    const back = () => {
      nextFocus.current = 'chart';
      setChartDatasetId(null);
    };
    return (
      <Dialog
        title={t('chart.create')}
        onCancel={back}
        className="project-data-dialog chart-settings-dialog"
      >
        <ChartSettingsForm
          locale={locale}
          datasets={datasets}
          datasetId={chartDatasetId}
          onConfirm={(settings) => {
            if (!onCreateChart(settings)) return false;
            onClose();
            return true;
          }}
          onCancel={back}
        />
      </Dialog>
    );
  }

  return (
    <Dialog
      title={t('data.title')}
      onCancel={close}
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
            {canChart ? (
              <button
                type="button"
                ref={chartButton}
                className="button project-data-chart"
                disabled={saving}
                onClick={() => setChartDatasetId(selected.id)}
              >
                {t('chart.create')}
              </button>
            ) : (
              <p className="project-data-meta">{t('chart.noFields')}</p>
            )}
            <DatasetTable
              key={selected.id}
              locale={locale}
              columns={selected.fields}
              rowCount={selected.rows.length}
              cell={(row, column) =>
                selected.rows[row]?.[selected.fields[column].id]
              }
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
