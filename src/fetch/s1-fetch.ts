import type Database from "better-sqlite3";

import type { ImportOutcome } from "../db/schema";
import { importS1File, S1_SOURCE_ID } from "../imports/s1-import";
import { S1_PARSER_VERSION } from "../ownership/s1-xlsx";
import { type ListedFile, s1Listings } from "./idx-listing";

export interface S1Source {
  listFiles(): Promise<ListedFile[]>;
  download(url: string): Promise<Uint8Array>;
  close(): Promise<void>;
}

export interface FetchedFile {
  url: string;
  recordDate: string;
  /** "duplicate" when the bytes were imported before under another URL. */
  outcome: ImportOutcome | "duplicate";
}

export interface FetchSummary {
  runId: number;
  outcome: "ok" | "failed";
  listed: number;
  fetched: FetchedFile[];
  error: string | null;
}

/** YYYY-MM-DD in Jakarta, the exchange's time zone, for the citation. */
export function jakartaDate(at: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    at,
  );
}

/**
 * Whether this parser has already seen the file at `url`. A file is fetched
 * once per parser version: a new version reads every listed file again, and
 * the landing store's hash check turns unchanged months into no-ops.
 */
function alreadyImported(sqlite: Database.Database, url: string): boolean {
  return (
    sqlite
      .prepare(
        `SELECT 1 FROM import_runs r JOIN source_files f ON f.sha256 = r.file_sha256
          WHERE f.source_url = ? AND r.source_id = ? AND r.parser_version = ? LIMIT 1`,
      )
      .get(url, S1_SOURCE_ID, S1_PARSER_VERSION) !== undefined
  );
}

function isPublished(sqlite: Database.Database, recordDate: string): boolean {
  return (
    sqlite
      .prepare("SELECT 1 FROM ownership_months WHERE record_date = ?")
      .get(recordDate) !== undefined
  );
}

/**
 * One unattended check of the exchange's page (PRD F1): every >1% workbook not
 * yet imported is downloaded and imported, oldest first, so months publish in
 * order. The first error stops the run; what was imported before it stays.
 * Every run is recorded in `fetch_runs`, failed or not.
 */
export async function runS1Fetch(
  sqlite: Database.Database,
  landingDirectory: string,
  openSource: () => Promise<S1Source>,
  now: () => number = Date.now,
): Promise<FetchSummary> {
  const startedAt = now();
  const fetched: FetchedFile[] = [];
  let listed = 0;
  let error: string | null = null;
  let source: S1Source | null = null;
  try {
    source = await openSource();
    const listings = s1Listings(await source.listFiles());
    listed = listings.length;
    if (listed === 0)
      throw new Error(
        "the page lists no >1% holder files; its layout may have changed",
      );
    for (const listing of listings) {
      if (alreadyImported(sqlite, listing.url)) continue;
      const bytes = await source.download(listing.url);
      const result = await importS1File(
        sqlite,
        landingDirectory,
        {
          bytes,
          originalName: decodeURIComponent(
            listing.url.slice(listing.url.lastIndexOf("/") + 1),
          ),
          sourceUrl: listing.url,
          accessedOn: jakartaDate(now()),
          correction: isPublished(sqlite, listing.recordDate),
        },
        now,
      );
      fetched.push({
        url: listing.url,
        recordDate: listing.recordDate,
        outcome: result.kind === "duplicate" ? "duplicate" : result.outcome,
      });
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  } finally {
    await source?.close().catch(() => undefined);
  }
  const outcome = error === null ? "ok" : "failed";
  const runId = Number(
    sqlite
      .prepare(
        `INSERT INTO fetch_runs (started_at, finished_at, outcome, listed, fetched, error)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(startedAt, now(), outcome, listed, fetched.length, error)
      .lastInsertRowid,
  );
  return { runId, outcome, listed, fetched, error };
}
