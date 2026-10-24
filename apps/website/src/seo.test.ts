import { describe, expect, it } from 'vitest';
import { breadcrumbs, buildSeo, structuredData } from './seo';
import { locales, pathFor, routes } from './routes';
import { translator } from './content/catalog';
import { site } from './site';
const t = translator('en');
describe('search engine metadata', () => {
  it('points each page at itself and at its language variants', () => {
    for (const route of routes)
      for (const locale of locales) {
        const seo = buildSeo({
          route: route.id,
          locale,
          title: 'Title',
          description: 'Description',
          imageAlt: 'Alt',
        });
        expect(seo.canonical).toBe(
          `${site.origin}${pathFor(route.id, locale)}`,
        );
        const languages = seo.alternates.map((entry) => entry.hrefLang);
        expect(languages).toEqual(['en', 'de', 'x-default']);
        expect(seo.alternates.at(-1)?.href).toBe(
          `${site.origin}${pathFor(route.id, 'en')}`,
        );
        expect(seo.robots).toContain('index');
      }
  });
  it('keeps a page out of the index when asked', () => {
    const seo = buildSeo({
      route: 'home',
      locale: 'en',
      title: 'Title',
      description: 'Description',
      imageAlt: 'Alt',
      noindex: true,
    });
    expect(seo.robots).toBe('noindex, nofollow');
    expect(seo.canonical).toBeNull();
    expect(seo.alternates).toEqual([]);
  });
  it('announces the locale of the social preview', () => {
    expect(
      buildSeo({
        route: 'home',
        locale: 'de',
        title: 'Titel',
        description: 'Beschreibung',
        imageAlt: 'Alt',
      }),
    ).toMatchObject({
      ogLocale: 'de_DE',
      ogAlternateLocales: ['en_US'],
      image: `${site.origin}/images/og-de.png`,
    });
  });
  it('publishes only facts that can be verified today', () => {
    const graph = structuredData('en', t);
    expect(
      graph.map((entry) => (entry as { '@type': string })['@type']),
    ).toEqual(['Organization', 'WebSite']);
    const serialized = JSON.stringify(graph);
    for (const forbidden of [
      'SoftwareApplication',
      'aggregateRating',
      'offers',
      'price',
      'downloadUrl',
      'softwareVersion',
      'datePublished',
    ])
      expect(serialized).not.toContain(forbidden);
  });
  it('describes the path from the home page for a subpage', () => {
    const crumbs = breadcrumbs(
      'de',
      'features',
      'Startseite',
      'Funktionen',
    ) as {
      itemListElement: { item: string; name: string }[];
    };
    expect(crumbs.itemListElement.map((entry) => entry.item)).toEqual([
      `${site.origin}/de/`,
      `${site.origin}/de/funktionen/`,
    ]);
  });
});
