# ADR 0018: Contact delivery through the existing Apache and PHP-FPM

- Status: Accepted by the Product Owner on 2026-10-25 and implemented with Website W2.2; merge, SMTP settings and production activation pending
- Date: 2026-10-25
- Supersedes: the first draft of this decision, which chose a Node service in a container of its own. See [Why that was changed](#why-that-was-changed).
- References: [Issue #30](https://github.com/Koxora-Development/koxora/issues/30), [Issue #22](https://github.com/Koxora-Development/koxora/issues/22), [Issue #26](https://github.com/Koxora-Development/koxora/issues/26); SITE requirements; [ADR 0017](0017-public-website-delivery.md)
- Roles: agent implementation; Product Owner acceptance, mailbox and SMTP decision, merge and activation

## Context and alternatives

The website is static HTML behind NGINX in a container, with TinyCP-managed Apache in front. Static files cannot send mail, so a contact form needs something that can. The confirmed infrastructure is a Hetzner host running Debian 12 with Docker, TinyCP-managed Apache 2 **with PHP 8.4-FPM already available and running**, and an existing mailbox at the operator's mail provider. The site's own policy forbids third-party embeds, has no analytics and asks for no consent.

| Option                                       | Where the message goes                                        | What it costs                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A hosted form service                        | Through a third party, who becomes a processor                | A processing agreement, a privacy disclosure, a widened content security policy, and a reader's message leaving the operator's infrastructure for no technical reason |
| A function at an edge provider               | Through a second provider not in the confirmed infrastructure | The same processor questions, plus an operational surface nobody asked for                                                                                            |
| A Node service in a container of its own     | Directly to the existing mailbox over SMTP                    | A second container, a second loopback port, a Node runtime in production for the first time, and a second release mechanism to operate and roll back                  |
| **A PHP endpoint under the existing Apache** | Directly to the existing mailbox over SMTP                    | PHP in the request path of the public web server, which has to be confined to one file, and a deployment that is a host change rather than an image                   |

## Decision

**One PHP file, reached through one `Alias`, handed to the PHP-FPM pool the host already runs.** The public Apache excludes `/api/contact` from the catch-all that proxies everything else to the website container on `127.0.0.1:9402`, and maps exactly that path onto `apps/contact-php/public/contact.php`. Delivery is authenticated SMTP to the mailbox the operator already has.

Nothing else about the architecture moves. The marketing site stays static NGINX in Docker on `127.0.0.1:9402`, Apache under TinyCP stays the public reverse proxy, no new external port is opened, and no generated TinyCP virtual host is replaced.

Six things follow from the decision and are not negotiable in the implementation:

**The endpoint binds no port.** Apache reaches PHP-FPM over its own socket, so the contact endpoint occupies nothing on the loopback interface. That is what frees `127.0.0.1:9403` for the side-by-side verification container of a website release — a collision the Product Owner found between the two sub-phases while this decision was still the Node one.

**Exactly one file is web reachable.** `public/` holds `contact.php` and nothing else; the code, the settings, the Composer dependencies and the rate-limit state all live outside every document root. The generated Apache fragment denies the whole directory and grants back that one file, and scopes the handler to that directory rather than to the virtual host, so no similarly named file anywhere else on the site is handed to PHP. A test asserts `public/` stays a single file; the real Apache check asserts nothing else in that directory is served.

**The rules are written twice and proven to agree once.** `packages/contact` holds them for the browser, `apps/contact-php/src` holds them for the server, and the server never trusts the browser. "Independently" must not become "differently", so both run the same vectors from `packages/contact/fixtures/validation.json`, and the field limits are generated into `fixtures/contract.json` from the browser module and asserted against the PHP constants. Writing them twice found two real divergences that a shared implementation would have hidden: PHP measures string length in characters where the browser counts the sixteen-bit code units of its own string type, so an emoji counts once on one side and twice on the other; and PHP's `trim` strips five ASCII characters where the browser's strips every Unicode space separator, the no-break space among them.

**The limits are shared between workers, not held in a process.** Under PHP-FPM each request runs in whichever worker is free and workers share no memory, so a counter in a process variable would make "three per hour" mean "three per hour per worker". The counters live in one small file held under an exclusive `flock`, pruned to its window on every write. A test runs eight real processes at once and requires exactly three to pass; with the lock removed, six do.

**Accepted is not delivered.** The endpoint reports that the mail server took the message. That is all that can honestly be confirmed from a website, and it is what the reader is told; whether the mailbox then received it is outside what the endpoint can see, and is never claimed. It is also off by default: until `KOXORA_CONTACT_ENABLED` is set, a valid submission is answered as undelivered rather than silently dropped or falsely confirmed.

**Nothing is stored.** No database, no queue, no copy of a message. For a few minutes the endpoint keeps a one-way fingerprint of a submission, so a second press of the button is not a second message, and a salted one-way value derived from the network address, so a flood can be stopped. Neither can be turned back into an address or a message, and both are pruned to their window.

## Why that was changed

The first version of this decision chose a Node service in a second container, and rejected PHP on three grounds: a PHP runtime in the public web server, mixing the proxy with an application, and a second deployment mechanism outside Docker. The Product Owner's review corrected the premise of the first two: **PHP 8.4-FPM is already installed and running on this host**, so the runtime is not being introduced and Apache is not being given a new role; it already serves PHP for other things. The third ground survives, and is the real cost of this decision — the contact endpoint is deployed as a host change rather than as an image, which is why its activation is a separate, documented, separately approved step and is explicitly not part of the website release pipeline.

What the change bought, beyond the port it freed: one fewer container to operate, monitor and roll back; no Node runtime in production; no second image to build and tag; and an endpoint an operator can read in one directory. What it cost: the deployment is not reproducible from an image, and the two implementations of the rules have to be held together by tests rather than by sharing code.

## Consequences

- An operator installs the endpoint once, as a host change, following [the contact form document](../development/website-contact-form.md). It is not built, tagged or deployed by the website release workflow, and that separation is deliberate.
- Two values come from the host and are never guessed: the absolute path of `contact.php` and the PHP-FPM address. Without both, no contact routing is generated at all, rather than a rule pointing at a path that may not exist.
- The SMTP password lives in a PHP settings file outside every document root, or in the FPM pool's environment. It is never in the repository, never in the built site, and never in a page.
- The form is rendered only where an endpoint is configured, and the content security policy is widened only there, so a deployment without one keeps the stricter policy and shows the mail address instead.
- The mail address stays published as a fallback, so a reader is never left without a way to make contact.
- The two implementations of the rules must be changed together. The contract fixture and the shared vectors fail a build when they are not.
