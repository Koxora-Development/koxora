# Licensing, monetization, and business model

**Status: business/legal proposal, not an approved price or license decision.** The product direction is an open-source project with a free local-first core. Commercial rules must be compatible with the eventual license.

| Component | Goal | Candidate revenue |
| --- | --- | --- |
| Studio local core | Free, no login, import/export | No license-service requirement for local data |
| Community self-hosting | User-operated teams within the chosen license | Optional maintenance/support |
| Managed cloud | Storage, synchronization, collaboration, history | Free allowance and optional subscriptions |
| Enterprise | SSO/OIDC/SAML, auditing, policies, administration | B2B contracts and support |
| Marketplace | Templates, themes, shapes, plugins, community | Optional paid assets and commissions |
| Services | Hosting, migration, onboarding, support | Service contracts |

## Principles

1. Existing local files remain readable/exportable without an account, payment, or license server.
2. A cloud subscription cannot retroactively lock local basic functionality.
3. Document paid capabilities clearly and verify license compatibility before implementation.
4. Uploads need rights clearance, moderation, complaints/takedown handling, and applicable tax/consumer-law review.
5. Do not invent prices, limits, legal compliance, contracts, or an approved free/paid boundary.

## Before publication

Evaluate MIT, Apache 2.0, GPL, AGPL, or other suitable options against copyleft/SaaS effects, contributions, branding, and commercial plans. Check direct/transitive libraries, imported assets/fonts, renderers, and plugin compatibility. Add LICENSE only after an explicit decision. See [O-001, O-006, and O-008](../decisions.md).
