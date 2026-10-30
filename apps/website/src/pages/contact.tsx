import { ActionLink, Note, Section, SectionHeader } from '../components/ui';
import { PageIntro } from '../components/page-intro';
import type { PageContext } from '../components/navigation';
import { pathFor } from '../routes';
import { site } from '../site';
import {
  contactCategories,
  contactField,
  honeypotField,
  timestampField,
  type ContactFieldName,
} from '@koxora/contact';
import type { MessageKey } from '../content/catalog';
const labelKeys: Record<ContactFieldName, MessageKey> = {
  name: 'contact.field.name',
  email: 'contact.field.email',
  category: 'contact.field.category',
  subject: 'contact.field.subject',
  message: 'contact.field.message',
};
const categoryKeys = {
  general: 'contact.category.general',
  feedback: 'contact.category.feedback',
  support: 'contact.category.support',
  bug: 'contact.category.bug',
} as const;
/** The error text for every problem the shared validator can report. */
const problemKeys = [
  'required',
  'tooShort',
  'tooLong',
  'email',
  'category',
  'controlCharacter',
] as const;
function Field({
  field,
  context,
  children,
  hintKey,
}: {
  field: ContactFieldName;
  context: PageContext;
  children: React.ReactNode;
  hintKey?: MessageKey;
}) {
  const { t } = context;
  const spec = contactField(field);
  const describedBy = [hintKey ? `${field}-hint` : '', `${field}-error`]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="form-field" data-field={field}>
      <label htmlFor={`contact-${field}`}>
        {t(labelKeys[field])}
        <span className="form-flag">
          {spec.required
            ? t('contact.field.required')
            : t('contact.field.optional')}
        </span>
      </label>
      {hintKey ? (
        <p className="form-hint" id={`${field}-hint`}>
          {t(hintKey, { max: spec.maxLength })}
        </p>
      ) : null}
      {children}
      {/* Every message the validator can produce is rendered here and hidden.
          The script shows the one that applies, so no text is assembled in
          the browser and both languages are complete without it. */}
      <p className="form-error" id={`${field}-error`} data-error-for={field}>
        {problemKeys.map((problem) => (
          <span
            key={problem}
            data-problem={problem}
            hidden
          >{`${t(`contact.error.${problem}` as MessageKey)}`}</span>
        ))}
      </p>
      <span aria-describedby={describedBy} hidden />
    </div>
  );
}
/**
 * The contact form.
 *
 * It is an ordinary form with an ordinary action, so it works without
 * JavaScript: the submission posts to the delivery service, which answers a
 * classic post with a redirect to a page that says what happened. With
 * JavaScript the script sends the same fields as JSON and keeps the reader
 * here, which is the only difference between the two paths.
 *
 * Nothing is rendered at all when no delivery service is configured. A form
 * that posts nowhere is worse than a published address, so an unconfigured
 * deployment shows the address instead.
 */
function ContactForm(context: PageContext) {
  const { locale, t } = context;
  if (!site.contactEndpoint) return null;
  return (
    <form
      className="contact-form"
      method="post"
      action={site.contactEndpoint}
      // The script reads these: the endpoint it posts JSON to, and the
      // localized status sentences, so it assembles no text of its own.
      data-contact-form
      data-endpoint={site.contactEndpoint}
      data-support-email={site.email.support}
      data-status-accepted={t('contact.status.accepted')}
      data-status-duplicate={t('contact.status.duplicate')}
      data-status-invalid={t('contact.status.invalid')}
      data-status-rejected={t('contact.status.rejected')}
      data-status-ratelimited={t('contact.status.rateLimited', {
        email: site.email.support,
      })}
      data-status-undelivered={t('contact.status.undelivered', {
        email: site.email.support,
      })}
      data-status-offline={t('contact.status.offline', {
        email: site.email.support,
      })}
      data-label-busy={t('contact.submit.busy')}
      noValidate={false}
    >
      <input type="hidden" name="locale" value={locale} />
      {/* Set by the script when the form is first shown. Its absence is held
          against nobody: a reader without JavaScript has no timestamp. */}
      <input type="hidden" name={timestampField} value="" data-contact-opened />
      <Field field="name" context={context} hintKey="contact.field.name.hint">
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={contactField('name').maxLength}
          aria-describedby="name-hint name-error"
        />
      </Field>
      <Field field="email" context={context} hintKey="contact.field.email.hint">
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={contactField('email').maxLength}
          aria-describedby="email-hint email-error"
        />
      </Field>
      <Field field="category" context={context}>
        <select
          id="contact-category"
          name="category"
          required
          defaultValue="general"
          aria-describedby="category-error"
        >
          {contactCategories.map((category) => (
            <option key={category} value={category}>
              {t(categoryKeys[category])}
            </option>
          ))}
        </select>
      </Field>
      <Field field="subject" context={context}>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          required
          minLength={contactField('subject').minLength}
          maxLength={contactField('subject').maxLength}
          aria-describedby="subject-error"
        />
      </Field>
      <Field
        field="message"
        context={context}
        hintKey="contact.field.message.hint"
      >
        <textarea
          id="contact-message"
          name="message"
          required
          rows={8}
          minLength={contactField('message').minLength}
          maxLength={contactField('message').maxLength}
          aria-describedby="message-hint message-error"
        />
      </Field>
      {/* The field a person never sees and a machine fills in. It is hidden
          from assistive technology and from autofill as well, so nobody is
          caught by it by accident. */}
      <div className="form-trap" aria-hidden="true">
        <label htmlFor="contact-website">{t('contact.honeypot.label')}</label>
        <input
          id="contact-website"
          name={honeypotField}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="action action-primary">
          {t('contact.submit')}
        </button>
        {/* The answer is announced, because a reader who cannot see the page
            change still has to learn what happened. */}
        <p
          className="form-status"
          data-contact-status
          role="status"
          aria-live="polite"
        />
      </div>
      <noscript>
        <p className="form-hint">{t('contact.noscript')}</p>
      </noscript>
    </form>
  );
}
/**
 * The contact page, in either of the two states it has.
 *
 * With a delivery service it leads with the form and publishes the address
 * underneath it. Without one it leads with the address, as the page a reader
 * came to use rather than an apology for a missing control.
 *
 * What it must never do is explain the deployment. The first version of this
 * page said the form was "not switched on here" because "this deployment has
 * no delivery service configured", which is a note to an operator printed on a
 * public page: it tells a reader something about our infrastructure and
 * nothing about how to reach us. A reader needs one address and a reason to
 * trust it; `deploymentDiagnosticPhrases` keeps that wording out, and a test
 * reads every emitted page to prove it.
 */
export function ContactPage(context: PageContext) {
  const { locale, t } = context;
  const email = site.email.support;
  const hasForm = Boolean(site.contactEndpoint);
  return (
    <>
      <PageIntro
        eyebrow={t('contact.hero.eyebrow')}
        title={t('contact.hero.title')}
        lead={
          hasForm
            ? t('contact.hero.lead')
            : t('contact.hero.leadMail', { email })
        }
      />
      <Section id="security">
        <Note tone="warning" title={t('contact.security.title')}>
          <p>
            {hasForm
              ? t('contact.security.body')
              : t('contact.security.bodyMail')}
          </p>
          <p>
            <a href={site.securityUrl} rel="noopener">
              {t('contact.security.link')}
            </a>
          </p>
        </Note>
      </Section>
      {hasForm ? (
        <Section id="form" tone="panel">
          <SectionHeader
            title={t('contact.form.title')}
            description={t('contact.form.intro')}
          />
          <ContactForm {...context} />
        </Section>
      ) : null}
      {/* The address, as the alternative beside a form and as the way itself
          without one. It is a link a reader can follow and a string they can
          copy either way, so a reader without a configured mail program is
          not left with a button that does nothing. */}
      <Section id="email" tone={hasForm ? 'plain' : 'panel'}>
        <SectionHeader
          title={
            hasForm ? t('contact.fallback.title') : t('contact.mail.title')
          }
          description={
            hasForm
              ? t('contact.fallback.body', { email })
              : t('contact.mail.body')
          }
        />
        <p className="contact-address">
          <ActionLink
            href={`mailto:${email}`}
            label={email}
            variant={hasForm ? 'secondary' : 'primary'}
            hint={t('contact.mail.hint')}
          />
        </p>
      </Section>
      <Section id="privacy" tone={hasForm ? 'panel' : 'plain'}>
        <SectionHeader title={t('contact.privacy.title')} />
        <p className="prose-lead">
          {hasForm ? t('contact.privacy.body') : t('contact.privacy.bodyMail')}
        </p>
        <p>
          <a href={pathFor('privacyPolicy', locale)}>
            {t('contact.privacy.link')}
          </a>
        </p>
      </Section>
    </>
  );
}
/** What a submission without JavaScript lands on when it was accepted. */
export function ContactSentPage({ locale, t }: PageContext) {
  return (
    <>
      <PageIntro
        eyebrow={t('contactSent.hero.eyebrow')}
        title={t('contactSent.hero.title')}
        lead={t('contactSent.hero.lead')}
      />
      <Section id="next">
        <p className="prose-lead">{t('contactSent.body')}</p>
        <p>
          <a href={pathFor('contact', locale)}>{t('contactSent.back')}</a>
        </p>
      </Section>
    </>
  );
}
/** And what it lands on when it was not. */
export function ContactProblemPage({ locale, t }: PageContext) {
  return (
    <>
      <PageIntro
        eyebrow={t('contactProblem.hero.eyebrow')}
        title={t('contactProblem.hero.title')}
        lead={t('contactProblem.hero.lead')}
      />
      <Section id="reasons">
        <ul className="checklist" role="list">
          <li>
            <span>{t('contactProblem.reason.invalid')}</span>
          </li>
          <li>
            <span>{t('contactProblem.reason.rateLimited')}</span>
          </li>
          <li>
            <span>{t('contactProblem.reason.undelivered')}</span>
          </li>
        </ul>
        <p>
          <a href={pathFor('contact', locale)}>{t('contactProblem.back')}</a>
        </p>
        <p>
          <a href={`mailto:${site.email.support}`}>{site.email.support}</a>
        </p>
      </Section>
    </>
  );
}
