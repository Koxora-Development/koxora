import { useState } from 'react';
import type { Page, Style } from '@koxora/project';
import { Dialog } from '@koxora/ui';
import { translate, type MessageKey } from '@koxora/i18n';
import {
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
export type DiagramTool = 'select' | 'pan' | ShapeKind;
interface Props {
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
      {isShapeKind(tool) && (
        <div
          className="tool-context"
          role="group"
          aria-label={t('diagram.toolOptions')}
        >
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
            />
            {t('editing.repeat')}
          </label>
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
  page,
  styles,
  id,
  locale,
  onCancel,
  onApply,
}: {
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
        value={appearance[key] === 'none' ? '#ffffff' : appearance[key]}
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
    <Dialog title={t('diagram.properties')} onCancel={onCancel}>
      <form
        className="element-form"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (
            onApply(
              node
                ? {
                    type: 'updateNode',
                    id,
                    text: plainText(richText),
                    richText,
                    style: appearance,
                    geometry: geometry === node.geometry ? undefined : geometry,
                    ...(line ? { startArrow, endArrow } : {}),
                  }
                : {
                    type: 'updateConnection',
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
        <fieldset className="label-editor">
          <legend>{t('text.heading')}</legend>
          <RichTextEditor
            value={richText}
            base={appearance}
            locale={locale}
            onChange={setRichText}
          />
        </fieldset>
        {failed && <p role="alert">{t('diagram.error.invalid')}</p>}
        <details className="element-advanced">
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

            {node && color('fill')}
            {color('stroke')}
            {number('strokeWidth', 0, 32)}
            {number('opacity', 0, 1, 0.05)}
            {node && number('cornerRadius', 0, 128)}
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
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onCancel}>
            {t('project.cancel')}
          </button>
          <button type="submit" className="button primary">
            {t('diagram.apply')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
