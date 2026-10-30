# Canonical domains and language negotiation in production

**Status: prepared for review, 2026-10-25. Nothing in this document has been executed against the Product Owner's infrastructure. No DNS record, no Cloudflare setting and no TinyCP setting was changed, and no deployment was performed.** It is the operator half of Website W2.0 and of [Issue #31](https://github.com/Koxora-Development/koxora/issues/31): which files to install, in what order, and how to prove afterwards that the result is correct.

Related: [W2.0 implementation notes](../platform/website-w2-0.md), [deployment and update guide](website-deployment.md), [the deployment handover issue](https://github.com/Koxora-Development/koxora/issues/22), [the production fixes document](website-w2-production-fixes.md).

**Addendum, 2026-10-29.** Still true, and two things changed. The rollout code is now a **build input** rather than an edit to a generated file: `KOXORA_SITE_ALIAS_REDIRECT_STATUS=302` renders the rollout version, so step 4 below no longer asks anybody to edit a file that says not to. And the build emits `smoke-aliases.sh`, which is section 4 of this document as a script generated from the same host list the rules are, so the tests cannot cover fewer names than the rules do. `pnpm website:aliases` runs those rules against a real Apache before any of this is installed.

**What website code cannot do.** A request for `koxora.de` never reaches the website container: it arrives at whatever terminates TLS for that name. No image rebuild redirects anything, and nothing in this repository can. Everything below needs the operator, and the Product Owner has said not to touch TinyCP or Apache during the W2 container update, so it needs their authorization first.

## 1. The target state

`https://koxora.app` is the only address of this website. Everything else that answers sends the reader there, keeping the path and the query string, and the root of the canonical host then opens the right language.

| Request                                               | Answer                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `http://koxora.de/de/funktionen/?ref=example`         | Redirect to `https://koxora.app/de/funktionen/?ref=example`                       |
| `https://www.koxora.com/`                             | Redirect to `https://koxora.app/`, which then negotiates the language             |
| `https://www.koxora.app/en/features/`                 | Redirect to `https://koxora.app/en/features/`                                     |
| `http://koxora.de/.well-known/acme-challenge/<token>` | Answered by the host itself, not redirected                                       |
| `https://koxora.app/`                                 | 302 to `/de/` or `/en/`, by stored choice and then request language, never cached |
| `https://koxora.app/de/`                              | The German page, whatever a reader chose before                                   |

## 2. The files the build produces

`pnpm website:build` writes them into `apps/website/dist-deploy/`, which is configuration and is never copied into the published root.

| File                         | Where it belongs                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nginx-koxora-main.conf`     | In the website container as `/etc/nginx/nginx.conf`. It loads the njs module, which is only valid in the main context, and includes the file below                           |
| `nginx-koxora-language.js`   | In the website container as `/etc/nginx/njs/koxora-language.js`. The language algorithm the server runs                                                                      |
| `nginx-koxora-website.conf`  | In the website container as `/etc/nginx/conf.d/koxora-website.conf`. It serves the emitted files, owns the redirects, the headers, the cache rules and the language decision |
| `apache-koxora-proxy.conf`   | In the `koxora.app` HTTPS virtual host on the Hetzner host. It forwards to the container and adds nothing                                                                    |
| `apache-koxora-aliases.conf` | One virtual host per alias name, on ports 80 and 443. The redirect code is whatever the build was given                                                                      |
| `smoke-aliases.sh`           | The tests in section 4, generated from the same host list. It changes nothing, bounds every request and exits non-zero on the first wrong answer                             |
| `apache-koxora-app.conf`     | Only for a host that serves the emitted files directly, without a container. Not used by the current production layout                                                       |
| `build-info.json`            | The record of the release: origin, alias hosts, redirect status, container address, policy and the hashes it pins                                                            |

The image must provide `ngx_http_js_module.so`: the configuration loads it, and NGINX refuses to start without it. On the official Debian-based image that is `apt-get install nginx-module-njs`, on the Alpine image `apk add nginx-module-njs`, pinned to the image's own NGINX version. Versioning the image is W2.4a; until then this is the one prerequisite these files carry.

Before installing anything, prove the files are accepted and behave as described:

```sh
pnpm install --frozen-lockfile
pnpm website:build
pnpm website:nginx     # nginx -t plus 219 assertions over HTTP
pnpm website:aliases   # the alias rules, against a real Apache
```

That check needs NGINX with the njs module on the machine running it (`apt-get install nginx-light libnginx-mod-http-js` on Debian or Ubuntu). Without them it reports what is missing and passes, so it never gives false assurance; continuous integration installs both and a failure there is a real failure.

`pnpm website:aliases` starts a real Apache with the generated alias rules and a stand-in for the canonical host, and asks what answers: every name, apex and `www`, on both ports, GET and HEAD, the path and the query intact, the root staying the root, the four pass-through prefixes answered locally, a forged `Host` header unable to change the target, and no rule matching the canonical name. It uses a local Apache where there is one and the official `httpd` image where there is a Docker daemon instead, and skips loudly with neither. **164 checks pass** for the `308` build and again for the `302` build. TLS is not part of it: the certificates are the operator's half, and `smoke-aliases.sh` checks them on the real hosts.

Three properties of the generated files matter and are asserted by `apps/website/src/deploy-config.test.ts`:

- **`absolute_redirect off`.** Without it, NGINX builds absolute redirect targets from the address it is listening on, so a reader behind the proxy receives a `Location` naming `127.0.0.1`. Every generated redirect is relative.
- **No redirect target is built from a request.** The alias target is the configured origin, written into the file. `%{HTTP_HOST}` appears nowhere, so no `Host` header can turn an alias into an open redirect, and the stored-language cookie is only ever matched against the two literal values this site writes.
- **The language decision is the algorithm, not an approximation.** A `map` cannot compare quality values, so the container loads `apps/website/src/nginx/koxora-language.js` through the njs module. It is the same algorithm the browser and the reference server run, quality values and `q=0` included, and two tests hold the two implementations together.
- **The security headers exist in one place.** The container sets them; the proxy fragment sets none. An `add_header` inside an NGINX location would silently replace the inherited set, so the generated file sets every header once on the server and uses no `add_header` in any location.

## 3. Installing it, in this order

The order is the point: a browser completes TLS before it is told to go somewhere else, so a redirect installed before the certificate produces a certificate warning instead of a redirect.

1. **DNS.** Point `koxora.de`, `www.koxora.de`, `koxora.com`, `www.koxora.com` and `www.koxora.app` at the host. Keep the mail records of `koxora.de` and `koxora.com` exactly as they are: this changes web traffic only. Confirm whether Cloudflare proxies each name, because that decides who terminates TLS.
2. **Certificates.** Issue a certificate for every name through TinyCP's Let's Encrypt integration, with no redirect in place yet, and confirm each one answers over HTTPS. The generated alias virtual hosts answer `/.well-known/acme-challenge/` locally, so renewal keeps working after step 4.
3. **Verify every name answers.** `curl -sSI https://koxora.de/` must complete the handshake. A handshake failure here is a certificate problem, not a redirect problem.
4. **Install the alias virtual hosts** from a build made with `KOXORA_SITE_ALIAS_REDIRECT_STATUS=302`. A permanent redirect is cached by browsers and by Cloudflare and is hard to take back, so the rollout starts at the temporary code — and it is built rather than edited, so what is installed is what this repository renders:

   ```sh
   KOXORA_SITE_ALIAS_REDIRECT_STATUS=302 pnpm website:build
   cat apps/website/dist-deploy/apache-koxora-aliases.conf   # five names, 302
   ```

5. **Run the smoke tests**: `sh apps/website/dist-deploy/smoke-aliases.sh`, from outside the host. It is section 4 of this document, generated. It exits non-zero on the first wrong answer.
6. **Switch to 308** by rebuilding the same two files with `KOXORA_SITE_ALIAS_REDIRECT_STATUS=308` once the tests pass, installing them, and running the script again.
7. **Only then** consider the container migration, which is a separate change and is described in [the deployment guide](website-deployment.md).

If the redirects are implemented in Cloudflare instead, the equivalent is a Redirect Rule per alias zone with the expression `http.host in {"koxora.de" "www.koxora.de"}` and a dynamic target of `concat("https://koxora.app", http.request.uri.path)` preserving the query, with the ACME and autodiscovery paths excluded. The same order applies, and the same tests prove it. Do not install both: two layers of redirect are how a loop is built.

## 4. Smoke tests

`pnpm website:build` writes these as `apps/website/dist-deploy/smoke-aliases.sh`, generated from the alias host list, so running the script and running the commands below are the same thing and the script cannot fall behind the configuration. Run it from outside the host:

```sh
sh smoke-aliases.sh                     # expects the code this build renders
EXPECTED_STATUS=302 sh smoke-aliases.sh # during the rollout
```

What it does, and what to run by hand when only one answer is in question. `-s -S -o /dev/null -D -` prints the response headers only, and `--max-redirs 0` keeps each hop separate so a chain is visible.

```sh
# 1. Each alias redirects to the canonical host, keeping path and query.
for host in koxora.de www.koxora.de koxora.com www.koxora.com www.koxora.app; do
  curl -sS -o /dev/null -D - --max-redirs 0 \
    "https://$host/de/funktionen/?ref=example" | grep -iE '^(HTTP/|location:)'
done
# Expect: 302 during rollout, 308 afterwards, and
# location: https://koxora.app/de/funktionen/?ref=example

# 2. The same over plain HTTP, and for HEAD as well as GET.
curl -sS -o /dev/null -D - --max-redirs 0 "http://koxora.de/en/features/" | grep -iE '^(HTTP/|location:)'
curl -sS -I -o /dev/null -D - --max-redirs 0 "https://koxora.com/en/features/" | grep -iE '^(HTTP/|location:)'

# 3. No chain longer than two hops, and no loop. The final address answers 200.
curl -sS -o /dev/null -w '%{num_redirects} hops, final %{url_effective}, %{http_code}\n' \
  -L "http://www.koxora.de/de/funktionen/"

# 4. Certificate issuance is not redirected away from the alias host.
curl -sS -o /dev/null -D - --max-redirs 0 \
  "http://koxora.de/.well-known/acme-challenge/test-token" | grep -iE '^HTTP/'
# Expect 404 from the host itself, never a 301/302/308 to koxora.app.

# 5. Mail autodiscovery on the alias domains still answers locally.
for path in /.well-known/autoconfig/mail/config-v1.1.xml /autodiscover/autodiscover.xml; do
  curl -sS -o /dev/null -D - --max-redirs 0 "https://koxora.de$path" | grep -iE '^(HTTP/|location:)'
done
# Expect whatever the mail configuration serves, never a redirect to koxora.app.

# 6. Language negotiation on the canonical root.
curl -sS -o /dev/null -D - --max-redirs 0 -H 'Accept-Language: de-DE,de;q=0.9,en;q=0.8' \
  https://koxora.app/ | grep -iE '^(HTTP/|location:|cache-control:|vary:)'
# Expect: 302, location: /de/, cache-control: no-store,
# vary: Cookie, Accept-Language
curl -sS -o /dev/null -D - --max-redirs 0 -H 'Accept-Language: en-GB,en;q=0.9' \
  https://koxora.app/ | grep -i '^location:'          # /en/
curl -sS -o /dev/null -D - --max-redirs 0 -H 'Accept-Language: fr-FR,fr;q=0.9' \
  https://koxora.app/ | grep -i '^location:'          # /en/
curl -sS -o /dev/null -D - --max-redirs 0 -H 'Accept-Language: de-AT' \
  https://koxora.app/ | grep -i '^location:'          # /de/

# 7. A stored choice outranks the browser languages, in both directions.
curl -sS -o /dev/null -D - --max-redirs 0 -H 'Cookie: koxora_language=de' \
  -H 'Accept-Language: en-US,en;q=0.9' https://koxora.app/ | grep -i '^location:'   # /de/
curl -sS -o /dev/null -D - --max-redirs 0 -H 'Cookie: koxora_language=en' \
  -H 'Accept-Language: de-DE,de;q=0.9' https://koxora.app/ | grep -i '^location:'   # /en/

# 8. A crafted cookie cannot name a target.
curl -sS -o /dev/null -D - --max-redirs 0 -H 'Cookie: koxora_language=//example.invalid' \
  -H 'Accept-Language: de-DE' https://koxora.app/ | grep -i '^location:'            # /de/

# 9. An address that names its language is never negotiated.
curl -sS -o /dev/null -D - --max-redirs 0 -H 'Cookie: koxora_language=de' \
  https://koxora.app/en/features/ | grep -iE '^HTTP/'                              # 200

# 10. No reader is ever sent to an internal address.
curl -sS -D - -o /dev/null -L https://koxora.app/en/features | grep -i '^location:'
# Expect a relative /en/features/ or an absolute koxora.app address. A
# 127.0.0.1 here means absolute_redirect off is missing.

# 11. The container is not reachable from outside the host.
curl -sS --max-time 5 http://<server-address>:9402/ ; echo "exit $?"
# Expect a connection failure.

# 12. On the host itself, the container answers and is healthy.
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:9402/healthz
```

Also confirm, in a browser: `https://koxora.app/` with the browser set to German opens `/de/`; choosing English in the language menu and reopening `https://koxora.app/` opens `/en/`; a shared `https://koxora.app/de/funktionen/` opens in German even with English stored.

## 5. Caching

| Address          | Cache-Control                                    | Why                                                                                                    |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `/`              | `no-store`, with `Vary: Cookie, Accept-Language` | The answer depends on the reader. A cached 302 here is how one reader's language is served to the next |
| `/de/…`, `/en/…` | `public, max-age=0, must-revalidate`             | Each is one language only, so nothing has to vary                                                      |
| `/assets/…`      | one year, immutable                              | The names carry a content hash                                                                         |
| `/images/…`      | one day, revalidated                             | The names are stable                                                                                   |

In Cloudflare, confirm that `/` is not cached and that the redirect of each alias is not cached as permanent during rollout. Purge the HTML of the canonical host on every release.

## 6. What search engines see

`/de/` and `/en/` keep their canonical addresses, their bidirectional `hreflang` and `x-default`, and they are the only addresses in the sitemap. The root carries `noindex, follow`, so the negotiating redirect and the gateway document are never a second address for either home page. A crawler sends no cookie, so it is negotiated by its request language alone, which is deterministic. The alias domains return a redirect for every address, so none of them can be indexed.

## 7. What is still open

- Who terminates TLS for each alias name, and whether Cloudflare proxies them.
- Whether the redirects live in Apache or in Cloudflare.
- The date the permanent code is switched on.
- The migration of the running container onto the generated NGINX configuration.
- Authorization for any of it. None of section 3 has been run, and the current instruction is not to touch TinyCP or Apache during the container update. The authorization list is section 6 of [the production fixes document](website-w2-production-fixes.md).
