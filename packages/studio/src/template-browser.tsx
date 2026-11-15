import { useId, useState, type Ref } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  templateCatalog,
  shapeRegistry,
  connectionPath,
  DEFAULT_CONNECTION,
  type BuiltInTemplate,
  type TemplateCategory,
} from '@koxora/editor-core';
import type { Node } from '@koxora/project';
import { Dialog, Icon } from '@koxora/ui';
import './template-browser.css';

/** Previews use the same trusted shape and connection geometry as the editor. */
function TemplatePreview({
  template,
  locale,
}: {
  template: BuiltInTemplate;
  locale: string;
}) {
  const marker = useId().replace(/:/g, '');
  const nodes: Node[] = template.nodes.map((n) => ({
    id: n.id,
    kind: n.kind,
    layerId: '',
    geometry: { x: n.x, y: n.y, width: n.width, height: n.height, rotation: 0 },
    content: {},
    metadata: {},
    assetIds: [],
    dataBindings: [],
    extensions: {},
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const left = Math.min(...template.nodes.map((n) => n.x)) - 32;
  const top = Math.min(...template.nodes.map((n) => n.y)) - 32;
  const width =
    Math.max(...template.nodes.map((n) => n.x + n.width)) - left + 32;
  const height =
    Math.max(...template.nodes.map((n) => n.y + n.height)) - top + 32;
  return (
    <svg
      className="template-preview"
      viewBox={`${left} ${top} ${width} ${height}`}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={marker}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="#64748b" />
        </marker>
      </defs>
      {template.connections.map((edge, i) => {
        const path = connectionPath(
          byId.get(edge.source)!,
          byId.get(edge.target)!,
          { ...DEFAULT_CONNECTION, routing: edge.routing, arrow: edge.arrow },
        );
        return (
          <g key={i}>
            <path
              d={path.path}
              fill="none"
              stroke="#64748b"
              strokeWidth={2}
              markerEnd={edge.arrow ? `url(#${marker})` : undefined}
            />
            {edge.labelKey && (
              <text
                x={path.labelPoint.x}
                y={path.labelPoint.y - 8}
                textAnchor="middle"
                fontSize={14}
                fill="#334155"
              >
                {translate(locale, edge.labelKey as MessageKey)}
              </text>
            )}
          </g>
        );
      })}
      {template.nodes.map((node) => {
        const definition = shapeRegistry[node.kind];
        const box = definition.labelBox?.(node.width, node.height) ?? {
          x: 12,
          y: 8,
          width: node.width - 24,
          height: node.height - 16,
        };
        const label = translate(locale, node.textKey as MessageKey);
        const maxChars = Math.max(1, Math.floor(box.width / 9));
        const lines: string[] = [];
        for (const paragraph of label.split('\n')) {
          const wrapped: string[] = [];
          for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            const last = wrapped.at(-1);
            if (last && last.length + word.length + 1 <= maxChars)
              wrapped[wrapped.length - 1] += ` ${word}`;
            else wrapped.push(word);
          }
          lines.push(...(wrapped.length ? wrapped : ['']));
        }
        return (
          <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
            <path
              d={definition.path(node.width, node.height, 14)}
              fill={node.kind === 'text' ? 'none' : node.fill}
              stroke={node.kind === 'text' ? 'none' : '#64748b'}
              strokeWidth={2}
            />
            <text
              textAnchor="middle"
              fill="#172033"
              fontFamily="sans-serif"
              fontSize={16}
            >
              {lines.slice(0, 4).map((line, i) => (
                <tspan
                  key={i}
                  x={box.x + box.width / 2}
                  y={
                    box.y +
                    box.height / 2 +
                    (i - (Math.min(4, lines.length) - 1) / 2) * 19 +
                    5
                  }
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function TemplateBrowser({
  locale,
  busy,
  titleRef,
  onBack,
  onBlank,
  onUse,
}: {
  locale: string;
  busy: boolean;
  titleRef?: Ref<HTMLHeadingElement>;
  onBack: () => void;
  onBlank: () => void;
  onUse: (id: string, title: string) => void;
}) {
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    translate(locale, key, values);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [preview, setPreview] = useState<BuiltInTemplate | null>(null);
  const categories = [
    'mindmap',
    'flowchart',
    'organization',
    'planning',
  ] as const;
  const search = query.trim().toLocaleLowerCase(locale);
  const matches = templateCatalog.filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      (!search ||
        [
          item.titleKey,
          item.descriptionKey,
          `templates.category.${item.category}`,
        ].some((key) =>
          t(key as MessageKey)
            .toLocaleLowerCase(locale)
            .includes(search),
        )),
  );
  function applyTemplate(item: BuiltInTemplate) {
    setPreview(null);
    onUse(item.id, t(item.titleKey as MessageKey));
  }
  return (
    <div className="studio-start template-browser">
      <header className="start-heading">
        <div>
          <button className="button subtle" onClick={onBack}>
            <Icon name="arrow" />
            {t('templates.back')}
          </button>
          <h1 tabIndex={-1} ref={titleRef}>
            {t('templates.heading')}
          </h1>
          <p className="start-description">{t('templates.description')}</p>
        </div>
        <button className="button" onClick={onBlank} disabled={busy}>
          <Icon name="plus" />
          {t('templates.blank')}
        </button>
      </header>
      <div className="template-filters">
        <label>
          {t('templates.search')}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          {t('templates.category')}
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as TemplateCategory | 'all')
            }
          >
            <option value="all">{t('templates.category.all')}</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {t(`templates.category.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <p role="status">{t('templates.results', { count: matches.length })}</p>
      </div>
      {!matches.length && (
        <div className="template-empty">
          <p>{t('templates.empty')}</p>
          <button
            className="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
          >
            {t('templates.clear')}
          </button>
        </div>
      )}
      <ul className="template-grid">
        {matches.map((item) => {
          const title = t(item.titleKey as MessageKey);
          return (
            <li className="template-card" key={item.id}>
              <button
                className="template-preview-button"
                aria-label={t('templates.previewNamed', { title })}
                onClick={() => setPreview(item)}
              >
                <TemplatePreview template={item} locale={locale} />
              </button>
              <span className="template-category">
                {t(`templates.category.${item.category}`)}
              </span>
              <h2>{title}</h2>
              <p>{t(item.descriptionKey as MessageKey)}</p>
              <div className="template-card-actions">
                <button className="button" onClick={() => setPreview(item)}>
                  {t('templates.preview')}
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => applyTemplate(item)}
                >
                  {t('templates.use')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {preview && (
        <Dialog
          className="template-dialog"
          title={t(preview.titleKey as MessageKey)}
          onCancel={() => setPreview(null)}
        >
          <TemplatePreview template={preview} locale={locale} />
          <p>{t(preview.descriptionKey as MessageKey)}</p>
          <p>{t('templates.editable')}</p>
          <div className="dialog-actions">
            <button className="button" onClick={() => setPreview(null)}>
              {t('project.cancel')}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => applyTemplate(preview)}
            >
              {t('templates.use')}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
