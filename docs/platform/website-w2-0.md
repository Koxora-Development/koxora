# Website W2.0 implementation: canonical domains and remembered language

**Status: implemented for review, 2026-10-25. Product Owner acceptance, merge and any production change are separate decisions and have not been given.** This is the first slice of [the W2 plan](website-w2-plan.md) and covers [Issue #31](https://github.com/Koxora-Development/koxora/issues/31).

Nothing here was deployed. No DNS record, Cloudflare setting or TinyCP setting was touched. The operator half — install order, certificates, smoke tests — is [the canonical domains runbook](../development/website-canonical-domains.md).

## 1. What changed, in one paragraph

The address without a language in it now opens the right language, and a language a reader picks in the language menu is remembered for the next visit, while an address that names its language is always served as asked. The configuration that makes this true in production — including the NGINX configuration of the running container, which existed only on the server — is now generated from the route table and committed with the release that needs it.

## 2. The language decision

One algorithm, in `apps/website/src/language.ts`, in this order:

1. **An explicit stored choice.** Only pressing an entry of the language menu stores one.
2. **The languages the browser asks for**, ordered by quality value and then by the order written. `de`, `de-DE`, `de-AT`, `de-CH` are German; `en`, `en-GB`, `en-US` are English; a `q=0` entry is a refusal and is dropped; a malformed quality value is ignored rather than trusted, so a crafted header cannot reorder the list.
3. **English**, the default and fallback.

| Reader | Result |
| --- | --- |
| German browser, nothing stored | `/de/` |
| English browser, nothing stored | `/en/` |
| French browser, nothing stored | `/en/` |
| English browser, German chosen earlier | `/de/` |
| German browser, English chosen earlier | `/en/` |
| Any browser, opening `/de/…` or `/en/…` directly | exactly that address, and the stored choice is left alone |

### Three layers, one algorithm

The server cannot read device storage, and a reader without JavaScript cannot run a script, so the same decision is implemented where each kind of reader can be served:

| Layer | Reads | Covers |
| --- | --- | --- |
| The hosting layer, generated | The language cookie and `Accept-Language` | Every reader, including one without JavaScript, and crawlers |
| The inline script of the gateway document, pinned in the policy by hash | The cookie, then device storage, then `navigator.languages` | A host that does not redirect `/`, and a reader whose cookies are refused but whose storage works |
| The gateway document itself | Nothing | A reader with neither, who gets a language-selection page rather than a guess |

Because nothing localized is rendered before the decision, there is no first-paint flash: the reader is moved before a page exists, and `location.replace` leaves no history entry to go back into.

### Why a cookie, and what is in it

`localStorage` cannot be read by NGINX or Apache, so a choice kept only there could never answer `/` for a reader without JavaScript. The choice therefore goes into a first-party cookie, `koxora_language`, with `Path=/`, `SameSite=Lax`, `Secure` over HTTPS, no `Domain` attribute and a one-year lifetime renewed on each selection. Its value is `en` or `de` and nothing else. The same value is mirrored into device storage, which is what the gateway script falls back to where cookies are refused.

Nothing is written before a reader has chosen. Opening a localized address, including a shared deep link, writes nothing and changes nothing.

### The one documented difference between the layers

Neither an Apache rewrite condition nor an NGINX `map` can compare quality values. Both generated configurations therefore read `Accept-Language` in the order it was written and take the first entry this site has a language for, looking eight entries deep. Browsers write that list in descending quality, so the two agree on every header a browser sends; a hand-written header whose quality values contradict its order resolves by order on the server and by quality in the browser and in the reference server. `apps/website/src/deploy-config.test.ts` executes the generated patterns against the authoritative algorithm and asserts they agree on browser-shaped headers, and asserts the ordering property directly: `fr,en;q=0.9,de;q=0.8` resolves to English, not German.

## 3. The canonical domain redirects

`koxora.app` stays the only indexed address. The build now generates one virtual host per alias name — `www.koxora.app`, `koxora.de`, `www.koxora.de`, `koxora.com`, `www.koxora.com` — on ports 80 and 443, redirecting every address to the canonical origin with the path and the query string preserved.

Three properties are enforced by tests rather than by review:

- **No open redirect.** The target is the configured origin, written into the file. `%{HTTP_HOST}`, `%{SERVER_NAME}` and `%{HTTP:Host}` appear nowhere in the generated output.
- **Certificate issuance and mail autodiscovery keep working.** `/.well-known/acme-challenge/`, `/.well-known/autoconfig/`, `/.well-known/autodiscover/` and `/autodiscover/` are answered by the alias host and are excluded from both the redirect and the reverse proxy, with the exclusion placed before the catch-all.
- **No internal address reaches a reader.** The container configuration sets `absolute_redirect off` and `port_in_redirect off`, and no generated `return` or `rewrite` line contains a loopback address or a port.

The status code is 308, which keeps the method and body of a non-GET request. The runbook rolls out with a temporary 302 first, because a permanent redirect is cached and hard to take back.

## 4. The container configuration, now in Git

W1's Dockerfile, Compose file and NGINX configuration were created directly on the production server and were **not** in the repository; the inventory in [the W2 plan](website-w2-plan.md) records that. This slice brings the NGINX half under version control as generated output, because the language decision has to live there. The image and the Compose file follow in W2.4a, which is the slice that may touch the running deployment.

`apps/website/dist-deploy/` now holds:

| File | Purpose |
| --- | --- |
| `nginx-koxora-website.conf` | The container: headers, cache rules, the 30 redirects of the route table with their query strings, trailing-slash normalization, localized not-found documents, a `/healthz` endpoint, and the language decision |
| `apache-koxora-proxy.conf` | The canonical virtual host: forwards to `127.0.0.1:9402` and adds nothing |
| `apache-koxora-aliases.conf` | The alias virtual hosts |
| `apache-koxora-app.conf` | Unchanged purpose: serving the files directly, without a container, now with the same language order |
| `_headers`, `_redirects` | Unchanged, for a static platform |
| `build-info.json` | Now also records the alias hosts, the redirect status, the cookie name, the container address and both pinned script hashes |

Two details that are easy to get wrong and are asserted:

- The security headers are set once on the server block and in no location, because an `add_header` inside an NGINX location replaces the inherited set instead of extending it. The per-address `Cache-Control` and `Vary` values come from maps, so no location needs one.
- The locale prefixes are plain prefix locations, not `^~`. A `^~` prefix would stop the regular-expression locations from being tested and an address without its trailing slash would then be served at a second address instead of redirecting to the canonical one.

## 5. Caching and search engines

`/` answers `302` with `Cache-Control: no-store` and `Vary: Cookie, Accept-Language`, so no shared cache can serve one reader's language to the next. The localized pages are one language each and need no `Vary`. The root keeps `noindex, follow`, so neither the redirect nor the gateway document is a second address for a home page, and `/de/` and `/en/` keep their canonical addresses, their bidirectional `hreflang` and `x-default`, and remain the only addresses in the sitemap. A crawler sends no cookie and is negotiated by its request language alone.

## 6. Privacy

The language choice is now part of the device-storage inventory, which is derived from the deployment, so it appears automatically in the privacy policy table and on the privacy settings page in both languages, with its purpose, where it is stored, how long it stays and its legal basis. It is treated as strictly necessary under section 25(2) no. 2 TDDDG: it is written only when a reader explicitly asks for a language, it carries nothing but that language, it is read by this site alone, and it is not used for anything else. The existing statements stay true — there is still no analytics, no advertising network, no third-party font and no tracking cookie — and no first-visit prompt is required or shown. Whether this reading is accepted is listed as an open point in [the legal review checklist](../legal/website-legal-review.md).

## 7. Files

| File | Change |
| --- | --- |
| `apps/website/src/language.ts` | **New.** The negotiation algorithm, the cookie contract and the gateway script |
| `apps/website/src/language.test.ts` | **New.** 20 cases, including the gateway script executed in a sandbox |
| `apps/website/src/deploy-config.ts` | **New.** The NGINX, reverse-proxy, alias and static-Apache generators as pure functions |
| `apps/website/src/deploy-config.test.ts` | **New.** 21 cases over the generated text and the executed language patterns |
| `apps/website/src/entry-server.tsx` | The gateway document: the inline decision, both languages naming the choice, no meta refresh; the new exports |
| `apps/website/src/client/main.ts` | Stores a language on an explicit selection, by cookie and by device storage |
| `apps/website/src/components/layout.tsx` | The language links carry the locale they select |
| `apps/website/src/site.ts` | Alias hosts, redirect status, pass-through paths and the container address, all overridable from the environment |
| `apps/website/src/content/consent.ts` | The language entry in the inventory |
| `apps/website/src/content/messages/{en,de}.ts` | Its name, purpose and storage description |
| `apps/website/scripts/hosting.mjs` | The policy pins several inline scripts |
| `apps/website/scripts/emit-site.mjs` | Emits the four configurations, hashes both inline scripts, and fails the build if either differs from the hashed text |
| `apps/website/scripts/serve-site.mjs` | The reference server negotiates with the real algorithm and keeps the query string on every redirect |
| `tests/website/language.spec.ts` | **New.** 14 browser cases |
| `tests/website/{consent,accessibility}.spec.ts` | The inventory now lists two entries, and the tests name them |

No studio file was touched. No existing message key changed its meaning.

## 8. Verification

Run in the development container on 2026-10-25, against this branch:

| Command | Result |
| --- | --- |
| `pnpm check` | Type check, lint, format and documentation validation pass; **272 unit tests in 20 files**, of which 89 belong to the website |
| `pnpm website:build` | Passes. 61 files and 30 redirects, plus four hosting configurations |
| `pnpm test:website` | **287 passed, 7 skipped** across the desktop, tablet and phone projects; the 7 belong to a different layout than the project running them |
| `pnpm test:website` (language suite alone) | 14 of those cases per project |

What the browser cases cover: every row of the language table above; regional variants and complex quality lists, including `q=0` and a quality order that contradicts the written order; a stored choice winning in both directions; a crafted cookie being ignored; the query string surviving the hop; `no-store` and `Vary` on the root; no second redirect after the negotiated hop; a localized address never being negotiated and never changing the stored choice; a selection persisting into a fresh browser session and being changed back; nothing stored before a choice; the gateway deciding in the browser; the gateway without JavaScript being a usable selection page with no meta refresh; the root without JavaScript still landing on a real page; and the language menu being operable and correctly marked by keyboard.

### Limitations of this run

- **The generated NGINX configuration was not executed.** No NGINX binary and no Docker daemon exist in this container, so `nginx -t` could not be run. The configuration is asserted structurally by unit tests and the language patterns are executed as regular expressions, which is not the same as a server parsing the file. `nginx -t` against the generated file is a required step of W2.4a and of the runbook before any deployment.
- The same applies to Apache: no `apachectl configtest` was run.
- Only the bundled Chromium engine is available, so the Firefox and WebKit projects were not executed; `KOXORA_BROWSERS=all` enables them.
- No Lighthouse measurement, no screen-reader audit and no deployment were performed. Configured remote jobs are not evidence of execution.

## 9. Risks and what they would look like

| Risk | Effect | Mitigation |
| --- | --- | --- |
| The generated NGINX file is rejected by the server | The container does not start, so the site is down | `nginx -t` before the swap, and the previous container stays running until the new one is healthy (W2.4a) |
| An alias redirect is installed before its certificate | A certificate warning instead of a redirect | The install order in the runbook, with verification between each step |
| The permanent code is turned on too early | Browsers cache a wrong redirect | Roll out with 302, switch after the smoke tests pass |
| A cache serves `/` to the wrong reader | One reader sees another's language | `no-store` and `Vary` on `/`, asserted in tests and in the runbook |
| Redirects installed in both Apache and Cloudflare | A redirect loop | Section 3 of the runbook: pick one layer |
| The container migration disturbs the live site | Downtime | W2.4a, separately approved, with the existing installation left intact until the replacement is healthy |

## 10. Open decisions

1. Where the alias redirects live, Apache or Cloudflare, and who terminates TLS for each name.
2. When 302 becomes 308.
3. Whether the language cookie is accepted as strictly necessary, or whether the Product Owner wants it behind consent. If it needs consent, the storage falls back to device storage only and the server-side answer for a reader without JavaScript becomes request-language only; the code supports that without a redesign.
4. The container migration, and with it the rest of W2.4.
