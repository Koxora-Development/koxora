# Internationalization and mandatory language rules

**Status: confirmed by the user's explicit language instructions.** These rules refine CORE-015, CORE-016, CORE-017, and K-007; implementation and library choice remain separate work.

## Language policy

- English (`en`) is the default and fallback for the entire platform: editor, desktop shell, website, cloud, marketplace, administrative interfaces, and system-generated interface text.
- German (`de`) must be supported from the beginning, including the first interface implementation.
- Users must be able to select German explicitly even when the operating system uses English or another language. Operating system detection must not override a saved explicit preference. With no preference, start in English.
- Interface language is independent of document content and its language metadata. Changing the interface language must not translate or mutate a user's document.
- All source code, identifiers, variables, functions, classes, comments, technical documentation, GitHub issues, commit messages, and PR descriptions must be in English.

## Architecture contract

Every interface string must be retrieved through a stable semantic localization key. Never hardcode user-facing strings, including button text, navigation, dialogs, validation errors, empty states, notifications, accessible names, tooltips, and export-interface messages. Documentation prose and user-authored document content are not application string literals.

Locale resources are separate from application logic. A shared locale registry, resource loader, and fallback mechanism allow further languages by adding resources and locale metadata, without changing feature logic. The exact library, resource format, storage mechanism, and repository layout require a technical decision. Do not install them during Phase 0.

Resolve missing translations through English. Missing English keys must be detected during validation; displaying raw keys is not an acceptable production fallback. Use locale-aware plural rules, interpolation, dates, numbers, currencies, Unicode, and text direction. Avoid concatenating translated sentence fragments. Keep markup and untrusted interpolated content safe. Prepare layout for text expansion and RTL locales without prematurely promising completed translations.

Persist explicit user choice locally for guest/offline use; optional account synchronization must not become a prerequisite. Website locale routes and SEO metadata follow the same English default and fallback. An explicit German route may select German, and the language picker must remain available. Document/export locale metadata must be separate from interface preference.

## Acceptance scenarios for implementation

1. With no preference and a German operating system, the interface starts in English.
2. With an English or other operating system, select German, restart offline, and retain German without changing document text.
3. Switch back to English; editor, website, dialogs, errors, and accessible labels use the selected locale.
4. A missing German translation falls back to English; missing English resources fail the relevant checks.
5. Add a test locale using resources and registry metadata alone; existing application logic remains unchanged.
6. Test plurals, interpolation, Unicode, text expansion, RTL preparation, dates/numbers, and localized errors.

These are acceptance requirements, not claims of implemented or passing application tests. See [testing strategy](../development/testing-strategy.md).
