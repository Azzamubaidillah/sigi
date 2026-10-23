import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import { buildS1Workbook, syntheticMonth } from "../ownership/s1-fixture";
import { type ListedFile, s1Listings } from "./idx-listing";
import { jakartaDate, runS1Fetch, type S1Source } from "./s1-fetch";

const ISSUERS = 600;
const FEB = buildS1Workbook(syntheticMonth(ISSUERS, 0), {
  recordDate: "2026-02-27",
});
const MAR = buildS1Workbook(syntheticMonth(ISSUERS, 1), {
  recordDate: "2026-03-31",
  typeHeader: "INVESTOR_CLASSIFICATION",
});
const FEB_REISSUED = buildS1Workbook(
  syntheticMonth(ISSUERS, 0).map((row, index) =>
    index === 0
      ? { ...row, scripless: row.scripless + 1, total: undefined }
      : row,
  ),
  { recordDate: "2026-02-27" },
);

// The page gives full URLs.
const listed = (title: string, file: string): ListedFile => ({
  description: title,
  path: `https://www.idx.co.id/Media/abc/${file}`,
});
const febFile = listed(
  "Pemegang Saham di Atas 1% per 27 Februari 2026",
  "peng-02.xlsx",
);
const marFile = listed(
  "Pemegang Saham di Atas 1% per 31 Maret 2026",
  "peng-03.xlsx",
);

const directories: string[] = [];
const databases: Database.Database[] = [];
afterEach(() => {
  for (const sqlite of databases.splice(0)) sqlite.close();
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

function setup() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-fetch-"));
  directories.push(directory);
  const { sqlite, db } = openDatabase(path.join(directory, "sigi.db"));
  databases.push(sqlite);
  migrateDatabase(db);
  return { sqlite, landing: path.join(directory, "landing") };
}

/** A stand-in for the exchange's page: a listing, and bytes per URL. */
function source(
  files: ListedFile[],
  bytes: Record<string, Uint8Array | Error>,
) {
  const downloads: string[] = [];
  let closed = 0;
  const open = async (): Promise<S1Source> => ({
    listFiles: async () => files,
    download: async (url) => {
      downloads.push(url);
      const body = bytes[url.slice(url.lastIndexOf("/") + 1)];
      if (!body) throw new Error(`unexpected download ${url}`);
      if (body instanceof Error) throw body;
      return body;
    },
    close: async () => {
      closed += 1;
    },
  });
  return { open, downloads, closedCount: () => closed };
}

const publishedMonths = (sqlite: Database.Database) =>
  sqlite
    .prepare("SELECT record_date FROM ownership_months ORDER BY record_date")
    .pluck()
    .all();

describe("IDX listing", () => {
  it("keeps only the monthly >1% workbooks on the exchange's own store, oldest first", () => {
    const files: ListedFile[] = [
      listed("Pemegang Saham di Atas 1% per 30 September 2026", "sep.xlsx"),
      listed("Pemegang Saham di Atas 1% per 30 Juni 2026", "jun-b.xlsx"),
      // Spacing and case vary; a relative path is resolved against the site.
      {
        description: "Pemegang  Saham di atas 1% per 30 Juni 2026 \n",
        path: "/Media/abc/jun-a.xlsx",
      },
      listed(
        "Data Kepemilikan Saham Perusahaan Tercatat per Tipe Investor per 30 September 2026",
        "type.xlsx",
      ),
      listed("Pemegang Saham di Atas 5% per 1 Oktober 2026", "five.xlsx"),
      listed("Pemegang Saham di Atas 1% per 31 Juni 2026", "impossible.xlsx"),
      {
        description: "Pemegang Saham di Atas 1% per 31 Juli 2026",
        path: "https://elsewhere.example/Media/abc/x.xlsx",
      },
      listed("Pemegang Saham di Atas 1% per 31 Juli 2026", "jul.pdf"),
    ];
    expect(
      s1Listings(files).map((listing) => [listing.recordDate, listing.url]),
    ).toEqual([
      ["2026-06-30", "https://www.idx.co.id/Media/abc/jun-a.xlsx"],
      ["2026-06-30", "https://www.idx.co.id/Media/abc/jun-b.xlsx"],
      ["2026-09-30", "https://www.idx.co.id/Media/abc/sep.xlsx"],
    ]);
  });

  it("dates access in Jakarta time", () => {
    // 2026-03-31 18:30 UTC is already 1 April in Jakarta (UTC+7).
    expect(jakartaDate(Date.UTC(2026, 2, 31, 18, 30))).toBe("2026-04-01");
  });
});

describe("S1 fetch run", { timeout: 60_000 }, () => {
  it("imports every new month oldest first, then fetches nothing more", async () => {
    const { sqlite, landing } = setup();
    // Listed newest first, as the page does.
    const page = source([marFile, febFile], {
      "peng-02.xlsx": FEB,
      "peng-03.xlsx": MAR,
    });
    const first = await runS1Fetch(sqlite, landing, page.open);
    expect(first).toMatchObject({ outcome: "ok", listed: 2, error: null });
    expect(
      first.fetched.map((file) => [file.recordDate, file.outcome]),
    ).toEqual([
      ["2026-02-27", "published"],
      ["2026-03-31", "published"],
    ]);
    expect(publishedMonths(sqlite)).toEqual(["2026-02-27", "2026-03-31"]);
    expect(
      sqlite
        .prepare("SELECT source_url FROM source_files ORDER BY fetched_at")
        .pluck()
        .all(),
    ).toEqual([
      "https://www.idx.co.id/Media/abc/peng-02.xlsx",
      "https://www.idx.co.id/Media/abc/peng-03.xlsx",
    ]);

    const second = await runS1Fetch(sqlite, landing, page.open);
    expect(second).toMatchObject({ outcome: "ok", listed: 2, fetched: [] });
    expect(page.downloads).toHaveLength(2);
    expect(page.closedCount()).toBe(2);
    expect(
      sqlite
        .prepare("SELECT outcome, listed, fetched FROM fetch_runs ORDER BY id")
        .all(),
    ).toEqual([
      { outcome: "ok", listed: 2, fetched: 2 },
      { outcome: "ok", listed: 2, fetched: 0 },
    ]);
  });

  it("treats a re-issued month as a correction that replaces it", async () => {
    const { sqlite, landing } = setup();
    await runS1Fetch(
      sqlite,
      landing,
      source([febFile], { "peng-02.xlsx": FEB }).open,
    );
    const reissue = listed(
      "Pemegang Saham di Atas 1% per 27 Februari 2026",
      "peng-02-rev.xlsx",
    );
    const run = await runS1Fetch(
      sqlite,
      landing,
      source([reissue, febFile], { "peng-02-rev.xlsx": FEB_REISSUED }).open,
    );
    expect(run.fetched).toEqual([
      {
        url: "https://www.idx.co.id/Media/abc/peng-02-rev.xlsx",
        recordDate: "2026-02-27",
        outcome: "published",
      },
    ]);
    expect(
      sqlite
        .prepare("SELECT outcome FROM import_runs ORDER BY id")
        .pluck()
        .all(),
    ).toEqual(["superseded", "published"]);
  });

  it("records a failure, keeps what was imported before it, and retries the rest next time", async () => {
    const { sqlite, landing } = setup();
    const failing = source([febFile, marFile], {
      "peng-02.xlsx": FEB,
      "peng-03.xlsx": new Error(
        "https://www.idx.co.id/Media/abc/peng-03.xlsx: HTTP 403",
      ),
    });
    const run = await runS1Fetch(sqlite, landing, failing.open);
    expect(run).toMatchObject({
      outcome: "failed",
      error: "https://www.idx.co.id/Media/abc/peng-03.xlsx: HTTP 403",
    });
    expect(publishedMonths(sqlite)).toEqual(["2026-02-27"]);
    expect(failing.closedCount()).toBe(1);

    const retry = await runS1Fetch(
      sqlite,
      landing,
      source([febFile, marFile], { "peng-03.xlsx": MAR }).open,
    );
    expect(retry.fetched.map((file) => file.recordDate)).toEqual([
      "2026-03-31",
    ]);
    expect(publishedMonths(sqlite)).toEqual(["2026-02-27", "2026-03-31"]);
  });

  it("fails when the browser cannot open the page, or the page lists no files", async () => {
    const { sqlite, landing } = setup();
    const blocked = await runS1Fetch(sqlite, landing, async () => {
      throw new Error("still on the Cloudflare challenge after 90s");
    });
    expect(blocked).toMatchObject({
      outcome: "failed",
      listed: 0,
      error: "still on the Cloudflare challenge after 90s",
    });
    const empty = await runS1Fetch(sqlite, landing, source([], {}).open);
    expect(empty.outcome).toBe("failed");
    expect(empty.error).toMatch(/lists no >1% holder files/);
    expect(
      sqlite
        .prepare("SELECT count(*) FROM fetch_runs WHERE outcome = 'failed'")
        .pluck()
        .get(),
    ).toBe(2);
  });
});
