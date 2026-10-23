# Data-source register

Every figure Sigi shows publicly must point to a row in this register (PRD C3). A row records where the data comes from, how we obtain it, what the terms allow, and how sure we are.

**Not legal advice.** Quotes are as read on the date shown. Labels: [H] primary source read, [M] secondary source or partial read, [L] inference.

Status values:
- **cleared** (may be shown publicly in the stated phase);
- **withheld** (not fetched or shown until the terms are clear);
- **excluded**.

---

## S1. Holders above 1% (monthly)

| Field | Value |
|---|---|
| Publisher | PT Bursa Efek Indonesia (BEI/IDX) website, [share-ownership data page](https://www.idx.co.id/id/perusahaan-tercatat/data-kepemilikan-saham/) (and, until June 2026, Announcements); data provided by PT Kustodian Sentral Efek Indonesia (KSEI) under OJK decision KDK No. 1/KDK.04/2026 and OJK letter S-20/PM.1/2026 |
| Content | Per issuer and holder: record date, share code, issuer name, holder name, investor type (KSEI codes CP, ID, IB, MF, SC, IS, PF, FD, OT to March 2026; about 35 classification labels such as "Corporate" or "Mutual Funds" from April 2026), local/foreign, nationality, domicile, scripless shares, scrip shares, total shares, percentage. The 2026-02-27 file has 73 PDF pages, about 7,257 rows, 955 issuers and 5,226 holders (counts from an [independent public extraction](https://github.com/aryakdaniswara/idx-stock-ownership) [M]) |
| Format and cadence | An Excel workbook, one sheet, titled on the page "Pemegang Saham di Atas 1% per {date}" (D-022); monthly since 2026-03-03. The earlier announcements carried the same table as a PDF exported from Excel ("Pemegang saham diatas 1% (KSEI) [Semua Emiten Saham]") |
| Access | **Fetched automatically, once a day, by owner decision (D-021).** The page and its file store sit behind Cloudflare, which refuses plain HTTP clients; Sigi's worker drives a real Chrome under Xvfb, reads the page's file list and opens each new workbook in a tab. **This breaches the IDX terms below** ("tidak diperkenankan menggunakan metode web scrapping/crawling"); the owner accepts that, and the risk that the shared host's IP is blocked (PRD R11). Checked working from the host on 2026-10-24 [H] |
| Terms (IDX website) | *"Penggunaan Informasi dan atau data termasuk pengutipan Informasi dan atau data bukan untuk tujuan komersial diperbolehkan dengan menyebutkan sumbernya secara lengkap yang disertai tanggal akses … dan tidak diperkenankan menggunakan metode web scrapping/crawling."* Commercial use or distribution needs prior written permission from BEI and/or the original owner of the data. [idx.co.id/id/syarat-penggunaan](https://www.idx.co.id/id/syarat-penggunaan), quoted via search on 2026-10-18 [M] |
| Terms (KSEI cover letter inside the March 2026 PDF) | *"Seluruh Data dan Informasi pada email dengan subject Data Kepemilikan Saham Perusahaan Terbuka di atas 1%, hanya dapat digunakan oleh PT Bursa Efek Indonesia (BEI) sesuai dengan tujuan penggunaan sebagaimana tercantum dalam Keputusan OJK dan Penetapan OJK."* Read from the 2026-03-03 PDF on 2026-10-18 [H]. The OJK decision's stated purpose is to provide the data **to the public**, so our reading is that public non-commercial reuse with citation follows the IDX website terms [L] |
| Personal data | Lists individuals by name. See PRD C6 and §9 item 6 |
| Status | **Portfolio phase: cleared** for non-commercial display, with full citation and access date; the access method breaches the terms by owner decision (D-021). **Product: requires written permission** from BEI (and KSEI) |
| Attribution | "Source: Data Kepemilikan Saham Perusahaan Terbuka di atas 1%, KSEI via PT Bursa Efek Indonesia, record date {date}, accessed {date}, {url}" |
| Parsed counts | 2026-02-27: 7,257 rows, 955 issuers, 5,199 distinct holder names; 244 unclassified rows (D-016, D-022). 2026-03-31 to 2026-09-30: 7,154–7,213 rows and 955–961 issuers a month; 219–255 unclassified rows, except 560 in April. From May, 10–22 rows a month have local/foreign but no type [H] |
| Known issues (2026-02-27 file) | 1. One row breaks total = scripless + scrip: MAYA, MAYAPADA KARUNIA PT (0 + 6,323,076,332 ≠ 6,023,326,332). The row is published as is, with a warning on `/data` (D-015, D-021); 2026-03-31 has one such row too (SMRA) [H]. 2. **Known controlling holders are missing for five companies:** BBRI (largest listed holder 3.63%), BBNI (3.51%), BBTN (4.95%) and ADHI (2.68%), none listing the state or Danantara, while BMRI and TLKM do list Danantara at 51.48% and 51.57%; and NCKL, whose controller Harita Jayaraya is listed at only 3.16%. In each, the holders above 1% total under 15%, which Sigi now treats as "register incomplete" (D-019). An independent pdftotext read of the same file confirms it is the source, not our parser [H]. The cause is not known [L]. 3. The record date is the month's last trading day (27 Feb 2026 was a Friday) [H]. 4. Spelling varies across rows ("PT X" vs "X PT"): 36 candidate groups, of which 33 merges were reviewed (D-018) [H] |

## S2. KSEI monthly holdings, local and foreign (Balancepos)

| Field | Value |
|---|---|
| Publisher | KSEI, ["Unduh Kepemilikan Efek (Lokal-Asing)"](https://web.ksei.co.id/archive_download/holding_composition) |
| Content | Per security: date, code, type, number of securities, **month-end price**, holdings by 9 investor types (IS, CP, PF, IB, ID, MF, SC, FD, OT) for local and foreign separately, plus totals. Inspected 2026-10-18 [H]: `BalanceposEfek20260930.zip` contains one pipe-delimited `.txt` file, 3,752 lines, header beginning `Date|Code|Type|Sec. Num|Price|Local IS|…` |
| Cadence | Monthly; the latest at inspection was 2026-09-30 |
| Access | Not fetched |
| Terms | **Not found.** The KSEI policy page returned HTTP 500 on 2026-10-18. The site footer says "© 2015 PT Kustodian Sentral Efek Indonesia - All rights reserved" [H] |
| Status | **withheld** until KSEI's terms are found or permission is given (PRD F5, Q4) |

## S3. TradingView widgets (display layer)

| Field | Value |
|---|---|
| Content | Embeddable charts, symbol overview, fundamentals, company profile, screener, heatmaps, economic calendar and top stories, using TradingView's licensed data |
| IDX coverage | "IDX Indonesia Stock Exchange: EOD Stocks & Indices" ([available markets, Asia/Pacific](https://www.tradingview.com/widget-docs/markets/asia-pacific/)) [H]. **Verified 2026-10-23 in a browser:** the advanced chart renders `IDX:COMPOSITE` (IHSG), and the screener widget with `market: "indonesia"` lists 888 IDX stocks [H]. Sector index symbols are still to be verified (M3) |
| Terms | Free, with TradingView branding and attribution ([widgets](https://www.tradingview.com/widget/)) [M]. *"Widgets can only display data provided by TradingView, and we don't have an API for feeding your own data into them."* *"It is not possible to download or export data from TradingView."* ([data FAQ](https://www.tradingview.com/widget-docs/faq/data/)) [H]. Clicks can be redirected to our own ticker pages through the "full-size chart URL" setting ([general FAQ](https://www.tradingview.com/widget-docs/faq/general/)) [H]. The widgets set no cookies, but TradingView receives the embedding URL, widget type, symbol and visitor IP (same FAQ) [H]; this must be disclosed in our privacy notice |
| Constraint | **Display only.** Nothing from a widget may be read, stored or used in our own calculations |
| Status | **cleared** (both phases), with attribution unchanged; re-check the commercial clauses before P3 |

## S4. BPS website (official statistics)

| Field | Value |
|---|---|
| Content | CPI, GDP, trade, and other official statistics; release calendar |
| Access | Tables downloaded from the website at a polite cadence, matched to BPS's release calendar. **We don't use the BPS Web API** (S5) |
| Terms | *"The content available on this website is provided to you free of charge, worldwide, on a continuous and non-exclusive basis for the purposes of: (i) using the data for both commercial and non-commercial purposes; (ii) copying, distributing, and/or transmitting the content …"*, provided we *"provide proper citation or credit to BPS-Statistics Indonesia. The citation should include the title of the content, accessed date, the author (if applicable), and a direct link to the original content"* and make no implied endorsement. BPS may block anomalous access patterns. [bps.go.id/en/term-of-use](https://www.bps.go.id/en/term-of-use), read 2026-10-18 [H] |
| Status | **cleared** (both phases), with citation |

## S5. BPS Web API

The API licence is non-sublicensable and forbids selling or *seeking revenue* from the API ([terms](https://webapi.bps.go.id/developer/terms), via a [summary](https://github.com/fabcity/awesome-fabcity-data/issues/15)) [M]. **excluded**: S4 provides the same statistics on better terms.

## S6. Bank Indonesia (BI-Rate, JISDOR, FX reserves, SEKI tables)

| Field | Value |
|---|---|
| Content | [BI-Rate](https://www.bi.go.id/id/statistik/indikator/bi-rate.aspx) (5.75% as of 2026-09-23), [JISDOR](https://www.bi.go.id/en/fungsi-utama/moneter/informasi-kurs/default.aspx) (published every business day), SEKI statistical tables |
| Access | Manual or low-frequency download from the website; no official API was found |
| Terms | **No site-wide terms page found.** Some BI publications say *"Dilarang mengutip atau memperbanyak … tanpa izin tertulis dari Bank Indonesia"* (seen in individual PDFs) [M]. Whether this applies to statistical tables is unknown [L] |
| Status | **Portfolio phase: cleared with citation [L]** (non-commercial factual statistics). **Product: needs written permission**, or replacement with permissively licensed equivalents |

## S7. World Bank Commodity Price Data ("Pink Sheet")

| Field | Value |
|---|---|
| Content | Monthly prices, including coal, palm oil, nickel and gold |
| Terms | Creative Commons Attribution 4.0, with the World Bank Terms of Use for Datasets; attribution must be passed on with any redistribution [M] (stated in a third-party dataset's notice; to re-read on [the World Bank site](https://www.worldbank.org/en/research/commodity-markets) before P1 ships) |
| Status | **cleared** (both phases), with attribution |

## S8. FRED (Federal Reserve Bank of St. Louis)

| Field | Value |
|---|---|
| Content | Global series, e.g. US policy rate and Treasury yields |
| Terms | Free API key; series from third parties keep their own copyright and may carry redistribution limits ([API terms](https://fred.stlouisfed.org/docs/api/terms_of_use.html), via [summary](https://freeapihub.com/apis/fred-api)) [M] |
| Status | **cleared per series.** Only use series whose source note shows public-domain origin (e.g. Federal Reserve Board, US Treasury); record each series' licence in the registry |

## S9. IMF data

Commercial reuse requires permission (*"For any potential commercial reuse of IMF Data, please email copyright@imf.org"*, [IMF copyright](https://www.imf.org/en/about/copyright-and-terms)) [M]. **excluded**; use S7 for commodities.

## S10. News and announcements

| Source | Use | Status |
|---|---|---|
| TradingView "Top Stories" widget | Display only | cleared (S3) |
| Publisher RSS feeds (e.g. Kontan, Bisnis, CNBC Indonesia) | Headline, publisher, time and link only; no article text | Portfolio phase: cleared [L]; product: re-check each publisher's terms |
| MSCI and IDX press releases | Cited and linked in editorial content | cleared (quotation with a link) |
| Web pages the brief agent cites (PRD F12) | Link plus a short factual statement in the agent's own words; never quoted article text; only figures that carry a link | Portfolio phase: cleared [L]; the validator requires a URL for every figure that isn't in the context |

## Excluded sources

| Source | Reason |
|---|---|
| Automated access to idx.co.id (prices, disclosures, XBRL) | Terms forbid scraping or crawling, even for non-commercial use (S1 quote) |
| IDX Data Services licences, Sectors.app, Invezgo, EODHD and other paid feeds | Owner decision: no paid data (PRD C1). For reference, IDX end-of-day licences start at Rp2.3M/month plus a deposit of 300% of the fee (IDX pricelist, May 2026) |
| Yahoo Finance (unofficial endpoints) | No official public API; its terms are understood to limit use to personal use [L], not re-read on 2026-10-18 |
| Any dataset obtained by scraping, or under terms that forbid this use | C2 |

## Review cadence

Re-read every "cleared" row's terms before each phase gate, and whenever a source changes its format or website. Record the date and the result in this file.
