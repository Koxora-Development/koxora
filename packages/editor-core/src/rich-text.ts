import {
  isRichText,
  plainText,
  type RichText,
  type Connection,
  type Json,
  type Node,
} from '@koxora/project';
export {
  fromPlainText,
  plainText,
  isRichText,
  validTextStyle,
  type TextStyle,
  type TextRun,
  type TextParagraph,
  type RichText,
} from '@koxora/project';
import { CONNECTION_KEY, jsonObject, type Appearance } from './shapes';

export const RICH_TEXT_KEY = 'org.koxora.rich-text';
export const TEXT_ATTRIBUTES = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'textDecoration',
  'textColor',
] as const;
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
