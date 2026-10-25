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
/**
 * The address the form posts to, or `null`.
 *
 * It becomes a form action and a policy source, so only a web address or a
 * path on this site is accepted. A misconfigured value yields no form at all
 * rather than a form pointing somewhere it should not.
 */
function contactEndpoint(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('/')) return value;
  try {
    const target = new URL(value);
    if (target.protocol !== 'https:' && target.protocol !== 'http:')
      return null;
    return target.toString();
  } catch {
    return null;
  }
}
export interface SiteConfig {
  /** Absolute origin used for canonical URLs, sitemap and social metadata. */
  origin: string;
  /**
   * Host names that answer but must never be the address of a page: they
   * redirect to `origin`, keeping the path and the query. The canonical host
   * itself is never in this list, and a redirect target is never built from
   * a request header.
   */
  aliasHosts: string[];
  /** Status code of the canonical host redirect; a permanent code. */
  aliasRedirectStatus: 301 | 308;
  /**
   * Request paths the alias hosts must answer themselves instead of
   * redirecting: certificate issuance and mail autodiscovery live on those
   * domains and would break if every request were sent to the canonical host.
   */
  aliasPassThroughPrefixes: string[];
  /** Address the public host proxies to; the container binds it alone. */
  container: { host: string; port: number; listenPort: number };
  /**
   * The contact delivery service, a second container on its own loopback
   * port. The public host routes the contact path to it directly, so the
   * website container never sees a submission and stays a static server.
   */
  contactService: { host: string; port: number; listenPort: number };
  /**
   * Absolute URL of the deployed browser editor, or `null` while it is not
   * published. The site never links to an address that does not answer.
   */
  editorUrl: string | null;
  /**
   * Absolute address of the contact delivery service, or `null` while none is
   * configured. The form is rendered only when it is set: a form that posts
   * nowhere is worse than an email address, so an unconfigured deployment
   * shows the email path instead of a control that cannot work.
   */
  contactEndpoint: string | null;
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
  aliasHosts: (
    env('KOXORA_SITE_ALIAS_HOSTS') ??
    'www.koxora.app,koxora.de,www.koxora.de,koxora.com,www.koxora.com'
  )
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
  // 308 keeps the method and the body of a non-GET request, which a 301 is
  // allowed to drop. Roll out with a temporary code first: a permanent
  // redirect is cached by browsers and is hard to take back.
  aliasRedirectStatus: 308,
  aliasPassThroughPrefixes: [
    // Certificate issuance over HTTP-01.
    '/.well-known/acme-challenge/',
    // Mail client autoconfiguration on the domain itself.
    '/.well-known/autoconfig/',
    '/.well-known/autodiscover/',
    '/autodiscover/',
  ],
  container: {
    host: env('KOXORA_SITE_CONTAINER_HOST') ?? '127.0.0.1',
    port: Number(env('KOXORA_SITE_CONTAINER_PORT') ?? 9402),
    listenPort: Number(env('KOXORA_SITE_LISTEN_PORT') ?? 8080),
  },
  editorUrl: env('KOXORA_SITE_EDITOR_URL')?.replace(/\/?$/, '/') ?? null,
  contactEndpoint: contactEndpoint(env('KOXORA_SITE_CONTACT_ENDPOINT')),
  contactService: {
    host: env('KOXORA_SITE_CONTACT_SERVICE_HOST') ?? '127.0.0.1',
    port: Number(env('KOXORA_SITE_CONTACT_SERVICE_PORT') ?? 9403),
    listenPort: Number(env('KOXORA_SITE_CONTACT_LISTEN_PORT') ?? 8081),
  },
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
