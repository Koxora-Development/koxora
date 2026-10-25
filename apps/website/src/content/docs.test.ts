import { describe, expect, it } from 'vitest';
import {
  docsSections,
  editingTopics,
  faqEntries,
  projectTopics,
  startSteps,
} from './docs';
import { catalog } from './catalog';
import { locales, routeById, routes } from '../routes';
import { pageRegistry } from '../pages/registry';
import { screenshotSizes } from './screenshots';
const everyEntry = [
  ...startSteps,
  ...editingTopics,
  ...projectTopics,
  ...faqEntries,
];
describe('the documentation structure', () => {
  it('names a route that exists for every section', () => {
    expect(docsSections.length).toBeGreaterThanOrEqual(8);
    for (const section of docsSections) {
      expect(() => routeById(section.route), section.route).not.toThrow();
      expect(pageRegistry[section.route], section.route).toBeDefined();
    }
  });
  it('puts its own sections under the documentation address in both languages', () => {
    const parent = routeById('docs');
    for (const id of [
      'docsStart',
      'docsEditing',
      'docsProjects',
      'docsFaq',
      'docsSupport',
    ] as const) {
      const route = routeById(id);
      for (const locale of locales)
        expect(
          route.slugs[locale].startsWith(`${parent.slugs[locale]}/`),
          id,
        ).toBe(true);
    }
  });
  it('is written in both languages, everywhere', () => {
    for (const locale of locales) {
      for (const section of docsSections)
        for (const key of [section.titleKey, section.summaryKey])
          expect(
            catalog.translate(locale, key).trim().length,
            `${locale} ${key}`,
          ).toBeGreaterThan(10);
      for (const entry of everyEntry) {
        expect(
          catalog.translate(locale, entry.titleKey).trim().length,
          `${locale} ${entry.titleKey}`,
        ).toBeGreaterThan(3);
        expect(
          catalog.translate(locale, entry.bodyKey).trim().length,
          `${locale} ${entry.bodyKey}`,
        ).toBeGreaterThan(40);
      }
    }
  });
  it('keeps every documentation page in the sitemap', () => {
    for (const section of docsSections)
      expect(routeById(section.route).sitemap, section.route).not.toBeNull();
  });
});
describe('what the documentation is allowed to say', () => {
  it('never presents an unreleased capability as something to download', () => {
    // The product has no release. A documentation page that said otherwise
    // would be the one place a reader would believe it.
    const forbidden = [
      /download (?:koxora|the app|it) (?:now|here|today)/i,
      /install(?:er)? is available/i,
      /jetzt herunterladen/i,
      /steht zum download bereit/i,
    ];
    for (const locale of locales)
      for (const entry of everyEntry) {
        const text = catalog.translate(locale, entry.bodyKey);
        for (const pattern of forbidden)
          expect(pattern.test(text), `${locale} ${entry.bodyKey}`).toBe(false);
      }
  });
  it('says plainly that there is no public release, where a reader would ask', () => {
    for (const locale of locales) {
      const release = catalog.translate(locale, 'faq.release.a');
      expect(release.toLowerCase(), locale).toMatch(
        locale === 'en' ? /no public release/ : /keine öffentliche/,
      );
      const price = catalog.translate(locale, 'faq.price.a');
      expect(price.length, locale).toBeGreaterThan(20);
    }
  });
  it('warns about browser storage wherever it tells someone to rely on it', () => {
    // The one way to lose work in a local-first product, so it is said on
    // the first-steps page, the projects page and in the questions.
    for (const locale of locales) {
      for (const key of [
        'docsStart.warning.body',
        'docsProjects.backup.body',
        'faq.clearing.a',
      ] as const) {
        const text = catalog.translate(locale, key).toLowerCase();
        expect(text, `${locale} ${key}`).toContain('.koxora');
      }
    }
  });
});
describe('the screenshots the documentation shows', () => {
  it('uses only captures that exist, with their measured size', () => {
    for (const name of ['docs-dashboard', 'docs-properties', 'docs-shortcuts'])
      expect(screenshotSizes[name], name).toBeDefined();
  });
  it('describes each of them in both languages', () => {
    for (const locale of locales)
      for (const key of [
        'docsStart.shot.alt',
        'docsStart.shot.caption',
        'docsEditing.shot.alt',
        'docsEditing.shot.caption',
        'docsEditing.properties.alt',
        'docsEditing.properties.caption',
      ] as const)
        expect(
          catalog.translate(locale, key).trim().length,
          `${locale} ${key}`,
        ).toBeGreaterThan(20);
  });
  it('says in the caption that the picture is of the development version', () => {
    for (const locale of locales)
      for (const key of [
        'docsStart.shot.caption',
        'docsEditing.shot.caption',
        'docsEditing.properties.caption',
      ] as const)
        expect(
          catalog.translate(locale, key).toLowerCase(),
          `${locale} ${key}`,
        ).toMatch(
          locale === 'en' ? /development version/ : /entwicklungsstand/,
        );
  });
});
describe('the documentation is reachable', () => {
  it('has a page registered for every route the hub links to', () => {
    const linked = new Set(docsSections.map((section) => section.route));
    for (const route of routes)
      if (route.id.startsWith('docs') && route.id !== 'docs')
        expect(linked, route.id).toContain(route.id);
  });
});
