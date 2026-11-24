import { useRef, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import { shapeKinds, shapeRegistry, isDrawing } from '@koxora/editor-core';
import { Dialog } from '@koxora/ui';
import {
  libraryCategories,
  libraryElementKinds,
  type LibraryCategory,
  type LibraryElement,
} from './library-preferences';

function ElementGlyph({ kind }: { kind: LibraryElement }) {
  const path =
    kind === 'freehand'
      ? 'M 3 25 Q 7 5 13 16 T 29 6'
      : isDrawing(kind)
        ? 'M 3 16 H 29'
        : kind === 'text'
          ? 'M 6 6 H 26 M 16 6 V 27 M 11 27 H 21'
          : shapeRegistry[kind].path(26, 22, 5);
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d={path}
        transform={
          kind !== 'freehand' && !isDrawing(kind) && kind !== 'text'
            ? 'translate(3 5)'
            : undefined
        }
      />
      {kind === 'arrow' && <path d={'M 22 10 L 29 16 L 22 22'} />}
    </svg>
  );
}

const normalize = (value: string) =>
  value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();

/** A bounded labelled grid scales independently of the compact quick toolbar. */
export function BrowseElements({
  locale,
  tools,
  initialQuery,
  active,
  writable,
  fullCatalog = false,
  onCancel,
  onChoose,
}: {
  locale: string;
  tools: readonly LibraryElement[];
  initialQuery: string;
  active: string;
  writable: boolean;
  fullCatalog?: boolean;
  onCancel: () => void;
  onChoose: (kind: LibraryElement) => void;
}) {
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    translate(locale, key, values);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<LibraryCategory | 'all'>('all');
  const [limit, setLimit] = useState(48);
  const grid = useRef<HTMLUListElement>(null);
  const resultsScroll = useRef<HTMLDivElement>(null);
  const search = normalize(query.trim());
  const library =
    fullCatalog && category !== 'all' ? libraryElementKinds[category] : null;
  const matches = tools.filter(
    (kind) =>
      (!library || library.includes(kind)) &&
      (!search ||
        normalize(
          `${t(`shape.${kind}` as MessageKey)} ${translate('en', `shape.${kind}` as MessageKey)} ${kind}`,
        ).includes(search)),
  );
  function resetResults() {
    setLimit(48);
    if (resultsScroll.current) resultsScroll.current.scrollTop = 0;
  }
  const searchField = (
    <label className="element-browser-search">
      {t('palette.search')}
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          resetResults();
        }}
      />
    </label>
  );
  const results = (
    <>
      {!matches.length && (
        <p>
          {t(
            fullCatalog
              ? 'palette.fullCatalogEmpty'
              : tools.length
                ? 'palette.empty'
                : 'palette.noCategories',
          )}
        </p>
      )}
      <ul className="element-browser-grid" ref={grid}>
        {matches.slice(0, limit).map((kind) => (
          <li key={kind}>
            <button
              type="button"
              data-library-kind={kind}
              aria-pressed={active === kind}
              disabled={!writable}
              onClick={() => onChoose(kind)}
            >
              <ElementGlyph kind={kind} />
              <span>{t(`shape.${kind}` as MessageKey)}</span>
            </button>
          </li>
        ))}
      </ul>
      {limit < matches.length && (
        <button
          className="button element-browser-more"
          type="button"
          onClick={() => {
            const next = matches[limit];
            setLimit((current) => current + 48);
            requestAnimationFrame(() =>
              grid.current
                ?.querySelector<HTMLButtonElement>(
                  `[data-library-kind="${next}"]`,
                )
                ?.focus(),
            );
          }}
        >
          {t('palette.showMoreElements', { count: matches.length - limit })}
        </button>
      )}
    </>
  );
  return (
    <Dialog
      className={`element-browser-dialog${fullCatalog ? ' full-catalog-dialog' : ''}`}
      title={t(
        fullCatalog ? 'palette.fullCatalogTitle' : 'palette.browseTitle',
      )}
      onCancel={onCancel}
    >
      {!fullCatalog && (
        <p className="category-selection-description">
          {t('palette.browseDescription')}
        </p>
      )}
      {fullCatalog ? (
        <div className="element-browser-filters">
          {searchField}
          <label className="element-browser-search">
            {t('palette.fullCatalogLibrary')}
            <select
              value={category}
              onChange={(event) => {
                setCategory(
                  event.currentTarget.value as LibraryCategory | 'all',
                );
                resetResults();
              }}
            >
              <option value="all">{t('palette.allLibraries')}</option>
              {libraryCategories
                .filter((id) =>
                  tools.some((kind) => libraryElementKinds[id].includes(kind)),
                )
                .map((id) => (
                  <option value={id} key={id}>
                    {t(`palette.category.${id}`)}
                  </option>
                ))}
            </select>
          </label>
        </div>
      ) : (
        searchField
      )}
      <p role="status" className="category-selection-description">
        {t('palette.results', { count: matches.length })}
      </p>
      {fullCatalog ? (
        <div className="element-browser-results" ref={resultsScroll}>
          {results}
        </div>
      ) : (
        results
      )}
      <div className="dialog-actions">
        <button className="button" type="button" onClick={onCancel}>
          {t('office.close')}
        </button>
      </div>
    </Dialog>
  );
}

export function ShapeCategories({
  locale,
  selected,
  remember,
  onCancel,
  onApply,
}: {
  locale: string;
  selected: readonly LibraryCategory[];
  remember: boolean;
  onCancel: () => void;
  onApply: (categories: LibraryCategory[], remember: boolean) => void;
}) {
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    translate(locale, key, values);
  const [preview, setPreview] = useState<LibraryCategory>(
    selected[0] ?? 'basic',
  );
  const tools = [...shapeKinds, 'freehand' as const].filter((kind) =>
    libraryElementKinds[preview].includes(kind),
  );
  return (
    <Dialog
      className="shape-categories-dialog"
      title={t('palette.categoriesTitle')}
      onCancel={onCancel}
    >
      <p className="category-selection-description">
        {t('palette.categoryDescription')}
      </p>
      <div className="category-selection-actions">
        <button
          className="button"
          type="button"
          onClick={() => onApply([...libraryCategories], remember)}
        >
          {t('palette.selectAllCategories')}
        </button>
        <button
          className="button"
          type="button"
          onClick={() => onApply([], remember)}
        >
          {t('palette.clearCategories')}
        </button>
      </div>
      <div className="category-selection-content">
        <div
          className="category-selection-list"
          role="group"
          aria-label={t('palette.availableCategories')}
        >
          {libraryCategories.map((category) => (
            <label
              key={category}
              className={preview === category ? 'previewed' : ''}
              onMouseEnter={() => setPreview(category)}
              onFocusCapture={() => setPreview(category)}
            >
              <input
                type="checkbox"
                checked={selected.includes(category)}
                onChange={(event) => {
                  setPreview(category);
                  const checked = event.target.checked;
                  onApply(
                    checked
                      ? libraryCategories.filter(
                          (item) =>
                            item === category || selected.includes(item),
                        )
                      : selected.filter((item) => item !== category),
                    remember,
                  );
                }}
              />
              <span>{t(`palette.category.${category}`)}</span>
            </label>
          ))}
        </div>
        <section
          className="category-selection-preview"
          aria-label={t('palette.categoryPreview')}
        >
          <h3>{t(`palette.category.${preview}`)}</h3>
          {tools.length > 48 && (
            <p className="category-selection-description">
              {t('palette.categoryPreviewCount', {
                count: tools.length,
                shown: 48,
              })}
            </p>
          )}
          <ul className="category-preview-grid">
            {tools.slice(0, 48).map((kind) => {
              const name = t(`shape.${kind}` as MessageKey);
              return (
                <li key={kind} title={name}>
                  <ElementGlyph kind={kind} />
                  <span>{name}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <div className="category-selection-footer">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => onApply([...selected], event.target.checked)}
          />
          {t('palette.rememberCategories')}
        </label>
        <p role="status">
          {t('palette.selectedCategories', { count: selected.length })}
        </p>
        <div className="dialog-actions">
          <button className="button" type="button" onClick={onCancel}>
            {t('office.close')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
