import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import {
  buildS1Workbook,
  type FixtureRow,
  syntheticMonth,
} from "../ownership/s1-fixture";
import { checkRebuild } from "./rebuild-check";
import { importS1File, type S1ImportResult } from "./s1-import";

// Months of ~3,300 rows: inside the real row-count band, so the gates run as
// they do in production.
const ISSUERS = 600;
const february = syntheticMonth(ISSUERS, 0);
const march = syntheticMonth(ISSUERS, 1);
const workbook = (rows: FixtureRow[], recordDate: string) =>
  buildS1Workbook(rows, { recordDate });
const FEB = workbook(february, "2026-02-27");
const MAR = workbook(march, "2026-03-31");

const directories: string[] = [];
const databases: Database.Database[] = [];
afterEach(() => {
  for (const sqlite of databases.splice(0)) sqlite.close();
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function setup() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-import-"));
  directories.push(directory);
  const { sqlite, db } = openDatabase(path.join(directory, "sigi.db"));
  databases.push(sqlite);
  migrateDatabase(db);
  const landing = path.join(directory, "landing");
  let clock = Date.UTC(2026, 9, 1);
  const fetched = (bytes: Uint8Array, correction = false) =>
    importS1File(
      sqlite,
      landing,
      {
        bytes,
        originalName: "peng-satu-persen.xlsx",
        sourceUrl: "https://www.idx.co.id/Media/x/peng-satu-persen.xlsx",
        accessedOn: "2026-10-01",
        correction,
      },
      () => (clock += 1_000),
    );
  const published = () =>
    sqlite
      .prepare(
        "SELECT record_date AS recordDate, import_run_id AS runId FROM ownership_months ORDER BY record_date",
      )
      .all() as { recordDate: string; runId: number }[];
  return { sqlite, landing, fetched, published };
}

function imported(result: S1ImportResult) {
  if (result.kind !== "imported")
    throw new Error(`expected an import, got ${result.kind}`);
  return result;
}

describe("S1 import", { timeout: 60_000 }, () => {
  it("publishes a clean month, and the same file again changes nothing", async () => {
    const { sqlite, fetched, published } = setup();
    const first = imported(await fetched(FEB));
    expect(first.outcome).toBe("published");
    expect(published()).toEqual([
      { recordDate: "2026-02-27", runId: first.importRunId },
    ]);
    expect(
      sqlite.prepare("SELECT count(*) FROM ownership_holdings").pluck().get(),
    ).toBe(february.length);

    expect(await fetched(FEB)).toEqual({
      kind: "duplicate",
      sha256: first.sha256,
      importRunId: first.importRunId,
    });
    expect(
      sqlite.prepare("SELECT count(*) FROM import_runs").pluck().get(),
    ).toBe(1);
  });

  it("never lets a failing month replace the last good one", async () => {
    const { sqlite, fetched, published } = setup();
    await fetched(FEB);
    const broken = march.map((row, index) =>
      index === 0 ? { ...row, percentHundredths: 9_999 } : row,
    );
    const result = imported(await fetched(workbook(broken, "2026-03-31")));
    expect(result.outcome).toBe("rejected");
    expect(published().map((month) => month.recordDate)).toEqual([
      "2026-02-27",
    ]);
    expect(
      sqlite
        .prepare(
          "SELECT verdict FROM gate_results WHERE import_run_id = ? AND gate = 'percent_sum'",
        )
        .pluck()
        .get(result.importRunId),
    ).toBe("fail");
  });

  it("rejects a truncated file without publishing anything", async () => {
    const { fetched, published } = setup();
    const result = imported(await fetched(FEB.slice(0, FEB.length - 4_000)));
    expect(result.outcome).toBe("rejected");
    expect(result.parseError).not.toBeNull();
    expect(published()).toEqual([]);
  });

  it("publishes a source inconsistency with its warning recorded", async () => {
    const { sqlite, fetched, published } = setup();
    const typo = february.map((row, index) =>
      index === 5
        ? { ...row, total: row.scripless + (row.scrip ?? 0) - 300_000_000 }
        : row,
    );
    const result = imported(await fetched(workbook(typo, "2026-02-27")));
    expect(result.outcome).toBe("published");
    expect(published()).toEqual([
      { recordDate: "2026-02-27", runId: result.importRunId },
    ]);
    expect(
      sqlite
        .prepare(
          "SELECT verdict FROM gate_results WHERE import_run_id = ? AND gate = 'shares_identity'",
        )
        .pluck()
        .get(result.importRunId),
    ).toBe("warn");
    // Stored as published, not repaired.
    expect(
      sqlite
        .prepare(
          "SELECT shares_total = shares_scripless + shares_scrip FROM ownership_holdings WHERE row_number = 6",
        )
        .pluck()
        .get(),
    ).toBe(0);
  });

  it("replaces a published month only with a file declared a correction", async () => {
    const { sqlite, fetched, published } = setup();
    const original = imported(await fetched(FEB));
    const reissued = workbook(
      february.map((row, index) =>
        index === 0 ? { ...row, scripless: row.scripless + 1 } : row,
      ),
      "2026-02-27",
    );
    const undeclared = imported(await fetched(reissued));
    expect(undeclared.outcome).toBe("rejected");
    expect(published()).toEqual([
      { recordDate: "2026-02-27", runId: original.importRunId },
    ]);

    // The same bytes, declared: gated again, because the earlier run was rejected.
    const declared = imported(await fetched(reissued, true));
    expect(declared.outcome).toBe("published");
    expect(published()).toEqual([
      { recordDate: "2026-02-27", runId: declared.importRunId },
    ]);
    expect(
      sqlite
        .prepare("SELECT outcome FROM import_runs WHERE id = ?")
        .pluck()
        .get(original.importRunId),
    ).toBe("superseded");
    expect(
      sqlite
        .prepare(
          "SELECT action FROM publish_audit WHERE import_run_id = ? ORDER BY id",
        )
        .pluck()
        .all(declared.importRunId),
    ).toEqual(["supersede", "publish"]);
  });

  it("rebuilds every published month from its landed file, and notices an edit", async () => {
    const { sqlite, landing, fetched } = setup();
    await fetched(FEB);
    await fetched(MAR);
    const clean = await checkRebuild(sqlite, landing);
    expect(clean.map((month) => [month.item, month.ok])).toEqual([
      ["2026-02-27", true],
      ["2026-03-31", true],
    ]);

    sqlite
      .prepare(
        "UPDATE ownership_holdings SET percent_hundredths = percent_hundredths + 1 WHERE record_date = '2026-03-31' AND row_number = 10",
      )
      .run();
    const edited = await checkRebuild(sqlite, landing);
    expect(edited.map((month) => [month.item, month.ok])).toEqual([
      ["2026-02-27", true],
      ["2026-03-31", false],
    ]);
    expect(edited[1].reparsedHash).toBe(edited[1].storedHash);
    expect(edited[1].tableHash).not.toBe(edited[1].storedHash);
  });
});
