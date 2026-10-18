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

## D-009. Product name avoids exchange trademarks (2026-10-18)
**Decision:** no "IDX", "BEI", "KSEI" or "IHSG" in the product name, logo or domain. "Telaah" is a working name pending owner confirmation (PRD Q1).

## D-010. Reuse Sunrise's plumbing, not its ledger (2026-10-18; repo strategy still open)
**Context:** Sunrise already has a single-writer worker, scheduler, freshness and data-health tracking, retention, auth, a thesis format with a strict levels grammar, a macro engine, an evidence-validated AI brief channel, and a per-symbol page built from slices carrying `source`/`asOf`/`absent`.
**Decision:** reuse these modules (ARCHITECTURE.md). Whether to fork the repo or copy modules into a fresh one is open (PRD Q2).
**Consequences:** Sunrise's crypto-specific assumptions (16:00 UTC daily close, BTC benchmark, held-position coupling) must be removed rather than carried over.
