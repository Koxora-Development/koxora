# Self-hosting and enterprise

**Status: confirmed future direction; exact license and free/paid boundaries remain open.**

## Community self-hosting concept

Document Docker Compose deployment with reverse-proxy TLS, database, object store, API, realtime, SMTP adapter, and background jobs; Helm may follow. Cover configuration/secrets, migrations, backup/restore, compatibility, upgrades/rollback, and monitoring. Reading/exporting existing data must not depend on an external license service.

## Optional enterprise additions and services

SSO/OIDC/SAML, possibly LDAP, team/organization policies, roles, auditing, central administration, compliance support, support/SLA, and operational advice. Review OSS licenses, entitlements, and paid services for consistency before implementation. No contractual SLA is implied.

## Acceptance

A new operator can follow documented steps to deploy and secure a test instance, demonstrate backup/restore, upgrade it, and export data. Do not claim production readiness until secure deployment/update paths are actually demonstrated. Localize administration and onboarding interfaces with English default/fallback and German support.
