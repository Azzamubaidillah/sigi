import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import { closeReadDatabases } from "../db/read";
import { loadHolder, loadHolderIndex, loadHolderLinks } from "./holders";
import { loadInvestability } from "./investability";
import {
  exactShareCode,
  loadCompanyScreen,
  loadTickerOwnership,
  parseScreenFilters,
} from "./ownership";

interface Row {
  code: string;
  holder: string;
  type: string | null;
  hundredths: number;
}

const directories: string[] = [];
afterEach(() => {
  closeReadDatabases();
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** Publishes months straight into the published tables; the views read only those. */
function database(months: Record<string, Row[]>): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-views-"));
  directories.push(directory);
  const databasePath = path.join(directory, "sigi.db");
  const { sqlite, db } = openDatabase(databasePath);
  migrateDatabase(db);
  for (const [recordDate, rows] of Object.entries(months))
    publish(sqlite, recordDate, rows);
  sqlite.close();
  return databasePath;
}

function publish(
  sqlite: Database.Database,
  recordDate: string,
  rows: Row[],
): void {
  const sha = recordDate.replaceAll("-", "").padEnd(64, "0");
  sqlite
    .prepare(
      `INSERT INTO source_files VALUES (?, 'S1', 'f.pdf', 1, 'f.pdf', 'https://example.test/', '2026-10-01', 0)`,
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
    `INSERT INTO ownership_holdings VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 0, ?, ?)`,
  );
  rows.forEach((row, index) => {
    const shares = row.hundredths * 1_000;
    insert.run(
      recordDate,
      index + 1,
      row.code,
      `${row.code} Tbk`,
      row.holder,
      row.type,
      row.type === null ? null : "L",
      shares,
      shares,
      row.hundredths,
    );
  });
}

const february: Row[] = [
  // AAAA: a controller at 60%, so the bound is 40%.
  { code: "AAAA", holder: "PT INDUK AAAA", type: "CP", hundredths: 6_000 },
  { code: "AAAA", holder: "DANA PENSIUN CONTOH", type: "PF", hundredths: 200 },
  { code: "AAAA", holder: "BUDI CONTOH", type: "ID", hundredths: 150 },
  // BBBB: 86% at or above 5%, bound 14%: certainly below the minimum.
  { code: "BBBB", holder: "PT INDUK BBBB", type: "CP", hundredths: 8_600 },
  { code: "BBBB", holder: "DANA PENSIUN CONTOH", type: "PF", hundredths: 300 },
  { code: "BBBB", holder: "YAYASAN TANPA KELAS", type: null, hundredths: 120 },
  { code: "BBBB", holder: "CAMPURAN", type: "CP", hundredths: 110 },
  // CCCC: holders above 1% total 8%: register incomplete.
  { code: "CCCC", holder: "CAMPURAN", type: "ID", hundredths: 500 },
  { code: "CCCC", holder: "PT KECIL", type: "CP", hundredths: 300 },
];

const march: Row[] = [
  { code: "AAAA", holder: "PT INDUK AAAA", type: "CP", hundredths: 6_000 },
  { code: "AAAA", holder: "DANA PENSIUN CONTOH", type: "PF", hundredths: 450 },
  { code: "AAAA", holder: "BUDI CONTOH", type: "ID", hundredths: 150 },
  // BBBB's controller sells down to 80%: the bound rises to 20%.
  { code: "BBBB", holder: "PT INDUK BBBB", type: "CP", hundredths: 8_000 },
  { code: "BBBB", holder: "YAYASAN TANPA KELAS", type: null, hundredths: 120 },
  { code: "BBBB", holder: "CAMPURAN", type: "CP", hundredths: 110 },
  { code: "CCCC", holder: "CAMPURAN", type: "ID", hundredths: 500 },
  { code: "CCCC", holder: "PT KECIL", type: "CP", hundredths: 300 },
  // DDDD: a new 90% controller, bound 10%: falls below in its first month.
  { code: "DDDD", holder: "PT INDUK DDDD", type: "CP", hundredths: 9_000 },
  { code: "DDDD", holder: "DANA PENSIUN CONTOH", type: "PF", hundredths: 150 },
];

describe("holder pages (PRD F4, C6)", () => {
  it("exist only for holders published as institutions in every row", () => {
    const db = database({ "2026-02-27": february, "2026-03-31": march });
    const index = loadHolderIndex(db);
    if (index.kind !== "index") throw new Error("no index");
    const names = index.holders.map((holder) => holder.name).sort();
    expect(names).toEqual([
      "DANA PENSIUN CONTOH",
      "PT INDUK AAAA",
      "PT INDUK BBBB",
      "PT INDUK DDDD",
      "PT KECIL",
    ]);
    // An individual, an unclassified holder, and a name published once as a
    // company and once as an individual: no page for any of them.
    expect(index.withheld).toBe(3);
    const links = loadHolderLinks(db);
    expect(links.has("BUDI CONTOH")).toBe(false);
    expect(loadHolder(db, "budi-contoh")).toBeNull();
    expect(loadHolder(db, "campuran")).toBeNull();
    expect(loadHolder(db, "yayasan-tanpa-kelas")).toBeNull();
  });

  it("show positions and their moves against the previous month", () => {
    const db = database({ "2026-02-27": february, "2026-03-31": march });
    const holder = loadHolder(db, "dana-pensiun-contoh");
    expect(holder?.positions.map((p) => [p.shareCode, p.hundredths])).toEqual([
      ["AAAA", 450],
      ["DDDD", 150],
    ]);
    expect(
      holder?.moves?.map((m) => [
        m.shareCode,
        m.beforeHundredths,
        m.afterHundredths,
      ]),
    ).toEqual([
      ["AAAA", 200, 450],
      ["BBBB", 300, null],
      ["DDDD", null, 150],
    ]);
  });
});

describe("ownership screen (PRD F9)", () => {
  it("excludes incomplete registers from float screens and says so", () => {
    const db = database({ "2026-02-27": february });
    const screen = loadCompanyScreen(
      db,
      parseScreenFilters({ floatMax: "15" }),
    );
    if (screen.kind !== "list") throw new Error("no list");
    expect(screen.companies.map((c) => c.shareCode)).toEqual(["BBBB"]);
    expect(screen.excluded).toEqual([{ reason: "incomplete", count: 1 }]);
    const all = loadCompanyScreen(db, parseScreenFilters({}));
    expect(all.kind === "list" && all.excluded).toEqual([]);
  });

  it("filters to companies whose holders changed, counting those it cannot compare", () => {
    const db = database({ "2026-02-27": february, "2026-03-31": march });
    const screen = loadCompanyScreen(db, parseScreenFilters({ changed: "1" }));
    if (screen.kind !== "list") throw new Error("no list");
    expect(screen.companies.map((c) => c.shareCode)).toEqual(["AAAA", "BBBB"]);
    expect(screen.excluded.map((e) => e.count)).toEqual([1]);
  });

  it("ignores malformed filters instead of guessing", () => {
    expect(
      parseScreenFilters({ floatMax: "abc", type: "ZZ", sort: "drop" }),
    ).toMatchObject({
      floatMax: null,
      type: null,
      sort: "code",
    });
  });
});

describe("company search", () => {
  it("names a company only on an exact code in the latest month", () => {
    const db = database({ "2026-02-27": february, "2026-03-31": march });
    expect(exactShareCode(db, " dddd ")).toBe("DDDD");
    // Not in the latest register, a name, and malformed codes.
    expect(exactShareCode(db, "ZZZZ")).toBeNull();
    expect(exactShareCode(db, "induk")).toBeNull();
    expect(exactShareCode(db, "AAAAA")).toBeNull();
    expect(exactShareCode(db, "")).toBeNull();
  });
});

describe("investability (PRD F3)", () => {
  it("counts companies certainly below 15% and the crossings between months", () => {
    const db = database({ "2026-02-27": february, "2026-03-31": march });
    const view = loadInvestability(db);
    if (view.kind !== "ready") throw new Error("not ready");
    expect(
      view.belowMinimum.map((row) => [row.shareCode, row.upperBoundHundredths]),
    ).toEqual([["DDDD", 1_000]]);
    expect(view.belowMinimum[0].possibleTranches).toEqual([
      "large-low",
      "small",
    ]);
    expect(view.crossedUp).toEqual(["BBBB"]);
    expect(view.crossedDown).toEqual([]);
    expect(view.incomplete.map((c) => c.shareCode)).toEqual(["CCCC"]);
    // The exchange's count dated on or before the record date.
    expect(view.official?.asOf).toBe("2026-03-31");
  });

  it("gives no float figure for a company whose register is incomplete", () => {
    const db = database({ "2026-02-27": february });
    const ticker = loadTickerOwnership(db, "CCCC");
    expect(
      ticker.kind === "ownership" && ticker.figures.registerIncomplete,
    ).toBe(true);
  });
});
