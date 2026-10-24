import { pathFor, type Locale } from '../routes';
import type { Translate } from '../content/catalog';
import {
  activeOptionalCategories,
  consentCategories,
  type ConsentCategory,
} from '../content/consent';
export interface ConsentContext {
  locale: Locale;
  t: Translate;
}
function CategoryDetails({
  category,
  t,
}: {
  category: ConsentCategory;
  t: Translate;
}) {
  if (category.items.length === 0) return null;
  return (
    <ul className="consent-items">
      {category.items.map((item) => (
        <li key={item.id}>
          <p className="consent-item-name">{t(item.nameKey)}</p>
          <dl>
            <div>
              <dt>{t('consent.dialog.purpose')}</dt>
              <dd>{t(item.purposeKey)}</dd>
            </div>
            <div>
              <dt>{t('consent.dialog.provider')}</dt>
              <dd>{item.provider}</dd>
            </div>
            <div>
              <dt>{t('consent.dialog.storage')}</dt>
              <dd>{t(item.storageKey)}</dd>
            </div>
            <div>
              <dt>{t('consent.dialog.legalBasis')}</dt>
              <dd>{t(item.legalBasisKey)}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
/**
 * The settings surface. It is rendered server-side both inside the dialog and
 * on the privacy settings page, so the same markup is used everywhere and
 * works without client-side rendering.
 */
export function ConsentManager({ locale, t }: ConsentContext) {
  const optional = activeOptionalCategories();
  const shown = consentCategories.filter(
    (category) => !category.optional || optional.includes(category),
  );
  return (
    <div className="consent-manager" data-consent-manager>
      <p className="consent-intro">{t('consent.dialog.intro')}</p>
      {optional.length === 0 ? (
        <div className="note note-info">
          <p className="note-title">{t('consent.dialog.noOptional.title')}</p>
          <div className="note-body">
            <p>{t('consent.dialog.noOptional.body')}</p>
          </div>
        </div>
      ) : null}
      <ul className="consent-categories">
        {shown.map((category) => (
          <li className="consent-category" key={category.id}>
            <div className="consent-category-head">
              <h3>{t(category.nameKey)}</h3>
              {category.optional ? (
                <span className="consent-switch">
                  <input
                    type="checkbox"
                    id={`consent-${category.id}`}
                    name="consent-category"
                    value={category.id}
                    data-consent-toggle={category.id}
                  />
                  <label htmlFor={`consent-${category.id}`}>
                    {t('consent.dialog.optional')}
                  </label>
                </span>
              ) : (
                <span className="badge badge-available">
                  {t('consent.dialog.alwaysActive')}
                </span>
              )}
            </div>
            <p className="consent-category-description">
              {t(category.descriptionKey)}
            </p>
            <CategoryDetails category={category} t={t} />
          </li>
        ))}
      </ul>
      <p
        className="consent-state"
        data-consent-state
        data-state-saved={t('consent.state.saved', { date: '{date}' })}
        data-state-none={t('consent.state.none')}
        data-state-withdrawn={t('consent.withdrawDone')}
        role="status"
      >
        {optional.length === 0
          ? t('consent.state.necessaryOnly')
          : t('consent.state.none')}
      </p>
      {optional.length > 0 ? (
        <div className="consent-actions">
          <button
            className="action action-equal"
            type="button"
            data-consent-action="accept"
          >
            {t('consent.dialog.acceptAll')}
          </button>
          <button
            className="action action-equal"
            type="button"
            data-consent-action="reject"
          >
            {t('consent.dialog.rejectOptional')}
          </button>
          <button
            className="action action-equal"
            type="button"
            data-consent-action="save"
          >
            {t('consent.dialog.save')}
          </button>
        </div>
      ) : null}
      {optional.length > 0 ? (
        <p className="consent-withdraw">
          <button
            className="link-button"
            type="button"
            data-consent-action="withdraw"
          >
            {t('consent.withdraw')}
          </button>
        </p>
      ) : null}
      <p className="consent-links">
        <a href={pathFor('privacyPolicy', locale)}>
          {t('consent.banner.privacyLink')}
        </a>
        <a href={pathFor('legalNotice', locale)}>
          {t('consent.banner.noticeLink')}
        </a>
      </p>
      <noscript>
        <p className="consent-noscript">{t('consent.noScript')}</p>
      </noscript>
    </div>
  );
}
export function ConsentBanner({ locale, t }: ConsentContext) {
  return (
    <div
      className="consent-banner"
      data-consent-banner
      role="region"
      aria-labelledby="consent-banner-title"
      hidden
    >
      <div className="consent-banner-inner">
        <div className="consent-banner-text">
          <h2 id="consent-banner-title">{t('consent.banner.title')}</h2>
          <p>{t('consent.banner.body')}</p>
          <p className="consent-links">
            <a href={pathFor('privacyPolicy', locale)}>
              {t('consent.banner.privacyLink')}
            </a>
            <a href={pathFor('legalNotice', locale)}>
              {t('consent.banner.noticeLink')}
            </a>
          </p>
        </div>
        <div className="consent-actions">
          <button
            className="action action-equal"
            type="button"
            data-consent-action="accept"
          >
            {t('consent.banner.acceptAll')}
          </button>
          <button
            className="action action-equal"
            type="button"
            data-consent-action="reject"
          >
            {t('consent.banner.rejectOptional')}
          </button>
          <button
            className="action action-equal"
            type="button"
            data-consent-action="customize"
          >
            {t('consent.banner.customize')}
          </button>
        </div>
      </div>
    </div>
  );
}
export function ConsentDialog(context: ConsentContext) {
  const { t } = context;
  return (
    <dialog
      className="consent-dialog"
      data-consent-dialog
      aria-labelledby="consent-dialog-title"
    >
      <div className="consent-dialog-inner">
        <div className="consent-dialog-head">
          <h2 id="consent-dialog-title">{t('consent.dialog.title')}</h2>
          <button
            className="icon-button"
            type="button"
            data-consent-action="close"
          >
            <span className="sr-only">{t('consent.dialog.close')}</span>
            <span className="icon-button-glyph" aria-hidden="true" />
          </button>
        </div>
        <ConsentManager {...context} />
      </div>
    </dialog>
  );
}
