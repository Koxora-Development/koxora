# Architecture Decision Records

Record concrete technical decisions after reproducible experiments. Product decisions belong in the [decision register](../decisions.md). A named candidate is not an accepted decision.

Use `NNNN-short-title.md` with: Status; Context/problem; Options; Decision; Rationale; Consequences/risks; Verification evidence; Date/responsible roles; Links to relevant requirement and decision IDs. Write the record in English.

Initial topics: license/open-core boundaries, canvas engine, schema/commands, local-first storage, native extension/versioning, backend/website, CRDT conflict boundaries, export sandbox, key security, plugin permissions, E2EE/search, and internationalization implementation. Numbered ADR topics in the SAD are proposals; no accepted ADR exists yet.

- [0014: Portable viewport core and replaceable SVG canvas](0014-interactive-canvas.md) — proposed with Phase 2.2, pending Product Owner review.

- [0015: Portable basic elements and connection editing](0015-shapes-text-connections.md) — Phase 2.3 implementation, pending Product Owner review.

- [0016: Interactive editing and bounded command history](0016-interactive-editing-history.md) — Phase 2.4 implementation, pending Product Owner acceptance.

- [0017: Static multilingual delivery for the public website](0017-public-website-delivery.md) — Website W1 implementation, pending Product Owner acceptance.

- [0018: Workbook pages and structured rich text](0018-workbook-rich-text.md) — Studio Phase 2.5, accepted by the Product Owner and merged in PR #39 on 2026-10-28.

- [0019: Contact delivery through the existing Apache and PHP-FPM](0019-contact-delivery.md) — Website W2.2 implementation, accepted by the Product Owner on 2026-10-25; merge, SMTP settings and activation pending.

### Numbering, so this does not happen again

One sequence, shared by both agents, and a number is taken the moment an ADR file exists on any branch — not when it merges. Before claiming one, check this index **and** the open pull requests of the other agent. Where two have already collided, the one whose branch is not yet visible keeps the number, because the cost of changing it falls on whoever can see what needs changing.
