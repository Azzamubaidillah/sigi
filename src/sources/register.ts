/**
 * The data-source register in code (docs/DATA-SOURCES.md is the full record:
 * quotes, dates, confidence). Every figure a page shows cites a `SourceId`,
 * so a figure from an unregistered source does not type-check (PRD C3).
 */

export type SourceStatus =
  "cleared" | "cleared-portfolio" | "admin-only" | "excluded";

export interface SourceEntry {
  name: string;
  publisher: string;
  url: string;
  status: SourceStatus;
  /** One line on what the terms allow, for the public sources page. */
  terms: string;
  /** Whether Sigi uses it today. */
  live: boolean;
}

export const SOURCES = {
  S1: {
    name: "Holders above 1% (monthly)",
    publisher:
      "PT Bursa Efek Indonesia (announcements); data from PT Kustodian Sentral Efek Indonesia",
    url: "https://www.idx.co.id/id/berita/pengumuman/",
    status: "cleared-portfolio",
    terms:
      "Non-commercial use with full citation and access date; no scraping. Downloaded by hand and uploaded.",
    live: true,
  },
  S2: {
    name: "KSEI monthly holdings, local and foreign",
    publisher: "PT Kustodian Sentral Efek Indonesia",
    url: "https://web.ksei.co.id/archive_download/holding_composition",
    status: "admin-only",
    terms: "Terms not found; not shown publicly until they are.",
    live: false,
  },
  S3: {
    name: "TradingView widgets",
    publisher: "TradingView",
    url: "https://www.tradingview.com/widget/",
    status: "cleared",
    terms: "Display-only embeds with TradingView's attribution kept intact.",
    live: false,
  },
  S4: {
    name: "BPS website tables",
    publisher: "Badan Pusat Statistik",
    url: "https://www.bps.go.id/",
    status: "cleared",
    terms: "Reuse with citation.",
    live: false,
  },
  S5: {
    name: "BPS Web API",
    publisher: "Badan Pusat Statistik",
    url: "https://webapi.bps.go.id/",
    status: "excluded",
    terms:
      "Excluded: the API licence forbids seeking revenue; the BPS website (S4) has the same statistics.",
    live: false,
  },
  S6: {
    name: "Bank Indonesia statistics",
    publisher: "Bank Indonesia",
    url: "https://www.bi.go.id/",
    status: "cleared-portfolio",
    terms: "Non-commercial display with citation.",
    live: false,
  },
  S7: {
    name: "World Bank commodity prices (Pink Sheet)",
    publisher: "World Bank",
    url: "https://www.worldbank.org/en/research/commodity-markets",
    status: "cleared",
    terms: "CC BY 4.0, with attribution.",
    live: false,
  },
  S8: {
    name: "FRED public-domain series",
    publisher: "Federal Reserve Bank of St. Louis",
    url: "https://fred.stlouisfed.org/",
    status: "cleared",
    terms: "Only series whose source is in the public domain.",
    live: false,
  },
  S9: {
    name: "IMF data",
    publisher: "International Monetary Fund",
    url: "https://www.imf.org/en/about/copyright-and-terms",
    status: "excluded",
    terms: "Excluded: commercial reuse needs permission.",
    live: false,
  },
  S10: {
    name: "News and announcements",
    publisher: "Publisher RSS feeds; MSCI and IDX press releases",
    url: "https://www.idx.co.id/",
    status: "cleared-portfolio",
    terms: "Headline, publisher, time and link only.",
    live: false,
  },
} as const satisfies Record<string, SourceEntry>;

export type SourceId = keyof typeof SOURCES;

export const STATUS_LABELS: Record<SourceStatus, string> = {
  cleared: "Cleared",
  "cleared-portfolio": "Cleared for non-commercial use",
  "admin-only": "Admin only",
  excluded: "Excluded",
};
