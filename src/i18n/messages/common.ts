import { defineMessages } from "../define";

/** Copy that more than one page or component uses. */
export const commonMessages = defineMessages({
  en: {
    widget: {
      link: "Track all markets on TradingView",
      note: ". Third-party data, displayed as TradingView provides it; Sigi does not store it or compute from it.",
    },
    thirdParty: {
      heading: "Data by TradingView",
      lede: "Everything in this section is TradingView's, shown as embedded in your browser. Sigi does not read, store or compute from it, and it may be missing or differ from the exchange's own figures.",
    },
    /** The attribution DATA-SOURCES S1 requires, in pieces around the title and link. */
    citationS1: {
      short: (date: string) => `Source: KSEI via IDX, ${date}`,
      source: "Source: ",
      title: "Data Kepemilikan Saham Perusahaan Terbuka di atas 1%",
      via: ", KSEI via PT Bursa Efek Indonesia, record date ",
      accessed: ", accessed ",
    },
    ownershipAbsence: {
      no_published_month:
        "No month of the >1% register has been published yet.",
      not_in_register:
        "This code has no holder above 1% in the latest published month, or is not a listed share.",
      no_previous_month:
        "No earlier month is published, so there is nothing to compare against.",
    },
    thesisStatus: {
      active: "Active",
      invalidated: "Invalidated",
      closed: "Closed",
    },
  },
  id: {
    widget: {
      link: "Pantau semua pasar di TradingView",
      note: ". Data pihak ketiga, ditampilkan sebagaimana disediakan TradingView; Sigi tidak menyimpannya atau menghitung darinya.",
    },
    thirdParty: {
      heading: "Data oleh TradingView",
      lede: "Semua yang ada di bagian ini milik TradingView, ditampilkan langsung di peramban Anda. Sigi tidak membaca, menyimpan, atau menghitung dari data itu, dan data itu bisa tidak tersedia atau berbeda dari angka resmi bursa.",
    },
    citationS1: {
      short: (date: string) => `Sumber: KSEI melalui BEI, ${date}`,
      source: "Sumber: ",
      title: "Data Kepemilikan Saham Perusahaan Terbuka di atas 1%",
      via: ", KSEI melalui PT Bursa Efek Indonesia, tanggal pencatatan ",
      accessed: ", diakses ",
    },
    ownershipAbsence: {
      no_published_month:
        "Belum ada bulan daftar pemegang saham di atas 1% yang diterbitkan.",
      not_in_register:
        "Kode ini tidak memiliki pemegang saham di atas 1% pada bulan terbaru yang diterbitkan, atau bukan saham yang tercatat.",
      no_previous_month:
        "Belum ada bulan sebelumnya yang diterbitkan, sehingga tidak ada pembanding.",
    },
    thesisStatus: {
      active: "Aktif",
      invalidated: "Gugur",
      closed: "Ditutup",
    },
  },
});
