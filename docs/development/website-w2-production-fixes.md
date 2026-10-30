# The four W2 production problems, and what was done about each

**Status: code fixed and verified locally, 2026-10-29. Nothing was deployed. No Apache, TinyCP, Cloudflare, DNS or mail setting was touched, and no credential was created, requested or guessed.** This is the response to [Issue #46](https://github.com/Koxora-Development/koxora/issues/46), under the website ownership of [Issue #29](https://github.com/Koxora-Development/koxora/issues/29). It references [Issue #30](https://github.com/Koxora-Development/koxora/issues/30) for contact delivery, [Issue #31](https://github.com/Koxora-Development/koxora/issues/31) for the canonical domains and [Issue #22](https://github.com/Koxora-Development/koxora/issues/22) for the deployment handover.

Related: [the contact form document](website-contact-form.md), [the canonical domains runbook](website-canonical-domains.md), [the container document](website-container.md), [the release document](website-release.md), [ADR 0019](../adr/0019-contact-delivery.md).

Two things this document keeps apart, because the issue asks for them to be kept apart:

- **Fixed in code.** Changed in this branch, with a check that fails if it comes back.
- **Needs the operator.** Written out exactly, run by nobody until the Product Owner says so. Section 6 is the whole list in one table.

A merged pull request, a built image and the live site are three different things. Nothing below claims the live site is fixed; it claims the code is, and says what has to happen on the host for that to reach a reader.

## 1. Contact was not discoverable

**What was reported.** The page exists at `/en/contact/` and `/de/kontakt/`, its route carries `nav: ['resources']`, and the Product Owner could not find a link to it on the live site.

**Root cause.** Both halves of this were true at once. The page was one entry in the footer's _Resources_ column, between the documentation and the releases — and the footer column actually headed **Contact** did not link to it at all. That column listed the support address and the security policy, so a reader looking for a way to write found a column with the right title and the wrong contents, and the link they wanted was filed under a different heading. The page was in no visible navigation at the top of any page, on any layout.

**Fixed in code.**

| Change                                                                                           | Where                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Contact is in the main navigation, in both languages, on desktop and in the collapsed phone menu | `apps/website/src/routes.ts` (`nav: ['primary']`) |
| The footer column headed Contact leads with the page, then the address                           | `apps/website/src/components/layout.tsx`          |
| It is no longer a second entry among the resources, so the footer offers one link                | `apps/website/src/routes.ts`                      |
| New label, in both languages                                                                     | `footer.contactPage`                              |

The support documentation already linked to it and still does.

**Verified.** `tests/website/contact.spec.ts`, in a new `finding the contact page` group, across the suite's desktop, tablet and phone projects: the main navigation link exists and is visible in both languages, marks itself as the current page, is reachable with the keyboard alone, is present in the markup without JavaScript, appears exactly once in the footer, and none of the four layouts scrolls sideways. `tests/website/navigation.spec.ts` counts the main navigation entries, so a sixth cannot be dropped silently.

## 2. The contact form was absent, and the page said why

**What was reported.** The live page said "The form is not switched on here" because "this deployment has no delivery service configured". That is a note to whoever installs the site, printed where a visitor reads it.

**Root cause, in two parts.**

The form renders only when `site.contactEndpoint` is set, which is correct: a form that posts nowhere is worse than a published address. That value comes from the build-time `KOXORA_SITE_CONTACT_ENDPOINT`, and **the W2.4a image build had no argument for it.** `deploy/website/Dockerfile` declared six deployment inputs and not that one, and `deploy/website/compose.yaml` passed the same six. So every image that definition can build is an image without a form, whatever the host is configured to route. The endpoint in `apps/contact-php` has never been installed either, so there was nothing to point at in any case.

The second part is the copy. The unconfigured state was written as an explanation of the deployment rather than as a way to make contact, and the same wording had spread: the consent notice on every page told readers what "this deployment" stores.

**Fixed in code.**

- `KOXORA_SITE_CONTACT_ENDPOINT` is a build argument of the image and of the compose definition, so a release can carry it. `apps/website/src/container.test.ts` fails if either drops it again.
- The page has two states and both are written for a reader. With a delivery service it leads with the form and publishes the address underneath. Without one it leads with the address as the way to write: a heading, one paragraph of what to include, and the address as the page's primary action. The lead paragraph, the security warning and the privacy paragraph each have a wording for the state without a form, so none of them points at a control that is not there.
- No sentence in either state mentions a deployment, a delivery service, a configuration or a switch.
- `deploymentDiagnosticPhrases` in `apps/website/src/content/launch.ts` lists that wording, and the names and addresses that only exist inside a deployment — `KOXORA_SITE_`, `PHP-FPM`, `127.0.0.1`, the control panel's name. The page emitter reads **every** emitted page for all of it and fails the build on a hit. Unlike the existing review-notice guard this one is not conditional on `KOXORA_SITE_PUBLISHED`: the live site is where this was found, and that build was not a published one.
- The consent notice now says "This website" and "Diese Website".

**Verified.** `pnpm test` (474 unit cases) including the new guard over every message in both languages; `pnpm website:build` fails on a planted phrase; `pnpm test:website` for both states of the page, with the form built against the real PHP endpoint; `pnpm website:apache` — 32 checks against a real Apache 2.4.58 with PHP-FPM and the generated contact routing.

**What is deliberately not done.** The flag is not set. Setting it while `/api/contact` is not routed to PHP would point the form at the static website container, which answers a submission with a 404 page — a form that posts nowhere, dressed as one that works. Section 4 is the order that avoids that, and it needs the operator.

## 3. Screenshot URLs answered 403

**What was reported.** `https://koxora.app/images/studio/editor-small-en.webp` answered **403 Forbidden from NGINX**. On the home page `editor-light` and `editor-small-en` failed to render while `editor-dark`, from the same directory, loaded. Both files are ordinary Git blobs of the right size.

**Root cause, reproduced.** The published files inherit their modes from the tree the image was built from, and an unprivileged web server answers 403 for a file it cannot open — one address at a time, with everything around it served normally.

`COPY` keeps the modes of what it copied, and the runtime stage keeps the modes of what it copies from the build stage. The client build copies `public/` as it finds it. There was no `.dockerignore`, so the build context was the whole working tree, modes included. Git records no read permission, so those modes are not source data in the first place: a checkout, a capture run and an unpacked archive all produce different ones. A file that was `0600` in the tree the image was built from is `0600` in `/usr/share/nginx/html`, and the NGINX worker runs as uid 101.

Demonstrated rather than deduced. With one asset set to `0600` in the build context, the running container answers:

```
GET /images/studio/editor-dark.webp      200 image/webp
GET /images/studio/editor-small-en.webp  403
```

and the container's own log says exactly what the reported failure was:

```
[error] open() "/usr/share/nginx/html/images/studio/editor-small-en.webp"
        failed (13: Permission denied)
```

The generated NGINX configuration is not at fault: its location precedence, its hidden-path rule and its trailing-slash rule all leave `/images/…` to be served, which the same container proves for all 34 referenced addresses.

**Two further defects found while reproducing it.** Both mean the committed container definition had never been started.

- **The container could not start at all.** Under the compose file's `read_only: true` and `cap_drop: ALL`, NGINX exited with `chown("/tmp/nginx-client-body", 101) failed (1: Operation not permitted)`. A master process running as root chowns its temporary directories to the worker account, which needs `CAP_CHOWN`, and that capability was dropped. It now runs as `nginx` throughout, which needs no capability, creates those directories as itself, and cannot write to the published files whatever happens to a configuration.
- **The base image's example server was still loaded.** The generated main file includes every file in `conf.d`, and `default.conf` from `nginx:alpine` was never removed, so a second server block nobody wrote was loaded beside the generated one.

**And one more, found by the new checks.** `site.webmanifest` was answered as `application/octet-stream`, because the bundled type table has no entry for `.webmanifest` and the default type applied. A manifest served as that is ignored by the browser. The reference preview server was right about this and the container was not.

**Fixed in code.**

| Change                                                                                                                | Where                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| The build decides the published modes: `0644` for files, `0755` for directories                                       | `apps/website/scripts/emit-site.mjs`, `deploy/website/Dockerfile` |
| Ownership is stated on the copy rather than inherited                                                                 | `deploy/website/Dockerfile`                                       |
| A published file the worker could not read fails the image build, and is named in the output                          | `deploy/website/Dockerfile`                                       |
| The build context is bounded, so the image does not inherit a working tree                                            | `.dockerignore` (new)                                             |
| The server runs as `nginx`, and `nginx -t` runs as that account too                                                   | `deploy/website/Dockerfile`                                       |
| The base image's example server is removed                                                                            | `deploy/website/Dockerfile`                                       |
| `application/manifest+json` and `image/webp` are pinned, so the answer does not depend on the base image's type table | `apps/website/src/deploy-config.ts`                               |
| A page that references a file the build does not produce fails the build                                              | `apps/website/scripts/emit-site.mjs`                              |

**Verified, over HTTP rather than on the file system.** The addresses are read out of the emitted pages themselves (`apps/website/scripts/assets.mjs`), so a picture added to a page is covered without anybody maintaining a second list.

| Check                    | What it runs against                         | Result                                                                                                |
| ------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm website:nginx`     | A real NGINX 1.24.0 with the generated files | **219 checks pass** (111 before), including all 34 referenced assets, status, type and HEAD           |
| `pnpm website:container` | The real image, built and running            | **134 checks pass**, plus the published tree re-checked for readability inside the container          |
| `pnpm test:website`      | A browser                                    | Every image address on every page answers 200 with its own type, and each screenshot actually decodes |
| `pnpm test`              | The working tree                             | Both encodings of every screenshot exist and are readable                                             |

With the two reported assets set to `0600` in the build context, the rebuilt image serves both at **200 `image/webp`** and the manifest at **`application/manifest+json`**.

**Needs the operator.** A code fix reaches the live site only through a release. The container currently running was built from an unknown revision, and whatever file modes it carries are still in it.

## 4. The .com and .de domains do not redirect

**What was reported.** `koxora.de`, `www.koxora.de`, `koxora.com`, `www.koxora.com` and `www.koxora.app` do not redirect to `https://koxora.app`.

**Root cause.** Not a bug in the website. A request for `koxora.de` never reaches the website container: it arrives at whatever terminates TLS for that name, which is the host's Apache or a content network, and neither is in this repository. **No image rebuild can fix this, and this branch does not claim to.** The repository's part is to generate the rules and to prove what they do before an operator installs them.

One real defect was in the repository's part. The generated `apache-koxora-aliases.conf` says it must not be edited by hand, and the runbook then told the operator to change `308` to `302` for the rollout — by hand, in that file. An operator who has to edit a generated file has no way to show that what they installed is what the repository renders.

**Fixed in code.**

- The redirect code is a build input: `KOXORA_SITE_ALIAS_REDIRECT_STATUS=302` renders the rollout file, nothing renders `308` by accident, and an unrecognized value falls back to the permanent code rather than being written into a directive. Each file states which of the two it is and what has to happen before the other.
- The build emits `smoke-aliases.sh` beside the configuration, generated from the same host list, so the tests cannot cover fewer names than the rules do. It checks the certificate of each name first — a browser completes the handshake before it is told to go elsewhere — then every alias, apex and `www`, over HTTPS and plain HTTP, GET and HEAD, keeping the path and the query; that the root of an alias stays the root, so the canonical host negotiates the language; that the pass-through paths are answered locally; that no chain is longer than two hops and ends anywhere but the canonical host; and that the canonical host is never redirected away. It changes nothing, every request is bounded, and it exits non-zero on the first wrong answer, so it can gate the switch to the permanent code.
- `pnpm website:aliases` (`apps/website/scripts/check-apache-aliases.mjs`) runs the generated rules against a real Apache — a local one where there is one, the official `httpd` image where there is a Docker daemon instead — and asks what answers.

**Verified.** **164 checks pass** against Apache 2.4.58 locally and against `httpd:2.4` in Docker, for the `308` build and again for the `302` build: every one of the five names answers the configured code to `https://koxora.app` with the path and the query intact, the root stays the root, HEAD agrees with GET, all four pass-through prefixes are answered locally rather than redirected, a forged `Host` header cannot change the target, and no rule matches the canonical host.

TLS is deliberately not part of that check: the certificates are the operator's half, and the generated smoke tests check them on the real hosts.

**Needs the operator**, and the Product Owner has said not to touch TinyCP or Apache during the W2 container update. Section 5 is the order; section 6 is what needs authorization.

## 5. The order these have to happen in

Each block is a separate decision. Nothing in it was run.

### 5.1 The release that carries the asset fix

The 403 is fixed in the image, so it reaches a reader through a release and nothing else. Follow [the container document](website-container.md) section 5 and [the release document](website-release.md). Before the swap, on the host:

```sh
# The new image answers beside the running one, and every referenced asset
# is asked for rather than assumed. 9403 is free; 9402 is the live container.
KOXORA_WEBSITE_CONTAINER=koxora-website-next KOXORA_WEBSITE_PORT=9403 \
  docker compose -f deploy/website/compose.yaml --project-directory . \
  -p koxora-website-next up -d
docker inspect --format '{{.State.Health.Status}}' koxora-website-next

for name in editor-dark editor-light editor-small-en editor-small-de; do
  for ext in webp png; do
    printf '%s.%s ' "$name" "$ext"
    curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' \
      "http://127.0.0.1:9403/images/studio/$name.$ext"
  done
done
# Expect 200 image/webp and 200 image/png for all eight. A 403 here means the
# image was built from a tree whose modes did not normalize; a 404 means the
# asset is missing.

curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' \
  http://127.0.0.1:9403/en/site.webmanifest
# Expect 200 application/manifest+json

docker compose -p koxora-website-next down
```

After the swap, from outside the host, the same eight addresses on `https://koxora.app`.

### 5.2 Activating contact delivery

[The contact form document](website-contact-form.md) sections 4 and 5 are the installation, unchanged and still accurate. What this branch adds is the order of the last two steps, because getting it the wrong way round publishes a form that cannot work:

1. Install the endpoint, its settings file and its state directory (steps 2 to 4 of that document). `KOXORA_CONTACT_ENABLED` stays `false`.
2. Install the generated `apache-koxora-contact.conf` inside the HTTPS virtual host of `koxora.app`, before its `ProxyPass /` line (step 6).
3. Prove the routing reaches PHP and not the website container (step 7). `curl -sS -i https://koxora.app/api/contact` must answer **405 with an `Allow` header**. A 404 page means the submission is reaching the static container, and the form must not be switched on.
4. Switch delivery on and confirm a test message **arrived in the mailbox** (step 8).
5. **Only then** build and release the image with `KOXORA_SITE_CONTACT_ENDPOINT=/api/contact`. Until that release the page publishes the support address, which is a working way to make contact and says nothing about why.

The secrets this needs are named in step 3 of that document and exist nowhere in this repository: the recipient mailbox, the sending identity, the mail host, and the submission account with its password. No SMTP credential may be committed, invented or accepted, and creating that account is a Product Owner decision.

### 5.3 The canonical domain redirects

[The canonical domains runbook](website-canonical-domains.md) section 3 is the order, with step 4 changed: the rollout file is built rather than edited.

```sh
# On a build machine, not on the host.
KOXORA_SITE_ALIAS_REDIRECT_STATUS=302 pnpm website:build
cat apps/website/dist-deploy/apache-koxora-aliases.conf   # five names, 302
cp apps/website/dist-deploy/smoke-aliases.sh .            # the tests for it
```

DNS and the certificates come first, then those virtual hosts, then `sh smoke-aliases.sh`, and only after it passes the same two files rebuilt with `308`. If the redirects are done in the content network instead, the runbook's Cloudflare equivalent applies and the same script proves it. **Do not install both**: two layers of redirect is how a loop is built.

## 6. What needs Product Owner authorization

Nothing in this table was done, and none of it is in the pull request.

| #   | Action                                                                             | Touches                                       | Blocks                       |
| --- | ---------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------- |
| 1   | Build and release the website image from the reviewed revision                     | Docker on the host                            | The 403 on the screenshots   |
| 2   | Install the PHP endpoint, its settings file and its state directory                | The host's file system                        | Contact delivery             |
| 3   | Create the mailbox, the sending identity and the submission account                | The mail provider                             | Contact delivery             |
| 4   | Include `apache-koxora-contact.conf` in the `koxora.app` HTTPS virtual host        | TinyCP-managed Apache                         | Contact delivery             |
| 5   | Release the image with `KOXORA_SITE_CONTACT_ENDPOINT` set, after 2 to 4 are proven | Docker on the host                            | The form on the contact page |
| 6   | Point the alias names at the host                                                  | DNS                                           | The domain redirects         |
| 7   | Issue a certificate for each alias name                                            | TinyCP's certificate tooling                  | The domain redirects         |
| 8   | Install the alias virtual hosts, built with `302`                                  | TinyCP-managed Apache, or the content network | The domain redirects         |
| 9   | Rebuild and install them with `308` once the smoke tests pass                      | The same                                      | Caching the redirect         |

Also still open from the container document: whether the content network proxies `koxora.app` today, and what the running container was actually built from.

## 7. What was run for this branch, and what was not

| Check                                | Result                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `pnpm check`                         | Typecheck, lint, formatting, 474 unit cases, documentation and licences pass  |
| `pnpm website:build`                 | 113 files, 34 referenced assets, both the `302` and the `308` alias builds    |
| `pnpm website:nginx`                 | 219 checks against NGINX 1.24.0                                               |
| `pnpm website:container`             | 134 checks against the real image, built and running                          |
| `pnpm website:apache`                | 32 checks against Apache 2.4.58 with PHP-FPM                                  |
| `pnpm website:aliases`               | 164 checks against Apache, locally and in Docker, for both redirect codes     |
| `pnpm test:website`                  | The contact, navigation and asset suites on desktop, tablet and phone         |
| Anything on the Product Owner's host | **Not run.** No deployment, no Apache, TinyCP, Cloudflare, DNS or mail change |
| A message arriving in a mailbox      | **Not verified, and cannot be from here.** No credential exists               |
| The live site                        | **Unchanged.** Section 6 is what would change it                              |

One deviation worth recording: the development container's outbound traffic is re-terminated by a proxy with its own certificate authority, which the image build cannot reach past. The image was therefore built from the committed `Dockerfile` with two lines added that install that authority in the build stage, and nothing else; the runtime stage, the mode normalization, the readability guard, the unprivileged user and the generated configuration are the committed ones. On a machine with ordinary outbound access `pnpm website:container` builds and checks the committed file unaided.
