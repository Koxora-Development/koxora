import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from 'react';
import {
  parseDatasetCellInput,
  type DatasetCellEdit,
} from '@koxora/editor-core';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Field, Json } from '@koxora/project';

export function DatasetCellEditor({
  locale,
  rowIndex,
  field,
  value,
  busy,
  cancelButton,
  onSave,
  onCancel,
}: {
  locale: string;
  rowIndex: number;
  field: Field;
  value: Json | undefined;
  busy: boolean;
  cancelButton: RefObject<HTMLButtonElement | null>;
  onSave: (value: DatasetCellEdit['value']) => Promise<MessageKey | null>;
  onCancel: () => void;
}) {
  const t = (key: MessageKey, values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const [initial] = useState(() => (value == null ? null : String(value)));
  const [draft, setDraft] = useState(initial);
  const [issue, setIssue] = useState<MessageKey | null>(null);
  const titleId = useId();
  const form = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  function focusInput() {
    form.current
      ?.querySelector<HTMLElement>('input, textarea, select')
      ?.focus();
  }
  useLayoutEffect(() => {
    focusInput();
  }, []);
  useLayoutEffect(() => {
    if (!busy && issue) focusInput();
  }, [busy, issue]);

  function changeDraft(next: string | null) {
    setDraft(next);
    setIssue(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current) return;
    if (draft === initial) {
      onCancel();
      return;
    }
    let parsed: DatasetCellEdit['value'];
    try {
      parsed = parseDatasetCellInput(field, draft);
    } catch {
      setIssue('data.cellInvalid');
      return;
    }
    submitting.current = true;
    try {
      const failure = await onSave(parsed);
      if (failure) setIssue(failure);
    } finally {
      submitting.current = false;
    }
  }

  const control = {
    value: draft ?? '',
    disabled: busy,
    'aria-invalid': issue === 'data.cellInvalid' || undefined,
    onChange: (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => changeDraft(event.currentTarget.value),
  };

  return (
    <form
      ref={form}
      className="project-data-cell-editor"
      aria-labelledby={titleId}
      onSubmit={(event) => void submit(event)}
    >
      <h3 id={titleId}>
        {t('data.cellEdit', { name: field.name, row: rowIndex + 1 })}
      </h3>
      <label className="project-data-field">
        {t('data.cellValue')}
        {field.type === 'string' ? (
          <textarea {...control} rows={2} />
        ) : field.type === 'boolean' ? (
          <select {...control}>
            <option value="" disabled>
              {t('data.cellNull')}
            </option>
            <option value="true">{t('data.cellTrue')}</option>
            <option value="false">{t('data.cellFalse')}</option>
          </select>
        ) : (
          <input
            {...control}
            type="text"
            placeholder={
              field.type === 'date' ? t('data.cellDateHint') : undefined
            }
          />
        )}
      </label>
      {draft === null && field.type !== 'boolean' && (
        <p className="project-data-meta" role="status">
          {t('data.cellNull')}
        </p>
      )}
      {issue && (
        <p className="error" role="alert">
          {t(issue)}
        </p>
      )}
      <div className="project-data-cell-actions">
        {field.nullable && (
          <button
            className="button"
            type="button"
            disabled={busy || draft === null}
            onClick={() => {
              changeDraft(null);
              focusInput();
            }}
          >
            {t('data.cellClear')}
          </button>
        )}
        <button
          className="button"
          type="button"
          ref={cancelButton}
          disabled={busy}
          onClick={onCancel}
        >
          {t('project.cancel')}
        </button>
        <button className="button primary" type="submit" disabled={busy}>
          {t('data.cellSave')}
        </button>
      </div>
    </form>
  );
}
