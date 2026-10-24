import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { en } from './messages/en';
import { de } from './messages/de';
import {
  comparisonFocus,
  comparisonMethod,
  featureLimitKeys,
  features,
  milestones,
  noTrackingKeys,
  peers,
  phases,
  plannedDocsKeys,
  plannedDownloadKeys,
  plannedReleaseKeys,
  repositoryDocuments,
} from './data';
import { consentCategories } from './consent';
const placeholders = (message: string) =>
  [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
describe('website message catalog', () => {
  it('translates every key into German', () => {
    expect(catalog.missing('de')).toEqual([]);
  });
  it('has no empty or placeholder-only messages', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), `English ${key}`).not.toBe('');
      expect(de[key as keyof typeof de].trim(), `German ${key}`).not.toBe('');
    }
  });
  it('keeps the same interpolations in both languages', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[])
      expect(placeholders(de[key]), key).toEqual(placeholders(en[key]));
  });
  it('falls back to English for an unknown language', () => {
    expect(catalog.translate('fr', 'brand.name')).toBe(en['brand.name']);
    expect(catalog.resolve('fr')).toBe('en');
    expect(catalog.resolve('de')).toBe('de');
  });
  it('interpolates values', () => {
    expect(
      catalog.translate('en', 'footer.copyright', { year: 2026 }),
    ).toContain('2026');
    expect(() => catalog.translate('en', 'footer.copyright')).toThrow();
  });
  it('resolves every key referenced by the structured content', () => {
    const referenced = [
      ...features.flatMap((entry) => [entry.titleKey, entry.bodyKey]),
      ...phases.flatMap((entry) => [entry.titleKey, entry.bodyKey]),
      ...peers.flatMap((entry) => [entry.nameKey, entry.bodyKey]),
      ...milestones.flatMap((entry) => [entry.titleKey, entry.bodyKey]),
      ...comparisonFocus.flatMap((entry) => [entry.titleKey, entry.bodyKey]),
      ...comparisonMethod.flatMap((entry) => [entry.titleKey, entry.bodyKey]),
      ...repositoryDocuments.map((entry) => entry.labelKey),
      ...consentCategories.flatMap((category) => [
        category.nameKey,
        category.descriptionKey,
        ...category.items.flatMap((item) => [
          item.nameKey,
          item.purposeKey,
          item.storageKey,
          item.legalBasisKey,
        ]),
      ]),
      ...featureLimitKeys,
      ...plannedDocsKeys,
      ...plannedDownloadKeys,
      ...plannedReleaseKeys,
      ...noTrackingKeys,
    ];
    for (const key of referenced) {
      expect(Object.hasOwn(en, key), `English ${key}`).toBe(true);
      expect(
        catalog.translate('de', key).length,
        `German ${key}`,
      ).toBeGreaterThan(0);
    }
  });
  it('labels every capability with a status that has a legend entry', () => {
    const statuses = new Set(features.map((entry) => entry.status));
    expect([...statuses].sort()).toEqual([
      'available',
      'in-development',
      'planned',
    ]);
    for (const key of [
      'status.legend.available',
      'status.legend.inDevelopment',
      'status.legend.planned',
      'status.legend.concept',
    ] as const)
      expect(en[key].length).toBeGreaterThan(20);
  });
});
