/**
 * The data-source register in code (docs/DATA-SOURCES.md is the full record:
 * quotes, dates, confidence). Every figure a page shows cites a `SourceId`,
 * so a figure from an unregistered source does not type-check (PRD C3).
 */

import type { Text } from "../i18n/define";

export type SourceStatus =
  "cleared" | "cleared-portfolio" | "withheld" | "excluded";

export interface SourceEntry {
  name: Text;
  publisher: string;
  url: string;
  status: SourceStatus;
  /** One line on what the terms allow, for the public sources page. */
  terms: Text;
  /** Whether Sigi uses it today. */
  live: boolean;
}

export const SOURCES = {
  S1: {
    name: {
      en: "Holders above 1% (monthly)",
      id: "Pemegang saham di atas 1% (bulanan)",
    },
    publisher:
      "PT Bursa Efek Indonesia (share-ownership data page); data from PT Kustodian Sentral Efek Indonesia",
    url: "https://www.idx.co.id/id/perusahaan-tercatat/data-kepemilikan-saham/",
    status: "cleared-portfolio",
    terms: {
      en: "Non-commercial use with full citation and access date. The site's terms ask that it not be scraped; Sigi fetches these files automatically once a day regardless, by the owner's decision (D-021).",
      id: "Boleh untuk penggunaan nonkomersial dengan kutipan sumber lengkap dan tanggal akses. Ketentuan situs meminta agar datanya tidak di-scrape; Sigi tetap mengambil berkas ini secara otomatis sekali sehari, atas keputusan pemilik (D-021).",
    },
    live: true,
  },
  S2: {
    name: {
      en: "KSEI monthly holdings, local and foreign",
      id: "Kepemilikan bulanan KSEI, lokal dan asing",
    },
    publisher: "PT Kustodian Sentral Efek Indonesia",
    url: "https://web.ksei.co.id/archive_download/holding_composition",
    status: "withheld",
    terms: {
      en: "Terms not found; not shown publicly until they are.",
      id: "Ketentuan tidak ditemukan; tidak ditampilkan ke publik sampai ketentuannya jelas.",
    },
    live: false,
  },
  S3: {
    name: { en: "TradingView widgets", id: "Widget TradingView" },
    publisher: "TradingView",
    url: "https://www.tradingview.com/widget/",
    status: "cleared",
    terms: {
      en: "Display-only embeds with TradingView's attribution kept intact.",
      id: "Hanya tampilan tersemat, dengan atribusi TradingView tetap utuh.",
    },
    live: true,
  },
  S4: {
    name: { en: "BPS website tables", id: "Tabel situs BPS" },
    publisher: "Badan Pusat Statistik",
    url: "https://www.bps.go.id/",
    status: "cleared",
    terms: {
      en: "Reuse with citation.",
      id: "Boleh dipakai ulang dengan mencantumkan sumber.",
    },
    live: false,
  },
  S5: {
    name: { en: "BPS Web API", id: "BPS Web API" },
    publisher: "Badan Pusat Statistik",
    url: "https://webapi.bps.go.id/",
    status: "excluded",
    terms: {
      en: "Excluded: the API licence forbids seeking revenue; the BPS website (S4) has the same statistics.",
      id: "Dikecualikan: lisensi API melarang pemakaian untuk mencari pendapatan; situs BPS (S4) memuat statistik yang sama.",
    },
    live: false,
  },
  S6: {
    name: {
      en: "Bank Indonesia statistics (BI-Rate, inflation, JISDOR, reserves)",
      id: "Statistik Bank Indonesia (BI-Rate, inflasi, JISDOR, cadangan devisa)",
    },
    publisher: "Bank Indonesia",
    url: "https://www.bi.go.id/id/statistik/default.aspx",
    status: "cleared-portfolio",
    terms: {
      en: "No site-wide terms found; shown non-commercially with citation. Exported automatically once a day, by the owner's decision (D-023).",
      id: "Tidak ditemukan ketentuan yang berlaku untuk seluruh situs; ditampilkan secara nonkomersial dengan mencantumkan sumber. Diekspor otomatis sekali sehari, atas keputusan pemilik (D-023).",
    },
    live: true,
  },
  S7: {
    name: {
      en: "World Bank commodity prices (Pink Sheet)",
      id: "Harga komoditas Bank Dunia (Pink Sheet)",
    },
    publisher: "World Bank",
    url: "https://www.worldbank.org/en/research/commodity-markets",
    status: "cleared",
    terms: {
      en: "CC BY 4.0, with attribution.",
      id: "CC BY 4.0, dengan atribusi.",
    },
    live: true,
  },
  S8: {
    name: {
      en: "FRED: Federal Reserve Board series",
      id: "FRED: seri Dewan Gubernur Federal Reserve",
    },
    publisher: "Federal Reserve Bank of St. Louis",
    url: "https://fred.stlouisfed.org/",
    status: "cleared",
    terms: {
      en: "Only series from the Federal Reserve Board, which carry no copyright notice.",
      id: "Hanya seri dari Dewan Gubernur Federal Reserve, yang tidak memuat pemberitahuan hak cipta.",
    },
    live: true,
  },
  S9: {
    name: { en: "IMF data", id: "Data IMF" },
    publisher: "International Monetary Fund",
    url: "https://www.imf.org/en/about/copyright-and-terms",
    status: "excluded",
    terms: {
      en: "Excluded: commercial reuse needs permission.",
      id: "Dikecualikan: pemakaian ulang komersial memerlukan izin.",
    },
    live: false,
  },
  S10: {
    name: { en: "News and announcements", id: "Berita dan pengumuman" },
    publisher: "CNBC Indonesia market RSS feed; MSCI and IDX press releases",
    url: "https://www.cnbcindonesia.com/market/rss",
    status: "cleared-portfolio",
    terms: {
      en: "Headline, publisher, time and link only, matched to thesis tickers inside the daily brief's context; no article text is stored or shown. The publisher's terms were not read in full [L].",
      id: "Hanya judul, penerbit, waktu, dan tautan, dicocokkan dengan kode saham tesis dalam konteks ringkasan harian; teks artikel tidak disimpan atau ditampilkan. Ketentuan penerbit belum dibaca sepenuhnya [L].",
    },
    live: true,
  },
  S11: {
    name: {
      en: "BIS effective exchange rate indices",
      id: "Indeks kurs efektif BIS",
    },
    publisher: "Bank for International Settlements",
    url: "https://data.bis.org/topics/EER",
    status: "cleared-portfolio",
    terms: {
      en: "Non-commercial use is allowed without permission, with the BIS cited. Commercial use would need the BIS's permission.",
      id: "Penggunaan nonkomersial boleh tanpa izin, dengan mencantumkan BIS sebagai sumber. Penggunaan komersial memerlukan izin BIS.",
    },
    live: true,
  },
} as const satisfies Record<string, SourceEntry>;

export type SourceId = keyof typeof SOURCES;
