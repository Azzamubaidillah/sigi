import { readDatabase } from "../db/read";
import type { ImportOutcome } from "../db/schema";
import type { GateVerdict } from "../imports/gate-result";
import { loadLatestMonth, type PublishedMonth } from "./ownership";

export interface GateRow {
  gate: string;
  verdict: GateVerdict;
  detail: string;
}

export interface ImportRunRow {
  id: number;
  sourceId: string;
  originalName: string;
  sourceUrl: string;
  sha256: string;
  byteSize: number;
  startedAt: number;
  outcome: ImportOutcome;
  parserVersion: string;
  parseError: string | null;
  recordDate: string | null;
  rowCount: number | null;
  issuerCount: number | null;
  holderCount: number | null;
  correction: boolean;
  gates: GateRow[];
}

export function loadImportRuns(
  databasePath: string,
  limit = 25,
): ImportRunRow[] {
  return (
    readDatabase(databasePath, (sqlite) => {
      const runs = sqlite
        .prepare(
          `SELECT r.id, r.source_id AS sourceId, f.original_name AS originalName,
                  f.source_url AS sourceUrl,
                  f.sha256, f.byte_size AS byteSize, r.started_at AS startedAt,
                  r.outcome, r.parser_version AS parserVersion,
                  r.parse_error AS parseError, r.record_date AS recordDate,
                  r.row_count AS rowCount, r.issuer_count AS issuerCount,
                  r.holder_count AS holderCount, r.correction
             FROM import_runs r JOIN source_files f ON f.sha256 = r.file_sha256
            ORDER BY r.id DESC LIMIT ?`,
        )
        .all(limit) as (Omit<ImportRunRow, "gates" | "correction"> & {
        correction: number;
      })[];
      const gates = sqlite.prepare(
        "SELECT gate, verdict, detail FROM gate_results WHERE import_run_id = ? ORDER BY rowid",
      );
      return runs.map((run) => ({
        ...run,
        correction: run.correction === 1,
        gates: gates.all(run.id) as GateRow[],
      }));
    }) ?? []
  );
}

export interface FeedStatus {
  feed: string;
  /** The worker's latest check; null if the feed was never checked. */
  last: {
    startedAt: number;
    outcome: "ok" | "failed";
    listed: number;
    fetched: number;
    error: string | null;
  } | null;
  /** When a check last found something new and imported it. */
  lastImportAt: number | null;
}

/** The latest check of each feed, in the order given. */
export function loadFeedStatus(
  databasePath: string,
  feeds: readonly string[],
): FeedStatus[] {
  return (
    readDatabase(databasePath, (sqlite) => {
      const last = sqlite.prepare(
        `SELECT started_at AS startedAt, outcome, listed, fetched, error
           FROM fetch_runs WHERE feed = ? ORDER BY id DESC LIMIT 1`,
      );
      const lastImport = sqlite
        .prepare(
          "SELECT max(started_at) FROM fetch_runs WHERE feed = ? AND fetched > 0",
        )
        .pluck();
      return feeds.map((feed) => ({
        feed,
        last: (last.get(feed) as FeedStatus["last"] | undefined) ?? null,
        lastImportAt: (lastImport.get(feed) as number | null) ?? null,
      }));
    }) ?? feeds.map((feed) => ({ feed, last: null, lastImportAt: null }))
  );
}

/**
 * When the next monthly file should appear. Record dates are the last trading
 * day of a month and the file has so far been announced within the first days
 * of the next (the February 2026 file on 3 March).
 */
export function nextS1Release(recordDate: string): {
  recordMonth: string;
  expectedBy: string;
} {
  const [year, month] = recordDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  const after = new Date(Date.UTC(year, month + 1, 7));
  return {
    recordMonth: next.toISOString().slice(0, 7),
    expectedBy: after.toISOString().slice(0, 10),
  };
}

export interface S1Health {
  latest: PublishedMonth | null;
  next: { recordMonth: string; expectedBy: string } | null;
  /** The next expected file is late: today is past its expected date. */
  overdue: boolean;
}

export function loadS1Health(databasePath: string, now = Date.now()): S1Health {
  const latest = loadLatestMonth(databasePath);
  const next = latest ? nextS1Release(latest.recordDate) : null;
  return {
    latest,
    next,
    overdue:
      next !== null &&
      new Date(now).toISOString().slice(0, 10) > next.expectedBy,
  };
}
