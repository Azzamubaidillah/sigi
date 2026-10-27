import { defineMessages } from "../define";

/**
 * The description of each page for search results, link previews and AI
 * summaries. Each page says what is on it, so no two pages share a snippet.
 * A company's description carries only aggregate figures: a holder's name can
 * be an individual's, and individuals appear on company tables only (PRD C6).
 */
export const seoMessages = defineMessages({
  en: {
    investability:
      "Which Indonesian listed companies are certainly below the exchange's 15% free-float minimum, which may be, and the dates by which each must comply. Sigi's estimate from the monthly holder register, beside the exchange's own count.",
    holders:
      "Companies, funds and institutions that hold more than 1% of an Indonesian listed company, and what each holds, from the monthly register of holders above 1%.",
    macro:
      "Indonesian and global interest rates, commodity prices and exchange rates, with the IDX sectors each one bears on. Every series cites Bank Indonesia, the World Bank, FRED or the BIS.",
    theses:
      "Investment views on Indonesian listed companies, each with the conditions that would prove it wrong, checked every day against Sigi's own published data. Research, not advice.",
    brief:
      "A daily brief of what changed in the ownership and macro data Sigi tracks, with the evidence each point rests on.",
    data: "Where every figure on Sigi comes from, when it was last fetched, what each import's checks found, and the licence of each source.",
    privacy: "What Sigi collects about the people who read it: almost nothing.",
    company: (
      code: string,
      name: string,
      float: string,
      date: string,
      below: boolean,
    ) =>
      `${name} (${code}): free float at most ${float} on ${date}${below ? ", below the exchange's 15% minimum" : ""}. Holders above 1%, the change since last month and the rule's deadlines, from the monthly register.`,
    companyIncomplete: (code: string, name: string, date: string) =>
      `${name} (${code}): the register lists too little above 1% to give a free-float figure. Holders above 1% on ${date}, and why the figure is withheld.`,
    holder: (name: string, about: string, count: number, date: string) =>
      count === 0
        ? `${name}. ${about} No holding above 1% in the latest register, dated ${date}.`
        : `${name}. ${about} Holds more than 1% of ${count} listed ${count === 1 ? "company" : "companies"} on ${date}, with each position and its change since last month.`,
  },
  id: {
    investability:
      "Emiten tercatat Indonesia mana yang pasti berada di bawah batas minimum free float 15% bursa, mana yang mungkin, dan tenggat masing-masing. Perkiraan Sigi dari daftar pemegang saham bulanan, di samping hitungan bursa sendiri.",
    holders:
      "Perusahaan, dana, dan lembaga yang memegang lebih dari 1% saham emiten tercatat Indonesia, beserta yang dipegang masing-masing, dari daftar bulanan pemegang saham di atas 1%.",
    macro:
      "Suku bunga, harga komoditas, dan nilai tukar Indonesia dan global, dengan sektor IDX yang terkait pada masing-masing. Setiap seri mencantumkan Bank Indonesia, Bank Dunia, FRED, atau BIS.",
    theses:
      "Pandangan investasi atas emiten tercatat Indonesia, masing-masing dengan kondisi yang akan membuktikannya keliru, dicek setiap hari terhadap data yang diterbitkan Sigi sendiri. Riset, bukan saran.",
    brief:
      "Ringkasan harian tentang apa yang berubah pada data kepemilikan dan makro yang dipantau Sigi, lengkap dengan bukti yang mendasari tiap butirnya.",
    data: "Dari mana setiap angka di Sigi berasal, kapan terakhir diambil, apa temuan pemeriksaan tiap impor, dan lisensi setiap sumber.",
    privacy: "Apa yang dikumpulkan Sigi tentang pembacanya: nyaris tidak ada.",
    company: (
      code: string,
      name: string,
      float: string,
      date: string,
      below: boolean,
    ) =>
      `${name} (${code}): free float paling banyak ${float} pada ${date}${below ? ", di bawah batas minimum 15% bursa" : ""}. Pemegang saham di atas 1%, perubahan sejak bulan lalu, dan tenggat aturan, dari daftar bulanan.`,
    companyIncomplete: (code: string, name: string, date: string) =>
      `${name} (${code}): daftar memuat terlalu sedikit di atas 1% untuk menghitung free float. Pemegang saham di atas 1% pada ${date}, dan alasan angkanya tidak ditampilkan.`,
    holder: (name: string, about: string, count: number, date: string) =>
      count === 0
        ? `${name}. ${about} Tidak ada kepemilikan di atas 1% pada daftar terbaru, tertanggal ${date}.`
        : `${name}. ${about} Memegang lebih dari 1% saham ${count} emiten tercatat pada ${date}, dengan setiap posisi dan perubahannya sejak bulan lalu.`,
  },
});
