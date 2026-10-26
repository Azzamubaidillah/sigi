import { defineMessages } from "../define";

export const briefMessages = defineMessages({
  en: {
    metaTitle: "Daily brief",
    heading: "Daily brief",
    lede: "What changed in the data Sigi tracks, and what is worth a closer look today.",
    howSummary: "How this brief is written",
    how: "An AI agent writes it each morning from Sigi’s own readings; every item cites the readings it rests on, and a file that cites anything else is not shown. The brief itself is in English.",
    notice:
      "Written by an AI agent from Sigi’s published data and linked sources. It is not investment advice, recommends no transaction, and can be wrong: check each item against the pages it links to.",
    withdrawn: (date: string, reason: string) =>
      `The brief of ${date} was withdrawn: ${reason}`,
    today: "Today",
    missing:
      "No brief has been written yet. The agent runs each morning at about 06:00 WIB.",
    unreadable: (reason: string) => `No brief can be shown: ${reason}`,
    stale: (when: string) =>
      `Stale: this brief was written ${when}, more than 30 hours ago, and no newer brief passed its checks.`,
    rejected: (file: string, reason: string) =>
      `A newer file (${file}) was not shown: ${reason}.`,
    stance: {
      quiet: "Quiet",
      notable: "Notable",
      watch: "Watch",
    },
    lookAt: "Worth a closer look",
    nothingToday: "Nothing today.",
    evidence: (count: number) => `Evidence (${count})`,
    changes: "Changes since yesterday",
    noneNoted: "None noted.",
    risks: "Risks to this reading",
    setAside: "Set aside, and why",
    nothing: "Nothing.",
    webSources: "Web sources",
    noWebSources: "None: every figure came from Sigi’s own readings.",
    written: (written: string, readings: string) =>
      `Written ${written} from Sigi’s readings of ${readings}.`,
    inputs: "Inputs",
    inputsNote: "What the agent was given, and which readings were missing.",
    inputsFold: (built: number, total: number) =>
      `${built} of ${total} inputs built`,
    input: "Input",
    asOf: "As of",
    source: "Source",
    worth: "What it is worth",
    absent: (reason: string) => `Absent: ${reason}`,
    notBuilt: "not built",
    sections: {
      ownership: "Ownership changes",
      float: "Float tracker",
      macro: "Macro releases",
      theses: "Thesis conditions",
      events: "Rule and index dates",
      dataHealth: "Data health",
      news: "News for thesis tickers",
    },
  },
  id: {
    metaTitle: "Ringkasan harian",
    heading: "Ringkasan harian",
    lede: "Apa yang berubah pada data yang dipantau Sigi, dan apa yang layak dicermati hari ini.",
    howSummary: "Cara ringkasan ini ditulis",
    how: "Seorang agen AI menulisnya setiap pagi dari hasil bacaan Sigi sendiri; setiap butir mencantumkan bacaan yang mendasarinya, dan berkas yang mengutip hal lain tidak ditampilkan. Isi ringkasan ditulis dalam bahasa Inggris.",
    notice:
      "Ditulis oleh agen AI dari data yang diterbitkan Sigi dan sumber yang ditautkan. Ini bukan nasihat investasi, tidak merekomendasikan transaksi apa pun, dan bisa keliru: periksa setiap butir pada halaman yang ditautkannya.",
    withdrawn: (date: string, reason: string) =>
      `Ringkasan tanggal ${date} ditarik: ${reason}`,
    today: "Hari ini",
    missing:
      "Belum ada ringkasan yang ditulis. Agen berjalan setiap pagi sekitar pukul 06.00 WIB.",
    unreadable: (reason: string) =>
      `Tidak ada ringkasan yang dapat ditampilkan: ${reason}`,
    stale: (when: string) =>
      `Kedaluwarsa: ringkasan ini ditulis ${when}, lebih dari 30 jam lalu, dan tidak ada ringkasan lebih baru yang lolos pemeriksaan.`,
    rejected: (file: string, reason: string) =>
      `Berkas yang lebih baru (${file}) tidak ditampilkan: ${reason}.`,
    stance: {
      quiet: "Tenang",
      notable: "Patut dicatat",
      watch: "Waspada",
    },
    lookAt: "Layak dicermati",
    nothingToday: "Tidak ada hari ini.",
    evidence: (count: number) => `Bukti (${count})`,
    changes: "Perubahan sejak kemarin",
    noneNoted: "Tidak ada yang dicatat.",
    risks: "Risiko terhadap pembacaan ini",
    setAside: "Dikesampingkan, dan alasannya",
    nothing: "Tidak ada.",
    webSources: "Sumber web",
    noWebSources: "Tidak ada: semua angka berasal dari bacaan Sigi sendiri.",
    written: (written: string, readings: string) =>
      `Ditulis ${written} dari bacaan Sigi pada ${readings}.`,
    inputs: "Masukan",
    inputsNote:
      "Apa yang diberikan kepada agen, dan bacaan mana yang tidak ada.",
    inputsFold: (built: number, total: number) =>
      `${built} dari ${total} masukan tersedia`,
    input: "Masukan",
    asOf: "Per tanggal",
    source: "Sumber",
    worth: "Nilainya",
    absent: (reason: string) => `Tidak tersedia: ${reason}`,
    notBuilt: "belum dibuat",
    sections: {
      ownership: "Perubahan kepemilikan",
      float: "Pelacak free float",
      macro: "Rilis makro",
      theses: "Kondisi tesis",
      events: "Tanggal aturan dan indeks",
      dataHealth: "Kesehatan data",
      news: "Berita untuk kode saham tesis",
    },
  },
});
