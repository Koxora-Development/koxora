/** WCAG relative luminance; all callers supply trusted six-digit colors. */
export function luminance(color: string): number {
  const channels = [1, 3, 5].map((i) => {
    const n = parseInt(color.slice(i, i + 2), 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrastingColor(color: string): string {
  return luminance(color) > 0.179 ? '#000000' : '#ffffff';
}
/** Theme-aware transparent labels inherit the canvas foreground; explicit author colors never change. */
export function textColor(value: string, background = 'none'): string {
  if (value === 'none') return 'transparent';
  if (value !== 'auto') return value;
  return /^#[0-9a-f]{6}$/i.test(background)
    ? contrastingColor(background)
    : 'var(--ink)';
}
