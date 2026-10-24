# Website W1 implementation

**Status: implemented for review, 2026-10-24. Product Owner acceptance, merge and publication are separate decisions and have not been given.** This document describes what the public marketing website in `apps/website` does, how it is built and tested, and what is deliberately left for later milestones.

Scope and acceptance criteria come from [Issue #21](https://github.com/Koxora-Development/koxora/issues/21) with the legal requirements in [Issue #26](https://github.com/Koxora-Development/koxora/issues/26), the technical search requirements in [Issue #27](https://github.com/Koxora-Development/koxora/issues/27), the comparison teaser in [Issue #25](https://github.com/Koxora-Development/koxora/issues/25) and the deployment handover in [Issue #22](https://github.com/Koxora-Development/koxora/issues/22). The delivery decision is recorded in [ADR 0017](../adr/0017-public-website-delivery.md); the long-term site plan stays in [the website and platform specification](website.md).

## 1. What was built

A separate workspace application, `@koxora/website`, that renders eleven pages in English and German to static HTML at build time, plus a localized not-found page, a language gateway for the root address, a sitemap, a robots file, web manifests, a redirect table and the hosting configuration derived from it. The browser editor in `apps/studio-web` is untouched.

| Area | Result |
| --- | --- |
| Pages per language | Home, features, local-first, comparison, roadmap, download, documentation, releases, legal notice, privacy policy, privacy settings |
| Languages | English as default and fallback, German complete and enforced by the type system |
| Client payload | One stylesheet and one enhancement module; no framework runtime, no third-party request |
| Consent | Full manager, localized and tested, with the first-visit prompt bound to the audited deployment |
| Screenshots | Captured from the current development version of the studio by an automated run |

## 2. Structure

```text
apps/website
  src/site.ts                  deployment configuration read from the environment
  src/routes.ts                route table, localized slugs, redirects, alternates
  src/seo.ts                   canonical, hreflang, social and structured data
  src/entry-server.tsx         build-time rendering of pages, sitemap, robots, manifests
  src/content/messages/*.ts    English and German resources (one flat key space)
  src/content/data.ts          capabilities, phases, milestones, comparison data
  src/content/consent.ts       consent categories, purposes and runtime configuration
  src/components/*             layout, navigation, cards, consent surfaces, illustrations
  src/pages/*                  one module per page, registered in pages/registry.ts
  src/client/*                 appearance toggle, collapsed navigation, consent controller
  src/styles/*                 brand tokens, base, layout and component styles
  scripts/emit-site.mjs        writes the static output and the hosting configuration
  scripts/serve-site.mjs       reference static server used for preview and tests
  scripts/render-brand-images.mjs   icons and social preview images from the approved mark
  scripts/capture-site.mjs     website screenshots for review
```

## 3. Addresses

Each page has its own search-friendly path per language. Navigation, `hreflang`, canonical addresses, the sitemap and the redirect table are derived from one table, so a slug cannot drift between them.

| Page | English | German |
| --- | --- | --- |
| Home | `/en/` | `/de/` |
| Features | `/en/features/` | `/de/funktionen/` |
| Local-first | `/en/local-first/` | `/de/local-first/` |
| Comparison | `/en/compare/` | `/de/vergleich/` |
| Roadmap | `/en/roadmap/` | `/de/roadmap/` |
| Download | `/en/download/` | `/de/download/` |
| Documentation | `/en/docs/` | `/de/dokumentation/` |
| Releases | `/en/releases/` | `/de/releases/` |
| Legal notice | `/en/legal-notice/` | `/de/impressum/` |
| Privacy policy | `/en/privacy-policy/` | `/de/datenschutz/` |
| Privacy settings | `/en/privacy-settings/` | `/de/datenschutz-einstellungen/` |

Cross-language aliases and unprefixed paths redirect permanently, including the four legal paths named in Issue #26. The root address is a no-index gateway that offers both languages; the generated hosting configuration redirects it by the request language. Unknown addresses answer with the status code 404 and the not-found page of the language segment they were requested under.

## 4. Honest status labels

Every capability on the site carries one of three labels, and the definitions are printed on the pages that use them.

| Label | Meaning on this site |
| --- | --- |
| Available | Implemented and merged in the current development version. Koxora has no public release, so this never means downloadable today. |
| In development | Being implemented in the current milestone; scope and behaviour can still change. |
| Planned | Documented product scope, not started, no committed date. |

The single illustration that shows a future capability carries a concept badge and a caption saying it is a drawing of an idea. All product images are screenshots of the real application. The features page additionally names the current limits: no image export, no import from other tools, session-only history, whole-label text formatting, and no collaboration, cloud or assistance in the product today.

## 5. Comparison teaser

The home page positions Koxora without making claims about other products: it lists what Koxora optimises for, names the five comparison targets with neutral one-line descriptions and links to their official sites, and states that the sourced comparison follows later. The comparison page itself is marked as in preparation and describes the method that the later milestone will follow, including per-claim sources, the plan and version tested, the date checked, and more answers than a checkmark. No capability claim about another product is made anywhere on the site.

## 6. Languages

English is the default and fallback. The German record is typed against the English keys, so a missing or removed translation fails the type check. A unit test additionally asserts that no key falls back, that no message is empty and that both languages use the same interpolation placeholders. Browser tests assert that each page shows the title of its own language, that the language switch keeps the reader on the same page in both directions, that the German pages contain no English page description, and that navigation and footer are translated.

## 7. Device storage and consent

The reviewed deployment stores two items on a reader's device: the appearance they chose, and their consent decision once they make one. Both are strictly necessary under section 25(2) no. 2 TDDDG, both are listed with purpose, provider, duration and legal basis on the privacy settings page and in the privacy policy, and neither is a cookie.

Because nothing optional is used, no first-visit prompt is shown. The manager is still built, localized, reachable from the footer of every page and tested. A second build with optional categories enabled is produced in the same test run, and the browser tests cover both states: prompt with equal-prominence choices, no preselected optional purpose, gated code that stays inert until consent, a stored decision that is not asked for again, a version change that asks again, withdrawal that deletes the record and brings the prompt back, and a refusal that leaves the site fully usable. See [the legal review checklist](../legal/website-legal-review.md) for what still needs operator confirmation.

## 8. Search engines and performance

Real HTML, one unique title and description per page, canonical addresses, bidirectional `hreflang` with `x-default`, a sitemap with language alternates, a robots file, social preview images per language, and structured data limited to the organisation and the website. No `SoftwareApplication`, rating, price, version or download entry is published while no release exists. Staging builds can set an environment variable that emits `noindex` and a disallow-all robots file. The content plan is in [the website search plan](website-seo.md).

The published page requests one stylesheet, one script and the images on it. There is no web font request, no analytics, no advertising network and no embedded third-party content; a browser test fails if any request leaves the site's own origin.

| Artefact | Size |
| --- | --- |
| Stylesheet | 20,257 bytes, 5,145 bytes compressed |
| Enhancement script | 4,576 bytes, 1,755 bytes compressed |
| Home page document | 35,091 bytes in English, 36,404 bytes in German, before compression |

## 9. Verification

Run in the development container on 2026-10-24, against this branch:

```sh
pnpm install --frozen-lockfile
pnpm check                 # typecheck, lint, format, unit tests, docs, licenses
pnpm website:build         # static output plus hosting configuration
pnpm test:website          # browser tests on desktop, tablet and phone layouts
```

Results:

| Command | Result |
| --- | --- |
| `pnpm check` | Passed. Type check, lint, format, 214 unit tests in 15 files, documentation validation, dependency licence report |
| Unit tests of the website | 31 of those 214, covering the route table, catalog completeness, the consent record and the search metadata |
| `pnpm website:build` | Passed. 60 files emitted plus the hosting configuration |
| `pnpm test:website` | 164 passed, 7 skipped, across the desktop, tablet and phone projects |
| `pnpm test:e2e --project chromium --project mobile` | 90 passed; the studio is unchanged by this branch |

The browser tests cover navigation and redirects, status codes, both languages, metadata, sitemap and robots, consent in both deployment states, accessibility and responsive behaviour. The skipped cases are the ones that belong to a different layout than the project running them.

Limitations of this run: only the bundled Chromium engine was available in the container, so the Firefox and WebKit projects of both suites were not executed; the website suite enables them with `KOXORA_BROWSERS=all`. No Lighthouse measurement and no manual screen-reader audit were performed, and no deployment was attempted. Configured remote jobs are not evidence of execution.

## 10. Screenshots

Captured with `pnpm capture:website` against the preview server and stored in `docs/design/screenshots/website/`.

| View | File |
| --- | --- |
| Home, English, desktop | `home-en-desktop.png` |
| Home, German, desktop | `home-de-desktop.png` |
| Home, English, light appearance | `home-en-light.png` |
| Home, German, phone | `home-de-mobile.png` |
| Home, English, tablet | `home-en-tablet.png` |
| Navigation menu, German, phone | `menu-de-mobile.png` |
| Features, English | `features-en-desktop.png` |
| Comparison, German | `compare-de-desktop.png` |
| Roadmap, English | `roadmap-en-desktop.png` |
| Download, German | `download-de-desktop.png` |
| Local-first, English | `local-first-en-desktop.png` |
| Legal notice, German | `legal-notice-de.png` |
| Privacy policy, German | `privacy-policy-de.png` |
| Privacy settings, English | `privacy-settings-en.png` |
| Not found, English | `not-found-en.png` |
| Consent prompt in the demonstration build, German | `consent-banner-de.png` |
| Consent dialog in the demonstration build, English | `consent-dialog-en.png` |

Studio screenshots used on the site are captured by `pnpm capture:studio`, which drives the real application and writes the images together with their intrinsic sizes.

## 11. Interface contract with the parallel studio work

Website W1 and Studio 2.5 run in parallel on separate branches. W1 touches these shared files, additively:

| File | Change |
| --- | --- |
| `packages/i18n/package.json` | Adds a `./catalog` entry point |
| `packages/i18n/src/catalog.ts` | New generic catalog helper; the studio resources are untouched |
| `package.json` | Adds website build, test and capture scripts |
| `vitest.config.ts` | Also includes unit tests under `apps/*/src` |
| `.github/workflows/quality.yml` | Adds the website browser test step and its report artefact |

W1 adds no key to `packages/i18n/src/locales/*.json`, changes no studio component and changes no existing script. The studio and the website share the brand mark, the token names of the established appearance, and the localization contract, nothing else.

## 12. Prepared for later milestones

- Documentation, download and release pages exist with their navigation, structure and status labels, and say plainly that they are in preparation. The later milestones fill them; the addresses do not change.
- The comparison page is prepared for the sourced comparison and the per-tool pages of the next website milestone.
- The route table accepts a new language by adding a resource file and its slugs; no page or component changes.
- The consent manager accepts a new purpose by adding a category and enabling it in the deployment configuration; the prompt then appears automatically.
- Deployment, independent updates and rollback are described in [the website deployment guide](../development/website-deployment.md).

## 13. Open points

1. The hosted browser studio is not published, so the primary call to action explains how to run the current version instead of linking to an address that does not answer. The Product Owner decided on 2026-10-24 to keep this configurable and to switch on the direct studio link only once `app.koxora.app` is actually reachable; setting `KOXORA_SITE_EDITOR_URL` is the single change needed.
2. The legal pages carry prepared content; [the checklist](../legal/website-legal-review.md) lists what the operator must confirm before publication.
3. T-008 is decided for this milestone: the Product Owner accepted the static approach on the accepted foundation stack on 2026-10-24. A dedicated website framework stays an option for a later content-management need.
4. No content management system exists. Content changes are code changes until a later milestone decides otherwise.
