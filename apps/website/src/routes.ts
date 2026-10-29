// Single source of truth for public URLs. Every page exists in every locale
// with its own search-friendly slug; `hreflang`, the sitemap, the navigation
// and the hosting redirect table are derived from this table.
export const locales = ['en', 'de'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
export type RouteId =
  | 'home'
  | 'features'
  | 'localFirst'
  | 'compare'
  | 'compareDrawio'
  | 'compareMiro'
  | 'compareLucidchart'
  | 'contact'
  | 'contactSent'
  | 'contactProblem'
  | 'roadmap'
  | 'download'
  | 'docs'
  | 'docsStart'
  | 'docsEditing'
  | 'docsProjects'
  | 'docsFaq'
  | 'docsSupport'
  | 'releases'
  | 'legalNotice'
  | 'privacyPolicy'
  | 'privacySettings';
export type NavGroup = 'primary' | 'product' | 'resources' | 'legal';
export interface RouteDefinition {
  id: RouteId;
  /** Localized path segment; the home page uses an empty segment. */
  slugs: Record<Locale, string>;
  /** Historic or cross-language paths that must keep working. */
  aliases: Partial<Record<Locale, string[]>>;
  nav: NavGroup[];
  sitemap: { priority: number; changeFrequency: string } | null;
}
export const routes: RouteDefinition[] = [
  {
    id: 'home',
    slugs: { en: '', de: '' },
    aliases: {},
    nav: [],
    sitemap: { priority: 1, changeFrequency: 'weekly' },
  },
  {
    id: 'features',
    slugs: { en: 'features', de: 'funktionen' },
    aliases: { de: ['features'] },
    nav: ['primary', 'product'],
    sitemap: { priority: 0.9, changeFrequency: 'weekly' },
  },
  {
    id: 'localFirst',
    slugs: { en: 'local-first', de: 'local-first' },
    aliases: { de: ['lokal-zuerst'] },
    nav: ['primary', 'product'],
    sitemap: { priority: 0.8, changeFrequency: 'monthly' },
  },
  {
    id: 'compare',
    slugs: { en: 'compare', de: 'vergleich' },
    aliases: { de: ['compare'] },
    nav: ['primary', 'product'],
    sitemap: { priority: 0.7, changeFrequency: 'monthly' },
  },
  // One page per comparison, under the comparison path in both languages, so
  // the address says what the page is and stays stable if the set grows.
  {
    id: 'compareDrawio',
    slugs: { en: 'compare/drawio', de: 'vergleich/drawio' },
    aliases: { en: ['compare/diagrams-net'], de: ['vergleich/diagrams-net'] },
    nav: [],
    sitemap: { priority: 0.6, changeFrequency: 'monthly' },
  },
  {
    id: 'compareMiro',
    slugs: { en: 'compare/miro', de: 'vergleich/miro' },
    aliases: {},
    nav: [],
    sitemap: { priority: 0.6, changeFrequency: 'monthly' },
  },
  {
    id: 'compareLucidchart',
    slugs: { en: 'compare/lucidchart', de: 'vergleich/lucidchart' },
    aliases: {},
    nav: [],
    sitemap: { priority: 0.6, changeFrequency: 'monthly' },
  },
  {
    id: 'contact',
    slugs: { en: 'contact', de: 'kontakt' },
    aliases: { de: ['contact'], en: ['kontakt'] },
    nav: ['resources'],
    sitemap: { priority: 0.6, changeFrequency: 'monthly' },
  },
  // The two pages a submission without JavaScript lands on. They are not in
  // the sitemap and carry noindex: they are the answer to an action, not
  // content anyone should arrive at from a search.
  {
    id: 'contactSent',
    slugs: { en: 'contact/sent', de: 'kontakt/gesendet' },
    aliases: {},
    nav: [],
    sitemap: null,
  },
  {
    id: 'contactProblem',
    slugs: { en: 'contact/problem', de: 'kontakt/problem' },
    aliases: {},
    nav: [],
    sitemap: null,
  },
  {
    id: 'roadmap',
    slugs: { en: 'roadmap', de: 'roadmap' },
    aliases: {},
    nav: ['primary', 'resources'],
    sitemap: { priority: 0.8, changeFrequency: 'weekly' },
  },
  {
    id: 'download',
    slugs: { en: 'download', de: 'download' },
    aliases: { de: ['herunterladen'] },
    nav: ['primary', 'product'],
    sitemap: { priority: 0.7, changeFrequency: 'weekly' },
  },
  {
    id: 'docs',
    slugs: { en: 'docs', de: 'dokumentation' },
    aliases: { de: ['docs'] },
    nav: ['resources'],
    sitemap: { priority: 0.6, changeFrequency: 'monthly' },
  },
  // The documentation sections. Each is its own address under the
  // documentation path in both languages, so a link to one survives the
  // section list growing.
  {
    id: 'docsStart',
    slugs: { en: 'docs/getting-started', de: 'dokumentation/erste-schritte' },
    aliases: {},
    nav: [],
    sitemap: { priority: 0.6, changeFrequency: 'monthly' },
  },
  {
    id: 'docsEditing',
    slugs: { en: 'docs/editing', de: 'dokumentation/bearbeiten' },
    aliases: {},
    nav: [],
    sitemap: { priority: 0.6, changeFrequency: 'monthly' },
  },
  {
    id: 'docsProjects',
    slugs: { en: 'docs/projects', de: 'dokumentation/projekte' },
    aliases: {},
    nav: [],
    sitemap: { priority: 0.6, changeFrequency: 'monthly' },
  },
  {
    id: 'docsFaq',
    slugs: { en: 'docs/faq', de: 'dokumentation/faq' },
    aliases: { de: ['dokumentation/haeufige-fragen'] },
    nav: [],
    sitemap: { priority: 0.6, changeFrequency: 'monthly' },
  },
  {
    id: 'docsSupport',
    slugs: { en: 'docs/support', de: 'dokumentation/support' },
    aliases: {},
    nav: [],
    sitemap: { priority: 0.5, changeFrequency: 'monthly' },
  },
  {
    id: 'releases',
    slugs: { en: 'releases', de: 'releases' },
    aliases: { de: ['versionen'] },
    nav: ['resources'],
    sitemap: { priority: 0.6, changeFrequency: 'weekly' },
  },
  {
    id: 'legalNotice',
    slugs: { en: 'legal-notice', de: 'impressum' },
    aliases: { de: ['legal-notice'] },
    nav: ['legal'],
    sitemap: { priority: 0.3, changeFrequency: 'yearly' },
  },
  {
    id: 'privacyPolicy',
    slugs: { en: 'privacy-policy', de: 'datenschutz' },
    aliases: { de: ['privacy-policy', 'datenschutzerklaerung'] },
    nav: ['legal'],
    sitemap: { priority: 0.3, changeFrequency: 'yearly' },
  },
  {
    id: 'privacySettings',
    slugs: { en: 'privacy-settings', de: 'datenschutz-einstellungen' },
    aliases: { de: ['privacy-settings'] },
    nav: ['legal'],
    sitemap: { priority: 0.2, changeFrequency: 'yearly' },
  },
];
export function routeById(id: RouteId): RouteDefinition {
  const route = routes.find((entry) => entry.id === id);
  if (!route) throw new Error(`Unknown route: ${id}`);
  return route;
}
export function pathFor(id: RouteId, locale: Locale): string {
  const slug = routeById(id).slugs[locale];
  return slug ? `/${locale}/${slug}/` : `/${locale}/`;
}
export function urlFor(id: RouteId, locale: Locale, origin: string): string {
  return `${origin}${pathFor(id, locale)}`;
}
export function alternatesFor(id: RouteId): { locale: Locale; path: string }[] {
  return locales.map((locale) => ({ locale, path: pathFor(id, locale) }));
}
export function navRoutes(group: NavGroup): RouteDefinition[] {
  return routes.filter((route) => route.nav.includes(group));
}
export interface Redirect {
  from: string;
  to: string;
  status: 301 | 302;
}
/**
 * Permanent redirects the hosting layer must serve: cross-language aliases and
 * unprefixed paths. Language negotiation for `/` is handled separately because
 * it depends on the request, not on a fixed target.
 */
export function redirects(): Redirect[] {
  const entries: Redirect[] = [];
  const add = (from: string, to: string) => {
    if (from !== to && !entries.some((entry) => entry.from === from))
      entries.push({ from, to, status: 301 });
  };
  for (const route of routes) {
    for (const locale of locales) {
      const target = pathFor(route.id, locale);
      for (const alias of route.aliases[locale] ?? [])
        add(`/${locale}/${alias}/`, target);
    }
    // Unprefixed paths keep printed or historic links working.
    const unprefixed = new Set<string>();
    for (const locale of locales) {
      const slug = route.slugs[locale];
      if (slug) unprefixed.add(slug);
      for (const alias of route.aliases[locale] ?? []) unprefixed.add(alias);
    }
    for (const slug of unprefixed) {
      const locale =
        locales.find(
          (candidate) =>
            route.slugs[candidate] === slug ||
            (route.aliases[candidate] ?? []).includes(slug),
        ) ?? defaultLocale;
      const preferred =
        route.slugs[defaultLocale] === slug ? defaultLocale : locale;
      add(`/${slug}/`, pathFor(route.id, preferred));
    }
  }
  return entries;
}
