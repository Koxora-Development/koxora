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

The reviewed deployment stores one item on a reader's device: the appearance they chose. Where a deployment offers an optional purpose, the consent record itself is added. Both are strictly necessary under section 25(2) no. 2 TDDDG, both are listed with purpose, provider, duration and legal basis on the privacy settings page and in the privacy policy, and neither is a cookie. The inventory is derived from the deployment, so it never lists storage that cannot occur; server-side processing such as delivery logging is described in the policy's own sections rather than presented as device storage.

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
| `pnpm check` | Passed. Type check, lint, format, 219 unit tests in 15 files, documentation validation, dependency licence report |
| Unit tests of the website | 36 of those 219, covering the route table, catalog completeness, the consent record and the search metadata |
| `pnpm website:build` | Passed. 60 files and 30 redirects emitted, plus the hosting configuration |
| `pnpm test:website` | 182 passed, 7 skipped, across the desktop, tablet and phone projects |
| `pnpm test:e2e --project chromium --project mobile` | 90 passed; the studio is unchanged by this branch |

The browser tests cover navigation and redirects, status codes, both languages, metadata, sitemap and robots, consent in both deployment states, accessibility and responsive behaviour. They run against the reference server with the security headers and the content security policy of the deployment, and one suite asserts that no page violates that policy, that the policy pins the inline script actually served, and that build artefacts are not reachable. The skipped cases are the ones that belong to a different layout than the project running them.

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

| File | Change | Coordination |
| --- | --- | --- |
| `packages/i18n/package.json` | Adds a `./catalog` entry point | None; one key inside the existing map |
| `packages/i18n/src/catalog.ts` | New generic catalog helper and the shared locale metadata | None; the studio graph does not import it |
| `packages/i18n/src/index.ts` | Builds its locale registry from that shared metadata; every exported signature is unchanged | Low; two lines |
| `package.json` | Adds website build, test and capture scripts | Low; a conflict only if both add scripts in the same block |
| `vitest.config.ts` | Includes unit tests under `apps/*/src`, also `.tsx`, and excludes the native crate | Agree the test convention: these run in the node environment |
| `eslint.config.js`, `.prettierignore` | Ignore the website build output directories | None |
| `.github/workflows/quality.yml` | Adds the website browser test step and its report artefact | The step runs in the existing `web` job and reports independently |
| `AGENTS.md`, `docs/adr/README.md` | Appended entries | Append-at-end, so a textual conflict is likely and trivial to resolve |
| `tests/assets/studio-screenshots.spec.ts` | New capture tool that drives the real studio | **Needs attention.** It is type-checked but never run by continuous integration, and it uses the editing commands and the accessible names of the studio. A studio change can make it fail the type check |

The last row is the real coupling. The capture tool exists so the website shows genuine screenshots; when the studio changes its editing commands or its control names, the tool and the committed screenshots under `apps/website/public/images/studio/` have to be refreshed with `pnpm capture:studio`.

W1 adds no key to `packages/i18n/src/locales/*.json`, changes no studio component and changes no existing script. The studio and the website share the brand mark, the token names of the established appearance, and the localization contract, nothing else.

## 12. Prepared for later milestones

- Documentation, download and release pages exist with their navigation, structure and status labels, and say plainly that they are in preparation. The later milestones fill them; the addresses do not change.
- The comparison page is prepared for the sourced comparison and the per-tool pages of the next website milestone.
- The route table accepts a new language by adding a resource file and its slugs; no page or component changes.
- The consent manager accepts a new purpose by adding a category and enabling it in the deployment configuration; the prompt then appears automatically.
- Deployment, independent updates and rollback are described in [the website deployment guide](../development/website-deployment.md).

## 13. Independent review

Four independent reviews examined this branch against the real diff and the built output: data protection and consent, technical search readiness with accessibility, security of the generated site and its tooling, and the shared surface with the parallel studio work. They found one defect that would have mattered to a reader and a set of smaller ones, all of which are fixed in this branch:

| Finding | Effect | Fix |
| --- | --- | --- |
| The settings page rendered the consent manager twice with the same control identifiers | A label click in the dialog toggled the hidden copy, so saving could store the opposite of what the reader chose, including a failed withdrawal reported as success | Identifiers are scoped per instance, and the settings page no longer carries a second copy in a dialog |
| A stored decision was honoured even for purposes the deployment no longer offers | An old record could keep a purpose active with no way to withdraw it | Granted purposes are filtered against the deployment, and an orphaned record is removed on load |
| The emitted rewrite rules were written for a different Apache context | The language redirect for `/` could never fire and the trailing-slash rule produced a double slash | Rules rewritten for a virtual host, with both spellings of every alias matched in one hop |
| The content security policy was never exercised by any test | A stale inline-script hash would have reached production unseen | The reference server sends the generated headers, and tests assert the policy, the hash and the absence of violations |
| The reference server could be reached past its own guards | An encoded dot, a symbolic link or a malformed host header bypassed or crashed it | Guards run on the decoded path, links are resolved, and a bad request answers 400 |
| Server log data was listed as storage on the reader's device | A legal-basis citation that does not apply to server-side processing | The entry is gone from the device inventory; logging stays described in its own section |
| The menu collapsed only after the enhancement script ran | A measured layout shift of 0.43 on a phone with a slow connection | The stylesheet uses the flag the blocking inline script sets before first paint |
| Progressive-enhancement controls stayed visible without scripting | Inert buttons a reader could focus and press | The hidden attribute is honoured, and the no-script note is now on every page |
| A staging build published canonical addresses and a sitemap | Staging addresses could be indexed if the robots file were bypassed | A build that is not indexable emits neither |
| The legal tables cut off their last column on a phone | The legal-basis column was unreachable with no affordance | The table scrolls inside a named, focusable region with a visible hint |
| Meta titles and descriptions were too long in both languages | Truncated in search results | Rewritten per language within the display limits |
| The English home page showed a German phone screenshot | A reader saw an interface in another language | Each language has its own phone screenshot |

The reviews also confirmed, by measurement rather than by reading, that the studio build output is byte-identical with and without this branch, that no page makes a third-party request, that the structured data claims nothing unreleased, that the hreflang and sitemap layer is internally consistent, and that nothing is stored on a device before a reader acts.

## 14. Open points

1. The hosted browser studio is not published, so the primary call to action explains how to run the current version instead of linking to an address that does not answer. The Product Owner decided on 2026-10-24 to keep this configurable and to switch on the direct studio link only once `app.koxora.app` is actually reachable; setting `KOXORA_SITE_EDITOR_URL` is the single change needed.
2. The legal pages carry prepared content; [the checklist](../legal/website-legal-review.md) lists what the operator must confirm before publication.
3. T-008 is decided for this milestone: the Product Owner accepted the static approach on the accepted foundation stack on 2026-10-24. A dedicated website framework stays an option for a later content-management need.
4. No content management system exists. Content changes are code changes until a later milestone decides otherwise.
