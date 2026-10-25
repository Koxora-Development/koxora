import {
  ActionLink,
  Bullets,
  Card,
  Grid,
  Note,
  Section,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { StatusLegend } from '../components/status-legend';
import type { PageContext } from '../components/navigation';
import { PageIntro } from '../components/page-intro';
import { pathFor } from '../routes';
import { featureLimitKeys, featuresByStatus } from '../content/data';
export function FeaturesPage(context: PageContext) {
  const { locale, t } = context;
  const groups = [
    {
      status: 'available' as const,
      tone: 'available' as const,
      label: t('status.available'),
      title: t('features.available.title'),
      description: t('features.available.description'),
    },
    {
      status: 'in-development' as const,
      tone: 'in-development' as const,
      label: t('status.inDevelopment'),
      title: t('features.inDevelopment.title'),
      description: t('features.inDevelopment.description'),
    },
    {
      status: 'planned' as const,
      tone: 'planned' as const,
      label: t('status.planned'),
      title: t('features.planned.title'),
      description: t('features.planned.description'),
    },
  ];
  return (
    <>
      <PageIntro
        eyebrow={t('features.hero.eyebrow')}
        title={t('features.hero.title')}
        lead={t('features.hero.lead')}
      />
      {groups.map((group, index) => (
        <Section
          key={group.status}
          id={group.status}
          tone={index % 2 === 0 ? 'plain' : 'panel'}
        >
          <SectionHeader title={group.title} description={group.description} />
          <Grid columns={3}>
            {featuresByStatus(group.status).map((entry) => (
              <Card
                key={entry.id}
                icon={entry.icon}
                title={t(entry.titleKey)}
                body={t(entry.bodyKey)}
                badge={<StatusBadge tone={group.tone} label={group.label} />}
              />
            ))}
          </Grid>
        </Section>
      ))}
      <Section id="limits">
        <SectionHeader
          title={t('features.limits.title')}
          description={t('features.limits.description')}
        />
        <Note tone="warning">
          <Bullets items={featureLimitKeys.map((key) => t(key))} />
        </Note>
        <StatusLegend {...context} />
        <p className="section-link">
          <ActionLink
            href={pathFor('roadmap', locale)}
            label={t('home.future.link')}
            variant="secondary"
          />
        </p>
      </Section>
    </>
  );
}
