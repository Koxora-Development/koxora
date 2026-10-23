import { useState } from 'react';
import type { Page, Style } from '@koxora/project';
import { Dialog } from '@koxora/ui';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  isDrawing,
  LINE_KEY,
  jsonObject,
  layerStates,
  resolveAppearance,
  readConnection,
  CONNECTION_KEY,
  MAX_TEXT,
  type ShapeKind,
  type EditCommand,
  type ConnectionOptions,
  type Appearance,
  DEFAULT_CONNECTION,
} from '@koxora/editor-core';
import { ShapePalette } from './shape-palette';
export type DiagramTool = 'select' | 'pan' | 'edit' | 'connect' | ShapeKind;
interface Props {
  page: Page;
  styles: Style[];
  repeat: boolean;
  setRepeat: (value: boolean) => void;
  locale: string;
  tool: DiagramTool;
  source: string | null;
  layerId: string;
  setLayer: (id: string) => void;
  activate: (tool: DiagramTool) => void;
  pick: (id: string) => void;
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
  layerId,
  setLayer,
  activate,
  pick,
  options,
  setOptions,
}: Props) {
  const t = (key: MessageKey) => translate(locale, key);
  const [target, setTarget] = useState('');
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
      <div className="diagram-tools">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={repeat}
            onChange={(e) => setRepeat(e.target.checked)}
          />
          {t('editing.repeat')}
        </label>
        {page.layers.length > 1 && (
          <select
            aria-label={t('diagram.layer')}
            value={layerId}
            onChange={(e) => setLayer(e.target.value)}
          >
            {available.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        )}
        {tool !== 'select' && (
          <button className="button compact" onClick={() => activate('select')}>
            {t('diagram.cancel')}
          </button>
        )}
      </div>
      {tool === 'connect' && (
        <div className="diagram-options">
          <RoutingSelect
            locale={locale}
            value={options.routing}
            onChange={(routing) => setOptions({ ...options, routing })}
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
        </div>
      )}
      {(tool === 'edit' || tool === 'connect') && (
        <div className="diagram-options">
          <select
            aria-label={t('diagram.target')}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">{t('diagram.choose')}</option>
            {page.nodes
              .filter((n) => layers.get(n.layerId)?.editable)
              .map((n, i) => (
                <option value={n.id} key={n.id}>
                  {translate(locale, 'diagram.nodeName', {
                    index: i + 1,
                    text:
                      typeof n.content.text === 'string'
                        ? n.content.text.slice(0, 80)
                        : n.kind,
                  })}
                </option>
              ))}
            {tool === 'edit' &&
              page.connections
                .filter((e) => layers.get(e.layerId)?.editable)
                .map((e, i) => (
                  <option value={e.id} key={e.id}>
                    {translate(locale, 'diagram.edgeName', {
                      index: i + 1,
                      text: readConnection(e).label,
                    })}
                  </option>
                ))}
          </select>
          <button
            className="button compact"
            disabled={!target}
            onClick={() => pick(target)}
          >
            {t(
              tool === 'edit'
                ? 'diagram.edit'
                : source
                  ? 'diagram.targetPick'
                  : 'diagram.sourcePick',
            )}
          </button>
        </div>
      )}
      <p className="diagram-guidance" role="status">
        {t(
          !available.length
            ? 'diagram.error.layer'
            : tool === 'select'
              ? 'editing.selectHelp'
              : tool === 'pan'
                ? 'diagram.panHelp'
                : tool === 'connect'
                  ? source
                    ? 'diagram.targetHelp'
                    : 'diagram.sourceHelp'
                  : tool === 'edit'
                    ? 'diagram.editHelp'
                    : 'diagram.insertHelp',
        )}
      </p>
    </>
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
  const [text, setText] = useState(
    node && typeof node.content.text === 'string' ? node.content.text : '',
  );
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
        onSubmit={(e) => {
          e.preventDefault();
          if (
            onApply(
              node
                ? {
                    type: 'updateNode',
                    id,
                    text,
                    style: appearance,
                    geometry: geometry === node.geometry ? undefined : geometry,
                    ...(line ? { startArrow, endArrow } : {}),
                  }
                : { type: 'updateConnection', id, options, style: appearance },
            )
          )
            onCancel();
          else setFailed(true);
        }}
      >
        <label className="field-label">
          {t('diagram.label')}
          <textarea
            rows={4}
            maxLength={MAX_TEXT}
            value={node ? text : options.label}
            onChange={(e) =>
              node
                ? setText(e.target.value)
                : setOptions({ ...options, label: e.target.value })
            }
          />
        </label>
        {failed && <p role="alert">{t('diagram.error.invalid')}</p>}
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
          {color('textColor')}
          {number('strokeWidth', 0, 32)}
          {number('fontSize', 8, 96)}
          {number('opacity', 0, 1, 0.05)}
          {node && (
            <>
              <label>
                {t('diagram.align')}
                <select
                  value={appearance.align}
                  onChange={(e) =>
                    setAppearance({
                      ...appearance,
                      align: e.target.value as Appearance['align'],
                    })
                  }
                >
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <option value={a} key={a}>
                      {t(`align.${a}`)}
                    </option>
                  ))}
                </select>
              </label>
              {number('cornerRadius', 0, 128)}
            </>
          )}
          {edge && (
            <>
              <RoutingSelect
                locale={locale}
                value={options.routing}
                onChange={(routing) => setOptions({ ...options, routing })}
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
