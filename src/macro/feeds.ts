import type { SourceId } from "../sources/register";
import {
  type BiLayout,
  type FredId,
  type MacroParseResult,
  parseBiExport,
  parseFredCsv,
  parsePinkSheet,
} from "./parse";
import type { SeriesId } from "./series";

/**
 * A feed is one file the worker fetches: one Bank Indonesia export, the
 * World Bank's monthly workbook, or one FRED CSV. Each file is a full history
 * of its series, so a published file replaces them whole.
 */
export interface FeedDefinition {
  source: SourceId;
  title: string;
  /** The page a reader can open to see the same figures. */
  pageUrl: string;
  /** Bumped when the parser changes what it reads. */
  parserVersion: string;
  extension: "xlsx" | "csv";
  series: readonly SeriesId[];
  parse(bytes: Uint8Array): MacroParseResult;
}

const biFeed = (
  layout: BiLayout,
  title: string,
  pageUrl: string,
  series: SeriesId,
): FeedDefinition => ({
  source: "S6",
  title,
  pageUrl,
  parserVersion: `${layout}-xlsx/1`,
  extension: "xlsx",
  series: [series],
  parse: (bytes) => parseBiExport(layout, bytes),
});

const fredFeed = (id: FredId, series: SeriesId): FeedDefinition => ({
  source: "S8",
  title: `FRED ${id}`,
  pageUrl: `https://fred.stlouisfed.org/series/${id}`,
  parserVersion: "fred-csv/1",
  extension: "csv",
  series: [series],
  parse: (bytes) => parseFredCsv(id, bytes),
});

export const FEEDS = {
  "bi-rate": biFeed(
    "bi-rate",
    "BI-Rate",
    "https://www.bi.go.id/id/statistik/indikator/bi-rate.aspx",
    "bi-rate",
  ),
  "bi-inflation": biFeed(
    "bi-inflation",
    "Data Inflasi",
    "https://www.bi.go.id/id/statistik/indikator/data-inflasi.aspx",
    "cpi-yoy",
  ),
  "bi-jisdor": biFeed(
    "bi-jisdor",
    "Informasi Kurs JISDOR",
    "https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx",
    "jisdor",
  ),
  "bi-reserves": biFeed(
    "bi-reserves",
    "Cadangan Devisa",
    "https://www.bi.go.id/id/statistik/indikator/cadangan-devisa.aspx",
    "fx-reserves",
  ),
  "wb-pink-sheet": {
    source: "S7",
    title: "World Bank Commodity Price Data (The Pink Sheet), monthly",
    pageUrl: "https://www.worldbank.org/en/research/commodity-markets",
    parserVersion: "pink-sheet/1",
    extension: "xlsx",
    series: ["brent", "coal", "palm-oil", "nickel", "tin", "gold"],
    parse: parsePinkSheet,
  },
  "fred-DFEDTARU": fredFeed("DFEDTARU", "fed-funds"),
  "fred-DGS10": fredFeed("DGS10", "us-10y"),
  "fred-DTWEXBGS": fredFeed("DTWEXBGS", "usd-broad"),
} as const satisfies Record<string, FeedDefinition>;
export type FeedId = keyof typeof FEEDS;

/** The worker's feed for the exchange's ownership page (S1), not a macro feed. */
export const S1_FEED = "idx-s1";

const feedBySeries = new Map<SeriesId, FeedId>(
  (Object.entries(FEEDS) as [FeedId, FeedDefinition][]).flatMap(
    ([feed, definition]) =>
      definition.series.map((series) => [series, feed] as const),
  ),
);

/** The feed that publishes a series; every series has exactly one. */
export function feedOf(series: SeriesId): FeedId {
  const feed = feedBySeries.get(series);
  if (!feed) throw new Error(`no feed publishes ${series}`);
  return feed;
}
