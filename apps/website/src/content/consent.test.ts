import { describe, expect, it } from 'vitest';
import {
  activeOptionalCategories,
  categoryById,
  consentCategories,
  consentPromptRequired,
  consentRuntimeConfig,
  consentStorageKey,
  consentVersion,
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
    const necessary = categoryById('necessary');
    expect(necessary?.optional).toBe(false);
    expect(necessary?.items.length).toBeGreaterThan(0);
    for (const item of necessary?.items ?? [])
      expect(item.legalBasisKey).toBe('consent.legalBasis.necessary');
  });
  it('declares every optional category without preselected items', () => {
    const optional = consentCategories.filter((category) => category.optional);
    expect(optional.map((category) => category.id)).toEqual([
      'preferences',
      'statistics',
      'media',
    ]);
  });
});
