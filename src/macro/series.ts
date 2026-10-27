import type { Text } from "../i18n/define";
import type { SourceId } from "../sources/register";

/**
 * The macro series registry (PRD F6). Every series Sigi shows is a row here:
 * what it measures, where it comes from, how often it is released, what Sigi
 * derives from it, and which IDX sectors it bears on and why. The sector
 * links are Sigi's editorial reading, not the source's.
 */

export const GROUPS = {
  indonesia: {
    title: {
      en: "Indonesia: rates, prices and the rupiah",
      id: "Indonesia: suku bunga, harga, dan rupiah",
    },
    /** IDX sector indices shown beside the group (TradingView, display only). */
    sectorIndices: ["IDX:IDXFINANCE", "IDX:IDXPROPERT"],
  },
  commodities: {
    title: {
      en: "Commodities Indonesia sells",
      id: "Komoditas yang dijual Indonesia",
    },
    sectorIndices: ["IDX:IDXENERGY", "IDX:IDXBASIC", "IDX:IDXNONCYC"],
  },
  global: {
    title: { en: "Global money", id: "Uang global" },
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
  rationale: Text;
}

export interface SeriesDefinition {
  name: Text;
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
    name: { en: "BI-Rate", id: "BI-Rate" },
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
        rationale: {
          en: "Banks price loans and deposits off the policy rate, so it moves their margins and loan growth.",
          id: "Bank menetapkan bunga kredit dan simpanan mengikuti suku bunga acuan, sehingga BI-Rate memengaruhi margin dan pertumbuhan kredit mereka.",
        },
      },
      {
        sector: "Properties & Real Estate",
        rationale: {
          en: "Mortgage rates and developers' borrowing costs follow it, and so does demand for housing.",
          id: "Suku bunga KPR dan biaya pinjaman pengembang mengikutinya, begitu pula permintaan hunian.",
        },
      },
    ],
  },
  "cpi-yoy": {
    name: { en: "Inflation, year on year", id: "Inflasi, tahun ke tahun" },
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
        rationale: {
          en: "Food and staples makers live on the gap between their input costs and what they can pass on.",
          id: "Produsen pangan dan kebutuhan pokok hidup dari selisih antara biaya bahan baku dan harga yang bisa mereka teruskan ke konsumen.",
        },
      },
      {
        sector: "Financials",
        rationale: {
          en: "Inflation against Bank Indonesia's target sets the path of the BI-Rate.",
          id: "Inflasi terhadap target Bank Indonesia menentukan arah BI-Rate.",
        },
      },
    ],
  },
  jisdor: {
    name: {
      en: "Rupiah per US dollar (JISDOR)",
      id: "Rupiah per dolar AS (JISDOR)",
    },
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
        rationale: {
          en: "Importers of wheat, soybeans, milk and packaging pay in dollars and sell in rupiah.",
          id: "Importir gandum, kedelai, susu, dan kemasan membayar dalam dolar dan menjual dalam rupiah.",
        },
      },
      {
        sector: "Energy",
        rationale: {
          en: "Coal and oil producers sell in dollars, so a weaker rupiah lifts their rupiah earnings.",
          id: "Produsen batu bara dan minyak menjual dalam dolar, sehingga rupiah yang melemah mengangkat pendapatan rupiah mereka.",
        },
      },
      {
        sector: "Industrials",
        rationale: {
          en: "Companies with dollar debt and imported machinery carry the currency risk.",
          id: "Perusahaan dengan utang dolar dan mesin impor menanggung risiko kurs.",
        },
      },
    ],
  },
  "fx-reserves": {
    name: { en: "Foreign-exchange reserves", id: "Cadangan devisa" },
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
        rationale: {
          en: "Reserves are Bank Indonesia's buffer for defending the rupiah when foreign money leaves.",
          id: "Cadangan adalah penyangga Bank Indonesia untuk menjaga rupiah ketika dana asing keluar.",
        },
      },
    ],
  },
  "reer-idr": {
    name: {
      en: "Rupiah, real effective exchange rate",
      id: "Kurs efektif riil rupiah",
    },
    group: "indonesia",
    source: "S11",
    sourceName: "Real effective exchange rate, broad basket (64 economies)",
    unit: "index (2020 = 100)",
    frequency: "monthly",
    decimals: 2,
    plausible: { min: 10, max: 500 },
    derived: "yoy",
    release: { kind: "monthly", aroundDay: 15 },
    sectors: [
      {
        sector: "Basic Materials",
        rationale: {
          en: "Exporters of metals and chemicals lose price competitiveness against foreign rivals when the rupiah rises in real terms, and gain it when it falls.",
          id: "Eksportir logam dan bahan kimia kehilangan daya saing harga terhadap pesaing asing ketika rupiah menguat secara riil, dan memperolehnya ketika rupiah melemah.",
        },
      },
      {
        sector: "Consumer Non-Cyclicals",
        rationale: {
          en: "Makers that import ingredients and packaging pay less for them when the rupiah is dearer in real terms.",
          id: "Produsen yang mengimpor bahan baku dan kemasan membayar lebih murah untuknya ketika rupiah lebih mahal secara riil.",
        },
      },
    ],
  },
  brent: {
    name: { en: "Crude oil, Brent", id: "Minyak mentah, Brent" },
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
        rationale: {
          en: "Oil and gas producers' revenue follows the oil price.",
          id: "Pendapatan produsen minyak dan gas mengikuti harga minyak.",
        },
      },
      {
        sector: "Transportation & Logistic",
        rationale: {
          en: "Fuel is airlines', shippers' and truckers' largest variable cost.",
          id: "Bahan bakar adalah biaya variabel terbesar maskapai, perusahaan pelayaran, dan pengusaha truk.",
        },
      },
    ],
  },
  coal: {
    name: {
      en: "Coal, Australian (Newcastle)",
      id: "Batu bara, Australia (Newcastle)",
    },
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
        rationale: {
          en: "Indonesia is the largest exporter of thermal coal; Newcastle is the benchmark its export prices track.",
          id: "Indonesia adalah eksportir batu bara termal terbesar; Newcastle adalah acuan yang diikuti harga ekspornya.",
        },
      },
    ],
  },
  "palm-oil": {
    name: { en: "Palm oil", id: "Minyak sawit" },
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
        rationale: {
          en: "Plantation companies, listed under this sector, sell crude palm oil at prices tied to the world price.",
          id: "Perusahaan perkebunan, yang tercatat di sektor ini, menjual minyak sawit mentah dengan harga yang terkait harga dunia.",
        },
      },
    ],
  },
  nickel: {
    name: { en: "Nickel", id: "Nikel" },
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
        rationale: {
          en: "Indonesia mines and smelts most of the world's nickel; miners' and smelters' margins follow the price.",
          id: "Indonesia menambang dan memurnikan sebagian besar nikel dunia; margin penambang dan smelter mengikuti harganya.",
        },
      },
    ],
  },
  tin: {
    name: { en: "Tin", id: "Timah" },
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
        rationale: {
          en: "Indonesia is among the largest tin exporters; the listed tin miner sells at world prices.",
          id: "Indonesia termasuk eksportir timah terbesar; penambang timah yang tercatat menjual dengan harga dunia.",
        },
      },
    ],
  },
  gold: {
    name: { en: "Gold", id: "Emas" },
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
        rationale: {
          en: "Gold miners' revenue follows the gold price; their costs are mostly in rupiah.",
          id: "Pendapatan penambang emas mengikuti harga emas; sebagian besar biaya mereka dalam rupiah.",
        },
      },
    ],
  },
  "fed-funds": {
    name: {
      en: "US federal funds target, upper bound",
      id: "Target dana federal AS, batas atas",
    },
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
        rationale: {
          en: "The gap between US and Indonesian rates steers foreign money into or out of rupiah assets, and with it the room Bank Indonesia has to cut.",
          id: "Selisih suku bunga AS dan Indonesia mengarahkan dana asing masuk atau keluar dari aset rupiah, dan dengan itu ruang Bank Indonesia untuk menurunkan suku bunga.",
        },
      },
    ],
  },
  "us-10y": {
    name: {
      en: "US Treasury yield, 10 years",
      id: "Imbal hasil Treasury AS, 10 tahun",
    },
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
        rationale: {
          en: "Foreign holders compare Indonesian government bond yields with it; higher US yields pull money out.",
          id: "Pemegang asing membandingkan imbal hasil obligasi pemerintah Indonesia dengan imbal hasil ini; imbal hasil AS yang lebih tinggi menarik dana keluar.",
        },
      },
      {
        sector: "Properties & Real Estate",
        rationale: {
          en: "Long-duration assets are valued against long-term rates.",
          id: "Aset berdurasi panjang dinilai terhadap suku bunga jangka panjang.",
        },
      },
    ],
  },
  "usd-broad": {
    name: { en: "US dollar, broad index", id: "Dolar AS, indeks luas" },
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
        rationale: {
          en: "A stronger dollar usually means a weaker rupiah and dearer imported inputs.",
          id: "Dolar yang lebih kuat biasanya berarti rupiah lebih lemah dan bahan baku impor lebih mahal.",
        },
      },
      {
        sector: "Energy",
        rationale: {
          en: "Commodity exporters gain in rupiah when the dollar strengthens.",
          id: "Eksportir komoditas diuntungkan dalam rupiah ketika dolar menguat.",
        },
      },
    ],
  },
  "usd-cny": {
    name: {
      en: "Chinese yuan per US dollar",
      id: "Yuan China per dolar AS",
    },
    group: "global",
    source: "S8",
    sourceName:
      "Chinese Yuan Renminbi to U.S. Dollar Spot Exchange Rate [DEXCHUS]",
    unit: "CNY per USD",
    frequency: "daily",
    decimals: 4,
    plausible: { min: 1, max: 20 },
    derived: "yoy",
    release: { kind: "weekly", weekday: 1 },
    sectors: [
      {
        sector: "Energy",
        rationale: {
          en: "China is among the largest buyers of Indonesian coal, which is priced in dollars, so a weaker yuan makes it dearer for Chinese buyers.",
          id: "China adalah salah satu pembeli batu bara Indonesia terbesar, yang dihargai dalam dolar, sehingga yuan yang melemah membuatnya lebih mahal bagi pembeli China.",
        },
      },
      {
        sector: "Basic Materials",
        rationale: {
          en: "Much of Indonesia's nickel goes to Chinese mills, so the yuan sets how dear it is for them.",
          id: "Sebagian besar nikel Indonesia dikirim ke pabrik di China, sehingga yuan menentukan seberapa mahal nikel itu bagi mereka.",
        },
      },
    ],
  },
  "usd-inr": {
    name: {
      en: "Indian rupees per US dollar",
      id: "Rupee India per dolar AS",
    },
    group: "global",
    source: "S8",
    sourceName: "Indian Rupees to U.S. Dollar Spot Exchange Rate [DEXINUS]",
    unit: "INR per USD",
    frequency: "daily",
    decimals: 2,
    plausible: { min: 10, max: 500 },
    derived: "yoy",
    release: { kind: "weekly", weekday: 1 },
    sectors: [
      {
        sector: "Energy",
        rationale: {
          en: "India is among the largest buyers of Indonesian coal, which is priced in dollars, so a weaker rupee makes it dearer for Indian buyers.",
          id: "India adalah salah satu pembeli batu bara Indonesia terbesar, yang dihargai dalam dolar, sehingga rupee yang melemah membuatnya lebih mahal bagi pembeli India.",
        },
      },
      {
        sector: "Consumer Non-Cyclicals",
        rationale: {
          en: "India is among the largest buyers of Indonesian palm oil, so a weaker rupee makes it dearer there and can slow orders.",
          id: "India adalah salah satu pembeli minyak sawit Indonesia terbesar, sehingga rupee yang melemah membuatnya lebih mahal di sana dan dapat memperlambat pesanan.",
        },
      },
    ],
  },
} as const satisfies Record<string, SeriesDefinition>;
export type SeriesId = keyof typeof SERIES;

export function seriesOf(id: string): SeriesDefinition | undefined {
  return (SERIES as Record<string, SeriesDefinition>)[id];
}
