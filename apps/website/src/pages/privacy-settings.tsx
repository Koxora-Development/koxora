import { Note, Section, SectionHeader } from '../components/ui';
import { ConsentManager } from '../components/consent-ui';
import { PageIntro } from '../components/page-intro';
import type { PageContext } from '../components/navigation';
import { consentCategories } from '../content/consent';
import { pathFor } from '../routes';
export function PrivacySettingsPage(context: PageContext) {
  const { locale, t } = context;
  const necessary = consentCategories.find(
    (category) => category.id === 'necessary',
  );
  return (
    <>
      <PageIntro
        eyebrow={t('privacySettings.hero.eyebrow')}
        title={t('privacySettings.hero.title')}
        lead={t('privacySettings.hero.lead')}
      />
      <Section id="settings">
        <SectionHeader title={t('privacySettings.current.title')} />
        <ConsentManager locale={locale} t={t} />
      </Section>
      <Section id="inventory" tone="panel">
        <SectionHeader title={t('privacySettings.inventory.title')} />
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{t('consent.dialog.purpose')}</th>
              <th scope="col">{t('consent.dialog.provider')}</th>
              <th scope="col">{t('consent.dialog.storage')}</th>
            </tr>
          </thead>
          <tbody>
            {(necessary?.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{t(item.nameKey)}</strong>
                  <span className="table-detail">{t(item.purposeKey)}</span>
                </td>
                <td>{item.provider}</td>
                <td>{t(item.storageKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Note tone="info" title={t('privacySettings.editor.title')}>
          <p>{t('privacySettings.editor.body')}</p>
        </Note>
        <p className="section-link">
          <a href={pathFor('privacyPolicy', locale)}>
            {t('privacySettings.link.privacy')}
          </a>
        </p>
      </Section>
    </>
  );
}
