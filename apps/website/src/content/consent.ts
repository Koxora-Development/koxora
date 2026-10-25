import type { MessageKey } from './catalog';
import { site } from '../site';
/**
 * Consent configuration.
 *
 * German law requires consent for storing or reading information on a user
 * device only where that is not strictly necessary for the service the user
 * asked for (section 25(2) no. 2 TDDDG). This deployment stores an appearance
 * preference, a language a reader selected in the language menu and, once a
 * decision exists, the consent record itself, so no first-visit banner is
 * shown. Optional categories stay
 * defined, tested and switched off until a deployment really uses one, which
 * is what `site.optionalConsent` declares.
 */
export const consentVersion = 1;
export const consentStorageKey = 'koxora.website.consent';
export type ConsentCategoryId =
  'necessary' | 'preferences' | 'statistics' | 'media';
export interface ConsentItem {
  id: string;
  nameKey: MessageKey;
  purposeKey: MessageKey;
  storageKey: MessageKey;
  provider: string;
  legalBasisKey: MessageKey;
  /** `true` while the deployment can actually create this entry. */
  active: boolean;
}
export interface ConsentCategory {
  id: ConsentCategoryId;
  optional: boolean;
  nameKey: MessageKey;
  descriptionKey: MessageKey;
  items: ConsentItem[];
  /**
   * Content security policy sources this category needs. Only an enabled
   * category widens the emitted policy, so gating a third party and allowing
   * it cannot drift apart.
   */
  policy?: Record<string, string[]>;
}
const koxora = 'Koxora';
export function consentCategories(
  enabled: readonly string[] = site.optionalConsent,
): ConsentCategory[] {
  const promptRequired = enabled.some((id) =>
    ['preferences', 'statistics', 'media'].includes(id),
  );
  return [
    {
      id: 'necessary',
      optional: false,
      nameKey: 'consent.category.necessary.name',
      descriptionKey: 'consent.category.necessary.description',
      items: [
        {
          id: 'theme',
          nameKey: 'consent.item.theme.name',
          purposeKey: 'consent.item.theme.purpose',
          storageKey: 'consent.item.theme.storage',
          provider: koxora,
          legalBasisKey: 'consent.legalBasis.necessary',
          active: true,
        },
        {
          id: 'language',
          nameKey: 'consent.item.language.name',
          purposeKey: 'consent.item.language.purpose',
          storageKey: 'consent.item.language.storage',
          provider: koxora,
          legalBasisKey: 'consent.legalBasis.necessary',
          // Written only when a reader presses an entry of the language
          // control. Opening an address that names its language stores
          // nothing, and nothing is stored before a choice is made.
          active: true,
        },
        {
          id: 'consent',
          nameKey: 'consent.item.consent.name',
          purposeKey: 'consent.item.consent.purpose',
          storageKey: 'consent.item.consent.storage',
          provider: koxora,
          legalBasisKey: 'consent.legalBasis.necessary',
          // Written only where a decision can be made at all.
          active: promptRequired,
        },
      ],
    },
    {
      id: 'preferences',
      optional: true,
      nameKey: 'consent.category.preferences.name',
      descriptionKey: 'consent.category.preferences.description',
      items: [],
    },
    {
      id: 'statistics',
      optional: true,
      nameKey: 'consent.category.statistics.name',
      descriptionKey: 'consent.category.statistics.description',
      items: [],
    },
    {
      id: 'media',
      optional: true,
      nameKey: 'consent.category.media.name',
      descriptionKey: 'consent.category.media.description',
      items: [],
    },
  ];
}
export function categoryById(
  id: string,
  enabled: readonly string[] = site.optionalConsent,
): ConsentCategory | undefined {
  return consentCategories(enabled).find((category) => category.id === id);
}
/** Optional categories the deployment actually uses, in display order. */
export function activeOptionalCategories(
  enabled: readonly string[] = site.optionalConsent,
): ConsentCategory[] {
  return consentCategories(enabled).filter(
    (category) => category.optional && enabled.includes(category.id),
  );
}
/** A first-visit prompt is lawful only when something optional is in use. */
export function consentPromptRequired(
  enabled: readonly string[] = site.optionalConsent,
): boolean {
  return activeOptionalCategories(enabled).length > 0;
}
/**
 * Everything the deployment can actually place on a reader's device, for the
 * privacy policy and the settings page. Server-side processing such as
 * delivery logging is not device storage and is described in the policy's own
 * sections instead.
 */
export function deviceStorageItems(
  enabled: readonly string[] = site.optionalConsent,
): ConsentItem[] {
  return consentCategories(enabled)
    .filter((category) => !category.optional || enabled.includes(category.id))
    .flatMap((category) => category.items)
    .filter((item) => item.active);
}
export function consentPolicyExtras(
  enabled: readonly string[] = site.optionalConsent,
): Record<string, string[]> {
  const extras: Record<string, string[]> = {};
  for (const category of activeOptionalCategories(enabled))
    for (const [directive, sources] of Object.entries(category.policy ?? {}))
      extras[directive] = [...(extras[directive] ?? []), ...sources];
  return extras;
}
export interface ConsentRuntimeConfig {
  version: number;
  storageKey: string;
  /** Optional categories offered on this deployment; empty means no banner. */
  optional: ConsentCategoryId[];
  promptRequired: boolean;
}
export function consentRuntimeConfig(
  enabled: readonly string[] = site.optionalConsent,
): ConsentRuntimeConfig {
  return {
    version: consentVersion,
    storageKey: consentStorageKey,
    optional: activeOptionalCategories(enabled).map((category) => category.id),
    promptRequired: consentPromptRequired(enabled),
  };
}
