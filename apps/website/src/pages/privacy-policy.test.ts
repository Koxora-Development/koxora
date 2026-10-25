import { afterEach, describe, expect, it, vi } from 'vitest';
import { locales } from '../routes';
/**
 * The privacy policy carries a notice addressed to the operator while this
 * site is unpublished. A published build must not show it, and must still
 * show everything a reader is entitled to. The page is rendered here exactly
 * as the emitter renders it, so this asserts the emitted HTML rather than the
 * message catalog.
 */
async function renderPolicy(published: boolean, locale: string) {
  vi.resetModules();
  vi.stubEnv('KOXORA_SITE_PUBLISHED', published ? 'true' : 'false');
  const [
    { renderToStaticMarkup },
    react,
    { PrivacyPolicyPage },
    catalogModule,
  ] = await Promise.all([
    import('react-dom/server'),
    import('react'),
    import('./privacy-policy'),
    import('../content/catalog'),
  ]);
  const { catalog } = catalogModule;
  const context = {
    locale: locale as (typeof locales)[number],
    route: 'privacyPolicy' as const,
    t: ((key: never, values?: Record<string, string | number>) =>
      catalog.translate(locale, key, values)) as never,
  };
  return renderToStaticMarkup(
    react.createElement(PrivacyPolicyPage, context as never),
  );
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe('privacy policy in a published build', () => {
  const reviewWording = [
    ['Status of this document', 'Status dieses Dokuments'],
    ['prepared content', 'vorbereiteter Inhalt'],
    [
      'Before publication, the operator verifies',
      'Vor der Veröffentlichung prüft der Betreiber',
    ],
  ] as const;
  it('still shows the notice while the site is unpublished', async () => {
    for (const locale of locales) {
      const html = await renderPolicy(false, locale);
      const index = locale === 'en' ? 0 : 1;
      for (const pair of reviewWording)
        expect(html, `${locale} ${pair[index]}`).toContain(pair[index]);
    }
  });
  it('shows none of it once the site is published', async () => {
    for (const locale of locales) {
      const html = await renderPolicy(true, locale);
      for (const pair of reviewWording)
        for (const phrase of pair)
          expect(html, `${locale} ${phrase}`).not.toContain(phrase);
    }
  });
  it('keeps the version, the review date and the required sections', async () => {
    for (const locale of locales) {
      const html = await renderPolicy(true, locale);
      const expected =
        locale === 'en'
          ? [
              'Version 1.0',
              'October 24, 2026',
              '1. Scope',
              '2. Controller',
              'Your rights',
              'supervisory authority',
            ]
          : [
              'Fassung 1.0',
              '24. Oktober 2026',
              '1. Geltungsbereich',
              '2. Verantwortlicher',
              'Ihre Rechte',
              'Aufsichtsbehörde',
            ];
      for (const fragment of expected)
        expect(html, `${locale} ${fragment}`).toContain(fragment);
    }
  });
  it('does not claim the unpublished studio is already operated', async () => {
    for (const locale of locales) {
      const html = await renderPolicy(true, locale);
      const expected =
        locale === 'en'
          ? ['is not published yet', 'is not available yet']
          : ['noch nicht veröffentlicht', 'noch nicht verfügbar'];
      for (const fragment of expected)
        expect(html, `${locale} ${fragment}`).toContain(fragment);
    }
  });
});
