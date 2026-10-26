import { defineMessages } from "../define";

/** The macro page (/macro). */
export const macroMessages = defineMessages({
  en: {
    metaTitle: "Macro",
    heading: "Macro",
    lede: {
      intro:
        "The rates, prices and currencies that move Indonesian listed companies. A value marked ",
      published: "published",
      middle: " is as the source publishes it; a figure marked ",
      sigi: "Sigi",
      afterSigi:
        " is Sigi's own calculation from it. The sector links are Sigi's reading, not the sources'. Every source is fetched once a day; see ",
      dataLink: "Data & sources",
      end: ".",
    },
    absence: {
      not_fetched: "Not fetched yet: the worker has not checked this source.",
      fetch_failed:
        "The source could not be reached on the last check, and nothing has been published from it yet.",
      rejected:
        "The last file from the source failed its checks, and nothing has been published from it yet.",
    },
    asOf: (date: string) => `as of ${date}`,
    moved: { up: "up", down: "down", flat: "unchanged" },
    from: (value: string, period: string) => `from ${value} on ${period}`,
    against: "against ",
    pointsSuffix: " pp",
    sparklineLabel: (name: string) => `${name} over the past year`,
    pastYear: (low: string, high: string) => `Past year: ${low} to ${high}`,
    sourceSummary: (publisher: string) => `Source: ${publisher}`,
    licence: "Licence: ",
    seen: (timestamp: string) => `First seen by Sigi ${timestamp}.`,
    next: (approximate: boolean, date: string) =>
      `Next release expected ${approximate ? "around " : ""}${date}.`,
    late: "Late",
    why: "Why it matters for IDX sectors",
    indices: {
      heading: "Sector indices",
      stamp: "Charts by TradingView",
      note: "Twelve months of each IDX sector index, drawn by TradingView in your browser. Sigi does not store or read these prices.",
    },
    chart: (symbol: string) => `${symbol} chart by TradingView`,
    accessed: (date: string) => `accessed ${date}`,
    citation: {
      source: "Source: ",
      S6: {
        name: "Bank Indonesia",
        publisher: "Bank Indonesia, ",
        after: (accessed: string) => `, ${accessed}, `,
      },
      S7: {
        name: "World Bank",
        publisher: "World Bank Commodity Price Data (The Pink Sheet), ",
        after: (accessed: string) => `, CC BY 4.0, ${accessed}, `,
      },
      S8: {
        name: "FRED",
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
        "Suku bunga, harga, dan mata uang yang menggerakkan emiten di bursa Indonesia. Nilai bertanda ",
      published: "dipublikasikan",
      middle:
        " adalah angka sebagaimana diterbitkan sumbernya; angka bertanda ",
      sigi: "Sigi",
      afterSigi:
        " adalah hitungan Sigi sendiri dari angka tersebut. Kaitan dengan sektor adalah pembacaan Sigi, bukan pembacaan sumbernya. Setiap sumber diambil otomatis sekali sehari; lihat ",
      dataLink: "Data & sumber",
      end: ".",
    },
    absence: {
      not_fetched: "Belum diambil: worker belum memeriksa sumber ini.",
      fetch_failed:
        "Sumber tidak dapat dijangkau pada pemeriksaan terakhir, dan belum ada data dari sumber ini yang dipublikasikan.",
      rejected:
        "Berkas terakhir dari sumber tidak lolos pemeriksaan, dan belum ada data dari sumber ini yang dipublikasikan.",
    },
    asOf: (date: string) => `per ${date}`,
    moved: { up: "naik", down: "turun", flat: "tetap" },
    from: (value: string, period: string) => `dari ${value} pada ${period}`,
    against: "terhadap ",
    pointsSuffix: " poin persentase",
    sparklineLabel: (name: string) => `${name} selama setahun terakhir`,
    pastYear: (low: string, high: string) =>
      `Setahun terakhir: ${low} sampai ${high}`,
    sourceSummary: (publisher: string) => `Sumber: ${publisher}`,
    licence: "Lisensi: ",
    seen: (timestamp: string) => `Pertama kali dilihat Sigi ${timestamp}.`,
    next: (approximate: boolean, date: string) =>
      `Rilis berikutnya diperkirakan ${approximate ? "sekitar " : ""}${date}.`,
    late: "Terlambat",
    why: "Mengapa penting bagi sektor IDX",
    indices: {
      heading: "Indeks sektor",
      stamp: "Grafik oleh TradingView",
      note: "Dua belas bulan setiap indeks sektor IDX, digambar TradingView di peramban Anda. Sigi tidak menyimpan atau membaca harga ini.",
    },
    chart: (symbol: string) => `Grafik ${symbol} oleh TradingView`,
    accessed: (date: string) => `diakses ${date}`,
    citation: {
      source: "Sumber: ",
      S6: {
        name: "Bank Indonesia",
        publisher: "Bank Indonesia, ",
        after: (accessed: string) => `, ${accessed}, `,
      },
      S7: {
        name: "Bank Dunia",
        publisher: "Bank Dunia, Commodity Price Data (The Pink Sheet), ",
        after: (accessed: string) => `, CC BY 4.0, ${accessed}, `,
      },
      S8: {
        name: "FRED",
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
