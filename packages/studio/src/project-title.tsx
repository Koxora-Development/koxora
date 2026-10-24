import { useEffect, useRef, useState, type Ref } from 'react';
import { translate } from '@koxora/i18n';

export function ProjectTitle({
  title,
  locale,
  disabled,
  onRename,
  heading = 'h3',
  titleRef,
}: {
  title: string;
  locale: string;
  disabled: boolean;
  onRename: (title: string) => Promise<boolean> | boolean;
  heading?: 'h1' | 'h3';
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const cancelled = useRef(false);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  const begin = () => {
    if (!disabled) {
      setDraft(title);
      setInvalid(false);
      setFailed(false);
      cancelled.current = false;
      setEditing(true);
    }
  };
  const commit = async () => {
    if (cancelled.current || submitting.current) return;
    if (
      !draft.trim() ||
      draft.trim().length > 1024 ||
      Array.from(draft).some(
        (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
      )
    ) {
      setInvalid(true);
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      if (await onRename(draft)) setEditing(false);
      else setFailed(true);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  const Heading = heading;
  return (
    <div className="project-title-editor">
      {editing ? (
        <div className="inline-title-field">
          <input
            ref={input}
            aria-label={t('project.name')}
            aria-invalid={invalid}
            value={draft}
            maxLength={1024}
            disabled={saving}
            onChange={(e) => {
              setDraft(e.target.value);
              setInvalid(false);
            }}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commit();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelled.current = true;
                setEditing(false);
              }
            }}
          />
          {(invalid || failed) && (
            <span role="alert">
              {t(invalid ? 'editing.invalidName' : 'editing.renameFailed')}
            </span>
          )}
        </div>
      ) : (
        <Heading
          ref={titleRef}
          tabIndex={heading === 'h1' ? -1 : undefined}
          dir="auto"
          onDoubleClick={begin}
          title={t('editing.renameHelp')}
        >
          {title}
        </Heading>
      )}
      <button
        className="button compact title-rename"
        disabled={disabled || saving}
        onClick={begin}
        aria-label={t('editing.rename')}
        title={t('editing.renameHelp')}
      >
        {t('editing.rename')}
      </button>
    </div>
  );
}

export function ProjectNameField({
  title,
  locale,
  disabled,
  onRename,
}: {
  title: string;
  locale: string;
  disabled: boolean;
  onRename: (title: string) => boolean;
}) {
  const [draft, setDraft] = useState({ original: title, value: title });
  const cancelled = useRef(false);
  if (draft.original !== title) setDraft({ original: title, value: title });
  const commit = () => {
    if (!cancelled.current && draft.value !== title) onRename(draft.value);
  };
  return (
    <label className="field-label">
      {translate(locale, 'project.name')}
      <input
        value={draft.value}
        maxLength={1024}
        disabled={disabled}
        onFocus={() => {
          cancelled.current = false;
        }}
        onChange={(e) => {
          cancelled.current = false;
          setDraft({ original: title, value: e.target.value });
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            cancelled.current = true;
            setDraft({ original: title, value: title });
          }
        }}
      />
    </label>
  );
}
