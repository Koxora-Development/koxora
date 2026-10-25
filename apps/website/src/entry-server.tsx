import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Document } from './components/layout';
import {
  navLabelKeys,
  themeScript,
  type PageContext,
} from './components/navigation';
import { NotFoundPage } from './pages/not-found';
import { pageRegistry } from './pages/registry';
import { translator } from './content/catalog';
import { buildSeo, breadcrumbs, structuredData } from './seo';
import {
  defaultLocale,
  locales,
  pathFor,
  redirects,
  routes,
  type Locale,
  type RouteId,
} from './routes';
import { site } from './site';
import {
  languageCookieName,
  languageGatewayScript,
  languageStorageKey,
  negotiateLocale,
} from './language';
export interface BuildAssets {
  css: string[];
  js: string[];
}
export interface EmittedFile {
  path: string;
  content: string;
}
const doctype = '<!doctype html>\n';
// React keeps a few HTML attributes in their camel-cased property spelling.
// HTML parses attribute names case-insensitively, but the emitted files are
// read by people and by simple tooling, so they are normalized here. The SVG
// attributes that are genuinely case-sensitive are not in this list.
const camelAttributes = ['charSet', 'hrefLang', 'srcSet', 'fetchPriority'];
function normalizeAttributes(html: string): string {
  return camelAttributes.reduce(
    (result, name) =>
      result.replaceAll(` ${name}="`, ` ${name.toLowerCase()}="`),
    html,
  );
}
function pageTitle(route: RouteId, raw: string, brand: string): string {
  return route === 'home' ? raw : `${raw} · ${brand}`;
}
function renderDocument(
  context: PageContext,
  assets: BuildAssets,
  body: ReactNode,
  seoInput: { title: string; description: string; noindex?: boolean },
): string {
  const { locale, route, t } = context;
  const seo = buildSeo({
    route,
    locale,
    title: seoInput.title,
    description: seoInput.description,
    noindex: seoInput.noindex,
    imageAlt: t('og.imageAlt'),
  });
  const structured = structuredData(locale, t);
  if (route !== 'home')
    structured.push(
      // The breadcrumb names the page, not its search engine title.
      breadcrumbs(locale, route, t('nav.home'), t(navLabelKeys[route])),
    );
  return (
    doctype +
    normalizeAttributes(
      renderToStaticMarkup(
        <Document
          context={context}
          seo={seo}
          structured={structured}
          assets={assets}
        >
          {body}
        </Document>,
      ),
    )
  );
}
export function renderRoute(
  route: RouteId,
  locale: Locale,
  assets: BuildAssets,
): string {
  const t = translator(locale);
  const context: PageContext = { locale, route, t };
  const definition = pageRegistry[route];
  const { Component } = definition;
  return renderDocument(context, assets, <Component {...context} />, {
    title: pageTitle(route, t(definition.titleKey), t('brand.name')),
    description: t(definition.descriptionKey),
    noindex: definition.noindex,
  });
}
export function renderNotFound(locale: Locale, assets: BuildAssets): string {
  const t = translator(locale);
  const context: PageContext = { locale, route: 'home', t };
  return renderDocument(context, assets, <NotFoundPage {...context} />, {
    title: `${t('notFound.meta.title')} · ${t('brand.name')}`,
    description: t('notFound.lead'),
    noindex: true,
  });
}
/**
 * The language gateway for `/`, the one address that names no language.
 *
 * Three layers answer it, in this order, and all three implement the order
 * documented in `src/language.ts`: the hosting layer redirects the request by
 * the stored choice and then by the request languages; where it does not, the
 * inline script below decides before the first paint; and where that cannot
 * run either, this document stays a usable language-selection page. It is
 * kept out of the search index, so it is never a second address for either
 * home page.
 */
export function renderRootGateway(assets: BuildAssets): string {
  const t = translator(defaultLocale);
  const links = locales
    .map(
      (locale) =>
        `<li><a href="${pathFor('home', locale)}" hreflang="${locale}" lang="${locale}" data-language-option="${locale}">${
          locale === 'de' ? t('nav.languageGerman') : t('nav.languageEnglish')
        }</a></li>`,
    )
    .join('');
  // Both languages name the choice, because a reader who reaches this page
  // has not been identified as speaking either of them.
  const prompt = locales
    .map(
      (locale) =>
        `<p lang="${locale}">${translator(locale)('nav.languageMenu')}</p>`,
    )
    .join('');
  const alternates = [
    ...locales.map(
      (locale) =>
        `<link rel="alternate" hreflang="${locale}" href="${site.origin}${pathFor('home', locale)}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${site.origin}${pathFor('home', defaultLocale)}" />`,
  ].join('');
  const target = pathFor('home', defaultLocale);
  // No meta refresh: it can only name one fixed language, so it would send a
  // reader without JavaScript to English even where the request asks for
  // German. The hosting layer answers that case, and this page is what is
  // left when it does not.
  return `${doctype}<html lang="${defaultLocale}" data-theme="dark"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${t(
    'brand.name',
  )}</title><meta name="robots" content="noindex, follow" /><link rel="canonical" href="${site.origin}${target}" />${alternates}<script>${languageGatewayScript}</script>${assets.css
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join(
      '',
    )}</head><body><main class="wrap gateway"><h1>${t('brand.name')}</h1>${prompt}<ul>${links}</ul></main></body></html>`;
}
export function renderManifest(locale: Locale): string {
  const t = translator(locale);
  return JSON.stringify(
    {
      name: t('brand.name'),
      short_name: t('brand.name'),
      description: t('brand.description'),
      lang: locale,
      start_url: pathFor('home', locale),
      scope: `/${locale}/`,
      display: 'browser',
      background_color: '#080a13',
      theme_color: '#080a13',
      icons: [
        { src: '/images/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        { src: '/images/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  );
}
export function renderSitemap(): string {
  // A build that is kept out of the index publishes no addresses at all.
  const entries = !site.indexable
    ? []
    : routes
        .filter((route) => route.sitemap)
        .flatMap((route) =>
          locales.map((locale) => {
            const alternates = [
              ...locales.map(
                (other) =>
                  `    <xhtml:link rel="alternate" hreflang="${other}" href="${site.origin}${pathFor(route.id, other)}"/>`,
              ),
              `    <xhtml:link rel="alternate" hreflang="x-default" href="${site.origin}${pathFor(route.id, defaultLocale)}"/>`,
            ].join('\n');
            return [
              '  <url>',
              `    <loc>${site.origin}${pathFor(route.id, locale)}</loc>`,
              `    <lastmod>${site.contentDate}</lastmod>`,
              `    <changefreq>${route.sitemap!.changeFrequency}</changefreq>`,
              `    <priority>${route.sitemap!.priority.toFixed(1)}</priority>`,
              alternates,
              '  </url>',
            ].join('\n');
          }),
        );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
/**
 * Vulnerability reporting information in the format of RFC 9116. It states a
 * contact address, the languages it is read in and where the policy lives,
 * and deliberately claims no response time, no encryption key and no
 * guarantee. The expiry is one year after the content review date, so every
 * release republishes a current file.
 */
export function renderSecurityTxt(): string {
  const expires = new Date(`${site.contentDate}T00:00:00Z`);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  return [
    `Contact: mailto:${site.email.security}`,
    `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    'Preferred-Languages: en, de',
    `Policy: ${site.securityUrl}`,
    '',
  ].join('\n');
}
export function renderRobots(): string {
  if (!site.indexable) return ['User-agent: *', 'Disallow: /', ''].join('\n');
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${site.origin}/sitemap.xml`,
    '',
  ].join('\n');
}
export {
  routes,
  locales,
  defaultLocale,
  pathFor,
  redirects,
  site,
  themeScript,
  languageGatewayScript,
  languageCookieName,
  languageStorageKey,
  negotiateLocale,
};
export {
  renderApacheAliases,
  renderApacheProxy,
  renderApacheStatic,
  renderNginx,
  renderNginxMain,
} from './deploy-config';
export { consentPolicyExtras } from './content/consent';
export { contactPolicyExtras } from './content/contact';
// Re-exported so the stub the browser tests run against uses the real
// validation and the real spam checks rather than a second copy of them.
export {
  detectSpam,
  honeypotField,
  timestampField,
  validateContact,
} from '@koxora/contact';
export { internalReviewPhrases } from './content/launch';
export type { Locale, RouteId };
