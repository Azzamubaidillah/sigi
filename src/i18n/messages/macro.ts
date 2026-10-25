import { defineMessages } from "../define";

/** The macro page (/macro). */
export const macroMessages = defineMessages({
  en: {
    metaTitle: "Macro",
    heading: "Macro",
    lede: {
      intro:
        "The rates, prices and currencies that move Indonesian listed companies, with the sectors each one bears on and why. Values marked ",
      published: "published",
      middle: " are as the source publishes them; values marked ",
      sigi: "Sigi",
      afterSigi:
        " are Sigi's own calculations from them. The sector links are Sigi's reading, not the sources'. Every source is fetched automatically once a day; see ",
      dataLink: "Data & sources",
      end: ".",
    },
    publishedTitle: "As the source publishes it",
    derivedTitle: "Calculated by Sigi from the published values",
    absence: {
      not_fetched: "Not fetched yet: the worker has not checked this source.",
      fetch_failed:
        "The source could not be reached on the last check, and nothing has been published from it yet.",
      rejected:
        "The last file from the source failed its checks, and nothing has been published from it yet.",
    },
    previous: "Previous, ",
    change: "Change",
    on: "On ",
    pointsSuffix: " pp",
    sparklineLabel: (name: string) => `${name} over the past year`,
    pastYear: (low: string, high: string) => `Past year: ${low} to ${high}`,
    seen: (timestamp: string) =>
      `. First seen by Sigi ${timestamp}. Next release expected `,
    around: "around ",
    late: " (late)",
    why: "Why it matters for IDX sectors",
    chart: (symbol: string) => `${symbol} chart by TradingView`,
    accessed: (date: string) => `accessed ${date}`,
    citation: {
      source: "Source: ",
      S6: {
        publisher: "Bank Indonesia, ",
        after: (accessed: string) => `, ${accessed}, `,
      },
      S7: {
        publisher: "World Bank Commodity Price Data (The Pink Sheet), ",
        after: (accessed: string) => `, CC BY 4.0, ${accessed}, `,
      },
      S8: {
        publisher: "Board of Governors of the Federal Reserve System (US), ",
        after: (accessed: string) =>
          `, retrieved from FRED, Federal Reserve Bank of St. Louis, ${accessed}, `,
      },
    },
    units: {
      "IDR per USD": "IDR per USD",
      "USD million": "USD million",
      "USD per barrel": "USD per barrel",
      "USD per tonne": "USD per tonne",
      "USD per troy ounce": "USD per troy ounce",
      "index (Jan 2006 = 100)": "index (Jan 2006 = 100)",
    } as Record<string, string>,
  },
  id: {
    metaTitle: "Makro",
    heading: "Makro",
    lede: {
      intro:
        "Suku bunga, harga, dan mata uang yang menggerakkan emiten di bursa Indonesia, beserta sektor yang terkait dengan masing-masing dan alasannya. Nilai bertanda ",
      published: "dipublikasikan",
      middle:
        " adalah angka sebagaimana diterbitkan sumbernya; nilai bertanda ",
      sigi: "Sigi",
      afterSigi:
        " adalah hitungan Sigi sendiri dari angka tersebut. Kaitan dengan sektor adalah pembacaan Sigi, bukan pembacaan sumbernya. Setiap sumber diambil otomatis sekali sehari; lihat ",
      dataLink: "Data & sumber",
      end: ".",
    },
    publishedTitle: "Sebagaimana diterbitkan sumbernya",
    derivedTitle: "Dihitung Sigi dari nilai yang dipublikasikan",
    absence: {
      not_fetched: "Belum diambil: worker belum memeriksa sumber ini.",
      fetch_failed:
        "Sumber tidak dapat dijangkau pada pemeriksaan terakhir, dan belum ada data dari sumber ini yang dipublikasikan.",
      rejected:
        "Berkas terakhir dari sumber tidak lolos pemeriksaan, dan belum ada data dari sumber ini yang dipublikasikan.",
    },
    previous: "Sebelumnya, ",
    change: "Perubahan",
    on: "Terhadap ",
    pointsSuffix: " poin persentase",
    sparklineLabel: (name: string) => `${name} selama setahun terakhir`,
    pastYear: (low: string, high: string) =>
      `Setahun terakhir: ${low} sampai ${high}`,
    seen: (timestamp: string) =>
      `. Pertama kali dilihat Sigi ${timestamp}. Rilis berikutnya diperkirakan `,
    around: "sekitar ",
    late: " (terlambat)",
    why: "Mengapa penting bagi sektor IDX",
    chart: (symbol: string) => `Grafik ${symbol} oleh TradingView`,
    accessed: (date: string) => `diakses ${date}`,
    citation: {
      source: "Sumber: ",
      S6: {
        publisher: "Bank Indonesia, ",
        after: (accessed: string) => `, ${accessed}, `,
      },
      S7: {
        publisher: "Bank Dunia, Commodity Price Data (The Pink Sheet), ",
        after: (accessed: string) => `, CC BY 4.0, ${accessed}, `,
      },
      S8: {
        publisher: "Board of Governors of the Federal Reserve System (AS), ",
        after: (accessed: string) =>
          `, diambil dari FRED, Federal Reserve Bank of St. Louis, ${accessed}, `,
      },
    },
    units: {
      "IDR per USD": "IDR per USD",
      "USD million": "juta USD",
      "USD per barrel": "USD per barel",
      "USD per tonne": "USD per ton",
      "USD per troy ounce": "USD per troy ons",
      "index (Jan 2006 = 100)": "indeks (Jan 2006 = 100)",
    } as Record<string, string>,
  },
});
