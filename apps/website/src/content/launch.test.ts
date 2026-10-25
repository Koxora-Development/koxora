import { describe, expect, it } from 'vitest';
import { launchCopy, preLaunchPhrases } from './launch';
import { catalog } from './catalog';
import { locales } from '../routes';
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
