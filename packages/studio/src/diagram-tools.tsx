import { useEffect, useId, useState } from 'react';
import { type Page, type Style, type Project } from '@koxora/project';
import { LinkFields } from './element-links';
import { PropertySurface } from './property-surface';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  elementLink,
  type LinkTarget,
  validLinkTarget,
  isDrawing,
  isShapeKind,
  LINE_KEY,
  jsonObject,
  layerStates,
  readRichText,
  fromPlainText,
  plainText,
  resolveAppearance,
  readConnection,
  CONNECTION_KEY,
  type ShapeKind,
  type EditCommand,
  type ConnectionOptions,
  DEFAULT_CONNECTION,
  type Anchor,
} from '@koxora/editor-core';
import { ShapePalette } from './shape-palette';
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
              <RoutingSelect
                locale={locale}
                value={options.routing}
                onChange={(routing) => setOptions({ ...options, routing })}
              />
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
                            text:
                              typeof n.content.text === 'string' &&
                              n.content.text
                                ? n.content.text.slice(0, 80)
                                : n.kind,
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
  const [tab, setTab] = useState('format');
  const tabId = useId();
  useEffect(() => () => onDraftChange?.(false), [onDraftChange]);
  const initialLink = elementLink(project, id);
  const [link, setLink] = useState<LinkTarget | null>(() =>
    initialLink.state === 'ready' ? initialLink.target : null,
  );
  const [linkChanged, setLinkChanged] = useState(false);
  const validLink = validLinkTarget(project, link);
  const linkChange = linkChanged
    ? { link: { target: link, actionId: crypto.randomUUID() } }
    : {};
  const [geometry, setGeometry] = useState(node?.geometry);
  const line = node && isDrawing(node.kind);
  const [startArrow, setStartArrow] = useState(
    node ? jsonObject(node.extensions[LINE_KEY]).startArrow === true : false,
  );
  const [endArrow, setEndArrow] = useState(
    node
      ? typeof jsonObject(node.extensions[LINE_KEY]).endArrow === 'boolean'
        ? jsonObject(node.extensions[LINE_KEY]).endArrow === true
        : node.kind === 'arrow'
      : false,
  );
  const [failed, setFailed] = useState(false);
  const [appearance, setAppearance] = useState(() =>
    resolveAppearance(
      (node ?? edge)!,
      styles,
      node ? undefined : CONNECTION_KEY,
    ),
  );
  const [options, setOptions] = useState(() =>
    edge ? readConnection(edge) : DEFAULT_CONNECTION,
  );
  const [richText, setRichText] = useState(
    () =>
      readRichText((node ?? edge)!) ??
      fromPlainText(
        node ? String(node.content.text ?? '') : options.label,
        appearance.align,
      ),
  );
  const color = (key: 'fill' | 'stroke' | 'textColor') => (
    <label>
      {t(`diagram.${key}`)}
      <input
        type="color"
        value={appearance[key].startsWith('#') ? appearance[key] : '#ffffff'}
        onChange={(e) =>
          setAppearance({ ...appearance, [key]: e.target.value })
        }
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
        value={appearance[key]}
        onChange={(e) =>
          setAppearance({ ...appearance, [key]: e.currentTarget.valueAsNumber })
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
        onChangeCapture={() => onDraftChange?.(true)}
        onInvalidCapture={(event) => {
          if (panel) {
            event.preventDefault();
            setTab(
              (event.target as HTMLElement).closest<HTMLElement>(
                '[data-property-tab]',
              )?.dataset.propertyTab ?? 'format',
            );
            setFailed(true);
            const target = event.target as HTMLElement;
            requestAnimationFrame(() => target.focus());
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (linkChanged && !validLink) return;
          if (
            onApply(
              node
                ? {
                    type: 'updateNode',
                    ...linkChange,
                    id,
                    text: plainText(richText),
                    ...(node.kind !== 'freehand' ? { richText } : {}),
                    style: appearance,
                    geometry: geometry === node.geometry ? undefined : geometry,
                    ...(line ? { startArrow, endArrow } : {}),
                  }
                : {
                    type: 'updateConnection',
                    ...linkChange,
                    id,
                    options: { ...options, label: plainText(richText) },
                    richText,
                    style: appearance,
                  },
            )
          )
            onCancel();
          else setFailed(true);
        }}
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
          {node?.kind !== 'freehand' && (
            <fieldset className="label-editor">
              <legend>{t('text.heading')}</legend>
              <RichTextEditor
                value={richText}
                base={appearance}
                locale={locale}
                onChange={(value) => {
                  onDraftChange?.(true);
                  setRichText(value);
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
              onDraftChange?.(true);
              setLink(value);
              setLinkChanged(true);
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
                (['x', 'y', 'width', 'height'] as const).map((key) => (
                  <label key={key}>
                    {t(`editing.${key}`)}
                    <input
                      type="number"
                      required
                      min={
                        key === 'width'
                          ? 8
                          : key === 'height'
                            ? line
                              ? 1
                              : 8
                            : -1e12
                      }
                      max={1e12}
                      step="any"
                      value={geometry[key]}
                      onChange={(e) =>
                        setGeometry({
                          ...geometry,
                          [key]: e.currentTarget.valueAsNumber,
                        })
                      }
                    />
                  </label>
                ))}
              {line && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={startArrow}
                      onChange={(e) => setStartArrow(e.target.checked)}
                    />
                    {t('editing.startArrow')}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={endArrow}
                      onChange={(e) => setEndArrow(e.target.checked)}
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
                  <RoutingSelect
                    locale={locale}
                    value={options.routing}
                    onChange={(routing) => setOptions({ ...options, routing })}
                  />
                  <AnchorSelect
                    locale={locale}
                    label="ports.source"
                    value={options.sourceAnchor}
                    onChange={(sourceAnchor) =>
                      setOptions({ ...options, sourceAnchor })
                    }
                  />
                  <AnchorSelect
                    locale={locale}
                    label="ports.target"
                    value={options.targetAnchor}
                    onChange={(targetAnchor) =>
                      setOptions({ ...options, targetAnchor })
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={options.arrow}
                      onChange={(e) =>
                        setOptions({ ...options, arrow: e.target.checked })
                      }
                    />
                    {t('diagram.arrow')}
                  </label>
                </>
              )}
            </div>
          </details>
        </div>
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onCancel}>
            {t(panel ? 'office.discardProperties' : 'project.cancel')}
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={linkChanged && !validLink}
          >
            {t('diagram.apply')}
          </button>
        </div>
      </form>
    </PropertySurface>
  );
}
