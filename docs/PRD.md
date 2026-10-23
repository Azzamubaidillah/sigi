# Sigi: Product Requirements

**Version:** 0.4, 2026-10-23. **Status:** P1 started 2026-10-22; M1 deployed, M2 built (§11). **Owner:** Azzam Ubaidillah.
**Name:** Sigi. In the KBBI, *sigi* is a torch, and *menyigi* means "to light up" and, figuratively, "to investigate carefully" (D-009). **Hosting:** a subdomain of the owner's site (D-014).
**Companion docs:** [DATA-SOURCES.md](DATA-SOURCES.md) (what data we may use and under which terms), [DECISIONS.md](DECISIONS.md), [ARCHITECTURE.md](ARCHITECTURE.md).
**Confidence labels:** [H] read on a primary source, [M] secondary source or partial read, [L] inference. Claims about third-party terms are not legal advice.

---

## 1. Summary

Sigi is a public research site for Indonesian listed companies. It focuses on four questions the market now has to answer:

- **Who owns the company,** and what changed this month?
- **How much of it actually floats,** and is it on track for the new free-float minimum?
- **How do macro conditions move each sector?**
- **What is the investment thesis,** and what would prove it wrong?

Every figure on the site comes from free, legally reusable data, and every figure shows its source and date.

It launches as a **non-commercial portfolio piece**. It becomes a **product** only after the commercial-readiness gate in §9 passes.

## 2. Why now

| Fact | Source |
|---|---|
| On 2026-10-15 MSCI opened a consultation on moving Indonesia from Emerging to Standalone market status. It cites "persistent opacity in shareholding structures and suspected coordinated trading behavior". Feedback closes 2027-04-30; the decision is due by 2027-06-30 | [MSCI](https://ir.msci.com/news-releases/news-release-details/msci-launches-consultation-proposal-reclassify-indonesia) [H] |
| Since 2026-03-03, IDX and KSEI publish every holder above 1% monthly (previously only above 5%) | [IDX Channel](https://www.idxchannel.com/market-news/beiksei-buka-akses-data-pemegang-saham-di-atas-1-persen-ke-publik) [M] |
| The free-float minimum is rising to 15%. As of 2026-09-30, 358 of 918 listed companies were below it. Deadlines are staged from 2027-03-31 to 2029-03-31 depending on market cap and current float | [IDX Channel](https://www.idxchannel.com/market-news/bei-kejar-358-emiten-yang-belum-penuhi-aturan-free-float), [Kontan](https://investasi.kontan.co.id/news/328-emiten-berjibaku-penuhi-ketentuan-minimal-free-float-15) [M] |

The existing platforms (Stockbit, RTI Business, Invezgo, Sectors.app) already sell screeners, key stats, broker flow and >1% holder lists. Sigi does not compete on those. It competes on investability tracking, ownership change over time, macro-to-sector links, thesis discipline and visible provenance. The market research behind this is kept privately by the owner.

## 3. Users and jobs

| User | Job to be done |
|---|---|
| Retail and semi-professional investors in Indonesia (reading Indonesian or English) | "Who controls this company, and did anything change this month?" "Is it below the float rule, and when is its deadline?" |
| Foreign investors and analysts following the MSCI consultation | "How investable is this market, company by company, in English?" |
| The owner as an analyst | "Write a thesis once, with dated catalysts and explicit invalidation conditions, and see when a condition is hit" |
| Hiring reviewers (portfolio phase) | "Show me a real full-stack plus data system: ingestion, validation, provenance, UI, tests, deployment" |

## 4. Goals and non-goals

**Goals (portfolio phase):**
- **G1:** ownership register for every listed company, with month-over-month changes and concentration.
- **G2:** a float and investability tracker against the 15% rule and the MSCI timeline.
- **G3:** an Indonesian macro dashboard with explicit links to sectors.
- **G4:** theses with dated catalysts, typed invalidation conditions, review dates and version history.
- **G5:** ticker pages that combine our own data with licensed third-party embeds.
- **G6:** provenance on every figure (source, as-of, licence, and an "absent" reason where there is no value).
- **G7:** English and Indonesian.
- **G8:** a daily brief written by an AI agent from Sigi's own data, built the same way as Sunrise's brief: every claim cites evidence or a source, and the web app validates each file before showing it (F12).

**Non-goals:**
- **No portfolio features:** no portfolio, ledger or P&L tracking (the Sunrise ledger features are excluded by design).
- **No trading:** no brokerage, order routing or trading.
- **No calls:** no buy/sell recommendations, signals, target prices or personalised advice (see risk R3).
- **No market microstructure:** no intraday or real-time data, broker summary, "bandarmology" or order book; these need paid data.
- **No paid data or APIs,** and no scraping (D-002, D-003).
- **No reader accounts in the portfolio phase.** Only the owner signs in, to import data and write theses.

## 5. Hard constraints

| ID | Constraint | Consequence |
|---|---|---|
| C1 | **No paid data or API** (owner decision 2026-10-18) | **No stored daily prices.** So no price-based screener of our own, no computed returns, and no automatic check of thesis price levels. Prices, charts, price/fundamental screening and fundamentals *display* come from TradingView widgets, which are display-only (DATA-SOURCES S3) |
| C2 | **No scraping or crawling** of any site whose terms forbid it. The IDX terms forbid it even for non-commercial use | Official files (the monthly 1% PDF, the KSEI monthly holdings file) are **downloaded by hand and uploaded through an admin import page.** Twelve uploads a year per file |
| C3 | **Every public figure has a source, an as-of date and a licence entry** in DATA-SOURCES.md | Data whose terms are unknown stays admin-only until it is cleared |
| C4 | **Non-commercial until the §9 gate passes**: no ads, paywall, paid tier or sponsorship | Monetisation design waits until Phase 3 |
| C5 | **No exchange trademarks** (IDX, BEI, KSEI) in the product name, logo or domain | Naming (D-009) |
| C6 | **Minimise personal data.** The ownership files list individual investors by name | Individuals appear only on the company ownership table, exactly as published, with source. There are no individual "investor profile" pages or cross-company search on individuals until the PDP review in §9 |

## 6. Data in one table

Full terms, quotes and verification status are in [DATA-SOURCES.md](DATA-SOURCES.md).

| Data | Source | Portfolio phase (non-commercial) | Product |
|---|---|---|---|
| Holders above 1%: name, type, local/foreign, shares, % (about 7,300 rows/month, PDF) | IDX announcements (KSEI data) | Allowed with citation [M/L] | Needs written permission from BEI (and KSEI) |
| Local/foreign holdings by 9 investor types, month-end price, shares outstanding (about 3,750 rows/month, pipe-delimited text) | KSEI monthly download | **Admin-only until KSEI's terms are found** | Permission needed |
| Prices, charts, fundamentals, profile, IDX screener, economic calendar, news | TradingView widgets (IDX end-of-day) | Allowed with TradingView attribution | Allowed with attribution (commercial clause to re-check) |
| CPI, GDP and other official statistics | BPS website tables (not the Web API) | Allowed with citation [H] | Allowed with citation [H] |
| BI-Rate, JISDOR, FX reserves | Bank Indonesia website | Show with citation [L] | Permission needed, or replace |
| Coal, palm oil, nickel, gold, other commodities (monthly) | World Bank Pink Sheet (CC BY 4.0) | Allowed with attribution [M] | Allowed with attribution [M] |
| US rates and other global series | FRED (only series in the public domain) | Allowed [M] | Allowed per series [M] |

## 7. Features (portfolio phase)

Each feature lists acceptance criteria. "Absent" means the page shows a typed reason, never a zero or a blank.

### F1. Monthly ownership import (admin)
- Upload the monthly 1% PDF. The file is stored immutably with its SHA-256, size, upload time and the source URL entered by the admin.
- A parser extracts rows into staging tables.
- Validation gates decide every import. Any failure rejects it, any hold waits for the owner's written decision, and only a clean pass publishes on its own (fail-closed):
  - the row count is within the expected band (3,000–15,000) and within 25% of the previous month;
  - every issuer's holder percentages sum to ≤100%, plus half a hundredth per holder for rounding;
  - shares equal scripless plus scrip: 1–5 rows that break this **hold** the month (the publisher's own file has one such row, D-015); more **reject** it;
  - every percentage is in (0, 100];
  - every share code is four letters;
  - investor type is one of the 9 known codes (CP, ID, IB, MF, SC, IS, PF, FD, OT) and local/foreign is L or A, or both are empty together (unclassified scrip, cover-letter note 4);
  - the record date is newer than the last published month, or the owner marks the file as a correction of a published month;
  - a month-over-month check **holds** the month if any issuer's count of holders above 1% changed by more than 5 (a placeholder until a few months of history exist).
- Re-importing the same file is a no-op, unless every earlier run of it was rejected; a rejection can depend on state, so it may be gated again. A corrected file supersedes the old one with an audit row.
- **Acceptance:**
  - the 2026-02-27 file reproduces 7,257 rows, 955 issuers and 5,199 distinct holder names. **Met 2026-10-22.** The independent extraction's 5,226 is inflated by names it garbled (D-016);
  - a corrupted or truncated file never publishes. **Met:** tests cover a truncated file, a lost header, an unplaceable cell, a malformed number and mixed record dates.

### F2. Ticker ownership section
- **Holders table:** name, type, local/foreign, shares, %; individuals shown as published (C6).
- **Month-over-month changes:** new, exited, increased and decreased holders, with deltas.
- **Concentration:** top holder %, top-3 %, HHI.
- **Free float, upper bound** (D-017): 100% minus every holder of 5% or more, rows of one holder added together. This follows the exchange's definition (holders under 5% who are not controllers, affiliates, directors, commissioners, treasury or locked-up shares) as far as the register can see, so the official figure is this bound or lower. "Held below 1%" is shown beside it as a separate figure. *(Changed 2026-10-23: v0.3 used "held below 1%" as the float estimate. That is not the official definition, since holders of 1–5% count as free float, and on the 2026-02-27 file it put 568 companies under 15% against the exchange's 328.)*
- **Register incomplete** (D-019): when the holders above 1% add up to less than 15%, no float figure is given and the page says why.
- **Acceptance:** for a sample of 10 companies, the figures match a hand calculation from the source file. **Met 2026-10-22:** AADI, AALI, ABBA, ACES, ADES, ADHI, BBCA, BMRI, MAYA and TLKM match an independent pdftotext extraction on holder count, top holder, top three, held below 1% and HHI.

### F3. Investability and float tracker
- **Market-wide view:** number of companies by band of the float upper bound; companies certainly below 15%; month-over-month crossings of the 15% line; the timeline of rule deadlines and MSCI dates.
- **Per company:** the bound, whether it is certainly below 15%, and the tranches still possible. The tranche itself needs market cap (see the F5 dependency), so the page shows each possible deadline with its condition.
- **Methodology** (on `/investability`): the definition gap between the bound and the official figure.
- **Acceptance:** our market-wide count is shown next to the exchange's count nearest in date (328 as of 2026-03-31) and its latest (358 of 918 as of 2026-09-30), with the difference explained, and never presented as the official number. **Met 2026-10-23** (M2): 219 companies certainly below 15% on the 2026-02-27 file, a floor on the official count as the definition requires. Cross-check: YUPI's bound is 10.00%; YUPI itself disclosed 10% free float as of 2026-08-31 (Kontan, 2026-10-09).

### F4. Holder explorer (corporates, funds and institutions only)
- Holder pages for non-individual holders: the companies they hold, % held, and month-over-month changes.
- Name normalisation through a reviewed alias table: deterministic, documented and versioned. It never fuzzy-merges automatically (D-018).
- **Acceptance:** each alias decision is a reviewed row with a reason; holder pages for individuals do not exist (C6). **Met 2026-10-23:** 33 reviewed rows from 36 candidate groups; a holder gets a page only if every row published under it carries an institutional type, so individuals and unclassified holders never do. Tests cover both.

### F5. Local/foreign composition (blocked until KSEI's terms are cleared)
- Per ticker: local versus foreign share by the 9 investor types, and month-over-month change.
- Market-wide: the foreign ownership trend.
- The KSEI file's month-end price and share count give a month-end market cap, which F3 needs to assign each company its tranche.
- **Acceptance:** stays admin-only until DATA-SOURCES S2 is cleared. Until then, F3 shows "tranche unknown (market cap unavailable)".

### F6. Macro dashboard (Indonesia)
- A typed series registry. Each series records unit, frequency, transform, source, licence, release calendar and **linked sectors with a written rationale** (e.g. coal → energy; palm oil → plantations; BI-Rate → banks and property; JISDOR → importers and USD-debt issuers).
- Small multiples with latest value, previous value, change and 1-year history. IDX sector index charts appear beside each group via TradingView widgets.
- **Acceptance:**
  - each series shows source, release date, next release date and licence;
  - a series with no data shows an absent reason;
  - published values and our derived values (e.g. year-over-year) are labelled differently.

### F7. Theses (written by the owner in the portfolio phase)
- **Format:** markdown body plus a structured header:
  - tickers and stance (a description, not a recommendation);
  - one-line thesis;
  - dated catalysts;
  - **typed invalidation conditions:**
    - ownership: e.g. "controller sells below X%";
    - float: e.g. "misses the 2027-03-31 tranche";
    - macro threshold: e.g. "BI-Rate above 6.25%";
    - date: e.g. "no catalyst by 2027-06-30";
    - price level, shown as *manual check* because of C1;
  - review date.
- **Status:** Active, Invalidated or Closed. Closing requires a short post-mortem.
- **History:** versions are kept, and the page shows the diff between versions.
- **Daily evaluation:** a worker checks every ownership, float, macro and date condition against our own data and marks it met, not met, or unknown (with the reason). A "conditions hit" list leads the theses page.
- **Acceptance:**
  - a malformed condition block makes the thesis show "conditions unreadable: \<reason\>"; it is never guessed;
  - every thesis page carries the not-investment-advice notice.

### F8. Ticker page
- **Our sections:** ownership (F2), float and tranche (F3), local/foreign (F5 when cleared), theses that mention the ticker (F7), events (float deadline, MSCI dates).
- **TradingView sections,** visually separated and labelled "Data by TradingView": advanced chart, fundamentals, company profile, top stories.
- The ticker list comes from our imports (issuer codes and names in the ownership files), not from scraping.
- **Acceptance:** with any one source missing, the page still renders, and each missing section shows its absent reason.

### F9. Market page
- The IHSG chart (TradingView advanced chart, `IDX:COMPOSITE`), labelled as third-party. Sector index charts are deferred to the macro dashboard (M3), where each sector sits beside the series linked to it.
- The TradingView IDX screener widget, labelled as third-party. It opens on valuation columns rather than "overview", whose technical buy/sell ratings would read as advice next to our content.
- **Our ownership screen**, filtering on our own data: free-float bound, largest holder, holder type, any foreign holder above 1%, holders changed since the previous month, and sorting. Filters are stored in the URL (a plain GET form, so it works without JavaScript).
- **Acceptance:** every one of our screens shows its as-of month and the number of companies that were excluded and why. **Met 2026-10-23:** a float filter excludes registers that are incomplete, and the change filter excludes companies with nothing to compare; each is counted with its reason.

### F10. Data health and provenance
- Per source: last import, file hash, row counts, gate results, licence status, and the next expected publication date.
- A public "sources and licences" page generated from the DATA-SOURCES register.
- **Rebuild check:** re-deriving the published tables from the stored source files gives identical content hashes.
- **Acceptance:** CI runs the rebuild check on fixture files.

### F11. Bilingual UI
- English and Indonesian copy for every page. The data tables keep source spellings.

### F12. Daily brief (Sunrise's mechanism, adapted for a public site)
- **Question it answers:** "What changed in the data Sigi tracks, and what is worth a closer look?" It is *not* "what should I do".
- **Mechanism (same as Sunrise, ARCHITECTURE §8):**
  1. Once a day, a context exporter writes a JSON snapshot of Sigi's own readings. Every citable item has an evidence key.
  2. A sandboxed AI agent with no shell reads that context, yesterday's brief and the theses. It may search the web, and writes exactly one analysis file.
  3. The web app picks the newest analysis that passes validation and whose evidence keys all exist in its own context file. A newer file that fails validation is named next to the brief, with the reason it was rejected; it never blanks the page.
- **Context sections:**
  - ownership changes in the latest published month;
  - float-tracker moves and tranche deadlines within 30 and 90 days;
  - macro releases since yesterday and scheduled this week;
  - thesis conditions met, near, or unknown, and review dates due;
  - the event timeline (e.g. MSCI dates);
  - data health;
  - news headlines matched to tickers with a thesis.
  
  Sections Sigi couldn't build are listed as absent, with a reason.
- **Output fields:**
  - stance: `quiet`, `notable` or `watch`;
  - headline;
  - "look at" items: kind, ticker or topic, reason, evidence keys;
  - changes since yesterday;
  - risks;
  - signals set aside, and why;
  - web sources (links only, for any figure not in the context).
- **Public-safety rules,** enforced in the exporter and the validator, not only in the prompt:
  - The output has no buy/sell/hold fields and no price-target or position-size fields. A recommendation-language check rejects the file if it fails.
  - The context never contains individual holders' names (D-007), so the brief cannot cite them.
  - Web content appears as links plus short factual statements, never quoted articles.
- **Acceptance:**
  - an analysis citing an evidence key that is missing from its context is rejected;
  - a file over the size cap, with a mismatched date, or of the wrong shape is rejected with the reason shown;
  - a brief older than 30 h is marked stale;
  - the page shows the inputs table (each section's as-of time, source and evidence status), like Sunrise's;
  - every brief carries the not-investment-advice notice.

## 8. Phases

| Phase | Scope | Gate to leave the phase |
|---|---|---|
| **P0: Docs** (now) | PRD, data-source register, decisions, architecture | Owner approves this PRD |
| **P1: Portfolio MVP** | F1–F4 and F6–F12 (F5 if cleared); public, non-commercial | §10 metrics met; deployed; repo public |
| **P2: Depth** | Email alerts on thesis conditions; holder graph view; extended history | Owner decision |
| **P3: Product** | Reader accounts, user theses and watchlists, alerts, pricing | **§9 commercial-readiness gate passes** |

## 9. Commercial-readiness gate (all items required before any monetisation, including ads)

1. Written permission from BEI, and from KSEI as the originator, for commercial display of the >1% ownership data; otherwise those surfaces stay non-commercial.
2. Written permission from KSEI for the monthly holdings file, or F5 is removed from commercial surfaces.
3. Bank Indonesia series are permitted in writing, or replaced with permissively licensed sources.
4. TradingView's terms are re-checked for commercial embedding (attribution stays in place).
5. **OJK regulatory check:** a legal opinion that the product, including theses and AI briefs, is not investment advisory that needs a *Penasihat Investasi* licence [L]; disclaimers to match.
6. **Personal data (UU 27/2022 PDP):** a review of republishing individual holder names; a takedown and correction process.
7. Entity, tax and terms of service for users (out of scope here).

**Owner decision 2026-10-19 (D-013): no outreach to BEI, KSEI or BI for now.** So items 1–3 cannot pass yet, and P3 stays blocked until the owner revisits this. The portfolio phase is unaffected: it relies only on non-commercial use with citation.

## 10. Non-functional requirements and portfolio-phase success metrics

- **Correctness:**
  - imports are idempotent, hashed and published fail-closed;
  - the rebuild check passes in CI;
  - zero public figures without a register entry (an automated check fails the build).
- **Quality:**
  - unit and integration tests on parsers and gates, using fixture files;
  - Playwright E2E for every page, green in CI;
  - Lighthouse accessibility ≥90 on every page.
- **Performance:** p95 server response ≤300 ms on the deployed host for our own pages; widgets load lazily.
- **Security:**
  - only the owner can sign in, to import and edit;
  - strict CSP with an explicit allowance for the TradingView widget origins only;
  - uploads are size-limited and type-checked;
  - the brief agent runs as an unprivileged user with no shell, a read allowlist (context, yesterday's brief, theses) and a write allowlist of exactly the analysis folder, as Sunrise's does (ARCHITECTURE §8).
- **Cost:** $0 data. Hosting on existing infrastructure. The brief runs on the owner's existing AI subscription, as Sunrise's does (no new paid API).
- **Coverage at P1 exit:**
  - every issuer in the latest file has an ownership page;
  - at least 2 published months, so month-over-month changes exist;
  - at least 5 macro series per group;
  - at least 3 published theses with typed conditions.

## 11. Milestones and budget (estimates [L])

| Milestone | Scope | Budget |
|---|---|---|
| M1 | F1 import pipeline + F10 data health + F2 ownership section + deploy skeleton. **Built 2026-10-22; deployed 2026-10-23** at https://sigi.ubaidillah.id (Dokploy) | 20 h |
| M2 | F3 tracker + F4 holder explorer + F9 market page. **Built 2026-10-23** | 15 h |
| M3 | F6 macro dashboard | 12 h |
| M4 | F7 theses + condition evaluation | 10 h |
| M5 | F12 daily brief: context exporter, schemas, validator, agent sandbox and schedule, brief page | 8 h |
| M6 | F8 ticker page polish, F11 bilingual, E2E, Lighthouse, public launch on the subdomain | 10 h |

That totals about 75 h. **Kill and re-plan rule:** if M1 takes more than 30 h, re-estimate everything before continuing. **Start date:** 2026-10-22 (owner: "start now").

## 12. Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | The data terms change, or BEI/KSEI object to republication | High | Non-commercial phase; citation on every figure; a takedown process. No permission request for now (D-013) |
| R2 | Personal data in the ownership files | Medium | C6; no individual profiles; PDP review before P3 |
| R3 | Theses read as investment advice | Medium | Stance wording, a disclaimer on every thesis, no target prices; OJK check before P3 |
| R4 | Monthly data makes the site feel static | Medium | Macro releases, thesis condition checks and events give weekly movement; publish an "update" note each month |
| R5 | The PDF layout changes and breaks the parser | Medium | Fail-closed gates; fixture tests per known layout; the admin sees the exact failure |
| R6 | Dependence on TradingView widgets (terms, branding, symbol coverage) | Medium | Widgets are confined to clearly separated slots; our own features never depend on them |
| R7 | Crowded market for commodity features | Low | Not competing there (§2) |
| R8 | Scope creep and a stalled second project | High | Phase gates, hour budgets, the kill rule in §11 |
| R9 | The AI brief states something false or advice-like on a public page | Medium | Evidence-key validation, a recommendation-language check, the stale marker, the rejected-file notice; the owner can unpublish a brief from the admin page |
| R10 | The register omits large holders, so float estimates are overstated (2026-02-27 file: BBRI, BBNI, BBTN, ADHI and NCKL each miss a known controlling holder, while BMRI and TLKM list Danantara) | High | **Mitigated in M2:** a company whose holders above 1% total under 15% gets no float figure, is counted separately on every screen and page, and every such case so far is a known omission (D-019). An omission at a company that still lists more than 15% is not caught; re-check each new month with the low-total list |

## 13. Open questions

Resolved by the owner on 2026-10-19:

| Question | Answer | Recorded as |
|---|---|---|
| Q1, name | Sigi | D-009 |
| Q2, repository | A fresh repository; modules copied from Sunrise | D-011, ARCHITECTURE §7 |
| Q3, AI brief | Same as Sunrise's brief, on the existing subscription; moved into P1 | D-012, F12 |
| Q4, permission emails | Not now | D-013 |
| Q5, hosting | A subdomain of the owner's site | D-014 |

Start date: 2026-10-22. Subdomain: `sigi.ubaidillah.id` (DNS added by the owner, 2026-10-23). Production is kept out of search engines (`X-Robots-Tag: noindex`) until the M6 launch.
