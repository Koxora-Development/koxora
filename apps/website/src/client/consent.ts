// Consent controller state. Optional technologies stay inactive until an
// explicit decision is stored, and the stored record contains no identifier
// of any kind: only the schema version, the decision time and one boolean per
// purpose category.
import type { ConsentRuntimeConfig } from '../content/consent';
export type { ConsentRuntimeConfig };
export interface ConsentRecord {
  version: number;
  time: string;
  choices: Record<string, boolean>;
}
export interface ConsentApi {
  granted(): string[];
  has(category: string): boolean;
  onChange(listener: (granted: string[]) => void): () => void;
  open(): void;
}
declare global {
  interface Window {
    koxoraConsent?: ConsentApi;
  }
}
export function readConfig(document: Document): ConsentRuntimeConfig | null {
  const element = document.getElementById('koxora-consent-config');
  if (!element?.textContent) return null;
  try {
    const parsed = JSON.parse(element.textContent) as ConsentRuntimeConfig;
    if (!Array.isArray(parsed.optional) || typeof parsed.version !== 'number')
      return null;
    return parsed;
  } catch {
    return null;
  }
}
export function readRecord(
  config: ConsentRuntimeConfig,
  storage: Storage | null,
): ConsentRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(config.storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== config.version) return null;
    if (typeof parsed.choices !== 'object' || parsed.choices === null)
      return null;
    // A decision only counts when it covers every category now offered.
    if (config.optional.some((id) => typeof parsed.choices[id] !== 'boolean'))
      return null;
    return parsed;
  } catch {
    return null;
  }
}
export interface WriteResult {
  record: ConsentRecord;
  /** `false` when the decision could not be kept beyond this page view. */
  persisted: boolean;
}
export function writeRecord(
  config: ConsentRuntimeConfig,
  storage: Storage | null,
  choices: Record<string, boolean>,
  now = new Date(),
): WriteResult {
  const record: ConsentRecord = {
    version: config.version,
    time: now.toISOString(),
    choices,
  };
  try {
    if (!storage) return { record, persisted: false };
    storage.setItem(config.storageKey, JSON.stringify(record));
    return { record, persisted: true };
  } catch {
    // Storage can be unavailable; the decision then applies to this page view.
    return { record, persisted: false };
  }
}
export function clearRecord(
  config: ConsentRuntimeConfig,
  storage: Storage | null,
): void {
  try {
    storage?.removeItem(config.storageKey);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
/**
 * Purposes the deployment offers and the reader allowed. A category the
 * deployment no longer offers is never treated as granted, so a record left
 * over from an earlier configuration cannot activate anything.
 */
export function grantedCategories(
  record: ConsentRecord | null,
  config: ConsentRuntimeConfig | null = null,
): string[] {
  if (!record) return [];
  return Object.entries(record.choices)
    .filter(
      ([key, value]) =>
        value && (!config || config.optional.includes(key as never)),
    )
    .map(([key]) => key);
}
/**
 * Activates only the markup that was gated on a category now granted.
 *
 * The emitted content security policy allows scripts from the site's own
 * origin and the one hashed inline script. A gated third-party tag therefore
 * has to be an external script or an embed, and the category that gates it
 * declares the policy sources it needs; an inline gated script would be
 * blocked by the policy by design.
 */
export function activateGated(root: ParentNode, granted: string[]): void {
  for (const node of root.querySelectorAll<HTMLScriptElement>(
    'script[type="text/plain"][data-consent-category]',
  )) {
    const category = node.dataset.consentCategory;
    if (!category || !granted.includes(category) || node.dataset.consentActive)
      continue;
    const script = node.ownerDocument.createElement('script');
    for (const attribute of [...node.attributes])
      if (
        attribute.name !== 'type' &&
        !attribute.name.startsWith('data-consent')
      )
        script.setAttribute(attribute.name, attribute.value);
    script.text = node.textContent ?? '';
    script.dataset.consentInserted = category;
    node.dataset.consentActive = 'true';
    node.after(script);
  }
  for (const node of root.querySelectorAll<HTMLTemplateElement>(
    'template[data-consent-embed][data-consent-category]',
  )) {
    const category = node.dataset.consentCategory;
    if (!category || !granted.includes(category) || node.dataset.consentActive)
      continue;
    const content = node.content.cloneNode(true) as DocumentFragment;
    for (const element of content.querySelectorAll<HTMLElement>('*'))
      element.dataset.consentInserted = category;
    node.dataset.consentActive = 'true';
    node.after(content);
  }
}
/**
 * Removes what `activateGated` inserted, so a withdrawal stops embedded
 * content from loading further. Code that already executed cannot be undone;
 * a reload completes the withdrawal.
 */
export function deactivateGated(root: ParentNode, granted: string[]): void {
  for (const node of root.querySelectorAll<HTMLElement>(
    '[data-consent-inserted]',
  )) {
    const category = node.dataset.consentInserted;
    if (category && granted.includes(category)) continue;
    node.remove();
  }
  for (const node of root.querySelectorAll<HTMLElement>(
    '[data-consent-active]',
  )) {
    const category = node.dataset.consentCategory;
    if (category && granted.includes(category)) continue;
    delete node.dataset.consentActive;
  }
}
