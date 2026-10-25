import type { ReactNode } from 'react';
import { Mark } from './logo';
import { GlobeIcon, MoonIcon, SelectedIcon, SunIcon } from './icons';
import { ConsentBanner, ConsentDialog, ConsentNoScript } from './consent-ui';
import { site } from '../site';
import {
  locales,
  navRoutes,
  pathFor,
  type Locale,
  type RouteId,
} from '../routes';
import { catalog, type Translate } from '../content/catalog';
import {
  navLabelKeys,
  studioLink,
  themeScript,
  type PageContext,
} from './navigation';
import {
  consentPromptRequired,
  consentRuntimeConfig,
} from '../content/consent';
import type { PageSeo } from '../seo';
import { languagePictogram } from '@koxora/ui/control-icons';
// Embedded JSON must not be able to end its own script element, whatever a
// future message or label contains.
function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
// One list of languages, used by the header popover and by the plain footer
// navigation. The entries are ordinary links to the equivalent page, so they
// work before the enhancement script runs and without it entirely.
function LanguageOptions({ locale, route, t }: PageContext) {
  return (
    <ul role="list">
      {locales.map((candidate) => {
        const current = candidate === locale;
        return (
          <li key={candidate}>
            <a
              className={
                current ? 'language-option language-current' : 'language-option'
              }
              href={pathFor(route, candidate)}
              hrefLang={candidate}
              lang={candidate}
              {...(current ? { 'aria-current': 'true' } : {})}
            >
              <span className="language-pictogram" aria-hidden="true">
                {languagePictogram(candidate)}
              </span>
              <span className="language-name">{catalog.label(candidate)}</span>
              {current ? (
                <>
                  <SelectedIcon />
                  <span className="sr-only">{t('nav.languageCurrent')}</span>
                </>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
function HeaderLanguage(context: PageContext) {
  const { t } = context;
  return (
    <div className="language language-popover" data-language>
      <button
        className="control-button language-toggle"
        type="button"
        data-language-toggle
        aria-expanded="false"
        aria-controls="language-menu"
        aria-label={t('nav.languageMenu')}
        title={t('nav.languageMenu')}
      >
        <GlobeIcon />
      </button>
      <nav
        className="language-menu"
        id="language-menu"
        data-language-menu
        aria-labelledby="language-menu-title"
      >
        <p className="language-menu-title" id="language-menu-title">
          {t('nav.languageMenu')}
        </p>
        <LanguageOptions {...context} />
      </nav>
    </div>
  );
}
function FooterLanguage(context: PageContext) {
  return (
    <nav
      className="language language-inline"
      aria-label={context.t('a11y.languageNavigationFooter')}
    >
      <LanguageOptions {...context} />
    </nav>
  );
}
function Header(context: PageContext) {
  const { locale, route, t } = context;
  const cta = studioLink(locale, t);
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="brand" href={pathFor('home', locale)}>
          <Mark id="header" />
          <span className="brand-word">{t('brand.wordmark')}</span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          data-menu-toggle
          aria-controls="site-menu"
          aria-expanded="true"
          hidden
        >
          <span className="menu-toggle-label">{t('nav.menu')}</span>
          <span className="menu-toggle-bars" aria-hidden="true" />
        </button>
        <div className="header-menu" id="site-menu" data-menu>
          <nav className="primary-nav" aria-label={t('a11y.mainNavigation')}>
            <ul role="list">
              {navRoutes('primary').map((entry) => (
                <li key={entry.id}>
                  <a
                    href={pathFor(entry.id, locale)}
                    {...(entry.id === route ? { 'aria-current': 'page' } : {})}
                  >
                    {t(navLabelKeys[entry.id])}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="header-tools">
            <HeaderLanguage {...context} />
            <button
              className="control-button theme-toggle"
              type="button"
              data-theme-toggle
              data-label-light={t('nav.themeToLight')}
              data-label-dark={t('nav.themeToDark')}
              aria-label={t('nav.themeToLight')}
              hidden
            >
              <SunIcon />
              <MoonIcon />
            </button>
            <a className="action action-primary header-cta" href={cta.href}>
              {cta.label}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
function FooterColumn({
  title,
  ids,
  locale,
  t,
  children,
}: {
  title: string;
  ids: RouteId[];
  locale: Locale;
  t: Translate;
  /** Further entries of the same group, such as an address outside the site. */
  children?: ReactNode;
}) {
  return (
    <div className="footer-column">
      <h2>{title}</h2>
      <ul role="list">
        {ids.map((id) => (
          <li key={id}>
            <a href={pathFor(id, locale)}>{t(navLabelKeys[id])}</a>
          </li>
        ))}
        {children}
      </ul>
    </div>
  );
}
function Footer(context: PageContext) {
  const { locale, t } = context;
  const year = new Date(`${site.contentDate}T00:00:00Z`).getUTCFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <p className="brand">
              <Mark id="footer" />
              <span className="brand-word">{t('brand.wordmark')}</span>
            </p>
            <p className="footer-tagline">{t('footer.tagline')}</p>
            <p className="footer-status">{t('footer.statusNote')}</p>
          </div>
          <nav className="footer-nav" aria-label={t('a11y.footerNavigation')}>
            <FooterColumn
              title={t('nav.groupProduct')}
              ids={navRoutes('product').map((entry) => entry.id)}
              locale={locale}
              t={t}
            />
            <FooterColumn
              title={t('nav.groupResources')}
              ids={navRoutes('resources').map((entry) => entry.id)}
              locale={locale}
              t={t}
            >
              <li>
                <a href={site.repositoryUrl} rel="noopener">
                  {t('footer.repository')}
                </a>
              </li>
            </FooterColumn>
            <div className="footer-column">
              <h2>{t('nav.groupLegal')}</h2>
              <ul role="list">
                {navRoutes('legal').map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={pathFor(entry.id, locale)}
                      {...(entry.id === 'privacySettings'
                        ? { 'data-consent-open': 'true' }
                        : {})}
                    >
                      {t(navLabelKeys[entry.id])}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Two different errands, named so a reader can tell them apart:
                an ordinary question goes to the support mailbox, a security
                problem starts at the policy, which says what is safe to send
                before a private channel exists. */}
            <div className="footer-column footer-column-contact">
              <h2>{t('footer.contact')}</h2>
              <dl className="footer-contacts">
                <div>
                  <dt>{t('footer.supportTask')}</dt>
                  <dd>
                    <a href={`mailto:${site.email.support}`}>
                      {site.email.support}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>{t('footer.securityTask')}</dt>
                  <dd>
                    <a href={site.securityUrl} rel="noopener">
                      {t('footer.security')}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          <p className="footer-copyright">{t('footer.copyright', { year })}</p>
          <FooterLanguage {...context} />
          <a className="footer-top-link" href="#top">
            {t('footer.backToTop')}
          </a>
        </div>
      </div>
    </footer>
  );
}
export function Document({
  context,
  seo,
  structured,
  assets,
  children,
}: {
  context: PageContext;
  seo: PageSeo;
  structured: object[];
  assets: { css: string[]; js: string[] };
  children: ReactNode;
}) {
  const { locale, t } = context;
  const graph = {
    '@context': 'https://schema.org',
    '@graph': structured,
  };
  return (
    <html lang={locale} data-theme="dark" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="robots" content={seo.robots} />
        {seo.canonical ? <link rel="canonical" href={seo.canonical} /> : null}
        {seo.alternates.map((alternate) => (
          <link
            key={alternate.hrefLang}
            rel="alternate"
            hrefLang={alternate.hrefLang}
            href={alternate.href}
          />
        ))}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={t('brand.name')} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        {seo.canonical ? (
          <meta property="og:url" content={seo.canonical} />
        ) : null}
        <meta property="og:image" content={seo.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={seo.imageAlt} />
        <meta property="og:locale" content={seo.ogLocale} />
        {seo.ogAlternateLocales.map((alternate) => (
          <meta
            key={alternate}
            property="og:locale:alternate"
            content={alternate}
          />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={seo.image} />
        <meta name="twitter:image:alt" content={seo.imageAlt} />
        <meta name="theme-color" content="#080a13" />
        <meta name="color-scheme" content="dark light" />
        <link rel="icon" href="/images/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/icon-180.png" />
        <link rel="manifest" href={`/${locale}/site.webmanifest`} />
        {assets.css.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        <script
          type="application/json"
          id="koxora-consent-config"
          dangerouslySetInnerHTML={{
            __html: scriptSafeJson(consentRuntimeConfig()),
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: scriptSafeJson(graph) }}
        />
        {assets.js.map((src) => (
          <script key={src} type="module" src={src} defer />
        ))}
      </head>
      <body id="top">
        <a className="skip-link" href="#main">
          {t('a11y.skip')}
        </a>
        <Header {...context} />
        <main id="main">{children}</main>
        <Footer {...context} />
        <ConsentNoScript {...context} />
        {consentPromptRequired() ? (
          <>
            <ConsentBanner {...context} />
            {/* The settings page renders the manager itself; a second copy
                inside a dialog would duplicate its controls on that page. */}
            {context.route === 'privacySettings' ? null : (
              <ConsentDialog {...context} />
            )}
          </>
        ) : null}
      </body>
    </html>
  );
}
