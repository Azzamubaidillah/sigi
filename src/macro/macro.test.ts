import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import { runMacroFeed } from "../fetch/macro-fetch";
import { checkRebuild } from "../imports/rebuild-check";
import {
  buildWorkbook,
  excelSerial,
  type FixtureCell,
} from "../imports/xlsx-fixture";
import { nextRelease, seriesFigures } from "../views/macro";
import type { FeedId } from "./feeds";
import { importMacroFile, type MacroImportResult } from "./import";
import { parseBiExport, parseFredCsv, parsePinkSheet } from "./parse";
import { SERIES } from "./series";

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** A BI export: title, blank, header, then numbered rows. */
function biWorkbook(
  header: string[],
  rows: [FixtureCell, FixtureCell][],
  extra?: FixtureCell,
): Uint8Array {
  return buildWorkbook([
    {
      name: "Export",
      rows: [
        [header[2], header[2], header[2]],
        [],
        header,
        ...rows.map(([period, value], i) => [
          String(i + 1),
          period,
          value,
          ...(extra === undefined ? [] : [extra]),
        ]),
      ],
    },
  ]);
}

/** Monthly periods from `start` (YYYY-MM), `count` of them. */
function months(start: string, count: number): string[] {
  const [year, month] = start.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 + i, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** The BI inflation export for the given monthly values. */
function inflationFile(values: [string, number][]): Uint8Array {
  return biWorkbook(
    ["No", "Periode", "Data Inflasi"],
    [...values].reverse().map(([period, value]) => {
      const [year, month] = period.split("-").map(Number);
      return [
        `${MONTHS_ID[month - 1]} ${year}`,
        `${value.toFixed(2).replace(".", ",")} %`,
      ];
    }),
  );
}

describe("macro parsers", () => {
  it("reads each Bank Indonesia export in its own date and number format", () => {
    const rate = parseBiExport(
      "bi-rate",
      biWorkbook(
        ["NO", "Tanggal", "BI-7Day-RR"],
        [
          ["21 Oktober 2026", "5,75 %"],
          ["9 Juni 2026", "5,50 %"],
        ],
      ),
    );
    expect(rate.ok && rate.series.get("bi-rate")).toEqual([
      { period: "2026-06-09", value: 5.5 },
      { period: "2026-10-21", value: 5.75 },
    ]);
    const jisdor = parseBiExport(
      "bi-jisdor",
      biWorkbook(
        ["NO", "Tanggal", "Kurs"],
        [
          ["10/1/2025 12:00:00 AM", "16.680,00"],
          ["10/23/2026 12:00:00 AM", "18.069,00"],
        ],
      ),
    );
    expect(jisdor.ok && jisdor.series.get("jisdor")).toEqual([
      { period: "2025-10-01", value: 16_680 },
      { period: "2026-10-23", value: 18_069 },
    ]);
    // '.' is the thousands separator: 146.320 is USD 146,320 million.
    const reserves = parseBiExport(
      "bi-reserves",
      biWorkbook(
        ["NO", "TANGGAL", "CADANGAN DEVISA"],
        [
          [String(excelSerial("2026-08-31")), "146.508"],
          [String(excelSerial("2026-09-30")), "146.320"],
        ],
      ),
    );
    expect(reserves.ok && reserves.series.get("fx-reserves")).toEqual([
      { period: "2026-08", value: 146_508 },
      { period: "2026-09", value: 146_320 },
    ]);
    const inflation = parseBiExport(
      "bi-inflation",
      inflationFile([["2026-09", 3.28]]),
    );
    expect(inflation.ok && inflation.series.get("cpi-yoy")).toEqual([
      { period: "2026-09", value: 3.28 },
    ]);
  });

  it("refuses a changed header, a repeated period, a malformed number and an extra column", () => {
    const rows: [FixtureCell, FixtureCell][] = [["21 Oktober 2026", "5,75 %"]];
    expect(
      parseBiExport("bi-rate", biWorkbook(["NO", "Tanggal", "Kurs"], rows)),
    ).toMatchObject({
      ok: false,
      error: "header is no, tanggal, kurs; expected no, tanggal, bi-7day-rr",
    });
    expect(
      parseBiExport(
        "bi-rate",
        biWorkbook(["NO", "Tanggal", "BI-7Day-RR"], [...rows, ...rows]),
      ),
    ).toMatchObject({ ok: false, error: "bi-rate: 2026-10-21 appears twice" });
    expect(
      parseBiExport(
        "bi-rate",
        biWorkbook(
          ["NO", "Tanggal", "BI-7Day-RR"],
          [["21 Oktober 2026", "5.75%"]],
        ),
      ).ok,
    ).toBe(false);
    expect(
      parseBiExport(
        "bi-rate",
        biWorkbook(["NO", "Tanggal", "BI-7Day-RR"], rows, "x"),
      ).ok,
    ).toBe(false);
  });

  it("reads the Pink Sheet's columns by name and unit, skipping months with no price", () => {
    const header = [
      null,
      "Crude oil, Brent",
      "Coal, Australian",
      "Palm oil",
      "Rubber, TSR20 **",
      "Nickel",
      "Tin",
      "Gold",
    ];
    const units = [
      null,
      "($/bbl)",
      "($/mt)",
      "($/mt)",
      "($/kg)",
      "($/mt)",
      "($/mt)",
      "($/troy oz)",
    ];
    const sheet = (unitRow: FixtureCell[]) =>
      buildWorkbook([
        { name: "AFOSHEET", rows: [["cover"]] },
        {
          name: "Monthly Prices",
          rows: [
            ["World Bank Commodity Price Data (The Pink Sheet)"],
            [],
            [],
            ["Updated on October 02, 2026"],
            header,
            unitRow,
            ["1960M01", 1.63, "…", 233, 0.5, 1631, 2180, 35],
            [
              "2026M09",
              116.8,
              147.10000000000001,
              1180,
              2.41,
              16324,
              53712,
              4319,
            ],
          ],
        },
      ]);
    const parsed = parsePinkSheet(sheet(units));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.series.get("coal")).toEqual([
      { period: "2026-09", value: 147.1 },
    ]);
    expect(parsed.series.get("gold")).toEqual([
      { period: "1960-01", value: 35 },
      { period: "2026-09", value: 4319 },
    ]);
    const swapped = [...units];
    swapped[7] = "($/kg)";
    expect(parsePinkSheet(sheet(swapped))).toEqual({
      ok: false,
      error: '"Gold" is in ($/kg); expected ($/troy oz)',
    });
  });

  it("reads a FRED CSV, skipping days with no observation", () => {
    const csv = (text: string) => new TextEncoder().encode(text);
    const parsed = parseFredCsv(
      "DGS10",
      csv(
        "observation_date,DGS10\n2026-10-21,5.13\n2026-10-22,\n2026-10-23,4.96\n",
      ),
    );
    expect(parsed.ok && parsed.series.get("us-10y")).toEqual([
      { period: "2026-10-21", value: 5.13 },
      { period: "2026-10-23", value: 4.96 },
    ]);
    expect(
      parseFredCsv("DGS10", csv("observation_date,DFEDTARU\n2026-10-21,4.00\n"))
        .ok,
    ).toBe(false);
    expect(
      parseFredCsv("DGS10", csv("observation_date,DGS10\n2026-10-21,n/a\n")).ok,
    ).toBe(false);
  });
});

const directories: string[] = [];
const databases: Database.Database[] = [];
afterEach(() => {
  for (const sqlite of databases.splice(0)) sqlite.close();
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

function setup() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-macro-"));
  directories.push(directory);
  const { sqlite, db } = openDatabase(path.join(directory, "sigi.db"));
  databases.push(sqlite);
  migrateDatabase(db);
  const landing = path.join(directory, "landing");
  let clock = Date.UTC(2026, 9, 24);
  const now = () => (clock += 1_000);
  const importInflation = (values: [string, number][]) =>
    importMacroFile(
      sqlite,
      landing,
      "bi-inflation",
      {
        bytes: inflationFile(values),
        originalName: "bi-inflation.xlsx",
        sourceUrl:
          "https://www.bi.go.id/id/statistik/indikator/data-inflasi.aspx",
        accessedOn: "2026-10-24",
      },
      now,
    );
  const published = () =>
    sqlite
      .prepare(
        "SELECT period, value FROM macro_observations WHERE series_id = 'cpi-yoy' ORDER BY period",
      )
      .all() as { period: string; value: number }[];
  return { sqlite, landing, now, importInflation, published };
}

function imported(result: MacroImportResult) {
  if (result.kind !== "imported")
    throw new Error(`expected an import, got ${result.kind}`);
  return result;
}

const twoYears = (from: string, last = 3) =>
  months(from, 24).map((period, i): [string, number] => [
    period,
    i === 23 ? last : 2 + i / 100,
  ]);

describe("macro import", () => {
  it("publishes a file, then treats the same figures in new bytes as nothing new", async () => {
    const { sqlite, importInflation, published } = setup();
    const first = imported(await importInflation(twoYears("2024-10")));
    expect(first.outcome).toBe("published");
    expect(published()).toHaveLength(24);
    expect(await importInflation(twoYears("2024-10"))).toEqual({
      kind: "unchanged",
    });
    expect(
      sqlite.prepare("SELECT count(*) FROM import_runs").pluck().get(),
    ).toBe(1);
  });

  it("never lets a stale, truncated or implausible file replace the published series", async () => {
    const { importInflation, published } = setup();
    await importInflation(twoYears("2024-10"));
    const before = published();

    const stale = imported(await importInflation(twoYears("2024-09")));
    expect(stale.outcome).toBe("rejected");
    expect(stale.gates.find((g) => g.gate === "not_older")?.verdict).toBe(
      "fail",
    );

    const truncated = imported(
      await importInflation(twoYears("2024-10").slice(10)),
    );
    expect(
      truncated.gates.find((g) => g.gate === "history_kept")?.verdict,
    ).toBe("fail");

    const absurd = imported(await importInflation(twoYears("2024-10", 1_000)));
    expect(absurd.gates.find((g) => g.gate === "value_range")?.verdict).toBe(
      "fail",
    );

    expect(published()).toEqual(before);
    // A file already judged is not judged again every day.
    expect(await importInflation(twoYears("2024-09"))).toEqual({
      kind: "unchanged",
    });
  });

  it("publishes revisions, warning only when values older than a year change", async () => {
    const { sqlite, importInflation, published } = setup();
    const original = imported(await importInflation(twoYears("2024-10")));
    const recent = twoYears("2024-10").map(([p, v], i): [string, number] => [
      p,
      i === 22 ? v + 0.1 : v,
    ]);
    const revised = imported(await importInflation(recent));
    expect(revised.outcome).toBe("published");
    expect(revised.gates.find((g) => g.gate === "old_revisions")?.verdict).toBe(
      "pass",
    );
    const old = recent.map(([p, v], i): [string, number] => [
      p,
      i === 0 ? v + 0.5 : v,
    ]);
    const oldRevision = imported(await importInflation(old));
    expect(oldRevision.outcome).toBe("published");
    expect(
      oldRevision.gates.find((g) => g.gate === "old_revisions")?.verdict,
    ).toBe("warn");
    expect(published()[0].value).toBeCloseTo(2.5, 9);
    expect(
      sqlite
        .prepare("SELECT outcome FROM import_runs WHERE id = ?")
        .pluck()
        .get(original.importRunId),
    ).toBe("superseded");
  });

  it("dates a release by when Sigi first saw its latest period", async () => {
    const { sqlite, importInflation } = setup();
    const seen = () =>
      sqlite
        .prepare("SELECT latest_seen_at FROM macro_series")
        .pluck()
        .get() as number;
    await importInflation(twoYears("2024-10"));
    const first = seen();
    // A revision of an earlier month keeps the release date of the latest one.
    await importInflation(
      twoYears("2024-10").map(([p, v], i): [string, number] => [
        p,
        i === 22 ? v + 0.1 : v,
      ]),
    );
    expect(seen()).toBe(first);
    await importInflation(twoYears("2024-11"));
    expect(seen()).toBeGreaterThan(first);
  });

  it("rebuilds each published series from its landed file, and notices an edit", async () => {
    const { sqlite, landing, importInflation } = setup();
    await importInflation(twoYears("2024-10"));
    expect(
      (await checkRebuild(sqlite, landing)).map((r) => [r.kind, r.item, r.ok]),
    ).toEqual([["macro", "cpi-yoy", true]]);
    sqlite
      .prepare(
        "UPDATE macro_observations SET value = value + 1 WHERE period = '2025-01'",
      )
      .run();
    expect((await checkRebuild(sqlite, landing))[0].ok).toBe(false);
  });

  it("records every fetch, failed or not, and counts only real imports", async () => {
    const { sqlite, landing, now } = setup();
    const file = {
      bytes: inflationFile(twoYears("2024-10")),
      originalName: "bi-inflation.xlsx",
      sourceUrl:
        "https://www.bi.go.id/id/statistik/indikator/data-inflasi.aspx",
      accessedOn: "2026-10-24",
    };
    const fetchOk = async () => file;
    const fetchDown = async () => {
      throw new Error("fetch failed", {
        cause: { code: "UND_ERR_CONNECT_TIMEOUT" },
      });
    };
    const feed: FeedId = "bi-inflation";
    expect(
      await runMacroFeed(sqlite, landing, feed, fetchDown, now),
    ).toMatchObject({
      outcome: "failed",
      error: "fetch failed (UND_ERR_CONNECT_TIMEOUT)",
    });
    expect(
      await runMacroFeed(sqlite, landing, feed, fetchOk, now),
    ).toMatchObject({ outcome: "ok", imported: "published" });
    expect(
      await runMacroFeed(sqlite, landing, feed, fetchOk, now),
    ).toMatchObject({ outcome: "ok", imported: "unchanged" });
    expect(
      sqlite
        .prepare("SELECT outcome, fetched FROM fetch_runs ORDER BY id")
        .all(),
    ).toEqual([
      { outcome: "failed", fetched: 0 },
      { outcome: "ok", fetched: 1 },
      { outcome: "ok", fetched: 0 },
    ]);
  });
});

describe("macro figures", () => {
  const context = {
    latestSeenAt: 0,
    sourceUrl: "https://example.test",
    accessedOn: "2026-10-24",
    now: Date.UTC(2026, 9, 24, 3),
  };

  it("derives the change and the year-on-year move from published values", () => {
    const observations = months("2025-08", 14).map((period, i) => ({
      period,
      value: 100 + i,
    }));
    const figures = seriesFigures(SERIES.brent, observations, context);
    expect(figures.latest).toEqual({ period: "2026-09", value: 113 });
    expect(figures.change).toBe(1);
    expect(figures.yoy?.against).toBe("2025-09");
    expect(figures.yoy?.percent).toBeCloseTo((113 / 101 - 1) * 100, 9);
    expect(figures.history.map((o) => o.period)[0]).toBe("2025-09");
    // A published year-on-year rate is not compared with itself again.
    expect(
      seriesFigures(SERIES["cpi-yoy"], observations, context).yoy,
    ).toBeNull();
  });

  it("compares a daily series with the last day within a week of a year earlier, or not at all", () => {
    const withGap = [
      { period: "2025-10-10", value: 16_000 },
      { period: "2026-10-23", value: 18_000 },
    ];
    expect(seriesFigures(SERIES.jisdor, withGap, context).yoy).toBeNull();
    const close = [
      { period: "2025-10-20", value: 16_000 },
      ...withGap.slice(1),
    ];
    expect(seriesFigures(SERIES.jisdor, close, context).yoy?.against).toBe(
      "2025-10-20",
    );
  });

  it("expects the next release from each source's cadence, and says when one is late", () => {
    // 24 October 2026 is a Saturday in Jakarta.
    const saturday = Date.UTC(2026, 9, 24, 3);
    expect(
      nextRelease({ kind: "business-daily" }, "2026-10-23", saturday),
    ).toEqual({ date: "2026-10-26", approximate: false, late: false });
    expect(
      nextRelease({ kind: "weekly", weekday: 1 }, "2026-10-16", saturday).date,
    ).toBe("2026-10-26");
    // September's figure is out; October's is due on the 2nd business day of November.
    expect(
      nextRelease({ kind: "monthly", businessDay: 2 }, "2026-09", saturday),
    ).toEqual({ date: "2026-11-03", approximate: false, late: false });
    expect(
      nextRelease({ kind: "monthly", aroundDay: 7 }, "2026-09", saturday),
    ).toEqual({ date: "2026-11-07", approximate: true, late: false });
    expect(nextRelease({ kind: "meeting" }, "2026-10-21", saturday)).toEqual({
      date: "2026-11-21",
      approximate: true,
      late: false,
    });
    // August's figure is the latest seen, so September's (due 1 October) is late.
    expect(
      nextRelease({ kind: "monthly", businessDay: 1 }, "2026-08", saturday),
    ).toEqual({ date: "2026-10-01", approximate: false, late: true });
  });
});
