/**
 * The exchange's free-float rule and the dates around it (PRD F3). Every fact
 * carries its source; secondary reporting is marked as such, because the rule
 * text itself (revised Peraturan Bursa I-A) was not read in full.
 */

import type { Text } from "../i18n/define";

export interface SourcedFact {
  url: string;
  publisher: string;
  /** "primary" when read on the issuing body's own page. */
  kind: "primary" | "secondary";
}

const tirto: SourcedFact = {
  url: "https://tirto.id/bei-kerek-batas-free-float-jadi-15-masa-transisi-sampai-2029-htAU",
  publisher: "Tirto",
  kind: "secondary",
};
const kontan: SourcedFact = {
  url: "https://investasi.kontan.co.id/news/328-emiten-berjibaku-penuhi-ketentuan-minimal-free-float-15",
  publisher: "Kontan, 9 Oct 2026",
  kind: "secondary",
};
const idxChannel: SourcedFact = {
  url: "https://www.idxchannel.com/market-news/bei-kejar-358-emiten-yang-belum-penuhi-aturan-free-float",
  publisher: "IDX Channel, 18 Oct 2026",
  kind: "secondary",
};
const msci: SourcedFact = {
  url: "https://ir.msci.com/news-releases/news-release-details/msci-launches-consultation-proposal-reclassify-indonesia",
  publisher: "MSCI",
  kind: "primary",
};

export const FREE_FLOAT_MINIMUM_HUNDREDTHS = 1_500;
export const INTERIM_MINIMUM_HUNDREDTHS = 1_250;

/** The staged deadlines, by market capitalisation and free float on 31 March 2026. */
export const TRANCHES = {
  "large-low": {
    label: {
      en: "Market cap at least Rp5 trillion, free float below 12.5%",
      id: "Kapitalisasi pasar minimal Rp5 triliun, free float di bawah 12,5%",
    },
    short: { en: "If Rp5T or more", id: "Jika Rp5 T atau lebih" },
    deadlines: [
      { date: "2027-03-31", requiredHundredths: 1_250 },
      { date: "2028-03-31", requiredHundredths: 1_500 },
    ],
  },
  "large-near": {
    label: {
      en: "Market cap at least Rp5 trillion, free float 12.5% to 15%",
      id: "Kapitalisasi pasar minimal Rp5 triliun, free float 12,5% sampai 15%",
    },
    short: {
      en: "If Rp5T or more and at 12.5%",
      id: "Jika Rp5 T atau lebih dan sebesar 12,5%",
    },
    deadlines: [{ date: "2027-03-31", requiredHundredths: 1_500 }],
  },
  small: {
    label: {
      en: "Market cap below Rp5 trillion",
      id: "Kapitalisasi pasar di bawah Rp5 triliun",
    },
    short: { en: "If under Rp5T", id: "Jika di bawah Rp5 T" },
    deadlines: [{ date: "2029-03-31", requiredHundredths: 1_500 }],
  },
} as const satisfies Record<
  string,
  {
    label: Text;
    short: Text;
    deadlines: readonly { date: string; requiredHundredths: number }[];
  }
>;
export type Tranche = keyof typeof TRANCHES;
export const RULE_SOURCES: readonly SourcedFact[] = [tirto, kontan];

/**
 * The tranches a company could be in, given an upper bound on its free float.
 * Which one applies depends on market capitalisation, which Sigi does not
 * have (no stored prices, PRD C1; the KSEI file's prices are not cleared,
 * F5). Since the official figure is at most the bound, a bound under 12.5%
 * rules out the 12.5–15% tranche; a bound of 12.5–15% rules out nothing.
 */
export function possibleTranches(upperBoundHundredths: number): Tranche[] {
  if (upperBoundHundredths >= FREE_FLOAT_MINIMUM_HUNDREDTHS) return [];
  return upperBoundHundredths < INTERIM_MINIMUM_HUNDREDTHS
    ? ["large-low", "small"]
    : ["large-low", "large-near", "small"];
}

export interface OfficialCount {
  asOf: string;
  belowMinimum: number;
  listed: number | null;
  byTranche: Record<Tranche, number> | null;
  /** Market-wide average free float, hundredths of a percent, when published. */
  averageHundredths: number | null;
  source: SourcedFact;
}

/** The exchange's own counts of companies below 15%, as reported. */
export const OFFICIAL_COUNTS: readonly OfficialCount[] = [
  {
    asOf: "2026-03-31",
    belowMinimum: 328,
    listed: null,
    // Kontan prints the middle group as "12%-15%"; the rule's line is 12.5%.
    byTranche: { "large-low": 63, "large-near": 18, small: 247 },
    averageHundredths: null,
    source: kontan,
  },
  {
    asOf: "2026-09-30",
    belowMinimum: 358,
    listed: 918,
    byTranche: null,
    averageHundredths: 2_299,
    source: idxChannel,
  },
];

export interface TimelineEvent {
  date: string;
  label: Text;
  source: SourcedFact;
}

export const TIMELINE: readonly TimelineEvent[] = [
  {
    date: "2026-03-31",
    label: {
      en: "Revised Peraturan Bursa I-A takes effect: free-float minimum rises to 15%",
      id: "Peraturan Bursa I-A yang direvisi berlaku: batas minimal free float naik menjadi 15%",
    },
    source: tirto,
  },
  {
    date: "2026-10-15",
    label: {
      en: "MSCI opens a consultation on reclassifying Indonesia from Emerging to Standalone",
      id: "MSCI membuka konsultasi untuk mengklasifikasikan ulang Indonesia dari Emerging menjadi Standalone",
    },
    source: msci,
  },
  {
    date: "2027-03-31",
    label: {
      en: "First free-float deadline: large caps to 12.5% (or to 15% if already at 12.5%)",
      id: "Tenggat free float pertama: emiten kapitalisasi besar ke 12,5% (atau ke 15% jika sudah di 12,5%)",
    },
    source: tirto,
  },
  {
    date: "2027-04-30",
    label: {
      en: "MSCI consultation feedback closes",
      id: "Masukan untuk konsultasi MSCI ditutup",
    },
    source: msci,
  },
  {
    date: "2027-06-30",
    label: {
      en: "MSCI decision due, on or before this date",
      id: "Keputusan MSCI diumumkan paling lambat pada tanggal ini",
    },
    source: msci,
  },
  {
    date: "2028-03-31",
    label: {
      en: "Large caps below 12.5% in March 2026 reach 15%",
      id: "Emiten kapitalisasi besar yang di bawah 12,5% pada Maret 2026 mencapai 15%",
    },
    source: tirto,
  },
  {
    date: "2029-03-31",
    label: {
      en: "Companies under Rp5 trillion market cap reach 15%",
      id: "Emiten berkapitalisasi di bawah Rp5 triliun mencapai 15%",
    },
    source: tirto,
  },
];
