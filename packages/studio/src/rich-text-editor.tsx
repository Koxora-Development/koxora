import { useEffect, useRef, useState } from 'react';
import { DOMParser } from 'prosemirror-model';
import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { baseKeymap, splitBlock } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  FONT_FAMILIES,
  textColor,
  contrastingColor,
  TEXT_ATTRIBUTES,
  isRichText,
  type Appearance,
  type RichText,
  type TextStyle,
} from '@koxora/editor-core';
import {
  fromTextDocument,
  toTextDocument,
  textSchema,
  inertPaste,
  parsePlainTextClipboard,
} from './rich-text-schema';

export function RichTextEditor({
  value,
  base,
  locale,
  onChange,
  autoFocus = false,
  onPreview,
}: {
  value: RichText;
  base: Appearance;
  locale: string;
  onChange: (value: RichText) => void;
  autoFocus?: boolean;
  onPreview?: (value: RichText) => void;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null);
  const callback = useRef(onChange),
    preview = useRef(onPreview);
  useEffect(() => {
    callback.current = onChange;
    preview.current = onPreview;
  }, [onChange, onPreview]);
  const [initial] = useState({ value, base, autoFocus, locale });
  const [current, setCurrent] = useState<Partial<Appearance>>(base),
    [search, setSearch] = useState(''),
    [notice, setNotice] = useState<MessageKey | null>(null);
  function format(
    key: keyof TextStyle,
    value: TextStyle[keyof TextStyle],
    focus = true,
  ) {
    const editor = view.current;
    if (!editor) return;
    const { state } = editor,
      { from, to, empty } = state.selection;
    const mark = textSchema.marks[key].create({ value });
    const tr = empty
      ? state.tr.addStoredMark(mark)
      : state.tr.addMark(from, to, mark);
    editor.dispatch(tr);
    if (focus) editor.focus();
  }
  useEffect(() => {
    const toggle =
      (
        key: 'fontWeight' | 'fontStyle' | 'textDecoration',
        on: 700 | 'italic' | 'underline',
        off: 400 | 'normal' | 'none',
      ) =>
      () => {
        const editor = view.current;
        if (!editor) return false;
        const marks =
          editor.state.storedMarks ?? editor.state.selection.$from.marks();
        const active =
          marks.find((m) => m.type.name === key)?.attrs.value ??
          initial.base[key];
        const { from, to, empty } = editor.state.selection,
          mark = textSchema.marks[key].create({
            value: active === on ? off : on,
          });
        editor.dispatch(
          empty
            ? editor.state.tr.addStoredMark(mark)
            : editor.state.tr.addMark(from, to, mark),
        );
        return true;
      };
    const state = EditorState.create({
      doc: toTextDocument({
        ...initial.value,
        paragraphs: initial.value.paragraphs.map((p) => ({
          ...p,
          runs: p.runs.map((r) => ({
            ...r,
            style: {
              ...Object.fromEntries(
                TEXT_ATTRIBUTES.map((k) => [k, initial.base[k]]),
              ),
              ...r.style,
            },
          })),
        })),
      }),
      plugins: [
        history(),
        keymap({
          'Mod-b': toggle('fontWeight', 700, 400),
          'Mod-i': toggle('fontStyle', 'italic', 'normal'),
          'Mod-u': toggle('textDecoration', 'underline', 'none'),
          'Mod-z': undo,
          'Shift-Mod-z': redo,
          'Mod-y': redo,
          'Shift-Enter': splitBlock,
        }),
        keymap(baseKeymap),
        new Plugin({
          filterTransaction: (tr) => {
            if (!tr.docChanged || isRichText(fromTextDocument(tr.doc)))
              return true;
            setNotice('rich.limit');
            return false;
          },
        }),
      ],
    });
    const editor = new EditorView(host.current!, {
      state,
      clipboardTextParser: parsePlainTextClipboard,
      clipboardTextSerializer: (slice) =>
        slice.content.textBetween(0, slice.content.size, '\n'),
      attributes: {
        role: 'textbox',
        'aria-label': translate(initial.locale, 'diagram.label'),
        'aria-multiline': 'true',
        spellcheck: 'true',
        tabindex: '0',
      },
      dispatchTransaction(tr) {
        const next = editor.state.apply(tr);
        editor.updateState(next);
        if (tr.docChanged) {
          const rich = fromTextDocument(next.doc);
          callback.current(rich);
          preview.current?.(rich);
        }
        const { from, to, empty, $from } = next.selection;
        const values: Partial<Appearance> = {
          ...initial.base,
          align: $from.parent.attrs.align,
        };
        if (!empty) {
          const alignments = new Set<string>();
          next.doc.nodesBetween(from, to, (n) => {
            if (n.type.name === 'paragraph') alignments.add(n.attrs.align);
          });
          if (alignments.size > 1) values.align = undefined;
        }
        for (const key of TEXT_ATTRIBUTES) {
          const seen = new Set<unknown>();
          if (empty)
            seen.add(
              (next.storedMarks ?? $from.marks()).find(
                (m) => m.type.name === key,
              )?.attrs.value ?? initial.base[key],
            );
          else
            next.doc.nodesBetween(from, to, (n) => {
              if (n.isText)
                seen.add(
                  n.marks.find((m) => m.type.name === key)?.attrs.value ??
                    initial.base[key],
                );
            });
          Object.assign(values, {
            [key]: seen.size === 1 ? [...seen][0] : undefined,
          });
        }
        setCurrent(values);
      },
      handlePaste(editor, event) {
        const html = event.clipboardData?.getData('text/html');
        if (!html) return false;
        if (html.length > 1024 * 1024) {
          setNotice('rich.limit');
          return true;
        }
        const fragment = inertPaste(html);
        const slice = DOMParser.fromSchema(textSchema).parseSlice(fragment);
        editor.dispatch(
          editor.state.tr.replaceSelection(slice).scrollIntoView(),
        );
        setNotice('rich.pasteNote');
        return true;
      },
      handleDrop() {
        setNotice('rich.pasteNote');
        return true;
      },
    });
    view.current = editor;
    editor.dispatch(editor.state.tr);
    if (initial.autoFocus) editor.focus();
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [initial]);
  function align(value: Appearance['align']) {
    const editor = view.current;
    if (!editor) return;
    const tr = editor.state.tr;
    const { from, to } = editor.state.selection;
    editor.state.doc.nodesBetween(from, to, (n, pos) => {
      if (n.type.name === 'paragraph')
        tr.setNodeMarkup(pos, undefined, { ...n.attrs, align: value });
    });
    editor.dispatch(tr);
    editor.focus();
  }
  return (
    <div className="rich-text-editor">
      <div
        className="rich-toolbar"
        role="group"
        aria-label={t('text.formatting')}
      >
        <details className="font-picker">
          <summary
            aria-label={t('text.family')}
            style={{
              fontFamily: current.fontFamily
                ? FONT_FAMILIES[current.fontFamily]
                : undefined,
            }}
          >
            {current.fontFamily
              ? t(`text.family.${current.fontFamily}`)
              : t('format.mixed')}
          </summary>
          <div className="font-menu">
            <input
              type="search"
              aria-label={t('rich.searchFonts')}
              placeholder={t('rich.searchFonts')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div role="group" aria-label={t('text.family')}>
              {(Object.keys(FONT_FAMILIES) as Appearance['fontFamily'][])
                .filter((f) =>
                  t(`text.family.${f}`)
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()),
                )
                .map((f) => (
                  <button
                    type="button"
                    key={f}
                    style={{ fontFamily: FONT_FAMILIES[f] }}
                    aria-pressed={current.fontFamily === f}
                    onClick={(e) => {
                      format('fontFamily', f);
                      e.currentTarget
                        .closest('details')
                        ?.removeAttribute('open');
                    }}
                  >
                    {t(`text.family.${f}`)}
                  </button>
                ))}
            </div>
          </div>
        </details>
        <label>
          {t('diagram.fontSize')}
          <input
            type="number"
            min={8}
            max={96}
            step="any"
            aria-label={t('diagram.fontSize')}
            placeholder={t('format.mixed')}
            key={current.fontSize ?? 'mixed'}
            defaultValue={current.fontSize ?? ''}
            onBlur={(e) => {
              const n = e.target.valueAsNumber;
              if (n >= 8 && n <= 96) format('fontSize', n, false);
            }}
          />
        </label>
        {(['bold', 'italic', 'underline'] as const).map((style) => {
          const key =
            style === 'bold'
              ? 'fontWeight'
              : style === 'italic'
                ? 'fontStyle'
                : 'textDecoration';
          const on =
            style === 'bold'
              ? 700
              : style === 'italic'
                ? 'italic'
                : 'underline';
          const off =
            style === 'bold' ? 400 : style === 'italic' ? 'normal' : 'none';
          return (
            <button
              type="button"
              key={style}
              className={`button compact format-${style}`}
              aria-label={t(`text.${style}`)}
              aria-pressed={
                current[key] === undefined ? 'mixed' : current[key] === on
              }
              title={t(`text.${style}`)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format(key, current[key] === on ? off : on)}
            >
              {t(`rich.${style}`)}
            </button>
          );
        })}
        <label>
          {t('diagram.textColor')}
          <input
            type="color"
            aria-label={t('diagram.textColor')}
            value={
              current.textColor?.startsWith('#') ? current.textColor : '#18243d'
            }
            onChange={(e) => format('textColor', e.target.value, false)}
          />
          {current.textColor === undefined && <span>{t('format.mixed')}</span>}
        </label>
        <button
          type="button"
          className="button compact"
          aria-pressed={current.textColor === 'auto'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => format('textColor', 'auto')}
        >
          {t('text.autoColor')}
        </button>
        <label>
          {t('diagram.align')}
          <select
            aria-label={t('diagram.align')}
            value={current.align ?? ''}
            onChange={(e) => align(e.target.value as Appearance['align'])}
          >
            <option value="" disabled>
              {t('format.mixed')}
            </option>
            {(['left', 'center', 'right'] as const).map((a) => (
              <option key={a} value={a}>
                {t(`align.${a}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button compact"
          onClick={() => {
            const editor = view.current;
            if (!editor) return;
            const { from, to, empty } = editor.state.selection;
            editor.dispatch(
              empty
                ? editor.state.tr.setStoredMarks([])
                : editor.state.tr.removeMark(from, to),
            );
            editor.focus();
          }}
        >
          {t('rich.clear')}
        </button>
        <button
          type="button"
          className="button compact"
          aria-label={t('rich.undo')}
          onClick={() => {
            if (view.current) {
              undo(view.current.state, view.current.dispatch);
              view.current.focus();
            }
          }}
        >
          {'↶'}
        </button>
        <button
          type="button"
          className="button compact"
          aria-label={t('rich.redo')}
          onClick={() => {
            if (view.current) {
              redo(view.current.state, view.current.dispatch);
              view.current.focus();
            }
          }}
        >
          {'↷'}
        </button>
      </div>
      <div
        ref={host}
        className="rich-text-host"
        style={{
          fontFamily: FONT_FAMILIES[base.fontFamily],
          fontSize: base.fontSize,
          fontWeight: base.fontWeight,
          fontStyle: base.fontStyle,

          color: textColor(base.textColor),
          backgroundColor: base.textColor.startsWith('#')
            ? contrastingColor(base.textColor)
            : undefined,
          caretColor:
            base.textColor === 'none'
              ? 'var(--ink)'
              : textColor(base.textColor),
          textShadow:
            base.textColor === 'none' ? '0 0 0 var(--ink)' : undefined,
        }}
      />
      <p className="field-help">
        {t('rich.help')} {t('text.editContrast')}
      </p>
      {notice && (
        <p role="status" className="field-help">
          {t(notice)}
        </p>
      )}
    </div>
  );
}
