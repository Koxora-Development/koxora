/** The only external destinations Studio may open. Relative URLs are not links. */
export function safeExternalUrl(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 2048 ||
    value !== value.trim() ||
    Array.from(value).some(
      (c) => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127 || c === '\\',
    ) ||
    /%0[ad]/i.test(value)
  )
    return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.href.length > 2048) return null;
    if (url.protocol === 'http:' || url.protocol === 'https:')
      return /^https?:\/\//i.test(value) && url.hostname ? url.href : null;
    if (url.protocol === 'mailto:')
      return url.pathname && !url.pathname.startsWith('//') ? url.href : null;
  } catch {
    // Invalid imported values remain inert.
  }
  return null;
}
