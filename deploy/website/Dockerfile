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
ENV KOXORA_SITE_ORIGIN=${KOXORA_SITE_ORIGIN} \
    KOXORA_SITE_EDITOR_URL=${KOXORA_SITE_EDITOR_URL} \
    KOXORA_SITE_INDEXABLE=${KOXORA_SITE_INDEXABLE} \
    KOXORA_SITE_PUBLISHED=${KOXORA_SITE_PUBLISHED} \
    KOXORA_SITE_OPTIONAL_CONSENT=${KOXORA_SITE_OPTIONAL_CONSENT} \
    KOXORA_SITE_CONTENT_DATE=${KOXORA_SITE_CONTENT_DATE}
RUN pnpm --filter @koxora/website build
# The emitted site must not carry the build manifest or the configuration.
RUN test -f apps/website/dist/index.html \
 && test -f apps/website/dist-deploy/nginx-koxora-website.conf \
 && test ! -d apps/website/dist/.vite

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
# The published files, and the release record beside them for support.
COPY --from=build /src/apps/website/dist/ /usr/share/nginx/html/
COPY --from=build /src/apps/website/dist-deploy/build-info.json /etc/nginx/koxora-build-info.json
# The image is proven here: a configuration NGINX rejects, or a missing njs
# module, fails the build instead of the deployment.
RUN nginx -t
# The container writes nothing outside a temporary directory, so it can run
# with a read-only file system.
VOLUME ["/tmp"]
EXPOSE 8080
# Answered by the configuration itself, without touching the published files.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider --tries=1 http://127.0.0.1:8080/healthz || exit 1
