import { InfoDisclosure } from './info-disclosure';
import { useEffect, useState } from 'react';
import { translate, type MessageKey } from '@koxora/i18n';
import type { Invoke } from '@koxora/persistence';
type Status = {
  available: boolean;
  canRegister?: boolean;
  registered: boolean;
  path: string | null;
  refreshNeeded: boolean;
};
export function AppImageIntegration({
  locale,
  invoke,
}: {
  locale: string;
  invoke: Invoke;
}) {
  const t = (key: MessageKey) => translate(locale, key);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  useEffect(() => {
    let active = true;
    void invoke<Status>('appimage_integration', { action: 'status' })
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((error) => {
        if (active)
          setError(
            error === 'integrationBusy'
              ? 'integration.busy'
              : 'integration.failed',
          );
      });
    return () => {
      active = false;
    };
  }, [invoke]);
  async function change(action: 'register' | 'remove') {
    setBusy(true);
    setError(null);
    try {
      setStatus(await invoke<Status>('appimage_integration', { action }));
    } catch (error) {
      setError(
        error === 'integrationPython'
          ? 'integration.python'
          : error === 'integrationBusy'
            ? 'integration.busy'
            : 'integration.failed',
      );
      try {
        setStatus(
          await invoke<Status>('appimage_integration', { action: 'status' }),
        );
      } catch {
        /* Preserve the last readable status. */
      }
    } finally {
      setBusy(false);
    }
  }
  async function retryStatus() {
    setBusy(true);
    setError(null);
    try {
      setStatus(
        await invoke<Status>('appimage_integration', { action: 'status' }),
      );
    } catch (error) {
      setError(
        error === 'integrationBusy' ? 'integration.busy' : 'integration.failed',
      );
    } finally {
      setBusy(false);
    }
  }
  if (!status?.available && !error) return null;
  return (
    <section className="settings-section" aria-label={t('integration.heading')}>
      <h3>{t('integration.heading')}</h3>
      <p>{t('integration.description')}</p>
      <p className="settings-note">
        {t(
          status?.registered
            ? 'integration.registered'
            : 'integration.unregistered',
        )}
      </p>
      {status?.canRegister === false && (
        <p role="status">{t('integration.missing')}</p>
      )}
      <div className="settings-actions">
        <button
          className="button"
          disabled={busy || !status?.available || status.canRegister === false}
          onClick={() => void change('register')}
        >
          {t('integration.register')}
        </button>
        <button
          className="button"
          disabled={busy || !status?.available}
          onClick={() => void change('remove')}
        >
          {t('integration.remove')}
        </button>
      </div>
      {busy && <p role="status">{t('integration.busy')}</p>}
      {error && <p role="alert">{t(error)}</p>}
      {error && !status?.available && (
        <button
          className="button"
          disabled={busy}
          onClick={() => void retryStatus()}
        >
          {t('integration.retry')}
        </button>
      )}
      {status?.refreshNeeded && <p role="status">{t('integration.refresh')}</p>}
      <InfoDisclosure
        className="settings-help"
        title={t('integration.details')}
      >
        <p>{status?.path}</p>
        <p>{t('integration.help')}</p>
      </InfoDisclosure>
    </section>
  );
}
