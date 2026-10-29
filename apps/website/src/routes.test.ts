import { describe, expect, it } from 'vitest';
import {
  alternatesFor,
  defaultLocale,
  locales,
  navRoutes,
  pathFor,
  redirects,
  routes,
} from './routes';
describe('public route table', () => {
  it('gives every page a localized path in every language', () => {
    const paths = routes.flatMap((route) =>
      locales.map((locale) => pathFor(route.id, locale)),
    );
    expect(new Set(paths).size).toBe(paths.length);
    // One or two lowercase segments: the comparison pages sit under the
    // comparison address, which is what makes their address say what they are.
    for (const path of paths)
      expect(path).toMatch(/^\/(en|de)\/([a-z0-9-]+\/){0,2}$/);
  });
  it('keeps German slugs distinct from English where they differ', () => {
    expect(pathFor('features', 'de')).toBe('/de/funktionen/');
    expect(pathFor('legalNotice', 'de')).toBe('/de/impressum/');
    expect(pathFor('privacyPolicy', 'de')).toBe('/de/datenschutz/');
    expect(pathFor('home', defaultLocale)).toBe('/en/');
  });
  it('links every language variant of a page to the others', () => {
    for (const route of routes) {
      const alternates = alternatesFor(route.id);
      expect(alternates.map((entry) => entry.locale).sort()).toEqual(
        [...locales].sort(),
      );
      for (const alternate of alternates)
        expect(alternate.path).toBe(pathFor(route.id, alternate.locale));
    }
  });
  it('redirects aliases and unprefixed paths to a real page', () => {
    const canonical = new Set(
      routes.flatMap((route) =>
        locales.map((locale) => pathFor(route.id, locale)),
      ),
    );
    const entries = redirects();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(canonical.has(entry.to)).toBe(true);
      expect(canonical.has(entry.from)).toBe(false);
      expect(entry.status).toBe(301);
    }
    expect(new Set(entries.map((entry) => entry.from)).size).toBe(
      entries.length,
    );
  });
  it('keeps the paths named in the legal requirements reachable', () => {
    const map = new Map(redirects().map((entry) => [entry.from, entry.to]));
    expect(map.get('/de/legal-notice/')).toBe('/de/impressum/');
    expect(map.get('/de/privacy-policy/')).toBe('/de/datenschutz/');
  });
  it('exposes navigation groups without duplicates', () => {
    for (const group of ['primary', 'product', 'resources', 'legal'] as const) {
      const ids = navRoutes(group).map((route) => route.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(navRoutes('legal').map((route) => route.id)).toContain(
      'privacySettings',
    );
  });
  it('excludes nothing public from the sitemap', () => {
    for (const route of routes) expect(route.sitemap).not.toBeNull();
  });
});
