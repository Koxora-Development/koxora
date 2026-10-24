# Website search and content plan

**Status: plan for review, 2026-10-24. Describes intent and the technical state of Website W1; it contains no traffic or ranking prediction.** Requirements come from [Issue #27](https://github.com/Koxora-Development/koxora/issues/27); the implementation is described in [the W1 implementation notes](website-w1.md) and decided in [ADR 0017](../adr/0017-public-website-delivery.md). Relevant requirements: SITE-001, SITE-018, SITE-019.

## 1. Principles

1. Publish what is true. A page that describes a capability says whether it is available, in development or planned, and the definitions are printed on the page.
2. Earn the visit. Every page answers a real question; no page exists only to hold keywords.
3. No tracking for search. No analytics, no advertising network, no third-party font and no embedded widget is added to improve ranking. Any future measurement is assessed separately under [Issue #26](https://github.com/Koxora-Development/koxora/issues/26).
4. One address per page per language, stable over time, with redirects whenever an address changes.

## 2. Technical state in W1

| Requirement | State |
| --- | --- |
| Crawlable HTML without client-side rendering | Implemented; the marketing pages contain their content in the served document |
| Unique title and description per page and language | Implemented and asserted by a test |
| Semantic landmarks and one heading outline per page | Implemented and asserted by a test |
| Canonical address per page and language | Implemented |
| Bidirectional `hreflang` plus `x-default` | Implemented and asserted by a test |
| Language-specific addresses, not cookie-dependent language | Implemented; the language segment is part of the path |
| Sitemap with language alternates and last modification | Implemented at `/sitemap.xml` |
| Robots file pointing at the sitemap | Implemented at `/robots.txt` |
| Staging builds kept out of the index | Implemented; one environment variable emits `noindex` and a disallow-all robots file |
| Correct status codes and redirects | Implemented; permanent redirects for aliases, 404 for unknown addresses |
| Social preview metadata and images | Implemented per language |
| Truthful structured data | Implemented; organisation and website only |
| Responsive images with declared size and lazy loading below the fold | Implemented |
| No third-party request | Implemented and asserted by a test |

## 3. What is deliberately not published

- No `SoftwareApplication`, rating, price, availability, version or download entry, because Koxora has no public release. These become truthful once releases exist, and the download and release pages are already structured for them.
- No search console verification is claimed. Adding the property and submitting the sitemap is an operator task after publication.
- No invented statement about another product. The comparison milestone adds those with sources and check dates.

## 4. Content plan

Koxora is described as a local-first studio for diagrams, mind maps, data visualization and visual collaboration. The vocabulary below is what the pages genuinely answer; it is not a list of phrases to insert.

| Page | Question it answers | Primary vocabulary |
| --- | --- | --- |
| Home | What is Koxora and what can it do today | local-first diagram tool, offline diagrams, mind map software |
| Features | What exactly works, what is coming | shapes, connections, canvas, undo, project files, offline editing |
| Local-first | Where does my data live, what does a server see | local-first, offline, browser storage, portable file, no account |
| Comparison | How does this compare with the tools I know | diagram tool comparison, alternatives, offline alternative |
| Roadmap | Is this project alive and where is it going | development status, roadmap, open development |
| Download | Can I install it | download, desktop application, release channels |
| Documentation | How do I use it | documentation, guides, project format |
| Releases | What changed | changelog, versions, migration notes |
| Legal and privacy | Who runs this and what happens to my data | legal notice, privacy policy, data protection |

## 5. Planned address structure

Addresses that later milestones will add, kept consistent with the W1 route table so that no existing address has to change:

```text
/<language>/compare/<product>/        sourced comparison pages
/<language>/features/<area>/          capability areas once they exist
/<language>/diagrams/<family>/        diagram families once they ship
/<language>/docs/<section>/           documentation sections
/<language>/releases/<version>/       one page per published release
/<language>/download/<platform>/      platform pages once builds are signed
```

Each new page needs its own entry in the route table, both languages, a sitemap entry and, if it replaces an address, a permanent redirect.

## 6. Maintenance

| Trigger | Action |
| --- | --- |
| Before every publication | Re-read the status labels against the implementation; correct anything that moved between available, in development and planned |
| Before every publication | Run the website browser tests; they cover metadata, sitemap, redirects and status codes |
| When an address changes | Add the redirect in the route table in the same change, never afterwards |
| Quarterly | Re-check the comparison statements and their check dates once the comparison milestone exists |
| After publication | Submit the sitemap once, then only when the structure changes |

Report only measured results. No statement about ranking, traffic or visibility belongs in this repository unless it comes from a measurement that can be reproduced.
