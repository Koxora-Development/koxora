import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { locales, translate, type MessageKey } from '@koxora/i18n';
import { Dialog } from '@koxora/ui';
import type { Invoke } from '@koxora/persistence';
const nativeCore = (
  window as unknown as { __TAURI__?: { core: { invoke: Invoke } } }
).__TAURI__?.core;
type Status = {
  directory: string;
  firstRun: boolean;
  availableBytes?: number | null;
};
export function StorageSettings({
  locale,
  initial = false,
  onReady,
  run,
  onChanged,
  onLocale,
}: {
  locale: string;
  initial?: boolean;
  onReady?: () => void;
  onChanged?: () => void;
  onLocale?: (locale: string) => void;
  run?: (action: () => Promise<void>) => Promise<boolean>;
}) {
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    translate(locale, key, values);
  const [status, setStatus] = useState<Status | null>(null);
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [restoring, setRestoring] = useState(false);
  useEffect(() => {
    if (!nativeCore) {
      onReady?.();
      return;
    }
    if (!initial && !opened) return;
    void nativeCore
      .invoke<Status>('storage_status')
      .then((value) => {
        setStatus(value);
        if (initial && !value.firstRun) onReady?.();
        else setOpened(true);
      })
      .catch(() => {
        setError(true);
        setOpened(true);
      });
  }, [initial, opened, onReady]);
  if (!nativeCore) return null;
  async function change() {
    setBusy(true);
    setError(false);
    const action = async () => {
      if (
        !(await nativeCore!.invoke<boolean>('storage_change', {
          title: t('storage.choose'),
          restore: restoring,
        }))
      )
        return;
      onChanged?.();
      setStatus(await nativeCore!.invoke<Status>('storage_status'));
      if (initial) {
        setOpened(false);
        onReady?.();
      }
    };
    try {
      if (run) {
        if (!(await run(action))) setError(true);
      } else await action();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!initial && (
        <button className="button" onClick={() => setOpened(true)}>
          {t('storage.settings')}
        </button>
      )}
      {opened && (
        <Dialog
          title={t('storage.settings')}
          onCancel={() => {
            if (!busy && !initial) setOpened(false);
          }}
        >
          {initial && onLocale && (
            <label>
              {t('preferences.language')}
              <select
                aria-label={t('preferences.language')}
                value={locale}
                onChange={(e) => onLocale(e.target.value)}
              >
                {Object.entries(locales).map(([code, value]) => (
                  <option key={code} value={code}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p>{t('storage.description')}</p>
          <p>
            <strong>{t('storage.path')}</strong>
          </p>
          <p className="storage-path">
            {status?.directory ?? t('storage.unavailable')}
          </p>
          <p>{t('storage.support')}</p>
          <p>
            {typeof status?.availableBytes === 'number'
              ? t('storage.available', {
                  mib: new Intl.NumberFormat(locale, {
                    maximumFractionDigits: 0,
                  }).format(status.availableBytes / 1048576),
                })
              : t('storage.space')}
          </p>
          {error && <p role="alert">{t('storage.failure')}</p>}
          {busy && <p role="status">{t('storage.progress')}</p>}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={restoring}
              disabled={busy}
              onChange={(e) => setRestoring(e.target.checked)}
            />
            {t('storage.restore')}
          </label>
          <p>{t('storage.retained')}</p>
          <div className="dialog-actions">
            <button
              className="button"
              disabled={busy || !status}
              onClick={() => {
                void nativeCore!
                  .invoke('storage_open')
                  .catch(() => setError(true));
              }}
            >
              {t('storage.open')}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void change()}
            >
              {t('storage.change')}
            </button>
            <button
              className="button primary"
              disabled={busy || (initial && !status)}
              onClick={() => {
                if (!initial) {
                  setOpened(false);
                  return;
                }
                setBusy(true);
                void nativeCore!
                  .invoke('storage_keep')
                  .then(() => {
                    setOpened(false);
                    onReady?.();
                  })
                  .catch(() => setError(true))
                  .finally(() => setBusy(false));
              }}
            >
              {t(initial ? 'storage.keep' : 'project.cancel')}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
export function StorageGate({
  locale,
  children,
  onLocale,
}: {
  locale: string;
  children: ReactNode;
  onLocale: (locale: string) => void;
}) {
  const [ready, setReady] = useState(!nativeCore);
  const readyCallback = useCallback(() => setReady(true), []);
  return ready ? (
    children
  ) : (
    <StorageSettings
      locale={locale}
      initial
      onReady={readyCallback}
      onLocale={onLocale}
    />
  );
}
