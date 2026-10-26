import { defineMessages } from "../define";

/** The holders index at /holders and a holder's page at /holders/<slug>. */
export const holdersMessages = defineMessages({
  en: {
    index: {
      metaTitle: "Holders",
      title: "Holders",
      lede: "Companies, funds and institutions holding more than 1% of a listed company, and what each holds.",
      heading: "Institutional holders",
      summary: (date: string, holders: number, withheld: number) =>
        `As of ${date}: ${holders} institutional holders. ${withheld} other holders (individuals, or holders the source leaves unclassified) have no page.`,
    },
    /** Plain strings only: the table is a client component. */
    table: {
      filterPlaceholder: "Part of a name",
      filterLabel: "Filter holders by name",
      of: "of",
      holders: "holders",
      holder: "Holder",
      type: "Type",
      companies: "Companies",
      largest: "Largest position",
      truncated: "Showing the first 100; filter to narrow the list.",
    },
    page: {
      notFound: "Not found",
      allHolders: "All holders",
      notReported: "Not above 1% in this month's file",
      about: (types: string, places: string) =>
        places ? `${types}, domiciled in ${places}.` : `${types}.`,
      holdings: (date: string, count: number) =>
        `Holdings above 1% on ${date} (${count})`,
      noHolding:
        "No holding above 1% in the latest month; earlier months are below.",
      code: "Code",
      company: "Company",
      shares: "Shares",
      percent: "%",
      publishedAs: "Published as: ",
      changes: "Changes since the previous month",
      noChange: (date: string) => `No change against ${date}.`,
      change: "Change",
      dash: "A dash means the holding was at or below 1%, where the register does not report it, or that the holder was not in that month's file.",
    },
  },
  id: {
    index: {
      metaTitle: "Pemegang saham",
      title: "Pemegang saham",
      lede: "Perusahaan, dana, dan lembaga yang memegang lebih dari 1% saham sebuah emiten tercatat, beserta yang dipegang masing-masing.",
      heading: "Pemegang saham institusi",
      summary: (date: string, holders: number, withheld: number) =>
        `Per ${date}: ${holders} pemegang saham institusi. ${withheld} pemegang saham lain (perorangan, atau yang oleh sumber dibiarkan tidak terklasifikasi) tidak punya halaman.`,
    },
    table: {
      filterPlaceholder: "Sebagian nama",
      filterLabel: "Saring pemegang saham menurut nama",
      of: "dari",
      holders: "pemegang saham",
      holder: "Pemegang saham",
      type: "Tipe",
      companies: "Emiten",
      largest: "Posisi terbesar",
      truncated: "Menampilkan 100 pertama; saring untuk mempersempit daftar.",
    },
    page: {
      notFound: "Tidak ditemukan",
      allHolders: "Semua pemegang saham",
      notReported: "Tidak di atas 1% pada berkas bulan ini",
      about: (types: string, places: string) =>
        places ? `${types}, berdomisili di ${places}.` : `${types}.`,
      holdings: (date: string, count: number) =>
        `Kepemilikan di atas 1% pada ${date} (${count})`,
      noHolding:
        "Tidak ada kepemilikan di atas 1% pada bulan terbaru; bulan-bulan sebelumnya ada di bawah.",
      code: "Kode",
      company: "Perusahaan",
      shares: "Saham",
      percent: "%",
      publishedAs: "Diterbitkan sebagai: ",
      changes: "Perubahan sejak bulan sebelumnya",
      noChange: (date: string) => `Tidak ada perubahan dibanding ${date}.`,
      change: "Perubahan",
      dash: "Tanda hubung berarti kepemilikan berada di 1% atau di bawahnya, yang tidak dilaporkan dalam daftar, atau pemegang saham itu tidak ada di berkas bulan tersebut.",
    },
  },
});
