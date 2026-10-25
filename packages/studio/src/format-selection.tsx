import { Dialog } from '@koxora/ui';
import { translate, type MessageKey } from '@koxora/i18n';
import { useState } from 'react';
import {
  FONT_FAMILIES,
  CONNECTION_KEY,
  resolveAppearance,
  readRichText,
  TEXT_ATTRIBUTES,
  type Appearance,
  type EditCommand,
} from '@koxora/editor-core';
import type { Page, Style } from '@koxora/project';
export function FormatSelection({
  ids,
  page,
  styles,
  locale,
  onApply,
  onClose,
}: {
  ids: string[];
  page: Page;
  styles: Style[];
  locale: string;
  onApply: (command: EditCommand) => boolean;
  onClose: () => void;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const [failed, setFailed] = useState(false);
  const items = [...page.nodes, ...page.connections].filter((n) =>
    ids.includes(n.id),
  );
  const applicable = (key: keyof Appearance) =>
    items.filter(
      (item) =>
        (!['fill', 'cornerRadius'].includes(key) ||
          ('kind' in item &&
            !['text', 'line', 'arrow'].includes(String(item.kind)))) &&
        (!['stroke', 'strokeWidth'].includes(key) ||
          !('kind' in item && item.kind === 'text')),
    );
  function values(key: keyof Appearance) {
    return applicable(key).flatMap((item) => {
      const base = resolveAppearance(
          item,
          styles,
          'kind' in item ? undefined : CONNECTION_KEY,
        ),
        rich = readRichText(item);
      if (rich && key === 'align') return rich.paragraphs.map((p) => p.align);
      if (
        rich &&
        TEXT_ATTRIBUTES.includes(key as (typeof TEXT_ATTRIBUTES)[number])
      )
        return rich.paragraphs.flatMap((p) =>
          p.runs.map((r) => r.style[key as keyof typeof r.style] ?? base[key]),
        );
      return [base[key]];
    });
  }
  function current(key: keyof Appearance) {
    const all = values(key);
    return all.length && all.every((v) => v === all[0]) ? all[0] : undefined;
  }
  function change(key: keyof Appearance, value: Appearance[keyof Appearance]) {
    setFailed(!onApply({ type: 'format', ids, patch: { [key]: value } }));
  }
  return (
    <Dialog title={t('format.heading')} onCancel={onClose}>
      <p className="field-help">{t('format.help')}</p>
      <div className="element-fields batch-fields">
        {(['fill', 'stroke', 'textColor'] as const)
          .filter((k) => applicable(k).length)
          .map((k) => (
            <label key={k}>
              {t(`diagram.${k}`)}
              <input
                aria-label={t(`diagram.${k}`)}
                type="color"
                value={
                  typeof current(k) === 'string' &&
                  String(current(k)).startsWith('#')
                    ? String(current(k))
                    : '#ffffff'
                }
                onChange={(e) => change(k, e.target.value)}
              />
              {current(k) === undefined && (
                <span className="mixed-value">{t('format.mixed')}</span>
              )}
            </label>
          ))}
        {(['strokeWidth', 'opacity', 'fontSize'] as const)
          .filter((k) => applicable(k).length)
          .map((k) => (
            <label key={k}>
              {t(`diagram.${k}`)}
              <input
                type="number"
                key={String(current(k) ?? 'mixed')}
                defaultValue={current(k) ?? ''}
                placeholder={t('format.mixed')}
                min={k === 'fontSize' ? 8 : 0}
                max={k === 'fontSize' ? 96 : k === 'opacity' ? 1 : 32}
                step={k === 'opacity' ? 0.05 : 'any'}
                onBlur={(e) => {
                  if (e.currentTarget.validity.valid && e.target.value !== '')
                    change(k, e.target.valueAsNumber);
                }}
              />
            </label>
          ))}
        <label>
          {t('text.family')}
          <select
            aria-label={t('text.family')}
            value={current('fontFamily') ?? ''}
            onChange={(e) =>
              change('fontFamily', e.target.value as Appearance['fontFamily'])
            }
          >
            <option value="" disabled>
              {t('format.mixed')}
            </option>
            {(Object.keys(FONT_FAMILIES) as Appearance['fontFamily'][]).map(
              (f) => (
                <option
                  key={f}
                  value={f}
                  style={{ fontFamily: FONT_FAMILIES[f] }}
                >
                  {t(`text.family.${f}`)}
                </option>
              ),
            )}
          </select>
        </label>
        {(['bold', 'italic', 'underline'] as const).map((k) => {
          const key =
              k === 'bold'
                ? 'fontWeight'
                : k === 'italic'
                  ? 'fontStyle'
                  : 'textDecoration',
            on = k === 'bold' ? 700 : k === 'italic' ? 'italic' : 'underline',
            off = k === 'bold' ? 400 : k === 'italic' ? 'normal' : 'none';
          return (
            <button
              type="button"
              key={k}
              className="button compact"
              aria-pressed={
                current(key) === undefined ? 'mixed' : current(key) === on
              }
              onClick={() => change(key, current(key) === on ? off : on)}
            >
              {t(`text.${k}`)}
            </button>
          );
        })}
        <label>
          {t('diagram.align')}
          <select
            value={current('align') ?? ''}
            onChange={(e) =>
              change('align', e.target.value as Appearance['align'])
            }
          >
            <option value="" disabled>
              {t('format.mixed')}
            </option>
            {(['left', 'center', 'right'] as const).map((a) => (
              <option key={a} value={a}>
                {t(`align.${a}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {failed && <p role="alert">{t('format.error')}</p>}
      <div className="dialog-actions">
        <button type="button" className="button primary" onClick={onClose}>
          {t('format.close')}
        </button>
      </div>
    </Dialog>
  );
}
