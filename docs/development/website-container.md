# The website container, versioned

**Status: prepared for review, 2026-10-25. Development and preparation only. Nothing was built, nothing was deployed, and no existing container, site or service on the Product Owner's host was touched.** This is Website W2.4a of [the W2 plan](../platform/website-w2-plan.md), and it covers the repository half of [Issue #22](https://github.com/Koxora-Development/koxora/issues/22).

The running deployment is confirmed and is kept exactly as it is: NGINX inside a Docker container named `koxora-website`, reachable only at `127.0.0.1:9402`, with TinyCP-managed Apache 2 in front of it on a Hetzner server running Debian 12. Nothing here changes the web server, the internal address, the public proxy or the external ports. What changes is that the arrangement is now described in Git instead of only on the server.

Related: [the canonical domains runbook](website-canonical-domains.md), [the deployment and update guide](website-deployment.md), [W2.0 implementation notes](../platform/website-w2-0.md).

## 1. What is in the repository now

| File                                       | Purpose                                                                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy/website/Dockerfile`                | Two stages. The first has Node and pnpm and renders the static site; the second is NGINX with the emitted files and the generated configuration, and has no Node at all |
| `deploy/website/compose.yaml`              | One service, published on `127.0.0.1:9402` only, read-only file system, no capabilities, healthcheck, bounded logs                                                      |
| `deploy/website/README.md`                 | The short version, next to the files                                                                                                                                    |
| `apps/website/src/container.test.ts`       | The properties that must hold, asserted on every `pnpm check` without a Docker daemon                                                                                   |
| `apps/website/scripts/check-container.mjs` | Parses and resolves the compose file with the Docker client, which needs no daemon                                                                                      |

The configuration the image installs is the generated output of W2.0: `nginx-koxora-main.conf` becomes `/etc/nginx/nginx.conf`, `nginx-koxora-website.conf` becomes `/etc/nginx/conf.d/koxora-website.conf`, and `nginx-koxora-language.js` becomes `/etc/nginx/njs/koxora-language.js`. The image also keeps `build-info.json` at `/etc/nginx/koxora-build-info.json`, so the running container can state which release it is.

## 2. The decisions in it

**The build happens in the image, not on the server.** The first stage installs only what the website needs, with the lockfile, and renders the pages. The server then needs no Node, no pnpm and no toolchain, and a release becomes an image rather than a build on a production host. This is also the groundwork for W2.4b, where the image is built once by continuous integration and only pulled on the server.

**No Node in the runtime image.** A test asserts that the runtime stage mentions no Node, pnpm, npm or corepack at all.

**The image proves itself.** The last stage runs `nginx -t`. A configuration NGINX rejects, or a missing njs module, fails the build instead of the deployment.

**The njs module is a hard requirement.** The language decision is an algorithm, not a pattern match, so `apk add nginx-module-njs` is part of the image. Without it NGINX refuses to start, which is exactly why the build tests the configuration.

**Base images are pinned.** `NODE_VERSION` defaults to the repository's own `.node-version`, so the image and continuous integration build with the same Node; a test asserts those two agree. `NGINX_VERSION` is pinned to a minor version. Neither follows a moving tag, and no major upgrade happens implicitly.

**The container writes nothing.** Every temporary path and the pid file are under `/tmp`, which the compose file mounts as a tmpfs, so the container runs with a read-only file system, no capabilities and `no-new-privileges`.

**One tag per release.** The image is `koxora-website:<revision>`, never `latest`, so rolling back is naming the previous tag. A test asserts that `latest` appears nowhere.

## 3. Building and verifying it, off the production host

```sh
pnpm install --frozen-lockfile
pnpm website:build            # the emitted site and the generated configuration
pnpm website:nginx            # nginx -t plus 111 assertions over HTTP
pnpm website:container        # the compose file resolves and keeps its properties

# then, on a machine with a Docker daemon
docker compose -f deploy/website/compose.yaml --project-directory . build
docker image inspect koxora-website:local --format '{{.Size}}'

# beside anything already running, on a different port and under a different name
KOXORA_WEBSITE_CONTAINER=koxora-website-next KOXORA_WEBSITE_PORT=9403 \
  docker compose -f deploy/website/compose.yaml --project-directory . \
  -p koxora-website-next up -d
docker inspect --format '{{.State.Health.Status}}' koxora-website-next
curl -sS -o /dev/null -D - --max-redirs 0 \
  -H 'Accept-Language: de-DE,de;q=0.9' http://127.0.0.1:9403/ | head -5
curl -sS http://127.0.0.1:9403/healthz
docker compose -p koxora-website-next down
```

The first three commands were run for this branch. The Docker commands were **not**: there is no Docker daemon in the development container, so the image has never been built. Treat section 5 as unproven until they have run once.

## 4. What is still needed from the production server

The running installation was created directly on the server and is not in Git. This branch is written from the confirmed architecture, and it deliberately does **not** guess at the parts only the server knows. Before a migration can be planned, these are needed. Secrets must be redacted: variable names are enough, values are not wanted and must not be sent.

```sh
# 1. The Docker project as it exists today
ls -la /opt/koxora-website/
cat /opt/koxora-website/docker-compose.yml 2>/dev/null || cat /opt/koxora-website/compose.yaml
cat /opt/koxora-website/Dockerfile
sed -E 's/=.*/=<redacted>/' /opt/koxora-website/.env 2>/dev/null

# 2. The NGINX configuration and the generator mentioned in the handover
find /opt/koxora-website -maxdepth 3 -name '*.conf' -o -maxdepth 3 -name '*nginx*'
cat /opt/koxora-website/<the nginx configuration files found above>

# 3. How the container actually runs
docker inspect koxora-website --format '{{json .Config}}' | head -c 4000
docker inspect koxora-website --format '{{json .HostConfig.PortBindings}} {{json .Mounts}} {{json .HostConfig.RestartPolicy}}'
docker image inspect "$(docker inspect koxora-website --format '{{.Config.Image}}')" --format '{{.RepoTags}} {{.Config.Labels}}'

# 4. What else runs on the host, so nothing collides
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'

# 5. The public side
apache2ctl -S 2>&1 | head -40
ls /etc/apache2/sites-enabled/
cat /etc/apache2/sites-enabled/*koxora*

# 6. The toolchain the current build used
node -v ; pnpm -v ; docker --version ; docker compose version
```

Two questions cannot be answered by a command: whether Cloudflare proxies `koxora.app` today, and which of the alias domains already have DNS records and certificates.

With those in hand, the next step is a written comparison between the versioned definition and the running one, and only then a migration plan.

## 5. Migration, when it is approved

**Not authorized by this branch, and not to be run before section 4 is answered.** The shape it would take, so it can be reviewed now:

1. Build the image from a reviewed revision, on the server or pulled from a registry, tagged with the revision.
2. Start it beside the running container, under a different name and on `127.0.0.1:9403`, as in section 3.
3. Verify it there: the healthcheck reports healthy, both languages answer, the language negotiation behaves as [the runbook](website-canonical-domains.md) describes, the redirects answer, and `build-info.json` names the expected revision.
4. Point Apache at `9403` for one request, or compare both ports directly, and confirm the answers match the live site.
5. Stop the old container, start the new one on `9402` under the final name, and confirm `https://koxora.app` within seconds.
6. Keep the previous image and the previous `/opt/koxora-website` directory untouched for at least one release, so a rollback needs no rebuild.

Rolling back is `KOXORA_WEBSITE_TAG=<previous revision> docker compose … up -d`, or starting the old container again. Both are one command, and neither needs a build.

The old directory and the old image are not deleted by any of this. Nothing in the compose file touches another container, another network or another port: the project name, the container name and the published port are all explicit and all confined to this service.

## 6. What this branch does not do

- No image was built and no container was run, because there is no Docker daemon in the development environment.
- No migration, no production change, no DNS, Cloudflare or TinyCP change.
- No release automation in this document: that is [the release workflow](website-release.md), which builds the image, tags it immutably, deploys it behind an approval and rolls back on a failed healthcheck.
- No change to the website's content, addresses or behaviour. The image serves exactly what `pnpm website:build` produces.
