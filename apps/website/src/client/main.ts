import '../styles/index.css';
import {
  activateGated,
  clearRecord,
  deactivateGated,
  grantedCategories,
  readConfig,
  readRecord,
  writeRecord,
  type ConsentApi,
  type ConsentRecord,
  type ConsentRuntimeConfig,
} from './consent';
import {
  honeypotField,
  timestampField,
  validateContact,
} from '@koxora/contact';
import {
  languageCookieAttributes,
  languageCookieName,
  languageStorageKey,
  storedLocale,
} from '../language';
const themeKey = 'koxora.website.theme';
function safeStorage(): Storage | null {
  try {
    // Reading the property itself throws where site data is blocked. Every
    // write is guarded as well, so nothing is stored just to test storage.
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
  const stored = () => {
    try {
      const value = storage?.getItem(themeKey);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  };
  const apply = (theme: string) => {
    document.documentElement.dataset.theme = theme;
    // The name says what the next press does, which is what a screen reader
    // user needs from a control whose icon they cannot see.
    toggle.setAttribute(
      'aria-label',
      theme === 'light'
        ? (toggle.dataset.labelDark ?? '')
        : (toggle.dataset.labelLight ?? ''),
    );
  };
  const systemPreference = () => {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    } catch {
      return 'dark';
    }
  };
  apply(stored() ?? systemPreference());
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
  try {
    // Until a reader makes a choice, follow the operating system as it changes.
    window
      .matchMedia('(prefers-color-scheme: light)')
      .addEventListener('change', () => {
        if (!stored()) apply(systemPreference());
      });
  } catch {
    // An older browser simply keeps the appearance it started with.
  }
}
/**
 * Remembering an explicit language choice. Only pressing an entry of the
 * language control stores anything: opening a link that already names its
 * language, including a shared deep link, leaves an earlier choice alone,
 * and nothing is stored before a reader has chosen at all.
 *
 * The value goes into a first-party cookie, because the address without a
 * language is answered by the web server, which cannot read device storage.
 * The same value is mirrored into device storage for a browser that refuses
 * cookies; the gateway document reads either one.
 */
function setupLanguagePreference(): void {
  const remember = (locale: string) => {
    try {
      document.cookie = `${languageCookieName}=${locale}; ${languageCookieAttributes(
        window.location.protocol === 'https:',
      )}`;
    } catch {
      // A refused cookie only means the choice is not remembered.
    }
    try {
      storage?.setItem(languageStorageKey, locale);
    } catch {
      // Same for refused device storage.
    }
  };
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    '[data-language-option]',
  )) {
    // A plain click listener covers the keyboard as well: activating a link
    // with Enter dispatches one. The write is synchronous, so it completes
    // before the browser leaves the page.
    link.addEventListener('click', () => {
      const locale = storedLocale(link.dataset.languageOption);
      if (locale) remember(locale);
    });
  }
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
// The language switch is a popover around ordinary links. Without this script
// the links stay visible and usable, which is why nothing here creates them.
function setupLanguageMenu(): void {
  const root = document.querySelector<HTMLElement>('[data-language]');
  const toggle = root?.querySelector<HTMLButtonElement>(
    '[data-language-toggle]',
  );
  const menu = root?.querySelector<HTMLElement>('[data-language-menu]');
  if (!root || !toggle || !menu) return;
  const options = () => [...menu.querySelectorAll<HTMLAnchorElement>('a')];
  let closeTimer = 0;
  const setOpen = (open: boolean) => {
    window.clearTimeout(closeTimer);
    menu.dataset.open = open ? 'true' : 'false';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  setOpen(false);
  const close = (restoreFocus: boolean) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return false;
    setOpen(false);
    if (restoreFocus) toggle.focus();
    return true;
  };
  // A pointer user hovers the button before pressing it, so a plain toggle
  // would close the menu the hover just opened. The first press after a hover
  // therefore keeps it open; the next one closes it, as it does without hover.
  let openedByHover = false;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    if (open && openedByHover) {
      openedByHover = false;
      return;
    }
    setOpen(!open);
  });
  toggle.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setOpen(true);
    const entries = options();
    (event.key === 'ArrowDown' ? entries[0] : entries.at(-1))?.focus();
  });
  menu.addEventListener('keydown', (event) => {
    const entries = options();
    const index = entries.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = (index + step + entries.length) % entries.length;
      entries[next]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      (event.key === 'Home' ? entries[0] : entries.at(-1))?.focus();
    }
  });
  // Escape closes from anywhere inside the control, and the trigger takes the
  // focus back so the keyboard order does not jump to the top of the page. It
  // closes this menu only: the collapsed header menu around it listens for the
  // same key, and the innermost open thing is the one a reader means.
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && close(true)) event.stopPropagation();
  });
  // Leaving the control by Tab closes it without stealing the focus back.
  root.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (next instanceof Node && root.contains(next)) return;
    close(false);
  });
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Node && root.contains(target)) return;
    close(false);
  });
  // Hover opens the menu only where a precise pointer exists. Touch and
  // keyboard never depend on it, and the menu covers the gap below the button
  // so moving the pointer into it does not close the menu.
  try {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches)
      return;
  } catch {
    return;
  }
  root.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    openedByHover = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(true);
  });
  root.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch') return;
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (root.contains(document.activeElement)) return;
      openedByHover = false;
      close(false);
    }, 140);
  });
}
/**
 * The comparison filter. The table is complete without it, so the controls
 * stay hidden until this runs: a checkbox that filters nothing would be worse
 * than no checkbox. Rows carry their topic group and cells carry their
 * product, so filtering is a matter of hiding, never of rebuilding.
 */
function setupComparisonFilter(): void {
  for (const comparison of document.querySelectorAll<HTMLElement>(
    '[data-comparison-filterable]',
  )) {
    const form = comparison.querySelector<HTMLFormElement>(
      '[data-comparison-filter]',
    );
    const table = comparison.querySelector('table');
    if (!form || !table) continue;
    form.hidden = false;
    const status = form.querySelector<HTMLElement>('[data-comparison-status]');
    const checked = (name: string) =>
      new Set(
        [
          ...form.querySelectorAll<HTMLInputElement>(
            `input[name="${name}"]:checked`,
          ),
        ].map((input) => input.value),
      );
    const apply = () => {
      const groups = checked('group');
      const shown = checked('product');
      const rows = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')];
      let visibleRows = 0;
      for (const row of rows) {
        const visible = groups.has(row.dataset.group ?? '');
        row.hidden = !visible;
        if (visible) visibleRows += 1;
      }
      const cells = [...table.querySelectorAll<HTMLElement>('[data-product]')];
      for (const cell of cells)
        cell.hidden = !shown.has(cell.dataset.product ?? '');
      if (status) {
        const products = table.querySelectorAll('thead [data-product]').length;
        status.textContent = (status.dataset.statusTemplate ?? '')
          .replace('{rows}', String(visibleRows))
          .replace('{total}', String(rows.length))
          .replace('{columns}', String(shown.size))
          .replace('{products}', String(products));
      }
    };
    form.addEventListener('change', apply);
    // A reset restores the defaults after the browser has applied them.
    form.addEventListener('reset', () => window.setTimeout(apply, 0));
    // The form must never navigate: it filters what is already on the page.
    form.addEventListener('submit', (event) => event.preventDefault());
    apply();
  }
}
/**
 * The contact form, enhanced.
 *
 * Without this the form is an ordinary form: it posts to the delivery
 * service, which answers a classic post with a redirect to a page that says
 * what happened. This keeps the reader on the page instead, validates with
 * the same rules the service uses, and shows the answer in a live region.
 *
 * It assembles no text: every sentence it can show is already in the markup
 * or in a data attribute, rendered in the reader's language at build time.
 */
function setupContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;
  const endpoint = form.dataset.endpoint;
  const status = form.querySelector<HTMLElement>('[data-contact-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!endpoint || !status || !submit) return;
  // With this script present, the form's own validation is the one that
  // runs: its messages are in the reader's language and it names every
  // problem at once. Without the script the browser's native validation
  // stays on, which saves a round trip for a reader who has no script.
  form.noValidate = true;
  const opened = form.querySelector<HTMLInputElement>('[data-contact-opened]');
  // When the form became visible. The service refuses a submission that was
  // faster than a person could type.
  if (opened) opened.value = String(Date.now());
  const fields = () => [...form.querySelectorAll<HTMLElement>('[data-field]')];
  const showProblem = (field: string, problem: string | null) => {
    const holder = form.querySelector<HTMLElement>(
      `[data-error-for="${field}"]`,
    );
    const control = form.querySelector<HTMLInputElement>(`[name="${field}"]`);
    if (!holder) return;
    for (const message of holder.querySelectorAll<HTMLElement>(
      '[data-problem]',
    ))
      message.hidden = message.dataset.problem !== problem;
    holder.dataset.visible = problem ? 'true' : 'false';
    // The control itself carries the state, so a screen reader announces the
    // field as invalid rather than only reading a sentence beside it.
    if (control) {
      if (problem) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
  };
  const clearProblems = () => {
    for (const field of fields()) showProblem(field.dataset.field ?? '', null);
  };
  const say = (key: string) => {
    status.textContent = form.dataset[key] ?? '';
  };
  const values = () => {
    const data = new FormData(form);
    const read = (name: string) => String(data.get(name) ?? '');
    return {
      name: read('name'),
      email: read('email'),
      category: read('category'),
      subject: read('subject'),
      message: read('message'),
      locale: read('locale'),
      [honeypotField]: read(honeypotField),
      [timestampField]: read(timestampField),
    };
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearProblems();
    const payload = values();
    const local = validateContact(payload);
    if (!local.submission) {
      for (const error of local.errors) showProblem(error.field, error.problem);
      say('statusInvalid');
      // The focus goes to the first field in the form that has a problem,
      // not the first problem found, so a keyboard reader starts at the top
      // of what needs changing.
      const marked = new Set(local.errors.map((error) => error.field));
      for (const field of fields()) {
        const name = field.dataset.field ?? '';
        if (!marked.has(name as never)) continue;
        form.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();
        break;
      }
      return;
    }
    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = form.dataset.labelBusy ?? label;
    status.textContent = '';
    const restore = () => {
      submit.disabled = false;
      if (label !== null) submit.textContent = label;
    };
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      // The endpoint uses no cookie and no session, so none is sent.
      credentials: 'omit',
    })
      .then(async (response) => {
        const answer = (await response.json().catch(() => ({}))) as {
          status?: string;
          duplicate?: boolean;
          errors?: { field: string; problem: string }[];
        };
        restore();
        if (answer.status === 'accepted') {
          // Accepted by the mail server, which is all that can be claimed.
          say(answer.duplicate ? 'statusDuplicate' : 'statusAccepted');
          if (!answer.duplicate) form.reset();
          if (opened) opened.value = String(Date.now());
          return;
        }
        if (answer.status === 'invalid') {
          for (const error of answer.errors ?? [])
            showProblem(error.field, error.problem);
          say('statusInvalid');
          return;
        }
        if (answer.status === 'rateLimited') return say('statusRatelimited');
        if (answer.status === 'rejected') return say('statusRejected');
        say('statusUndelivered');
      })
      .catch(() => {
        // A failed request is never reported as a sent message.
        restore();
        say('statusOffline');
      });
  });
  // A field that was marked stops being marked as soon as it is touched.
  form.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.getAttribute('name'))
      showProblem(target.getAttribute('name') ?? '', null);
  });
}
function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
function setupConsent(): void {
  const config: ConsentRuntimeConfig | null = readConfig(document);
  if (!config) return;
  let record = readRecord(config, storage);
  // A record left over from a configuration that offered optional purposes is
  // meaningless once none are offered, and the page then shows no way to
  // withdraw it, so it is removed on load.
  if (record && config.optional.length === 0) {
    clearRecord(config, storage);
    record = null;
  }
  let persisted = true;
  const listeners = new Set<(granted: string[]) => void>();
  const managers = () => [
    ...document.querySelectorAll<HTMLElement>('[data-consent-manager]'),
  ];
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  const dialog = document.querySelector<HTMLDialogElement>(
    '[data-consent-dialog]',
  );
  const render = () => {
    const granted = grantedCategories(record, config);
    for (const manager of managers()) {
      for (const input of manager.querySelectorAll<HTMLInputElement>(
        '[data-consent-toggle]',
      ))
        input.checked = granted.includes(input.value);
      const state = manager.querySelector<HTMLElement>('[data-consent-state]');
      if (!state) continue;
      if (record && config.optional.length > 0)
        state.textContent = persisted
          ? (state.dataset.stateSaved ?? '').replace(
              '{date}',
              formatTime(record.time),
            )
          : (state.dataset.stateSession ?? '');
      else if (config.optional.length > 0)
        state.textContent = state.dataset.stateNone ?? '';
    }
    document.documentElement.dataset.consent = granted.join(' ');
    deactivateGated(document, granted);
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
    const result = writeRecord(config, storage, choices);
    record = result.record;
    persisted = result.persisted;
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
      persisted = true;
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
    granted: () => grantedCategories(record, config),
    has: (category) => grantedCategories(record, config).includes(category),
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
setupLanguagePreference();
setupMenu();
setupLanguageMenu();
setupComparisonFilter();
setupContactForm();
setupConsent();
setupActiveSection();
export type { ConsentRecord };
