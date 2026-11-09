import { safeExternalUrl } from '@koxora/project';

/** Invoke directly from a deliberate user action to retain browser activation. */
export async function openExternalLink(url: string): Promise<void> {
  const safe = safeExternalUrl(url);
  if (!safe) throw new Error('invalidLink');
  const native = (
    window as unknown as {
      __TAURI__?: {
        core: {
          invoke: (
            command: string,
            args: Record<string, unknown>,
          ) => Promise<void>;
        };
      };
    }
  ).__TAURI__?.core;
  if (native) await native.invoke('open_external_url', { url: safe });
  else {
    const anchor = document.createElement('a');
    anchor.href = safe;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.referrerPolicy = 'no-referrer';
    anchor.click();
  }
}
