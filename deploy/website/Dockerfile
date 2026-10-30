# syntax=docker/dockerfile:1
#
# The Koxora marketing website as the container that already serves
# https://koxora.app: NGINX inside, reachable only through the loopback
# address the public Apache proxies to. This file versions that arrangement;
# it does not change it.
#
# Two stages. The first has Node and pnpm and renders the static site. The
# second has neither: it is NGINX, the emitted files and the generated
# configuration, so nothing that built the site can run in production.
#
# Build from the repository root:
#   docker build -f deploy/website/Dockerfile -t koxora-website:<revision> .
#
# The build fails rather than producing a broken image if NGINX rejects the
# generated configuration or if the njs module the language decision needs is
# missing, because the last stage runs `nginx -t` itself.

# Pinned to the repository's own toolchain, so the image and continuous
# integration build with the same versions. pnpm comes from the
# `packageManager` field through corepack and needs no version here.
ARG NODE_VERSION=22.22.0
# The NGINX version of the running deployment. Override it to match, and read
# `deploy/website/README.md` before changing it: a major version is a tested,
# separate decision.
ARG NGINX_VERSION=1.29

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /src
ENV CI=true
# The build renders HTML. It never needs a browser, and downloading one would
# make the image build depend on a second download host.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN corepack enable
# The manifests first, so a content change does not reinstall dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .node-version ./
COPY apps/website/package.json apps/website/
COPY apps/studio-web/package.json apps/studio-web/
COPY apps/studio-desktop/package.json apps/studio-desktop/
COPY packages/editor-core/package.json packages/editor-core/
COPY packages/contact/package.json packages/contact/
COPY packages/i18n/package.json packages/i18n/
COPY packages/persistence/package.json packages/persistence/
COPY packages/project/package.json packages/project/
COPY packages/studio/package.json packages/studio/
COPY packages/ui/package.json packages/ui/
# Only what the website needs, and only versions the lockfile names.
RUN pnpm install --frozen-lockfile --filter @koxora/website...
COPY . .
# The deployment inputs of the release. They are build inputs on purpose: the
# emitted pages, the canonical addresses and the content security policy are
# all derived from them, so a release records exactly one set.
ARG KOXORA_SITE_ORIGIN=https://koxora.app
ARG KOXORA_SITE_EDITOR_URL=
ARG KOXORA_SITE_INDEXABLE=true
ARG KOXORA_SITE_PUBLISHED=false
ARG KOXORA_SITE_OPTIONAL_CONSENT=
ARG KOXORA_SITE_CONTENT_DATE=
# Where the contact form posts. Empty until the endpoint of ADR 0019 answers on
# the public host: the page then publishes the support address instead of a
# form, because a form that posts nowhere is worse than an address. It is a
# build input because the form action and the content security policy are both
# derived from it, so one image either has a working form or has none.
#
# The endpoint itself is not in this image and never will be. It runs under the
# host's PHP-FPM behind the existing Apache, so setting this without the Apache
# fragment of `docs/development/website-contact-form.md` installed would point
# the form at the static container. The release document states that order, and
# step 7 of the contact document is how it is proven before this is set.
ARG KOXORA_SITE_CONTACT_ENDPOINT=
# The redirect code the alias hosts answer with, recorded in the release note
# beside the published files. 302 during a rollout, 308 once it is verified.
ARG KOXORA_SITE_ALIAS_REDIRECT_STATUS=
ENV KOXORA_SITE_ORIGIN=${KOXORA_SITE_ORIGIN} \
    KOXORA_SITE_EDITOR_URL=${KOXORA_SITE_EDITOR_URL} \
    KOXORA_SITE_INDEXABLE=${KOXORA_SITE_INDEXABLE} \
    KOXORA_SITE_PUBLISHED=${KOXORA_SITE_PUBLISHED} \
    KOXORA_SITE_OPTIONAL_CONSENT=${KOXORA_SITE_OPTIONAL_CONSENT} \
    KOXORA_SITE_CONTENT_DATE=${KOXORA_SITE_CONTENT_DATE} \
    KOXORA_SITE_CONTACT_ENDPOINT=${KOXORA_SITE_CONTACT_ENDPOINT} \
    KOXORA_SITE_ALIAS_REDIRECT_STATUS=${KOXORA_SITE_ALIAS_REDIRECT_STATUS}
RUN pnpm --filter @koxora/website build
# The emitted site must not carry the build manifest or the configuration.
RUN test -f apps/website/dist/index.html \
 && test -f apps/website/dist-deploy/nginx-koxora-website.conf \
 && test ! -d apps/website/dist/.vite
# One mode for every published file, set here rather than inherited.
#
# COPY keeps the modes of what it copied, and the next stage keeps the modes of
# what it copies from this one, so an asset that was not world-readable in the
# build context stays unreadable in the image. The NGINX worker is
# unprivileged, so it answers 403 for that one file while its neighbours are
# served - which is exactly how two screenshots went missing from the live site
# while a third loaded. Normalizing here makes the published files independent
# of the tree the image was built from.
RUN find apps/website/dist -type d -exec chmod 0755 {} + \
 && find apps/website/dist -type f -exec chmod 0644 {} +

FROM nginx:${NGINX_VERSION}-alpine AS runtime
# The language decision is an algorithm, not a pattern match, so NGINX needs
# the njs module. Without it the server refuses to start, which is why this is
# installed here and proven by the configuration test below rather than
# discovered during a deployment.
RUN apk add --no-cache nginx-module-njs
# The generated configuration: the main file loads the module, the fragment
# serves the site, the module decides the language.
COPY --from=build /src/apps/website/dist-deploy/nginx-koxora-main.conf /etc/nginx/nginx.conf
COPY --from=build /src/apps/website/dist-deploy/nginx-koxora-website.conf /etc/nginx/conf.d/koxora-website.conf
COPY --from=build /src/apps/website/dist-deploy/nginx-koxora-language.js /etc/nginx/njs/koxora-language.js
# The published files, and the release record beside them for support. The
# ownership is stated rather than inherited, for the same reason as the modes.
COPY --from=build --chown=root:root /src/apps/website/dist/ /usr/share/nginx/html/
COPY --from=build --chown=root:root /src/apps/website/dist-deploy/build-info.json /etc/nginx/koxora-build-info.json
# The base image's own example server is removed. The generated main file
# includes every file in conf.d, so leaving it there would load a second
# server block nobody wrote next to the generated one.
RUN rm -f /etc/nginx/conf.d/default.conf
# A published file the unprivileged worker cannot read fails the build, instead
# of being answered with 403 by the running container. The file is named in the
# output, so a failure says which asset and not merely that something is wrong.
RUN unreadable="$(find /usr/share/nginx/html \
      \( -type f ! -perm -o+r \) -o \( -type d ! -perm -o+rx \) 2>/dev/null)"; \
    if [ -n "$unreadable" ]; then \
      echo 'Published files the web server cannot read:' >&2; \
      echo "$unreadable" >&2; \
      exit 1; \
    fi
# Everything from here runs as the account that serves the site.
#
# The master process ran as root before, and that is why the container could
# not start at all under the compose file's `cap_drop: ALL`: a root master
# chowns its temporary directories to the worker account, which needs
# CAP_CHOWN, and NGINX exits with
# `chown("/tmp/nginx-client-body", 101) failed (1: Operation not permitted)`.
# An unprivileged master creates those directories as itself and chowns
# nothing, so the container needs no capability at all. It also cannot write
# to the published files, whatever happens to a configuration.
USER nginx
# The image is proven here, as the account that will run it: a configuration
# NGINX rejects, a missing njs module, or a file the worker cannot read fails
# the build instead of the deployment.
RUN nginx -t
# The container writes nothing outside a temporary directory, so it can run
# with a read-only file system.
VOLUME ["/tmp"]
EXPOSE 8080
# Answered by the configuration itself, without touching the published files.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider --tries=1 http://127.0.0.1:8080/healthz || exit 1
