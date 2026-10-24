import { Screenshot } from '../components/screenshot';
import {
  CollaborationConcept,
  LocalFirstVisual,
} from '../components/illustrations';
import {
  ActionLink,
  Card,
  Grid,
  Note,
  Section,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { StatusLegend } from '../components/status-legend';
import { studioLink, type PageContext } from '../components/navigation';
import { pathFor } from '../routes';
import { formatDate } from '../content/catalog';
import {
  comparisonFocus,
  featuresByStatus,
  peers,
  phases,
} from '../content/data';
import { site } from '../site';
export function HomePage(context: PageContext) {
  const { locale, t } = context;
  const cta = studioLink(locale, t);
  const reviewed = formatDate(locale, site.contentDate);
  const highlights = featuresByStatus('available').filter(
    (entry) => entry.highlight,
  );
  const building = featuresByStatus('in-development');
  const planned = featuresByStatus('planned').filter(
    (entry) => entry.highlight,
  );
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">{t('home.hero.eyebrow')}</p>
          <h1>
            {t('home.hero.title')}{' '}
            <span className="gradient">{t('home.hero.titleAccent')}</span>
          </h1>
          <p className="lead">{t('home.hero.lead')}</p>
          <div className="hero-actions">
            <ActionLink
              href={cta.href}
              label={cta.label}
              variant="primary"
              external={cta.external}
            />
            <ActionLink
              href={pathFor('roadmap', locale)}
              label={t('cta.roadmap')}
              variant="quiet"
            />
          </div>
          <p className="hero-note">{t('home.hero.note')}</p>
          <dl className="status-strip">
            <div>
              <dt>{t('project.statusTitle')}</dt>
              <dd>{t('project.statusSummary')}</dd>
            </div>
            <div>
              <dt>{t('project.statusMilestone')}</dt>
              <dd>{t('project.statusMilestoneValue')}</dd>
            </div>
          </dl>
        </div>
      </section>

      <Section id="preview">
        <SectionHeader
          kicker={t('home.preview.title')}
          title={t('home.preview.heading')}
          description={t('home.preview.description')}
        />
        <Screenshot
          name="editor-dark"
          alt={t('home.preview.altDark')}
          caption={t('home.preview.caption', { date: reviewed })}
          priority
        />
        <div className="shot-row">
          <Screenshot
            name="editor-light"
            alt={t('home.preview.altLight')}
            caption={t('home.preview.tabLight')}
          />
          <Screenshot
            name={`editor-small-${locale}`}
            alt={t('home.preview.altMobile')}
            caption={t('home.preview.tabMobile')}
          />
        </div>
      </Section>

      <Section id="features" tone="panel">
        <SectionHeader
          kicker={t('home.features.kicker')}
          title={t('home.features.title')}
          description={t('home.features.description')}
        />
        <Grid columns={3}>
          {highlights.map((entry) => (
            <Card
              key={entry.id}
              icon={entry.icon}
              title={t(entry.titleKey)}
              body={t(entry.bodyKey)}
              badge={
                <StatusBadge tone="available" label={t('status.available')} />
              }
            />
          ))}
        </Grid>
        <p className="section-link">
          <ActionLink
            href={pathFor('features', locale)}
            label={t('home.features.link')}
            variant="secondary"
          />
        </p>
      </Section>

      <Section id="local-first">
        <div className="split">
          <div className="split-copy">
            <SectionHeader
              kicker={t('home.local.kicker')}
              title={t('home.local.title')}
              description={t('home.local.description')}
            />
            <Grid columns={2}>
              <Card
                title={t('home.local.point1.title')}
                body={t('home.local.point1.body')}
              />
              <Card
                title={t('home.local.point2.title')}
                body={t('home.local.point2.body')}
              />
              <Card
                title={t('home.local.point3.title')}
                body={t('home.local.point3.body')}
              />
              <Card
                title={t('home.local.point4.title')}
                body={t('home.local.point4.body')}
              />
            </Grid>
            <p className="section-link">
              <ActionLink
                href={pathFor('localFirst', locale)}
                label={t('home.local.link')}
                variant="secondary"
              />
            </p>
          </div>
          <div className="split-figure">
            <LocalFirstVisual />
          </div>
        </div>
      </Section>

      <Section id="future" tone="panel">
        <SectionHeader
          kicker={t('home.future.kicker')}
          title={t('home.future.title')}
          description={t('home.future.description')}
        />
        <Grid columns={3}>
          {building.map((entry) => (
            <Card
              key={entry.id}
              icon={entry.icon}
              title={t(entry.titleKey)}
              body={t(entry.bodyKey)}
              badge={
                <StatusBadge
                  tone="in-development"
                  label={t('status.inDevelopment')}
                />
              }
            />
          ))}
        </Grid>
        <Grid columns={3}>
          {planned.map((entry) => (
            <Card
              key={entry.id}
              icon={entry.icon}
              title={t(entry.titleKey)}
              body={t(entry.bodyKey)}
              badge={<StatusBadge tone="planned" label={t('status.planned')} />}
            />
          ))}
        </Grid>
        <figure className="concept">
          <div className="concept-art">
            <p className="concept-badge">
              <StatusBadge tone="concept" label={t('status.concept')} />
            </p>
            <CollaborationConcept />
          </div>
          <figcaption>{t('home.future.conceptCaption')}</figcaption>
        </figure>
        <StatusLegend {...context} />
        <p className="section-link">
          <ActionLink
            href={pathFor('roadmap', locale)}
            label={t('home.future.link')}
            variant="secondary"
          />
        </p>
      </Section>

      <Section id="compare">
        <SectionHeader
          kicker={t('home.compare.kicker')}
          title={t('home.compare.title')}
          description={t('home.compare.description')}
        />
        <div className="compare-layout">
          <div>
            <h3 className="minor-heading">{t('home.compare.focusTitle')}</h3>
            <ul className="checklist" role="list">
              {comparisonFocus.map((entry) => (
                <li key={entry.titleKey}>
                  <strong>{t(entry.titleKey)}</strong>
                  <span>{t(entry.bodyKey)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="minor-heading">{t('home.compare.peersTitle')}</h3>
            <ul className="peer-list" role="list">
              {peers.map((peer) => (
                <li key={peer.id}>
                  <strong>{t(peer.nameKey)}</strong>
                  <span>{t(peer.bodyKey)}</span>
                </li>
              ))}
            </ul>
            <p className="muted-note">{t('home.compare.peersNote')}</p>
          </div>
        </div>
        <Note tone="info">
          <p>{t('home.compare.methodology')}</p>
        </Note>
        <p className="section-link">
          <ActionLink
            href={pathFor('compare', locale)}
            label={t('home.compare.link')}
            variant="secondary"
          />
        </p>
      </Section>

      <Section id="roadmap" tone="panel">
        <SectionHeader
          kicker={t('home.roadmap.kicker')}
          title={t('home.roadmap.title')}
          description={t('home.roadmap.description')}
        />
        <ol className="phase-list phase-list-compact" role="list">
          {phases.map((phase) => (
            <li key={phase.id} className={`phase phase-${phase.state}`}>
              <p className="phase-state">{t(`phase.state.${phase.state}`)}</p>
              <h3>{t(phase.titleKey)}</h3>
              <p>{t(phase.bodyKey)}</p>
            </li>
          ))}
        </ol>
        <p className="section-link">
          <ActionLink
            href={pathFor('roadmap', locale)}
            label={t('home.roadmap.link')}
            variant="secondary"
          />
        </p>
      </Section>

      <Section id="structure">
        <SectionHeader
          kicker={t('home.structure.kicker')}
          title={t('home.structure.title')}
          description={t('home.structure.description')}
        />
        <Grid columns={3}>
          <Card
            icon="file"
            title={t('nav.docs')}
            body={t('structure.docs.body')}
            badge={
              <StatusBadge
                tone="preparation"
                label={t('status.inPreparation')}
              />
            }
          >
            <ActionLink
              href={pathFor('docs', locale)}
              label={t('cta.moreAbout', { topic: t('nav.docs') })}
              variant="quiet"
            />
          </Card>
          <Card
            icon="export"
            title={t('nav.download')}
            body={t('structure.download.body')}
            badge={
              <StatusBadge
                tone="preparation"
                label={t('status.inPreparation')}
              />
            }
          >
            <ActionLink
              href={pathFor('download', locale)}
              label={t('cta.moreAbout', { topic: t('nav.download') })}
              variant="quiet"
            />
          </Card>
          <Card
            icon="history"
            title={t('nav.releases')}
            body={t('structure.releases.body')}
            badge={
              <StatusBadge
                tone="preparation"
                label={t('status.inPreparation')}
              />
            }
          >
            <ActionLink
              href={pathFor('releases', locale)}
              label={t('cta.moreAbout', { topic: t('nav.releases') })}
              variant="quiet"
            />
          </Card>
        </Grid>
      </Section>

      <Section id="follow" tone="panel">
        <SectionHeader
          kicker={t('home.cta.kicker')}
          title={t('home.cta.title')}
          description={t('home.cta.description')}
          align="center"
        />
        <div className="hero-actions hero-actions-center">
          <ActionLink
            href={site.repositoryUrl}
            label={t('cta.repository')}
            variant="primary"
            external
          />
          <ActionLink
            href={pathFor('features', locale)}
            label={t('cta.features')}
            variant="quiet"
          />
        </div>
        <p className="muted-note center">
          {t('project.statusUpdated', { date: reviewed })}
        </p>
      </Section>
    </>
  );
}
