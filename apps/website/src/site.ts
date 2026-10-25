// Build-time deployment configuration. Defaults describe the reviewed W1
// state: no published browser editor, no optional consent-requiring
// technology, and a site that may be indexed once the Product Owner
// authorizes publication. Staging builds override these values.
function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}
function flag(name: string, fallback: boolean): boolean {
  const value = env(name)?.toLowerCase();
  if (value === undefined) return fallback;
  return value === '1' || value === 'true' || value === 'yes';
}
export interface SiteConfig {
  /** Absolute origin used for canonical URLs, sitemap and social metadata. */
  origin: string;
  /**
   * Absolute URL of the deployed browser editor, or `null` while it is not
   * published. The site never links to an address that does not answer.
   */
  editorUrl: string | null;
  /** Optional consent categories the deployment actually uses. */
  optionalConsent: string[];
  /** `false` emits `noindex` plus a disallow-all robots file (staging). */
  indexable: boolean;
  /**
   * `true` once this website itself is publicly live. It only governs copy
   * about the website; whether the studio or a download exists is decided by
   * `editorUrl` and by the release process, never by this flag.
   */
  published: boolean;
  /** Last editorial review of the published content. */
  contentDate: string;
  repositoryUrl: string;
  issuesUrl: string;
  securityUrl: string;
  email: {
    support: string;
    privacy: string;
    legal: string;
    security: string;
  };
}
export const site: SiteConfig = {
  origin: (env('KOXORA_SITE_ORIGIN') ?? 'https://koxora.app').replace(
    /\/$/,
    '',
  ),
  editorUrl: env('KOXORA_SITE_EDITOR_URL')?.replace(/\/?$/, '/') ?? null,
  optionalConsent: (env('KOXORA_SITE_OPTIONAL_CONSENT') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
  indexable: flag('KOXORA_SITE_INDEXABLE', true),
  published: flag('KOXORA_SITE_PUBLISHED', false),
  contentDate: env('KOXORA_SITE_CONTENT_DATE') ?? '2026-10-24',
  repositoryUrl: 'https://github.com/Koxora-Development/koxora',
  issuesUrl: 'https://github.com/Koxora-Development/koxora/issues',
  securityUrl:
    'https://github.com/Koxora-Development/koxora/blob/main/SECURITY.md',
  email: {
    support: 'support@koxora.app',
    privacy: 'privacy@koxora.app',
    legal: 'legal@koxora.app',
    security: 'security@koxora.app',
  },
};
