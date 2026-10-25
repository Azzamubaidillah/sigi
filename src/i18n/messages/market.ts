import { defineMessages } from "../define";

/** The market page at / (PRD F9). */
export const marketMessages = defineMessages({
  en: {
    title: "Who owns Indonesia's listed companies",
    lede: "Every holder above 1% of every listed company, from the monthly register, screened on Sigi's own figures. Prices and charts are TradingView's, shown as embedded.",
    chart: {
      heading: "IHSG (Jakarta Composite)",
      title: "IHSG daily chart by TradingView",
    },
    screen: {
      heading: "Ownership screen",
      query: "Code or name",
      queryPlaceholder: "e.g. BBCA or bank",
      floatMin: "Free float bound at least (%)",
      floatMax: "Free float bound below (%)",
      topMin: "Largest holder at least (%)",
      type: "Has a holder of type",
      anyType: "Any",
      sort: "Sort",
      sorts: {
        code: "Code",
        "float-asc": "Free float bound, lowest first",
        "top-desc": "Largest holder, highest first",
        "hhi-desc": "Concentration (HHI), highest first",
        "holders-desc": "Holders above 1%, most first",
      },
      foreign: "Has a foreign holder above 1%",
      changed: "Holders changed since the previous month",
      apply: "Apply",
      reset: "Reset",
    },
    status: {
      asOf: (date: string) => `As of ${date}`,
      changesAgainst: (date: string) => `, changes against ${date}`,
      noEarlier: ", no earlier month to compare",
      shown: (shown: number, total: number) =>
        `. ${shown} of ${total} companies shown`,
      excludedPrefix: "; excluded: ",
      excludedItem: (count: number, reason: string) => `${count} (${reason})`,
      excludedJoin: "; ",
      noneExcluded: "; none excluded",
      end: ".",
      reasons: {
        incomplete:
          "register incomplete: holders above 1% total under 15%, so no float figure",
        not_in_previous:
          "not in the previous month's register, so no change to compare",
        no_previous: "no previous month is published",
      },
    },
    table: {
      code: "Code",
      company: "Company",
      holders: "Holders above 1%",
      largest: "Largest holder",
      freeFloat: "Free float bound",
      hhi: "HHI",
      since: "Since last month",
      incomplete: "incomplete",
      incompleteTitle: "Register lists under 15% above 1%",
    },
    moves: {
      added: (n: number) => `${n} new`,
      gone: (n: number) => `${n} gone`,
      up: (n: number) => `${n} up`,
      down: (n: number) => `${n} down`,
      none: "none",
    },
    bound: {
      before:
        "Free float bound: 100% minus holders of 5% or more; the official figure is this or lower (",
      link: "methodology",
      after: ").",
    },
    screener: {
      heading: "Prices and fundamentals screener",
      title: "Indonesia stock screener by TradingView",
    },
  },
  id: {
    title: "Siapa pemilik emiten tercatat di Indonesia",
    lede: "Setiap pemegang saham di atas 1% dari setiap emiten tercatat, berdasarkan daftar bulanan, disaring dengan angka Sigi sendiri. Harga dan grafik milik TradingView, ditampilkan langsung dari sana.",
    chart: {
      heading: "IHSG (Indeks Harga Saham Gabungan)",
      title: "Grafik harian IHSG oleh TradingView",
    },
    screen: {
      heading: "Penyaring kepemilikan",
      query: "Kode atau nama",
      queryPlaceholder: "mis. BBCA atau bank",
      floatMin: "Batas atas free float minimal (%)",
      floatMax: "Batas atas free float di bawah (%)",
      topMin: "Pemegang saham terbesar minimal (%)",
      type: "Memiliki pemegang saham bertipe",
      anyType: "Semua",
      sort: "Urutkan",
      sorts: {
        code: "Kode",
        "float-asc": "Batas atas free float, terendah dahulu",
        "top-desc": "Pemegang saham terbesar, tertinggi dahulu",
        "hhi-desc": "Konsentrasi (HHI), tertinggi dahulu",
        "holders-desc": "Pemegang saham di atas 1%, terbanyak dahulu",
      },
      foreign: "Memiliki pemegang saham asing di atas 1%",
      changed: "Pemegang saham berubah sejak bulan sebelumnya",
      apply: "Terapkan",
      reset: "Atur ulang",
    },
    status: {
      asOf: (date: string) => `Per ${date}`,
      changesAgainst: (date: string) => `, perubahan dibanding ${date}`,
      noEarlier: ", belum ada bulan sebelumnya sebagai pembanding",
      shown: (shown: number, total: number) =>
        `. ${shown} dari ${total} emiten ditampilkan`,
      excludedPrefix: "; dikecualikan: ",
      excludedItem: (count: number, reason: string) => `${count} (${reason})`,
      excludedJoin: "; ",
      noneExcluded: "; tidak ada yang dikecualikan",
      end: ".",
      reasons: {
        incomplete:
          "daftar tidak lengkap: pemegang saham di atas 1% totalnya di bawah 15%, sehingga tidak ada angka free float",
        not_in_previous:
          "tidak ada di daftar bulan sebelumnya, sehingga tidak ada perubahan untuk dibandingkan",
        no_previous: "belum ada bulan sebelumnya yang diterbitkan",
      },
    },
    table: {
      code: "Kode",
      company: "Perusahaan",
      holders: "Pemegang saham di atas 1%",
      largest: "Pemegang saham terbesar",
      freeFloat: "Batas atas free float",
      hhi: "HHI",
      since: "Sejak bulan lalu",
      incomplete: "tidak lengkap",
      incompleteTitle: "Daftar memuat kurang dari 15% di atas 1%",
    },
    moves: {
      added: (n: number) => `${n} baru`,
      gone: (n: number) => `${n} keluar`,
      up: (n: number) => `${n} naik`,
      down: (n: number) => `${n} turun`,
      none: "tidak ada",
    },
    bound: {
      before:
        "Batas atas free float: 100% dikurangi pemegang saham 5% atau lebih; angka resminya sama dengan ini atau lebih rendah (",
      link: "metodologi",
      after: ").",
    },
    screener: {
      heading: "Penyaring harga dan fundamental",
      title: "Penyaring saham Indonesia oleh TradingView",
    },
  },
});
