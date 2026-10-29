import { Note, Section, SectionHeader } from '../components/ui';
import { PageIntro } from '../components/page-intro';
import {
  ComparisonLegend,
  ComparisonReviewDate,
  ComparisonSources,
  ComparisonTable,
} from '../components/comparison';
import type { PageContext } from '../components/navigation';
import { pathFor } from '../routes';
import {
  comparisonPages,
  dimensionById,
  productById,
  type ProductId,
} from '../content/comparison';
import type { MessageKey } from '../content/catalog';
/**
 * One page per compared product. The answers are the same claims the full
 * table states, narrowed to two columns, so a statement exists once and
 * cannot differ between the two pages that make it.
 *
 * Each page credits what the other product does well before it says what
 * Koxora does differently, and ends with task-based guidance rather than a
 * verdict: the two tools are built for different situations, and the reader
 * knows their own situation better than this page does.
 */
export function comparisonPage(product: Exclude<ProductId, 'koxora'>) {
  const page = comparisonPages.find((entry) => entry.product === product);
  if (!page) throw new Error(`No comparison page for ${product}`);
  const highlight = page.highlight;
  const key = (suffix: string) => `cmp.page.${product}.${suffix}` as MessageKey;
  function ComparisonProductPage(context: PageContext) {
    const { locale, t } = context;
    const other = productById(product);
    return (
      <>
        <PageIntro
          eyebrow={t('cmp.page.hero.eyebrow')}
          title={t(key('hero.title'))}
          lead={t(key('hero.lead'))}
        />
        <Section id="strengths">
          <SectionHeader
            title={t('cmp.page.strengths.title', { product: other.name })}
          />
          <p className="prose-lead">{t(key('strengths.body'))}</p>
          <p className="muted-note">{t(other.examinedKey)}</p>
        </Section>
        <Section id="koxora" tone="panel">
          <SectionHeader title={t('cmp.page.koxora.title')} />
          <p className="prose-lead">{t(key('koxora.body'))}</p>
          <p className="muted-note">{t(productById('koxora').examinedKey)}</p>
        </Section>
        <Section id="table">
          <SectionHeader title={t('cmp.page.table.title')} />
          <ComparisonReviewDate {...context} />
          <ComparisonTable
            context={context}
            rows={highlight.map((id) => dimensionById(id))}
            columns={['koxora', product]}
          />
          <ComparisonLegend {...context} />
          <p className="section-link">
            <a href={pathFor('compare', locale)}>{t('cmp.page.full')}</a>
          </p>
        </Section>
        <Section id="choose" tone="panel">
          <SectionHeader title={t('cmp.page.choose.title')} />
          <ul className="checklist" role="list">
            <li>
              <strong>
                {t('cmp.page.chooseOther', { product: other.name })}
              </strong>
              <span>{t(key('chooseOther'))}</span>
            </li>
            <li>
              <strong>{t('cmp.page.chooseKoxora')}</strong>
              <span>{t(key('chooseKoxora'))}</span>
            </li>
          </ul>
          <Note tone="info" title={t('cmp.disclaimer.title')}>
            <p>{t('cmp.disclaimer.body')}</p>
          </Note>
        </Section>
        <Section id="sources">
          <ComparisonSources {...context} />
        </Section>
      </>
    );
  }
  return ComparisonProductPage;
}
