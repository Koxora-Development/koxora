# Deploying and updating the website and the browser studio

**Status: prepared for review, 2026-10-24. Nothing here has been executed against the Product Owner's infrastructure, and no production deployment is authorized.** This document prepares the handover requested in [Issue #22](https://github.com/Koxora-Development/koxora/issues/22) from the side of Website W1: how the two applications are built, how they are deployed independently of each other, and how an update is rolled back. The commands below were run in the development container; the server-side steps are proposals that must be verified against the real host before anything is published.

Related: [ADR 0017](../adr/0017-public-website-delivery.md), [W1 implementation notes](../platform/website-w1.md), [continuous integration](ci-cd.md), [release process](release-process.md).

## 1. Two applications, two deployments

| Application       | Workspace         | Planned address  | Content                                                    |
| ----------------- | ----------------- | ---------------- | ---------------------------------------------------------- |
| Marketing website | `apps/website`    | `koxora.app`     | Static pages, legal pages, no account, no service worker   |
| Browser studio    | `apps/studio-web` | `app.koxora.app` | The local-first editor, installable, with an offline cache |

They are one product for a reader and two deployments for an operator. Each can be rebuilt and replaced without touching the other. They must stay on separate addresses: browser storage belongs to one address, so moving the studio between addresses does not carry a reader's projects with it. A migration would need an export and import, which the studio already supports through `.koxora` archives; nothing in this milestone moves data.

## 2. Building the website

```sh
pnpm install --frozen-lockfile
pnpm website:build
```

That runs three steps: the client build produces the hashed stylesheet and enhancement script, the renderer build produces the build-time renderer, and the page emitter writes the static output. Output:

```text
apps/website/dist/          what the web server publishes
  index.html                language gateway, no-index
  en/… de/…                 one directory per page, each with index.html
  en/404.html de/404.html   localized not-found documents
  404.html                  fallback not-found document
  assets/                   hashed stylesheet and script
  images/                   icons, social previews, studio screenshots
  sitemap.xml robots.txt
apps/website/dist-deploy/   configuration, not published content
  apache-koxora-app.conf    virtual host fragment with headers and redirects
  _headers _redirects       equivalents for a static platform
  build-info.json           origin, flags, page count, inline script hash
```

`dist-deploy/` must never be copied into the published root.

## 3. Build configuration

All values are read at build time. The defaults describe the reviewed state.

| Variable                       | Default              | Effect                                                                                                                    |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `KOXORA_SITE_ORIGIN`           | `https://koxora.app` | Canonical addresses, sitemap, social metadata                                                                             |
| `KOXORA_SITE_EDITOR_URL`       | not set              | When set, the studio entry links directly to that address; otherwise it explains how to run the current version           |
| `KOXORA_SITE_INDEXABLE`        | `true`               | `false` emits `noindex` on every page and a disallow-all robots file, for staging                                         |
| `KOXORA_SITE_OPTIONAL_CONSENT` | empty                | Comma-separated optional consent categories the deployment really uses; a non-empty value turns on the first-visit prompt |
| `KOXORA_SITE_CONTENT_DATE`     | `2026-10-24`         | Review date shown on the site and used as the sitemap modification date                                                   |
| `KOXORA_SITE_OUT_DIR`          | `dist`               | Output directory of the page emitter                                                                                      |
| `KOXORA_SITE_DEPLOY_DIR`       | `dist-deploy`        | Output directory of the hosting configuration                                                                             |

A staging build therefore looks like this:

```sh
KOXORA_SITE_ORIGIN=https://staging.example.invalid KOXORA_SITE_INDEXABLE=false pnpm website:build
```

## 4. Serving the output

The emitted site is static files. The hosting layer has to provide four things, and the generated configuration provides all four:

1. A directory index, so `/en/features/` serves `en/features/index.html`.
2. The permanent redirects of the route table, including cross-language aliases and unprefixed paths, plus a trailing-slash normalization.
3. A language redirect for `/` only, by request language, defaulting to English.
4. The not-found document with the status code 404.

The generated Apache fragment contains the security headers, the cache rules and all 60 redirects. The content security policy pins the one inline script by hash, which `build-info.json` repeats, so it must be regenerated whenever the build changes.

```apacheconf
# apps/website/dist-deploy/apache-koxora-app.conf, generated
DirectoryIndex index.html
ErrorDocument 404 /404.html
RewriteCond %{HTTP:Accept-Language} ^de [NC]
RewriteRule ^$ /de/ [R=302,L]
RewriteRule ^$ /en/ [R=302,L]
Redirect 301 /features/ /en/features/
```

Caching: hashed assets under `/assets/` may be cached for a year and treated as immutable; images under `/images/` are cached for a day and revalidated, because their names are stable; every HTML document must revalidate, so that a new release is visible immediately. When a content delivery network sits in front of the host, its cache must be purged for HTML on release, or configured to honour the same rules.

A reference implementation of this contract is `apps/website/scripts/serve-site.mjs`, which is what `pnpm website:preview` and the browser tests use. It is a development and review server, not a production server.

## 5. Updating one application without touching the other

The proposal is an atomic swap of release directories, so that a failed build never replaces a working site and the previous release stays available.

```sh
# on the build machine, from a reviewed revision
pnpm install --frozen-lockfile
pnpm check
pnpm website:build
tar -czf koxora-website-<revision>.tar.gz -C apps/website/dist .
sha256sum koxora-website-<revision>.tar.gz
```

```sh
# on the server, with the archive and its checksum transferred
sha256sum -c koxora-website-<revision>.tar.gz.sha256
mkdir -p /srv/koxora/website/releases/<revision>
tar -xzf koxora-website-<revision>.tar.gz -C /srv/koxora/website/releases/<revision>
ln -sfn /srv/koxora/website/releases/<revision> /srv/koxora/website/current.new
mv -T /srv/koxora/website/current.new /srv/koxora/website/current
```

The virtual host points at `/srv/koxora/website/current`. The `mv -T` of a symbolic link is atomic, so no reader sees a half-replaced site. Rolling back is the same command pointing at the previous release directory, which is why old releases are kept rather than deleted. The studio deployment follows the same shape under its own root and its own virtual host, and a website release never touches it.

Paths, user accounts and virtual host names above are placeholders. Confirm the real layout with the operator before running anything, and never deploy by pulling an unreviewed branch onto a web server.

## 6. Checks after a deployment

| Check                            | Expectation                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `/`                              | Redirects to a language, by request language                             |
| `/en/` and `/de/`                | 200, correct language, correct canonical address                         |
| `/en/features`                   | 301 to `/en/features/`                                                   |
| `/de/legal-notice/`              | 301 to `/de/impressum/`                                                  |
| An unknown address               | 404 with the not-found document of that language                         |
| `/sitemap.xml` and `/robots.txt` | 200, sitemap lists every address of the release                          |
| Response headers                 | Security headers present, assets immutable, HTML revalidating            |
| Network panel on any page        | No request leaves the site's own origin                                  |
| Studio address                   | Still reachable, offline start still works, local projects still present |

The last row matters most: a website release must never be able to affect the studio's cache or a reader's local projects.

## 7. Not part of this milestone

- No deployment was performed, no DNS record was touched and no address was published.
- No automated deployment workflow is added. A protected environment with a human approval step is the recommended next step and belongs to the deployment milestone.
- No administration interface is built. The evaluation of a future one-click update belongs to [Issue #22](https://github.com/Koxora-Development/koxora/issues/22) and needs a backend, authentication and an audit trail before it can exist.
- No download artefact is published. Release artefacts remain governed by the release process and its separate approval.
