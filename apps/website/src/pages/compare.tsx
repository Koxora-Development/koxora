import {
  ActionLink,
  Card,
  Grid,
  Note,
  Section,
  SectionHeader,
} from '../components/ui';
import { PageIntro } from '../components/page-intro';
import {
  ComparisonLegend,
  ComparisonReviewDate,
  ComparisonSources,
  ComparisonTable,
} from '../components/comparison';
import type { PageContext } from '../components/navigation';
import { pathFor, type RouteId } from '../routes';
import { comparisonFocus, comparisonMethod } from '../content/data';
import { comparisonPages, productById } from '../content/comparison';
/** The route of the page that compares Koxora with one named product. */
const comparisonRouteFor: Record<string, RouteId> = {
  drawio: 'compareDrawio',
  miro: 'compareMiro',
  lucidchart: 'compareLucidchart',
};
export function ComparePage(context: PageContext) {
  const { locale, t } = context;
  return (
    <>
      <PageIntro
        eyebrow={t('compare.hero.eyebrow')}
        title={t('compare.hero.title')}
        lead={t('compare.hero.lead')}
      />
      <Section id="products">
        <SectionHeader
          title={t('compare.peers.title')}
          description={t('compare.peers.note')}
        />
        <ComparisonReviewDate {...context} />
        <ul className="peer-list peer-list-wide" role="list">
          {comparisonProducts().map((product) => (
            <li key={product.id}>
              <strong>
                <a href={product.url} rel="noopener nofollow" target="_blank">
                  {product.name}
                </a>
              </strong>
              <span>{t(product.descriptionKey)}</span>
              <span className="muted-note">{t(product.examinedKey)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="table" tone="panel">
        <SectionHeader
          title={t('cmp.table.title')}
          description={t('cmp.table.description')}
        />
        <ComparisonTable context={context} filterable />
        <ComparisonLegend {...context} />
      </Section>
      <Section id="tools">
        <SectionHeader
          title={t('cmp.pages.title')}
          description={t('cmp.pages.note')}
        />
        <Grid columns={3}>
          {comparisonPages.map((page) => {
            const product = productById(page.product);
            const route = comparisonRouteFor[page.product]!;
            const title = t(`cmp.page.${page.product}.hero.title` as never);
            return (
              <Card
                key={page.product}
                title={title}
                body={t(product.descriptionKey)}
              >
                <p className="section-link">
                  <ActionLink
                    href={pathFor(route, locale)}
                    label={title}
                    variant="secondary"
                  />
                </p>
              </Card>
            );
          })}
        </Grid>
      </Section>
      <Section id="method" tone="panel">
        <SectionHeader title={t('compare.method.title')} />
        <Grid columns={2}>
          {comparisonMethod.map((entry) => (
            <Card
              key={entry.titleKey}
              title={t(entry.titleKey)}
              body={t(entry.bodyKey)}
            />
          ))}
        </Grid>
        <Note tone="info" title={t('cmp.disclaimer.title')}>
          <p>{t('cmp.disclaimer.body')}</p>
        </Note>
      </Section>
      <Section id="focus">
        <SectionHeader title={t('home.compare.focusTitle')} />
        <ul className="checklist" role="list">
          {comparisonFocus.map((entry) => (
            <li key={entry.titleKey}>
              <strong>{t(entry.titleKey)}</strong>
              <span>{t(entry.bodyKey)}</span>
            </li>
          ))}
        </ul>
        <p className="section-link">
          <ActionLink
            href={pathFor('features', locale)}
            label={t('cta.features')}
            variant="secondary"
          />
        </p>
      </Section>
      <Section id="sources" tone="panel">
        <ComparisonSources {...context} />
        <ComparisonReviewDate {...context} />
      </Section>
    </>
  );
}
function comparisonProducts() {
  return [
    productById('koxora'),
    ...comparisonPages.map((page) => productById(page.product)),
    productById('excalidraw'),
    productById('visio'),
  ].filter(
    (product, index, all) =>
      all.findIndex((other) => other.id === product.id) === index,
  );
}
