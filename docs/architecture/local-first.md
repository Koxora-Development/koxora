# Local-first, offline operation, and recovery

**Confirmed product principle; technical implementation remains unvalidated.**

Implemented Phase 2.1 behavior and proposed deviations are recorded in [ADR 0013](../adr/0013-project-storage.md) and the [project storage guide](../development/project-storage.md). The broader planning scope below is retained.

## Ownership and state

Editing, commands, layout, undo/redo, imports/exports, and core rendering run locally. Cloud can maintain a synchronization copy, never the only permitted storage. Users explicitly choose whether and when to share data.

## Browser

- Initial loading/PWA provisioning may require a network. Core features must work offline after successful provisioning.
- Evaluate IndexedDB/OPFS for persistent projects, separately from service-worker/asset caches. Cache Storage alone is not a durable project backup.
- Handle quota, persistence restrictions, private browsing, and browser-data deletion as data-loss risks.
- Offer native project export and understandable backup guidance.
- Display local save, unsaved, offline/online, sync, and conflict states through localization keys.
- Persist explicit language selection locally; English default/fallback and German selection cannot depend on cloud access.

## Desktop

Native files are the primary exchange/backup medium, with optional local working-state metadata. Use atomic saves where supported, temporary/backup files, and crash recovery. Scope filesystem/keychain APIs and require explicit user decisions.

## Synchronization

Optional sync follows local commits and queues offline operations. Expose concurrent edits, file-import/cloud conflicts, and incompatible schemas. Evaluate CRDTs with authorization, reconnect, deletion, and user-local undo semantics. Keep local snapshots of external data when possible so projects remain understandable offline.

## Acceptance scenarios

1. Load the browser app, disconnect, edit/save/export, restart, and recover local state.
2. Export and transfer a project across Linux/Windows/macOS with documented fidelity.
3. Simulate quota/disk-full/crash failures: understandable localized errors, no hidden data loss, and a recovery path.
4. Remove cloud access: local editing continues; reconnect with visible conflict handling.
5. No mandatory telemetry, external scripts, or AI calls for local work.
