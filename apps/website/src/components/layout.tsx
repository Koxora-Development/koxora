import type { ReactNode } from 'react';
import { Mark } from './logo';
import { ConsentBanner, ConsentDialog, ConsentNoScript } from './consent-ui';
import { site } from '../site';
import {
  locales,
  navRoutes,
  pathFor,
  type Locale,
  type RouteId,
} from '../routes';
import type { Translate } from '../content/catalog';
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
// Embedded JSON must not be able to end its own script element, whatever a
// future message or label contains.
function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
function LanguageSwitch({
  locale,
  route,
  t,
  inFooter,
}: PageContext & { inFooter?: boolean }) {
  return (
    <nav
      className="language"
      aria-label={t(
        inFooter ? 'a11y.languageNavigationFooter' : 'a11y.languageNavigation',
      )}
    >
      <ul role="list">
        {locales.map((candidate) => (
          <li key={candidate}>
            <a
              href={pathFor(route, candidate)}
              hrefLang={candidate}
              lang={candidate}
              className={candidate === locale ? 'language-active' : undefined}
              {...(candidate === locale ? { 'aria-current': 'true' } : {})}
            >
              {t(
                candidate === 'de'
                  ? 'nav.languageGerman'
                  : 'nav.languageEnglish',
              )}
            </a>
          </li>
        ))}
      </ul>
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
            <LanguageSwitch {...context} />
            <button
              className="theme-toggle"
              type="button"
              data-theme-toggle
              hidden
            >
              <span className="sr-only">{t('nav.theme')}</span>
              <span className="theme-toggle-face" aria-hidden="true" />
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
}: {
  title: string;
  ids: RouteId[];
  locale: Locale;
  t: Translate;
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
            />
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
            <div className="footer-column">
              <h2>{t('footer.contact')}</h2>
              <ul role="list">
                <li>
                  <a href={`mailto:${site.email.support}`}>
                    {site.email.support}
                  </a>
                </li>
                <li>
                  <a href={site.repositoryUrl} rel="noopener">
                    {t('footer.repository')}
                  </a>
                </li>
                <li>
                  <a href={site.securityUrl} rel="noopener">
                    {t('footer.security')}
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          <p className="footer-copyright">{t('footer.copyright', { year })}</p>
          <LanguageSwitch {...context} inFooter />
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
