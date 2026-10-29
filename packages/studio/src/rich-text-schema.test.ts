import { expect, it } from 'vitest';
import { isRichText, plainText } from '@koxora/editor-core';
import {
  fromTextDocument,
  parsePlainTextClipboard,
  textSchema,
} from './rich-text-schema';

it.each(['\n', '\r\n', '\r'])(
  'plain clipboard text preserves blank/trailing lines, spaces and caret formatting with %j separators',
  (separator) => {
    const context = textSchema
      .node('doc', null, [
        textSchema.node('paragraph', { align: 'right' }, [
          textSchema.text('Styled', [
            textSchema.marks.fontWeight.create({ value: 700 }),
            textSchema.marks.fontFamily.create({ value: 'georgia' }),
          ]),
        ]),
      ])
      .resolve(2);
    const expected = ' A  line\n\n世界 \n';
    const slice = parsePlainTextClipboard(
      expected.replaceAll('\n', separator),
      context,
    );
    const value = fromTextDocument(textSchema.node('doc', null, slice.content));
    expect(isRichText(value)).toBe(true);
    expect(plainText(value)).toBe(expected);
    expect(slice.content.textBetween(0, slice.content.size, '\n')).toBe(
      expected,
    );
    expect(value.paragraphs.map((p) => p.align)).toEqual([
      'right',
      'right',
      'right',
      'right',
    ]);
    expect(value.paragraphs[1].runs).toEqual([]);
    expect(value.paragraphs[3].runs).toEqual([]);
    expect(value.paragraphs[2].runs[0].style).toEqual({
      fontWeight: 700,
      fontFamily: 'georgia',
    });
  },
);
