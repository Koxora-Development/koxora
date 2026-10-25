# The contact form and its delivery service

**Status: implemented for review, 2026-10-25. Nothing is active. No SMTP account was requested, configured or used, no mail was sent, and no deployment was performed.** This is Website W2.2 of [the W2 plan](../platform/website-w2-plan.md) and covers [Issue #30](https://github.com/Koxora-Development/koxora/issues/30). The architecture decision is [ADR 0018](../adr/0018-contact-delivery.md).

The form is **off by default**. A build without a configured endpoint renders no form at all and shows the published address instead, so merging this cannot switch anything on.

## 1. The shape of it

```text
packages/contact/            the field specification and the rules, used by both sides
apps/contact-api/            the delivery service: configuration, limits, mailer, HTTP
apps/website/src/pages/contact.tsx    the page, the form and the two result pages
apps/website/src/content/contact.ts   what the form adds to the content security policy
deploy/contact/              the image and the compose definition
```

A reader's submission takes one of two paths, and both end at the same mailbox:

| Reader             | Path                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| With JavaScript    | The script validates with the shared rules, posts JSON to the endpoint, and shows the answer in a live region without leaving the page |
| Without JavaScript | The browser posts the form, the service answers with a redirect to a localized result page that says what happened                     |

The published email address stays on the page in both cases. It is the documented fallback and it is tested.

## 2. What the service does, and refuses to do

**It validates everything again.** The browser's validation is a convenience for the reader, never a control. The service runs the same rules from `@koxora/contact` on its own.

**It never builds a header from unchecked input.** A line ending or a control character in the name, the address or the subject is refused rather than stripped, so a reader is never told their message was sent as typed when it was rewritten. The address a reader gives becomes a `Reply-To`; the `From` is the configured sender. Sending as the reader would be a forgery mail providers reject, and it would make the mailbox a relay for any address anyone types.

**It stores nothing.** No database, no queue, no copy of a message. For a few minutes it keeps a one-way fingerprint of a submission, so a double press is not a second message, and a one-way value derived from the network address with a salt generated at startup, so a flood can be stopped. Both are in memory and disappear with the process.

**Its log holds no personal data.** One line per submission: the time, the outcome and the chosen category. A test asserts that the address, the name, the subject, the message and the network address appear in no log line.

**It tells a client nothing it does not need.** A mail server's error text can name hosts, mailboxes and policies; the response says `undelivered` and the reason stays in the log.

**It refuses to start without its settings.** A missing mailbox, origin or SMTP setting stops the process with a message naming it, rather than starting something that answers and cannot deliver.

| Answer                    | When                                                        | What the reader is told                       |
| ------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| 200 `accepted`            | The mail server took the message                            | Accepted for delivery — never "delivered"     |
| 200 `accepted, duplicate` | The same message was already accepted                       | It was not sent a second time                 |
| 400 `invalid`             | Validation failed, with the list of fields                  | Each field is marked, with the reason         |
| 400 `rejected`            | The hidden field was filled, or it was faster than a person | Reload and try again                          |
| 429 `rateLimited`         | The per-client or the global allowance is spent             | Wait, or write directly to the address        |
| 503 `undelivered`         | The mail server did not take it                             | Nothing was sent; try again or write directly |
| 413 / 415 / 405 / 403     | Too large, wrong type, wrong method, wrong origin           | —                                             |

## 3. Abuse controls, without a third party

No captcha. A captcha service would be a third party, a privacy disclosure and a widened policy, and it is a decision for the Product Owner rather than a default. What is there instead:

- A field a reader never sees, hidden from assistive technology, out of the tab order and out of autofill.
- A minimum fill time. A submission faster than a person could type is refused. A missing timestamp is held against nobody, because a reader without JavaScript has none.
- A per-client sliding window (three an hour by default) and a global one (sixty an hour), both counted **before** any work, so a flood costs a hash and nothing else.
- A hard body limit, refused rather than buffered, and a strict content type.
- Origin checking: a submission whose `Origin` names another site is refused. A request with no `Origin` is accepted, because the endpoint borrows no cookie and no session, so there is nothing for a forged request to use, and refusing it would lock out readers whose browser withholds the header.

## 4. The content security policy

The reviewed policy forbids both submitting a form and opening a connection: `form-action 'none'` and `connect-src 'none'`. That is correct for a site with no form and it would have broken this one silently — the browser blocks the submission and the reader sees nothing happen.

The policy is therefore widened by exactly the address the form posts to, and only when one is configured. A deployment without a service keeps the stricter policy, because it renders no form either. Both directives are widened together: a submission without JavaScript is a form action, one with JavaScript is a connection, and allowing only one would break half the readers.

## 5. Running it

The settings, all from the environment, none with a guessed default:

| Variable                                          | Meaning                                                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KOXORA_CONTACT_ALLOWED_ORIGINS`                  | The site origin a submission must come from                                                                                                                 |
| `KOXORA_CONTACT_RECIPIENT`                        | The mailbox that receives the messages                                                                                                                      |
| `KOXORA_CONTACT_SENDER`                           | The address the service sends as; never a reader's                                                                                                          |
| `KOXORA_CONTACT_SMTP_HOST`, `…_PORT`, `…_SECURE`  | The mail server. TLS is required: on a port that starts in the clear, STARTTLS is mandatory rather than opportunistic, because the credentials travel on it |
| `KOXORA_CONTACT_SMTP_USER`, `…_PASSWORD`          | The SMTP account. **Server side only**, never in the repository, never in an image, never in a frontend bundle                                              |
| `KOXORA_CONTACT_RATE_PER_CLIENT`, `…_RATE_GLOBAL` | The allowances                                                                                                                                              |
| `KOXORA_CONTACT_TRUST_PROXY`                      | `true` only where a known proxy sets the forwarded address                                                                                                  |

On the website side, one variable decides whether a form exists at all:

```sh
KOXORA_SITE_CONTACT_ENDPOINT=/api/contact pnpm website:build
```

With it set, the build renders the form, widens the policy by that address, and adds the route to the generated Apache fragment so the path reaches the service rather than the website container. Without it, none of that happens.

```sh
# Build and start the service, with the settings in a file the operator keeps
# outside this repository.
docker compose -f deploy/contact/compose.yaml --project-directory . \
  --env-file /opt/koxora-website/contact.env build
docker compose -f deploy/contact/compose.yaml --project-directory . \
  --env-file /opt/koxora-website/contact.env up -d
docker inspect --format '{{.State.Health.Status}}' koxora-contact
curl -sS http://127.0.0.1:9403/api/contact/health
```

The compose file names every required setting as a variable with no default, so `docker compose config` fails with the name of what is missing rather than starting something half-configured.

## 6. Activation, which is a separate decision

In order, and none of it done:

1. **Confirm the mailbox receives.** `support@koxora.app` is listed as provisioned but untested in [the legal review checklist](../legal/website-legal-review.md). Send and receive a test mail by hand first.
2. **Decide the sending identity.** A separate address such as `website@koxora.app` is better than sending as the support mailbox, because a bounce then goes somewhere that is not the inbox being read.
3. **Create the SMTP account** at the mail provider, with permission to send as that address and nothing else. Its password goes into the environment file on the host, readable by root only, and nowhere else. **Do not send it to this session or put it in the repository.**
4. **Check the provider's sending policy**: whether the account may send to its own domain from the host's address, what rate it allows, and what happens on a rejection.
5. **Confirm SPF and DKIM** cover the sending address, or the mail lands in spam. This is a DNS matter and a separate assignment.
6. **Start the service and test it from outside**, through Apache, over HTTPS, in both languages, with JavaScript and without.
7. **Then** rebuild the website with `KOXORA_SITE_CONTACT_ENDPOINT` set. Until that build is deployed, no form is shown, so the service can be running and verified while the site still shows the address.
8. **Check the privacy policy renders the form paragraphs**, which it does only when the endpoint is configured, and have the wording reviewed.

Switching it off is the reverse: rebuild without the variable. The form disappears, the policy tightens again, and the address stays.

## 7. What is deliberately not in this version

- **No queue and no retry.** A mail outage tells the reader the message was not handed over, instead of claiming it was sent and losing it. Retry needs storage, and storage needs a retention decision; it is written down as an option, not built.
- **No attachments.** The issue asks for none in the first implementation, and accepting files would change the security picture entirely.
- **No captcha.** See section 3.
- **No delivery observability beyond the log line.** Whether a message reached the mailbox is not visible to the service, and the reader is never told otherwise.

## 8. Verification

Run in the development container on 2026-10-25:

| Command                                                | Result                                                                                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                           | Passes. **367 unit tests in 28 files**: 19 for the shared rules, 34 for the service and its configuration, 11 for its container, 2 against the real mail library, 6 for the policy widening |
| `pnpm audit --audit-level high`                        | Passes. The mail library is pinned to 10.2.1; 7.x carried five high advisories, which [the dependency review](dependencies.md) records                                                      |
| `pnpm test:website`                                    | **383 passed, 7 skipped** across desktop, tablet and phone, including 18 contact cases per project                                                                                          |
| `pnpm website:build`                                   | Passes with and without the endpoint; the policy and the Apache route follow it                                                                                                             |
| `docker compose -f deploy/contact/compose.yaml config` | Fails by design without the settings, naming each one; resolves with them                                                                                                                   |

The security-relevant cases are tests, not claims: header injection refused in every field a header is built from, a body that is not an object refused, a prototype key ignored, an oversized body refused without buffering, a cross-origin submission refused, a request with no origin accepted, the hidden field and the fill time enforced, an allowance counted before any work, a failed delivery never remembered as a duplicate so the reader can retry, a mail server's error text never reaching the client, and no personal data in any log line.

**No mail was sent and no SMTP account was used.** Two tests do open a connection — to a local port nothing listens on — to prove that the real mail library reports a failure as a failure rather than throwing, and that the mail server's own words never escape into a result a client would see. Every test replaces the mailer, and the browser tests submit against a stand-in that answers with the same shapes and sends nothing. The real SMTP path — a connection, a credential, a provider's policy — is unproven until step 6 above runs against real settings.

Also not done: no Docker image was built, because there is no Docker daemon in this environment, so the image, the healthcheck and the read-only file system are unproven. No Lighthouse measurement and no screen-reader audit. Only Chromium was available, so Firefox and WebKit were not run.
