import { Section } from '../components/ui';
import { PageIntro } from '../components/page-intro';
import type { PageContext } from '../components/navigation';
import { operator } from '../content/legal';
import { site } from '../site';
export function LegalNoticePage({ t }: PageContext) {
  const sections = [
    {
      id: 'editorial',
      title: t('legalNotice.editorial.title'),
      body: t('legalNotice.editorial.body'),
    },
    {
      id: 'vat',
      title: t('legalNotice.vat.title'),
      body: t('legalNotice.vat.body'),
    },
    {
      id: 'dispute',
      title: t('legalNotice.dispute.title'),
      body: t('legalNotice.dispute.body'),
    },
    {
      id: 'liability',
      title: t('legalNotice.liability.title'),
      body: t('legalNotice.liability.body'),
    },
    {
      id: 'links',
      title: t('legalNotice.links.title'),
      body: t('legalNotice.links.body'),
    },
    {
      id: 'copyright',
      title: t('legalNotice.copyright.title'),
      body: t('legalNotice.copyright.body'),
    },
    {
      id: 'project',
      title: t('legalNotice.project.title'),
      body: t('legalNotice.project.body'),
    },
  ];
  const contacts = [
    {
      id: 'legal',
      label: t('legalNotice.contact.legal'),
      email: site.email.legal,
    },
    {
      id: 'privacy',
      label: t('legalNotice.contact.privacy'),
      email: site.email.privacy,
    },
    {
      id: 'support',
      label: t('legalNotice.contact.support'),
      email: site.email.support,
    },
  ];
  return (
    <>
      <PageIntro
        eyebrow={t('legalNotice.hero.eyebrow')}
        title={t('legalNotice.hero.title')}
        lead={t('legalNotice.hero.lead')}
      />
      <Section>
        <article className="prose">
          <section>
            <h2>{t('legalNotice.provider.title')}</h2>
            <address>
              {operator.name}
              <br />
              {operator.careOf}
              <br />
              {operator.street}
              <br />
              {operator.city}
              <br />
              {t('address.country')}
            </address>
            <p className="muted-note">{t('legalNotice.provider.note')}</p>
          </section>
          <section>
            <h2>{t('legalNotice.contact.title')}</h2>
            <p>{t('legalNotice.contact.body')}</p>
            <dl className="definitions">
              {contacts.map((contact) => (
                <div className="definition" key={contact.id}>
                  <dt>{contact.label}</dt>
                  <dd>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          {sections.map((entry) => (
            <section key={entry.id}>
              <h2>{entry.title}</h2>
              <p>{entry.body}</p>
            </section>
          ))}
        </article>
      </Section>
    </>
  );
}
