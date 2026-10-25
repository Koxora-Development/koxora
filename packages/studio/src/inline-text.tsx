import { useEffect, useRef, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import {
  fromPlainText,
  readRichText,
  resolveAppearance,
  CONNECTION_KEY,
  type RichText,
  type EditCommand,
} from '@koxora/editor-core';
import type { Connection, Node, Style } from '@koxora/project';
import { RichTextEditor } from './rich-text-editor';
export function InlineText({
  item,
  styles,
  locale,
  anchor,
  onApply,
  onPreview,
  onCancel,
}: {
  item: Node | Connection;
  styles: Style[];
  locale: string;
  anchor: { x: number; y: number };
  onApply: (command: EditCommand) => boolean;
  onPreview: (value: RichText) => void;
  onCancel: () => void;
}) {
  const t = (k: MessageKey) => translate(locale, k),
    ref = useRef<HTMLDialogElement>(null);
  const [base] = useState(() =>
    resolveAppearance(
      item,
      styles,
      'kind' in item ? undefined : CONNECTION_KEY,
    ),
  );
  const [value, setValue] = useState(
    () =>
      readRichText(item) ??
      fromPlainText(
        'kind' in item
          ? String((item as Node).content.text ?? '')
          : String(
              (item.extensions[CONNECTION_KEY] as Record<string, unknown>)
                ?.label ?? '',
            ),
        base.align,
      ),
  );
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    el.showModal();
    el.querySelector<HTMLElement>('[contenteditable]')?.focus();
    return () => {
      el.close();
      previous?.focus();
    };
  }, []);
  const apply = () => {
    if (onApply({ type: 'richText', id: item.id, value })) onCancel();
    else setFailed(true);
  };
  return (
    <dialog
      ref={ref}
      className="canvas-text-dialog"
      aria-label={t('rich.inlineTitle')}
      style={{
        left: Math.max(8, Math.min(window.innerWidth - 640, anchor.x)),
        top: Math.max(8, Math.min(window.innerHeight - 380, anchor.y)),
      }}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          apply();
        }
      }}
    >
      <h2>{t('rich.edit')}</h2>
      <RichTextEditor
        value={value}
        base={base}
        locale={locale}
        onChange={setValue}
        onPreview={onPreview}
        autoFocus
      />
      {failed && <p role="alert">{t('diagram.error.invalid')}</p>}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={onCancel}>
          {t('project.cancel')}
        </button>
        <button type="button" className="button primary" onClick={apply}>
          {t('diagram.apply')}
        </button>
      </div>
    </dialog>
  );
}
