import { describe, expect, it } from 'vitest';
import {
  activeOptionalCategories,
  categoryById,
  consentCategories,
  consentPolicyExtras,
  consentPromptRequired,
  consentRuntimeConfig,
  consentStorageKey,
  consentVersion,
  deviceStorageItems,
} from './consent';
describe('consent configuration', () => {
  it('asks for nothing when only strictly necessary storage is used', () => {
    expect(consentPromptRequired([])).toBe(false);
    expect(activeOptionalCategories([])).toEqual([]);
    expect(consentRuntimeConfig([])).toEqual({
      version: consentVersion,
      storageKey: consentStorageKey,
      optional: [],
      promptRequired: false,
    });
  });
  it('asks before an optional purpose is used', () => {
    expect(consentPromptRequired(['statistics'])).toBe(true);
    expect(consentRuntimeConfig(['statistics', 'media']).optional).toEqual([
      'statistics',
      'media',
    ]);
  });
  it('ignores unknown or non-optional category names', () => {
    expect(consentPromptRequired(['necessary'])).toBe(false);
    expect(consentPromptRequired(['tracking-pixels'])).toBe(false);
  });
  it('keeps the strictly necessary category switched on and documented', () => {
    const necessary = categoryById('necessary', []);
    expect(necessary?.optional).toBe(false);
    expect(necessary?.items.length).toBeGreaterThan(0);
    for (const item of necessary?.items ?? [])
      expect(item.legalBasisKey).toBe('consent.legalBasis.necessary');
  });
  it('declares every optional category without preselected items', () => {
    const optional = consentCategories([]).filter(
      (category) => category.optional,
    );
    expect(optional.map((category) => category.id)).toEqual([
      'preferences',
      'statistics',
      'media',
    ]);
  });
  describe('what the deployment says it stores on a device', () => {
    it('lists only the appearance preference when no decision can be made', () => {
      expect(deviceStorageItems([]).map((item) => item.id)).toEqual(['theme']);
    });
    it('adds the consent record once a decision is possible', () => {
      expect(deviceStorageItems(['statistics']).map((item) => item.id)).toEqual(
        ['theme', 'consent'],
      );
    });
    it('never presents server-side processing as device storage', () => {
      for (const enabled of [[], ['statistics', 'media']])
        expect(
          deviceStorageItems(enabled).map((item) => item.id),
        ).not.toContain('delivery');
    });
  });
  it('widens the content security policy only for a category in use', () => {
    expect(consentPolicyExtras([])).toEqual({});
    expect(consentPolicyExtras(['statistics', 'media'])).toEqual({});
  });
});
