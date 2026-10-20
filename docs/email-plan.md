# Planned email structure for @koxora.app

**Status: planning only; no address, DNS record, delivery path, or mailbox has been established or verified by Phase 0.** The planning source reports an existing self-hosted mailserver and names Mailcow as the previously used platform. Its current software, domains, configuration, and availability for Koxora have not been inspected.

## Goal and proposed roles

Use few managed mailboxes, explicit roles, and least privilege. Proposal O-009 recommends `contact@` as the public primary mailbox; it is not yet an operational contact.

| Address | Purpose | Proposed route | Timing/notes |
| --- | --- | --- | --- |
| contact@koxora.app | General project, website, GitHub public contact | One monitored primary mailbox | Before publishing contact details |
| hello@koxora.app | User/community contact | Alias to contact | Optional branding |
| info@koxora.app | General questions | Alias to contact | Avoid duplicate mailboxes |
| support@koxora.app | Help and tickets | Initially alias to contact | Separate ticketing later |
| security@koxora.app | Confidential security reports | Separate restricted intake recommended | Test before publishing as a reporting route |
| privacy@koxora.app | Privacy requests | Restricted designated recipient | Before external user data processing |
| legal@koxora.app | Contracts and legal matters | Designated recipient | No implied SLA |
| business@koxora.app | Partnerships/enterprise | Alias to contact | Possible CRM later |
| billing@koxora.app | Invoices/subscriptions | Separate route later | Before paid operation |
| admin@koxora.app | Provider/organization/recovery notices | Protected internal mailbox or alias | Verify before use for account recovery |
| github@koxora.app | Optional GitHub notifications | Internal alias to admin | Personal accounts remain individual identities |
| postmaster@koxora.app | Delivery problems and mail administration | Actual mail administrator | Reachable during live domain operation |
| abuse@koxora.app | Abuse reports | Monitored operations contact | Before public uploads/operation |
| notifications@koxora.app | Automated product messages | Separate scoped SMTP identity when needed | Replies to verified support/contact route |
| noreply@koxora.app | Optional no-reply sender | Not needed initially | Never the sole path for important messages |
| bounces@koxora.app | Automated delivery failures | Machine-processed intake | Avoid flooding general contact |

An alias is not a login and has no shared password. People use individual accounts/delegated access. Define real recipients, substitutes, access rights, monitoring, retention, deletion, and backups before setup. Shared routing does not erase the distinction between public roles.

## Confirmed and open

The archive records the registered domain and existing mailserver. Contact-mailbox choice, aliases, owners, backups, MX/SPF/DKIM/DMARC, DMARC reporting, sending/bounce services, and privacy retention remain proposals or unverified configuration. Preserve personal GitHub identities; a contact mailbox does not automatically own or administer the organization.

## Safety and operation

- Restrict security/recovery messages to authorized people. Plan passkeys/MFA and recovery codes as supported.
- Maintain independent emergency recovery so a mail outage cannot lock all administrative access.
- No catch-all by default; assign role addresses deliberately and prevent backscatter/abuse.
- Separate scoped SMTP credentials, rate limits, queues/retries, and sending purpose. The application gets no mailserver administration privileges.
- Handle replies/bounces actively. Never treat unmonitored no-reply as support.
- Keep secrets outside Git and logs. Do not invent response-time promises.
- Test incoming/outgoing/reply/bounce paths, external delivery, access separation, backup/recovery, SPF/DKIM/DMARC, and TLS before activation.
- Publish addresses in legal/security/contact surfaces only after reachability and ownership are verified.
- A separate transactional subdomain needs its own DNS/reputation evaluation and authorization.

## Separate operations assignment

1. Inventory actual operators, existing mailboxes, and server features/configuration.
2. Approve addresses/routes and assign owners/substitutes for contact, security, postmaster, and abuse.
3. Inspect existing DNS/authentication and prepare exact changes only under separate explicit authorization.
4. Record delivery, authentication, reply, bounce, access-control, and recovery tests.
5. Publish working contacts only after those checks.

No DNS values or server commands are prescribed here. This plan does not prove deliverability or legal completeness. See [security reporting](../SECURITY.md).
