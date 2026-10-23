/**
 * Who a holder is, across rows, companies and months (PRD F4).
 *
 * Identity is decided in two steps and nothing else:
 *  1. Mechanical normalisation: upper case, full stops and commas removed,
 *     whitespace collapsed. "PT. Beyond Media" and "PT BEYOND MEDIA" are the
 *     same string after it; no word is added, dropped or reordered.
 *  2. The reviewed alias table below, one row per decision, each with its
 *     reason. Word order, "PT"/"TBK" placement and abbreviations are merged only
 *     there. Nothing is ever merged by similarity.
 */

import { holderKind } from "./investor-classes";

export interface HolderAlias {
  /** The published spelling, after mechanical normalisation. */
  alias: string;
  /** The spelling it is shown and counted as, after mechanical normalisation. */
  canonical: string;
  reason: string;
  reviewedOn: string;
}

/**
 * Reviewed merges. Candidates come from `pnpm holders:candidates`, which lists
 * names that become equal once legal-form words are dropped and the rest
 * sorted; a candidate is added here only after reading both spellings in the
 * source rows (same issuer list, type and domicile pattern).
 */
export const HOLDER_ALIASES: readonly HolderAlias[] = [
  {
    alias: "TIARA INTIMAHKOTA",
    canonical: "PT TIARA INTIMAHKOTA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AKPI.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "PRISMATAMA NUGRAHA",
    canonical: "PT PRISMATAMA NUGRAHA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AKPI.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "HUSIN INVESTAMA PT",
    canonical: "PT HUSIN INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ALMI, INAI.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "PANINVEST TBK PT",
    canonical: "PT PANINVEST TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AMAG, BMSR, GWSA, PNBN, PNLF.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "PAN PACIFIC INVESTAMA PT",
    canonical: "PT PAN PACIFIC INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: APIC.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "ARGO MANUNGGAL LAND DEVELOPMENT",
    canonical: "PT ARGO MANUNGGAL LAND DEVELOPMENT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ARGO, BEST.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "NGRUMAT BONDO UTOMO PT",
    canonical: "PT NGRUMAT BONDO UTOMO",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ASBI, SDPC, SMDR.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "DAYA ADICIPTA MUSTIKA",
    canonical: "PT DAYA ADICIPTA MUSTIKA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ASSA, TAPG.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "SUNSONINDO TEXTILE INVESTAMA PT",
    canonical: "PT SUNSONINDO TEXTILE INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BBSI, SSTM.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "VICTORIA INVESTAMA TBK",
    canonical: "PT VICTORIA INVESTAMA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BIPP, BMSR, BPFI, BPTR, BVIC, MGNA, RIMO, SGER, VINS.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "BUDIMAN KENCANA LESTARI",
    canonical: "PT BUDIMAN KENCANA LESTARI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BNBA, CNTX.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "BARITO PACIFIC TBK",
    canonical: "PT BARITO PACIFIC TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BREN, TPIA.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "PARAGA ARTAMIDA PT",
    canonical: "PT PARAGA ARTAMIDA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BSDE.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "SINAR MAS MULTIARTHA TBK",
    canonical: "PT SINAR MAS MULTIARTHA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BSIM, DWGL, IIKP, LIFE, RIMO, TDPM.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "CITRA BORNEO INDAH",
    canonical: "PT CITRA BORNEO INDAH",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CBUT, SSMS.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "PROSPECT MOTOR",
    canonical: "PT PROSPECT MOTOR",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CNTX, TFCO.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "BUNDAMEDIK TBK PT",
    canonical: "PT BUNDAMEDIK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DGNS.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "SUPER CAPITAL INDONESIA PT",
    canonical: "PT SUPER CAPITAL INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: FOOD, SURE.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "PANIN FINANCIAL TBK",
    canonical: "PT PANIN FINANCIAL TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GWSA, PNBN.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "APP PURINUSA EKAPERSADA",
    canonical: "PT APP PURINUSA EKAPERSADA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: INKP, MCOR, TKIM, UCID.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "JEMBO CABLE COMPANY TBK",
    canonical: "PT JEMBO CABLE COMPANY TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: JECC, TBMS.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "JAYA RAYA UTAMA PT",
    canonical: "PT JAYA RAYA UTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: JRPT, TMPO.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "MAJU SELARAS JAYAMERTA",
    canonical: "PT MAJU SELARAS JAYAMERTA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MSJA.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "ARTHA PERDANA INVESTAMA PT",
    canonical: "PT ARTHA PERDANA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: NICL, TRUS.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "CITRAJAYA PERKASAMULIA PT",
    canonical: "PT CITRAJAYA PERKASAMULIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PICO.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "MULTIKARSA INVESTAMA PT",
    canonical: "PT MULTIKARSA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: POLY.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "THE FURUKAWA ELECTRIC CO LTD",
    canonical: "FURUKAWA ELECTRIC CO LTD",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SCCO, TBMS.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "SAMUDERA INDONESIA TANGGUH",
    canonical: "SAMUDERA INDONESIA TANGGUH PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SMDR.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "MULTIFORTUNA ASINDO",
    canonical: "MULTIFORTUNA ASINDO PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SPTO, TOTO.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "SURYAPARAMITRA ABADI",
    canonical: "PT SURYAPARAMITRA ABADI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SPTO, TOTO.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "SUNTERRA INDONESIA PT",
    canonical: "PT SUNTERRA INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TRGU.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "TRISULA INSAN TIARA",
    canonical: "PT TRISULA INSAN TIARA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TRIS.",
    reviewedOn: "2026-10-23",
  },
  {
    alias: "WINTERMARJAYA LESTARI PT",
    canonical: "PT WINTERMARJAYA LESTARI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: WINS.",
    reviewedOn: "2026-10-23",
  },
];

export function normaliseHolderName(name: string): string {
  return name.toUpperCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
}

const aliasTable = new Map(
  HOLDER_ALIASES.map((row) => [row.alias, row.canonical] as const),
);

/** The key every page and metric uses for "the same holder". */
export function holderKey(name: string): string {
  const normalised = normaliseHolderName(name);
  return aliasTable.get(normalised) ?? normalised;
}

/** URL slug for a holder key; reversible through the holder index, not by parsing. */
export function holderSlug(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Whether a holder may have its own page (PRD C6). Every row published under
 * the holder must be an institution: one row typed as an individual, left
 * unclassified, or carrying a type Sigi does not recognise, and there is no
 * page. Fails closed.
 */
export function mayHaveHolderPage(types: Iterable<string | null>): boolean {
  let seen = false;
  for (const type of types) {
    if (holderKind(type) !== "institution") return false;
    seen = true;
  }
  return seen;
}
