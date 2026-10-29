# The contact form, and the endpoint behind it

**Status: implemented for review, 2026-10-25. Nothing is activated.** The endpoint refuses to deliver until `KOXORA_CONTACT_ENABLED` is set, no Apache or TinyCP setting on the production host has been changed, and no SMTP credential exists anywhere in this repository. This is Website W2.2 of [the W2 plan](../platform/website-w2-plan.md), implementing [Issue #30](https://github.com/Koxora-Development/koxora/issues/30), and it follows the Product Owner's decision of 2026-10-25 to use the host's existing PHP-FPM rather than a service of its own — see [ADR 0019](../adr/0019-contact-delivery.md).

Related: [the canonical domains runbook](website-canonical-domains.md). The container and release documents of Website W2.4a and W2.4b are on their own branches and are not linked from here, because a link to a document this branch does not carry is a broken one.

## 1. What a reader sees

A form on `/en/contact/` and `/de/kontakt/`, in the site's own design, in both languages, in light and dark appearance, usable with a keyboard alone and with a screen reader.

| Field    | Required | Bounded at            |
| -------- | -------- | --------------------- |
| Name     | No       | 80 characters         |
| Email    | Yes      | 160 characters        |
| Category | Yes      | One of four published |
| Subject  | Yes      | 3 to 120 characters   |
| Message  | Yes      | 20 to 5000 characters |

The four categories are a general enquiry, feedback, support and a bug report. A security problem is not one of them: the page says so and points at [the security policy](../../SECURITY.md), because a vulnerability does not belong in a form that ends up in an ordinary mailbox.

**It works without JavaScript.** The form is an ordinary `POST`; with scripting it is sent in the background and the answer is announced in place, and without it the browser posts normally and the endpoint redirects to a result page in the reader's own language. The page says which of the two is happening before a reader types anything.

**The mail address stays published.** A reader is never left without a way to make contact if the form is unavailable or they would rather not use it.

**It never claims more than it knows.** The wording is that the message was accepted for delivery, because that is what an SMTP server accepting a message means. Whether the mailbox then received it is not something a website can see, and the page does not pretend otherwise.

## 2. What is in the repository

| Path                                        | Purpose                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/contact/src/index.ts`             | The rules, for the browser: fields, lengths, the address pattern, the spam checks |
| `packages/contact/fixtures/validation.json` | The vectors both implementations are run against                                  |
| `packages/contact/fixtures/contract.json`   | The field limits, generated from the browser module by `pnpm contact:contract`    |
| `apps/contact-php/public/contact.php`       | **The only file a web server may execute**                                        |
| `apps/contact-php/src/`                     | The endpoint: settings, validation, abuse controls, mail                          |
| `apps/contact-php/tests/`                   | 95 PHPUnit cases, including the parity vectors and the cross-worker limit proof   |
| `apps/website/src/pages/contact.tsx`        | The page, the form and the two result pages                                       |
| `apps/website/src/deploy-config.ts`         | Generates the Apache fragment that routes the path to PHP-FPM                     |
| `apps/website/scripts/check-apache.mjs`     | Runs a real Apache with PHP-FPM against the generated fragment                    |

## 3. The ports this endpoint uses

**None.** Apache reaches PHP-FPM over its own socket, so nothing listens on a TCP port for the contact endpoint. `127.0.0.1:9402` stays the website container and `127.0.0.1:9403` is free for the side-by-side verification container of a website release. Website W2.4a tables that allocation in `docs/development/website-container.md`, on its own branch.

## 4. Installing it on the host

**Not authorized by this branch.** These are the steps, written out so they can be reviewed before anybody runs them. Every path below is an example to be confirmed, not a guess to be trusted: steps 1 and 6 ask for the two real values, and without them no contact routing is generated at all.

### Step 1 — Tell us two things only the host knows

```bash
# Where PHP-FPM listens, and which pool answers:
ls -l /run/php/
systemctl status php8.4-fpm --no-pager | head -5
ls /etc/php/8.4/fpm/pool.d/

# Which directory TinyCP uses for this site, so the endpoint can live beside
# it rather than inside it:
apache2ctl -S 2>/dev/null | grep -i koxora
grep -r DocumentRoot /etc/apache2/sites-enabled/*koxora* 2>/dev/null
```

Send the output with nothing redacted except passwords; none of it contains any.

### Step 2 — Put the code outside every document root

```bash
# The endpoint, from a reviewed revision. /opt is outside everything Apache
# serves, which is the point.
sudo mkdir -p /opt/koxora-contact
sudo rsync -a --delete /opt/koxora-website/repo/apps/contact-php/ /opt/koxora-contact/
cd /opt/koxora-contact
sudo composer install --no-dev --no-interaction --optimize-autoloader
sudo chown -R root:www-data /opt/koxora-contact
sudo find /opt/koxora-contact -type d -exec chmod 750 {} \;
sudo find /opt/koxora-contact -type f -exec chmod 640 {} \;
```

`--no-dev` leaves the test tooling and the test-only front controller behind. Nothing in `tests/` is needed to run the endpoint.

### Step 3 — The settings, including the one secret

```bash
sudo install -o root -g www-data -m 640 /dev/null /etc/koxora/contact-config.php
sudoedit /etc/koxora/contact-config.php
```

```php
<?php
// Readable by the web server account and by nobody else. Outside every
// document root, so no web server can serve it whatever happens to a rule.
return [
    // Off until a delivery test has actually succeeded. Leave it false for
    // the first install: the form then tells a reader honestly that the
    // message was not delivered, rather than claiming it was.
    'KOXORA_CONTACT_ENABLED' => 'false',
    'KOXORA_CONTACT_ALLOWED_ORIGINS' => 'https://koxora.app',
    'KOXORA_CONTACT_RECIPIENT' => '<the mailbox that should receive messages>',
    'KOXORA_CONTACT_SENDER' => '<the address the website sends as>',
    'KOXORA_CONTACT_SMTP_HOST' => '<the Mailcow host>',
    'KOXORA_CONTACT_SMTP_PORT' => '465',
    'KOXORA_CONTACT_SMTP_IMPLICIT_TLS' => 'true',
    'KOXORA_CONTACT_SMTP_USER' => '<the submission account>',
    'KOXORA_CONTACT_SMTP_PASSWORD' => '<its password>',
    'KOXORA_CONTACT_STATE_DIR' => '/var/lib/koxora-contact',
];
```

```bash
# Where the rate-limit counters live. Writable by the web server account and
# readable by nobody else; it holds no address and no message, but it holds
# the salt that makes that true.
sudo install -d -o www-data -g www-data -m 700 /var/lib/koxora-contact
```

### Step 4 — Point the pool at the settings file

In `/etc/php/8.4/fpm/pool.d/<pool>.conf`, or a new pool of its own:

```ini
; The settings file, not the settings. The password never appears in a
; process listing or in this file.
env[KOXORA_CONTACT_CONFIG] = /etc/koxora/contact-config.php
; Only .php may ever be executed by this pool.
security.limit_extensions = .php
```

```bash
sudo php-fpm8.4 -t && sudo systemctl reload php8.4-fpm
```

A separate pool running as its own account is better still, and is the right choice if anything else on this host uses PHP. It costs one more file and makes the endpoint's reach exactly one directory.

### Step 5 — Generate the contact fragment, and only that

```bash
cd /opt/koxora-website/repo
KOXORA_SITE_ORIGIN=https://koxora.app \
KOXORA_SITE_CONTACT_ENDPOINT=/api/contact \
KOXORA_SITE_CONTACT_SCRIPT=/opt/koxora-contact/public/contact.php \
KOXORA_SITE_CONTACT_FPM='unix:/run/php/php8.4-fpm.sock|fcgi://localhost' \
  pnpm website:build
cat apps/website/dist-deploy/apache-koxora-contact.conf
```

**`apache-koxora-contact.conf` is the only file this step installs.** It contains one `ProxyPass` exclusion, one `Alias` and one `<Directory>` block, and **no proxy rule for the website at all** — the reverse proxy to `127.0.0.1:9402` that is already running is not touched, not regenerated and not set up a second time.

The same build also writes `apache-koxora-proxy.conf`. **Do not install that one.** It is the canonical form of the whole virtual host, kept in the repository so the running configuration can be compared against it in review; installing it would duplicate or overwrite a proxy that already works. A test asserts it carries no contact rule, so the two files can never both define the same thing.

### Step 6 — Include it inside the HTTPS virtual host of `koxora.app`

Two rules, and both matter:

**It goes inside one `<VirtualHost>`.** The HTTPS host of `koxora.app`, and nowhere else. It must never be enabled server-wide — not with `a2enconf`, not by a file in `conf-enabled`, not with an `Include` at the top level of `apache2.conf`. A server-wide include applies to **every** virtual host on the machine: `/api/contact` would be aliased on unrelated sites, and anything else sharing that file would leak with it. `pnpm website:apache` now runs two virtual hosts and fails if the second one can reach the endpoint, so this is enforced rather than merely asked for.

**It goes before that host's `ProxyPass /` line.** The first matching `ProxyPass` wins, so an exclusion placed after the catch-all never fires and every submission would reach the static website container instead of PHP.

Use whichever of these TinyCP offers, in this order of preference:

1. **TinyCP's own "custom configuration" field for this site**, if it has one, with the fragment pasted at the start of it. TinyCP keeps ownership of the file it generates, and the content is inside the host it belongs to.
2. **An `IncludeOptional` that TinyCP's generated host already contains**, if there is one inside the `<VirtualHost>`: drop the fragment into that directory. Confirm with `apache2ctl -S` and by reading the generated host that the include really is inside the virtual host and before its proxy rules.
3. **Ask the Product Owner**, if neither exists. There is deliberately no third option here any more: the earlier draft of this document offered a server-wide `a2enconf` fallback, and that is unsafe for the reason above.

Whichever route applies, never edit a TinyCP-generated virtual host in a way TinyCP will overwrite, and never replace one wholesale.

```bash
sudo a2enmod proxy_fcgi alias
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Then confirm the include landed where it should, and only there:

```bash
# The fragment must appear inside the koxora.app HTTPS host and in no other.
sudo apache2ctl -S
sudo apache2ctl -t -D DUMP_INCLUDES 2>/dev/null | grep -i contact
# Nothing may be enabled server-wide:
ls /etc/apache2/conf-enabled/ | grep -i koxora   # must print nothing
```

### Step 7 — Verify, before switching delivery on

```bash
# Routing reaches PHP and not the website container. Only the endpoint
# answers 405 with an Allow header; the container would answer 404 as HTML.
curl -sS -i https://koxora.app/api/contact | head -3

# The server validates independently of the browser.
curl -sS -X POST https://koxora.app/api/contact \
  -H 'Content-Type: application/json' -H 'Origin: https://koxora.app' \
  -d '{"email":"nope","category":"invoice","subject":"Hi","message":"Short."}'
# -> 400 {"status":"invalid","errors":[...four of them...]}

# Nothing else in that directory is reachable.
curl -sS -o /dev/null -w '%{http_code}\n' https://koxora.app/api/contact/../src/Config.php
curl -sS -o /dev/null -w '%{http_code}\n' https://koxora.app/api/contact/
# -> neither may return 200 with any PHP source

# Every other address still reaches the website.
curl -sS -o /dev/null -w '%{http_code}\n' https://koxora.app/en/
```

ACME, mail autodiscovery and every other site on the host are untouched by all of this: the fragment lives inside one virtual host and adds no rule that matches their paths. Confirm it rather than assume it:

```bash
# The reverse proxy to the container still answers, and was not set up twice.
sudo apache2ctl -S | head -20
grep -c 'ProxyPass / ' /etc/apache2/sites-enabled/*koxora* 2>/dev/null   # expect 1

# Certificate issuance and mail autodiscovery still bypass the proxy.
curl -sS -o /dev/null -w '%{http_code}\n' https://koxora.app/.well-known/acme-challenge/probe
curl -sS -o /dev/null -w '%{http_code}\n' https://koxora.app/.well-known/autoconfig/mail/config-v1.1.xml

# And every other site on this host still serves its own content, with no
# contact endpoint of its own. Run this for each one. None may answer 405
# with an Allow header: that would mean the fragment was enabled
# server-wide after all.
for host in <other sites on this machine>; do
  curl -sS -o /dev/null -w "$host %{http_code}\n" "https://$host/api/contact"
done
```

### Step 8 — Switch delivery on, once a test message has actually arrived

Set `KOXORA_CONTACT_ENABLED` to `true`, reload the pool, send one message through the form, and **confirm it arrived in the mailbox**. Until that has happened the endpoint should stay off: an endpoint that accepts and loses messages is worse than one that says it cannot deliver.

Also confirm, at the mail provider rather than here: that the sender address is allowed to submit, that SPF and DKIM cover it, and that a reply to the reader's address actually leaves.

## 5. How it defends itself

| Against                       | How                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header injection              | Every single-line field is refused, not rewritten, when it contains anything that could end a header line. The subject and both addresses are checked before use                                        |
| Sending as somebody else      | The reader's address becomes `Reply-To`. `From` is the configured address and nothing else can set it                                                                                                   |
| A command line                | The transport is constructed in code, never from a DSN, so no setting can select a `sendmail` transport. PHP's `mail()` appears nowhere; a test asserts both                                            |
| Talking in the clear          | TLS is required rather than preferred, the certificate is verified, and TLS 1.2 is the oldest accepted version                                                                                          |
| A cross-site submission       | A foreign `Origin` is refused, and so is a foreign `Referer` when no `Origin` is sent. A request with neither is accepted, because the endpoint has no cookie or session for a forged request to borrow |
| A flood                       | Three submissions per address per hour and sixty for the endpoint, in a window shared by every PHP-FPM worker under a lock. A busy endpoint does not spend a reader's allowance                         |
| A robot                       | A field a person never sees, and a fill time shorter than a person can type. Neither is applied to a reader without JavaScript, who has no timestamp                                                    |
| A double submission           | A one-way fingerprint for a few minutes, so a second press of the button is the same message. A failed delivery forgets it, so a retry is a retry                                                       |
| A large request               | Refused at 16 KB, before the body is read                                                                                                                                                               |
| An open redirect              | The result pages come from configuration and a fixed table. A `locale` in the request may choose between two known pages and can name nothing else                                                      |
| Reading the endpoint's source | One file is web reachable, the directory is denied, the handler is scoped to that directory, and the code, settings and dependencies are outside every document root                                    |

## 6. What it stores, and for how long

| What                                            | Where                      | How long                                    |
| ----------------------------------------------- | -------------------------- | ------------------------------------------- |
| A salted one-way value derived from the address | The state file             | Pruned to the rate-limit window, one hour   |
| A one-way fingerprint of a submission           | The state file             | Pruned to the duplicate window, ten minutes |
| A salt, so neither can be reversed              | The state file's directory | Until deleted; delete it to break the link  |
| The outcome, the category and a duration        | The server log             | Whatever the host keeps logs for            |

No message, no name, no address and no network address is written anywhere. A unit test asserts the log entry contains none of them, and another asserts the state file contains no address.

The privacy policy describes this, in both languages, and only when an endpoint is configured.

## 7. Working on it

```bash
cd apps/contact-php && composer install   # once
composer lint                             # php -l over every file
vendor/bin/phpunit                        # 95 cases
cd ../.. && pnpm contact:contract         # after changing a field limit
pnpm test                                 # the browser side of the rules
pnpm website:apache                       # real Apache, real PHP-FPM
pnpm test:website                          # the form, against the real endpoint
```

The browser tests submit the form to the real endpoint, started by `apps/contact-php/tests/server.php`. That file replaces exactly one thing — handing the message to a mail server — and lives in `tests/` because `public/` holds one file and nothing else.

## 8. What has not been verified

| Claim                                                                       | Status                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The generated Apache fragment is accepted and routes correctly              | **Verified.** `pnpm website:apache` runs a real Apache 2.4 with PHP-FPM: 32 checks pass                                                                                                   |
| The fragment cannot leak to another virtual host                            | **Verified.** The check serves two virtual hosts and fails if the second one can reach the endpoint. Including it server-wide instead, as the removed `a2enconf` route did, makes it fail |
| The server validates exactly as the browser does                            | **Verified.** The same vectors run against both implementations                                                                                                                           |
| The rate limit holds across workers                                         | **Verified.** Eight real processes, exactly three admitted                                                                                                                                |
| The form works with and without JavaScript                                  | **Verified.** 383 browser tests across desktop, tablet and phone                                                                                                                          |
| It runs on PHP 8.4                                                          | **Verified in continuous integration only.** This development container has PHP 8.3; the code targets 8.2 and newer and CI runs the suite on 8.4                                          |
| Apache **on the production host**, with TinyCP's own generated virtual host | **Not verified.** The local Apache is a clean one built for the check, not TinyCP's. Step 6 is the open question                                                                          |
| A message actually arrives in the mailbox                                   | **Not verified, and cannot be from here.** No SMTP credential exists; step 8 is where this is settled                                                                                     |
| SPF, DKIM and reply deliverability                                          | **Not verified.** A question for the mail provider                                                                                                                                        |
