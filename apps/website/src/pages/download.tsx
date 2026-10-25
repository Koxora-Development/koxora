import {
  ActionLink,
  Bullets,
  Note,
  Section,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { PageIntro } from '../components/page-intro';
import { studioLink, type PageContext } from '../components/navigation';
import { plannedDownloadKeys } from '../content/data';
import { site } from '../site';
export function DownloadPage({ locale, t }: PageContext) {
  const cta = studioLink(locale, t);
  return (
    <>
      <PageIntro
        eyebrow={t('download.hero.eyebrow')}
        title={t('download.hero.title')}
        lead={t('download.hero.lead')}
      />
      <Section id="today">
        <SectionHeader
          title={t('download.today.title')}
          description={t('download.today.body')}
        />
        <p className="badge-row">
          <StatusBadge
            tone="in-development"
            label={t('status.inDevelopment')}
          />
        </p>
        <div className="hero-actions">
          <ActionLink
            href={site.editorUrl ?? site.repositoryUrl}
            label={site.editorUrl ? cta.label : t('cta.repository')}
            variant="primary"
            hint={cta.hint}
            external
          />
        </div>
      </Section>
      <Section id="source" tone="panel">
        <SectionHeader
          title={t('download.source.title')}
          description={t('download.source.body')}
        />
        <p className="section-link">
          <ActionLink
            href={`${site.repositoryUrl}/blob/main/docs/development/foundation.md`}
            label={t('download.source.link')}
            variant="secondary"
            external
          />
        </p>
      </Section>
      <Section id="planned">
        <SectionHeader
          title={t('download.planned.title')}
          description={t('download.planned.body')}
        />
        <p className="badge-row">
          <StatusBadge tone="planned" label={t('status.planned')} />
        </p>
        <Bullets items={plannedDownloadKeys.map((key) => t(key))} />
        <Note tone="info" title={t('download.noFake.title')}>
          <p>{t('download.noFake.body')}</p>
        </Note>
      </Section>
    </>
  );
}
