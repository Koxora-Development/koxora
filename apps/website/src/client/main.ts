import '../styles/index.css';
import {
  activateGated,
  clearRecord,
  grantedCategories,
  readConfig,
  readRecord,
  writeRecord,
  type ConsentApi,
  type ConsentRecord,
  type ConsentRuntimeConfig,
} from './consent';
const themeKey = 'koxora.website.theme';
function safeStorage(): Storage | null {
  try {
    const probe = '__koxora__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
const storage = safeStorage();
function setupTheme(): void {
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-theme-toggle]',
  );
  if (!toggle) return;
  toggle.hidden = false;
  const apply = (theme: string) => {
    document.documentElement.dataset.theme = theme;
    toggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  };
  apply(document.documentElement.dataset.theme ?? 'dark');
  toggle.addEventListener('click', () => {
    const next =
      document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    apply(next);
    try {
      storage?.setItem(themeKey, next);
    } catch {
      // A rejected write only means the choice is not remembered.
    }
  });
}
function setupMenu(): void {
  const toggle =
    document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return;
  toggle.hidden = false;
  const setOpen = (open: boolean) => {
    menu.dataset.open = open ? 'true' : 'false';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  setOpen(false);
  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  for (const link of menu.querySelectorAll('a'))
    link.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      toggle.getAttribute('aria-expanded') === 'true'
    ) {
      setOpen(false);
      toggle.focus();
    }
  });
}
function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      dateStyle: 'long',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
function setupConsent(): void {
  const config: ConsentRuntimeConfig | null = readConfig(document);
  if (!config) return;
  let record = readRecord(config, storage);
  const listeners = new Set<(granted: string[]) => void>();
  const managers = () => [
    ...document.querySelectorAll<HTMLElement>('[data-consent-manager]'),
  ];
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  const dialog = document.querySelector<HTMLDialogElement>(
    '[data-consent-dialog]',
  );
  const render = () => {
    const granted = grantedCategories(record);
    for (const manager of managers()) {
      for (const input of manager.querySelectorAll<HTMLInputElement>(
        '[data-consent-toggle]',
      ))
        input.checked = granted.includes(input.value);
      const state = manager.querySelector<HTMLElement>('[data-consent-state]');
      if (!state) continue;
      if (record && config.optional.length > 0)
        state.textContent = (state.dataset.stateSaved ?? '').replace(
          '{date}',
          formatTime(record.time),
        );
      else if (config.optional.length > 0)
        state.textContent = state.dataset.stateNone ?? '';
    }
    document.documentElement.dataset.consent = granted.join(' ');
    activateGated(document, granted);
    for (const listener of listeners) listener(granted);
  };
  const showBanner = (visible: boolean) => {
    if (!banner) return;
    banner.hidden = !visible;
    if (visible) {
      const heading = banner.querySelector<HTMLElement>('h2');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
    }
  };
  const decide = (choices: Record<string, boolean>) => {
    record = writeRecord(config, storage, choices);
    showBanner(false);
    render();
    if (dialog?.open) dialog.close();
  };
  const all = (value: boolean) =>
    Object.fromEntries(config.optional.map((id) => [id, value]));
  const openDialog = () => {
    if (!dialog) return;
    render();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };
  document.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-consent-action], [data-consent-open]',
    );
    if (!target) return;
    if (target.hasAttribute('data-consent-open')) {
      if (!dialog || config.optional.length === 0) return;
      event.preventDefault();
      openDialog();
      return;
    }
    const action = target.dataset.consentAction;
    if (action === 'accept') decide(all(true));
    else if (action === 'reject') decide(all(false));
    else if (action === 'customize') openDialog();
    else if (action === 'close') dialog?.close();
    else if (action === 'save') {
      const manager = target.closest('[data-consent-manager]');
      const choices = all(false);
      for (const input of manager?.querySelectorAll<HTMLInputElement>(
        '[data-consent-toggle]',
      ) ?? [])
        choices[input.value] = input.checked;
      decide(choices);
    } else if (action === 'withdraw') {
      clearRecord(config, storage);
      record = null;
      render();
      for (const manager of managers()) {
        const state = manager.querySelector<HTMLElement>(
          '[data-consent-state]',
        );
        if (state) state.textContent = state.dataset.stateWithdrawn ?? '';
      }
      if (dialog?.open) dialog.close();
      showBanner(config.promptRequired);
    }
  });
  render();
  if (config.promptRequired && !record) showBanner(true);
  const api: ConsentApi = {
    granted: () => grantedCategories(record),
    has: (category) => grantedCategories(record).includes(category),
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open: openDialog,
  };
  window.koxoraConsent = api;
}
function setupActiveSection(): void {
  // Marks the gateway page so stylesheets can hide the redirect fallback.
  document.documentElement.dataset.ready = 'true';
}
setupTheme();
setupMenu();
setupConsent();
setupActiveSection();
export type { ConsentRecord };
