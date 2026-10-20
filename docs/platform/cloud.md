# Optional Koxora Cloud

**Status: confirmed long-term scope; implementation, tariffs, and operating details are open.**

## Capabilities

Optional accounts with passkeys/MFA candidates, workspaces/teams, project and asset storage, history, synchronization, and understandable recovery. Share with people/teams/guests through enforced roles, comments, and realtime presence. User/team profiles, notifications, quotas, billing, and entitlements are optional. Support privacy exports, account deletion, retention, and support processes.

## Architecture candidates

Laravel API, PostgreSQL, S3-compatible storage, separate WebSocket/realtime service, background jobs/queues, and separate SMTP identity. Require ADR, license, security, and cost evaluation. Studio remains local and backend-independent.

## Boundaries

Do not force canvas/project editing onto a server or silently make cloud the sole copy. E2EE is an open architectural question affecting search, preview, collaboration, and recovery. Billing/enterprise controls cannot make existing local projects inaccessible. All interfaces follow English default/fallback and independently selectable German through localization resources.

## Before a pilot

Test tenant isolation, revocation, guest expiry, MFA, backup/restore, offline reconciliation, audit, safe deletion, relevant GDPR processes, and documented errors. No price, SLA, or public availability is promised.
