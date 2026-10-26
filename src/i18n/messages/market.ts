import { defineMessages } from "../define";

/** The market page at / (PRD F9). */
export const marketMessages = defineMessages({
  en: {
    title: "Who owns Indonesia's listed companies",
    lede: "Every holder above 1% of every listed company, from the monthly register, screened on Sigi's own figures. Prices and charts are TradingView's, shown as embedded.",
    hero: {
      searchLabel: "Find a company",
      searchPlaceholder: "Code or name",
      searchButton: "Search",
    },
    figures: {
      companies: "Companies in the register",
      below: "Certainly below the 15% line",
      belowNote: "Even the upper bound on the float is under 15%",
      crossed: "Crossed the 15% line since last month",
      crossedNote: (up: number, down: number) =>
        `${up} rose above it, ${down} fell below it`,
      next: "Next dated event",
    },
    today: {
      label: "Today's brief",
      read: "Read the brief",
    },
    register: {
      heading: "The register",
      legend: {
        largest: "Largest holder",
        others: "Other holders of 5% or more",
        float: "Free float, upper bound",
        line: "15% minimum",
      },
    },
    screen: {
      heading: "Ownership screen",
      summary: "Filter and sort",
      active: (count: number) => `${count} on`,
      query: "Code or name",
      queryPlaceholder: "e.g. BBCA or astra",
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
      ownership: "Who holds it",
      holders: "Holders above 1%",
      largest: "Largest holder",
      freeFloat: "Free float bound",
      hhi: "HHI",
      since: "Since last month",
      incomplete: "incomplete",
      incompleteTitle: "Register lists under 15% above 1%",
      belowLine: "Below the 15% minimum",
      empty: "No company matches these filters.",
      barSummary: (largest: string, others: string, float: string) =>
        `Largest holder ${largest}, other holders of 5% or more ${others}, free float up to ${float}`,
    },
    moves: {
      added: (n: number) => `${n} new`,
      gone: (n: number) => `${n} gone`,
      up: (n: number) => `${n} up`,
      down: (n: number) => `${n} down`,
      none: "none",
    },
    pager: {
      label: "Pages of companies",
      range: (from: number, to: number, total: number) =>
        `${from}–${to} of ${total}`,
      previous: "Previous",
      next: "Next",
    },
    bound: {
      before:
        "Free float bound: 100% minus holders of 5% or more; the official figure is this or lower (",
      link: "methodology",
      after: ").",
    },
    markets: {
      heading: "Prices and charts",
    },
    chart: {
      heading: "IHSG (Jakarta Composite)",
      title: "IHSG daily chart by TradingView",
    },
    screener: {
      heading: "Prices and fundamentals screener",
      title: "Indonesia stock screener by TradingView",
    },
  },
  id: {
    title: "Siapa pemilik emiten tercatat di Indonesia",
    lede: "Setiap pemegang saham di atas 1% dari setiap emiten tercatat, berdasarkan daftar bulanan, disaring dengan angka Sigi sendiri. Harga dan grafik milik TradingView, ditampilkan langsung dari sana.",
    hero: {
      searchLabel: "Cari perusahaan",
      searchPlaceholder: "Kode atau nama",
      searchButton: "Cari",
    },
    figures: {
      companies: "Perusahaan dalam daftar",
      below: "Pasti di bawah batas 15%",
      belowNote: "Bahkan batas atas free float-nya di bawah 15%",
      crossed: "Melewati batas 15% sejak bulan lalu",
      crossedNote: (up: number, down: number) =>
        `${up} naik di atas batas, ${down} turun di bawahnya`,
      next: "Peristiwa bertanggal berikutnya",
    },
    today: {
      label: "Ringkasan hari ini",
      read: "Baca ringkasan",
    },
    register: {
      heading: "Daftar pemegang saham",
      legend: {
        largest: "Pemegang saham terbesar",
        others: "Pemegang saham lain 5% atau lebih",
        float: "Free float, batas atas",
        line: "Batas minimal 15%",
      },
    },
    screen: {
      heading: "Penyaring kepemilikan",
      summary: "Saring dan urutkan",
      active: (count: number) => `${count} aktif`,
      query: "Kode atau nama",
      queryPlaceholder: "mis. BBCA atau astra",
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
      ownership: "Siapa pemegangnya",
      holders: "Pemegang saham di atas 1%",
      largest: "Pemegang saham terbesar",
      freeFloat: "Batas atas free float",
      hhi: "HHI",
      since: "Sejak bulan lalu",
      incomplete: "tidak lengkap",
      incompleteTitle: "Daftar memuat kurang dari 15% di atas 1%",
      belowLine: "Di bawah batas minimal 15%",
      empty: "Tidak ada perusahaan yang cocok dengan penyaring ini.",
      barSummary: (largest: string, others: string, float: string) =>
        `Pemegang saham terbesar ${largest}, pemegang saham lain 5% atau lebih ${others}, free float hingga ${float}`,
    },
    moves: {
      added: (n: number) => `${n} baru`,
      gone: (n: number) => `${n} keluar`,
      up: (n: number) => `${n} naik`,
      down: (n: number) => `${n} turun`,
      none: "tidak ada",
    },
    pager: {
      label: "Halaman daftar perusahaan",
      range: (from: number, to: number, total: number) =>
        `${from}–${to} dari ${total}`,
      previous: "Sebelumnya",
      next: "Berikutnya",
    },
    bound: {
      before:
        "Batas atas free float: 100% dikurangi pemegang saham 5% atau lebih; angka resminya sama dengan ini atau lebih rendah (",
      link: "metodologi",
      after: ").",
    },
    markets: {
      heading: "Harga dan grafik",
    },
    chart: {
      heading: "IHSG (Indeks Harga Saham Gabungan)",
      title: "Grafik harian IHSG oleh TradingView",
    },
    screener: {
      heading: "Penyaring harga dan fundamental",
      title: "Penyaring saham Indonesia oleh TradingView",
    },
  },
});
