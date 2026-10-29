# Website container

The Koxora marketing website as it already runs in production: NGINX in a
container, reachable only at `127.0.0.1:9402`, with the public Apache in front
of it. These files version that arrangement; they do not change it.

| File           | What it is                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `Dockerfile`   | Two stages: render the static site with Node and pnpm, then serve it from NGINX with no Node present |
| `compose.yaml` | One service, loopback only, read-only file system, healthcheck, bounded logs                         |

Build and verify, from the repository root:

```sh
pnpm website:build       # the site and the generated NGINX configuration
pnpm website:nginx       # nginx -t plus assertions over HTTP, needs nginx + njs
pnpm website:container   # resolves the compose file, needs no daemon
docker compose -f deploy/website/compose.yaml --project-directory . build
```

The image installs the NGINX njs module, because the language decision is an
algorithm rather than a pattern match, and the build runs `nginx -t` so a
rejected configuration fails the build instead of a deployment.

Three things the build decides rather than inherits, all of them after a
production problem. The published files get `0644` and their directories
`0755`, because `COPY` keeps the modes of the tree an image was built from and
an unprivileged server answers 403 for a file it cannot read — one address at a
time. A published file the worker could not read **fails the build**, naming
the file. And the server runs as the `nginx` account, not with a root master
process: a root master chowns its temporary directories to the worker, which
needs `CAP_CHOWN`, and under the compose file's `cap_drop: ALL` the container
did not start at all.

`pnpm website:container` resolves the compose file and then, where a Docker
daemon is reachable, builds the image, runs it with the same confinement and
asks it for every address the emitted pages reference.
`KOXORA_WEBSITE_IMAGE=<tag>` points it at an image that is already built.

Changing `NGINX_VERSION` across a major version is a separate, tested decision.
`NODE_VERSION` must stay equal to `.node-version`; a test asserts it.

The full operator document, including what is still needed from the production
server and what a migration would look like, is
[docs/development/website-container.md](../../docs/development/website-container.md).
