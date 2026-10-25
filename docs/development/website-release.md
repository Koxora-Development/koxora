# Releasing the website

**Status: prepared for review, 2026-10-25. The pipeline has never run. The environment it needs does not exist, the secrets do not exist, and no deployment has been performed.** This is Website W2.4b of [the W2 plan](../platform/website-w2-plan.md) and covers the website half of [Issue #16](https://github.com/Koxora-Development/koxora/issues/16) and [Issue #22](https://github.com/Koxora-Development/koxora/issues/22).

It depends on [the versioned container](website-container.md): the pipeline builds that image and deploys that container.

## 1. The shape of a release

```text
feature branch  →  pull request  →  checks and review  →  merge to main
                                                              │
                      you dispatch "Website release"  ────────┘
                                                              │
                 build: checks again, build the site, build the image,
                 run the image and ask it for a page, push it under the
                 revision as its tag
                                                              │
                      a reviewer approves the environment  ───┘
                                                              │
                 deploy: pull, start beside the running container on
                 another port, verify, swap, verify again — and put the
                 previous image back if the new one does not answer
```

Two things are deliberate and worth stating plainly:

**A merge does not publish anything.** Merging is a review decision; releasing is a separate one, and nothing on `main` reaches the public host until you dispatch the workflow. A test asserts the workflow has no push, schedule or release trigger.

**Building and deploying are separate.** The dispatch has a `deploy` input that defaults to **false**, so an image can be built and inspected without touching the host. The deployment job additionally waits in a protected environment.

## 2. The one-time setup, which only you can do

None of this exists yet. The deployment job checks for it and stops at its first step with a message naming what is missing, rather than doing half a release.

### The environment

In the repository settings, create an environment named **`website-production`** and add **required reviewers**. That is the release gate: the deployment job waits there until a named person approves it, and the approval is recorded.

Consider also restricting its deployment branches to `main`.

### The secrets, on that environment and not on the repository

| Secret                | What it is                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `WEBSITE_HOST`        | The host name of the website server                                                      |
| `WEBSITE_USER`        | A **non-root** account on that host that may run `docker` and read `/opt/koxora-website` |
| `WEBSITE_SSH_KEY`     | The private key of that account, generated for this purpose and used for nothing else    |
| `WEBSITE_KNOWN_HOSTS` | The server's public host key, as `ssh-keyscan` prints it                                 |

```sh
# On your machine, not on the server, and not in this repository.
ssh-keygen -t ed25519 -C 'koxora website release' -f ./koxora-release -N ''
ssh-keyscan -t ed25519 <the host>          # the value for WEBSITE_KNOWN_HOSTS

# On the server, for the deployment account only.
cat >> ~deploy/.ssh/authorized_keys <<'KEY'
restrict,command="..." ssh-ed25519 AAAA... koxora website release
KEY
```

Three rules about that key:

- **It is never a root key**, and the account it belongs to is not root. The workflow refuses nothing about this by itself; it is a thing you decide when you create the account.
- **It never enters this repository.** A test asserts that no key material, no host name and no address other than the loopback appears in the workflow file.
- **The host key is pinned.** The workflow writes `known_hosts` and connects with `BatchMode=yes`; it never disables host key checking, so a changed DNS answer cannot take the key and the registry token with it.

### The registry

Images go to the GitHub container registry of this repository, under the automatic token, so there is no separate registry credential. The deployment logs in to it on the host with the same short-lived token. If you would rather the host held its own read-only token, that is a one-line change and a note here.

## 3. Dispatching a release

Actions → **Website release** → Run workflow, with:

| Input          | What it does                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `revision`     | The commit on `main` to release. Empty means the current `main`. The build refuses a commit that is not on `main`                                                             |
| `deploy`       | Off by default. Off builds and publishes the image and stops there                                                                                                            |
| `content_date` | The editorial review date, printed on the legal pages and used as the sitemap date and the expiry of the security contact. The build refuses a date more than thirty days old |
| `published`    | `KOXORA_SITE_PUBLISHED`; removes the copy that describes the site as in review                                                                                                |
| `indexable`    | `KOXORA_SITE_INDEXABLE`; `false` for a staging build                                                                                                                          |
| `editor_url`   | The address of the published studio, or empty while there is none                                                                                                             |

The build job, at the revision being released and not at an earlier one: `pnpm check`, `pnpm audit --audit-level high`, the site build with those inputs, `pnpm website:nginx` against a real NGINX with the njs module, and `pnpm website:container`. Then it builds the image, **runs it**, asks it for `/healthz`, for the English home page and for the German language negotiation, and only then pushes it.

The tag is the revision. It is never moved, never reused and never `latest`, which is what makes a rollback a matter of naming the previous one.

## 4. What the deployment does on the host

1. Reads the image the running container is using, so the previous one is known before anything changes.
2. Pulls the new image.
3. Starts it **beside** the running container, on `127.0.0.1:9403`, and asks it for `/healthz` and a page. If it does not become healthy, the container is removed and **nothing is swapped**. Before it starts, the release checks that `9403` is actually free and stops with a named reason if it is not, because a port something else holds cannot verify anything — `9402` is the website Apache proxies to, and the contact endpoint of Website W2.2 binds no port at all because it runs under PHP-FPM. [The port table](website-container.md#loopback-ports-this-host-allocates) is where that allocation is settled.
4. Removes the verification container, stops the old one and starts the new one on `127.0.0.1:9402` with the same confinement the Compose definition uses: read-only, a tmpfs for `/tmp`, no capabilities, `no-new-privileges`, restart unless stopped.
5. Asks the published port for `/healthz`. If it does not answer, it **starts the previous image again** and fails.
6. Back on the runner, asks `https://koxora.app` for the home page, the language negotiation and the sitemap — the public address, not just the container.

Downtime is the few seconds between stopping the old container and the new one answering, and it only happens after the new image has already served a page on the same host.

## 5. Rolling back

```sh
# On the host. The previous image is still there; no build, no registry.
docker rm -f koxora-website
docker run --detach --name koxora-website \
  --restart unless-stopped --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --publish 127.0.0.1:9402:8080 ghcr.io/koxora-development/koxora-website:<previous revision>
curl -fsS http://127.0.0.1:9402/healthz
```

Or dispatch the workflow again with the previous revision and `deploy` on, which rebuilds that revision's image from source.

Keep at least the previous image on the host. `docker image prune` without care is how a rollback stops being one command.

## 6. What this does not do

- **It does not release the studio or the desktop application.** Those have their own releases; a test asserts this workflow mentions neither, and the image, the container and the host port are the website's.
- **It does not release the contact service.** That container has its own definition and its own settings, and it would follow the same shape in a workflow of its own.
- **It does not update anything by itself.** No scheduled run, no watcher on the registry, and no automatic jump to a new base image: `NODE_VERSION` and `NGINX_VERSION` are pinned in the image definition and a major change to either is a tested, separate decision.
- **It has never run.** Everything above is written from the workflow file and from the container definition; the first dispatch will find things this cannot.

## 7. Verification

| Check                              | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The workflow parses as YAML        | Yes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `apps/website/src/release.test.ts` | **20 cases pass**: manual dispatch only, deployment off by default, one release at a time, the protected environment, the pinned host key, every credential a secret and nothing written down, the key removed even on failure, restrictive permissions, the revision as the tag, the release cut from `main`, the checks re-run at that revision, the image run before it is pushed, the verification container before the swap, the rollback path, the published port and confinement, the public check afterwards, the website-only scope, and every action pinned to the same commit the rest of the repository pins |
| `pnpm check`                       | Passes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

**Not verified, and it cannot be from here:** the workflow has never executed. No image was built, nothing was pushed to a registry, no host was connected to, and the rollback path has never run. The first release should be dispatched with `deploy` **off**, so the build, the image and its self-check are proven before anything reaches the host.
