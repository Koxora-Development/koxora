/** Shared portable rich-text contract. Font IDs resolve to local fonts in each renderer. */
export const TEXT_FONT_KEYS = [
  'sans',
  'serif',
  'mono',
  'arial',
  'helvetica',
  'verdana',
  'tahoma',
  'trebuchet',
  'segoe',
  'calibri',
  'georgia',
  'times',
  'cambria',
  'garamond',
  'palatino',
  'courier',
  'consolas',
  'menlo',
  'dejavu',
  'liberation',
] as const;
export const MAX_RICH_TEXT = 4096;
export type TextStyle = {
  fontFamily: (typeof TEXT_FONT_KEYS)[number];
  fontSize: number;
  fontWeight: 400 | 700;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textColor: string;
};
export type TextRun = {
  text: string;
  style: Partial<TextStyle>;
};
export type TextParagraph = {
  align: 'left' | 'center' | 'right';
  runs: TextRun[];
};
export type RichText = {
  version: 1;
  paragraphs: TextParagraph[];
};
export function plainText(value: RichText): string {
  return value.paragraphs
    .map((p) => p.runs.map((r) => r.text).join(''))
    .join('\n');
}
export function fromPlainText(
  text: string,
  align: 'left' | 'center' | 'right' = 'center',
): RichText {
  return {
    version: 1,
    paragraphs: text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((text) => ({ align, runs: text ? [{ text, style: {} }] : [] })),
  };
}
export function validTextStyle(key: string, value: unknown): boolean {
  if (key === 'fontFamily')
    return (
      typeof value === 'string' &&
      (TEXT_FONT_KEYS as readonly string[]).includes(value)
    );
  if (key === 'fontSize')
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 8 &&
      value <= 96
    );
  if (key === 'fontWeight') return value === 400 || value === 700;
  if (key === 'fontStyle') return value === 'normal' || value === 'italic';
  if (key === 'textDecoration')
    return value === 'none' || value === 'underline';
  return (
    key === 'textColor' &&
    typeof value === 'string' &&
    /^(#[0-9a-f]{6}|none|auto)$/i.test(value)
  );
}
/** Unknown rich-text semantics are retained by the archive and made read-only by the editor. */
export function isRichText(value: unknown): value is RichText {
  if (!value || typeof value !== 'object') return false;
  const v = value as RichText;
  if (
    v.version !== 1 ||
    Object.keys(v).some((k) => !['version', 'paragraphs'].includes(k)) ||
    !Array.isArray(v.paragraphs) ||
    !v.paragraphs.length ||
    v.paragraphs.length > MAX_RICH_TEXT + 1
  )
    return false;
  let length = v.paragraphs.length - 1;
  for (const p of v.paragraphs) {
    if (
      !p ||
      !['left', 'center', 'right'].includes(p.align) ||
      Object.keys(p).some((k) => !['align', 'runs'].includes(k)) ||
      !Array.isArray(p.runs)
    )
      return false;
    for (const r of p.runs) {
      if (
        !r ||
        typeof r.text !== 'string' ||
        r.text.includes('\n') ||
        r.text.includes('\r') ||
        Object.keys(r).some((k) => !['text', 'style'].includes(k)) ||
        !r.style ||
        typeof r.style !== 'object' ||
        Array.isArray(r.style)
      )
        return false;
      length += r.text.length;
      if (
        length > MAX_RICH_TEXT ||
        Object.entries(r.style).some(([k, v]) => !validTextStyle(k, v))
      )
        return false;
    }
  }
  return length <= MAX_RICH_TEXT;
}
