# Desktop product and distribution

**Confirmed targets: Linux, Windows, macOS. Preferred candidate: Tauri 2; build/signing remains untested.**

## Parity

Share editor/document core and native project files across browser/desktop. Add native file dialogs, OS integration, and secure local data/secret handling. Local core features need neither login nor network. Use the shared localization architecture: English default/fallback, German from inception, user selection independent of OS language.

## Candidate packages

| Platform | Candidates | Required evaluation |
| --- | --- | --- |
| Linux | AppImage/Flatpak; optional DEB | Desktop integration, isolation, portals, updates |
| Windows | MSI/EXE | Signing, installation/removal, update/rollback |
| macOS | DMG/PKG; Apple Silicon/Intel where feasible | Notarization, signing, Gatekeeper, keychain |
| Browser | HTTPS app/PWA with offline cache | Quotas, browser matrix, updates, user backups |

## Checks

Reproducible builds, native shortcuts, accessibility, drag/drop, export files, file-open, large documents, crash/restore, OS theme, network loss, update integrity, security. A Linux build alone does not demonstrate Windows/macOS parity.
