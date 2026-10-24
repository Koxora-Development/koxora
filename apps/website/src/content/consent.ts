import type { MessageKey } from './catalog';
import { site } from '../site';
/**
 * Consent configuration.
 *
 * German law requires consent for storing or reading information on a user
 * device only where that is not strictly necessary for the service the user
 * asked for (section 25(2) no. 2 TDDDG). The W1 deployment stores only an
 * appearance preference and the consent record itself, so no first-visit
 * banner is shown. Optional categories stay defined, tested and switched off
 * until a deployment really uses one, which is what `site.optionalConsent`
 * declares.
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
}
export interface ConsentCategory {
  id: ConsentCategoryId;
  optional: boolean;
  nameKey: MessageKey;
  descriptionKey: MessageKey;
  items: ConsentItem[];
}
const koxora = 'Koxora';
export const consentCategories: ConsentCategory[] = [
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
      },
      {
        id: 'consent',
        nameKey: 'consent.item.consent.name',
        purposeKey: 'consent.item.consent.purpose',
        storageKey: 'consent.item.consent.storage',
        provider: koxora,
        legalBasisKey: 'consent.legalBasis.necessary',
      },
      {
        id: 'delivery',
        nameKey: 'consent.item.delivery.name',
        purposeKey: 'consent.item.delivery.purpose',
        storageKey: 'consent.item.delivery.storage',
        provider: 'Hetzner Online GmbH, Cloudflare, Inc.',
        legalBasisKey: 'consent.legalBasis.necessary',
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
export function categoryById(id: string): ConsentCategory | undefined {
  return consentCategories.find((category) => category.id === id);
}
/** Optional categories the deployment actually uses, in display order. */
export function activeOptionalCategories(
  enabled: readonly string[] = site.optionalConsent,
): ConsentCategory[] {
  return consentCategories.filter(
    (category) => category.optional && enabled.includes(category.id),
  );
}
/** A first-visit prompt is lawful only when something optional is in use. */
export function consentPromptRequired(
  enabled: readonly string[] = site.optionalConsent,
): boolean {
  return activeOptionalCategories(enabled).length > 0;
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
