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
import type { PageContext } from '../components/navigation';
import {
  plannedDocsKeys,
  repositoryDocuments,
  repositoryUrl,
} from '../content/data';
import { site } from '../site';
export function DocsPage({ t }: PageContext) {
  return (
    <>
      <PageIntro
        eyebrow={t('docs.hero.eyebrow')}
        title={t('docs.hero.title')}
        lead={t('docs.hero.lead')}
      />
      <Section id="repository">
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
      <Section id="planned" tone="panel">
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
