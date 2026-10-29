import { site } from '../site';
/**
 * What the content security policy has to allow for the contact form.
 *
 * The reviewed policy forbids both submitting a form and opening a
 * connection: `form-action 'none'` and `connect-src 'none'`. That is correct
 * for a site with no form, and it would silently break this one — the browser
 * blocks the submission and the reader sees nothing happen.
 *
 * So the policy is widened by exactly the address the form actually posts to,
 * and only when one is configured. A deployment without a delivery service
 * keeps the stricter policy, because it renders no form either.
 */
export function contactPolicyExtras(
  endpoint: string | null = site.contactEndpoint,
  origin: string = site.origin,
): Record<string, string[]> {
  if (!endpoint) return {};
  let source: string;
  try {
    const target = new URL(endpoint, origin);
    // Only a real web address can be posted to. Anything else, a
    // `javascript:` or `data:` value above all, widens nothing.
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return {};
    source = target.origin === origin ? "'self'" : target.origin;
  } catch {
    // An endpoint that is not an address would be a configuration mistake;
    // widening nothing is the safe reading of it.
    return {};
  }
  return { 'form-action': [source], 'connect-src': [source] };
}
