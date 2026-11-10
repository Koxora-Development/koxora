import { useEffect, useRef, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import { Dialog } from '@koxora/ui';
import type { Invoke } from '@koxora/persistence';
type Request = {
  id: number;
  name: string;
  bytes: number[];
  error: string | null;
  copy: boolean;
};
export function NativeOpen({
  invoke,
  locale,
  paused,
  onOpen,
  onError,
  error,
}: {
  invoke: Invoke;
  locale: string;
  paused: boolean;
  onOpen: (bytes: Uint8Array, copy: boolean) => Promise<boolean>;
  onError: (code: string) => void;
  error: MessageKey | null;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const [failed, setFailed] = useState<Request | null>(null);
  const [copy, setCopy] = useState(false);
  const state = useRef({ paused, onOpen, onError });
  const occupied = useRef(false);
  const completed = useRef<number | null>(null);
  useEffect(() => {
    state.current = { paused, onOpen, onError };
  });
  useEffect(() => {
    let active = true;
    let timer: number;
    let failedPoll = false;
    async function poll() {
      try {
        if (!state.current.paused && !occupied.current) {
          occupied.current = true;
          const request = await invoke<Request | null>('project_open_next');
          failedPoll = false;
          if (request && active && !state.current.paused) {
            const ok =
              completed.current === request.id ||
              (request.error
                ? false
                : await state.current.onOpen(
                    new Uint8Array(request.bytes),
                    request.copy,
                  ));
            if (request.error) state.current.onError(request.error);
            if (ok) {
              completed.current = request.id;
              await invoke('project_open_ack', { id: request.id });
              completed.current = null;
              setFailed(null);
              setCopy(false);
              occupied.current = false;
            } else {
              setCopy(request.copy);
              setFailed(request);
            }
          } else occupied.current = false;
        }
      } catch {
        if (!failedPoll) state.current.onError('storage');
        failedPoll = true;
        occupied.current = false;
      }
      if (active)
        timer = window.setTimeout(() => void poll(), failedPoll ? 5000 : 750);
    }
    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [invoke]);
  async function finish(retry: boolean) {
    if (!failed || state.current.paused) return;
    if (
      retry &&
      completed.current !== failed.id &&
      (failed.error ||
        !(await state.current.onOpen(new Uint8Array(failed.bytes), copy)))
    )
      return;
    if (retry) completed.current = failed.id;
    try {
      await invoke('project_open_ack', { id: failed.id });
      completed.current = null;
      setFailed(null);
      setCopy(false);
      occupied.current = false;
    } catch {
      state.current.onError('storage');
    }
  }
  return (
    failed && (
      <Dialog title={t('opening.failed')} onCancel={() => void finish(false)}>
        <p>{failed.name}</p>
        {error && <p role="alert">{t(error)}</p>}
        <p>{t('opening.help')}</p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={copy}
            onChange={(e) => setCopy(e.target.checked)}
            disabled={paused}
          />
          {t('project.asCopy')}
        </label>
        <div className="dialog-actions">
          <button
            className="button"
            disabled={paused}
            onClick={() => void finish(false)}
          >
            {t('project.cancel')}
          </button>
          <button
            className="button primary"
            disabled={paused || !!failed.error}
            onClick={() => void finish(true)}
          >
            {t('opening.retry')}
          </button>
        </div>
      </Dialog>
    )
  );
}
