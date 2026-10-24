import type { SourceId } from "../sources/register";

/**
 * The macro series registry (PRD F6). Every series Sigi shows is a row here:
 * what it measures, where it comes from, how often it is released, what Sigi
 * derives from it, and which IDX sectors it bears on and why. The sector
 * links are Sigi's editorial reading, not the source's.
 */

export const GROUPS = {
  indonesia: {
    title: "Indonesia: rates, prices and the rupiah",
    /** IDX sector indices shown beside the group (TradingView, display only). */
    sectorIndices: ["IDX:IDXFINANCE", "IDX:IDXPROPERT"],
  },
  commodities: {
    title: "Commodities Indonesia sells",
    sectorIndices: ["IDX:IDXENERGY", "IDX:IDXBASIC", "IDX:IDXNONCYC"],
  },
  global: {
    title: "Global money",
    sectorIndices: ["IDX:COMPOSITE"],
  },
} as const;
export type GroupId = keyof typeof GROUPS;

/**
 * When the source publishes the next value. Every date computed from this is
 * shown as expected, never as announced.
 * - `business-daily`: each weekday;
 * - `weekly`: once a week, on the given weekday (1 = Monday);
 * - `monthly`: once a month, on the nth business day or around a day of the
 *   month after the period;
 * - `meeting`: at a policy meeting, about monthly, on no fixed day.
 */
export type ReleaseRule =
  | { kind: "business-daily" }
  | { kind: "weekly"; weekday: number }
  | { kind: "monthly"; businessDay: number }
  | { kind: "monthly"; aroundDay: number }
  | { kind: "meeting" };

export interface SectorLink {
  /** An IDX-IC sector name. */
  sector: string;
  rationale: string;
}

export interface SeriesDefinition {
  name: string;
  group: GroupId;
  source: SourceId;
  /** How the source names it, for the citation. */
  sourceName: string;
  unit: string;
  /** How often observations occur (not how often they are released). */
  frequency: "daily" | "monthly" | "meeting";
  decimals: number;
  /** Values outside this band fail the import gate as a misread. */
  plausible: { min: number; max: number };
  /**
   * What Sigi derives and shows beside the published value, labelled as
   * Sigi's calculation: `yoy` is the percentage change on a year earlier;
   * `none` shows only the change on the previous value.
   */
  derived: "yoy" | "none";
  release: ReleaseRule;
  sectors: SectorLink[];
}

export const SERIES = {
  "bi-rate": {
    name: "BI-Rate",
    group: "indonesia",
    source: "S6",
    sourceName: "BI-Rate (BI-7Day Reverse Repo Rate)",
    unit: "%",
    frequency: "meeting",
    decimals: 2,
    plausible: { min: 0, max: 25 },
    derived: "none",
    release: { kind: "meeting" },
    sectors: [
      {
        sector: "Financials",
        rationale:
          "Banks price loans and deposits off the policy rate, so it moves their margins and loan growth.",
      },
      {
        sector: "Properties & Real Estate",
        rationale:
          "Mortgage rates and developers' borrowing costs follow it, and so does demand for housing.",
      },
    ],
  },
  "cpi-yoy": {
    name: "Inflation, year on year",
    group: "indonesia",
    source: "S6",
    sourceName:
      "Data Inflasi (BPS consumer price index, as published by Bank Indonesia)",
    unit: "%",
    frequency: "monthly",
    decimals: 2,
    plausible: { min: -10, max: 100 },
    // Already a year-on-year rate as published; Sigi derives nothing more.
    derived: "none",
    release: { kind: "monthly", businessDay: 1 },
    sectors: [
      {
        sector: "Consumer Non-Cyclicals",
        rationale:
          "Food and staples makers live on the gap between their input costs and what they can pass on.",
      },
      {
        sector: "Financials",
        rationale:
          "Inflation against Bank Indonesia's target sets the path of the BI-Rate.",
      },
    ],
  },
  jisdor: {
    name: "Rupiah per US dollar (JISDOR)",
    group: "indonesia",
    source: "S6",
    sourceName: "JISDOR reference rate",
    unit: "IDR per USD",
    frequency: "daily",
    decimals: 0,
    plausible: { min: 5_000, max: 50_000 },
    derived: "yoy",
    release: { kind: "business-daily" },
    sectors: [
      {
        sector: "Consumer Non-Cyclicals",
        rationale:
          "Importers of wheat, soybeans, milk and packaging pay in dollars and sell in rupiah.",
      },
      {
        sector: "Energy",
        rationale:
          "Coal and oil producers sell in dollars, so a weaker rupiah lifts their rupiah earnings.",
      },
      {
        sector: "Industrials",
        rationale:
          "Companies with dollar debt and imported machinery carry the currency risk.",
      },
    ],
  },
  "fx-reserves": {
    name: "Foreign-exchange reserves",
    group: "indonesia",
    source: "S6",
    sourceName: "Cadangan Devisa",
    unit: "USD million",
    frequency: "monthly",
    decimals: 0,
    plausible: { min: 10_000, max: 1_000_000 },
    derived: "yoy",
    release: { kind: "monthly", aroundDay: 7 },
    sectors: [
      {
        sector: "Financials",
        rationale:
          "Reserves are Bank Indonesia's buffer for defending the rupiah when foreign money leaves.",
      },
    ],
  },
  brent: {
    name: "Crude oil, Brent",
    group: "commodities",
    source: "S7",
    sourceName: "Crude oil, Brent",
    unit: "USD per barrel",
    frequency: "monthly",
    decimals: 2,
    plausible: { min: 1, max: 1_000 },
    derived: "yoy",
    release: { kind: "monthly", businessDay: 2 },
    sectors: [
      {
        sector: "Energy",
        rationale: "Oil and gas producers' revenue follows the oil price.",
      },
      {
        sector: "Transportation & Logistic",
        rationale:
          "Fuel is airlines', shippers' and truckers' largest variable cost.",
      },
    ],
  },
  coal: {
    name: "Coal, Australian (Newcastle)",
    group: "commodities",
    source: "S7",
    sourceName: "Coal, Australian",
    unit: "USD per tonne",
    frequency: "monthly",
    decimals: 2,
    plausible: { min: 1, max: 2_000 },
    derived: "yoy",
    release: { kind: "monthly", businessDay: 2 },
    sectors: [
      {
        sector: "Energy",
        rationale:
          "Indonesia is the largest exporter of thermal coal; Newcastle is the benchmark its export prices track.",
      },
    ],
  },
  "palm-oil": {
    name: "Palm oil",
    group: "commodities",
    source: "S7",
    sourceName: "Palm oil",
    unit: "USD per tonne",
    frequency: "monthly",
    decimals: 0,
    plausible: { min: 10, max: 10_000 },
    derived: "yoy",
    release: { kind: "monthly", businessDay: 2 },
    sectors: [
      {
        sector: "Consumer Non-Cyclicals",
        rationale:
          "Plantation companies, listed under this sector, sell crude palm oil at prices tied to the world price.",
      },
    ],
  },
  nickel: {
    name: "Nickel",
    group: "commodities",
    source: "S7",
    sourceName: "Nickel",
    unit: "USD per tonne",
    frequency: "monthly",
    decimals: 0,
    plausible: { min: 100, max: 200_000 },
    derived: "yoy",
    release: { kind: "monthly", businessDay: 2 },
    sectors: [
      {
        sector: "Basic Materials",
        rationale:
          "Indonesia mines and smelts most of the world's nickel; miners' and smelters' margins follow the price.",
      },
    ],
  },
  tin: {
    name: "Tin",
    group: "commodities",
    source: "S7",
    sourceName: "Tin",
    unit: "USD per tonne",
    frequency: "monthly",
    decimals: 0,
    plausible: { min: 100, max: 200_000 },
    derived: "yoy",
    release: { kind: "monthly", businessDay: 2 },
    sectors: [
      {
        sector: "Basic Materials",
        rationale:
          "Indonesia is among the largest tin exporters; the listed tin miner sells at world prices.",
      },
    ],
  },
  gold: {
    name: "Gold",
    group: "commodities",
    source: "S7",
    sourceName: "Gold",
    unit: "USD per troy ounce",
    frequency: "monthly",
    decimals: 0,
    plausible: { min: 10, max: 50_000 },
    derived: "yoy",
    release: { kind: "monthly", businessDay: 2 },
    sectors: [
      {
        sector: "Basic Materials",
        rationale:
          "Gold miners' revenue follows the gold price; their costs are mostly in rupiah.",
      },
    ],
  },
  "fed-funds": {
    name: "US federal funds target, upper bound",
    group: "global",
    source: "S8",
    sourceName: "Federal Funds Target Range - Upper Limit [DFEDTARU]",
    unit: "%",
    frequency: "daily",
    decimals: 2,
    plausible: { min: 0, max: 25 },
    derived: "none",
    release: { kind: "business-daily" },
    sectors: [
      {
        sector: "Financials",
        rationale:
          "The gap between US and Indonesian rates steers foreign money into or out of rupiah assets, and with it the room Bank Indonesia has to cut.",
      },
    ],
  },
  "us-10y": {
    name: "US Treasury yield, 10 years",
    group: "global",
    source: "S8",
    sourceName:
      "Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity [DGS10]",
    unit: "%",
    frequency: "daily",
    decimals: 2,
    plausible: { min: -5, max: 25 },
    derived: "none",
    release: { kind: "business-daily" },
    sectors: [
      {
        sector: "Financials",
        rationale:
          "Foreign holders compare Indonesian government bond yields with it; higher US yields pull money out.",
      },
      {
        sector: "Properties & Real Estate",
        rationale: "Long-duration assets are valued against long-term rates.",
      },
    ],
  },
  "usd-broad": {
    name: "US dollar, broad index",
    group: "global",
    source: "S8",
    sourceName: "Nominal Broad U.S. Dollar Index [DTWEXBGS]",
    unit: "index (Jan 2006 = 100)",
    frequency: "daily",
    decimals: 2,
    plausible: { min: 10, max: 1_000 },
    derived: "yoy",
    release: { kind: "weekly", weekday: 1 },
    sectors: [
      {
        sector: "Consumer Non-Cyclicals",
        rationale:
          "A stronger dollar usually means a weaker rupiah and dearer imported inputs.",
      },
      {
        sector: "Energy",
        rationale:
          "Commodity exporters gain in rupiah when the dollar strengthens.",
      },
    ],
  },
} as const satisfies Record<string, SeriesDefinition>;
export type SeriesId = keyof typeof SERIES;

export function seriesOf(id: string): SeriesDefinition | undefined {
  return (SERIES as Record<string, SeriesDefinition>)[id];
}
