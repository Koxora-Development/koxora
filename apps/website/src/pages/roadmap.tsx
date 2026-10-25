import { ActionLink, Note, Section, SectionHeader } from '../components/ui';
import { StatusLegend } from '../components/status-legend';
import { PageIntro } from '../components/page-intro';
import type { PageContext } from '../components/navigation';
import { milestones, milestoneUrl, phases } from '../content/data';
import { launchCopy } from '../content/launch';
import { site } from '../site';
export function RoadmapPage(context: PageContext) {
  const { t } = context;
  return (
    <>
      <PageIntro
        eyebrow={t('roadmap.hero.eyebrow')}
        title={t('roadmap.hero.title')}
        lead={t('roadmap.hero.lead')}
      />
      <Section id="now">
        <SectionHeader
          title={t('roadmap.now.title')}
          description={t(launchCopy().statusSummary)}
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
        <p className="muted-note">{t('releases.milestones.description')}</p>
      </Section>
      <Section id="phases" tone="panel">
        <SectionHeader
          title={t('roadmap.phases.title')}
          description={t('roadmap.phases.description')}
        />
        <ol className="phase-list" role="list">
          {phases.map((phase) => (
            <li key={phase.id} className={`phase phase-${phase.state}`}>
              <p className="phase-state">{t(`phase.state.${phase.state}`)}</p>
              <h3>{t(phase.titleKey)}</h3>
              <p>{t(phase.bodyKey)}</p>
            </li>
          ))}
        </ol>
        <StatusLegend {...context} />
      </Section>
      <Section id="disclaimer">
        <Note tone="warning" title={t('roadmap.disclaimer.title')}>
          <p>{t('roadmap.disclaimer.body')}</p>
        </Note>
        <SectionHeader
          title={t('roadmap.participate.title')}
          description={t('roadmap.participate.body')}
        />
        <div className="hero-actions">
          <ActionLink
            href={site.issuesUrl}
            label={t('footer.issues')}
            variant="primary"
            external
          />
          <ActionLink
            href={site.repositoryUrl}
            label={t('cta.repository')}
            variant="quiet"
            external
          />
        </div>
      </Section>
    </>
  );
}
