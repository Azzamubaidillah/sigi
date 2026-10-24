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
  {
    alias: "SARATOGA INVESTAMA SEDAYA TBK",
    canonical: "SARATOGA INVESTAMA SEDAYA TBK PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AADI, ADRO, AGII, BBYB, MDKA, MPMX, NRCA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PERSADA CAPITAL INVESTAMA",
    canonical: "PT PERSADA CAPITAL INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AADI, DSNG, MPMX, SSIA, TAPG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KAIROS EKSPRES INTERNASIONAL PT",
    canonical: "PT KAIROS EKSPRES INTERNASIONAL",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ABBA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SINAR TERANG ASIA RAYA PT",
    canonical: "PT SINAR TERANG ASIA RAYA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AGAR.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BENGAWAN TIMUR LAJU PT",
    canonical: "PT BENGAWAN TIMUR LAJU",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AGAR.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BANK RAKYAT INDONESIA (PERSERO) PT",
    canonical: "PT BANK RAKYAT INDONESIA (PERSERO) TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AGRO, BRIS, KBLM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "INDUSTRIAL BANK OF KOREA",
    canonical: "PT INDUSTRIAL BANK OF KOREA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AGRS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ASURANSI SIMAS JIWA",
    canonical: "PT ASURANSI SIMAS JIWA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AISA, ARII, BIPI, DWGL, ELTY, IKAI, LIFE, MKNT, NATO, PTIS, UNSP.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PRISMATAMA NUGRAHA PT",
    canonical: "PT PRISMATAMA NUGRAHA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AKPI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "NAWA PANDUTA",
    canonical: "NAWA PANDUTA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AKPI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ARTHAKENCANA RAYATAMA PT",
    canonical: "PT ARTHAKENCANA RAYATAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AKRA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GESIT PERKASA",
    canonical: "PT GESIT PERKASA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ALKA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GESIT PERKASA PT",
    canonical: "PT GESIT PERKASA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ALKA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SANTINILESTARI LOKAPRIMA",
    canonical: "PT SANTINILESTARI LOKAPRIMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ALKA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MARINDO INVESTAMA",
    canonical: "MARINDO INVESTAMA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ALMI, INAI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TIRTAMAS ANGGADA PT",
    canonical: "PT TIRTAMAS ANGGADA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ALTO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BANK PAN INDONESIA TBK PT",
    canonical: "PT BANK PAN INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AMAG, CFIN, PANS, PNBS, VRNA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PESONA SUKSES CEMERLANG",
    canonical: "PT PESONA SUKSES CEMERLANG",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AMMN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KEMILAU INVESTAMA MAKMUR PT",
    canonical: "PT KEMILAU INVESTAMA MAKMUR",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AMMN, MEDC.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KEMILAU SINAR LESTARI PT",
    canonical: "PT KEMILAU SINAR LESTARI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AMMN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SIGMANTARA ALFINDO",
    canonical: "PT SIGMANTARA ALFINDO",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AMRT, BLOG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "AMANDA CIPTA PERSADA PT",
    canonical: "PT AMANDA CIPTA PERSADA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AMRT, BLOG, GOLD.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "CENTRAL ENERGI PRATAMA",
    canonical: "CENTRAL ENERGI PRATAMA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ANDI, MTPS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PEAK SEKURITAS INDONESIA PT",
    canonical: "PT PEAK SEKURITAS INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: APEX.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SUMBER TEKNOLOGI MULIA PT",
    canonical: "PT SUMBER TEKNOLOGI MULIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: APIC, BANK, BHAT, BOGA, CARE, GAMA, STAR, TARA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ZED UTAMA PERSADA PT",
    canonical: "PT ZED UTAMA PERSADA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: APIC, BHAT, BOGA, CARE, GAMA, NASA, NATO, STAR, TARA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TIRTA CITRA SOLUSI PT",
    canonical: "PT TIRTA CITRA SOLUSI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: APIC, BHAT, BOGA, GAMA, NASA, STAR, TARA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PROSPERA KAPITAL INVESTAMA PT",
    canonical: "PT PROSPERA KAPITAL INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ARKO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MANUNGGAL PRIME DEVELOPMENT PT",
    canonical: "PT MANUNGGAL PRIME DEVELOPMENT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ASRI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "DAYA ADICIPTA MUSTIKA PT",
    canonical: "PT DAYA ADICIPTA MUSTIKA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ASSA, TAPG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TRIPUTRA INVESTINDO ARYA",
    canonical: "PT TRIPUTRA INVESTINDO ARYA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ASSA, DRMA, DSNG, TAPG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TRIMITRA PRAWARA",
    canonical: "PT TRIMITRA PRAWARA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ATAP.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "RAJATI ALIA KAPITAL PT",
    canonical: "PT RAJATI ALIA KAPITAL",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: AWAN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PACIFIC LIFE INSURANCE",
    canonical: "PACIFIC LIFE INSURANCE PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BACA, BANK, BHAT, BOGA, NIRO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ANAK BAIK SEJAHTERA",
    canonical: "PT ANAK BAIK SEJAHTERA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BAIK.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "CAPITAL LIFE INDONESIA PT",
    canonical: "PT CAPITAL LIFE INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BANK, BHAT, BOGA, NIRO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BHINNEKA LIFE INDONESIA PT",
    canonical: "PT BHINNEKA LIFE INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BANK, BOGA, NIRO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SELARAS DWIPANTARA PRIMAMUKTI",
    canonical: "PT SELARAS DWIPANTARA PRIMAMUKTI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BAYU, MREI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MESTIKA BENUA MAS",
    canonical: "MESTIKA BENUA MAS PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BBMD.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BANK MESTIKA DHARMA TBK PT",
    canonical: "PT BANK MESTIKA DHARMA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BBMD.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GAYA HIDUP MASA KINI PT",
    canonical: "PT GAYA HIDUP MASA KINI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BINA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "INDOTAMBANG PERKASA PT",
    canonical: "PT INDOTAMBANG PERKASA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BIPI, BRMS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SOLUSI KARYA SUKSES PT",
    canonical: "PT SOLUSI KARYA SUKSES",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BIPI, EURO, ITMA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GOTO GOJEK TOKOPEDIA TBK PT",
    canonical: "PT GOTO GOJEK TOKOPEDIA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BIRD, GOTO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "AGRINDO PRATAMA",
    canonical: "AGRINDO PRATAMA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BISI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GLOBAL BASE UNIVERSAL",
    canonical: "PT GLOBAL BASE UNIVERSAL",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BLES.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TATA UTAMA GEMILANG",
    canonical: "PT TATA UTAMA GEMILANG",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BLES.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "DMS INVESTAMA PT",
    canonical: "PT DMS INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BNBR, BSML, KOTA, MDIA, MTFN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "CAPITAL GLOBAL STRATEGIC PT",
    canonical: "PT CAPITAL GLOBAL STRATEGIC",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BOGA, CASA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "STRAIT MERCHANTS PTE LTD",
    canonical: "PT STRAIT MERCHANTS PTE LTD",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BPII.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PETROMINE ENERGY TRADING",
    canonical: "PETROMINE ENERGY TRADING PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BRMS, DEWA, ELTY, ENRG, MTFN, VKTR.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "DWI SATRYA UTAMA PT",
    canonical: "PT DWI SATRYA UTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BRNA, TIFA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BUMI SERPONG DAMAI TBK PT",
    canonical: "PT BUMI SERPONG DAMAI TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BSDE, DUTI, SMDM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SINARTAMA GUNITA PT",
    canonical: "PT SINARTAMA GUNITA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BSIM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "DIAN CIPTAMAS AGUNG PT",
    canonical: "PT DIAN CIPTAMAS AGUNG",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BSIM, DWGL, EMAS, GEMS, PYFA, SMMA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TEBAR JALA KORPORA PT",
    canonical: "PT TEBAR JALA KORPORA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BUAH.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ELANG MAHKOTA TEKNOLOGI TBK PT",
    canonical: "PT ELANG MAHKOTA TEKNOLOGI TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BUKA, SAME, SCMA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "DELTA ROYAL SEJAHTERA PT",
    canonical: "PT DELTA ROYAL SEJAHTERA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BULL, ITMA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PEDAGANG ASET KRIPTO PT",
    canonical: "PT PEDAGANG ASET KRIPTO",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CARS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "AGUNG SEDAYU PT",
    canonical: "PT AGUNG SEDAYU",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CBDK, JIHD.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SANDHI PARAMA NUSA",
    canonical: "SANDHI PARAMA NUSA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CBPE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MITRA MENDAWAI SEJATI",
    canonical: "MITRA MENDAWAI SEJATI PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CBUT.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KALIMANTAN SAWIT ABADI",
    canonical: "KALIMANTAN SAWIT ABADI PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CBUT.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SAPTADAYA BUMITAMA PERSADA",
    canonical: "SAPTADAYA BUMITAMA PERSADA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CCSI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "DHARMA MULIA JAYA",
    canonical: "PT DHARMA MULIA JAYA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CGAS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "CIPTA NYATA GEMILANG",
    canonical: "PT CIPTA NYATA GEMILANG",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CGAS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TIRTA MARITIM NUSANTARA",
    canonical: "PT TIRTA MARITIM NUSANTARA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CGAS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "OPTEL INVESTAMA MULIA",
    canonical: "PT OPTEL INVESTAMA MULIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CHEK, LABS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TUNAS BAHTERA HARUM PT",
    canonical: "PT TUNAS BAHTERA HARUM",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CHEM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "CAHAYA OBOR DAMAI",
    canonical: "PT CAHAYA OBOR DAMAI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CITY.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "NUANSA INDAH KEMILAU",
    canonical: "PT NUANSA INDAH KEMILAU",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CITY.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PACIFIK MANAGEMENT BUANA",
    canonical: "PT PACIFIK MANAGEMENT BUANA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CITY.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PURI DAMAI SEJAHTERA PT",
    canonical: "PT PURI DAMAI SEJAHTERA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: COCO, TRIM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GRAHA PUTRA MENTARI PT",
    canonical: "PT GRAHA PUTRA MENTARI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: COIN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "FAJAR INFORMATIKA PERKASA PT",
    canonical: "PT FAJAR INFORMATIKA PERKASA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: COIN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "WASAMAS INVESTAMA NUSANTARA PT",
    canonical: "PT WASAMAS INVESTAMA NUSANTARA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: COIN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "CHAROEN POKPHAND INDONESIA GROUP",
    canonical: "CHAROEN POKPHAND INDONESIA GROUP PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CPIN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "IFORTE SOLUSI INFOTEK",
    canonical: "PT IFORTE SOLUSI INFOTEK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DATA, IBST, SUPR.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BIMADA PARAMITA ADHYANA",
    canonical: "PT BIMADA PARAMITA ADHYANA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DEAL.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MULTI GARAM UTAMA PT",
    canonical: "PT MULTI GARAM UTAMA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DGNS, HOPE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MULTI GARAM UTAMA TBK PT",
    canonical: "PT MULTI GARAM UTAMA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DGNS, HOPE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BERKSHIRE MULTI INVESTAMA PT",
    canonical: "PT BERKSHIRE MULTI INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DGNS, DGWG, ZYRX.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SILIWANGI DJAJAKUSUMAH HOSPITALS",
    canonical: "PT SILIWANGI DJAJAKUSUMAH HOSPITALS",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DKHH.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ASIA KULINER SEJAHTERA PT",
    canonical: "PT ASIA KULINER SEJAHTERA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DUCK.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MONDIAL INVESTAMA INDONESIA",
    canonical: "MONDIAL INVESTAMA INDONESIA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DYAN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GRAHAWITA SANTIKA",
    canonical: "GRAHAWITA SANTIKA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DYAN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KREASI CIPTA TIMUR",
    canonical: "KREASI CIPTA TIMUR PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ELPI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BINTANG DELAPAN HARMONI PT",
    canonical: "PT BINTANG DELAPAN HARMONI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: EMAS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BAKRIE KALILA INVESTMENT PT",
    canonical: "PT BAKRIE KALILA INVESTMENT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ENRG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BERKAT MITRA PATRIA PT",
    canonical: "PT BERKAT MITRA PATRIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ENRG, KIJA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TRITUNGGAL SUKSES INVESTAMA PT",
    canonical: "PT TRITUNGGAL SUKSES INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ENZO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KALBE FARMA TBK PT",
    canonical: "PT KALBE FARMA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: EPMT, IGAR, KLBF.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "IMIKO SETIA ABADI PT",
    canonical: "PT IMIKO SETIA ABADI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BIPI, EURO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "FERSINDO NUSA JAYA PT",
    canonical: "PT FERSINDO NUSA JAYA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BIPI, EURO, ITMA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MAJUKARYA MANDIRI INDONESIA PT",
    canonical: "PT MAJUKARYA MANDIRI INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: EURO, ITMA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GARAM VENTURA INDONESIA PT",
    canonical: "PT GARAM VENTURA INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: FOLK.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SURYADUTA INVESTAMA",
    canonical: "PT SURYADUTA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GGRM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SURYAMITRA KUSUMA",
    canonical: "PT SURYAMITRA KUSUMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GGRM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GARUDA INDONESIA (PERSERO) TBK",
    canonical: "GARUDA INDONESIA (PERSERO) TBK PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GMFI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MULIA SUKSES MANDIRI PT",
    canonical: "PT MULIA SUKSES MANDIRI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GOLD.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BALI PECATU GRAHA",
    canonical: "BALI PECATU GRAHA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GOLF.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MANDALAPRATAMA PERMAI",
    canonical: "MANDALAPRATAMA PERMAI PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GOLF.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TRIPLE BERKAH BERSAMA PT",
    canonical: "PT TRIPLE BERKAH BERSAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: EPAC, GPSO, LAPD, MEJA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TRIMULTI ADINATA PERKASA",
    canonical: "PT TRIMULTI ADINATA PERKASA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GTRA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ADIKA EKA PUTRA",
    canonical: "PT ADIKA EKA PUTRA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GTRA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "AMAN RESOURCES INDONESIA PT",
    canonical: "PT AMAN RESOURCES INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GULA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PRIMA PERMATA SEJAHTERA",
    canonical: "PRIMA PERMATA SEJAHTERA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GWSA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KENCANA GRAHA NUSAMANDIRI",
    canonical: "KENCANA GRAHA NUSAMANDIRI PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GWSA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "JABAR UTAMA WOOD INDUSTRY PT",
    canonical: "PT JABAR UTAMA WOOD INDUSTRY",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: GZCO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "NUR INTERNASIONAL SAMUDRA",
    canonical: "NUR INTERNASIONAL SAMUDRA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: HAIS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SAMUDRA SEJAHTERA INVESTAMA PT",
    canonical: "PT SAMUDRA SEJAHTERA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: HATM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KARUNIA BARA PERKASA PT",
    canonical: "PT KARUNIA BARA PERKASA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: HRUM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "HUMPUSS",
    canonical: "HUMPUSS PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: HUMI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "NUANSA KENCONO ABADI PT",
    canonical: "PT NUANSA KENCONO ABADI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: IBOS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ALQHAISAR SUKSES ABADI",
    canonical: "ALQHAISAR SUKSES ABADI PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: IBOS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ADRINDO INTIPERKASA PT",
    canonical: "PT ADRINDO INTIPERKASA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: DRMA, GWSA, IFII, SMSM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MULINDO INVESTAMA",
    canonical: "MULINDO INVESTAMA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: INAI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ANUGERAH INVESTINDO",
    canonical: "ANUGERAH INVESTINDO PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: INAI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "IRAMA INVESTAMA",
    canonical: "IRAMA INVESTAMA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: INDR.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GRAHA INOVASI UNGGUL PT",
    canonical: "PT GRAHA INOVASI UNGGUL",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: INPC.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KARYA NUSANTARA PERMAI",
    canonical: "KARYA NUSANTARA PERMAI PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: INPC.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PERSADA ANUGERAH MAKMUR PT",
    canonical: "PT PERSADA ANUGERAH MAKMUR",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: INPC.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "HP CAPITAL RESOURCES",
    canonical: "PT HP CAPITAL RESOURCES",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BELL, INTA, KIAS, TAXI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "HP CAPITAL RESOURCES PT",
    canonical: "PT HP CAPITAL RESOURCES",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BELL, BUVA, INTA, KIAS, LUCY, TAXI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "INDO AMERICAN FOODS",
    canonical: "INDO AMERICAN FOODS PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ISEA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ANUGERAH INVESTINDO NUSANTARA",
    canonical: "ANUGERAH INVESTINDO NUSANTARA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ITIC.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "JEMBO CABLE COMPANY TBK PT",
    canonical: "PT JEMBO CABLE COMPANY TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: JECC, TBMS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BUDIMULIA INVESTAMA",
    canonical: "BUDIMULIA INVESTAMA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: JKON, MDKI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MIRAE ASSET SEKURITAS INDONESIA",
    canonical: "PT MIRAE ASSET SEKURITAS INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: JSKY, PURE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TRINITAN GLOBAL PASIFIK PT",
    canonical: "PT TRINITAN GLOBAL PASIFIK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: JSKY.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "REKSA PUSPITA KARYA PT",
    canonical: "PT REKSA PUSPITA KARYA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KBLV, LPPF.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PUTRASAKTI MANDIRI PT",
    canonical: "PT PUTRASAKTI MANDIRI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KDTN, SCNP.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "INTAN PERDANA SUKSES PT",
    canonical: "PT INTAN PERDANA SUKSES",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KDTN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SURYA SINAR MENTARI PT",
    canonical: "PT SURYA SINAR MENTARI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KEEN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GARUDAFOOD PUTRA PUTRI JAYA TBK PT",
    canonical: "PT GARUDAFOOD PUTRA PUTRI JAYA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KEJU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KINOLOGI SEMESTA NUSANTARA PT",
    canonical: "PT KINOLOGI SEMESTA NUSANTARA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KIJA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "JAPARTO SUKSES MANDIRI",
    canonical: "PT JAPARTO SUKSES MANDIRI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KING.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BUDILESTARI SENTOSA",
    canonical: "PT BUDILESTARI SENTOSA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KKES.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KOKOH ANUGERAH NUSANTARA",
    canonical: "PT KOKOH ANUGERAH NUSANTARA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KOCI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PAPAN DAYA UTAMA PT",
    canonical: "PT PAPAN DAYA UTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KOTA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "NUR SANGKARA KAMARTA",
    canonical: "PT NUR SANGKARA KAMARTA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: KUAS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BANTRUNK MURNI INDONESIA",
    canonical: "BANTRUNK MURNI INDONESIA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: LMSH.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MULTIPOLAR PT TBK",
    canonical: "PT MULTIPOLAR TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: LPIN, LPKR, LPPF, MLPT, MPPA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PRIMANTARA UTAMA SEJAHTERA PT",
    canonical: "PT PRIMANTARA UTAMA SEJAHTERA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: LPKR.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SURYA CIPTA INVESTAMA PT",
    canonical: "PT SURYA CIPTA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: LPPF.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "LORENA",
    canonical: "LORENA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: LRNA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MANDIRI HERINDO ADIPERKASA TBK PT",
    canonical: "PT MANDIRI HERINDO ADIPERKASA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MAHA, MCOL.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MAHAKA MEDIA TBK PT",
    canonical: "PT MAHAKA MEDIA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MARI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "DANABINA SENTANA",
    canonical: "DANABINA SENTANA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MASB.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MULTI ANEKADANA SAKTI",
    canonical: "MULTI ANEKADANA SAKTI PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MASB.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GATSU GRIYA MEGATAMA",
    canonical: "PT GATSU GRIYA MEGATAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MAYA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MERDEKA ENERGI NUSANTARA PT",
    canonical: "PT MERDEKA ENERGI NUSANTARA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MBMA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MARTHANA MEGAHAYU INTI",
    canonical: "MARTHANA MEGAHAYU INTI PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MBTO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MEDCO DAYA ABADI LESTARI PT",
    canonical: "PT MEDCO DAYA ABADI LESTARI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MEDC.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MERRY RIANA INDONESIA",
    canonical: "PT MERRY RIANA INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MERI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MAHKOTA GLOBAL INVESTAMA",
    canonical: "PT MAHKOTA GLOBAL INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MGRO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BARUNA HARMONI INVESTAMA PT",
    canonical: "PT BARUNA HARMONI INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MITI, MUTU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SAMALA SERASI UTAMA PT",
    canonical: "PT SAMALA SERASI UTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MITI, MUTU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MULTI INTI USAHA PT",
    canonical: "PT MULTI INTI USAHA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MMIX.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MADURA PRIMA INVESTAMA PT",
    canonical: "PT MADURA PRIMA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MPIX.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MUSTIKA RATU INVESTAMA",
    canonical: "MUSTIKA RATU INVESTAMA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MRAT.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ANGKASA PENJAMINAN INDONESIA",
    canonical: "PT ANGKASA PENJAMINAN INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MRAT.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MEDIA NUSANTARA CITRA PT",
    canonical: "PT MEDIA NUSANTARA CITRA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MSIN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MAJU SELARAS JAYAMERTA PT",
    canonical: "PT MAJU SELARAS JAYAMERTA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MSJA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SUMATERA TEKNINDO",
    canonical: "SUMATERA TEKNINDO PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MTMH.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "YAKIN WISKON",
    canonical: "YAKIN WISKON PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MTSM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SENTRA MUTU HANDAL",
    canonical: "PT SENTRA MUTU HANDAL",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MUTU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BARUNA BINA UTAMA",
    canonical: "PT BARUNA BINA UTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MUTU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "AFDA EKSELENSI LINTAS DUNIA PT",
    canonical: "PT AFDA EKSELENSI LINTAS DUNIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MUTU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "NILA BANYU PERMAI PT",
    canonical: "PT NILA BANYU PERMAI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: NASA, TARA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "WAHANA KREASI INVESTAMA",
    canonical: "WAHANA KREASI INVESTAMA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: NASI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SINERGI LINTAS MEDIA",
    canonical: "PT SINERGI LINTAS MEDIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: NETV.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SUNGAI MAS MINERALS PT",
    canonical: "PT SUNGAI MAS MINERALS",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: NICE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KRAKATAU STEEL (PERSERO) TBK PT",
    canonical: "PT KRAKATAU STEEL (PERSERO) TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: NIKL.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SURYA SEMESTA INTERNUSA TBK PT",
    canonical: "PT SURYA SEMESTA INTERNUSA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: NRCA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MANDALINDO PUTRA PERKASA",
    canonical: "PT MANDALINDO PUTRA PERKASA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: OILS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "OPTIMA PRIMA METAL SINERGI",
    canonical: "PT OPTIMA PRIMA METAL SINERGI TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: OPMS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "AMAN DHITYA INVESTAMA PT",
    canonical: "PT AMAN DHITYA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PANR, PDES, WEHA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SIGMA MUTIARA PT",
    canonical: "PT SIGMA MUTIARA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PBSA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KEMILAU BINTANG INVESTAMA PT",
    canonical: "PT KEMILAU BINTANG INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PCAR.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PERTAMINA POWER INDONESIA",
    canonical: "PERTAMINA POWER INDONESIA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PGEO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TANAM INVESTASI INDONESIA",
    canonical: "PT TANAM INVESTASI INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PGEO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "WAHANA TATA BANGUN",
    canonical: "WAHANA TATA BANGUN PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PLAN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BINTANG BAJA HITAM PT",
    canonical: "PT BINTANG BAJA HITAM",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: POSA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PRODIA WIDYAHUSADA TBK",
    canonical: "PT PRODIA WIDYAHUSADA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PRDA, PRDL.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PROFITAMA HASIL INDAH",
    canonical: "PT PROFITAMA HASIL INDAH",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PSAT.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SURYA MITRA PANCARAN",
    canonical: "PT SURYA MITRA PANCARAN",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PSAT.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ANEKA BUMI PRASIDHA",
    canonical: "ANEKA BUMI PRASIDHA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PSDN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ANEKA AGROPRASIDHA",
    canonical: "ANEKA AGROPRASIDHA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PSDN.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SERASIH HOLDICO",
    canonical: "SERASIH HOLDICO PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PSGO.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "RSK INVESTASI UNGGUL PT",
    canonical: "PT RSK INVESTASI UNGGUL",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PTDU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "RSK INVESTASI UNGGUL",
    canonical: "PT RSK INVESTASI UNGGUL",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PTDU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KENCANA USAHA SENTOSA",
    canonical: "PT KENCANA USAHA SENTOSA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PTMP.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MITRA PACK TBK",
    canonical: "PT MITRA PACK TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PTMR.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KREASI JASA PERSADA PT",
    canonical: "PT KREASI JASA PERSADA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PTRO, SINI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PAKUWON ARTHANIAGA",
    canonical: "PT PAKUWON ARTHANIAGA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PWON.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GLOBALASIA CAPITAL INVESTAMA",
    canonical: "PT GLOBALASIA CAPITAL INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: RAFI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GLOBALASIA CAPITAL INVESTAMA PT",
    canonical: "PT GLOBALASIA CAPITAL INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: RAFI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PT RAMAYANA LESTARI SENTOSA TBK",
    canonical: "PT RAMAYANA LESTARI SENTOSA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: RALS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "RUKUN RAHARJA TBK",
    canonical: "PT RUKUN RAHARJA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: RATU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "CHANDRA DAYA INVESTASI",
    canonical: "PT CHANDRA DAYA INVESTASI TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: PTRO, RATU.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PETROSEA",
    canonical: "PT PETROSEA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: RATU, SINI, SSIA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ENAM BERLIAN SINERGI",
    canonical: "PT ENAM BERLIAN SINERGI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: REAL.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PLATINUM BERKAH ABADI",
    canonical: "PT PLATINUM BERKAH ABADI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: RGAS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PLATINUM BERKAH ABADI PT",
    canonical: "PT PLATINUM BERKAH ABADI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: RGAS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KIAN MEGAH INVESTAMA PT",
    canonical: "PT KIAN MEGAH INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: RGAS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SARANA MEDITAMA METROPOLITAN TBK PT",
    canonical: "PT SARANA MEDITAMA METROPOLITAN TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: JECX, RSGK.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "RADIANT NUSA INVESTAMA PT",
    canonical: "PT RADIANT NUSA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: RUIS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SURYA CITRA MEDIA TBK PT",
    canonical: "PT SURYA CITRA MEDIA TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SCMA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SENA DWIMAKMUR",
    canonical: "SENA DWIMAKMUR PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SCNP.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GENERASI DUA SUKSES TERUS",
    canonical: "GENERASI DUA SUKSES TERUS PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SCNP.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MANDIRI INVESTAMA SEJATI",
    canonical: "PT MANDIRI INVESTAMA SEJATI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SIMP.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MULTI KARYA SEJATI",
    canonical: "PT MULTI KARYA SEJATI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SKBM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "NORTHCLIFF INDONESIA PT",
    canonical: "PT NORTHCLIFF INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SKYB.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PELAYARAN NELLY DWI PUTRI TBK PT",
    canonical: "PT PELAYARAN NELLY DWI PUTRI TBK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MEJA, SMKM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SINERGI ASIA CORPORINDO PT",
    canonical: "PT SINERGI ASIA CORPORINDO",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SMLE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PINDO DELI PULP AND PAPER MILLS",
    canonical: "PT PINDO DELI PULP AND PAPER MILLS",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SMMA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KANAWA RIZKI INVESTAMA PT",
    canonical: "PT KANAWA RIZKI INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SOTS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ARMAN INVESTMENTS UTAMA",
    canonical: "PT ARMAN INVESTMENTS UTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SSIA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TIGA SIRA SEJAHTERA PT",
    canonical: "PT TIGA SIRA SEJAHTERA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SUPA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PROFESIONAL TELEKOMUNIKASI INDONESIA",
    canonical: "PT PROFESIONAL TELEKOMUNIKASI INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BTEL, DATA, SUPR.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SUMBER MAKMUR LUMINTU PT",
    canonical: "PT SUMBER MAKMUR LUMINTU",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SWAT.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GLENWOOD CORPORATION",
    canonical: "PT GLENWOOD CORPORATION",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TARA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KARYA PERMATA INSANI PT",
    canonical: "PT KARYA PERMATA INSANI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TCPI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "DINASTI KREATIF INDONESIA PT",
    canonical: "PT DINASTI KREATIF INDONESIA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TGUK.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SURYASENTRA GEMILANG SENTOSA PT",
    canonical: "PT SURYASENTRA GEMILANG SENTOSA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TIRA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BARA MAKMUR ABADI PT",
    canonical: "PT BARA MAKMUR ABADI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TOBA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TOPINDO MEDIA INVESTAMA",
    canonical: "PT TOPINDO MEDIA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TOSK.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TOTAL INTI PERSADA",
    canonical: "TOTAL INTI PERSADA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TOTL.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "UNION SAMPOERNA",
    canonical: "UNION SAMPOERNA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TRIM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "NUANSA INDAH KREASI PT",
    canonical: "PT NUANSA INDAH KREASI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BOLA, TRIM.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ADILAKSA MANUNGGAL",
    canonical: "ADILAKSA MANUNGGAL PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TRST.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "VALTOS GLOBALINDO",
    canonical: "VALTOS GLOBALINDO PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TRUE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KUSUMA ANUGRAH ABADI PT",
    canonical: "PT KUSUMA ANUGRAH ABADI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TRUS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "INTI INDAH RAYA PT",
    canonical: "PT INTI INDAH RAYA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TRUS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "KINGLAND INVESTINDO NUSANTARA",
    canonical: "PT KINGLAND INVESTINDO NUSANTARA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TYRE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PRAKARSA MITRA SENTOSA PT",
    canonical: "PT PRAKARSA MITRA SENTOSA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TYRE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SEMESTA RAYA PERMAI PT",
    canonical: "PT SEMESTA RAYA PERMAI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: TYRE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SIRIUS SURYA SENTOSA PT",
    canonical: "PT SIRIUS SURYA SENTOSA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: UANG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "BHINEKA ABADI INVESTAMA PT",
    canonical: "PT BHINEKA ABADI INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: UANG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "DAMAI SEJAHTERA LESTARI INVESTAMA",
    canonical: "DAMAI SEJAHTERA LESTARI INVESTAMA PT",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: UFOE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PRAWIRAWIDJAJA PRAKARSA",
    canonical: "PT PRAWIRAWIDJAJA PRAKARSA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ULTJ.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PRAWIRAWIDJAJA PRAKARSA PT",
    canonical: "PT PRAWIRAWIDJAJA PRAKARSA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ULTJ.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "INVESTASI SUKSES BERSAMA PT",
    canonical: "PT INVESTASI SUKSES BERSAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: WIFI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SEJAHTERA BERSAMA TRIWIRA",
    canonical: "PT SEJAHTERA BERSAMA TRIWIRA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: WIRG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "TIRTA ORISA YASA",
    canonical: "PT TIRTA ORISA YASA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ARKO, BUVA, MINA, PSKT, RAJA, UANG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PURINUSA EKAPERSADA PT",
    canonical: "PT PURINUSA EKAPERSADA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: INKP, UCID.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ANAK GUNUNG SENTOSA PT",
    canonical: "PT ANAK GUNUNG SENTOSA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: OMED.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MUTIARA BARA ABADI PT",
    canonical: "PT MUTIARA BARA ABADI",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SMGA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "MAHAPA MITRA PERSADA PT",
    canonical: "PT MAHAPA MITRA PERSADA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: SOTS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "FORTUNA WIJAYA GLOBAL PT",
    canonical: "PT FORTUNA WIJAYA GLOBAL",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CASH.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PUKUL RATA KANAN PT",
    canonical: "PT PUKUL RATA KANAN",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CBRE.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "PUKUL RATA KANAN",
    canonical: "PT PUKUL RATA KANAN",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: CBRE, MMIX, TRUK.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "GRAHA INTI GUNA PERSADA PT",
    canonical: "PT GRAHA INTI GUNA PERSADA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: INPS.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "INTI ANUGERAH PRATAMA PT",
    canonical: "PT INTI ANUGERAH PRATAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: LPGI, LPKR, LPLI, LPPS, MLPL.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "VITA MAGNA TRINITA",
    canonical: "PT VITA MAGNA TRINITA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MDLA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "CAKRA UNIVERSAL PERSADA",
    canonical: "PT CAKRA UNIVERSAL PERSADA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: MDLA.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "ETERNAL CAPITAL PT",
    canonical: "PT ETERNAL CAPITAL",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ENRG.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "SAMSARA WOIZIK",
    canonical: "PT SAMSARA WOIZIK",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: BIRD.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "INDRA INVESTAMA PT",
    canonical: "PT INDRA INVESTAMA",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: ARII, CSMI.",
    reviewedOn: "2026-10-25",
  },
  {
    alias: "NUSANTARA ENERGI BERSIH PT",
    canonical: "PT NUSANTARA ENERGI BERSIH",
    reason:
      "Same words in the same order; only the legal-form words differ. Issuers: EURO, ITMA.",
    reviewedOn: "2026-10-25",
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
