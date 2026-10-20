# Email architecture and mailserver

The authoritative plan is [the email plan](../email-plan.md). This entry point makes it discoverable from platform documentation.

The application must not hold mailserver administration rights. Transactional sending, bounce handling, support intake, and provider/recovery contacts are separate trust boundaries requiring scoped SMTP identities or separate receiving routes. No mailbox, DNS, or mailserver setup is authorized by Phase 0.
