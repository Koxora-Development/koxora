import { useMemo, useState } from 'react';
import {
  CHART_PALETTES,
  MAX_CHART_ROWS,
  MAX_TEXT,
  chartFields,
  suggestChartType,
  type ChartSettings,
} from '@koxora/editor-core';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  chartPalettes,
  chartTypes,
  type Dataset,
  type Field,
} from '@koxora/project';
import { Dialog } from '@koxora/ui';
import './project-data.css';

function eligibleDatasets(datasets: readonly Dataset[]) {
  return datasets.flatMap((dataset) => {
    const { categories, values } = chartFields(dataset);
    return categories.length && values.length
      ? [{ dataset, categories, values }]
      : [];
  });
}

function chartColumns(
  selected: ReturnType<typeof eligibleDatasets>[number] | undefined,
  categoryFieldId?: string,
  valueFieldId?: string,
) {
  const category =
    selected?.categories.find((field) => field.id === categoryFieldId) ??
    selected?.categories.find((field) => field.type === 'date') ??
    selected?.categories.find((field) => field.type === 'string') ??
    selected?.categories[0];
  const valueOptions =
    selected?.values.filter((field) => field.id !== category?.id) ?? [];
  const value =
    valueOptions.find((field) => field.id === valueFieldId) ?? valueOptions[0];
  return { category, value, valueOptions };
}

function chartTitle(locale: string, category: Field, value: Field) {
  return translate(locale, 'chart.suggestedTitle', {
    category: category.name,
    value: value.name,
  })
    .replace(/[\p{Cc}\s]+/gu, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

export function ChartInsertDialog({
  locale,
  datasets,
  onConfirm,
  onClose,
  onOpenProjectData,
}: {
  locale: string;
  datasets: readonly Dataset[];
  onConfirm: (settings: ChartSettings) => boolean;
  onClose: () => void;
  onOpenProjectData: () => void;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const [datasetId, setDatasetId] = useState('');
  const [failed, setFailed] = useState(false);
  const eligible = useMemo(() => eligibleDatasets(datasets), [datasets]);
  const selected =
    eligible.find(({ dataset }) => dataset.id === datasetId) ?? eligible[0];
  const { category, value } = chartColumns(selected);
  const settings: ChartSettings | null =
    selected && category && value
      ? {
          datasetId: selected.dataset.id,
          categoryFieldId: category.id,
          valueFieldId: value.id,
          type: suggestChartType(category),
          palette: 'studio',
          title: chartTitle(locale, category, value),
        }
      : null;

  return (
    <Dialog
      title={t('chart.insertTitle')}
      className="project-data-dialog chart-settings-dialog"
      onCancel={onClose}
    >
      <form
        className="chart-settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!settings) return;
          if (onConfirm(settings)) onClose();
          else setFailed(true);
        }}
      >
        <div className="project-data-body">
          {settings ? (
            <>
              <label className="project-data-field">
                {t('data.selected')}
                <select
                  value={settings.datasetId}
                  onChange={(event) => {
                    setDatasetId(event.currentTarget.value);
                    setFailed(false);
                  }}
                >
                  {eligible.map(({ dataset }) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.title}
                    </option>
                  ))}
                </select>
              </label>
              <p className="project-data-meta">
                {translate(locale, 'chart.insertSuggestion', {
                  title: settings.title,
                  type: t(`chart.type.${settings.type}`),
                })}
              </p>
            </>
          ) : (
            <p>{t(datasets.length ? 'chart.noFields' : 'data.noDatasets')}</p>
          )}
        </div>
        {failed && (
          <p className="error project-data-error" role="alert">
            {t('chart.error.save')}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            {t('project.cancel')}
          </button>
          {settings ? (
            <button type="submit" className="button primary">
              {t('chart.insertConfirm')}
            </button>
          ) : (
            <button
              type="button"
              className="button primary"
              onClick={onOpenProjectData}
            >
              {t('chart.openProjectData')}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

export function ChartSettingsDialog({
  locale,
  datasets,
  initial,
  onConfirm,
  onClose,
}: {
  locale: string;
  datasets: readonly Dataset[];
  initial: ChartSettings;
  onConfirm: (settings: ChartSettings) => boolean;
  onClose: () => void;
}) {
  const t = (key: MessageKey, values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const [selection, setSelection] = useState(initial);
  const [failed, setFailed] = useState(false);
  const eligible = useMemo(() => eligibleDatasets(datasets), [datasets]);
  const selected =
    eligible.find(({ dataset }) => dataset.id === selection.datasetId) ??
    eligible[0];
  const { category, value, valueOptions } = chartColumns(
    selected,
    selection.categoryFieldId,
    selection.valueFieldId,
  );
  const suggestedTitle =
    category && value ? chartTitle(locale, category, value) : '';

  function change(patch: Partial<typeof selection>) {
    setSelection((current) => ({ ...current, ...patch }));
    setFailed(false);
  }

  const form = (
    <form
      className="chart-settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selected || !category || !value) return;
        if (
          onConfirm({
            datasetId: selected.dataset.id,
            categoryFieldId: category.id,
            valueFieldId: value.id,
            type: selection.type,
            palette: selection.palette,
            title: selection.title.trim() || suggestedTitle,
          })
        )
          onClose();
        else setFailed(true);
      }}
    >
      <div className="project-data-body">
        {selected && category && value ? (
          <>
            <label className="project-data-field">
              {t('data.selected')}
              <select
                value={selected.dataset.id}
                onChange={(event) =>
                  change({
                    datasetId: event.currentTarget.value,
                    categoryFieldId: '',
                    valueFieldId: '',
                  })
                }
              >
                {eligible.map(({ dataset }) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="project-data-fields">
              <label className="project-data-field">
                {t('chart.category')}
                <select
                  value={category.id}
                  onChange={(event) =>
                    change({ categoryFieldId: event.currentTarget.value })
                  }
                >
                  {selected.categories.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="project-data-field">
                {t('chart.value')}
                <select
                  value={value.id}
                  onChange={(event) =>
                    change({ valueFieldId: event.currentTarget.value })
                  }
                >
                  {valueOptions.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="project-data-fields">
              <label className="project-data-field">
                {t('chart.type')}
                <select
                  value={selection.type}
                  onChange={(event) =>
                    change({
                      type: event.currentTarget.value as ChartSettings['type'],
                    })
                  }
                >
                  {chartTypes.map((option) => (
                    <option key={option} value={option}>
                      {t(`chart.type.${option}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="project-data-field">
                {t('chart.palette')}
                <select
                  value={selection.palette}
                  onChange={(event) =>
                    change({
                      palette: event.currentTarget
                        .value as ChartSettings['palette'],
                    })
                  }
                >
                  {chartPalettes.map((palette) => (
                    <option key={palette} value={palette}>
                      {t(`chart.palette.${palette}`)}
                    </option>
                  ))}
                </select>
                <span className="chart-palette-preview" aria-hidden="true">
                  {CHART_PALETTES[selection.palette].map((color) => (
                    <span key={color} style={{ backgroundColor: color }} />
                  ))}
                </span>
              </label>
            </div>
            <label className="project-data-field">
              {t('chart.title')}
              <input
                type="text"
                value={selection.title}
                placeholder={suggestedTitle}
                maxLength={MAX_TEXT}
                onChange={(event) =>
                  change({ title: event.currentTarget.value })
                }
              />
            </label>
            {selected.dataset.rows.length > MAX_CHART_ROWS && (
              <p className="project-data-meta">
                {t('data.chartPreviewRows', {
                  shown: MAX_CHART_ROWS,
                  total: selected.dataset.rows.length,
                })}
              </p>
            )}
          </>
        ) : (
          <p>{t('chart.noFields')}</p>
        )}
      </div>
      {failed && (
        <p className="error project-data-error" role="alert">
          {t('chart.error.save')}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={onClose}>
          {t('project.cancel')}
        </button>
        <button
          type="submit"
          className="button primary"
          disabled={!selected || !category || !value}
        >
          {t('chart.apply')}
        </button>
      </div>
    </form>
  );
  return (
    <Dialog
      title={t('chart.edit')}
      className="project-data-dialog chart-settings-dialog"
      onCancel={onClose}
    >
      {form}
    </Dialog>
  );
}
