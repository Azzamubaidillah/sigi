# Decisions

Each entry records context, the decision and its consequences. Newest last. Owner decisions are marked as such.

---

## D-001. Public portfolio piece first, product later (owner, 2026-10-18)
**Context:** the owner wants a research site for Indonesian equities, built like Sunrise but without any ledger.
**Decision:** launch publicly and non-commercially. Becoming a product requires the commercial-readiness gate (PRD §9).
**Consequences:** every data source needs a licence entry that covers public display (DATA-SOURCES.md). Monetisation design waits for P3.

## D-002. No paid data or APIs (owner, 2026-10-18)
**Context:** the licensed feeds that would provide daily prices and fundamentals cost money: IDX licences start at Rp2.3M/month plus a deposit, and vendor APIs cost $49 to $399+ a month.
**Decision:** use only free sources.
**Consequences:**
- No stored daily prices, so no price-based screener of our own and no automatic price-level checks on theses.
- Price, chart, fundamentals and screener *display* comes from TradingView widgets (D-004).
- Our own analytics run on ownership, macro and thesis data.

## D-003. No scraping; official files arrive by manual download and admin upload (2026-10-18)
**Context:** the IDX website terms forbid scraping and crawling even for non-commercial use. The ownership files are published monthly.
**Decision:** the owner downloads each monthly file by hand and uploads it through an authenticated import page. No collector touches idx.co.id. KSEI and Bank Indonesia files are handled the same way until their terms are known.
**Consequences:** about 24 manual uploads a year. In return the import page gets fail-closed validation, hashing and an audit trail (PRD F1), which is where the engineering value is.

## D-004. TradingView widgets are the display layer for market data (2026-10-18)
**Context:** TradingView offers free widgets covering IDX end-of-day stocks and indices, with attribution. They are display-only and can't be exported.
**Decision:** embed widgets in clearly labelled, separate slots (chart, fundamentals, profile, screener, calendar, news). Nothing from a widget is read or stored.
**Consequences:** the CSP must allow the TradingView origins. Our features never depend on widget content. We take on the R6 dependency risk.

## D-005. Compete on investability, ownership change, macro links, thesis discipline and provenance (2026-10-18)
**Context:** Stockbit, RTI, Invezgo and Sectors already sell screeners, key stats, broker flow and >1% holder lists.
**Decision:** don't rebuild commodity features. Build F2–F4 and F6–F10 instead.
**Consequences:** the site's own value comes from monthly ownership data plus macro data and theses. Without daily price data this is the only defensible scope under D-002 anyway.

## D-006. Float figures are labelled estimates (2026-10-18)
**Context:** the regulatory free float excludes controllers, affiliates, directors and treasury shares. The >1% register cannot identify all of those.
**Decision:** show "float estimate (holders below 1%)" with a methodology link. Never call it the official free float. Show the official market-wide figures from IDX announcements next to ours.
**Consequences:** the investability tracker is honest about its error margin. A constructed figure is never presented as an observed one (the same rule as Sunrise).

## D-007. Individuals appear only as published, on company pages (2026-10-18)
**Context:** the ownership files list individual investors by name. Indonesia's personal data law (UU 27/2022) applies to processing.
**Decision:** no holder pages, search or cross-company aggregation for individuals until a PDP review (PRD §9 item 6). Corporates, funds and institutions get holder pages.
**Consequences:** the holder explorer (F4) excludes investor type `ID`.

## D-008. Theses are analysis, not advice (2026-10-18)
**Context:** commercial investment advice in Indonesia is a licensed activity [L].
**Decision:** theses use "stance" wording and carry a disclaimer, with no target prices or buy/sell calls. An OJK legal check happens before P3.
**Consequences:** some wording constraints in the thesis format (PRD F7).

## D-009. Name: Sigi; no exchange trademarks (owner, 2026-10-19)
**Decision:** the product is called **Sigi**. In the KBBI, *sigi* is a torch, and *menyigi* means "to light up" and, figuratively, "to investigate carefully": research and transparency in one word. It also pairs with Sunrise, since both names are about light. No "IDX", "BEI", "KSEI" or "IHSG" in the name, logo or domain.
**Consequences:** Kabupaten Sigi (Central Sulawesi) shares the name; no Indonesian investing product using it was found on 2026-10-18. Before launch, search the Indonesian trademark database (PDKI).

## D-010. Reuse Sunrise's plumbing, not its ledger (2026-10-18)
**Context:** Sunrise already has a single-writer worker, scheduler, freshness and data-health tracking, retention, auth, a thesis format with a strict levels grammar, a macro engine, an evidence-validated AI brief channel, and a per-symbol page built from slices carrying `source`/`asOf`/`absent`.
**Decision:** reuse these modules (ARCHITECTURE.md §3). How to obtain them is settled by D-011.
**Consequences:** Sunrise's crypto-specific assumptions (16:00 UTC daily close, BTC benchmark, held-position coupling) must be removed rather than carried over.

## D-011. A fresh repository; modules copied from Sunrise (owner, 2026-10-19)
**Context:** forking would carry Sunrise's history, its ledger code and roughly 22k lines that would all be deleted.
**Decision:** Sigi starts as a new repository with its own history. Modules are copied by the manifest in ARCHITECTURE §7.
- **Source:** by default, the public `sunrise` repository, whose history and content were already cleaned for publication. A module that is newer in the owner's private working copy is copied only file by file, after the leak scan in ARCHITECTURE §7.
- **Never copied:** Sunrise's docs, agent and assistant config files, data folders, deployment scripts that contain host details, or migrations.

**Consequences:**
- Sigi's schema and migrations start clean.
- Copied tests come along with their modules, and their bodies are rewritten wherever they encode crypto semantics.
- Sunrise improvements don't flow to Sigi automatically; porting one is a deliberate copy.

## D-012. The daily brief works like Sunrise's, adapted for a public site (owner, 2026-10-19)
**Context:** Sunrise's brief:
- a context exporter runs in a no-network container from the deployed image;
- a sandboxed agent (no shell, read and write allowlists, web search allowed) writes one JSON file a day;
- the web app validates the file with Zod, checks its evidence keys against the context, and marks it stale after 30 h.

**Decision:** keep that mechanism and the existing subscription. Move the brief from P2 into P1 (PRD F12). Change what a public page needs changed:
- the question becomes "what changed, and what is worth a closer look", with no actions such as trim, add or protect;
- the stance values are `quiet`, `notable` and `watch`;
- there are no price, target or size fields, and a recommendation-language check runs on every file;
- individual holders are never in the context;
- web content appears as links and short facts only.

**Consequences:** the brief is a public statement made by an AI, so its validator is part of the product's safety, not a convenience (PRD R9). The owner can unpublish any brief.

## D-013. No permission requests to BEI, KSEI or BI for now (owner, 2026-10-19)
**Decision:** don't contact the data publishers at this stage.
**Consequences:**
- The portfolio phase relies on non-commercial use with citation (DATA-SOURCES S1, S6).
- The KSEI local/foreign file (S2) stays admin-only, because its terms are unknown.
- Commercial-readiness items 1–3 (PRD §9) cannot pass, so P3 is blocked until this decision is revisited.

## D-014. Hosted on a subdomain of the owner's site (owner, 2026-10-19)
**Decision:** serve Sigi from a subdomain; `sigi.ubaidillah.id` is proposed. It runs on the existing host, behind the same reverse proxy, TLS and rate limiting as the owner's other public services.
**Consequences:**
- A DNS record is needed at deploy time (an owner action).
- The subdomain shares the parent site's reputation. Session cookies are host-only, never scoped to the parent domain.

## D-015. A source row that contradicts itself holds the month for review; it is never corrected (2026-10-22)
**Context:** the 2026-02-27 file has one row (MAYA, holder MAYAPADA KARUNIA PT) whose total shares (6,023,326,332) are not scripless plus scrip (0 + 6,323,076,332). Under a hard "total = scripless + scrip" gate that one publisher typo would block the whole month.
**Decision:** the shares-identity gate *holds* the month when 1–5 rows break the identity and *rejects* it above that (more than a few means a misread file, not typos). The owner approves or rejects a held month with a written reason, kept in `publish_audit`. Rows are stored exactly as published, with no CHECK constraint and no "fix"; the ticker page marks each such row "as published".
**Consequences:** concentration and float use the published percentage, which is unaffected by the share-count typo. The same hold path serves the month-over-month holder-count check (PRD F1).

## D-016. The S1 parser reads text positions and marked content; the real file is not committed (2026-10-22)
**Context:** the PDF is an Excel sheet printed with tags. Its structure tree holds about 515,000 empty table rows and took 94 s to walk; text positions plus the marked-content sequence of each cell take about 2–7 s for the same 73 pages.
**Decision:**
- Parse with pdf.js (`pdfjs-dist` 6.4.299, pinned). Cells are the marked-content sequences, so a name drawn as two runs ("… UMBARAWATI" and "SE") stays one cell. Columns are placed by the page's own header row: date, code, issuer and investor by order left of the type column; categorical columns by centre; numbers by right edge, each within a tolerance.
- Anything unplaceable, a page with rows but no header, a wrapped table cell, a malformed number or a second record date fails the file (`s1-pdf/1`). A changed layout gets a new parser version.
- The real file names individuals, so it stays out of the repository. Tests and the CI rebuild check use synthetic PDFs built to the real geometry (`src/ownership/s1-fixture.ts`). The real-file test runs when `SIGI_S1_REAL_PDF` points at a local copy.
**Evidence:** on the 2026-02-27 file the parser gives 7,257 rows, 955 issuers and 5,199 distinct holder names. Every numeric field matches the independent extraction cited in PRD F1. That extraction differs from ours in name fields on 59 rows of five issuers (CARS, JIHD, SCCO, SMAR, ULTJ), where a long issuer name overflows into the holder column and its text comes out garbled ("AP TTb BkERJAYA …"). Those garbled names are why it counts 5,226 holders.
