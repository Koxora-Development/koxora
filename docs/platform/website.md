# Website and platform specification

**Status: planning baseline v0.1, 2026-10-20. Long-term goals are confirmed; implementation, technology, and releases remain proposals.**

## 1. Product landscape and domains

Koxora is the confirmed project name. The planning source records `koxora.app`, `koxora.com`, and `koxora.de` as registered. Public website, web editor, documentation, API, community/marketplace, administration, and optional status surfaces are logical targets. Subdomains, routing, and redirects require separate authorization; trademark clearance remains open despite the confirmed name.

The first implementation milestone is described in [the Website W1 implementation notes](website-w1.md), with its delivery decision in [ADR 0017](../adr/0017-public-website-delivery.md), its content plan in [the website search plan](website-seo.md) and its legal review in [the pre-publication checklist](../legal/website-legal-review.md).

## 2. Sitemap

| Area | Pages and functions | Account required? |
| --- | --- | --- |
| Home | Hero, screenshots, demo, benefits, calls to action | No |
| Features | Diagram families, data, AI, export, collaboration, offline | No |
| Downloads | OS/architecture, packages, channel, hashes/signatures | No |
| Releases | Changelog, known issues, old builds, migrations | No |
| Roadmap | Status, proposals, voting | Read: no; contribute: to decide |
| Web app | Full editor, PWA, local files | No |
| Docs | Manual, API, tutorials, self-hosting, plugin SDK | No |
| Marketplace | Templates/themes/shapes/plugins, previews/downloads | Read: no; publish: yes |
| Community | Profiles, public projects, ratings/reports | Read: no; contribute: yes |
| Cloud | Projects, versions, teams, sharing, sync | Yes, with separately scoped guest participation |
| Self-hosting | Docker, backups, upgrades, enterprise | Documentation: no |
| Support | FAQ, contact, bug reports, security disclosure | Depends on workflow |
| News | Blog, announcements, optional newsletter | No |
| Legal | Legal notice, privacy, terms, licenses | No |
| Administration | Releases, CMS, translations, moderation, users/subscriptions | Authorized administrators |

## 3. Download and release pipeline

Git tag → CI test matrix → OS/architecture builds → signed artifacts → checksums/SBOM → release metadata → downloads → changelog → update feed. Separate Nightly/Beta/Stable. OS detection may suggest a download but must keep every supported platform visible. macOS/Windows signing and Flatpak publication have additional prerequisites. Never label unbuilt/untested artifacts as supported.

## 4. Content and CMS

Candidate entities: Feature, DiagramType, Release, ChangelogEntry, DownloadArtifact, DocumentationPage, RoadmapItem, BlogPost, Translation, TemplateListing, PluginListing, Review, Report, UserProfile, SupportArticle. Maintain localized fields, publication status per locale, administrative roles, and audit history.

## 5. Marketplace lifecycle

Upload → file/AV/parser-limit checks → manifest/license/compatibility → sandboxed preview → moderation → versioning → publication → reports/takedown. Plugins require extra isolation/signature checks. Paid templates/commissions require legal and tax review first.

## 6. Cloud domain

Account, Workspace, Membership, Project, ProjectVersion, Asset, ShareLink, CollaborationSession, Comment, Notification, BillingAccount, Entitlement, AuditEvent. Authorize server-side. Guest links have scopes, expiry, and revocation. Specify account deletion, data export, retention, and backups.

## 7. Self-hosting and enterprise

Community servers are proposed through Docker Compose, environment variables/secrets, database, S3/MinIO, WebSockets, optional SMTP, reverse-proxy TLS, migrations, backups/restore, and upgrade guidance. Enterprise candidates include OIDC/SAML/LDAP, auditing, policies, support, and maintenance. The archive expresses a free core/basic-collaboration direction; exact licensing and free/paid boundaries remain O-001/O-006/O-008, not an approved commercial offer. Existing data must not depend on a remote license server for read/export access.

## 8. Internationalization and SEO

English (`en`) is default/fallback across all surfaces. German (`de`) is supported from inception and explicitly selectable independently of operating system language. Every interface string uses a localization key. Locale resources/registry support additional languages without feature-logic changes. Keep document language separate from interface preference. Follow the [language contract](../product/internationalization.md).

Plan locale routes such as `/en/` and `/de/`, appropriate `hreflang`, localized metadata/OpenGraph, canonical URLs, translation fallback, and maintenance status. Exact root-route behavior is to be specified consistently with English default. Candidate later translations include Spanish, French, Italian, Dutch, Polish, and Portuguese, subject to prioritization. Community content retains its original language with optional translation.

## 9. Security, privacy, and compliance

CSP, safe uploads, CSRF/XSS defenses, limits, MFA/passkeys, auditing, moderation, abuse response, privacy information, consent only where needed, GDPR processes, license notices, and accessibility. Legal review precedes public operation; planning is not compliance evidence.

## 10. Proposed release stages

Website v0: home, features, downloads, editor entry, docs, changelog, legal. Website v1: roadmap, news, support, demo gallery. Platform v1: accounts, cloud, teams. Platform v2: community, marketplace, plugins, enterprise. These are proposed scope groupings, not committed dates or available features.

## 11. Candidate operating metrics

Download success, update failures, app startup, search quality, documentation self-service, moderation latency, cloud availability, sync errors, recovery. Collect minimally and transparently.

## 12. Domain strategy

Primary planned public site: `koxora.app`. Proposed redirects: `koxora.com` to `.app`, `koxora.de` to `/de/`. Candidate hosts: `app.koxora.app` without login, `docs.koxora.app`, `cloud.koxora.app`, `marketplace.koxora.app`, `status.koxora.app`. All subdomains, redirects, and deployments remain planned and unverified. Organization/repository: `Koxora-Development/koxora`.
