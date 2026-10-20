# Release and publication process

**Status: plan; no product releases exist in this baseline.**

## Channels

Label Nightly, Beta, and Stable clearly. Advertise artifacts as runnable only after building and validating them for their target OS/architecture.

## Gate

Version/schema and migrations → changelog and feature IDs → actual CI/test evidence → security/licenses/dependencies → platform signing/notarization → checksums/SBOM → explicit Product Owner release approval → publication with docs/downloads → monitoring/support/rollback.

## Desktop, website, and cloud

- Keep all supported systems visible; OS detection is a convenience.
- README/website must distinguish planned from available features.
- Record build provenance, SHA-256 checksums, and applicable signatures.
- Updaters must not silently damage projects under incompatible schemas; document backup/migration/rollback.
- Deploy cloud separately with tested backups, migrations, and recovery.
- Update localized interface resources and translation status; English is default/fallback and German is supported from inception.

A documentation merge authorizes neither a product release nor infrastructure changes.
