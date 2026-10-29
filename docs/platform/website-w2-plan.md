# Website W2 implementation plan

**Status: proposed for Product Owner review, 2026-10-25.** This plan slices the Website W2 assignment into pull requests that can be reviewed one at a time. It authorizes nothing by itself: each slice needs the same gates as W1, and no merge, deployment, DNS, Cloudflare or TinyCP change happens without an explicit Product Owner decision.

W1 is live at `https://koxora.app` and was integrated through [PR #28](https://github.com/Koxora-Development/koxora/pull/28). W2 starts from `main`, not from the W1 branch. Studio Phase 2.5 was accepted and merged in PR #39 on 2026-10-28; W2.3 now updates its content and screenshots to that development baseline; see [the ownership issue](https://github.com/Koxora-Development/koxora/issues/29).

Related documents: [W1 implementation notes](website-w1.md), [deployment and update guide](../development/website-deployment.md), [canonical domains runbook](../development/website-canonical-domains.md), [search plan](website-seo.md), [website specification](website.md).

## 1. Inventory taken before starting

| Question | Answer found in the repository |
| --- | --- |
| Is any W1 work unmerged? | No. `origin/main` is `6de50b7`, the squash merge of PR #28, and the working tree was clean. The W2 branch starts from that commit. The old W1 branch `claude/wizardly-clarke-jlxacx` contains nothing that is not in `main`. |
| Where is the website? | `apps/website`, a separate workspace package; eleven pages per language rendered to static HTML at build time. |
| Are the production Docker, Compose and NGINX files in Git? | **No.** Nothing matching `Dockerfile`, a Compose file or an NGINX configuration existed anywhere in the repository. The container that serves `koxora.app` was built on the server and is unversioned. This is the single largest risk in W2 and is why W2.0 already generates the NGINX configuration. |
| What did W1 do about language? | The generated Apache fragment matched `Accept-Language ^de` and otherwise sent `/` to `/en/`. No visitor choice was stored: `src/client/main.ts` persisted the appearance only. |
| What did W1 do about alias domains? | Nothing. `koxora.de`, `koxora.com` and the `www` names are not mentioned in the repository. |
| Are the comparison and contact pages ready for content? | The comparison page exists and says it is in preparation; the contact route does not exist, and the footer offers a `mailto:` address. |

## 2. Slices, in order

Each row is one pull request against `main`.

| # | Slice | Contents | Depends on |
| --- | --- | --- | --- |
| W2.0 | Domains, language detection, remembered language | Shared negotiation algorithm, stored choice, reworked root gateway, generated NGINX container configuration, generated Apache reverse-proxy and alias-domain fragments, storage inventory and privacy text, unit and browser tests, operator runbook | — |
| W2.4a | Versioned container | Multi-stage `Dockerfile` including the NGINX njs module the language decision needs, Compose file, healthcheck, image tags, and the documented migration of the running container onto the generated configuration | W2.0 (it produces the NGINX files the image needs) |
| W2.1 | Comparisons and comparison SEO | Sourced comparison table, per-claim sources and review dates, the three comparison landing pages and their localized addresses. **Implemented; see [the comparison document](website-comparison.md)** | W2.0 for the route table only |
| W2.2 | Contact form | Architecture first, then the form, the server-side endpoint, rate limiting, spam defence, privacy text. **Implemented; see [the contact form document](../development/website-contact-form.md)** | PHP under the host's existing PHP-FPM, decided by the Product Owner on 2026-10-25, so it needs no container and does not wait for W2.4a |
| W2.3 | Documentation, FAQ, product content | The eight documentation areas, real studio screenshots, the available/in development/planned distinction. **Implemented; see [the content review document](../development/website-content-review.md)** | W2.1 for the shared content components |
| W2.4b | Release automation | Reproducible build, immutable tags, approval-gated deployment, healthcheck, rollback. **Implemented; see [the release document](../development/website-release.md)** | W2.4a |

The order is deliberate: W2.0 and W2.4a make the live deployment reproducible before anything new is added to it, and the contact form is the only slice that introduces a server-side component, so it stays last among the content slices and carries its own security review.

## 3. What each slice has to prove

Common to all: existing W1 behaviour preserved; `pnpm check` clean; unit tests for new logic; Playwright on desktop, tablet and phone; keyboard and accessibility checks; complete English and German content; no broken link and no redirect loop; no content security policy violation; search metadata and sitemap correct; privacy and legal pages updated where the change touches them; no change to studio code.

| Slice | Additional proof |
| --- | --- |
| W2.0 | Every example of the issue's language table, both alias-domain redirect families with path and query preserved, no redirect built from a request header, no internal address in a `Location`, the storage inventory and the privacy text naming the new cookie |
| W2.4a | The image builds without a Node toolchain in the runtime layer, carries `ngx_http_js_module.so`, `nginx -t` accepts the generated configuration inside the image, the healthcheck answers, and the running site is unchanged after the migration |
| W2.1 | Every claim about another product carries a source, a tested plan and a date; nothing unreleased in Koxora is presented as available |
| W2.2 | Integration tests for the delivery path, header-injection and rate-limit tests, no credential in the repository, no success message before the backend accepted the message |
| W2.3 | Screenshots come from the real studio; each capability carries the label that matches the merged state |
| W2.4b | A failed release leaves the previous version serving; a rollback is one documented command; no credential in the repository |

## 4. Decisions the Product Owner still owns

1. **Where the alias redirects live.** Apache on the Hetzner host, or Cloudflare. W2.0 generates the Apache form and documents the Cloudflare equivalent; the choice and the certificates are an operator decision.
2. **When the permanent code is turned on.** The runbook rolls out with a temporary 302 and switches to 308 after verification.
3. **Migrating the running container** onto the versioned configuration, which is a production change.
4. **The mailbox and SMTP account** the contact form will use, plus the PHP-FPM socket and the directory the endpoint may live in, which together gate the activation of W2.2.
5. **Whether the language cookie is acceptable as strictly necessary** under the reading in [the legal review checklist](../legal/website-legal-review.md). The implementation assumes it is, because it is written only on an explicit selection and carries nothing but the chosen language.

## 5. Out of scope for W2

No DNS or mailserver change, no Cloudflare or TinyCP change performed by an agent, no studio feature, no content management system, and no presentation of a roadmap capability as available.
