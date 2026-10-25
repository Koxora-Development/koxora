import { Bullets, Note, Section } from '../components/ui';
import { DataTable } from '../components/data-table';
import { PageIntro } from '../components/page-intro';
import type { PageContext } from '../components/navigation';
import { operator, privacyPolicyVersion } from '../content/legal';
import { consentPromptRequired, deviceStorageItems } from '../content/consent';
import { noTrackingKeys } from '../content/data';
import { formatDate } from '../content/catalog';
import { pathFor } from '../routes';
import { site } from '../site';
import { showsInternalReviewNotes } from '../content/launch';
export function PrivacyPolicyPage({ locale, t }: PageContext) {
  const updated = formatDate(locale, site.contentDate);
  const stored = deviceStorageItems();
  return (
    <>
      <PageIntro
        eyebrow={t('privacyPolicy.hero.eyebrow')}
        title={t('privacyPolicy.hero.title')}
        lead={t('privacyPolicy.hero.lead')}
      />
      <Section>
        <article className="prose">
          <p className="muted-note">
            {t('privacyPolicy.version', {
              version: privacyPolicyVersion,
              date: updated,
            })}
          </p>
          {/* Addressed to the operator while the site is unpublished: it says
              the text has not been checked against the deployed services. A
              published build carries the version and the review date instead,
              and the page emitter refuses to publish this wording. */}
          {showsInternalReviewNotes() ? (
            <Note tone="warning" title={t('privacyPolicy.draft.title')}>
              <p>{t('privacyPolicy.draft.body')}</p>
            </Note>
          ) : null}
          <section>
            <h2>{t('privacyPolicy.scope.title')}</h2>
            <p>{t('privacyPolicy.scope.body')}</p>
          </section>
          <section>
            <h2>{t('privacyPolicy.controller.title')}</h2>
            <p>{t('privacyPolicy.controller.body')}</p>
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
            <p>
              {t('privacyPolicy.controller.contact', {
                email: site.email.privacy,
              })}
            </p>
          </section>
          <section>
            <h2>{t('privacyPolicy.principles.title')}</h2>
            <p>{t('privacyPolicy.principles.body')}</p>
          </section>
          <section>
            <h2>{t('privacyPolicy.logs.title')}</h2>
            <p>{t('privacyPolicy.logs.body')}</p>
            <p>{t('privacyPolicy.logs.basis')}</p>
          </section>
          <section>
            <h2>{t('privacyPolicy.hosting.title')}</h2>
            <p>{t('privacyPolicy.hosting.body')}</p>
            <p>{t('privacyPolicy.hosting.transfer')}</p>
          </section>
          <section>
            <h2>{t('privacyPolicy.device.title')}</h2>
            <p>{t('privacyPolicy.device.body')}</p>
            <DataTable
              label={t('privacyPolicy.device.title')}
              hint={t('a11y.tableScroll')}
            >
              <thead>
                <tr>
                  <th scope="col">{t('consent.dialog.purpose')}</th>
                  <th scope="col">{t('consent.dialog.storage')}</th>
                  <th scope="col">{t('consent.dialog.legalBasis')}</th>
                </tr>
              </thead>
              <tbody>
                {stored.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{t(item.nameKey)}</strong>
                      <span className="table-detail">{t(item.purposeKey)}</span>
                    </td>
                    <td>{t(item.storageKey)}</td>
                    <td>{t(item.legalBasisKey)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <p>
              {consentPromptRequired()
                ? t('privacyPolicy.device.note.optional')
                : t('privacyPolicy.device.note')}
            </p>
            <p>
              <a href={pathFor('privacySettings', locale)}>
                {t('consent.openSettings')}
              </a>
            </p>
          </section>
          <section>
            <h2>{t('privacyPolicy.studio.title')}</h2>
            <p>{t('privacyPolicy.studio.body')}</p>
            <p>{t('privacyPolicy.studio.control')}</p>
            <p>{t('privacyPolicy.studio.desktop')}</p>
          </section>
          <section>
            <h2>{t('privacyPolicy.contactForm.title')}</h2>
            <p>{t('privacyPolicy.contactForm.body')}</p>
            {/* The form's own processing is described only where a form
                exists. A deployment without a delivery service shows the
                email paragraphs alone, because that is all it does. */}
            {site.contactEndpoint ? (
              <>
                <p>{t('privacyPolicy.contactForm.form')}</p>
                <p>{t('privacyPolicy.contactForm.storage')}</p>
                <p>{t('privacyPolicy.contactForm.logs')}</p>
                <p>{t('privacyPolicy.contactForm.accepted')}</p>
              </>
            ) : null}
            <p>{t('privacyPolicy.contactForm.basis')}</p>
          </section>
          <section>
            <h2>{t('privacyPolicy.noTracking.title')}</h2>
            <Bullets items={noTrackingKeys.map((key) => t(key))} />
          </section>
          <section>
            <h2>{t('privacyPolicy.future.title')}</h2>
            <p>{t('privacyPolicy.future.body')}</p>
          </section>
          <section>
            <h2>{t('privacyPolicy.rights.title')}</h2>
            <p>{t('privacyPolicy.rights.body')}</p>
            <p>
              {t('privacyPolicy.rights.contact', { email: site.email.privacy })}
            </p>
          </section>
          <section>
            <h2>{t('privacyPolicy.authority.title')}</h2>
            <p>{t('privacyPolicy.authority.body')}</p>
            <address>
              {t('privacyPolicy.authority.name')}
              <br />
              {t('privacyPolicy.authority.address')}
            </address>
          </section>
          <section>
            <h2>{t('privacyPolicy.changes.title')}</h2>
            <p>{t('privacyPolicy.changes.body')}</p>
          </section>
        </article>
      </Section>
    </>
  );
}
