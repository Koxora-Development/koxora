import type { Connection, Json, Node } from '@koxora/project';
import {
  CONNECTION_KEY,
  FONT_FAMILIES,
  jsonObject,
  MAX_TEXT,
  type Appearance,
} from './shapes';

export const RICH_TEXT_KEY = 'org.koxora.rich-text';
export const TEXT_ATTRIBUTES = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'textDecoration',
  'textColor',
] as const;
export type TextStyle = Pick<Appearance, (typeof TEXT_ATTRIBUTES)[number]>;
export interface TextRun {
  text: string;
  style: Partial<TextStyle>;
}
export interface TextParagraph {
  align: Appearance['align'];
  runs: TextRun[];
}
export interface RichText {
  version: 1;
  paragraphs: TextParagraph[];
}
export function plainText(value: RichText): string {
  return value.paragraphs
    .map((p) => p.runs.map((r) => r.text).join(''))
    .join('\n');
}
export function fromPlainText(
  text: string,
  align: Appearance['align'] = 'center',
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
    return typeof value === 'string' && Object.hasOwn(FONT_FAMILIES, value);
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
    /^(#[0-9a-f]{6}|none)$/i.test(value)
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
    v.paragraphs.length > MAX_TEXT + 1
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
        length > MAX_TEXT ||
        Object.entries(r.style).some(([k, v]) => !validTextStyle(k, v))
      )
        return false;
    }
  }
  return length <= MAX_TEXT;
}
export function elementText(item: Node | Connection): string {
  return 'content' in item
    ? String((item as Node).content.text ?? '')
    : String(jsonObject(item.extensions[CONNECTION_KEY]).label ?? '');
}
export function readRichText(item: Node | Connection): RichText | undefined {
  const v = item.extensions[RICH_TEXT_KEY];
  return isRichText(v) && plainText(v) === elementText(item) ? v : undefined;
}
export function richTextJson(value: RichText): Json {
  return value as unknown as Json;
}
/** Only explicitly edited text attributes replace run overrides; other spans remain intact. */
export function formatRichText(
  value: RichText,
  patch: Partial<Appearance>,
): RichText {
  return {
    version: 1,
    paragraphs: value.paragraphs.map((p) => ({
      ...p,
      align: patch.align ?? p.align,
      runs: p.runs.map((r) => ({
        ...r,
        style: {
          ...r.style,
          ...Object.fromEntries(
            TEXT_ATTRIBUTES.filter((k) => patch[k] !== undefined).map((k) => [
              k,
              patch[k],
            ]),
          ),
        },
      })),
    })),
  };
}
