import {
  ActionLink,
  Bullets,
  Grid,
  Card,
  Section,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { PageIntro } from '../components/page-intro';
import { StatusLegend } from '../components/status-legend';
import { docsSections } from '../content/docs';
import { pathFor } from '../routes';
import type { PageContext } from '../components/navigation';
import {
  plannedDocsKeys,
  repositoryDocuments,
  repositoryUrl,
} from '../content/data';
import { site } from '../site';
const statusTones = {
  available: 'available',
  inDevelopment: 'in-development',
  planned: 'planned',
} as const;
const statusLabels = {
  available: 'status.available',
  inDevelopment: 'status.inDevelopment',
  planned: 'status.planned',
} as const;
export function DocsPage(context: PageContext) {
  const { locale, t } = context;
  return (
    <>
      <PageIntro
        eyebrow={t('docs.hero.eyebrow')}
        title={t('docs.hero.title')}
        lead={t('docs.hero.lead')}
      />
      <Section id="sections">
        <SectionHeader
          title={t('docs.hub.title')}
          description={t('docs.hub.note')}
        />
        {/* Each section says which state it describes, with the labels the
            rest of this site uses; the legend repeats what they mean. */}
        <Grid columns={2}>
          {docsSections.map((section) => (
            <Card
              key={section.route}
              title={t(section.titleKey)}
              body={t(section.summaryKey)}
              badge={
                <StatusBadge
                  tone={statusTones[section.status]}
                  label={t(statusLabels[section.status])}
                />
              }
            >
              <ActionLink
                href={pathFor(section.route, locale)}
                label={t(section.titleKey)}
                variant="quiet"
              />
            </Card>
          ))}
        </Grid>
        <StatusLegend {...context} />
      </Section>
      <Section id="repository" tone="panel">
        <SectionHeader title={t('docs.available.title')} />
        <Grid columns={4}>
          {repositoryDocuments.map((document) => (
            <Card key={document.id} title={t(document.labelKey)}>
              <ActionLink
                href={repositoryUrl(document)}
                label={t('cta.more')}
                variant="quiet"
                external
              />
            </Card>
          ))}
        </Grid>
      </Section>
      <Section id="planned">
        <SectionHeader
          title={t('docs.planned.title')}
          description={t('docs.planned.body')}
        />
        <p className="badge-row">
          <StatusBadge tone="preparation" label={t('status.inPreparation')} />
        </p>
        <Bullets items={plannedDocsKeys.map((key) => t(key))} />
        <p className="section-link">
          <ActionLink
            href={site.repositoryUrl}
            label={t('cta.repository')}
            variant="secondary"
            external
          />
        </p>
      </Section>
    </>
  );
}
