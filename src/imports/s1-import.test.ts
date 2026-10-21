import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import {
  buildS1FixturePdf,
  type FixtureRow,
  syntheticMonth,
} from "../ownership/s1-fixture";
import { checkRebuild } from "./rebuild-check";
import { importS1File, reviewHeldRun, type S1ImportResult } from "./s1-import";

// Months of ~3,300 rows: inside the real row-count band, so the gates run as
// they do in production. Each parse takes a second or two.
const ISSUERS = 600;
const february = syntheticMonth(ISSUERS, 0);
const march = syntheticMonth(ISSUERS, 1);
const pdf = (rows: FixtureRow[], date: string) =>
  buildS1FixturePdf(rows, { recordDate: date });
const FEB = pdf(february, "27-Feb-2026");
const MAR = pdf(march, "31-Mar-2026");

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
  const upload = (bytes: Uint8Array, correction = false) =>
    importS1File(
      sqlite,
      landing,
      {
        bytes,
        originalName: "holders.pdf",
        sourceUrl: "https://www.idx.co.id/id/berita/pengumuman/",
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
  return { sqlite, landing, upload, published };
}

function imported(result: S1ImportResult) {
  if (result.kind !== "imported")
    throw new Error(`expected an import, got ${result.kind}`);
  return result;
}

describe("S1 import", { timeout: 60_000 }, () => {
  it("publishes a clean month, and the same file again changes nothing", async () => {
    const { sqlite, upload, published } = setup();
    const first = imported(await upload(FEB));
    expect(first.outcome).toBe("published");
    expect(published()).toEqual([
      { recordDate: "2026-02-27", runId: first.importRunId },
    ]);
    expect(
      sqlite.prepare("SELECT count(*) FROM ownership_holdings").pluck().get(),
    ).toBe(february.length);

    expect(await upload(FEB)).toEqual({
      kind: "duplicate",
      sha256: first.sha256,
      importRunId: first.importRunId,
    });
    expect(
      sqlite.prepare("SELECT count(*) FROM import_runs").pluck().get(),
    ).toBe(1);
  });

  it("never lets a failing month replace the last good one", async () => {
    const { sqlite, upload, published } = setup();
    await upload(FEB);
    const broken = march.map((row, index) =>
      index === 0 ? { ...row, percentHundredths: 9_999 } : row,
    );
    const result = imported(await upload(pdf(broken, "31-Mar-2026")));
    expect(result.outcome).toBe("rejected");
    expect(
      result.gates.find((gate) => gate.gate === "percent_sum"),
    ).toMatchObject({
      verdict: "fail",
    });
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
    const { upload, published } = setup();
    const result = imported(await upload(FEB.slice(0, FEB.length - 4_000)));
    expect(result.outcome).toBe("rejected");
    expect(result.parseError).not.toBeNull();
    expect(published()).toEqual([]);
  });

  it("holds a month with a source inconsistency until the owner decides", async () => {
    const { sqlite, upload, published } = setup();
    const typo = february.map((row, index) =>
      index === 5
        ? { ...row, total: row.scripless + row.scrip - 300_000_000 }
        : row,
    );
    const held = imported(await upload(pdf(typo, "27-Feb-2026")));
    expect(held.outcome).toBe("held");
    expect(published()).toEqual([]);

    expect(
      reviewHeldRun(
        sqlite,
        held.importRunId,
        "approve",
        "publisher typo in scrip; total kept as published",
      ),
    ).toEqual({ ok: true, outcome: "published" });
    expect(published()).toEqual([
      { recordDate: "2026-02-27", runId: held.importRunId },
    ]);
    expect(
      sqlite
        .prepare(
          "SELECT action, reason FROM publish_audit WHERE import_run_id = ?",
        )
        .all(held.importRunId),
    ).toEqual([
      {
        action: "approve",
        reason: "publisher typo in scrip; total kept as published",
      },
    ]);
    expect(
      reviewHeldRun(sqlite, held.importRunId, "approve", "again"),
    ).toMatchObject({
      ok: false,
    });
  });

  it("replaces a published month only when the upload is marked a correction", async () => {
    const { sqlite, upload, published } = setup();
    const original = imported(await upload(FEB));
    const corrected = pdf(
      february.map((row, index) =>
        index === 0 ? { ...row, scripless: row.scripless + 1 } : row,
      ),
      "27-Feb-2026",
    );
    const unmarked = imported(await upload(corrected));
    expect(unmarked.outcome).toBe("rejected");
    expect(published()).toEqual([
      { recordDate: "2026-02-27", runId: original.importRunId },
    ]);

    // The same bytes, now marked: gated again, because the earlier run was rejected.
    const marked = imported(await upload(corrected, true));
    expect(marked.outcome).toBe("published");
    expect(published()).toEqual([
      { recordDate: "2026-02-27", runId: marked.importRunId },
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
        .all(marked.importRunId),
    ).toEqual(["supersede", "publish"]);
  });

  it("rebuilds every published month from its landed file, and notices an edit", async () => {
    const { sqlite, landing, upload } = setup();
    await upload(FEB);
    await upload(MAR);
    const clean = await checkRebuild(sqlite, landing);
    expect(clean.map((month) => [month.recordDate, month.ok])).toEqual([
      ["2026-02-27", true],
      ["2026-03-31", true],
    ]);

    sqlite
      .prepare(
        "UPDATE ownership_holdings SET percent_hundredths = percent_hundredths + 1 WHERE record_date = '2026-03-31' AND row_number = 10",
      )
      .run();
    const edited = await checkRebuild(sqlite, landing);
    expect(edited.map((month) => [month.recordDate, month.ok])).toEqual([
      ["2026-02-27", true],
      ["2026-03-31", false],
    ]);
    expect(edited[1].reparsedHash).toBe(edited[1].storedHash);
    expect(edited[1].tableHash).not.toBe(edited[1].storedHash);
  });
});
