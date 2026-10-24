# ADR 0017: Static multilingual delivery for the public website

- Status: Delivery approach accepted by the Product Owner on 2026-10-24; implementation under review; merge and publication pending
- Date: 2026-10-24
- References: [Issue #21](https://github.com/Koxora-Development/koxora/issues/21), [Issue #25](https://github.com/Koxora-Development/koxora/issues/25), [Issue #26](https://github.com/Koxora-Development/koxora/issues/26), [Issue #27](https://github.com/Koxora-Development/koxora/issues/27), [Issue #22](https://github.com/Koxora-Development/koxora/issues/22); SITE-001, SITE-003, SITE-007, SITE-008, SITE-009, SITE-017, SITE-018, SITE-019, SITE-022, WEB-001, WEB-002; K-002, K-007, T-008, O-009, O-014
- Roles: agent implementation; Product Owner acceptance, merge and publication decision

## Context and alternatives

The public site must be crawlable as real HTML in English and German, must not ship the editor to marketing visitors, must stay deployable independently of the browser studio, and must not depend on third-party fonts, analytics or embeds. The decision register lists **T-008 (Astro or Next.js)** as an open technical candidate for the website, while [ADR 0011](0011-foundation-stack.md) already accepted React, TypeScript, Vite and pnpm for the product.

Three options were considered.

| Option                                                      | Indexable HTML              | New runtime dependency                                   | Effect on the monorepo                                                             |
| ----------------------------------------------------------- | --------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Client-rendered single-page app                             | No, content needs scripting | None                                                     | Fails the indexing requirement in Issue #27                                        |
| Astro or Next.js, as named in T-008                         | Yes                         | A second framework, its build system and its conventions | Needs a Product Owner technology decision and a license/security review before use |
| Build-time rendering with the accepted Vite and React stack | Yes                         | None                                                     | Reuses the existing toolchain, lint rules and test runners                         |

## Decision

Website W1 renders every page to static HTML at build time with React's static markup renderer, inside the already accepted Vite and React toolchain, as a separate workspace application `@koxora/website`. The Product Owner accepted this approach for Website W1 on 2026-10-24 and recorded it against T-008; Astro and Next.js remain untaken options should a later milestone need a content management system. If such a move happens, the content, route table and localized resources in this application are portable because they are plain data and plain components.

```text
content catalogs (en, de) + route table + status data
                      |
        React components rendered at build time
                      |
   static HTML per page per language  +  one small enhancement script
                      |
  sitemap.xml / robots.txt / redirect table / deployment configuration
                      |
        static hosting (Cloudflare in front of a web server)
```

No React runtime reaches the browser. The published page carries one stylesheet and one module of roughly 5 KB uncompressed that adds the appearance toggle, the collapsed navigation on narrow screens and the consent manager. Every page works without client-side scripting, including the legal pages and the privacy settings inventory.

## Separation from the browser studio

The marketing site and `apps/studio-web` are separate applications with separate builds, separate output directories and separate deployment targets. They share only the brand mark, the design tokens of the established appearance and the localization contract. The website registers no service worker, so the studio's offline cache and the site's cache never interact; browser storage is origin-scoped, which the privacy pages state explicitly because the planned addresses differ.

## Localization

Every visible string is a key in a website-specific catalog built on the shared `@koxora/i18n` resources through the additive `@koxora/i18n/catalog` entry point. German completeness is enforced by the type system: the German record is typed against the English keys, so a missing translation fails the build rather than reaching a reader. Each page exists under its own language-specific path with a localized, search-friendly slug, and the route table derives navigation, `hreflang`, canonical addresses, the sitemap and the redirect table from one source. This follows K-007 and keeps further languages a matter of adding a resource file.

## Consent and tracking

The consent manager is implemented, localized and tested, but its first-visit prompt is bound to the audited deployment configuration rather than shown unconditionally: section 25(2) no. 2 TDDDG requires consent only for device access that is not strictly necessary. The reviewed W1 configuration stores an appearance preference and the consent record itself, so no prompt is shown and no optional technology is loaded. A second build with optional categories enabled is produced and tested in the same test run, so both states are verified.

The content security policy is part of this mechanism rather than next to it. The build emits a policy that allows scripts only from the site's own origin and the one inline script it pins by hash, and an optional category that needs a third-party origin declares those sources itself, so only an enabled category widens the policy. The reference server used for preview and tests sends exactly the generated headers, which is what lets the tests assert that no page violates the policy and that the pinned hash matches the script actually served. See [the legal review checklist](../legal/website-legal-review.md).

## Consequences and risks

- The site gains no content management system in W1. Content changes are code changes, reviewed and deployed like code. WEB-002 remains future scope.
- Localized slugs mean a page has a different address per language. The redirect table keeps cross-language and unprefixed addresses working, and the hosting configuration is generated from the same table.
- Static output cannot negotiate the language of `/` by itself. The generated hosting configuration performs that redirect, and the emitted `/index.html` is a no-index fallback that offers both languages.
- Brand assets stay as approved. The existing mark, wordmark and palette are reused unchanged; the exploratory logo studies are not used. O-014 is untouched.
- Email addresses in the legal pages are the ones the Product Owner reported as provisioned. O-009 verification before publication remains open.
- Structured data is limited to `Organization` and `WebSite`. No `SoftwareApplication`, rating, price, version or download entry is published while Koxora has no release.

## Verification evidence

`pnpm check`, `pnpm website:build` and `pnpm test:website` were run in the development container; the actual results and their limits are recorded in [the W1 implementation notes](../platform/website-w1.md). Configured remote jobs are not evidence of execution.
