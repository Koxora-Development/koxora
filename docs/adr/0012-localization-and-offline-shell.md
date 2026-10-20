# Localization, preferences, and the offline shell

## Status and responsibility

Implemented for Phase 1, pending Product Owner PR review. Date: 2026-10-20. Codex implements; the Product Owner accepts and authorizes merge. References: CORE-003, CORE-013, CORE-015, CORE-016, CORE-017, CORE-018, K-007, and [language requirements](../product/internationalization.md).

## Context and options

The shell needs a small, complete English/German resource set without authentication or a server. A full translation framework would add lifecycle and loading machinery without a current consumer. A resource registry plus typed message keys suffices now; Intl supplies locale-aware numbers, dates, and plural categories. Rich ICU messages, lazy-loaded catalogs and translator tooling can justify a library later.

## Decision

Keep resources in `packages/i18n`, separate from React. Derive valid keys from English, require resource completeness in tests, and fall back to English for missing translations. Unknown runtime keys throw instead of rendering raw keys. Interpolation is plain text; React escapes its rendering. Registered locales carry their own display label and text direction. Adding resources and registry metadata needs no studio feature changes. Do not infer the initial locale from the OS. Update document language, direction, and title when selection changes.

Use a versioned, validated local-storage entry for explicit language/theme preferences only. Blocked, corrupt or full storage must not prevent guest startup; failed writes show a localized session-only warning. Never use this preference store for project data. No document schema or native project persistence is introduced here.

Cache production browser shell assets using vite-plugin-pwa/Workbox, with no external content or install manifest. Initial provisioning needs a connection; after activation the cached shell reloads offline. Development is deliberately uncached. Updates wait for the next navigation lifecycle rather than replacing an active client without consent. Desktop embeds its assets and does not register a service worker.

## Verification evidence and risks

Tests cover resource parity, English fallback, missing-English detection, resource-only locale extension and direction, plural categories, Unicode, interpolation, formatting, corrupt/blocked preference storage, guest startup on a German OS, switching, offline reload, and preserved unrelated synthetic data. See [verification](../development/foundation.md#verification-and-known-limitations). ESLint catches literal JSX interface text; code review remains necessary for generated attributes and new imperative UI APIs.

This is an offline shell, not a durable project store, PWA installability claim, project editor, or complete RTL translation. Browser cache eviction can require reprovisioning. Native window/product names are application identity metadata; runtime web content and document title use translation resources. Storage permission failures apply to session preferences; no unsaved project data exists in this milestone.
