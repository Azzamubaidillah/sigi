import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

import { loadConfig } from "../src/config";
import { openDatabase } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";
import { jakartaDate } from "../src/fetch/s1-fetch";
import { checkTheses } from "../src/theses/check";
import {
  COMPANIES,
  DATA_DIR,
  EMPTY_DIR,
  HOLDERS,
  MONTHS,
  THESES,
  THESES_DIR,
  writeManifest,
} from "./world";

/**
 * Builds the synthetic site the suites run against: a migrated database with
 * two published months and macro series, the worker's feed and import history
 * (including a rejected file), two theses, and a daily brief. Everything is
 * invented, written straight into the published tables the way the unit
 * tests do, and recreated from nothing on every run.
 */

const FETCHED_AT = Date.parse("2026-10-24T22:00:00Z");

interface Row {
  code: string;
  issuer: string;
  holder: string;
  type: string;
  localForeign: "L" | "F";
  domicile: string;
  hundredths: number;
  /** Overrides the scripless/scrip split, to publish a row that does not add up. */
  split?: [scripless: number, scrip: number];
}

const { steady, sellingDown, incomplete, belowMinimum } = COMPANIES;

const row = (
  company: { code: string; issuer: string },
  holder: string,
  type: string,
  hundredths: number,
  extra: Partial<Row> = {},
): Row => ({
  code: company.code,
  issuer: company.issuer,
  holder,
  type,
  localForeign: "L",
  domicile: "INDONESIA",
  hundredths,
  ...extra,
});

const previousMonth: Row[] = [
  row(steady, HOLDERS.parent.name, "Corporate", 6_000),
  row(steady, HOLDERS.fund.name, "Pension Funds", 200),
  row(steady, HOLDERS.individual.name, "Individual", 150),
  row(sellingDown, "PT INDUK BBBB", "Corporate", 8_600),
  row(sellingDown, HOLDERS.fund.name, "Pension Funds", 300),
  row(incomplete, "CAMPURAN", "Individual", 500),
  row(incomplete, "PT KECIL", "Corporate", 300),
];

const latestMonth: Row[] = [
  row(steady, HOLDERS.parent.name, "Corporate", 6_000),
  row(steady, HOLDERS.fund.name, "Pension Funds", 450),
  row(steady, "GLOBAL FUND LTD", "Mutual Funds", 300, {
    localForeign: "F",
    domicile: "SINGAPORE",
  }),
  row(steady, HOLDERS.individual.name, "Individual", 150),
  // The controller sells down from 86% to 82%: the bound rises to 18%.
  row(sellingDown, "PT INDUK BBBB", "Corporate", 8_200),
  row(incomplete, "CAMPURAN", "Individual", 500),
  // Published with total shares that differ from scripless plus scrip.
  row(incomplete, "PT KECIL", "Corporate", 300, {
    split: [2_000_000, 500_000],
  }),
  // A new 90% controller: a bound of 10%, certainly below the minimum.
  row(belowMinimum, "PT INDUK DDDD", "Corporate", 9_000),
  row(belowMinimum, HOLDERS.fund.name, "Pension Funds", 150),
];

function insertFile(
  sqlite: Database.Database,
  sha: string,
  source: string,
  name: string,
  url: string,
): void {
  sqlite
    .prepare(
      `INSERT INTO source_files (sha256, source_id, original_name, byte_size, stored_name, source_url, accessed_on, fetched_at)
       VALUES (?, ?, ?, 1024, ?, ?, '2026-10-24', ?)`,
    )
    .run(sha, source, name, `${sha}.bin`, url, FETCHED_AT);
}

function insertRun(
  sqlite: Database.Database,
  fields: {
    source: string;
    sha: string;
    parser: string;
    outcome: "published" | "rejected";
    recordDate: string | null;
    rows: number | null;
    parseError?: string;
    correction?: boolean;
    startedAt: number;
  },
): number {
  return Number(
    sqlite
      .prepare(
        `INSERT INTO import_runs (source_id, file_sha256, parser_version, started_at, finished_at,
           outcome, parse_error, record_date, row_count, issuer_count, holder_count, content_hash, correction)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      )
      .run(
        fields.source,
        fields.sha,
        fields.parser,
        fields.startedAt,
        fields.startedAt + 4_000,
        fields.outcome,
        fields.parseError ?? null,
        fields.recordDate,
        fields.rows,
        fields.sha.slice(0, 16),
        fields.correction ? 1 : 0,
      ).lastInsertRowid,
  );
}

type Verdict = "pass" | "warn" | "fail";
const GATES: [gate: string, detail: string][] = [
  ["record_date", "matches the file name"],
  ["row_count", "within 10% of the previous month"],
  ["share_code", "all four-letter codes"],
  ["percent_range", "all in (0, 100]"],
  ["percent_sum", "every company at most 100%"],
  ["shares_identity", "every row adds up"],
  ["classification", "every investor type known"],
  ["holder_count_change", "no company moved by more than 30%"],
];

function insertGates(
  sqlite: Database.Database,
  run: number,
  overrides: Record<string, [Verdict, string]> = {},
): void {
  const insert = sqlite.prepare(
    "INSERT INTO gate_results (import_run_id, gate, verdict, detail) VALUES (?, ?, ?, ?)",
  );
  for (const [gate, detail] of GATES) {
    const [verdict, text] = overrides[gate] ?? ["pass", detail];
    insert.run(run, gate, verdict, text);
  }
}

function publishMonth(
  sqlite: Database.Database,
  recordDate: string,
  rows: Row[],
  gates: Record<string, [Verdict, string]> = {},
): void {
  const sha = recordDate.replaceAll("-", "").padEnd(64, "a");
  insertFile(
    sqlite,
    sha,
    "S1",
    `Pemegang Saham di Atas 1% ${recordDate}.xlsx`,
    `https://example.test/idx/${recordDate}.xlsx`,
  );
  const run = insertRun(sqlite, {
    source: "S1",
    sha,
    parser: "s1-xlsx/1",
    outcome: "published",
    recordDate,
    rows: rows.length,
    startedAt:
      FETCHED_AT - (recordDate === MONTHS.latest ? 0 : 86_400_000 * 30),
  });
  insertGates(sqlite, run, gates);
  const issuers = new Set(rows.map((r) => r.code)).size;
  const holders = new Set(rows.map((r) => r.holder)).size;
  sqlite
    .prepare(
      `INSERT INTO ownership_months (record_date, import_run_id, published_at, content_hash, row_count, issuer_count, holder_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      recordDate,
      run,
      FETCHED_AT,
      sha.slice(0, 16),
      rows.length,
      issuers,
      holders,
    );
  const insert = sqlite.prepare(
    `INSERT INTO ownership_holdings (record_date, row_number, share_code, issuer_name, investor_name, investor_type,
       local_foreign, nationality, domicile, shares_scripless, shares_scrip, shares_total, percent_hundredths)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
  );
  rows.forEach((r, index) => {
    const total = r.hundredths * 10_000;
    const [scripless, scrip] = r.split ?? [total, 0];
    insert.run(
      recordDate,
      index + 1,
      r.code,
      r.issuer,
      r.holder,
      r.type,
      r.localForeign,
      r.domicile,
      scripless,
      scrip,
      total,
      r.hundredths,
    );
  });
}

/** A file the checks refused, and one that could not be read: neither is published. */
function rejectedImports(sqlite: Database.Database): void {
  const bad = "f".repeat(64);
  insertFile(
    sqlite,
    bad,
    "S1",
    "Pemegang Saham di Atas 1% 2026-10-30.xlsx",
    "https://example.test/idx/2026-10-30.xlsx",
  );
  const rejected = insertRun(sqlite, {
    source: "S1",
    sha: bad,
    parser: "s1-xlsx/1",
    outcome: "rejected",
    recordDate: "2026-10-30",
    rows: 8,
    startedAt: FETCHED_AT + 3_600_000,
  });
  insertGates(sqlite, rejected, {
    percent_sum: ["fail", "FAIL: AAAA totals 104.00% (limit 100%)"],
    share_code: ["warn", "1 code looks unusual: AA1A"],
  });
  const unreadable = "e".repeat(64);
  insertFile(
    sqlite,
    unreadable,
    "S1",
    "Pemegang Saham di Atas 1% 2026-10-29.xlsx",
    "https://example.test/idx/2026-10-29.xlsx",
  );
  insertRun(sqlite, {
    source: "S1",
    sha: unreadable,
    parser: "s1-xlsx/1",
    outcome: "rejected",
    recordDate: null,
    rows: null,
    parseError: "header row not found in sheet 1",
    startedAt: FETCHED_AT + 2 * 3_600_000,
  });
}

/** One series as published: observation periods oldest first, and their values. */
interface Observations {
  periods: string[];
  values: number[];
}

interface Feed {
  source: string;
  series: Record<string, Observations>;
}

/** `2025-08` … `2026-09`: fourteen months, enough for a year-on-year figure and a chart. */
const MONTHS_PUBLISHED = Array.from({ length: 14 }, (_, i) =>
  new Date(Date.UTC(2025, 7 + i, 1)).toISOString().slice(0, 7),
);

/** Every weekday from 2025-08-01 to 2026-09-30. */
const WEEKDAYS_PUBLISHED: string[] = [];
for (
  let day = Date.UTC(2025, 7, 1);
  day <= Date.UTC(2026, 8, 30);
  day += 86_400_000
) {
  const weekday = new Date(day).getUTCDay();
  if (weekday !== 0 && weekday !== 6)
    WEEKDAYS_PUBLISHED.push(new Date(day).toISOString().slice(0, 10));
}

/** A straight line from `start` by `step`, one value per period, to two decimals. */
const line = (
  periods: string[],
  start: number,
  step: number,
): Observations => ({
  periods,
  values: periods.map((_, i) => Math.round((start + step * i) * 100) / 100),
});

const FEEDS: Record<string, Feed> = {
  "bi-rate": {
    source: "S6",
    series: {
      // Policy meetings, about monthly; the latest rate is above 6.25.
      "bi-rate": {
        periods: [
          "2025-08-20",
          "2025-09-17",
          "2025-10-15",
          "2025-11-19",
          "2025-12-17",
          "2026-01-21",
          "2026-02-18",
          "2026-03-18",
          "2026-04-22",
          "2026-05-20",
          "2026-06-17",
          "2026-07-22",
          "2026-08-19",
          "2026-09-16",
        ],
        values: [
          5.25, 5.25, 5.25, 5.25, 5.5, 5.5, 5.75, 5.75, 6, 6, 6.25, 6.25, 6.5,
          6.5,
        ],
      },
    },
  },
  "bi-inflation": {
    source: "S6",
    series: { "cpi-yoy": line(MONTHS_PUBLISHED, 2.5, 0.1) },
  },
  "bi-jisdor": {
    source: "S6",
    series: { jisdor: line(WEEKDAYS_PUBLISHED, 15_800, 4) },
  },
  "wb-pink-sheet": {
    source: "S7",
    series: {
      brent: line(MONTHS_PUBLISHED, 70, 0.8),
      coal: line(MONTHS_PUBLISHED, 110, 1.5),
      "palm-oil": line(MONTHS_PUBLISHED, 900, 6),
      nickel: line(MONTHS_PUBLISHED, 15_000, 40),
      tin: line(MONTHS_PUBLISHED, 31_000, 90),
      gold: line(MONTHS_PUBLISHED, 2_800, 25),
    },
  },
  "fred-DTWEXBGS": {
    source: "S8",
    series: { "usd-broad": line(WEEKDAYS_PUBLISHED, 118, 0.01) },
  },
  "bis-eer": {
    source: "S11",
    series: { "reer-idr": line(MONTHS_PUBLISHED, 98, -0.4) },
  },
};

function publishMacro(sqlite: Database.Database): void {
  const insertSeries = sqlite.prepare(
    `INSERT INTO macro_series (series_id, import_run_id, published_at, content_hash, observation_count, latest_period, latest_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertObservation = sqlite.prepare(
    "INSERT INTO macro_observations (series_id, period, value) VALUES (?, ?, ?)",
  );
  for (const [feed, definition] of Object.entries(FEEDS)) {
    const sha = Buffer.from(feed).toString("hex").padEnd(64, "b");
    insertFile(
      sqlite,
      sha,
      definition.source,
      `${feed}.xlsx`,
      `https://example.test/macro/${feed}`,
    );
    const run = insertRun(sqlite, {
      source: definition.source,
      sha,
      parser: "e2e/1",
      outcome: "published",
      recordDate: null,
      rows: 1,
      startedAt: FETCHED_AT,
    });
    for (const [id, { periods, values }] of Object.entries(definition.series)) {
      insertSeries.run(
        id,
        run,
        FETCHED_AT,
        sha.slice(0, 16),
        values.length,
        periods[periods.length - 1],
        FETCHED_AT,
      );
      periods.forEach((period, i) =>
        insertObservation.run(id, period, values[i]),
      );
    }
    sqlite
      .prepare(
        `INSERT INTO fetch_runs (feed, started_at, finished_at, outcome, listed, fetched, error)
         VALUES (?, ?, ?, 'ok', 1, 1, NULL)`,
      )
      .run(feed, FETCHED_AT, FETCHED_AT + 3_000);
  }
}

/** The typed reasons a series can be absent: a failed fetch, a refused file; "never fetched" has no row. */
function absentFeeds(sqlite: Database.Database): void {
  const insert = sqlite.prepare(
    `INSERT INTO fetch_runs (feed, started_at, finished_at, outcome, listed, fetched, error)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  insert.run(
    "fred-DFEDTARU",
    FETCHED_AT,
    FETCHED_AT + 3_000,
    "failed",
    0,
    0,
    "HTTP 503 from fred.stlouisfed.org",
  );
  insert.run("fred-DGS10", FETCHED_AT, FETCHED_AT + 3_000, "ok", 1, 1, null);
  insert.run("idx-s1", FETCHED_AT, FETCHED_AT + 9_000, "ok", 3, 1, null);
  insert.run(
    "news-cnbc-market",
    FETCHED_AT,
    FETCHED_AT + 1_000,
    "failed",
    0,
    0,
    "feed timed out",
  );
}

/* ---------------------------------------------------------------- theses */

const header = (
  title: string,
  tickers: string,
  summary: string,
) => `title: ${title}
tickers: ${tickers}
stance: The register suggests the controller must sell down by 2030
summary: ${summary}
status: active
review: 2030-06-30
catalyst: 2030-03-31 First deadline for large caps
catalyst: 2029-12-15 Board meeting`;

const FLOAT_SUMMARY = THESES.valid.summary;

const CONDITIONS = `# what would show this wrong
ownership AAAA "PT INDUK AAAA" below 50%
float BBBB below 12.5% from 2026-03-01
macro bi-rate above 6.25
date 2030-01-01 no placement announced by then
price AAAA below 3500`;

function thesisFile(head: string, conditions: string, body: string): string {
  return [
    "```thesis",
    head,
    "```",
    "",
    "```conditions",
    conditions,
    "```",
    "",
    body,
  ].join("\n");
}

function writeTheses(): void {
  const write = (slug: string, version: string, text: string) => {
    fs.mkdirSync(path.join(THESES_DIR, slug), { recursive: true });
    fs.writeFileSync(path.join(THESES_DIR, slug, `${version}.md`), text);
  };
  const [current, older] = THESES.valid.versions;
  write(
    THESES.valid.slug,
    older,
    thesisFile(
      header(THESES.valid.title, "AAAA, BBBB", FLOAT_SUMMARY).replace(
        "review: 2030-06-30",
        "review: 2030-03-31",
      ),
      CONDITIONS,
      "## Why\n\nThe controller holds too much.\n\n## What would change my mind\n\nA placement.\n",
    ),
  );
  write(
    THESES.valid.slug,
    current,
    thesisFile(
      header(THESES.valid.title, "AAAA, BBBB", FLOAT_SUMMARY),
      CONDITIONS,
      "## Why\n\nThe controller holds too much. The fund added to its stake in September. See [Data & sources](/data) and [the exchange notice](https://example.test/notice).\n\n## What would change my mind\n\nA placement.\n",
    ),
  );
  write(
    THESES.unreadable.slug,
    "2026-10-21",
    thesisFile(
      header(
        THESES.unreadable.title,
        "CCCC",
        "The register lists too little to say anything about CCCC.",
      ),
      "float CCCC above 20%",
      // A file's markup never reaches the page as markup.
      '## Why\n\nThe register is incomplete.\n\n<img src="/hostile.png" onerror="window.pwned = 1">\n\n<script>window.pwned = 1</script>\n\n[a script link](javascript:window.pwned=1)\n',
    ),
  );
}

/* ----------------------------------------------------------------- brief */

function writeBrief(now: number): {
  date: string;
  rejectedFile: string;
  rejectedReason: string;
} {
  const date = jakartaDate(now);
  const tomorrow = jakartaDate(now + 86_400_000);
  const contextAt = new Date(now - 3 * 3_600_000).toISOString();
  const analysisAt = new Date(now - 2 * 3_600_000).toISOString();
  const section = (key: string) => ({
    key,
    asOf: MONTHS.latest,
    source: "S1",
    evidenceStatus: "Upper bound from holders above 1%.",
  });
  const context = {
    version: 1,
    generatedAt: contextAt,
    timezone: "Asia/Jakarta",
    today: date,
    absent: [
      { section: "news", reason: "No headline matched a thesis ticker." },
    ],
    ownership: null,
    float: {
      ...section("float"),
      certainlyBelow15: 1,
      companies: 4,
      official: {
        asOf: MONTHS.latest,
        belowMinimum: 358,
        listed: 918,
        publisher: "IDX Channel",
      },
      crossedBelow: [
        {
          key: `float:${belowMinimum.code}`,
          code: belowMinimum.code,
          boundPercent: "10.00",
        },
      ],
      crossedAbove: [],
      deadlines: [],
    },
    macro: null,
    theses: null,
    events: null,
    dataHealth: null,
    news: null,
  };
  const analysis = {
    version: 1,
    date,
    generatedAt: analysisAt,
    contextGeneratedAt: contextAt,
    stance: "notable",
    headline: `${belowMinimum.code}'s free-float bound is 10% in the September register.`,
    lookAt: [
      {
        kind: "float",
        subject: belowMinimum.code,
        reason: `A 90% controller leaves a bound of 10% on ${MONTHS.latest}, certainly below the minimum.`,
        evidenceKeys: [`float:${belowMinimum.code}`],
      },
    ],
    changesSinceYesterday: ["No brief yesterday."],
    risks: ["The bound is an upper bound: shares held below 1% are not in it."],
    setAside: [],
    sources: [
      {
        title: "Example exchange notice",
        url: "https://example.test/notice",
        publisher: "Example",
        date: MONTHS.latest,
      },
    ],
  };
  // A newer analysis that fails validation (an extra field): named, not shown.
  const rejected = { ...analysis, date: tomorrow, targetPrice: "500" };
  const write = (kind: string, day: string, value: unknown) => {
    const directory = path.join(DATA_DIR, "brief", kind);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, `${day}.json`),
      JSON.stringify(value),
    );
  };
  write("context", date, context);
  write("analysis", date, analysis);
  write("analysis", tomorrow, rejected);
  return {
    date,
    rejectedFile: `${tomorrow}.json`,
    rejectedReason: 'Unrecognized key: "targetPrice"',
  };
}

/* ------------------------------------------------------------------ main */

const empty = process.argv.includes("--empty");
const directory = empty ? EMPTY_DIR : DATA_DIR;
fs.rmSync(directory, { recursive: true, force: true });
fs.mkdirSync(directory, { recursive: true });

const config = loadConfig(
  { NODE_ENV: "test", SIGI_DATA_DIR: directory, SIGI_THESES_DIR: THESES_DIR },
  process.cwd(),
);
const { sqlite, db } = openDatabase(config.databasePath);
try {
  migrateDatabase(db);
  if (!empty) {
    publishMonth(sqlite, MONTHS.previous, previousMonth);
    publishMonth(sqlite, MONTHS.latest, latestMonth, {
      shares_identity: [
        "warn",
        `1 row where scripless + scrip differs from total (${incomplete.code})`,
      ],
    });
    rejectedImports(sqlite);
    publishMacro(sqlite);
    absentFeeds(sqlite);
    writeTheses();
    const now = Date.now();
    checkTheses(sqlite, {
      databasePath: config.databasePath,
      thesesDirectory: THESES_DIR,
      now,
    });
    writeManifest({ brief: writeBrief(now) });
  }
} finally {
  sqlite.close();
}
console.log(`e2e seed written to ${directory}`);
