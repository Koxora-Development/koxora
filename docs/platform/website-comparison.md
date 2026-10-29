# The sourced product comparison

**Status: implemented for review, 2026-10-25. Product Owner acceptance, merge and publication are separate decisions and have not been given.** This is Website W2.1 of [the W2 plan](website-w2-plan.md) and covers [Issue #25](https://github.com/Koxora-Development/koxora/issues/25).

It describes what the comparison says, the rule it follows, where the data lives and how it is kept current. The copy itself is in the message catalogue, in English and German; this document is the method behind it.

## 1. The rule

**Every statement about another product links to an official page that says it, and the source list records the date that page was read.** Where no such statement was found, the answer is *not verified* rather than a guess. A comparison that fills its own gaps is advertising.

Six answers are possible, and they are printed on the page itself:

| Answer | Meaning |
| --- | --- |
| Supported | An official page states the capability for what was examined |
| Limited or plan-dependent | Available, but only in a particular plan, edition or situation, which the answer names |
| Not supported | An official page states that it is not available for what was examined |
| Planned | Documented Koxora scope that is not implemented. Never shown as available |
| Details | A question a yes or a no would not answer; the entry describes what was found |
| Not verified | No official statement was found and read for this review. **It does not mean the capability is missing** |

Four rules are enforced by tests rather than by review, in `apps/website/src/content/comparison.test.ts`:

- A claim about another product that asserts something — supported, limited, not supported, or a description — must cite at least one source.
- `planned` may only ever appear in the Koxora column, because using it elsewhere would be a statement about someone else's roadmap.
- Every Koxora answer cites the repository it describes, and the four capabilities that are documented scope but not implemented — collaboration, assistance, integrations and a desktop build — must be `planned`, never `supported`.
- No answer, in either language, may contain wording that asserts objective superiority: *the only*, *best*, *superior*, *unlike every*, and their German equivalents. The test uses letter lookarounds rather than word boundaries, because a word boundary is defined on ASCII letters and would flag the German word *bestätigt*.

Koxora is held to the same rule as everyone else. The column describes the **merged development version** of the public repository, the page says plainly that there is no public release, and a unit test asserts that the sentence saying so is present in both languages.

## 2. What is compared

Ten questions, six products. The questions are grouped so a reader can look at one concern at a time, which is also what the filter offers.

| Group | Questions |
| --- | --- |
| Independence | Works offline · Your work stays on your device · Usable without an account · Desktop application |
| Drawing and files | Diagram types · Import and export |
| Teams and services | Working together · Assistance features · Integrations and extensions |
| Licence and price | Licence and price model |

Products: Koxora, diagrams.net / draw.io, Excalidraw, Lucidchart, Miro, Microsoft Visio. Each is named with what was examined — the pages, plans or builds the answers describe — so a reader can see the scope of the claim.

**Amounts are deliberately not reproduced.** Prices change, differ by region and currency, and are published on pages that are rendered in the browser rather than served as text. The licence row therefore states the model — open source under a named licence, a subscription with a free tier, included in a Microsoft 365 plan — and links to the official pricing page for the rest.

## 3. Credit where it is due

The assignment asks for this explicitly, and two findings matter:

- **draw.io ships a desktop application its makers describe as completely isolated from the internet**, apart from a daily update check that can be switched off, published under the GPL version 3 for Windows, Linux and macOS. On the question Koxora cares most about, draw.io already has a finished answer.
- **Lucidchart offers offline editing in the browser** on every plan, in Chrome, Firefox and Edge, on macOS, Windows and Linux. Anyone claiming that a browser product cannot work offline would be wrong.

Both are in the table, and both are on the respective comparison page before anything is said about Koxora.

## 4. Where the data lives

```text
apps/website/src/content/comparison.ts        products, sources, ten dimensions, sixty claims
apps/website/src/content/comparison.test.ts   the rules above, as tests
apps/website/src/components/comparison.tsx    the table, the filter, the legend, the source list
apps/website/src/pages/compare.tsx            the full comparison
apps/website/src/pages/compare-product.tsx    one page per product, from the same claims
apps/website/src/content/messages/{en,de}.ts  every answer, in both languages
```

A claim exists **once**. The page for a single product renders the same claim objects narrowed to two columns, so the full table and the single-product page cannot disagree.

## 5. Addresses

| Page | English | German |
| --- | --- | --- |
| Full comparison | `/en/compare/` | `/de/vergleich/` |
| Koxora and draw.io | `/en/compare/drawio/` | `/de/vergleich/drawio/` |
| Koxora and Miro | `/en/compare/miro/` | `/de/vergleich/miro/` |
| Koxora and Lucidchart | `/en/compare/lucidchart/` | `/de/vergleich/lucidchart/` |

Each has its own title, description, canonical address and bidirectional `hreflang`, and each is in the sitemap. `/en/compare/diagrams-net/` and `/de/vergleich/diagrams-net/` redirect permanently to the draw.io page, because that is the other name of the same product. A unit test asserts that each product page sits under the comparison address in both languages, so the addresses cannot drift apart from the structure.

## 6. The filter, and reading it without JavaScript

The table is complete HTML. The filter is two groups of ordinary checkboxes in a real fieldset with a legend, and it is **hidden until the enhancement script runs**, because a checkbox that filters nothing is worse than no checkbox. It hides rows by topic group and columns by product, announces what is shown through a live region, and has a reset. The Koxora column cannot be switched off: a comparison needs something to compare against.

On a phone the table is wider than the screen, so it sits in the focusable, named scroll container the legal tables already use, with the question column pinned. Narrowing the products is the better answer on a small screen, which is what the filter is for.

## 7. Keeping it current — the review procedure

Features, plans and prices change, sometimes within weeks. The procedure is deliberately small enough to actually happen:

1. **The review date is in the data.** `comparisonCheckedOn` in `comparison.ts` is printed on every comparison page, in the reader's language. A stale date is visible to every reader, which is the point.
2. **Every source carries its own read date**, shown in the source list. A test asserts that no source claims to have been read after the review date.
3. **Before every release**, re-read each source in the list, correct what changed, and move `comparisonCheckedOn` to the day of that review. If a source cannot be re-read, the claims it backs become *not verified* rather than staying as they are.
4. **At least every three months**, do the same even without a release, so the date on the page never implies more currency than it has.
5. **When a reader reports an error**, the page names the support address for exactly that, and a correction is an ordinary change to `comparison.ts` plus a new review date.
6. **When a Koxora capability merges**, the Koxora column is checked in the same pass as the documentation and the marketing copy, which is the coordination [Issue #29](https://github.com/Koxora-Development/koxora/issues/29) asks for. A capability moves from `planned` to `supported` only once it is merged.

## 8. Trademarks and fairness

Product names and trademarks belong to their owners and are used to identify the products. No logo of another product is used anywhere, no substantial text or screenshot from another product is reproduced, and every outbound link carries `rel="noopener nofollow"` and opens in a new tab. The page states that it is written by the Koxora project and that it does not claim Koxora is better.

## 9. Verification

Run in the development container on 2026-10-25, against this branch:

| Command | Result |
| --- | --- |
| `pnpm check` | Passes. **307 unit tests in 23 files**, 16 of them the comparison rules |
| `pnpm website:build` | Passes. **77 files**, up from 61: six new pages plus their redirect stubs |
| `pnpm test:website` | **329 passed, 7 skipped** across the desktop, tablet and phone projects, including 14 new comparison cases per project |
| `pnpm website:nginx` | 111 checks pass; the new addresses are served and the redirect answers |

The browser cases cover: ten rows and six product columns in both languages; sixty answers each shown as words; the review date and every source's read date; every source link being `https` with `noopener nofollow`; the six-entry legend; the four planned Koxora capabilities being marked planned and never ticked; draw.io's offline strength and Lucidchart's offline wording being present; the filter narrowing rows and columns and announcing what is shown; the Koxora column not being switchable; keyboard operation of the filter; the filter staying hidden and the table staying whole without JavaScript; all six product pages answering with two columns, credit, guidance and sources; the link back to the full comparison in the reader's own language; and the historic draw.io address redirecting.

Limitations: only Chromium was available, so the Firefox and WebKit projects were not run. Four of the sixty answers for draw.io, six for Lucidchart and five for Miro are *not verified*, because the official pages that would settle them are rendered in the browser rather than served as text, or because no single official page states the answer plainly. Those cells say so, and filling them is the next review's work rather than a reason to guess.
