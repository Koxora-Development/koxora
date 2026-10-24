import {
  ActionLink,
  Grid,
  Card,
  Note,
  Section,
  SectionHeader,
} from '../components/ui';
import { LocalFirstVisual } from '../components/illustrations';
import { PageIntro } from '../components/page-intro';
import type { PageContext } from '../components/navigation';
import { pathFor } from '../routes';
export function LocalFirstPage({ locale, t }: PageContext) {
  const sections = [
    {
      id: 'storage',
      title: t('localFirst.section.storage.title'),
      body: t('localFirst.section.storage.body'),
    },
    {
      id: 'offline',
      title: t('localFirst.section.offline.title'),
      body: t('localFirst.section.offline.body'),
    },
    {
      id: 'portable',
      title: t('localFirst.section.portable.title'),
      body: t('localFirst.section.portable.body'),
    },
    {
      id: 'boundary',
      title: t('localFirst.section.boundary.title'),
      body: t('localFirst.section.boundary.body'),
    },
    {
      id: 'origin',
      title: t('localFirst.section.origin.title'),
      body: t('localFirst.section.origin.body'),
    },
  ];
  return (
    <>
      <PageIntro
        eyebrow={t('localFirst.hero.eyebrow')}
        title={t('localFirst.hero.title')}
        lead={t('localFirst.hero.lead')}
      />
      <Section id="how">
        <SectionHeader
          title={t('localFirst.how.title')}
          description={t('localFirst.how.description')}
        />
        <div className="split">
          <div className="split-copy">
            <Grid columns={2}>
              {sections.map((entry) => (
                <Card key={entry.id} title={entry.title} body={entry.body} />
              ))}
            </Grid>
          </div>
          <div className="split-figure">
            <LocalFirstVisual />
          </div>
        </div>
      </Section>
      <Section id="backups" tone="panel">
        <SectionHeader title={t('localFirst.warning.title')} />
        <Note tone="warning">
          <p>{t('localFirst.warning.body')}</p>
        </Note>
        <p className="section-link">
          <ActionLink
            href={pathFor('privacyPolicy', locale)}
            label={t('localFirst.link.privacy')}
            variant="secondary"
          />
        </p>
      </Section>
    </>
  );
}
