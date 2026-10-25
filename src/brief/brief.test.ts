import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import { closeReadDatabases } from "../db/read";
import { runNewsFeed } from "../news/fetch";
import { parseRss } from "../news/rss";
import { readBrief } from "../views/brief";
import { buildBriefContext } from "./build";
import { type BriefContext, briefContextSchema, contextKeys } from "./files";

const directories: string[] = [];
const databases: Database.Database[] = [];
afterEach(() => {
  closeReadDatabases();
  for (const sqlite of databases.splice(0)) sqlite.close();
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function temp(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-brief-"));
  directories.push(directory);
  return directory;
}

interface Row {
  code: string;
  holder: string;
  type: string | null;
  hundredths: number;
}

function publishMonth(
  sqlite: Database.Database,
  recordDate: string,
  rows: Row[],
): void {
  const sha = recordDate.replaceAll("-", "").padEnd(64, "0");
  sqlite
    .prepare(
      `INSERT INTO source_files VALUES (?, 'S1', 'f.xlsx', 1, 'f.xlsx', 'https://example.test/', '2026-10-01', 0)`,
    )
    .run(sha);
  const run = Number(
    sqlite
      .prepare(
        `INSERT INTO import_runs (source_id, file_sha256, parser_version, started_at, finished_at,
           outcome, record_date, row_count, issuer_count, holder_count, content_hash, correction)
         VALUES ('S1', ?, 'test', 0, 0, 'published', ?, ?, 0, 0, 'x', 0)`,
      )
      .run(sha, recordDate, rows.length).lastInsertRowid,
  );
  sqlite
    .prepare(`INSERT INTO ownership_months VALUES (?, ?, 0, 'x', ?, 0, 0)`)
    .run(recordDate, run, rows.length);
  const insert = sqlite.prepare(
    `INSERT INTO ownership_holdings VALUES (?, ?, ?, ?, ?, ?, 'L', NULL, 'INDONESIA', ?, 0, ?, ?)`,
  );
  rows.forEach((row, index) =>
    insert.run(
      recordDate,
      index + 1,
      row.code,
      `${row.code} Tbk`,
      row.holder,
      row.type,
      row.hundredths * 1_000,
      row.hundredths * 1_000,
      row.hundredths,
    ),
  );
}

/** Two months: an institution and an individual both move in AAAA. */
function site() {
  const root = temp();
  const databasePath = path.join(root, "sigi.db");
  const { sqlite, db } = openDatabase(databasePath);
  databases.push(sqlite);
  migrateDatabase(db);
  publishMonth(sqlite, "2026-08-31", [
    {
      code: "AAAA",
      holder: "PT INDUK AAAA",
      type: "Corporate",
      hundredths: 6_000,
    },
    {
      code: "AAAA",
      holder: "BUDI PERORANGAN",
      type: "Individual",
      hundredths: 900,
    },
  ]);
  publishMonth(sqlite, "2026-09-30", [
    {
      code: "AAAA",
      holder: "PT INDUK AAAA",
      type: "Corporate",
      hundredths: 5_000,
    },
    {
      code: "AAAA",
      holder: "BUDI PERORANGAN",
      type: "Individual",
      hundredths: 1_900,
    },
  ]);
  return {
    root,
    sqlite,
    databasePath,
    thesesDirectory: path.join(root, "theses"),
  };
}

describe("brief context", () => {
  it("names institutions that moved, counts individuals without naming them, and lists what it could not build", () => {
    const { sqlite, databasePath, thesesDirectory } = site();
    const context = buildBriefContext(sqlite, {
      databasePath,
      thesesDirectory,
      now: Date.parse("2026-10-24T23:00:00Z"),
    });
    expect(briefContextSchema.safeParse(context).success).toBe(true);
    expect(context.today).toBe("2026-10-25");
    expect(context.ownership?.companies).toEqual([
      {
        key: "own:AAAA",
        code: "AAAA",
        issuer: "AAAA Tbk",
        entered: 0,
        exited: 0,
        increased: 1,
        decreased: 1,
        unnamedMoves: 1,
        moves: [
          {
            key: "own:AAAA:1",
            holder: "PT INDUK AAAA",
            change: "decreased",
            beforePercent: "60.00",
            afterPercent: "50.00",
          },
        ],
      },
    ]);
    expect(JSON.stringify(context)).not.toContain("BUDI");
    expect(context.absent.map((entry) => entry.section)).toEqual([
      "macro",
      "theses",
      "news",
    ]);
    expect(context.macro).toBeNull();
    const keys = [...contextKeys(context)];
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ---- The page's validator ----------------------------------------------------

const CONTEXT_AT = "2026-10-24T23:00:05.000Z";

function context(): BriefContext {
  return {
    version: 1,
    generatedAt: CONTEXT_AT,
    timezone: "Asia/Jakarta",
    today: "2026-10-25",
    absent: [{ section: "news", reason: "No thesis is published." }],
    ownership: null,
    float: {
      key: "float",
      asOf: "2026-09-30",
      source: "S1",
      evidenceStatus: "Upper bound.",
      certainlyBelow15: 219,
      companies: 961,
      official: {
        asOf: "2026-09-30",
        belowMinimum: 358,
        listed: 918,
        publisher: "IDX Channel",
      },
      crossedBelow: [
        { key: "float:TCPI", code: "TCPI", boundPercent: "14.51" },
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
}

function analysis(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    date: "2026-10-25",
    generatedAt: "2026-10-24T23:10:00Z",
    contextGeneratedAt: CONTEXT_AT,
    stance: "notable",
    headline:
      "TCPI's free-float bound fell below 15% in the September register.",
    lookAt: [
      {
        kind: "float",
        subject: "TCPI",
        reason:
          "Its bound is 14.51% on 2026-09-30, so it is now certainly below the minimum.",
        evidenceKeys: ["float:TCPI"],
      },
    ],
    changesSinceYesterday: ["No brief yesterday."],
    risks: [],
    setAside: [],
    sources: [],
    ...overrides,
  };
}

function briefFiles(
  files: Record<string, unknown>,
  contexts: Record<string, unknown> = { "2026-10-25": context() },
) {
  const root = temp();
  const write = (kind: string, name: string, value: unknown) => {
    fs.mkdirSync(path.join(root, "brief", kind), { recursive: true });
    fs.writeFileSync(
      path.join(root, "brief", kind, `${name}.json`),
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };
  for (const [name, value] of Object.entries(contexts))
    write("context", name, value);
  for (const [name, value] of Object.entries(files))
    write("analysis", name, value);
  return root;
}

const NOW = Date.parse("2026-10-25T02:00:00Z");

function verdict(file: unknown, contexts?: Record<string, unknown>) {
  const brief = readBrief(briefFiles({ "2026-10-25": file }, contexts), NOW);
  return brief.status === "unreadable" ? brief.reason : brief.status;
}

describe("brief validation", () => {
  it("shows a valid brief whose evidence is all in its context", () => {
    const brief = readBrief(briefFiles({ "2026-10-25": analysis() }), NOW);
    expect(brief.status).toBe("ok");
    if (brief.status !== "ok") return;
    expect(brief.stale).toBe(false);
    expect(brief.analysis.lookAt[0]?.subject).toBe("TCPI");
  });

  it("rejects, with the reason, each kind of file it cannot trust", () => {
    expect(
      verdict(
        analysis({
          lookAt: [{ ...analysis().lookAt[0], evidenceKeys: ["float:BBRI"] }],
        }),
      ),
    ).toBe("2026-10-25.json: cites evidence its context lacks: float:BBRI");
    expect(verdict(analysis({ date: "2026-10-24" }))).toBe(
      "2026-10-25.json: its date does not match the file name",
    );
    expect(
      verdict(analysis({ contextGeneratedAt: "2026-10-24T22:00:00.000Z" })),
    ).toBe(
      "2026-10-25.json: its context timestamp does not match its context file",
    );
    expect(
      verdict(analysis(), {
        "2026-10-25": { ...context(), today: "2026-10-24" },
      }),
    ).toBe("2026-10-25.json: its context was made for another day");
    expect(
      verdict(analysis({ headline: "Strong buy: TCPI below 15% float." })),
    ).toBe(
      '2026-10-25.json: headline: reads as a recommendation ("Strong buy")',
    );
    expect(verdict(analysis({ targetPrice: "500" }))).toMatch(
      /^2026-10-25\.json: Unrecognized key/,
    );
    expect(verdict(analysis({ stance: "quiet" }))).toBe(
      "2026-10-25.json: lookAt: a quiet brief has nothing to look at",
    );
    expect(verdict(`{"pad":"${"x".repeat(600 * 1024)}"}`)).toBe(
      "2026-10-25.json: over the 512 KiB size cap",
    );
    expect(verdict(analysis(), {})).toBe(
      "2026-10-25.json: its context file is missing or invalid",
    );
  });

  it("keeps the last good brief up, names the newer file it rejected, and marks it stale after 30 hours", () => {
    const root = briefFiles(
      {
        "2026-10-24": analysis({
          date: "2026-10-24",
          generatedAt: "2026-10-23T23:10:00Z",
          contextGeneratedAt: "2026-10-23T23:00:05.000Z",
        }),
        "2026-10-25": analysis({ version: 2 }),
      },
      {
        "2026-10-24": {
          ...context(),
          today: "2026-10-24",
          generatedAt: "2026-10-23T23:00:05.000Z",
        },
        "2026-10-25": context(),
      },
    );
    const brief = readBrief(root, NOW);
    expect(brief.status).toBe("ok");
    if (brief.status !== "ok") return;
    expect(brief.analysis.date).toBe("2026-10-24");
    expect(brief.stale).toBe(false);
    expect(brief.rejected).toEqual({
      file: "2026-10-25.json",
      reason: "version: Invalid input: expected 1",
    });
    const later = readBrief(root, Date.parse("2026-10-25T06:00:00Z"));
    expect(later.status === "ok" && later.stale).toBe(true);
  });

  it("passes over a brief the owner withdrew and shows the reason", () => {
    const root = briefFiles({ "2026-10-25": analysis() });
    const brief = readBrief(root, NOW, {
      "2026-10-25": "wrong figure in TCPI",
    });
    expect(brief).toEqual({
      status: "missing",
      withdrawn: [{ file: "2026-10-25.json", reason: "wrong figure in TCPI" }],
    });
  });
});

// ---- News headlines ----------------------------------------------------------

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[BBRI Rilis Laba &amp; Dividen]]></title><link>https://example.test/a</link><pubDate>Sat, 24 Oct 2026 22:00:00 +0700</pubDate><description><![CDATA[article text]]></description></item>
<item><title>Saham &amp; Obligasi</title><link>https://example.test/b</link><pubDate>Sat, 24 Oct 2026 21:00:00 +0700</pubDate></item>
<item><title>No date</title><link>https://example.test/c</link></item>
</channel></rss>`;

describe("news headlines", () => {
  it("keeps only title, link and time, and skips items missing one", () => {
    expect(parseRss(RSS)).toEqual([
      {
        title: "BBRI Rilis Laba &amp; Dividen",
        url: "https://example.test/a",
        publishedAt: Date.parse("2026-10-24T15:00:00Z"),
      },
      {
        title: "Saham & Obligasi",
        url: "https://example.test/b",
        publishedAt: Date.parse("2026-10-24T14:00:00Z"),
      },
    ]);
    expect(() => parseRss("<rss><channel></channel></rss>")).toThrow(
      "the feed has no <item>",
    );
  });

  it("adds each headline once, records every check, and drops headlines past retention", async () => {
    const { sqlite } = site();
    sqlite
      .prepare(
        `INSERT INTO news_items (url, publisher, title, published_at, fetched_at)
         VALUES ('https://example.test/old', 'X', 'Old', 0, 0)`,
      )
      .run();
    const now = () => Date.parse("2026-10-25T00:00:00Z");
    const first = await runNewsFeed(sqlite, async () => RSS, now);
    const second = await runNewsFeed(sqlite, async () => RSS, now);
    const failed = await runNewsFeed(
      sqlite,
      async () => {
        throw new Error("HTTP 403");
      },
      now,
    );
    expect([first.added, second.added]).toEqual([2, 0]);
    expect(failed).toMatchObject({ outcome: "failed", error: "HTTP 403" });
    expect(
      sqlite.prepare("SELECT url FROM news_items ORDER BY url").pluck().all(),
    ).toEqual(["https://example.test/a", "https://example.test/b"]);
    expect(
      sqlite
        .prepare("SELECT outcome, listed, fetched FROM fetch_runs ORDER BY id")
        .all(),
    ).toEqual([
      { outcome: "ok", listed: 2, fetched: 2 },
      { outcome: "ok", listed: 2, fetched: 0 },
      { outcome: "failed", listed: 0, fetched: 0 },
    ]);
  });
});
