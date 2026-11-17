import {
  transformActions,
  transformedGeometry,
  normalizedRotation,
  groupEdit,
} from '@koxora/editor-core';
import { useEffect, useId, useState } from 'react';
import { type Page, type Style, type Project } from '@koxora/project';
import { LinkFields } from './element-links';
import { PropertySurface } from './property-surface';
import { TextRegionsEditor } from './text-regions-editor';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  elementLink,
  elementDisplayText,
  defaultTextRegions,
  type TextRegions,
  type LinkTarget,
  validLinkTarget,
  isDrawing,
  isShapeKind,
  LINE_KEY,
  jsonObject,
  layerStates,
  readRichText,
  fromPlainText,
  resolveAppearance,
  readConnection,
  CONNECTION_KEY,
  type ShapeKind,
  type EditCommand,
  type ConnectionOptions,
  DEFAULT_CONNECTION,
  type Anchor,
  type Appearance,
  type Geometry,
} from '@koxora/editor-core';
import { ShapePalette } from './shape-palette';
import { ConnectionPalette, ConnectionStyleFields } from './connection-palette';
import {
  connectionPresets as linePresets,
  connectionPresetMatches,
  applyConnectionPreset,
} from './connection-presets';
import { RichTextEditor } from './rich-text-editor';
import { PORT_ANCHORS } from './connection-ports';
export type DiagramTool = 'select' | 'pan' | 'freehand' | ShapeKind;
interface Props {
  ink: { stroke: string; strokeWidth: number };
  setInk: (ink: { stroke: string; strokeWidth: number }) => void;
  page: Page;
  repeat: boolean;
  setRepeat: (value: boolean) => void;
  locale: string;
  tool: DiagramTool;
  source: string | null;
  candidates: string[];
  layerId: string;
  setLayer: (id: string) => void;
  activate: (tool: DiagramTool) => void;
  link: (id: string | null, anchor?: Anchor) => void;
  options: ConnectionOptions;
  setOptions: (options: ConnectionOptions) => void;
}

export function DiagramTools({
  ink,
  setInk,
  page,
  repeat,
  setRepeat,
  locale,
  tool,
  source,
  candidates,
  layerId,
  setLayer,
  activate,
  link,
  options,
  setOptions,
}: Props) {
  const t = (key: MessageKey) => translate(locale, key);
  const [target, setTarget] = useState('');
  const [anchor, setAnchor] = useState<Anchor>('auto');
  const layers = layerStates(page.layers);
  const available = page.layers.filter((l) => layers.get(l.id)?.editable);
  return (
    <>
      <ShapePalette
        locale={locale}
        tool={tool}
        activate={activate}
        writable={!!available.length}
      />
      <ConnectionPalette
        locale={locale}
        options={options}
        active={isDrawing(tool)}
        writable={!!available.length}
        onChoose={(next) => {
          activate(next.arrow ? 'arrow' : 'line');
          setOptions(next);
        }}
      />
      {(isShapeKind(tool) || tool === 'freehand') && (
        <div
          className="tool-context"
          role="group"
          aria-label={t('diagram.toolOptions')}
        >
          {tool !== 'freehand' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={repeat}
                onChange={(e) => setRepeat(e.target.checked)}
              />
              {t('editing.repeat')}
            </label>
          )}
          {tool === 'freehand' && (
            <>
              <label>
                {t('diagram.stroke')}
                <input
                  type="color"
                  value={ink.stroke}
                  onChange={(e) => setInk({ ...ink, stroke: e.target.value })}
                />
              </label>
              <label>
                {t('diagram.strokeWidth')}
                <input
                  type="number"
                  min={1}
                  max={32}
                  value={ink.strokeWidth}
                  onChange={(e) => {
                    const width = e.target.valueAsNumber;
                    if (Number.isFinite(width) && width >= 1 && width <= 32)
                      setInk({ ...ink, strokeWidth: width });
                  }}
                />
              </label>
              <span className="field-help">{t('freehand.help')}</span>
            </>
          )}
          {page.layers.length > 1 && (
            <label>
              {t('diagram.layer')}
              <select
                value={layerId}
                onChange={(e) => setLayer(e.target.value)}
              >
                {available.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {isDrawing(tool) && (
            <>
              <label className="line-preset-picker">
                {t('line.presets')}
                <select
                  value={
                    linePresets.find((preset) =>
                      connectionPresetMatches(options, preset),
                    )?.id ?? ''
                  }
                  onChange={(event) => {
                    const preset = linePresets.find(
                      (item) => item.id === event.currentTarget.value,
                    );
                    if (preset)
                      setOptions(applyConnectionPreset(options, preset));
                  }}
                >
                  <option value="" disabled>
                    {t('line.custom')}
                  </option>
                  {linePresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {t(`line.${preset.id}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </label>
              <ConnectionStyleFields
                locale={locale}
                options={options}
                onChange={setOptions}
              />
              <RoutingSelect
                locale={locale}
                value={options.routing}
                onChange={(routing) => setOptions({ ...options, routing })}
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={options.startArrow === true}
                  onChange={(event) =>
                    setOptions({
                      ...options,
                      startArrow: event.target.checked,
                      ...(options.sourceMarker !== undefined
                        ? {
                            sourceMarker: event.target.checked
                              ? 'arrow'
                              : 'none',
                          }
                        : {}),
                    })
                  }
                />
                {t('editing.startArrow')}
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={options.arrow}
                  onChange={(event) =>
                    setOptions({
                      ...options,
                      arrow: event.target.checked,
                      ...(options.targetMarker !== undefined
                        ? {
                            targetMarker: event.target.checked
                              ? 'arrow'
                              : 'none',
                          }
                        : {}),
                    })
                  }
                />
                {t('editing.endArrow')}
              </label>
              <details className="tool-picker">
                <summary>{t('diagram.linkByName')}</summary>
                <div className="tool-picker-content">
                  <select
                    aria-label={t(
                      source ? 'ports.targetShape' : 'ports.sourceShape',
                    )}
                    value={candidates.includes(target) ? target : ''}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    <option value="">{t('diagram.choose')}</option>
                    {page.nodes
                      .filter((n) => candidates.includes(n.id))
                      .map((n, i) => (
                        <option key={n.id} value={n.id}>
                          {translate(locale, 'diagram.nodeName', {
                            index: i + 1,
                            text: elementDisplayText(n).slice(0, 80) || n.kind,
                          })}
                        </option>
                      ))}
                  </select>
                  <AnchorSelect
                    locale={locale}
                    label="ports.point"
                    value={anchor}
                    onChange={setAnchor}
                  />
                  <button
                    className="button compact"
                    disabled={!candidates.includes(target)}
                    onClick={() => {
                      link(target, anchor);
                      setTarget('');
                      setAnchor('auto');
                    }}
                  >
                    {t(source ? 'diagram.targetPick' : 'diagram.sourcePick')}
                  </button>
                </div>
              </details>
              <span className="tool-guidance" role="status">
                {t(source ? 'diagram.targetHelp' : 'diagram.linkHelp')}
              </span>
            </>
          )}
        </div>
      )}
      {!available.length && (
        <p className="diagram-guidance" role="status">
          {t('diagram.error.layer')}
        </p>
      )}
    </>
  );
}
function AnchorSelect({
  locale,
  label,
  value,
  onChange,
}: {
  locale: string;
  label: MessageKey;
  value: Anchor;
  onChange: (value: Anchor) => void;
}) {
  return (
    <label>
      {translate(locale, label)}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Anchor)}
      >
        {(['auto', ...PORT_ANCHORS] as const).map((anchor) => (
          <option key={anchor} value={anchor}>
            {translate(locale, `ports.${anchor}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
function RoutingSelect({
  locale,
  value,
  onChange,
}: {
  locale: string;
  value: ConnectionOptions['routing'];
  onChange: (value: ConnectionOptions['routing']) => void;
}) {
  return (
    <label>
      {translate(locale, 'diagram.routing')}
      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value as ConnectionOptions['routing'])
        }
      >
        {(['straight', 'orthogonal', 'curved'] as const).map((k) => (
          <option key={k} value={k}>
            {translate(locale, `routing.${k}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
/** Keep local incomplete input while accepting external undo and editing updates. */
function useLiveValue<T>(source: T): [T, (value: T) => void] {
  const signature = JSON.stringify(source);
  const [seen, setSeen] = useState(signature);
  const [value, setValue] = useState(source);
  if (signature !== seen) {
    setSeen(signature);
    if (JSON.stringify(value) !== signature) setValue(source);
  }
  return [value, setValue];
}

/** Keep rounded presentation separate from the precise stored geometry. */
function GeometryInput({
  value,
  min,
  onChange,
}: {
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  const display = (number: number) => String(Number(number.toFixed(2)));
  const [seen, setSeen] = useState(value);
  const [draft, setDraft] = useState(() => display(value));
  if (value !== seen) {
    setSeen(value);
    // Preserve a field's own live echo, including trailing decimal input.
    if (draft.trim() === '' || Number(draft) !== value)
      setDraft(display(value));
  }
  return (
    <input
      type="number"
      required
      min={min}
      max={1e12}
      step="any"
      value={draft}
      onChange={(event) => {
        setDraft(event.currentTarget.value);
        if (
          event.currentTarget.value !== '' &&
          event.currentTarget.validity.valid
        )
          onChange(event.currentTarget.valueAsNumber);
      }}
      onBlur={() => setDraft(display(value))}
    />
  );
}

export function ElementDialog({
  project,
  page,
  styles,
  id,
  locale,
  onCancel,
  onApply,
  panel = false,
  onDraftChange,
}: {
  panel?: boolean;
  onDraftChange?: (dirty: boolean) => void;
  project: Project;
  page: Page;
  styles: Style[];
  id: string;
  locale: string;
  onCancel: () => void;
  onApply: (command: EditCommand) => boolean;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const node = page.nodes.find((n) => n.id === id),
    edge = page.connections.find((e) => e.id === id);
  const [tab, setTab] = useState(
    node && ['container', 'table'].includes(node.kind) ? 'text' : 'format',
  );
  const [textRegions, setTextRegions] = useLiveValue<TextRegions | null>(
    node ? defaultTextRegions(node) : null,
  );
  const tabId = useId();
  const sessionId = useId();
  useEffect(() => {
    onDraftChange?.(false);
    return () => onDraftChange?.(false);
  }, [onDraftChange]);
  const initialLink = elementLink(project, id);
  const [link, setLink] = useLiveValue<LinkTarget | null>(
    initialLink.state === 'ready' ? initialLink.target : null,
  );
  const [geometry, setGeometry] = useLiveValue(node?.geometry);
  const line = node && isDrawing(node.kind);
  const [startArrow, setStartArrow] = useLiveValue(
    node ? jsonObject(node.extensions[LINE_KEY]).startArrow === true : false,
  );
  const [endArrow, setEndArrow] = useLiveValue(
    node
      ? typeof jsonObject(node.extensions[LINE_KEY]).endArrow === 'boolean'
        ? jsonObject(node.extensions[LINE_KEY]).endArrow === true
        : node.kind === 'arrow'
      : false,
  );
  const [failed, setFailed] = useState(false);
  const [appearance, setAppearance] = useLiveValue(
    resolveAppearance(
      (node ?? edge)!,
      styles,
      node ? undefined : CONNECTION_KEY,
    ),
  );
  const [options, setOptions] = useLiveValue(
    edge ? readConnection(edge) : DEFAULT_CONNECTION,
  );
  const [richText, setRichText] = useLiveValue(
    readRichText((node ?? edge)!) ??
      fromPlainText(
        node ? String(node.content.text ?? '') : options.label,
        appearance.align,
      ),
  );
  function publish(command: EditCommand, field?: string) {
    setFailed(
      !onApply(field ? groupEdit(command, `${sessionId}:${field}`) : command),
    );
  }
  function changeAppearance(
    key: keyof Appearance,
    value: Appearance[keyof Appearance],
    valid = true,
  ) {
    setAppearance({ ...appearance, [key]: value });
    if (valid)
      publish(
        { type: 'format', ids: [id], patch: { [key]: value } },
        `style:${key}`,
      );
  }
  function changeGeometry(value: Geometry, field?: string) {
    setGeometry(value);
    const key = (['x', 'y', 'width', 'height', 'rotation'] as const).find(
      (key) => field === `geometry:${key}`,
    );
    const next = key && node ? { ...node.geometry, [key]: value[key] } : value;
    if (
      ![next.x, next.y, next.width, next.height, next.rotation].every(
        (v) => Number.isFinite(v) && Math.abs(v) <= 1e12,
      ) ||
      next.width < 8 ||
      next.height < (line ? 1 : 8)
    )
      return;
    publish(
      {
        type: 'transform',
        geometries: {
          [id]: { ...next, rotation: normalizedRotation(next.rotation) },
        },
      },
      field,
    );
  }
  function changeOptions(value: ConnectionOptions) {
    if (!edge) return;
    setOptions(value);
    publish({
      type: 'updateConnection',
      id,
      options: { ...value, label: readConnection(edge).label },
      style: resolveAppearance(edge, styles, CONNECTION_KEY),
    });
  }
  function changeArrows(start: boolean, end: boolean) {
    if (!node) return;
    setStartArrow(start);
    setEndArrow(end);
    publish({
      type: 'updateNode',
      id,
      text: String(node.content.text ?? ''),
      style: resolveAppearance(node, styles),
      startArrow: start,
      endArrow: end,
    });
  }
  const color = (key: 'fill' | 'stroke' | 'textColor') => (
    <label>
      {t(`diagram.${key}`)}
      <input
        type="color"
        value={appearance[key].startsWith('#') ? appearance[key] : '#ffffff'}
        onChange={(e) => changeAppearance(key, e.target.value)}
      />
    </label>
  );
  const number = (
    key: 'strokeWidth' | 'fontSize' | 'opacity' | 'cornerRadius',
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      {t(`diagram.${key}`)}
      <input
        type="number"
        required
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(appearance[key]) ? appearance[key] : ''}
        onChange={(e) =>
          changeAppearance(
            key,
            e.currentTarget.valueAsNumber,
            e.currentTarget.value !== '' && e.currentTarget.validity.valid,
          )
        }
      />
    </label>
  );
  return (
    <PropertySurface
      panel={panel}
      title={t('diagram.properties')}
      onCancel={onCancel}
    >
      <form
        className={`element-form ${panel ? 'office-property-form' : ''}`}
        onSubmit={(event) => event.preventDefault()}
      >
        {panel && (
          <div
            className="office-property-tabs"
            role="tablist"
            aria-label={t('office.properties')}
            onKeyDown={(event) => {
              if (
                !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
              )
                return;
              event.preventDefault();
              const tabs = ['format', 'text', 'links'];
              const buttons = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  'button',
                ),
              ];
              const focused = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? 2
                    : ((focused < 0 ? tabs.indexOf(tab) : focused) +
                        (event.key === 'ArrowRight' ? 1 : 2)) %
                      3;
              setTab(tabs[next]);
              event.currentTarget
                .querySelectorAll<HTMLButtonElement>('button')
                .item(next)
                ?.focus();
            }}
          >
            {['format', 'text', 'links'].map((value) => (
              <button
                type="button"
                role="tab"
                key={value}
                id={`${tabId}-${value}`}
                aria-selected={tab === value}
                aria-controls={`${tabId}-${value}-panel`}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => setTab(value)}
              >
                {t(`office.property.${value}` as MessageKey)}
              </button>
            ))}
          </div>
        )}
        <div
          data-property-tab="text"
          id={`${tabId}-text-panel`}
          role={panel ? 'tabpanel' : undefined}
          aria-labelledby={panel ? `${tabId}-text` : undefined}
          hidden={panel && tab !== 'text'}
        >
          {textRegions && (
            <TextRegionsEditor
              value={textRegions}
              base={appearance}
              locale={locale}
              onChange={(value, field) => {
                setTextRegions(value);
                if (node)
                  publish(
                    {
                      type: 'updateNode',
                      id,
                      text: String(node.content.text ?? ''),
                      textRegions: value,
                      style: resolveAppearance(node, styles),
                    },
                    field,
                  );
              }}
            />
          )}
          {node?.kind !== 'table' && (
            <fieldset className="label-editor">
              <legend>
                {t(
                  node?.kind === 'container'
                    ? 'regions.containerBody'
                    : 'text.heading',
                )}
              </legend>
              <RichTextEditor
                value={richText}
                base={appearance}
                locale={locale}
                onChange={(value) => {
                  setRichText(value);
                  publish({ type: 'richText', id, value }, 'body-text');
                }}
              />
            </fieldset>
          )}
        </div>
        <div
          data-property-tab="links"
          id={`${tabId}-links-panel`}
          role={panel ? 'tabpanel' : undefined}
          aria-labelledby={panel ? `${tabId}-links` : undefined}
          hidden={panel && tab !== 'links'}
        >
          <LinkFields
            project={project}
            value={link}
            initial={initialLink}
            locale={locale}
            onChange={(value) => {
              setLink(value);
              if (validLinkTarget(project, value))
                publish(
                  {
                    type: 'link',
                    id,
                    link: { target: value, actionId: crypto.randomUUID() },
                  },
                  value?.type === 'url' ? 'link-url' : undefined,
                );
            }}
          />
        </div>
        {failed && <p role="alert">{t('diagram.error.invalid')}</p>}
        <div
          data-property-tab="format"
          id={`${tabId}-format-panel`}
          role={panel ? 'tabpanel' : undefined}
          aria-labelledby={panel ? `${tabId}-format` : undefined}
          hidden={panel && tab !== 'format'}
        >
          <details
            className="element-advanced"
            open={panel || node?.kind === 'freehand' ? true : undefined}
          >
            <summary>{t('text.advanced')}</summary>
            <div className="element-fields">
              {geometry &&
                (['x', 'y', 'width', 'height', 'rotation'] as const).map(
                  (key) => (
                    <label key={key}>
                      {t(`editing.${key}`)}
                      <GeometryInput
                        min={
                          key === 'width'
                            ? 8
                            : key === 'height'
                              ? line
                                ? 1
                                : 8
                              : -1e12
                        }
                        value={node?.geometry[key] ?? geometry[key]}
                        onChange={(value) =>
                          changeGeometry(
                            {
                              ...geometry,
                              [key]: value,
                            },
                            `geometry:${key}`,
                          )
                        }
                      />
                    </label>
                  ),
                )}
              {geometry && (
                <fieldset className="transform-controls">
                  <legend>{t('transform.heading')}</legend>
                  <p className="field-help">{t('transform.help')}</p>
                  {transformActions.map((action) => (
                    <button
                      type="button"
                      className="button compact"
                      key={action}
                      onClick={() => {
                        changeGeometry(
                          transformedGeometry(
                            node?.geometry ?? geometry,
                            action,
                          ),
                        );
                      }}
                    >
                      {t(`transform.${action}`)}
                    </button>
                  ))}
                </fieldset>
              )}
              {line && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={startArrow}
                      onChange={(e) => changeArrows(e.target.checked, endArrow)}
                    />
                    {t('editing.startArrow')}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={endArrow}
                      onChange={(e) =>
                        changeArrows(startArrow, e.target.checked)
                      }
                    />
                    {t('editing.endArrow')}
                  </label>
                </>
              )}

              {node &&
                !['freehand', 'text', 'line', 'arrow'].includes(node.kind) &&
                color('fill')}
              {color('stroke')}
              {number('strokeWidth', 0, 32)}
              {number('opacity', 0, 1, 0.05)}
              {node &&
                !['freehand', 'text', 'line', 'arrow'].includes(node.kind) &&
                number('cornerRadius', 0, 128)}
              {edge && (
                <>
                  <ConnectionStyleFields
                    locale={locale}
                    options={options}
                    onChange={changeOptions}
                  />
                  <RoutingSelect
                    locale={locale}
                    value={options.routing}
                    onChange={(routing) =>
                      changeOptions({ ...options, routing })
                    }
                  />
                  <AnchorSelect
                    locale={locale}
                    label="ports.source"
                    value={options.sourceAnchor}
                    onChange={(sourceAnchor) =>
                      changeOptions({ ...options, sourceAnchor })
                    }
                  />
                  <AnchorSelect
                    locale={locale}
                    label="ports.target"
                    value={options.targetAnchor}
                    onChange={(targetAnchor) =>
                      changeOptions({ ...options, targetAnchor })
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={options.startArrow === true}
                      onChange={(e) =>
                        changeOptions({
                          ...options,
                          startArrow: e.target.checked,
                          ...(options.sourceMarker !== undefined
                            ? {
                                sourceMarker: e.target.checked
                                  ? ('arrow' as const)
                                  : ('none' as const),
                              }
                            : {}),
                        })
                      }
                    />
                    {t('editing.startArrow')}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={options.arrow}
                      onChange={(e) =>
                        changeOptions({
                          ...options,
                          arrow: e.target.checked,
                          ...(options.targetMarker !== undefined
                            ? {
                                targetMarker: e.target.checked
                                  ? 'arrow'
                                  : 'none',
                              }
                            : {}),
                        })
                      }
                    />
                    {t('editing.endArrow')}
                  </label>
                </>
              )}
            </div>
          </details>
        </div>
        {!panel && (
          <div className="dialog-actions">
            <button type="button" className="button" onClick={onCancel}>
              {t('office.close')}
            </button>
          </div>
        )}
      </form>
    </PropertySurface>
  );
}
