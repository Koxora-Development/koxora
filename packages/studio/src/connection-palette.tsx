import { translate, type MessageKey } from '@koxora/i18n';
import {
  ENDPOINT_MARKERS,
  LINE_STYLES,
  type ConnectionOptions,
  type EndpointMarker,
} from '@koxora/editor-core';
import {
  connectionPresets,
  connectionPresetMatches,
  applyConnectionPreset,
} from './connection-presets';
import { connectionMarkerGeometry } from './connection-marker';
import './connection-palette.css';
function Marker({
  kind,
  x,
  y,
  reverse = false,
}: {
  kind: EndpointMarker;
  x: number;
  y: number;
  reverse?: boolean;
}) {
  if (kind === 'none') return null;
  const marker = connectionMarkerGeometry(kind, 7);
  return (
    <path
      d={marker.path}
      fill={
        marker.filled
          ? 'currentColor'
          : kind === 'diamond' || kind === 'circle'
            ? 'var(--surface)'
            : 'none'
      }
      stroke="currentColor"
      strokeWidth={1.4}
      transform={`translate(${x} ${y}) rotate(${reverse ? 180 : 0})`}
    />
  );
}
export function ConnectionPalette({
  locale,
  options,
  active,
  writable,
  onChoose,
}: {
  locale: string;
  options: ConnectionOptions;
  active: boolean;
  writable: boolean;
  onChoose: (options: ConnectionOptions) => void;
}) {
  const t = (key: string) => translate(locale, key as MessageKey);
  return (
    <section className="connection-library" aria-label={t('line.library')}>
      <span>{t('line.library')}</span>
      <div
        role="toolbar"
        aria-label={t('line.library')}
        className="connection-palette"
        onKeyDown={(e) => {
          if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key))
            return;
          e.preventDefault();
          const buttons = [
            ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
              'button:not(:disabled)',
            ),
          ];
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? buttons.length - 1
                : (index + (e.key === 'ArrowLeft' ? -1 : 1) + buttons.length) %
                  buttons.length;
          buttons[next]?.focus();
          buttons[next]?.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
          });
        }}
      >
        {connectionPresets.map((p) => {
          const curved = p.routing === 'curved',
            elbow = p.routing === 'orthogonal',
            startY = elbow || curved ? 18 : 12,
            endY = elbow || curved ? 6 : 12;
          return (
            <button
              className="connection-preset"
              type="button"
              key={p.id}
              data-connection-preset={p.id}
              disabled={!writable}
              title={t(`line.${p.id}`)}
              aria-label={t(`line.${p.id}`)}
              aria-pressed={active && connectionPresetMatches(options, p)}
              onClick={() => onChoose(applyConnectionPreset(options, p))}
            >
              <svg viewBox="0 0 44 24" aria-hidden="true">
                <path
                  d={
                    curved
                      ? 'M 4 18 C 20 18 24 6 40 6'
                      : elbow
                        ? 'M 4 18 H 22 V 6 H 40'
                        : 'M 4 12 H 40'
                  }
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeDasharray={
                    p.lineStyle === 'dashed'
                      ? '5 3'
                      : p.lineStyle === 'dotted'
                        ? '0 4'
                        : undefined
                  }
                  strokeLinecap={p.lineStyle === 'dotted' ? 'round' : undefined}
                />
                <Marker
                  kind={p.sourceMarker ?? (p.startArrow ? 'arrow' : 'none')}
                  x={4}
                  y={startY}
                  reverse
                />
                <Marker
                  kind={p.targetMarker ?? (p.arrow ? 'arrow' : 'none')}
                  x={40}
                  y={endY}
                />
              </svg>
            </button>
          );
        })}
      </div>
    </section>
  );
}
export function ConnectionStyleFields({
  locale,
  options,
  onChange,
}: {
  locale: string;
  options: ConnectionOptions;
  onChange: (value: ConnectionOptions) => void;
}) {
  const t = (key: string) => translate(locale, key as MessageKey);
  return (
    <details className="connection-style-fields">
      <summary>{t('line.details')}</summary>
      <div>
        <label>
          {t('line.pattern')}
          <select
            value={options.lineStyle ?? 'solid'}
            onChange={(e) =>
              onChange({
                ...options,
                lineStyle: e.target.value as ConnectionOptions['lineStyle'],
              })
            }
          >
            {LINE_STYLES.map((style) => (
              <option key={style} value={style}>
                {t(`line.pattern.${style}`)}
              </option>
            ))}
          </select>
        </label>
        {(['source', 'target'] as const).map((side) => (
          <label key={side}>
            {t(`line.${side}Marker`)}
            <select
              value={
                options[side === 'source' ? 'sourceMarker' : 'targetMarker'] ??
                ((side === 'source' ? options.startArrow : options.arrow)
                  ? 'arrow'
                  : 'none')
              }
              onChange={(e) =>
                onChange({
                  ...options,
                  [side === 'source' ? 'sourceMarker' : 'targetMarker']:
                    e.target.value,
                  [side === 'source' ? 'startArrow' : 'arrow']:
                    e.target.value === 'arrow' ||
                    e.target.value === 'open-arrow',
                })
              }
            >
              {ENDPOINT_MARKERS.map((marker) => (
                <option key={marker} value={marker}>
                  {t(`line.marker.${marker}`)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </details>
  );
}
