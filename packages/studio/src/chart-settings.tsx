import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CHART_PALETTES,
  MAX_CHART_ROWS,
  MAX_TEXT,
  chartFields,
  suggestChartType,
  type ChartSettings,
} from '@koxora/editor-core';
import { translate, type MessageKey } from '@koxora/i18n';
import { chartPalettes, chartTypes, type Dataset } from '@koxora/project';
import { Dialog } from '@koxora/ui';
import './project-data.css';

export function ChartSettingsForm({
  locale,
  datasets,
  datasetId,
  initial,
  onConfirm,
  onCancel,
}: {
  locale: string;
  datasets: readonly Dataset[];
  datasetId: string;
  initial?: ChartSettings;
  onConfirm: (settings: ChartSettings) => boolean;
  onCancel: () => void;
}) {
  const t = (key: MessageKey, values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const [selection, setSelection] = useState({
    datasetId,
    categoryFieldId: initial?.categoryFieldId ?? '',
    valueFieldId: initial?.valueFieldId ?? '',
    type: initial?.type ?? null,
    palette: initial?.palette ?? 'studio',
    title: initial?.title ?? null,
  });
  const [failed, setFailed] = useState(false);
  const datasetInput = useRef<HTMLSelectElement>(null);
  useLayoutEffect(() => datasetInput.current?.focus(), []);

  const eligible = useMemo(
    () =>
      datasets.flatMap((dataset) => {
        const { categories, values } = chartFields(dataset);
        return categories.length && values.length
          ? [{ dataset, categories, values }]
          : [];
      }),
    [datasets],
  );
  const selected =
    eligible.find(({ dataset }) => dataset.id === selection.datasetId) ??
    eligible[0];
  const category =
    selected?.categories.find(
      (field) => field.id === selection.categoryFieldId,
    ) ??
    selected?.categories.find((field) => field.type === 'date') ??
    selected?.categories.find((field) => field.type === 'string') ??
    selected?.categories[0];
  const valueOptions =
    selected?.values.filter((field) => field.id !== category?.id) ?? [];
  const value =
    valueOptions.find((field) => field.id === selection.valueFieldId) ??
    valueOptions[0];
  const type =
    selection.type ?? (category ? suggestChartType(category) : 'column');
  const suggestedTitle =
    category && value
      ? t('chart.suggestedTitle', {
          category: category.name,
          value: value.name,
        })
          .replace(/[\p{Cc}\s]+/gu, ' ')
          .trim()
          .slice(0, MAX_TEXT)
      : '';
  const title = selection.title ?? suggestedTitle;

  function change(patch: Partial<typeof selection>) {
    setSelection((current) => ({ ...current, ...patch }));
    setFailed(false);
  }

  return (
    <form
      className="chart-settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selected || !category || !value) return;
        setFailed(
          !onConfirm({
            datasetId: selected.dataset.id,
            categoryFieldId: category.id,
            valueFieldId: value.id,
            type,
            palette: selection.palette,
            title: title.trim() || suggestedTitle,
          }),
        );
      }}
    >
      <div className="project-data-body">
        {selected && category && value ? (
          <>
            <label className="project-data-field">
              {t('data.selected')}
              <select
                ref={datasetInput}
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
                  value={type}
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
                value={title}
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
        <button type="button" className="button" onClick={onCancel}>
          {t(initial ? 'project.cancel' : 'chart.back')}
        </button>
        <button
          type="submit"
          className="button primary"
          disabled={!selected || !category || !value}
        >
          {t(initial ? 'chart.apply' : 'chart.confirm')}
        </button>
      </div>
    </form>
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
  return (
    <Dialog
      title={translate(locale, 'chart.edit')}
      className="project-data-dialog chart-settings-dialog"
      onCancel={onClose}
    >
      <ChartSettingsForm
        locale={locale}
        datasets={datasets}
        datasetId={initial.datasetId}
        initial={initial}
        onConfirm={(settings) => {
          if (!onConfirm(settings)) return false;
          onClose();
          return true;
        }}
        onCancel={onClose}
      />
    </Dialog>
  );
}
