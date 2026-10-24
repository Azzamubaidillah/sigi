import type Database from "better-sqlite3";

import type { ImportOutcome } from "../db/schema";
import type { FeedId } from "../macro/feeds";
import { type FetchedFile, importMacroFile } from "../macro/import";
import { describeError } from "./errors";

export interface MacroFetchSummary {
  runId: number;
  feed: FeedId;
  outcome: "ok" | "failed";
  /** What the import did; null when the fetch itself failed. */
  imported: ImportOutcome | "unchanged" | null;
  error: string | null;
}

/**
 * One unattended check of one macro feed: fetch its file, import it, and
 * record the run in `fetch_runs` whatever happened.
 */
export async function runMacroFeed(
  sqlite: Database.Database,
  landingDirectory: string,
  feed: FeedId,
  fetchFile: (feed: FeedId, at: number) => Promise<FetchedFile>,
  now: () => number = Date.now,
): Promise<MacroFetchSummary> {
  const startedAt = now();
  let imported: MacroFetchSummary["imported"] = null;
  let error: string | null = null;
  try {
    const file = await fetchFile(feed, startedAt);
    const result = await importMacroFile(
      sqlite,
      landingDirectory,
      feed,
      file,
      now,
    );
    imported = result.kind === "unchanged" ? "unchanged" : result.outcome;
  } catch (cause) {
    error = describeError(cause);
  }
  const outcome = error === null ? "ok" : "failed";
  const runId = Number(
    sqlite
      .prepare(
        `INSERT INTO fetch_runs (feed, started_at, finished_at, outcome, listed, fetched, error)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        feed,
        startedAt,
        now(),
        outcome,
        error === null ? 1 : 0,
        imported === null || imported === "unchanged" ? 0 : 1,
        error,
      ).lastInsertRowid,
  );
  return { runId, feed, outcome, imported, error };
}
