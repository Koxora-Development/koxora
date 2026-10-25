# syntax=docker/dockerfile:1
#
# The contact delivery service: a second container next to the website,
# reachable only on a loopback port, with the public Apache routing the
# contact path to it. The website container stays a static NGINX server and
# never sees a submission.
#
# Build from the repository root:
#   docker build -f deploy/contact/Dockerfile -t koxora-contact:<revision> .
#
# It holds no credentials. Every setting, the SMTP account included, comes
# from the environment at run time, and the service refuses to start when one
# is missing rather than answering and failing to deliver.

ARG NODE_VERSION=22.22.0

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /src
ENV CI=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .node-version ./
COPY apps/contact-api/package.json apps/contact-api/
COPY apps/website/package.json apps/website/
COPY apps/studio-web/package.json apps/studio-web/
COPY apps/studio-desktop/package.json apps/studio-desktop/
COPY packages/contact/package.json packages/contact/
COPY packages/editor-core/package.json packages/editor-core/
COPY packages/i18n/package.json packages/i18n/
COPY packages/persistence/package.json packages/persistence/
COPY packages/project/package.json packages/project/
COPY packages/studio/package.json packages/studio/
COPY packages/ui/package.json packages/ui/
# Only what the service needs to run, without the development tooling.
RUN pnpm install --frozen-lockfile --filter @koxora/contact-api... --prod
COPY packages/contact packages/contact
COPY apps/contact-api apps/contact-api

FROM node:${NODE_VERSION}-alpine AS runtime
# Node is the runtime here, unlike the website image: this service is a
# program, not a directory of files. It is confined instead — no shell access
# is needed, nothing is written, and it holds no data at all.
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /src/node_modules /app/node_modules
COPY --from=build /src/packages/contact /app/packages/contact
COPY --from=build /src/apps/contact-api /app/apps/contact-api
# The workspace links the pnpm install created point at these paths.
COPY --from=build /src/apps/contact-api/node_modules /app/apps/contact-api/node_modules
USER node
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.KOXORA_CONTACT_PORT || 8081) + '/api/contact/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# TypeScript is stripped at load time rather than compiled ahead: the service
# is a handful of files, and one fewer build step is one fewer thing that can
# differ between the tests and the image.
CMD ["node", "--experimental-strip-types", "apps/contact-api/src/main.ts"]
