import { DataTable } from './data-table';
import type { PageContext } from './navigation';
import {
  claimStatuses,
  comparisonCheckedOn,
  dimensionGroups,
  dimensions,
  productById,
  products,
  sourceById,
  type Claim,
  type ClaimStatus,
  type Dimension,
  type DimensionId,
  type ProductId,
} from '../content/comparison';
import { formatDate } from '../content/catalog';
import { site } from '../site';
const statusLabelKeys = {
  supported: 'cmp.status.supported',
  limited: 'cmp.status.limited',
  notSupported: 'cmp.status.notSupported',
  planned: 'cmp.status.planned',
  unknown: 'cmp.status.unknown',
  info: 'cmp.status.info',
} as const;
const statusDefinitionKeys = {
  supported: 'cmp.status.supported.definition',
  limited: 'cmp.status.limited.definition',
  notSupported: 'cmp.status.notSupported.definition',
  planned: 'cmp.status.planned.definition',
  unknown: 'cmp.status.unknown.definition',
  info: 'cmp.status.info.definition',
} as const;
/**
 * The answer in one cell: the status in words, the finding, and the sources
 * that say it. The status is text rather than a symbol, because a symbol has
 * to be explained anyway and a screen reader would read the explanation.
 */
function ClaimCell({
  claim,
  product,
  dimension,
  t,
}: PageContext & { claim: Claim; product: ProductId; dimension: DimensionId }) {
  return (
    <td data-product={product} data-status={claim.status}>
      <span className={`claim claim-${claim.status}`}>
        {t(statusLabelKeys[claim.status])}
      </span>
      <span className="claim-note">{t(claim.noteKey)}</span>
      {claim.sources.length > 0 ? (
        <span className="claim-sources">
          {claim.sources.map((id, index) => {
            const source = sourceById(id);
            return (
              <a
                key={id}
                href={source.url}
                rel="noopener nofollow"
                target="_blank"
                // The link text alone would be a bare number, so the full
                // citation is the accessible name.
                aria-label={`${t(statusLabelKeys[claim.status])}: ${source.label}`}
                title={source.label}
              >
                {`[${index + 1}]`}
              </a>
            );
          })}
        </span>
      ) : null}
      <span className="sr-only">{`${t(dimensionLabelKey(dimension))}`}</span>
    </td>
  );
}
function dimensionLabelKey(id: DimensionId) {
  const dimension = dimensions.find((entry) => entry.id === id);
  if (!dimension) throw new Error(`Unknown dimension: ${id}`);
  return dimension.labelKey;
}
/**
 * The comparison table.
 *
 * `rows` and `columns` let a single-product page show the same data narrowed
 * down, so one definition of a claim serves every page that states it. The
 * filter is added by the enhancement script: the markup here is a complete,
 * readable table without it.
 */
export function ComparisonTable({
  context,
  rows = dimensions,
  columns = products.map((product) => product.id),
  filterable = false,
}: {
  context: PageContext;
  rows?: Dimension[];
  columns?: ProductId[];
  filterable?: boolean;
}) {
  const { t } = context;
  return (
    <div
      className="comparison"
      data-comparison
      {...(filterable ? { 'data-comparison-filterable': 'true' } : {})}
    >
      {filterable ? <ComparisonFilter context={context} /> : null}
      <DataTable label={t('cmp.table.caption')} hint={t('a11y.tableScroll')}>
        <caption className="sr-only">{t('cmp.table.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('cmp.table.question')}</th>
            {columns.map((id) => {
              const product = productById(id);
              return (
                <th scope="col" key={id} data-product={id}>
                  <a href={product.url} rel="noopener nofollow" target="_blank">
                    {product.name}
                  </a>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((dimension) => (
            <tr
              key={dimension.id}
              data-dimension={dimension.id}
              data-group={dimension.group}
            >
              <th scope="row">
                <strong>{t(dimension.labelKey)}</strong>
                <span className="table-detail">
                  {t(dimension.descriptionKey)}
                </span>
              </th>
              {columns.map((id) => (
                <ClaimCell
                  key={id}
                  {...context}
                  claim={dimension.claims[id]}
                  product={id}
                  dimension={dimension.id}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
/**
 * Two groups of checkboxes, all checked, inside a real fieldset. Without the
 * enhancement script they are hidden, because a control that does nothing is
 * worse than no control; the table below them is complete either way.
 */
function ComparisonFilter({ context }: { context: PageContext }) {
  const { t } = context;
  return (
    <form className="comparison-filter" data-comparison-filter hidden>
      <fieldset>
        <legend>{t('cmp.filter.topics')}</legend>
        {dimensionGroups.map((group) => (
          <label key={group.id}>
            <input
              type="checkbox"
              name="group"
              value={group.id}
              defaultChecked
            />
            <span>{t(group.labelKey)}</span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t('cmp.filter.products')}</legend>
        {products.map((product) => (
          <label key={product.id}>
            <input
              type="checkbox"
              name="product"
              value={product.id}
              defaultChecked
              // Koxora is the reference column; hiding it would leave a
              // comparison with nothing to compare against.
              {...(product.id === 'koxora' ? { disabled: true } : {})}
            />
            <span>{product.name}</span>
          </label>
        ))}
      </fieldset>
      <div className="comparison-filter-foot">
        <button type="reset" className="action action-secondary">
          {t('cmp.filter.reset')}
        </button>
        <p
          className="comparison-filter-status"
          data-comparison-status
          // The sentence is localized here and the script only fills in the
          // numbers, so no text is assembled in the browser. Passing the
          // placeholders as their own values returns the template itself,
          // which the catalog otherwise refuses to interpolate incompletely.
          data-status-template={t('cmp.filter.status', {
            rows: '{rows}',
            total: '{total}',
            columns: '{columns}',
            products: '{products}',
          })}
          role="status"
          aria-live="polite"
        />
        <p className="muted-note">{t('cmp.filter.hint')}</p>
      </div>
    </form>
  );
}
/** What each status means, in the words the table uses. */
export function ComparisonLegend({ t }: PageContext) {
  return (
    <section className="legend" aria-labelledby="comparison-legend-title">
      <h3 id="comparison-legend-title">{t('cmp.legend.title')}</h3>
      <dl>
        {claimStatuses.map((status: ClaimStatus) => (
          <div key={status}>
            <dt>
              <span className={`claim claim-${status}`}>
                {t(statusLabelKeys[status])}
              </span>
            </dt>
            <dd>{t(statusDefinitionKeys[status])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
/** Every cited page, with the date it was read. */
export function ComparisonSources({ locale, t }: PageContext) {
  const cited = sourcesFor();
  return (
    <section aria-labelledby="comparison-sources-title">
      <h2 id="comparison-sources-title">{t('cmp.sources.title')}</h2>
      <p>{t('cmp.sources.note', { email: site.email.support })}</p>
      <ol className="source-list">
        {cited.map((source, index) => (
          <li key={source.id} id={`source-${index + 1}`}>
            <a href={source.url} rel="noopener nofollow" target="_blank">
              {source.label}
            </a>
            <span className="muted-note">
              {t('cmp.sources.checkedOn', {
                date: formatDate(locale, source.checked),
              })}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
function sourcesFor() {
  const seen = new Set<string>();
  const cited = [];
  for (const dimension of dimensions)
    for (const product of products)
      for (const id of dimension.claims[product.id].sources)
        if (!seen.has(id)) {
          seen.add(id);
          cited.push(sourceById(id));
        }
  return cited;
}
/** The review date, in the reader's language. */
export function ComparisonReviewDate({ locale, t }: PageContext) {
  return (
    <p className="muted-note">
      {t('cmp.checked', { date: formatDate(locale, comparisonCheckedOn) })}
    </p>
  );
}
