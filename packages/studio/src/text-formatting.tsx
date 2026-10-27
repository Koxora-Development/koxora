import { translate, type MessageKey } from '@koxora/i18n';
import { FONT_FAMILIES, type Appearance } from '@koxora/editor-core';

export function TextFormatting({
  locale,
  value,
  onChange,
}: {
  locale: string;
  value: Appearance;
  onChange: (value: Appearance) => void;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  return (
    <div
      className="text-formatting"
      role="group"
      aria-label={t('text.formatting')}
    >
      <label>
        {t('text.family')}
        <select
          value={value.fontFamily}
          onChange={(e) =>
            onChange({
              ...value,
              fontFamily: e.target.value as Appearance['fontFamily'],
            })
          }
        >
          {(Object.keys(FONT_FAMILIES) as Appearance['fontFamily'][]).map(
            (f) => (
              <option value={f} key={f}>
                {t(`text.family.${f}`)}
              </option>
            ),
          )}
        </select>
      </label>
      <label>
        {t('diagram.fontSize')}
        <input
          type="number"
          min={8}
          max={96}
          required
          value={value.fontSize}
          onChange={(e) =>
            onChange({ ...value, fontSize: e.currentTarget.valueAsNumber })
          }
        />
      </label>
      <div className="text-style-buttons">
        {(['bold', 'italic', 'underline'] as const).map((style) => {
          const active =
            style === 'bold'
              ? value.fontWeight === 700
              : style === 'italic'
                ? value.fontStyle === 'italic'
                : value.textDecoration === 'underline';
          return (
            <button
              type="button"
              className={`button compact format-${style}`}
              key={style}
              aria-pressed={active}
              aria-label={t(`text.${style}`)}
              title={t(`text.${style}`)}
              onClick={() =>
                onChange({
                  ...value,
                  ...(style === 'bold'
                    ? { fontWeight: active ? 400 : 700 }
                    : style === 'italic'
                      ? { fontStyle: active ? 'normal' : 'italic' }
                      : { textDecoration: active ? 'none' : 'underline' }),
                })
              }
            >
              {t(`text.${style}`)}
            </button>
          );
        })}
      </div>
      <label>
        {t('diagram.textColor')}
        <input
          type="color"
          value={value.textColor.startsWith('#') ? value.textColor : '#18243d'}
          onChange={(e) => onChange({ ...value, textColor: e.target.value })}
        />
      </label>
      <button
        type="button"
        className="button compact"
        aria-pressed={value.textColor === 'auto'}
        onClick={() => onChange({ ...value, textColor: 'auto' })}
      >
        {t('text.autoColor')}
      </button>
      <label>
        {t('diagram.align')}
        <select
          value={value.align}
          onChange={(e) =>
            onChange({ ...value, align: e.target.value as Appearance['align'] })
          }
        >
          {(['left', 'center', 'right'] as const).map((a) => (
            <option key={a} value={a}>
              {t(`align.${a}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
