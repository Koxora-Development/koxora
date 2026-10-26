import {
  Fragment,
  Schema,
  Slice,
  type Node as TextNode,
  type ResolvedPos,
} from 'prosemirror-model';
import {
  FONT_FAMILIES,
  TEXT_ATTRIBUTES,
  validTextStyle,
  type RichText,
  type TextStyle,
} from '@koxora/editor-core';
const cssKeys: Record<keyof TextStyle, string> = {
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  fontStyle: 'font-style',
  textDecoration: 'text-decoration',
  textColor: 'color',
};
function parseStyle(
  key: keyof TextStyle,
  value: string,
): string | number | null {
  let v: unknown = value;
  if (key === 'fontFamily')
    v = Object.keys(FONT_FAMILIES).find(
      (k) =>
        k === value ||
        FONT_FAMILIES[k as keyof typeof FONT_FAMILIES]
          .split(',')[0]
          .replaceAll('"', '')
          .toLowerCase() ===
          value.split(',')[0].replaceAll('"', '').trim().toLowerCase(),
    );
  if (key === 'fontSize')
    v = /^[\d.]+(px|pt)$/.test(value)
      ? parseFloat(value) * (value.endsWith('pt') ? 4 / 3 : 1)
      : null;
  if (key === 'fontWeight')
    v = value === 'bold' ? 700 : value === 'normal' ? 400 : Number(value);
  if (key === 'textColor' && value === 'transparent') v = 'none';
  if (key === 'textColor' && /^rgb\(/.test(value)) {
    const rgb = value.match(/\d+/g);
    v =
      rgb?.length === 3
        ? '#' + rgb.map((x) => Number(x).toString(16).padStart(2, '0')).join('')
        : null;
  }
  if (key === 'textDecoration')
    v = value.includes('underline') ? 'underline' : 'none';
  return validTextStyle(key, v) ? (v as string | number) : null;
}
export const textSchema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      attrs: { align: { default: 'left' } },
      parseDOM: [
        {
          tag: 'p',
          getAttrs: (el) => ({
            align: ['left', 'center', 'right'].includes(
              (el as HTMLElement).style.textAlign,
            )
              ? (el as HTMLElement).style.textAlign
              : 'left',
          }),
        },
        {
          tag: 'div',
          getAttrs: (el) => ({
            align: ['left', 'center', 'right'].includes(
              (el as HTMLElement).style.textAlign,
            )
              ? (el as HTMLElement).style.textAlign
              : 'left',
          }),
        },
      ],
      toDOM: (n) => ['p', { style: `text-align:${n.attrs.align}` }, 0],
    },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      // Native DOM input may contain literal newlines (notably in Firefox).
      // Preserve them as breaks instead of normalizing them to spaces.
      linebreakReplacement: true,
      leafText: () => '\n',
      parseDOM: [{ tag: 'br' }],
      toDOM: () => ['br'],
    },
    text: { group: 'inline' },
  },
  marks: Object.fromEntries(
    TEXT_ATTRIBUTES.map((key) => [
      key,
      {
        attrs: { value: {} },
        parseDOM: [
          {
            style: cssKeys[key],
            getAttrs: (value: string) => {
              const v = parseStyle(key, value);
              return v === null ? false : { value: v };
            },
          },
          ...(key === 'fontWeight'
            ? [
                { tag: 'strong', attrs: { value: 700 } },
                { tag: 'b', attrs: { value: 700 } },
              ]
            : key === 'fontStyle'
              ? [
                  { tag: 'em', attrs: { value: 'italic' } },
                  { tag: 'i', attrs: { value: 'italic' } },
                ]
              : key === 'textDecoration'
                ? [{ tag: 'u', attrs: { value: 'underline' } }]
                : []),
        ],
        toDOM: (mark: { attrs: Record<string, unknown> }) =>
          [
            'span',
            {
              style: `${cssKeys[key]}:${key === 'fontFamily' ? FONT_FAMILIES[mark.attrs.value as keyof typeof FONT_FAMILIES] : key === 'fontSize' ? `${mark.attrs.value}px` : key === 'textColor' && mark.attrs.value === 'none' ? 'transparent' : mark.attrs.value}`,
            },
            0,
          ] as [string, Record<string, string>, number],
      },
    ]),
  ),
});
export function toTextDocument(value: RichText): TextNode {
  return textSchema.node(
    'doc',
    null,
    value.paragraphs.map((p) =>
      textSchema.node(
        'paragraph',
        { align: p.align },
        p.runs
          .filter((r) => r.text)
          .map((r) =>
            textSchema.text(
              r.text,
              Object.entries(r.style).map(([k, v]) =>
                textSchema.marks[k].create({ value: v }),
              ),
            ),
          ),
      ),
    ),
  );
}
export function fromTextDocument(doc: TextNode): RichText {
  const paragraphs: RichText['paragraphs'] = [];
  doc.forEach((p) => {
    let runs: RichText['paragraphs'][number]['runs'] = [];
    p.forEach((n) => {
      if (n.type.name === 'hard_break') {
        paragraphs.push({ align: p.attrs.align, runs });
        runs = [];
      } else
        runs.push({
          text: n.text ?? '',
          style: Object.fromEntries(
            n.marks.map((m) => [m.type.name, m.attrs.value]),
          ),
        });
    });
    paragraphs.push({ align: p.attrs.align, runs });
  });
  return { version: 1, paragraphs };
}
/** Keep blank/trailing lines and the insertion point's formatting on plain paste. */
export function parsePlainTextClipboard(
  text: string,
  context: ResolvedPos,
): Slice {
  return Slice.maxOpen(
    Fragment.from(
      text
        .split(/\r\n?|\n/)
        .map((line) =>
          textSchema.nodes.paragraph.create(
            { align: context.parent.attrs.align },
            line ? textSchema.text(line, context.marks()) : undefined,
          ),
        ),
    ),
  );
}
/** Clipboard HTML lives only in an inert template; forbidden active/resource nodes never reach the editor. */
export function inertPaste(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content
    .querySelectorAll(
      'script,style,link,meta,iframe,object,embed,img,video,audio,svg,math,template',
    )
    .forEach((n) => n.remove());
  template.content.querySelectorAll('*').forEach((n) => {
    for (const a of [...n.attributes])
      if (a.name !== 'style') n.removeAttribute(a.name);
  });
  return template.content;
}
