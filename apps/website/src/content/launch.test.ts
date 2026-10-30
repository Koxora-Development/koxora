import { describe, expect, it } from 'vitest';
import {
  deploymentDiagnosticPhrases,
  launchCopy,
  preLaunchPhrases,
} from './launch';
import { catalog } from './catalog';
import { en } from './messages/en';
import { de } from './messages/de';
import { locales } from '../routes';
describe('copy addressed to a reader rather than to an operator', () => {
  // The contact page published "The form is not switched on here" because
  // "this deployment has no delivery service configured". That is a note to
  // whoever installs the site, printed on a public page: it told a reader
  // something about our infrastructure and nothing about how to reach us.
  // The page emitter reads every emitted page for the same wording; this
  // catches it one step earlier, in the message a page would render.
  it('has no deployment wording in any message, in either language', () => {
    for (const [language, messages] of [
      ['English', en],
      ['German', de],
    ] as const)
      for (const [key, message] of Object.entries(messages))
        for (const phrase of deploymentDiagnosticPhrases)
          expect(
            message,
            `${language} ${key} contains "${phrase}"`,
          ).not.toContain(phrase);
  });
  it('bans the wording that was actually published, not a token list', () => {
    // So this cannot pass by banning nothing in particular.
    for (const phrase of [
      'not switched on here',
      'no delivery service',
      'this deployment',
      'nicht eingeschaltet',
      'kein Versanddienst',
    ])
      expect(deploymentDiagnosticPhrases, phrase).toContain(phrase);
    // And the names and addresses that only exist inside a deployment, which
    // leak the same way: through copy written while looking at a server.
    for (const token of ['KOXORA_SITE_', '127.0.0.1', 'TinyCP', 'PHP-FPM'])
      expect(deploymentDiagnosticPhrases, token).toContain(token);
  });
  it('offers a way to make contact in both states of the page', () => {
    // Whether or not a delivery service is configured, the page says where to
    // write. The one without a form leads with the address rather than
    // explaining the absence of a control.
    for (const locale of locales) {
      expect(
        catalog.translate(locale, 'contact.hero.leadMail', {
          email: 'support@koxora.app',
        }),
      ).toContain('support@koxora.app');
      expect(
        catalog.translate(locale, 'contact.mail.title').length,
      ).toBeGreaterThan(0);
      expect(
        catalog.translate(locale, 'contact.mail.body').length,
      ).toBeGreaterThan(0);
    }
  });
});
describe('launch-aware copy', () => {
  it('describes the website as unpublished before it is live', () => {
    const copy = launchCopy(false);
    const text = locales
      .map((locale) =>
        [copy.statusSummary, copy.milestone]
          .map((key) => catalog.translate(locale, key))
          .join(' '),
      )
      .join(' ');
    expect(
      preLaunchPhrases.some((phrase) => text.includes(phrase)),
      'the pre-launch copy says so somewhere',
    ).toBe(true);
  });
  it('leaves no stale statement about the website once it is live', () => {
    const copy = launchCopy(true);
    for (const locale of locales)
      for (const key of [copy.statusSummary, copy.milestone]) {
        const message = catalog.translate(locale, key);
        for (const phrase of preLaunchPhrases)
          expect(message, `${locale} ${key}`).not.toContain(phrase);
      }
  });
  it('leaves the statements about the product alone', () => {
    // Publishing this website says nothing about a released studio or a
    // downloadable build, so these lines are not launch-sensitive at all and
    // must not appear in the switch.
    const switched = new Set(
      [launchCopy(false), launchCopy(true)].flatMap((copy) => [
        copy.statusSummary,
        copy.milestone,
      ]),
    );
    for (const key of ['footer.statusNote', 'footer.copyright'] as const) {
      expect(switched.has(key), key).toBe(false);
      for (const locale of locales) {
        const message = catalog.translate(locale, key, { year: 2026 });
        for (const phrase of preLaunchPhrases)
          expect(message, `${locale} ${key}`).not.toContain(phrase);
      }
    }
    // Both still say there is no public release, which stays true until the
    // studio itself is released.
    expect(catalog.translate('en', 'footer.statusNote')).toContain(
      'No public release yet',
    );
    expect(catalog.translate('de', 'footer.statusNote')).toContain(
      'Noch keine öffentliche Veröffentlichung',
    );
  });
  it('keeps the truth about the studio and downloads after the launch', () => {
    const copy = launchCopy(true);
    // Publishing the website says nothing about a released studio or a
    // downloadable build, so that sentence has to survive the launch.
    expect(catalog.translate('en', copy.statusSummary)).toContain(
      'no public release and no download yet',
    );
    expect(catalog.translate('de', copy.statusSummary)).toContain(
      'keine öffentliche Veröffentlichung und keinen Download',
    );
  });
});
