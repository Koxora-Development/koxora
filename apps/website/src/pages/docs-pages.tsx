import { Bullets, Note, Section, SectionHeader } from '../components/ui';
import { PageIntro } from '../components/page-intro';
import { Screenshot } from '../components/screenshot';
import type { PageContext } from '../components/navigation';
import { pathFor } from '../routes';
import { site } from '../site';
import {
  editingTopics,
  faqEntries,
  projectTopics,
  startSteps,
  type DocsEntry,
} from '../content/docs';
/** One heading and one paragraph per topic, which is what a manual is. */
function Topics({ entries, t }: PageContext & { entries: DocsEntry[] }) {
  return (
    <div className="prose">
      {entries.map((entry) => (
        <section key={entry.titleKey}>
          <h2>{t(entry.titleKey)}</h2>
          <p>{t(entry.bodyKey)}</p>
        </section>
      ))}
    </div>
  );
}
export function DocsStartPage(context: PageContext) {
  const { locale, t } = context;
  return (
    <>
      <PageIntro
        eyebrow={t('docsStart.hero.eyebrow')}
        title={t('docsStart.hero.title')}
        lead={t('docsStart.hero.lead')}
      />
      <Section id="steps">
        <Topics {...context} entries={startSteps} />
      </Section>
      <Section id="screen" tone="panel">
        <Screenshot
          name="docs-dashboard"
          label={t('shot.frameLabel')}
          alt={t('docsStart.shot.alt')}
          caption={t('docsStart.shot.caption')}
        />
      </Section>
      <Section id="warning">
        {/* The first thing a reader needs to know, and the thing a local-first
            product owes them before they trust it with something. */}
        <Note tone="warning" title={t('docsStart.warning.title')}>
          <p>{t('docsStart.warning.body')}</p>
          <p>
            <a href={pathFor('docsProjects', locale)}>
              {t('docs.section.projects.title')}
            </a>
          </p>
        </Note>
      </Section>
    </>
  );
}
export function DocsEditingPage(context: PageContext) {
  const { locale, t } = context;
  return (
    <>
      <PageIntro
        eyebrow={t('docsEditing.hero.eyebrow')}
        title={t('docsEditing.hero.title')}
        lead={t('docsEditing.hero.lead')}
      />
      <Section id="topics">
        <Topics {...context} entries={editingTopics} />
      </Section>
      <Section id="screens" tone="panel">
        <Screenshot
          name={`docs-rich-text-${locale}`}
          label={t('shot.frameLabel')}
          alt={t('docsEditing.rich.alt')}
          caption={t('docsEditing.rich.caption')}
        />
        <Screenshot
          name="docs-properties"
          label={t('shot.frameLabel')}
          alt={t('docsEditing.properties.alt')}
          caption={t('docsEditing.properties.caption')}
        />
        <Screenshot
          name="docs-shortcuts"
          label={t('shot.frameLabel')}
          alt={t('docsEditing.shot.alt')}
          caption={t('docsEditing.shot.caption')}
        />
        <Screenshot
          name={`docs-freehand-${locale}`}
          label={t('shot.frameLabel')}
          alt={t('docsEditing.pen.alt')}
          caption={t('docsEditing.pen.caption')}
        />
      </Section>
      <Section id="limits">
        <Note tone="info" title={t('docsEditing.limits.title')}>
          <p>{t('docsEditing.limits.body')}</p>
          <p>
            <a href={pathFor('features', locale)}>
              {t('docs.section.features.title')}
            </a>
          </p>
        </Note>
      </Section>
    </>
  );
}
export function DocsProjectsPage(context: PageContext) {
  const { locale, t } = context;
  return (
    <>
      <PageIntro
        eyebrow={t('docsProjects.hero.eyebrow')}
        title={t('docsProjects.hero.title')}
        lead={t('docsProjects.hero.lead')}
      />
      <Section id="topics">
        <Topics {...context} entries={projectTopics} />
      </Section>
      <Section id="more" tone="panel">
        <Screenshot
          name={`docs-navigator-${locale}`}
          label={t('shot.frameLabel')}
          alt={t('docsProjects.shot.alt')}
          caption={t('docsProjects.shot.caption')}
        />
        <p className="section-link">
          <a href={pathFor('localFirst', locale)}>
            {t('docs.section.localFirst.title')}
          </a>
        </p>
      </Section>
    </>
  );
}
export function DocsFaqPage({ locale, t }: PageContext) {
  return (
    <>
      <PageIntro
        eyebrow={t('docsFaq.hero.eyebrow')}
        title={t('docsFaq.hero.title')}
        lead={t('docsFaq.hero.lead')}
      />
      <Section id="questions">
        {/* A description list: the question is the term and the answer is the
            description, which is what a screen reader expects of a list of
            questions and what search engines read as one. */}
        <dl className="faq">
          {faqEntries.map((entry) => (
            <div key={entry.titleKey}>
              <dt>{t(entry.titleKey)}</dt>
              <dd>{t(entry.bodyKey)}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="elsewhere" tone="panel">
        <p className="section-link">
          <a href={pathFor('docsSupport', locale)}>
            {t('docs.section.support.title')}
          </a>
        </p>
      </Section>
    </>
  );
}
export function DocsSupportPage({ locale, t }: PageContext) {
  return (
    <>
      <PageIntro
        eyebrow={t('docsSupport.hero.eyebrow')}
        title={t('docsSupport.hero.title')}
        lead={t('docsSupport.hero.lead')}
      />
      <Section id="include">
        <SectionHeader title={t('docsSupport.include.title')} />
        <Bullets
          items={[
            t('docsSupport.include.item1'),
            t('docsSupport.include.item2'),
            t('docsSupport.include.item3'),
            t('docsSupport.include.item4'),
            t('docsSupport.include.item5'),
          ]}
        />
      </Section>
      <Section id="where" tone="panel">
        <SectionHeader title={t('docsSupport.where.title')} />
        <p className="prose-lead">{t('docsSupport.where.body')}</p>
        <ul className="checklist" role="list">
          <li>
            <a href={pathFor('contact', locale)}>{t('nav.contact')}</a>
          </li>
          <li>
            <a href={`mailto:${site.email.support}`}>{site.email.support}</a>
          </li>
          <li>
            <a href={site.issuesUrl} rel="noopener">
              {t('cta.repository')}
            </a>
          </li>
        </ul>
      </Section>
      <Section id="security">
        <Note tone="warning" title={t('docsSupport.security.title')}>
          <p>{t('docsSupport.security.body')}</p>
          <p>
            <a href={site.securityUrl} rel="noopener">
              {t('contact.security.link')}
            </a>
          </p>
        </Note>
      </Section>
      <Section id="expect" tone="panel">
        <SectionHeader title={t('docsSupport.expect.title')} />
        <p className="prose-lead">{t('docsSupport.expect.body')}</p>
      </Section>
    </>
  );
}
