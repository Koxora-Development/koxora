import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Document } from './components/layout';
import { themeScript, type PageContext } from './components/navigation';
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
      breadcrumbs(
        locale,
        route,
        t('nav.home'),
        seoInput.title.split(' · ')[0]!,
      ),
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
/** Minimal language gateway for `/`. Hosting redirects before this is seen. */
export function renderRootGateway(assets: BuildAssets): string {
  const t = translator(defaultLocale);
  const links = locales
    .map(
      (locale) =>
        `<li><a href="${pathFor('home', locale)}" hreflang="${locale}" lang="${locale}">${
          locale === 'de' ? t('nav.languageGerman') : t('nav.languageEnglish')
        }</a></li>`,
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
  return `${doctype}<html lang="${defaultLocale}" data-theme="dark"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${t(
    'brand.name',
  )}</title><meta name="robots" content="noindex, follow" /><link rel="canonical" href="${site.origin}${target}" />${alternates}<meta http-equiv="refresh" content="0; url=${target}" />${assets.css
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join(
      '',
    )}</head><body><main class="wrap gateway"><h1>${t('brand.name')}</h1><ul>${links}</ul></main></body></html>`;
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
  const entries = routes
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
};
export type { Locale, RouteId };
