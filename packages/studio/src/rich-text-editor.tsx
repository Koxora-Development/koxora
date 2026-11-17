import { InfoDisclosure } from './info-disclosure';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DOMParser } from 'prosemirror-model';
import { EditorState, Plugin, TextSelection } from 'prosemirror-state';
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
  plainText,
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

/** Remains within its editor's DOM ancestry while the top layer escapes scroll clipping. */
export function FontPicker({
  locale,
  value,
  onChange,
}: {
  locale: string;
  value?: Appearance['fontFamily'];
  onChange: (font: Appearance['fontFamily']) => void;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const id = useId();
  const details = useRef<HTMLDetailsElement>(null),
    menu = useRef<HTMLDivElement>(null),
    searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  function close() {
    const element = menu.current;
    if (element?.hidePopover && element.matches(':popover-open'))
      element.hidePopover();
    if (details.current) details.current.open = false;
    setOpen(false);
  }
  useLayoutEffect(() => {
    const element = menu.current;
    if (!element || !open) return;
    const position = () => {
      const anchor = details.current
        ?.querySelector('summary')
        ?.getBoundingClientRect();
      if (!anchor) return;
      const viewport = window.visualViewport;
      const left = (viewport?.offsetLeft ?? 0) + 8,
        top = (viewport?.offsetTop ?? 0) + 8,
        width = (viewport?.width ?? innerWidth) - 16,
        height = (viewport?.height ?? innerHeight) - 16;
      element.style.maxWidth = `${Math.max(1, width)}px`;
      element.style.maxHeight = `${Math.max(1, height)}px`;
      const rect = element.getBoundingClientRect();
      const below = top + height - anchor.bottom,
        above = anchor.top - top;
      const y =
        below >= rect.height || below >= above
          ? anchor.bottom + 4
          : anchor.top - rect.height - 4;
      element.style.left = `${Math.max(left, Math.min(anchor.left, left + width - rect.width))}px`;
      element.style.top = `${Math.max(top, Math.min(y, top + height - rect.height))}px`;
    };
    if (element.showPopover && !element.matches(':popover-open'))
      element.showPopover();
    position();
    searchInput.current?.focus({ preventScroll: true });
    const observer = new ResizeObserver(position);
    observer.observe(element);
    const outside = (event: PointerEvent) => {
      if (!details.current?.contains(event.target as globalThis.Node)) close();
    };
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
    };
  }, [open]);
  return (
    <details
      className="font-picker"
      ref={details}
      open={open}
      onToggle={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.currentTarget.open) {
          setOpen(true);
          setSearch('');
        } else close();
      }}
    >
      <summary
        aria-label={t('text.family')}
        aria-controls={id}
        aria-expanded={open}
        aria-haspopup="dialog"
        style={{ fontFamily: value ? FONT_FAMILIES[value] : undefined }}
      >
        {value ? t(`text.family.${value}`) : t('format.mixed')}
      </summary>
      <div
        id={id}
        ref={menu}
        className="font-menu"
        popover="manual"
        data-no-drag="true"
        role="dialog"
        aria-label={t('text.family')}
        onToggle={(event) => {
          if (
            event.target === menu.current &&
            (event.nativeEvent as ToggleEvent).newState === 'closed'
          ) {
            if (details.current) details.current.open = false;
            setOpen(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
            details.current?.querySelector('summary')?.focus();
          } else if (
            ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) &&
            (event.key.startsWith('Arrow') ||
              event.target instanceof HTMLButtonElement)
          ) {
            event.preventDefault();
            const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                'button',
              ),
            ];
            const index = buttons.indexOf(event.target as HTMLButtonElement);
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : index < 0
                    ? event.key === 'ArrowUp'
                      ? buttons.length - 1
                      : 0
                    : (index +
                        (event.key === 'ArrowUp' ? -1 : 1) +
                        buttons.length) %
                      buttons.length;
            buttons[next]?.focus();
          }
        }}
      >
        <input
          ref={searchInput}
          type="search"
          aria-label={t('rich.searchFonts')}
          placeholder={t('rich.searchFonts')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div role="group" aria-label={t('text.family')}>
          {(Object.keys(FONT_FAMILIES) as Appearance['fontFamily'][])
            .filter((font) =>
              t(`text.family.${font}`)
                .toLocaleLowerCase()
                .includes(search.toLocaleLowerCase()),
            )
            .map((font) => (
              <button
                type="button"
                key={font}
                style={{ fontFamily: FONT_FAMILIES[font] }}
                aria-pressed={value === font}
                onClick={() => {
                  close();
                  setSearch('');
                  // Range controls keep a visible keyboard target; rich editors
                  // can then return focus to their retained text selection.
                  details.current
                    ?.querySelector('summary')
                    ?.focus({ preventScroll: true });
                  onChange(font);
                }}
              >
                {t(`text.family.${font}`)}
              </button>
            ))}
        </div>
      </div>
    </details>
  );
}

export function RichTextEditor({
  value,
  base,
  locale,
  onChange,
  autoFocus = false,
  onPreview,
  label,
  maxLength = 4096,
  toolbarContainer,
  embedded = false,
  focusRequest,
}: {
  value: RichText;
  base: Appearance;
  locale: string;
  onChange: (value: RichText) => void;
  autoFocus?: boolean;
  onPreview?: (value: RichText) => void;
  label?: string;
  maxLength?: number;
  toolbarContainer?: HTMLElement | null;
  embedded?: boolean;
  focusRequest?: { key: number; selection: 'all' | 'end' };
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null);
  const callback = useRef(onChange),
    preview = useRef(onPreview);
  const limit = useRef(maxLength);
  const localAcknowledgements = useRef<string[]>([]);
  useEffect(() => {
    limit.current = maxLength;
  }, [maxLength]);
  useEffect(() => {
    callback.current = onChange;
    preview.current = onPreview;
  }, [onChange, onPreview]);
  const [initial] = useState({
    value,
    base,
    autoFocus,
    locale,
    label,
    embedded,
  });
  const currentBase = useRef(base);
  const [current, setCurrent] = useState<Partial<Appearance>>({
      ...base,
      ...(!plainText(value) ? value.paragraphs[0]?.runs[0]?.style : {}),
    }),
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
      ? state.tr.addStoredMark(mark).setMeta('koxora.emptyStyle', true)
      : state.tr.addMark(from, to, mark);
    editor.dispatch(tr);
    if (focus) editor.focus();
  }
  useLayoutEffect(() => {
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
          currentBase.current[key];
        const { from, to, empty } = editor.state.selection,
          mark = textSchema.marks[key].create({
            value: active === on ? off : on,
          });
        editor.dispatch(
          empty
            ? editor.state.tr
                .addStoredMark(mark)
                .setMeta('koxora.emptyStyle', true)
            : editor.state.tr.addMark(from, to, mark),
        );
        return true;
      };
    const emptyStyle = !plainText(initial.value)
      ? initial.value.paragraphs[0]?.runs[0]?.style
      : undefined;
    const state = EditorState.create({
      storedMarks: emptyStyle
        ? TEXT_ATTRIBUTES.map((key) =>
            textSchema.marks[key].create({
              value: emptyStyle[key] ?? initial.base[key],
            }),
          )
        : undefined,
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
          ...(initial.embedded ? { 'Alt-Enter': splitBlock } : {}),
        }),
        keymap(baseKeymap),
        new Plugin({
          filterTransaction: (tr) => {
            const rich = fromTextDocument(tr.doc);
            if (
              !tr.docChanged ||
              (isRichText(rich) && plainText(rich).length <= limit.current)
            )
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
        'aria-label':
          initial.label ?? translate(initial.locale, 'diagram.label'),
        'aria-multiline': 'true',
        spellcheck: 'true',
        tabindex: '0',
      },
      dispatchTransaction(tr) {
        const previousMarks =
          editor.state.storedMarks ?? editor.state.selection.$from.marks();
        const next = editor.state.apply(tr);
        editor.updateState(next);
        if (
          tr.docChanged ||
          (tr.getMeta('koxora.emptyStyle') && !next.doc.textContent)
        ) {
          const rich = fromTextDocument(next.doc);
          if (!next.doc.textContent) {
            const paragraph = rich.paragraphs[next.selection.$from.index(0)];
            const marks = next.storedMarks ?? previousMarks;
            if (paragraph && marks.length)
              paragraph.runs = [
                {
                  text: '',
                  style: Object.fromEntries(
                    marks.map((mark) => [mark.type.name, mark.attrs.value]),
                  ),
                },
              ];
          }
          // Controlled props may acknowledge an older transaction after native
          // input has already advanced. Never rewind the newer editor state.
          localAcknowledgements.current.push(JSON.stringify(rich));
          if (localAcknowledgements.current.length > 64)
            localAcknowledgements.current.splice(
              0,
              localAcknowledgements.current.length - 64,
            );
          callback.current(rich);
          preview.current?.(rich);
        }
        const { from, to, empty, $from } = next.selection;
        const values: Partial<Appearance> = {
          ...currentBase.current,
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
              )?.attrs.value ?? currentBase.current[key],
            );
          else
            next.doc.nodesBetween(from, to, (n) => {
              if (n.isText)
                seen.add(
                  n.marks.find((m) => m.type.name === key)?.attrs.value ??
                    currentBase.current[key],
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
  useLayoutEffect(() => {
    const editor = view.current;
    if (!editor || !focusRequest) return;
    const { doc, storedMarks } = editor.state;
    const end = TextSelection.atEnd(doc).to;
    const start =
      focusRequest.selection === 'all' ? TextSelection.atStart(doc).from : end;
    const tr = editor.state.tr.setSelection(
      TextSelection.create(doc, start, end),
    );
    if (storedMarks) tr.setStoredMarks(storedMarks);
    editor.dispatch(tr);
    editor.focus();
  }, [focusRequest]);
  useEffect(() => {
    const baseChanged =
      JSON.stringify(currentBase.current) !== JSON.stringify(base);
    currentBase.current = base;
    const editor = view.current;
    if (!editor) return;
    // Acknowledging our own transaction must preserve native line breaks, selection and undo.
    const acknowledged = JSON.stringify(value);
    const localIndex = localAcknowledgements.current.lastIndexOf(acknowledged);
    if (localIndex >= 0) {
      localAcknowledgements.current.splice(0, localIndex + 1);
      if (baseChanged) editor.dispatch(editor.state.tr);
      return;
    }
    if (
      !editor.state.doc.textContent &&
      !value.paragraphs.some((paragraph) =>
        paragraph.runs.some((run) => run.text),
      )
    ) {
      const paragraph =
        value.paragraphs[editor.state.selection.$from.index(0)] ??
        value.paragraphs[0];
      const seed = paragraph?.runs[0]?.style ?? {};
      editor.dispatch(
        editor.state.tr.setStoredMarks(
          TEXT_ATTRIBUTES.map((key) =>
            textSchema.marks[key].create({ value: seed[key] ?? base[key] }),
          ),
        ),
      );
    }
    if (JSON.stringify(fromTextDocument(editor.state.doc)) === acknowledged) {
      if (baseChanged) editor.dispatch(editor.state.tr);
      return;
    }
    localAcknowledgements.current = [];
    const doc = toTextDocument({
      ...value,
      paragraphs: value.paragraphs.map((paragraph) => ({
        ...paragraph,
        runs: paragraph.runs.map((run) => ({
          ...run,
          style: {
            ...Object.fromEntries(
              TEXT_ATTRIBUTES.map((key) => [key, base[key]]),
            ),
            ...run.style,
          },
        })),
      })),
    });
    if (editor.state.doc.eq(doc)) {
      // Empty run style seeds are portable authoring data although ProseMirror
      // omits their text nodes. Undo/Redo must also restore the typing marks.
      if (!doc.textContent) {
        const paragraph =
          value.paragraphs[editor.state.selection.$from.index(0)] ??
          value.paragraphs[0];
        const seed = paragraph?.runs[0]?.style ?? {};
        editor.dispatch(
          editor.state.tr.setStoredMarks(
            TEXT_ATTRIBUTES.map((key) =>
              textSchema.marks[key].create({ value: seed[key] ?? base[key] }),
            ),
          ),
        );
      }
      return;
    }
    const { anchor, head } = editor.state.selection;
    const selection = TextSelection.between(
      doc.resolve(Math.min(anchor, doc.content.size)),
      doc.resolve(Math.min(head, doc.content.size)),
    );
    // External undo and property edits replace the document, without echoing another edit.
    editor.updateState(
      EditorState.create({
        doc,
        selection,
        plugins: editor.state.plugins,
        ...(!doc.textContent
          ? {
              storedMarks: TEXT_ATTRIBUTES.map((key) =>
                textSchema.marks[key].create({
                  value:
                    (value.paragraphs[selection.$from.index(0)]?.runs[0]
                      ?.style ?? {})[key] ?? base[key],
                }),
              ),
            }
          : {}),
      }),
    );
    editor.dispatch(editor.state.tr);
  }, [value, base]);
  useEffect(() => {
    view.current?.dom.setAttribute(
      'aria-label',
      label ?? translate(locale, 'diagram.label'),
    );
  }, [locale, label]);
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
  const toolbar = (
    <div
      className="rich-toolbar"
      role="group"
      aria-label={t('text.formatting')}
    >
      <FontPicker
        locale={locale}
        value={current.fontFamily}
        onChange={(font) => format('fontFamily', font)}
      />
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
          style === 'bold' ? 700 : style === 'italic' ? 'italic' : 'underline';
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
  );
  return (
    <div className="rich-text-editor" data-embedded={embedded || undefined}>
      {toolbarContainer ? createPortal(toolbar, toolbarContainer) : toolbar}
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
      {!embedded && (
        <InfoDisclosure
          className="field-help compact-help"
          title={t('controls.help')}
        >
          <p>
            {t('rich.help')} {t('text.editContrast')}
          </p>
        </InfoDisclosure>
      )}
      {notice && (
        <p role="status" className="field-help">
          {t(notice)}
        </p>
      )}
    </div>
  );
}
