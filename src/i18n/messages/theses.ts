import { defineMessages } from "../define";

export const thesesMessages = defineMessages({
  en: {
    metaTitle: "Theses",
    notFoundTitle: "Not found",
    notAdvice:
      "Theses are the author’s research notes, not investment advice. They describe a view and the conditions that would show it wrong; they do not recommend any transaction in any security.",
    checkStatus: {
      met: "Hit",
      "not-met": "Holding",
      unknown: "Unknown",
      manual: "Check by hand",
    },
    counts: {
      hit: (n: number) => `${n} hit`,
      holding: (n: number) => `${n} holding`,
      manual: (n: number) => `${n} to check by hand`,
      unknown: (n: number) => `${n} unknown`,
      unchecked: (n: number) => `${n} not checked yet`,
    },
    distance: {
      today: "today",
      future: (span: string) => `in ${span}`,
      past: (span: string) => `${span} ago`,
      days: (n: number) => `${n} ${n === 1 ? "day" : "days"}`,
      months: (n: number) => `${n} ${n === 1 ? "month" : "months"}`,
      years: (n: number) => `${n} ${n === 1 ? "year" : "years"}`,
    },
    doneLabel: "Done",
    notDoneLabel: "Not done",
    conditions: {
      holderPage: "holder page",
      condition: "Condition",
      threshold: "Threshold",
      reading: "Current reading",
      status: "Status",
      asOf: (date: string) => `As of ${date}`,
      since: (date: string) => `Hit since ${date}`,
      notChecked: "Not checked yet; the worker checks every condition daily.",
      below: "below",
      above: "above",
      ownership: (holder: string, code: string) =>
        `Stake of ${holder} in ${code}`,
      float: (code: string) => `Free float of ${code}`,
      from: (date: string) => `from ${date}`,
      date: (note: string) => `By the date: ${note}`,
      price: (code: string) => `Price of ${code}`,
      source: (name: string) => `Source: ${name}`,
    },
    list: {
      heading: "Theses",
      lede: "The views held on Sigi, and what would prove each one wrong. The worker checks every ownership, float, macro and date condition each day against Sigi’s own published data.",
      hitsHeading: "Conditions hit",
      hitsStamp: (date: string) => `Checked ${date}`,
      none: "No thesis is published yet.",
      noneMet: (date: string) =>
        `No condition of an active thesis is hit (checked ${date}).`,
      notCheckedYet:
        "The conditions have not been checked yet; the worker checks them daily.",
      heldHeading: "Views held",
      heldNote:
        "Active theses, soonest review first. Each row says what the latest check found.",
      closedHeading: "No longer held",
      closedNote:
        "Invalidated or closed. They stay listed so the record is whole.",
      unreadableHeading: "Could not be read",
      unreadableNote:
        "These files have a block that does not follow the format, so nothing is guessed from them.",
      thesis: "Thesis",
      tickers: "Tickers",
      status: "Status",
      review: "Review by",
      latestCheck: "Latest check",
      version: "Version",
      checked: (date: string) => `checked ${date}`,
      notChecked: "Not checked yet",
      noConditions: "Conditions unreadable",
      headerUnreadable: "Header unreadable: ",
      conditionsUnreadable: "Conditions unreadable: ",
      versions: (count: number) => `${count} versions`,
      hitThesis: "Thesis",
      hitCondition: "Condition",
      hitReading: "Reading",
      hitSince: "Hit since",
      whatHeading: "What a thesis is on Sigi",
      whatNote:
        "A thesis is a view written down so that it can be proved wrong. Each one has:",
      whatTickers: "Tickers",
      whatTickersText:
        "The listed companies it is about, each linked to its page.",
      whatStance: "A stance",
      whatStanceText:
        "One line that describes the view. It never says to buy, sell or hold.",
      whatReview: "A review date",
      whatReviewText: "The day the author means to read it again.",
      whatCatalysts: "Dated catalysts",
      whatCatalystsText: "Events expected to move the view, with their dates.",
      whatConditions: "Invalidation conditions",
      whatConditionsText:
        "What would show the view wrong, written so that the worker can check each one every day against ownership, free float, macro readings and dates.",
      whatVersions:
        "Every version is kept, and the page shows what changed since the one before.",
      exampleHeading: "What a condition looks like",
      exampleLabel: "Example, not a published view",
      exampleNote:
        "This is an illustration with made-up names. It is not a published view, and nothing on Sigi is checked against it.",
      exampleWritten: "Written as",
      exampleReads: "Reads as",
      exampleChecked: "Checked against",
      exampleRows: [
        {
          reads: "The named institution’s stake in ABCD is below 50%.",
          checked: "The latest monthly ownership register.",
        },
        {
          reads:
            "ABCD’s free float is below 12.5%, counted from 31 Mar 2027 on.",
          checked:
            "The latest register. It gives an upper bound, so only “below” can be shown.",
        },
        {
          reads: "The BI-Rate is above 6.25%.",
          checked: "The latest published value of that series.",
        },
        {
          reads: "On 30 Jun 2027 the thing the author expected has not come.",
          checked: "The calendar. It is hit on the day it names.",
        },
        {
          reads: "ABCD trades below 3,500.",
          checked: "By hand. Sigi stores no prices.",
        },
      ],
      statesHeading: "How each condition is read",
      statesNote:
        "Every condition is in one of four states each day, with its reason beside it.",
      stateHolding: "The reading has not reached the threshold.",
      stateHit: "The reading has reached it. The page says since when.",
      stateManual: "Sigi cannot read it, as with a price. Look it up yourself.",
      stateUnknown: "The data was missing that day. The reason is given.",
      dataLink: "Data and sources",
    },
    page: {
      diffTooLarge: (lines: number) =>
        `The versions are too long to compare here (${lines} lines).`,
      diffNoChange: (date: string) => `No change in the text from ${date}.`,
      diffCounts: (added: number, removed: number, date: string) =>
        `${added} line${added === 1 ? "" : "s"} added, ${removed} removed since ${date}.`,
      versionOf: (date: string) => `This is the version of ${date}.`,
      readCurrent: "Read the current version",
      tickers: "Tickers",
      versionStamp: (date: string) => `Version of ${date}`,
      headerUnreadable: "Header unreadable: ",
      standingHeading: "Where it stands",
      standingNote: (hit: number, total: number) =>
        `${hit} of ${total} ${total === 1 ? "condition" : "conditions"} hit.`,
      standingStamp: (date: string) => `Checked ${date}`,
      standingNone: "The worker has not checked these conditions yet.",
      standingOlder:
        "This is an older version. Only the current version’s conditions are checked.",
      figureHit: "Hit",
      figureHolding: "Holding",
      figureManual: "Check by hand",
      figureUnknown: "Unknown",
      figureUnchecked: "Not checked yet",
      invalidation: "Invalidation conditions",
      invalidationNote:
        "What would show the view wrong. The worker checks each one every day.",
      sourceSummary: "How the conditions are checked",
      citationBefore:
        "Checked against Sigi’s own published data: ownership and float from the latest monthly register, macro from the latest published value. Prices are not stored (C1), so price levels are a manual check. See ",
      citationLink: "Data & sources",
      citationAfter: ".",
      conditionsUnreadable: "Conditions unreadable: ",
      datesHeading: "Dates",
      datesNote: "The review date and the catalysts, earliest first.",
      review: "Review: the author reads this thesis again.",
      thesis: "The thesis",
      history: "Version history",
      versionsFold: (count: number) =>
        `${count} ${count === 1 ? "version" : "versions"}, with what changed`,
      current: "current",
      changesHeading: "Changes from the previous version",
      firstVersion: "This is the first version.",
    },
  },
  id: {
    metaTitle: "Tesis",
    notFoundTitle: "Tidak ditemukan",
    notAdvice:
      "Tesis adalah catatan riset penulis, bukan nasihat investasi. Tesis menggambarkan sebuah pandangan dan kondisi yang akan membuktikannya keliru; tesis tidak merekomendasikan transaksi apa pun atas efek apa pun.",
    checkStatus: {
      met: "Terpicu",
      "not-met": "Bertahan",
      unknown: "Tidak diketahui",
      manual: "Cek manual",
    },
    counts: {
      hit: (n: number) => `${n} terpicu`,
      holding: (n: number) => `${n} bertahan`,
      manual: (n: number) => `${n} untuk dicek manual`,
      unknown: (n: number) => `${n} tidak diketahui`,
      unchecked: (n: number) => `${n} belum dicek`,
    },
    distance: {
      today: "hari ini",
      future: (span: string) => `dalam ${span}`,
      past: (span: string) => `${span} lalu`,
      days: (n: number) => `${n} hari`,
      months: (n: number) => `${n} bulan`,
      years: (n: number) => `${n} tahun`,
    },
    doneLabel: "Selesai",
    notDoneLabel: "Belum selesai",
    conditions: {
      holderPage: "halaman pemegang saham",
      condition: "Kondisi",
      threshold: "Ambang",
      reading: "Bacaan terkini",
      status: "Status",
      asOf: (date: string) => `Per ${date}`,
      since: (date: string) => `Terpicu sejak ${date}`,
      notChecked:
        "Belum dicek; pekerja sistem mengecek setiap kondisi setiap hari.",
      below: "di bawah",
      above: "di atas",
      ownership: (holder: string, code: string) =>
        `Kepemilikan ${holder} di ${code}`,
      float: (code: string) => `Free float ${code}`,
      from: (date: string) => `mulai ${date}`,
      date: (note: string) => `Pada tanggal itu: ${note}`,
      price: (code: string) => `Harga ${code}`,
      source: (name: string) => `Sumber: ${name}`,
    },
    list: {
      heading: "Tesis",
      lede: "Pandangan yang dipegang di Sigi, dan apa yang akan membuktikan masing-masing keliru. Setiap hari pekerja sistem mengecek semua kondisi kepemilikan, free float, makro, dan tanggal terhadap data yang diterbitkan Sigi sendiri.",
      hitsHeading: "Kondisi yang terpicu",
      hitsStamp: (date: string) => `Dicek ${date}`,
      none: "Belum ada tesis yang diterbitkan.",
      noneMet: (date: string) =>
        `Tidak ada kondisi tesis aktif yang terpicu (dicek ${date}).`,
      notCheckedYet:
        "Kondisi belum dicek; pekerja sistem mengeceknya setiap hari.",
      heldHeading: "Pandangan yang dipegang",
      heldNote:
        "Tesis aktif, yang paling dekat tinjauannya di atas. Setiap baris memuat hasil pengecekan terakhir.",
      closedHeading: "Tidak lagi dipegang",
      closedNote: "Gugur atau ditutup. Tetap didaftar agar catatannya utuh.",
      unreadableHeading: "Tidak dapat dibaca",
      unreadableNote:
        "Berkas ini punya blok yang tidak mengikuti format, jadi tidak ada yang ditebak darinya.",
      thesis: "Tesis",
      tickers: "Kode saham",
      status: "Status",
      review: "Ditinjau paling lambat",
      latestCheck: "Pengecekan terakhir",
      version: "Versi",
      checked: (date: string) => `dicek ${date}`,
      notChecked: "Belum dicek",
      noConditions: "Kondisi tidak terbaca",
      headerUnreadable: "Header tidak terbaca: ",
      conditionsUnreadable: "Kondisi tidak terbaca: ",
      versions: (count: number) => `${count} versi`,
      hitThesis: "Tesis",
      hitCondition: "Kondisi",
      hitReading: "Bacaan",
      hitSince: "Terpicu sejak",
      whatHeading: "Apa itu tesis di Sigi",
      whatNote:
        "Tesis adalah pandangan yang ditulis agar bisa dibuktikan keliru. Setiap tesis memuat:",
      whatTickers: "Kode saham",
      whatTickersText:
        "Perusahaan tercatat yang dibahas, masing-masing ditautkan ke halamannya.",
      whatStance: "Sikap",
      whatStanceText:
        "Satu baris yang menggambarkan pandangan. Tidak pernah menyuruh membeli, menjual, atau menahan.",
      whatReview: "Tanggal tinjauan",
      whatReviewText: "Hari ketika penulis berniat membacanya lagi.",
      whatCatalysts: "Katalis bertanggal",
      whatCatalystsText:
        "Peristiwa yang diperkirakan menggerakkan pandangan, beserta tanggalnya.",
      whatConditions: "Kondisi pembatalan",
      whatConditionsText:
        "Apa yang akan membuktikan pandangan itu keliru, ditulis agar pekerja sistem dapat mengecek tiap kondisi setiap hari terhadap kepemilikan, free float, data makro, dan tanggal.",
      whatVersions:
        "Setiap versi disimpan, dan halamannya menunjukkan apa yang berubah sejak versi sebelumnya.",
      exampleHeading: "Seperti apa sebuah kondisi",
      exampleLabel: "Contoh, bukan pandangan yang diterbitkan",
      exampleNote:
        "Ini ilustrasi dengan nama rekaan. Ini bukan pandangan yang diterbitkan, dan tidak ada data Sigi yang dicek terhadapnya.",
      exampleWritten: "Ditulis",
      exampleReads: "Dibaca",
      exampleChecked: "Dicek terhadap",
      exampleRows: [
        {
          reads: "Kepemilikan lembaga itu di ABCD di bawah 50%.",
          checked: "Daftar kepemilikan bulanan terbaru.",
        },
        {
          reads: "Free float ABCD di bawah 12,5%, dihitung mulai 31 Mar 2027.",
          checked:
            "Daftar terbaru. Daftar itu memberi batas atas, sehingga hanya “di bawah” yang bisa ditunjukkan.",
        },
        {
          reads: "BI-Rate di atas 6,25%.",
          checked: "Nilai terbitan terbaru dari seri itu.",
        },
        {
          reads: "Pada 30 Jun 2027 hal yang diharapkan penulis belum terjadi.",
          checked: "Kalender. Terpicu pada hari yang disebutnya.",
        },
        {
          reads: "ABCD diperdagangkan di bawah 3.500.",
          checked: "Secara manual. Sigi tidak menyimpan harga.",
        },
      ],
      statesHeading: "Cara tiap kondisi dibaca",
      statesNote:
        "Setiap hari, setiap kondisi berada dalam satu dari empat keadaan, dengan alasannya di sampingnya.",
      stateHolding: "Bacaan belum mencapai ambang.",
      stateHit: "Bacaan sudah mencapainya. Halaman menyebut sejak kapan.",
      stateManual:
        "Sigi tidak dapat membacanya, seperti harga. Periksa sendiri.",
      stateUnknown: "Datanya tidak ada hari itu. Alasannya disebutkan.",
      dataLink: "Data dan sumber",
    },
    page: {
      diffTooLarge: (lines: number) =>
        `Versi-versi ini terlalu panjang untuk dibandingkan di sini (${lines} baris).`,
      diffNoChange: (date: string) => `Tidak ada perubahan teks dari ${date}.`,
      diffCounts: (added: number, removed: number, date: string) =>
        `${added} baris ditambahkan, ${removed} dihapus sejak ${date}.`,
      versionOf: (date: string) => `Ini adalah versi tanggal ${date}.`,
      readCurrent: "Baca versi terkini",
      tickers: "Kode saham",
      versionStamp: (date: string) => `Versi ${date}`,
      headerUnreadable: "Header tidak terbaca: ",
      standingHeading: "Posisinya sekarang",
      standingNote: (hit: number, total: number) =>
        `${hit} dari ${total} kondisi terpicu.`,
      standingStamp: (date: string) => `Dicek ${date}`,
      standingNone: "Pekerja sistem belum mengecek kondisi ini.",
      standingOlder: "Ini versi lama. Hanya kondisi versi terkini yang dicek.",
      figureHit: "Terpicu",
      figureHolding: "Bertahan",
      figureManual: "Cek manual",
      figureUnknown: "Tidak diketahui",
      figureUnchecked: "Belum dicek",
      invalidation: "Kondisi pembatalan",
      invalidationNote:
        "Apa yang akan membuktikan pandangan itu keliru. Pekerja sistem mengecek tiap kondisi setiap hari.",
      sourceSummary: "Cara kondisi dicek",
      citationBefore:
        "Dicek terhadap data yang diterbitkan Sigi sendiri: kepemilikan dan free float dari daftar bulanan terbaru, data makro dari nilai terbitan terbaru. Harga tidak disimpan (C1), sehingga level harga harus dicek manual. Lihat ",
      citationLink: "Data & sumber",
      citationAfter: ".",
      conditionsUnreadable: "Kondisi tidak terbaca: ",
      datesHeading: "Tanggal",
      datesNote: "Tanggal tinjauan dan katalis, yang paling awal di atas.",
      review: "Tinjauan: penulis membaca tesis ini lagi.",
      thesis: "Tesisnya",
      history: "Riwayat versi",
      versionsFold: (count: number) => `${count} versi, beserta perubahannya`,
      current: "terkini",
      changesHeading: "Perubahan dari versi sebelumnya",
      firstVersion: "Ini adalah versi pertama.",
    },
  },
});
