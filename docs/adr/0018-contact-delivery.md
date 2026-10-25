# ADR 0018: A small own service for contact delivery

- Status: Implementation proposed with Website W2.2; Product Owner acceptance, merge, SMTP settings and production activation pending
- Date: 2026-10-25
- References: [Issue #30](https://github.com/Koxora-Development/koxora/issues/30), [Issue #22](https://github.com/Koxora-Development/koxora/issues/22), [Issue #26](https://github.com/Koxora-Development/koxora/issues/26); SITE requirements; [ADR 0017](0017-public-website-delivery.md)
- Roles: agent implementation; Product Owner acceptance, mailbox and SMTP decision, merge and activation

## Context and alternatives

The website is static HTML behind NGINX in a container, with TinyCP-managed Apache in front. Static files cannot send mail, so a contact form needs something that can. The confirmed infrastructure is a Hetzner host with Docker, Apache and an existing mailbox at the operator's mail provider; the site's own policy forbids third-party embeds, has no analytics and asks for no consent.

| Option                                        | Where the message goes                                        | What it costs                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A hosted form service                         | Through a third party, who becomes a processor                | A processing agreement, a privacy disclosure, a widened content security policy, and a reader's message leaving the operator's infrastructure for no technical reason |
| A function at an edge provider                | Through a second provider not in the confirmed infrastructure | The same processor questions, plus an operational surface nobody asked for                                                                                            |
| A PHP script in the TinyCP Apache             | Directly to the mail server                                   | A PHP runtime in the public web server, mixing the proxy with an application, and a second deployment mechanism outside Docker                                        |
| **A small own service in a second container** | Directly to the existing mailbox over SMTP                    | One more container to operate, and a Node runtime in production for the first time                                                                                    |

## Decision

A separate workspace application, `@koxora/contact-api`, runs in its own container beside the website container, bound to a loopback port, and the public Apache routes the contact path to it before the catch-all that serves the website. It delivers over SMTP to the mailbox the operator already has.

Three things follow from the decision and are not negotiable in the implementation:

**The validation lives in one place.** `@koxora/contact` holds the field specification and the rules. The browser uses it so a reader is told about a mistake without a round trip; the service uses the same code and does not trust the browser's result. A rule cannot be enforced in one and forgotten in the other.

**Accepted is not delivered.** The service reports that the mail server took the message. That is all that can honestly be confirmed from a website, and it is what the reader is told; whether the mailbox then received it is outside what the service can see, and is never claimed.

**Nothing is stored.** No database, no queue, no copy of a message. For a few minutes the service keeps a one-way fingerprint of a submission, so a second press of the button is not a second message, and a one-way value derived from the network address, so a flood can be stopped. Both are in memory only.

## Consequences

Accepted: a Node runtime now exists in production. It is confined — read-only file system, no capabilities, a user that is not root, loopback only, no inbound internet, no data at rest — and it is the smallest surface that can do the job. The alternative was sending a reader's message through a company nobody chose.

Accepted: there is no queue, so a mail outage means the reader is told the message was not handed over, rather than being told it was sent and silently losing it. Retry with persistence is a later option and is written down as such; it would add storage, which is why it is not in the first version.

Accepted: the website build decides whether a form exists. Without `KOXORA_SITE_CONTACT_ENDPOINT` no form is rendered, the stricter content security policy stays, and the page shows the published address instead. A deployment cannot accidentally show a form that posts nowhere.

Rejected consequence: no captcha. The abuse controls are a hidden field, a minimum fill time, a per-client and a global rate limit, and a bounded body. If they prove insufficient, a captcha is a decision with privacy consequences that belongs to the Product Owner, not a default.
