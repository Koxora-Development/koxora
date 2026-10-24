import {
  ActionLink,
  Grid,
  Card,
  Note,
  Section,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { PageIntro } from '../components/page-intro';
import type { PageContext } from '../components/navigation';
import { pathFor } from '../routes';
import { comparisonFocus, comparisonMethod, peers } from '../content/data';
export function ComparePage({ locale, t }: PageContext) {
  return (
    <>
      <PageIntro
        eyebrow={t('compare.hero.eyebrow')}
        title={t('compare.hero.title')}
        lead={t('compare.hero.lead')}
      />
      <Section id="state">
        <Note tone="info" title={t('compare.state.title')}>
          <p>{t('compare.state.body')}</p>
          <p className="badge-row">
            <StatusBadge tone="preparation" label={t('status.inPreparation')} />
          </p>
        </Note>
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
      </Section>
      <Section id="peers">
        <SectionHeader
          title={t('compare.peers.title')}
          description={t('compare.peers.note')}
        />
        <ul className="peer-list peer-list-wide">
          {peers.map((peer) => (
            <li key={peer.id}>
              <strong>
                <a href={peer.url} rel="noopener nofollow" target="_blank">
                  {t(peer.nameKey)}
                </a>
              </strong>
              <span>{t(peer.bodyKey)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="focus" tone="panel">
        <SectionHeader title={t('home.compare.focusTitle')} />
        <ul className="checklist">
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
    </>
  );
}
