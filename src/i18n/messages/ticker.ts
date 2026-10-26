import { defineMessages } from "../define";

/** The company page at /t/<code> (PRD F8). */
export const tickerMessages = defineMessages({
  en: {
    metaTitle: (code: string) => `${code} ownership`,
    notFound: "Not found",
    lede: (date: string) => `Holders above 1% on ${date}.`,
    allCompanies: "All companies",
    ownership: {
      heading: "Ownership and free float",
      freeFloat: "Free float, upper bound",
      notGiven: "not given",
      largest: "Largest holder",
      heldBelow: "Held below 1%",
      hhi: "HHI, holders above 1%",
      holders: "Holders above 1%",
      bar: {
        summary: (holders: string, float: string) =>
          `${holders}; free float up to ${float}`,
        none: "No holder of 5% or more",
        minimum: "15% minimum",
        float: "Free float, upper bound",
      },
    },
    freeFloat: {
      incompleteBefore: (pct: string) =>
        `The register lists only ${pct} above 1% for this company, too little to be complete: a known controlling holder is missing for every company like this in the files checked so far. No free-float figure is given; see `,
      incompleteLink: "Data & sources",
      incompleteAfter: ".",
      belowStrong: "Below the 15% minimum.",
      below: (bound: string, deadlines: string) =>
        ` Even counted generously, free float is at most ${bound}. Its deadline depends on market capitalisation, which Sigi does not have, so it is one of: ${deadlines}.`,
      notBelow:
        "The register does not show this company below the 15% minimum. The official figure can still be lower than the bound shown here.",
      method:
        "Free float upper bound: 100% minus every holder of 5% or more, the exchange's definition as far as the register can see. The official figure also excludes shares below 5% held by the controller's affiliates, directors, commissioners, treasury and lock-ups, so it is this figure or lower. ",
      methodLink: "Methodology",
    },
    holdersTable: {
      heading: "Holders above 1%",
      mismatch: (rows: number) =>
        `In the source file, ${rows === 1 ? "one row's" : `${rows} rows'`} total shares differ from scripless plus scrip. They are shown exactly as published and marked below.`,
      holder: "Holder",
      type: "Type",
      localForeign: "Local / foreign",
      domicile: "Domicile",
      scripless: "Scripless",
      scrip: "Scrip",
      total: "Total shares",
      percent: "%",
      asPublished: "as published",
      asPublishedTitle: "Total differs from scripless + scrip in the source",
    },
    changes: {
      heading: "Changes since the previous month",
      summaryBefore: (
        date: string,
        entered: number,
        exited: number,
        up: number,
        down: number,
        unchanged: number,
      ) =>
        `Against ${date}: ${entered} new, ${exited} gone, ${up} up, ${down} down, ${unchanged} unchanged. Holders are matched by name as published (see `,
      methodologyLink: "methodology",
      summaryAfter: "); crossing 1% shows as new or gone.",
      entered: "New above 1%",
      exited: "No longer above 1%",
      increased: "Increased",
      decreased: "Decreased",
      holder: "Holder",
      before: "Before",
      after: "After",
      shares: "Shares",
      change: "Change",
    },
    events: {
      heading: "Dates to watch",
      lede: "Rule and index dates that apply to every listed company, each with its source.",
      date: "Date",
      event: "Event",
      source: "Source",
      past: "Past",
      secondary: "secondary report",
      companyBefore: (code: string) => `Possible deadlines for ${code}: `,
      companyNone: (code: string) =>
        `No company-specific deadline can be shown: the register does not place ${code} certainly below the 15% minimum.`,
      companyNoRegister: (code: string) =>
        `No company-specific deadline: ${code} has no entry in the register.`,
    },
    theses: {
      heading: "Theses",
      none: (code: string) => `No thesis names ${code}.`,
    },
    tradingView: {
      chart: "Chart",
      fundamentals: "Fundamentals",
      profile: "Company profile",
      stories: "Top stories",
      chartTitle: (code: string) => `${code} chart by TradingView`,
      fundamentalsTitle: (code: string) =>
        `${code} fundamentals by TradingView`,
      profileTitle: (code: string) => `${code} company profile by TradingView`,
      storiesTitle: (code: string) => `${code} top stories by TradingView`,
    },
  },
  id: {
    metaTitle: (code: string) => `Kepemilikan ${code}`,
    notFound: "Tidak ditemukan",
    lede: (date: string) => `Pemegang saham di atas 1% pada ${date}.`,
    allCompanies: "Semua perusahaan",
    ownership: {
      heading: "Kepemilikan dan free float",
      freeFloat: "Free float, batas atas",
      notGiven: "tidak diberikan",
      largest: "Pemegang terbesar",
      heldBelow: "Dimiliki di bawah 1%",
      hhi: "HHI, pemegang di atas 1%",
      holders: "Pemegang di atas 1%",
      bar: {
        summary: (holders: string, float: string) =>
          `${holders}; free float hingga ${float}`,
        none: "Tidak ada pemegang 5% atau lebih",
        minimum: "Batas minimal 15%",
        float: "Free float, batas atas",
      },
    },
    freeFloat: {
      incompleteBefore: (pct: string) =>
        `Daftar hanya mencantumkan ${pct} di atas 1% untuk perusahaan ini, terlalu sedikit untuk lengkap: pada setiap perusahaan seperti ini dalam berkas yang sudah diperiksa, ada pemegang pengendali yang diketahui tetapi tidak tercantum. Angka free float tidak diberikan; lihat `,
      incompleteLink: "Data & sumber",
      incompleteAfter: ".",
      belowStrong: "Di bawah batas minimal 15%.",
      below: (bound: string, deadlines: string) =>
        ` Bahkan dihitung dengan longgar, free float paling banyak ${bound}. Tenggatnya bergantung pada kapitalisasi pasar, yang tidak dimiliki Sigi, sehingga salah satu dari: ${deadlines}.`,
      notBelow:
        "Daftar tidak menunjukkan perusahaan ini di bawah batas minimal 15%. Angka resmi masih bisa lebih rendah daripada batas atas yang ditampilkan di sini.",
      method:
        "Batas atas free float: 100% dikurangi setiap pemegang 5% atau lebih, yaitu definisi bursa sejauh yang terlihat dari daftar. Angka resmi juga tidak menghitung saham di bawah 5% yang dimiliki afiliasi pengendali, direksi, komisaris, saham treasuri, dan saham yang dikunci, sehingga angka resmi sama dengan angka ini atau lebih rendah. ",
      methodLink: "Metodologi",
    },
    holdersTable: {
      heading: "Pemegang saham di atas 1%",
      mismatch: (rows: number) =>
        `Di berkas sumber, total saham ${rows === 1 ? "satu baris" : `${rows} baris`} berbeda dari jumlah tanpa warkat ditambah warkat. Angkanya ditampilkan persis seperti diterbitkan dan ditandai di bawah.`,
      holder: "Pemegang",
      type: "Jenis",
      localForeign: "Lokal / asing",
      domicile: "Domisili",
      scripless: "Tanpa warkat",
      scrip: "Warkat",
      total: "Total saham",
      percent: "%",
      asPublished: "seperti diterbitkan",
      asPublishedTitle:
        "Total berbeda dari tanpa warkat + warkat di berkas sumber",
    },
    changes: {
      heading: "Perubahan sejak bulan sebelumnya",
      summaryBefore: (
        date: string,
        entered: number,
        exited: number,
        up: number,
        down: number,
        unchanged: number,
      ) =>
        `Dibandingkan dengan ${date}: ${entered} baru, ${exited} keluar, ${up} naik, ${down} turun, ${unchanged} tetap. Pemegang dicocokkan berdasarkan nama seperti diterbitkan (lihat `,
      methodologyLink: "metodologi",
      summaryAfter: "); melewati batas 1% tampil sebagai baru atau keluar.",
      entered: "Baru di atas 1%",
      exited: "Tidak lagi di atas 1%",
      increased: "Naik",
      decreased: "Turun",
      holder: "Pemegang",
      before: "Sebelum",
      after: "Sesudah",
      shares: "Saham",
      change: "Perubahan",
    },
    events: {
      heading: "Tanggal yang perlu diperhatikan",
      lede: "Tanggal aturan dan indeks yang berlaku untuk semua perusahaan tercatat, masing-masing dengan sumbernya.",
      date: "Tanggal",
      event: "Peristiwa",
      source: "Sumber",
      past: "Lewat",
      secondary: "laporan sekunder",
      companyBefore: (code: string) => `Kemungkinan tenggat untuk ${code}: `,
      companyNone: (code: string) =>
        `Tenggat khusus perusahaan tidak dapat ditampilkan: daftar tidak menempatkan ${code} pasti di bawah batas minimal 15%.`,
      companyNoRegister: (code: string) =>
        `Tidak ada tenggat khusus perusahaan: ${code} tidak ada dalam daftar.`,
    },
    theses: {
      heading: "Tesis",
      none: (code: string) => `Belum ada tesis yang menyebut ${code}.`,
    },
    tradingView: {
      chart: "Grafik",
      fundamentals: "Fundamental",
      profile: "Profil perusahaan",
      stories: "Berita utama",
      chartTitle: (code: string) => `Grafik ${code} oleh TradingView`,
      fundamentalsTitle: (code: string) =>
        `Fundamental ${code} oleh TradingView`,
      profileTitle: (code: string) =>
        `Profil perusahaan ${code} oleh TradingView`,
      storiesTitle: (code: string) => `Berita utama ${code} oleh TradingView`,
    },
  },
});
