import {
  ActionLink,
  Bullets,
  Section,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { PageIntro } from '../components/page-intro';
import type { PageContext } from '../components/navigation';
import { milestones, milestoneUrl, plannedReleaseKeys } from '../content/data';
import { site } from '../site';
export function ReleasesPage({ t }: PageContext) {
  return (
    <>
      <PageIntro
        eyebrow={t('releases.hero.eyebrow')}
        title={t('releases.hero.title')}
        lead={t('releases.hero.lead')}
      />
      <Section id="milestones">
        <SectionHeader
          title={t('releases.milestones.title')}
          description={t('releases.milestones.description')}
        />
        <ul className="milestone-list" role="list">
          {milestones.map((milestone) => (
            <li key={milestone.id}>
              <p className="milestone-phase">{milestone.phase}</p>
              <div>
                <h3>
                  <a href={milestoneUrl(milestone)} rel="noopener">
                    {t(milestone.titleKey)}
                  </a>
                </h3>
                <p>{t(milestone.bodyKey)}</p>
              </div>
              <p className="milestone-state">{t('phase.state.done')}</p>
            </li>
          ))}
        </ul>
        <p className="section-link">
          <ActionLink
            href={`${site.repositoryUrl}/commits/main`}
            label={t('releases.link')}
            variant="secondary"
            external
          />
        </p>
      </Section>
      <Section id="planned" tone="panel">
        <SectionHeader title={t('releases.planned.title')} />
        <p className="badge-row">
          <StatusBadge tone="planned" label={t('status.planned')} />
        </p>
        <Bullets items={plannedReleaseKeys.map((key) => t(key))} />
      </Section>
    </>
  );
}
