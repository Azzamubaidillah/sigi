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

## D-003. No scraping; official files arrive by manual download and admin upload (2026-10-18; for S1, superseded by D-021)
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
**Addendum (2026-10-27, D-029):** the Indonesian database (PDKI) sits behind an image challenge that a person has to solve, so the assistant searched the WIPO Global Brand Database's copy of the Indonesian collection instead. It lists live marks that use the word, among them an identical SIGI in class 41. See D-029. The PDKI search itself is still the owner's to do.

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

## D-015. A source row that contradicts itself holds the month for review; it is never corrected (2026-10-22; the hold became a published warning in D-021)
**Context:** the 2026-02-27 file has one row (MAYA, holder MAYAPADA KARUNIA PT) whose total shares (6,023,326,332) are not scripless plus scrip (0 + 6,323,076,332). Under a hard "total = scripless + scrip" gate that one publisher typo would block the whole month.
**Decision:** the shares-identity gate *holds* the month when 1–5 rows break the identity and *rejects* it above that (more than a few means a misread file, not typos). The owner approves or rejects a held month with a written reason, kept in `publish_audit`. Rows are stored exactly as published, with no CHECK constraint and no "fix"; the ticker page marks each such row "as published".
**Consequences:** concentration and float use the published percentage, which is unaffected by the share-count typo. The same hold path serves the month-over-month holder-count check (PRD F1).

## D-016. The S1 parser reads text positions and marked content; the real file is not committed (2026-10-22; superseded by D-022)
**Context:** the PDF is an Excel sheet printed with tags. Its structure tree holds about 515,000 empty table rows and took 94 s to walk. Text positions plus the marked-content sequence of each cell take 1.5 s for the same 73 pages (measured on the development machine).
**Decision:**
- Parse with pdf.js (`pdfjs-dist` 6.4.299, pinned). Cells are the marked-content sequences, so a name drawn as two runs ("… UMBARAWATI" and "SE") stays one cell. Columns are placed by the page's own header row: date, code, issuer and investor by order left of the type column; categorical columns by centre; numbers by right edge, each within a tolerance.
- Anything unplaceable, a page with rows but no header, a wrapped table cell, a malformed number or a second record date fails the file (`s1-pdf/1`). A changed layout gets a new parser version.
- The real file names individuals, so it stays out of the repository. Tests and the CI rebuild check use synthetic PDFs built to the real geometry (`src/ownership/s1-fixture.ts`). The real-file test runs when `SIGI_S1_REAL_PDF` points at a local copy.
**Evidence:** on the 2026-02-27 file the parser gives 7,257 rows, 955 issuers and 5,199 distinct holder names. Every numeric field matches the independent extraction cited in PRD F1. That extraction differs from ours in name fields on 59 rows of five issuers (CARS, JIHD, SCCO, SMAR, ULTJ), where a long issuer name overflows into the holder column and its text comes out garbled ("AP TTb BkERJAYA …"). Those garbled names are why it counts 5,226 holders.

## D-017. Free float is shown as an upper bound under the exchange's definition (2026-10-23; supersedes the "held below 1%" estimate of D-006)
**Context:** under Peraturan Bursa I-A (as reported by the press), free float is shares held by holders of less than 5% who are not the controller or its affiliates, directors, commissioners, treasury or locked-up shares. v0.3 showed "held below 1%" as the float estimate. That treats every 1–5% holder as not free, which is the wrong direction. On the 2026-02-27 file it put 568 companies under 15%, against the exchange's 328 as of 2026-03-31.
**Decision:**
- The headline figure is 100% minus every holder of 5% or more, with one holder's rows added together first. The register cannot see affiliates, insiders, treasury or lock-ups below 5%, which only lower the official figure, so the official figure is at most this.
- A bound under 15% means certainly below the minimum. A bound of 15% or more decides nothing.
- "Held below 1%" stays on the page as a separate, labelled figure.
- The tranche needs market cap, which Sigi lacks (C1; F5 blocked), so the page lists the tranches still possible given the bound.
**Evidence:** 219 companies certainly below 15% on the 2026-02-27 file: a floor on the official 328, as the definition requires. YUPI's bound is 10.00%; the company disclosed 10% as of 2026-08-31.

## D-018. Holder identity: mechanical normalisation plus a reviewed alias table; pages only for institutions (2026-10-23)
**Decision:**
- **Key:** a holder's key is its published name with case, full stops, commas and spacing folded. Word order is never touched.
- **Merges:** a reviewed row in `HOLDER_ALIASES` merges two keys, and a merge needs nothing more than that row. `pnpm holders:candidates` lists keys that become equal once the legal-form words are dropped and the remaining words sorted. A candidate becomes a row only if, after dropping just PT, TBK and THE, the words are the same and in the same order.
- **Use of the key:** it groups rows for the 5% line, concentration, month-over-month changes and holder pages.
- **Pages:** a holder gets a page only if every row published under its key, in every month, carries an institutional type. One individual or unclassified row means no page (C6, fail-closed).
**Evidence:** the 2026-02-27 file gave 36 candidate groups, from which 33 rows were added. Three groups were rejected:
- word order differs: "MANDIRI INVESTASI BERSAMA PT" against "PT INVESTASI BERSAMA MANDIRI";
- two different individuals;
- a word added: "PENTA COSMOPOLITAN CORPORATION".

2,784 institutional holders have pages; 2,364 holders (individuals or unclassified) do not.

**Evidence, all eight months (2026-10-25):** the files from 2026-02-27 to 2026-09-30 gave 268 further candidate groups, and 261 rows were added under the same rule. The canonical spelling is an existing canonical if there is one, otherwise the spelling that starts with "PT", then one that contains "PT", then the most published. In no group did one spelling say local and another foreign, and none mixed individuals with institutions. 16 groups keep a spelling outside the rule:
- 10 individuals, where a title moves or the name order changes (for example "LO KHENG HONG DRS" and "DRS LO KHENG HONG");
- 2 with a different word order, for example "PT TRIPLE BERSAMA BERKAH" (its other two spellings were merged);
- 2 that differ in "LIMITED" and "LTD";
- 2 with a word added: "PENTA COSMOPOLITAN CORPORATION PT" and "MAYAPADA KARUNIA CORPORATION PT".

Merges also change who has a page. A holder whose spellings appear in the same month counts once. A merged holder with a row of no type in any month fails the page rule (C6, fail-closed), even if its other spelling had a page. On 2026-09-30 the counts move from 2,506 holders with pages and 2,642 without to 2,487 and 2,657.

## D-019. A register listing under 15% above 1% gets no float figure (2026-10-23)
**Context:** in the 2026-02-27 file, five companies' holders above 1% total under 15%: BBRI 5.86%, ADHI 7.37%, BBNI 7.95%, BBTN 9.98% and NCKL 12.03%. Each is missing a known controlling holder: the state or Danantara for the first four, and Harita for NCKL, listed at 3.16%. Their "bound" would be about 100%.
**Decision:** such a company is marked "register incomplete". It gets no float figure, it is excluded from float screens and counts with the reason stated, and it is listed separately on the investability page. This is a rule, not a hand-kept list, so a new month is checked the same way.
**Limit:** an omission at a company whose remaining holders still total over 15% is not caught. That is PRD R10.

## D-020. Production: Dokploy on the existing host, kept out of search engines until launch (2026-10-23; the login, upload and passcode parts were removed by D-021)
**Decision:**
- **Hosting:** the same pattern as Sunrise. A Dokploy application (`sigi-web`) is built from the Dockerfile from a drop upload. It runs on the host network, bound to `127.0.0.1:3220`, with bind mounts for the data directory and an owner-only `.env`. nginx terminates TLS with Let's Encrypt and applies rate limits: 10 requests per second for pages, 10 a minute for the login. The upload limit is 26 MB on `/api/admin/`.
- **Deploys:** `scripts/deploy.sh` runs `pnpm verify`, uploads the committed HEAD and checks the public pages. Host details live in the git-ignored `.env.deploy`; the Dokploy key stays in the Keychain.
- **Search engines:** `X-Robots-Tag: noindex, nofollow` until the M6 launch.
- **Admin passcode:** kept in the owner's Keychain (service `sigi-admin-passcode`); only its hash is on the host.
- **TradingView:** the market page embeds TradingView widgets (S3). The CSP allows their loader and frames, and a privacy notice discloses what TradingView receives.

## D-021. The monthly holder files are fetched automatically from idx.co.id; there is no admin (owner, 2026-10-24; supersedes D-003 for S1)
**Context:** the owner does not want to upload anything or keep an admin; the site is to run without a human step. The files are on the exchange's [share-ownership data page](https://www.idx.co.id/id/perusahaan-tercatat/data-kepemilikan-saham/), behind Cloudflare: plain HTTP clients and headless browsers get 403, on the owner's Mac and on the host alike. Asked to choose between scraping idx.co.id, the KSEI composition file only (no holder names), or KSEI plus a frozen February snapshot, the owner chose scraping.
**Decision:**
- **Fetching:** a worker (`scripts/worker.ts`, its own Dokploy application `sigi-worker`) drives Google Chrome under Xvfb with the puppeteer stealth evasions, once a day. It reads the page's file list (`window.__NUXT__`), and for each monthly *Pemegang Saham di Atas 1%* workbook it has not imported, opens the file in a tab and takes it from Chrome's downloads, clicking the challenge checkbox when one shows; an in-page fetch of the file store gets a challenge or a cut-off body. Months are imported oldest first; the first error ends the run, which is recorded in `fetch_runs` and retried three hours later.
- **No human step:** the admin area, sign-in, uploads, passcode and session code are removed, and the site is read-only (anything but GET and HEAD gets 405). A gate either fails, and the file is rejected with the previous month left live, or warns, and the file is published with the warning shown on `/data`. Nothing is held. Shares-identity breaks on up to five rows (D-015), an unrecognised investor type and a holder-count jump of more than five now warn. A file for an already-published month replaces it when the page lists it under a new URL (a re-issue); the replacement is audited.
- **Terms, accepted by the owner:** the IDX terms say the site may not be used with "metode web scrapping/crawling". Sigi does it anyway, and says so on `/data` and in DATA-SOURCES S1. The load is one page view and at most one download per new file per day.
**Consequences:**
- **Blocking risk:** the host's IP is shared with Sunrise, the indexer and the owner's other sites. If the exchange or Cloudflare blocks it, all of them lose idx.co.id, not just Sigi. The owner accepted this.
- **Fragility:** the fetch depends on Cloudflare's bot rules, the page's Nuxt state, and an unmaintained stealth plugin (puppeteer-extra-plugin-stealth 2.11.2, last released 2023). Any of these can break it; a failed run shows on `/data`, and the "next file expected by" notice turns into an overdue warning.
- **Chrome in the container:** it runs with `--no-sandbox` (no user namespaces in the container) and visits only idx.co.id. The image takes Google's current stable Chrome at build time, unpinned, since looking like a current browser is the point.
- **Permission:** C2's spirit (ask before taking) is not met for S1. D-013 (no permission requests for now) still stands; a written permission would retire this risk.
**Evidence:** a run from the owner's Mac on 2026-10-24 imported all eight months listed (2026-02-27 to 2026-09-30); each landed file is byte-identical to the copy downloaded by hand. `pnpm rebuild:check` matched every month.

## D-022. S1 is read from the exchange's XLSX workbook, not the PDF (2026-10-24; supersedes D-016)
**Context:** the share-ownership data page offers each month as an Excel workbook. The exchange's announcements feed, where the PDFs were found, lists the 1% files only up to June 2026.
**Decision:** `src/ownership/s1-xlsx.ts` (parser version `s1-xlsx/1`) reads the workbook's only sheet with the XLSX reader copied from Sunrise. It finds the header row by `SHARE_CODE` and requires the twelve known columns in order, accepting either name for column E: `INVESTOR_TYPE` (KSEI's nine codes, files to March 2026) or `INVESTOR_CLASSIFICATION` (about 35 labels in varying case, from April 2026). The PDF parser and `pdfjs-dist` are removed.
- **Values as published:** local/foreign "A" (February 2026) is stored as "F", the later spelling. Percentages are rounded to hundredths: April 2026 carries full precision (36.108405090747539), every other month two decimals.
- **Quirks of the real files, handled by rule:** the ticker TRUE is stored by Excel as a boolean; one April row leaves its scrip cell empty (read as zero, since its total equals its scripless holding); April has leftover `#DIV/0!` formulas in column O below the table (rows empty in the twelve columns are skipped). A value past column 12 on a holder row still fails the file.
- **Investor types** are stored as published. `src/ownership/investor-classes.ts` says what each means: individual, institution, unclassified or unknown. "Sole Proprietorship" counts as an individual. An unknown label is never assumed institutional, so it gets no holder page (C6).
**Evidence:** all eight files parse: 7,154–7,257 rows and 955–961 issuers a month. The 2026-02-27 workbook gives the PDF's 7,257 rows, 955 issuers and 5,199 holder names. No file has an unrecognised type. April 2026 has 560 unclassified rows against 219–255 in the other months.

## D-023. The macro dashboard fetches Bank Indonesia, the World Bank and FRED automatically; BPS is not used yet (owner, 2026-10-24)
**Context:** M3 (PRD F6) needs Indonesian rates, prices and the rupiah, commodity prices and global rates, with no upload path left (D-021). Bank Indonesia publishes no site-wide terms (DATA-SOURCES S6, [L]). Asked whether to use cleared sources only, fetch BI automatically as well, or substitute, the owner chose to fetch BI automatically.
**Decision:**
- **Bank Indonesia (S6):** four tables, each exported to Excel the way a reader's browser does: the ASP.NET form is posted back with its date range and the export button. BI-Rate (full history), inflation year on year (BPS data as BI republishes it, from January 2016), JISDOR (three years, daily) and FX reserves (from January 2016). BI drops connections from clients that do not look like a browser, so these requests carry Chrome's user agent. No browser is needed.
- **World Bank (S7):** the monthly Pink Sheet workbook, found by its link on the commodity-markets page. Brent, Newcastle coal, palm oil, nickel, tin and gold. CC BY 4.0, read on the World Bank data catalog on 2026-10-24.
- **FRED (S8):** one CSV per series, three years each: DFEDTARU, DGS10 and DTWEXBGS, all from the Federal Reserve Board, whose series notes carry no copyright notice. FRED and the World Bank are asked under Sigi's own name.
- **BPS (S4):** not used in M3. Its table pages render in the browser from server actions, and its site challenges the host's IP through Cloudflare. Inflation comes from BI's republication instead; GDP is left for later.
- **Pipeline:** each file lands immutably and passes gates. The fails are a series missing or too short, a value outside the series' plausible band, a series that ends earlier than what is published, or one that lost more than 10% of its history. A revision to values more than a year old warns. A published file replaces its series whole. A file whose figures equal what is published is a no-op, so the daily re-exports leave no trace. The rebuild check covers macro series too.
- **Labels:** the value as the source publishes it is marked "published". The change on the previous value and the year-on-year move are marked as Sigi's calculation. Changes carry no green or red, since a weaker rupiah or dearer oil helps some sectors and hurts others. The sector links are Sigi's editorial reading. Each IDX sector index beside a group is a TradingView widget; all eight were seen rendering on 2026-10-24.
**Consequences:**
- **A second terms risk from the same shared IP** (PRD R11): the BI exports are scraping by any reasonable reading. The load is about ten requests a day.
- **"Released" means first seen by Sigi,** at the resolution of a daily check. "Next release" is an expectation from each source's usual cadence (holidays ignored, BI's meeting dates assumed monthly), and is labelled so.
**Evidence:** from the host on 2026-10-24, all eight feeds imported: BI-Rate 129 decisions from April 2016, inflation 129 months, JISDOR 257 days, reserves 129 months, six Pink Sheet columns (to September 2026), three FRED series. A second run imported nothing, as intended.

## D-024. Theses are versioned files with a strict header and typed conditions, checked daily by the worker (2026-10-25)
**Context:** PRD F7 asks for theses as files in the repository, with typed invalidation conditions that Sigi checks against its own data, a status, version history with diffs, and a "conditions hit" list. Sunrise keeps coin theses as dated markdown files with a strictly parsed `levels` fence (its D-158 and D-161); Sigi follows that shape.
**Decision:**
- **Files:** `theses/<slug>/<YYYY-MM-DD>.md`, one file per version. The newest date is the current version, older files are kept unedited as history, and a deploy publishes them. The page shows the line diff from the previous version.
- **Header:** a `thesis` fence. It has one `key: value` per line for title, tickers, stance, summary, status (active, invalidated or closed) and review date, plus repeatable dated catalysts. One bad line makes the header unreadable, with a reason that names the line. A stance containing ratings, targets or an opening transaction verb is refused. Closing a thesis requires a `## Post-mortem` section with text.
- **Conditions:** a `conditions` fence, one per line:
  - `ownership CODE "HOLDER" below|above N%`: the holder's position, rows summed under the holder key (D-018); institutions only (C6);
  - `float CODE below N% [from DATE]`: the D-017 upper bound. There is no `above`, because a bound can show a float below a level but never above one;
  - `macro SERIES below|above N`: the latest published value;
  - `date DATE note`: met on the day it names;
  - `price CODE below|above LEVEL`: always a manual check, since Sigi stores no prices (C1).

  One bad line makes the whole block unreadable, and the page says "conditions unreadable: <reason>". Nothing is partly read.
- **Check:** the worker evaluates the current version at start-up, after every pass over the feeds and just after midnight in Jakarta. It stores one row per condition per day (`thesis_checks`). Each row is met, not met, unknown with the reason, or manual, plus the figure compared and its date. The pages show the stored rows and never evaluate per request. "Met since" is the first day of the current unbroken run of met.
- **Unknown, not guessed:** these give unknown with the reason: a holder in no published month (likely a misspelling), a holder with any individual or untyped row, an issuer missing from the latest register, an incomplete register (D-019), and a series with no published value.
- **Rendering:** markdown becomes Sigi's own block tree, never HTML (from Sunrise). Raw HTML is shown as text. Only http(s) links, site paths and links to other theses survive.
**Consequences:** the owner writes and commits each version and deploys. A `float … below` that is not met says the official figure can still be lower. Conditions are identified by their text, so editing a condition's wording starts a new history.

## D-025. The daily brief: Sunrise's mechanism, with a "look at" schema, a recommendation check and its own host directory (2026-10-25)
**Context:** PRD F12 and D-012 ask for a daily AI brief on the public site, built like Sunrise's. Sunrise's schema answers "what should I do" with actions to trim or add. A public page must not.
**Decision:**
- **Schema:** the analysis has a stance (`quiet`, `notable` or `watch`), a headline, up to 8 "look at" items (kind, subject, reason, evidence keys), changes since yesterday, risks, signals set aside and web sources. The objects are strict, so a field such as a target price or an action is refused. A quiet brief has nothing to look at, and the other two have at least one item.
- **Recommendation check:** every text field passes `src/safety/recommendation.ts`. It refuses ratings ("strong buy", "buy rating"), price targets, entry and stop language, "accumulate", Indonesian equivalents ("layak beli", "target harga") and a sentence that opens with buy, sell or hold. A bare verb inside a description is allowed, because ownership research has to say "the controller must sell down". The same check guards the thesis stance (D-024). It is a word list: it catches wording and not meaning, and the not-advice notice and the prompt carry the rest.
- **Date:** the run's Jakarta date is the file name, the analysis `date` and the context `today`, and the page rejects a mismatch. Sunrise uses the UTC date, which would show a brief written at 06:00 WIB under the day before.
- **Context:** ownership moves (institutions named, individuals only counted), the float tracker, macro releases and the week ahead, thesis conditions with what changed today, dated rule and index events, data health and news headlines that name a ticker of an active thesis. A section that cannot be built is listed with its reason. News is CNBC Indonesia's market feed only, headline, time and link, kept 30 days and never shown on a page; Kontan's feed returned an HTML page and Bisnis a 403 from the host (DATA-SOURCES S10).
- **Agent and files:** as in Sunrise (no shell, read and write allowlists, one output file), run as the same unprivileged host user and subscription. The files live in `/opt/sigi-brief`, not under `/opt/sigi`, which is mode 700 and holds the database. The web container reads them through a bind mount at `/opt/sigi/data/brief`.
- **Failure shows:** a newer file that fails validation is named on the page with its reason while the last good brief stays up, and a brief older than 30 hours is marked stale. There is no retry. A run that fails leaves the previous brief and a log line.
- **Withdrawal:** an entry in `src/brief/unpublished.ts` plus a deploy.
**Consequences:** the validator cannot check that a figure outside the context carries a source or that no article text was quoted; the prompt requires both (DATA-SOURCES S10). Individual holders from the register are kept out of the context, but headline and thesis text is not scrubbed for personal names. The brief spends the owner's existing subscription, which Sunrise's brief shares.

## D-026. English and Indonesian by cookie, typed catalogs, and a launch that is one nginx line (2026-10-25)
**Context:** PRD F11 asks for English and Indonesian copy on every page, with the data tables keeping their source spellings. M6 also launches the site.
**Decision:**
- **Language choice:** a cookie, `sigi-lang`, set by `/lang?set=id&next=<path>`: a plain GET that redirects (303, relative, same-site paths only). Without it, Accept-Language decides, and English is the default. The switcher is two plain links in the masthead, never `Link`, so a prefetch cannot switch the language. The privacy notice names this cookie.
- **Not a URL prefix:** `/id/...` would let search engines index the Indonesian pages separately, but every link and canonical would be duplicated. The cost of the cookie is that crawlers, which send neither a cookie nor Accept-Language, see English only. If Indonesian search traffic matters later, a prefix is the change to make.
- **Catalogs:** each page's copy is a `defineMessages({ en, id })` in `src/i18n/messages/`; both sides must have the same shape, so a missing Indonesian message is a type error. `src/i18n/messages.test.ts` walks every catalog and refuses an Indonesian string that is the English one left in place. Static data outside a page (series names and sector rationales, source names and terms, rule labels) is a `Text` of `{ en, id }`. No message holds markup: a sentence with a link is split around it.
- **Formats follow the language:** Indonesian writes 41,10% and 1.234.567 and its month names. Names, codes, investor types and every figure are as published.
- **English only, on purpose:** explanations the worker stores (gate and check details, the reasons in "conditions unreadable"), the thesis texts the owner writes, and the daily brief the agent writes. The Indonesian brief page says so.
- **Launch:** the site is public when the `X-Robots-Tag: noindex, nofollow` line is removed from its nginx server block and nginx is reloaded. `robots.txt` (disallows `/lang`) and the sitemap (the section pages, every company in the latest register, every thesis) are already served. The line stays until the owner decides.
**Consequences:** the Indonesian copy is the author's translation and has had no native-speaker review. A change to English text needs its Indonesian twin in the same commit, and the catalogs test says when it is missing.
**Evidence:** Playwright (133 specs) and Lighthouse accessibility, 15 pages in both languages, both colour schemes, desktop and mobile: 120 runs, all 100, after darkening the muted and tone colours and underlining links in running text.

## D-027. A new identity and one design system under every page (owner, 2026-10-26)
**Context:** before launch the owner asked for the UI and UX to be reworked entirely, with an identity (logo, colour). The audit of the old pages, on production data at 1440 px: the market page was 34,683 px tall (all 969 companies in one table), investability 14,007, holders 18,188; every panel was the same white rounded card with a shadow; the face was the system font and the accent a stock blue; the same three-line citation sat under every panel; nothing on a page was larger than anything else.
**Process (as for Sunrise D-161, `sunrise-ux`):** Anthropic's `frontend-design` skill and the `sunrise-ux` rules, with `ui-ux-pro-max` as a calibration only (its design-system search for this brief returned near-black OLED, a green accent and Fira, which is the default to avoid, so its checklist was kept and its choices were not). The brief is [DESIGN.md](DESIGN.md): subject and audience, the identity, tokens, parts, rules and quality floor. A token plan was reviewed against the common defaults before any code, then built, then critiqued from screenshots at 1440 and 390 px in both schemes and both languages. The foundation (tokens, shell, parts, the market and company pages) was built first; the other eight pages were rebuilt by three agents in separate git worktrees, each with its own build directory and ports, and merged.
**Decision:**
- **Identity.** Sigi is a torch (D-009), so the identity is what the torch lights: the part of a company that is open to the public. The wordmark is `sigi` in Plus Jakarta Sans ExtraBold, drawn as outlines, with a flame on each i; the symbol is a torch in white on a nila tile. Two colours: **nila**, the batik indigo, for ink, links and holders; **obor**, the torch amber, the only warm colour, which means *lit*: the free float, the flames, a warning. Plus Jakarta Sans (drawn in Jakarta by Gumpita Rahayu at Tokotype, with tabular figures) carries the interface and every figure; Newsreader sets long reading only. Both are OFL, subset to Latin and self-hosted (22 KB for the sans, 42 KB for the serif and 47 KB for its italic, which loads only where italic is used).
- **The motif.** Who holds a company is one bar of 100%: holders of 5% or more, then the lit float, with a line at the 15% minimum. In a table row it is 10 px high and a column of them reads like a ruler; on a company page it is the focal figure and its float is lit once when the page opens, the site's only non-user-triggered motion.
- **Layout language.** A ledger, not cards: flat sections that open on a strong rule with the source or date opposite the title; ruled tables; no shadows; wells only where a thing must stand apart. One focal element per page.
- **System.** `app/styles/{tokens,base,shell,primitives}.css` and per-page files under `@layer sections`; `app/_components/ui.tsx` (`PageHeader`, `Section`, `Figures`, `Pill`, `Notice`, `SourceNote`, `Icon`) and `OwnershipBar.tsx`. No hex value outside `tokens.css`. Light and dark both follow the system; there is no toggle.
- **Pages.** Market: search first, the count certainly below the line as the focal figure, today's brief headline, the register with a bar per company, 50 rows a page, filters folded. Company: the verdict, then the bar. Investability: the 25 lowest bounds and a link to the filtered register instead of all 219. Holders: 100 rows with a filter. Macro: tiles with a filled sparkline and the latest value marked; the 8-line citation per card became one folded source. Data: a freshness summary, then feeds, imports and sources as ledgers. Theses: what a thesis is, with a worked example marked as an example, so the empty page at launch explains itself; conditions as a table with a status word and icon. Brief: the headline set large as the focal element. A 404 page with a search, and a masthead search (`/search`) that takes an exact code to its company.
- **Writing.** Dates are written for reading (`31 Mar 2027`) in the deadline lines; the sans has no italic, so emphasis is weight.
**Rejected:** a candle-and-stack symbol (reads as a candlestick chart); cream paper with a serif display (a default); a dark-only theme (the owner keeps two); cards for every panel (the old UI); a TradingView-first home page (its widget is blank until a third party answers).
**Consequences:** the worker's stored sentences still carry ISO dates and stay English (D-026); the Indonesian copy is still the author's translation without native review; the share image and favicon are static files; a change to the shared parts is made in `primitives.css` and `ui.tsx`, never per page. Per-run build directories (`SIGI_DIST_DIR`, `SIGI_E2E_PORT`) let end-to-end runs go in parallel.
**Evidence:** page height at 1440 px, before and after: market 34,683 to 5,027; investability 14,007 to 4,758; holders 18,188 to 5,639; macro 3,443 to 3,328; company page (ALKA) 3,754 to 4,689, because of the larger type and the bar. No page scrolls sideways at 390 px. Lighthouse accessibility: 120 runs (15 pages, both languages, both schemes, desktop and phone), lowest 100. Contrast was computed for the whole palette in both schemes (text at least 5.5:1, controls at least 3:1). Playwright: 141 specs pass (the 133 of M6 repaired for the new markup, plus company search, the holders filter, the 15% line between bands and the data status); unit tests: 122 pass; `pnpm verify` passes.

## D-028. Three theses written, and the site launched (owner, 2026-10-26)
**Context:** the owner asked for three theses to be picked and written, and for the site to launch. PRD §10 asks for at least three published theses before launch; the first-bar items the PRD lists were otherwise met except five macro series per group.
**Decision:**
- **Theses.** Three, in `theses/<slug>/2026-10-26.md`, picked because the register or the macro readings can test them and because dated, published facts sit behind them. Each states the view, what supports it with [H]/[M]/[L] labels and sources, the typed conditions that would show it wrong, and what is not known.
  - `bris-float-step`: BRIS (float at most 10.12%, three state banks hold 89.88%) reaches the first float step, 12.5% by 31 March 2027, through its planned rights issue. Conditions: `float BRIS below 12.5% from 2027-03-31`; Mandiri's stake above 51.47%. Catalysts: the shareholders' meeting scheduled for 6 November 2026 and 31 March 2027. The main stated risk is timing, because the issue is planned for the same quarter as the deadline.
  - `cimb-niaga-placement`: CIMB Niaga (BNGA; CIMB Group holds 91.45%, float at most 8.55%) closes its gap by placing shares and not by going private, after CIMB Group's denial of a privatisation plan on 22 October. Conditions: `float BNGA below 12.5% from 2027-03-31`; CIMB Group's stake above 91.45%, which would be a buy-out starting. A delisting reads "unknown" on both and would close the thesis in a new version.
  - `coal-and-rupiah`: Newcastle coal at 147.1 dollars a tonne (a year high) and a rupiah 8.6% weaker than a year ago lift the rupiah price of coal for AADI, ITMG and PTBA while both hold. Conditions: `macro coal below 125`; `macro jisdor below 17500`. The thesis says what Sigi cannot see: realised prices, the domestic market obligation, company costs.
- **Not written, and why.** A thesis on Danantara's majority in the four large state banks. Its conditions would read "unknown" for good: the April 2026 file types Danantara's rows as unclassified, and D-018's fail-closed rule (C6) then refuses to check that holder in any month. Changing that rule is a separate decision.
- **Held by the build.** `src/theses/published.test.ts` fails the build if fewer than three theses exist or any file has an unreadable header or conditions block.
- **Launch.** The `X-Robots-Tag: noindex, nofollow` line and its comment were removed from `/etc/nginx/sites-available/sigi.ubaidillah.id` and nginx was reloaded (the previous file is kept on the host as `/root/sigi.ubaidillah.id.nginx.prelaunch.bak`). After it, the site returns no `X-Robots-Tag` and no robots meta tag, `robots.txt` allows everything but `/lang` and `/search`, and the sitemap lists 972 URLs, among them the section pages, every company and the three theses. To reverse it, put the header back and reload.
**Accepted by the owner's instruction to launch:** §10's five macro series per group is not met (Indonesia 4, Global 3); the P1 exit also asks for a public repository, which Sigi's is not. D-009's trademark search in the Indonesian database (PDKI) before launch has not been done. No search engine's webmaster tool has been told about the sitemap.
**Consequences:** the theses are research notes published under the owner's name and were drafted by the assistant from the register, the macro readings and the press reports they cite; the Kontan, CNBC Indonesia and Kompas articles were read, the market-cap figure for BRIS is a third party's [L], and The Star's report on CIMB Niaga is relayed by Kontan and was not read. The worker checks each condition daily and the daily brief reads them. A condition that is hit leads `/theses`; whether to close or revise a thesis is the owner's call, in a new dated file.
**Evidence:** on 2026-10-26 the worker's first check recorded all six conditions as not met, from Sigi's data (BRIS 51.47% for Mandiri; BNGA 91.45% for CIMB Group; coal 147.10 for 2026-09; JISDOR 18,069 for 2026-10-23; the two float conditions wait for a register dated 31 March 2027). `pnpm verify` passes, the production build lists `/theses` and each thesis, and the live pages return 200.

## D-029. Launch follow-ups: macro coverage, a public repository, a trademark check and search engines (owner, 2026-10-27)
**Context:** D-028 launched with four items open. The owner asked for all four.
**Decision:**
- **Macro: 16 series, in groups of 5, 6 and 5.** Added `reer-idr` to Indonesia and `usd-cny` and `usd-inr` to Global.
  - `reer-idr` is the BIS real effective exchange rate of the rupiah against 64 economies, monthly, index 2020 = 100. It is a new source, S11, fetched straight from the BIS data portal as one CSV with 13 fixed columns (from 2016). FRED carries the same series but ran two months behind the BIS (July against September on 2026-10-27). The BIS terms allow non-commercial redistribution without permission (DATA-SOURCES S11) [M]. The parser reads only a monthly, real, broad row for Indonesia and fails the whole file on any other row, a quoted comma or a bad month.
  - `usd-cny` and `usd-inr` are the Federal Reserve's H.10 noon buying rates for the yuan and the Indian rupee (FRED DEXCHUS and DEXINUS, marked "Public Domain: Citation Requested"), picked because China and India are among the largest buyers of Indonesian coal, and India of palm oil. The sector links say so as Sigi's editorial reading, with the direction stated as a condition ("a weaker yuan makes dollar-priced coal dearer for Chinese buyers"), not as a forecast.
  - **Rejected:** US consumer prices (CPIAUCSL), because the macro tile's FRED citation names the Federal Reserve Board as publisher and the series comes from the Bureau of Labor Statistics; Bank Indonesia's monetary-indicators table, which shows two month-ends and has no export, so no history; Bank Indonesia's compounded IndONIA index, which is chart data in a hidden form field and an index, not a rate; the OECD's Indonesian 10-year yield, which FRED does not carry; BPS (D-023).
- **A public repository.** Before it was made public, `gitleaks` scanned the whole history (no leaks) and a search of every commit for the host's address, a root login, home paths, tokens and private keys found none. The deploy host is not in the tree (`.env.deploy` is git-ignored). Tracked files hold no register data: the real files name individuals and are not committed, and the holder alias table names institutions only. The brief runner names the host user `sunrise-agent`; that is a username, not a credential, and was left. The repository was made public on 2026-10-27 with a description and topics. **No licence is granted**, as in Sunrise's public repository; code that is public without one stays all-rights-reserved. Choosing one is the owner's decision.
- **Trademark.** PDKI's search (pdki-indonesia.dgip.go.id) is gated by an image challenge ("select all images with a fire hydrant"). Solving it is a person's job, so the assistant did not. The WIPO Global Brand Database holds the Indonesian office's (DGIP) collection, 1,147,789 records covering 25 March 1961 to 14 October 2026. A search there on 2026-10-27 for marks containing the word "sigi" returned 11 Indonesian records, none in class 36 (financial services) or class 42 (software and information-technology services):
  - **Identical word, recorded as registered:** SIGI in class 41 (education, entertainment, publishing), PT Indonesia Entertainmen Grup, registered 3 November 2021, number IDM000906298. SIGI in class 30 (foods), PT Corin Mulia Gemilang (status not recorded).
  - **Containing the word, recorded as registered or pending:** MAMA SIGI DAN PEPO, Unilever IP Holdings B.V., registered 19 April 2018, classes 3, 9, 21, 35, 38 and 41 (IDM000614019); SIGI INDAH (class 1, registered 2007), SIGI LESTARI (class 29), SIGI SCREEN STUDIO (class 25); and a pending application of 7 August 2026 by a village cooperative whose name includes "Kab. Sigi" (class 35).
  - **Expired or ended:** SIGI in classes 21 (expired 2000), 3 (2010) and 16 (2019), and SIGI COLLECTION (class 3, application ended).
  - **Limits.** This is a copy of the Indonesian collection in WIPO's tool, current to 14 October 2026, and not the official register. Only the "contains the word" strategy was read. The fuzzy strategy returns 11,923 records worldwide, and the phonetic one was not read, so similar spellings were not reviewed. Whether the class 41 mark matters depends on what Sigi would register or publish under, which is a legal question; PDKI's own notice advises asking a registered IP consultant.
- **Search engines.** Google Search Console and Bing Webmaster Tools both need the owner's Google or Microsoft sign-in and a verified property, so the assistant did not touch them. `robots.txt` already names the sitemap, which Google and Bing read on their own. For Bing, Yandex, Naver and Seznam there is IndexNow, which needs no account: the key is the name and content of `public/<key>.txt`, and `pnpm indexnow https://sigi.ubaidillah.id` posts the sitemap's URLs to `api.indexnow.org`. It is run by hand and not on a schedule. Google does not take part in IndexNow. The first submission, made right after the deploy, was refused with `SiteVerificationNotCompleted`; the second, a few minutes later, was accepted (HTTP 200) with all 972 URLs.
**Accepted:** none of the four is a gate on the site staying up. To reverse the publication of the code, the repository can be set private again, but anything cloned or forked while it was public stays with whoever has it.
**Consequences:** the macro page now has 16 tiles; a thesis condition may name `reer-idr`, `usd-cny` or `usd-inr`; the worker checks three more feeds each day. The Indonesian copy for the new series and for the BIS is the author's translation without native review, as the rest of it. A weaker yuan or rupee reads as a rising number, and the tiles use no colour for direction.
**Evidence:** against the live sources on 2026-10-27, the three new feeds fetched, parsed and published: the BIS series ends September 2026 at 87.76 (87.74 in August; −7.0% on September 2025), the yuan at 6.6702 per dollar on 23 October (−6.3% on a year earlier) and the rupee at 94.94 (+8.1%). After the deploy of `0813d39`, production's `/macro` lists 16 tiles with a value each, `/data` reports "13 of 13 sources passed their last check", the BIS tile cites the BIS with "Cleared for non-commercial use", and the key file is served as `text/plain`. `pnpm verify` passes. The first full Playwright run had 137 passing and 5 failing, all of them counts on `/data` that the new feeds and source changed (13 feeds, 11 sources, 8 published files); those were updated and the data and macro specs re-run (19 passed, among them the new 5, 6 and 5 tile counts and a spec for the BIS citation). CI was green on `0813d39`, including its end-to-end and Lighthouse job. One unrelated test, the 955-issuer parse in `s1-xlsx.test.ts`, timed out at the default 5 s three times in a row when the machine was busy and blocked the deploy; it now has a 30 s limit. Anonymous requests to the repository page, its raw README and the GitHub API returned 200 and `private: false` after it was made public.
