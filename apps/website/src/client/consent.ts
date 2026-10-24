// Consent controller. Optional technologies stay inactive until an explicit
// decision is stored, and the stored record contains no identifier of any
// kind: only the schema version, the decision time and one boolean per
// purpose category.
export interface ConsentRuntimeConfig {
  version: number;
  storageKey: string;
  optional: string[];
  promptRequired: boolean;
}
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
export function writeRecord(
  config: ConsentRuntimeConfig,
  storage: Storage | null,
  choices: Record<string, boolean>,
  now = new Date(),
): ConsentRecord {
  const record: ConsentRecord = {
    version: config.version,
    time: now.toISOString(),
    choices,
  };
  try {
    storage?.setItem(config.storageKey, JSON.stringify(record));
  } catch {
    // Storage can be unavailable; the decision then applies to this page view.
  }
  return record;
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
export function grantedCategories(record: ConsentRecord | null): string[] {
  if (!record) return [];
  return Object.entries(record.choices)
    .filter(([, value]) => value)
    .map(([key]) => key);
}
/** Activates only the markup that was gated on a category now granted. */
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
    node.dataset.consentActive = 'true';
    node.after(script);
  }
  for (const node of root.querySelectorAll<HTMLTemplateElement>(
    'template[data-consent-embed][data-consent-category]',
  )) {
    const category = node.dataset.consentCategory;
    if (!category || !granted.includes(category) || node.dataset.consentActive)
      continue;
    node.dataset.consentActive = 'true';
    node.after(node.content.cloneNode(true));
  }
}
