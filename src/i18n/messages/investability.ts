import { defineMessages } from "../define";

/** The investability page at /investability (the 15% free-float rule). */
export const investabilityMessages = defineMessages({
  en: {
    metaTitle: "Investability",
    title: "Investability: the 15% free-float rule",
    lede: "The exchange raised the minimum free float to 15% on 31 March 2026, with staged deadlines to 2029, while MSCI weighs moving Indonesia to Standalone status. Sigi counts the companies its monthly register shows below the line. The count is an estimate, never the official one, which stands beside it.",
    asOf: (date: string) => `As of ${date}`,
    pressReport: " (press report)",
    counts: {
      heading: "Below 15%: Sigi's count and the exchange's",
      sigi: (date: string) => `Sigi, ${date}: certainly below 15%`,
      sigiNote: "Even the upper bound on the float is under 15%",
      exchangeNearest: (date: string) => `Exchange, ${date}`,
      exchangeNearestNote: "Nearest to Sigi's month",
      exchangeLatest: (date: string) => `Exchange, ${date}`,
      exchangeLatestNote: "Latest reported",
      ofListed: (listed: number) => ` of ${listed}`,
      nextDate: "Next date on the timeline",
      note: "Sigi counts a company only when even its upper bound is under 15%, so its count is a floor: the exchange also removes affiliates, insiders, treasury and locked-up shares below 5%, which the register cannot see.",
      sourceSummary: "Where the exchange's count comes from",
      gap: "The exchange counts all listed companies from its own records, so the gap between the two counts is the definition, the date and the source together. Exchange figures as reported by ",
      and: " and ",
      end: ".",
      method: "How the bound is worked out",
    },
    bands: {
      heading: "Companies by free-float bound",
      note: "Each band opens the register filtered to it. Red bars are the bands under the 15% line.",
      bound: "Upper bound on free float",
      companies: "Companies",
      line: "15% minimum",
      labels: {
        "under-5": "Under 5%",
        "5-to-12.5": "5% to 12.5%",
        "12.5-to-15": "12.5% to 15%",
        "15-to-25": "15% to 25%",
        "25-to-50": "25% to 50%",
        "50-up": "50% and above",
      },
      noFigure: "No figure: register incomplete",
      incompleteBefore: "Register incomplete (",
      incompleteAfter:
        "): holders above 1% total under 15%, and in every such case checked a known controlling holder is missing from the file.",
    },
    below: {
      heading: (count: number) => `Certainly below 15% (${count})`,
      stamp: (shown: number, total: number) =>
        shown < total ? `The ${shown} with the lowest bound` : `All ${total}`,
      intro:
        "The deadline depends on market capitalisation, which Sigi does not have (it stores no prices), so each group shows the tranches still possible given its bound.",
      rose: (count: number, date: string) =>
        `${count} rose above 15% since ${date}:`,
      fell: (count: number, date: string) =>
        `${count} fell below 15% since ${date}:`,
      none: "none",
      noPrevious:
        "No earlier month is published, so there is no movement to show yet.",
      all: (total: number) => `All ${total} in the register`,
      code: "Code",
      company: "Company",
      bound: "Bound",
      before: "Month before",
      notInPrior: "Not in the earlier register",
      deadlines: "Possible deadlines",
    },
    timeline: {
      heading: "Timeline",
      note: "Dates are as reported in the press unless a source is marked primary. The rule text itself (revised Peraturan Bursa I-A) was not read in full.",
      date: "Date",
      event: "Event and source",
      passed: "Passed",
      next: "Next",
      source: "Source: ",
      primary: " (primary source)",
      foldSummary: "Deadlines by tranche, and the rule's sources",
      tranches: "Deadlines by tranche",
      ruleBefore: "The rule as reported by ",
      sourceJoin: " and ",
      ruleAfter: ".",
    },
    method: {
      heading: "Methodology",
      paragraphs: [
        {
          lead: "The official definition.",
          body: "Free float is the shares held by shareholders who each hold less than 5% and are not the controller or its affiliates, a director or commissioner, and not treasury or locked-up shares (Peraturan Bursa I-A, as reported).",
        },
        {
          lead: "What the register shows.",
          body: "Every holder of more than 1%, with type, local or foreign, and shares, as of the month's last trading day. It does not say who is an affiliate or an insider, and shows nothing below 1%.",
        },
        {
          lead: "Sigi's figure: an upper bound.",
          body: "100% minus every holder of 5% or more, with a holder's rows added together first. Everything the register cannot see only lowers the official figure, so the official free float is this bound or lower. A company whose bound is under 15% is therefore certainly below the minimum; one above it may still be below.",
        },
        {
          lead: "Why the counts differ.",
          body: "Sigi's count is a floor on the exchange's. It also uses an older or newer month than the exchange's count, and the exchange uses its own records, not this register.",
        },
        {
          lead: "Incomplete registers.",
          body: "When a company's holders above 1% add up to less than 15%, Sigi gives no float figure. In the 27 February 2026 file that is BBRI, BBNI, BBTN, ADHI and NCKL, each missing a known controlling holder.",
        },
        {
          lead: "Holders.",
          body: "A holder's rows are matched across companies and months by name, after removing case, full stops and commas; other spellings are merged only by a reviewed alias list. Holders who are individuals, or whose type is unclassified, never get their own page.",
        },
      ],
    },
  },
  id: {
    metaTitle: "Kelayakan investasi",
    title: "Kelayakan investasi: aturan free float 15%",
    lede: "Bursa menaikkan batas minimum free float menjadi 15% pada 31 Maret 2026, dengan tenggat bertahap hingga 2029, sementara MSCI mempertimbangkan memindahkan Indonesia ke status Standalone. Sigi menghitung emiten yang menurut daftar bulanannya berada di bawah batas itu. Angka ini perkiraan, bukan hitungan resmi, yang berdiri di sebelahnya.",
    asOf: (date: string) => `Per ${date}`,
    pressReport: " (laporan pers)",
    counts: {
      heading: "Di bawah 15%: hitungan Sigi dan hitungan bursa",
      sigi: (date: string) => `Sigi, ${date}: pasti di bawah 15%`,
      sigiNote: "Batas atas free float pun di bawah 15%",
      exchangeNearest: (date: string) => `Bursa, ${date}`,
      exchangeNearestNote: "Terdekat dengan bulan Sigi",
      exchangeLatest: (date: string) => `Bursa, ${date}`,
      exchangeLatestNote: "Laporan terbaru",
      ofListed: (listed: number) => ` dari ${listed}`,
      nextDate: "Tanggal berikutnya di lini masa",
      note: "Sigi hanya menghitung emiten yang batas atasnya pun di bawah 15%, sehingga hitungannya adalah batas bawah: bursa juga mengeluarkan afiliasi, orang dalam, saham treasuri, dan saham yang dikunci di bawah 5%, yang tidak terlihat dalam daftar.",
      sourceSummary: "Dari mana hitungan bursa berasal",
      gap: "Bursa menghitung semua emiten tercatat dari catatannya sendiri, jadi selisih kedua hitungan berasal dari definisi, tanggal, dan sumber sekaligus. Angka bursa sebagaimana dilaporkan oleh ",
      and: " dan ",
      end: ".",
      method: "Cara batas atas dihitung",
    },
    bands: {
      heading: "Emiten menurut batas atas free float",
      note: "Setiap rentang membuka daftar yang disaring ke rentang itu. Batang merah adalah rentang di bawah garis 15%.",
      bound: "Batas atas free float",
      companies: "Emiten",
      line: "Batas minimum 15%",
      labels: {
        "under-5": "Di bawah 5%",
        "5-to-12.5": "5% hingga 12,5%",
        "12.5-to-15": "12,5% hingga 15%",
        "15-to-25": "15% hingga 25%",
        "25-to-50": "25% hingga 50%",
        "50-up": "50% ke atas",
      },
      noFigure: "Tanpa angka: daftar tidak lengkap",
      incompleteBefore: "Daftar tidak lengkap (",
      incompleteAfter:
        "): pemegang saham di atas 1% totalnya di bawah 15%, dan pada setiap kasus yang diperiksa, ada pemegang saham pengendali yang diketahui tetapi tidak tercantum dalam berkas.",
    },
    below: {
      heading: (count: number) => `Pasti di bawah 15% (${count})`,
      stamp: (shown: number, total: number) =>
        shown < total
          ? `${shown} dengan batas atas terendah`
          : `Semua ${total}`,
      intro:
        "Tenggatnya bergantung pada kapitalisasi pasar, yang tidak dimiliki Sigi (Sigi tidak menyimpan harga), sehingga setiap kelompok menampilkan tahap yang masih mungkin berlaku berdasarkan batas atasnya.",
      rose: (count: number, date: string) =>
        `${count} naik di atas 15% sejak ${date}:`,
      fell: (count: number, date: string) =>
        `${count} turun di bawah 15% sejak ${date}:`,
      none: "tidak ada",
      noPrevious:
        "Belum ada bulan sebelumnya yang diterbitkan, sehingga belum ada pergerakan untuk ditampilkan.",
      all: (total: number) => `Semua ${total} di daftar`,
      code: "Kode",
      company: "Perusahaan",
      bound: "Batas atas",
      before: "Bulan sebelumnya",
      notInPrior: "Tidak ada di daftar sebelumnya",
      deadlines: "Tenggat yang mungkin",
    },
    timeline: {
      heading: "Lini masa",
      note: "Tanggal sebagaimana dilaporkan pers, kecuali sumbernya ditandai primer. Teks aturannya sendiri (Peraturan Bursa I-A yang direvisi) belum dibaca secara penuh.",
      date: "Tanggal",
      event: "Peristiwa dan sumber",
      passed: "Sudah lewat",
      next: "Berikutnya",
      source: "Sumber: ",
      primary: " (sumber primer)",
      foldSummary: "Tenggat menurut tahap, dan sumber aturannya",
      tranches: "Tenggat menurut tahap",
      ruleBefore: "Aturan sebagaimana dilaporkan oleh ",
      sourceJoin: " dan ",
      ruleAfter: ".",
    },
    method: {
      heading: "Metodologi",
      paragraphs: [
        {
          lead: "Definisi resmi.",
          body: "Free float adalah saham yang dipegang pemegang saham yang masing-masing memiliki kurang dari 5% dan bukan pengendali atau afiliasinya, direktur atau komisaris, serta bukan saham treasuri atau saham yang dikunci (Peraturan Bursa I-A, sebagaimana dilaporkan).",
        },
        {
          lead: "Apa yang ditampilkan daftar.",
          body: "Setiap pemegang saham di atas 1%, dengan tipe, lokal atau asing, dan jumlah saham, per hari perdagangan terakhir bulan itu. Daftar tidak menyebutkan siapa yang afiliasi atau orang dalam, dan tidak menampilkan apa pun di bawah 1%.",
        },
        {
          lead: "Angka Sigi: batas atas.",
          body: "100% dikurangi setiap pemegang saham 5% atau lebih, dengan baris-baris seorang pemegang saham dijumlahkan terlebih dahulu. Semua yang tidak terlihat dalam daftar hanya menurunkan angka resmi, sehingga free float resmi sama dengan batas ini atau lebih rendah. Emiten yang batas atasnya di bawah 15% karena itu pasti di bawah batas minimum; yang di atasnya masih mungkin berada di bawah.",
        },
        {
          lead: "Mengapa hitungannya berbeda.",
          body: "Hitungan Sigi adalah batas bawah dari hitungan bursa. Hitungan itu juga memakai bulan yang lebih lama atau lebih baru daripada hitungan bursa, dan bursa memakai catatannya sendiri, bukan daftar ini.",
        },
        {
          lead: "Daftar yang tidak lengkap.",
          body: "Bila pemegang saham di atas 1% suatu emiten berjumlah kurang dari 15%, Sigi tidak memberikan angka free float. Pada berkas 27 Februari 2026 itu terjadi pada BBRI, BBNI, BBTN, ADHI, dan NCKL, yang masing-masing tidak mencantumkan pemegang saham pengendali yang diketahui.",
        },
        {
          lead: "Pemegang saham.",
          body: "Baris-baris seorang pemegang saham dicocokkan lintas emiten dan bulan menurut nama, setelah menghapus huruf besar-kecil, titik, dan koma; ejaan lain digabungkan hanya melalui daftar alias yang telah ditinjau. Pemegang saham perorangan, atau yang tipenya tidak terklasifikasi, tidak pernah mendapat halaman sendiri.",
        },
      ],
    },
  },
});
