# Realtime collaboration, sharing, and history

**Status: confirmed optional functional scope; protocol and hosting are open.** Local editing remains usable without a collaboration server.

## Target behavior

Optional accounts/workspaces and shared projects use roles: Owner, Editor, Commenter, Viewer, with exact policies to define. Temporary guest participation needs no registration; specify access protection, expiry, revocation, and scope before launch. Support simultaneous edits, presence/cursors/selections, comments/reactions, follow-presenter, history, and restore. Continue offline and reconcile visibly on reconnect.

WebSockets and Yjs/CRDT are preferred candidates; WebRTC/P2P with signaling/TURN fallback is a later optional transport.

## Integrity and permissions

Validate domain constraints for every operation. Define deletion, dangling references, ports, dependent datasets, assets, renames, and refresh conflicts. Undo/redo is per user and cannot silently destroy another user's edits. Authorize each project, asset, comment, and action server-side; hiding controls is insufficient.

Guest links must be scoped, short-lived/revocable, unguessable, and protected against referrer leakage. Do not export tokens in project archives. Portable snapshots and live CRDT state are distinct. Test persistence/versioning through backup/restore, permission revocation, deletion, and multi-device offline cases.

## Optionality and encryption

A local guest needs no session/token. Load or activate collaboration only after explicit sharing. Free hosted realtime service cost/security remains open. COLLAB-014 retains a testable E2EE option; its feasibility and consequences for search, previews, collaboration, and recovery require an ADR. Do not claim E2EE exists or is enabled.

## Acceptance scenarios

Two editors change the same project; one goes offline and reconnects with conflict-aware reconciliation. A viewer cannot edit. A revoked guest link loses access. Restore an older version. Export locally without cloud access. Validate user-local undo and server authorization negative cases.
