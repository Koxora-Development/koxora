import { formatStorageSpace } from './storage-space';
import { InfoDisclosure } from './info-disclosure';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { locales, translate, type MessageKey } from '@koxora/i18n';
import { PropertySurface } from './property-surface';
import { AppImageIntegration } from './appimage-integration';
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
  onModalChange,
  embedded = false,
  onBusyChange,
}: {
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
  locale: string;
  initial?: boolean;
  onReady?: () => void;
  onChanged?: () => void;
  onLocale?: (locale: string) => void;
  onModalChange?: (opened: boolean) => void;
  run?: (action: () => Promise<void>) => Promise<boolean>;
}) {
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    translate(locale, key, values);
  const [status, setStatus] = useState<Status | null>(null);
  const availableSpace = formatStorageSpace(status?.availableBytes, locale);
  const [opened, setOpened] = useState(embedded);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [restoring, setRestoring] = useState(false);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  useEffect(() => {
    onModalChange?.(opened);
  }, [opened, onModalChange]);
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
      {!initial && !embedded && (
        <button
          className="button storage-trigger"
          onClick={() => setOpened(true)}
        >
          {t('storage.settings')}
        </button>
      )}
      {opened && (
        <PropertySurface
          panel={embedded}
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
          <section className="settings-section">
            <h3>{t('storage.path')}</h3>
            <div className="storage-location-row">
              <p className="storage-path">
                {status?.directory ?? t('storage.unavailable')}
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void change()}
              >
                {t(restoring ? 'storage.restoreAction' : 'storage.change')}
              </button>
            </div>
            <p className="settings-note">
              {availableSpace
                ? t('storage.available', { space: availableSpace })
                : t('storage.space')}
            </p>
            <div className="settings-actions">
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
            </div>
          </section>
          <section className="settings-section">
            <h3>{t('storage.manage')}</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={restoring}
                disabled={busy}
                onChange={(e) => setRestoring(e.target.checked)}
              />
              {t('storage.restoreShort')}
            </label>
            <p className="settings-note">
              {t(restoring ? 'storage.restoreMode' : 'storage.retainedShort')}
            </p>
            <InfoDisclosure
              className="settings-help"
              title={t('storage.details')}
            >
              <p>{t('storage.description')}</p>
              <p>{t('storage.availableNote')}</p>
              <p>{t('storage.support')}</p>
              <p>{t('storage.retained')}</p>
            </InfoDisclosure>
          </section>
          {!initial && !embedded && (
            <AppImageIntegration locale={locale} invoke={nativeCore.invoke} />
          )}
          {error && <p role="alert">{t('storage.failure')}</p>}
          {busy && <p role="status">{t('storage.progress')}</p>}
          {!embedded && (
            <div className="dialog-actions">
              {!embedded && (
                <button
                  className={initial ? 'button primary' : 'button'}
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
              )}
            </div>
          )}
        </PropertySurface>
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
