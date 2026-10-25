import { site } from './site';
import {
  alternatesFor,
  defaultLocale,
  pathFor,
  type Locale,
  type RouteId,
} from './routes';
import type { Translate } from './content/catalog';
export interface SeoAlternate {
  hrefLang: string;
  href: string;
}
export interface PageSeo {
  title: string;
  description: string;
  /** Absent on pages that are deliberately kept out of the index. */
  canonical: string | null;
  alternates: SeoAlternate[];
  robots: string;
  image: string;
  imageAlt: string;
  ogLocale: string;
  ogAlternateLocales: string[];
}
const ogLocales: Record<Locale, string> = { en: 'en_US', de: 'de_DE' };
export function buildSeo({
  route,
  locale,
  title,
  description,
  noindex,
  imageAlt,
}: {
  route: RouteId;
  locale: Locale;
  title: string;
  description: string;
  noindex?: boolean;
  imageAlt: string;
}): PageSeo {
  const alternates: SeoAlternate[] = alternatesFor(route).map((entry) => ({
    hrefLang: entry.locale,
    href: `${site.origin}${entry.path}`,
  }));
  alternates.push({
    hrefLang: 'x-default',
    href: `${site.origin}${pathFor(route, defaultLocale)}`,
  });
  // A staging build is kept out of the index as a whole, so it must not
  // publish a canonical address or language alternates either.
  const hidden = Boolean(noindex) || !site.indexable;
  return {
    title,
    description,
    canonical: hidden ? null : `${site.origin}${pathFor(route, locale)}`,
    alternates: hidden ? [] : alternates,
    robots:
      hidden || !site.indexable
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large',
    image: `${site.origin}/images/og-${locale}.png`,
    imageAlt,
    ogLocale: ogLocales[locale],
    ogAlternateLocales: Object.entries(ogLocales)
      .filter(([key]) => key !== locale)
      .map(([, value]) => value),
  };
}
/**
 * Structured data. Only facts that are verifiable today are published: the
 * organization behind the project and the website itself. No
 * `SoftwareApplication`, rating, price, version or download entry is emitted
 * while Koxora has no public release.
 */
export function structuredData(locale: Locale, t: Translate): object[] {
  const organization = {
    '@type': 'Organization',
    '@id': `${site.origin}/#organization`,
    name: t('brand.name'),
    url: `${site.origin}/`,
    logo: `${site.origin}/images/icon-512.png`,
    email: site.email.support,
    sameAs: [site.repositoryUrl],
  };
  const website = {
    '@type': 'WebSite',
    // One identifier per language: the nodes differ in url and inLanguage.
    '@id': `${site.origin}${pathFor('home', locale)}#website`,
    url: `${site.origin}${pathFor('home', locale)}`,
    name: t('brand.name'),
    description: t('brand.description'),
    inLanguage: locale,
    publisher: { '@id': `${site.origin}/#organization` },
  };
  return [organization, website];
}
export function breadcrumbs(
  locale: Locale,
  route: RouteId,
  homeLabel: string,
  pageLabel: string,
): object {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${site.origin}${pathFor(route, locale)}#breadcrumb`,
    isPartOf: { '@id': `${site.origin}${pathFor('home', locale)}#website` },
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeLabel,
        item: `${site.origin}${pathFor('home', locale)}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageLabel,
        item: `${site.origin}${pathFor(route, locale)}`,
      },
    ],
  };
}
