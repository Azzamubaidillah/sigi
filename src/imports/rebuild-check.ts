import type Database from "better-sqlite3";

import { FEEDS, feedOf } from "../macro/feeds";
import { seriesHash } from "../macro/import";
import type { Observation } from "../macro/parse";
import type { SeriesId } from "../macro/series";
import { contentHash, type HashableHolding } from "../ownership/content-hash";
import { parseS1Xlsx } from "../ownership/s1-xlsx";
import { readLandedFile } from "./landing";

export interface RebuildResult {
  /** An S1 month's record date, or a macro series ID. */
  item: string;
  kind: "s1" | "macro";
  importRunId: number;
  /** Recorded when the data was published. */
  storedHash: string;
  /** Of the rows the public pages read now. */
  tableHash: string;
  /** Of a fresh parse of the landed file; null when it could not be parsed. */
  reparsedHash: string | null;
  error: string | null;
  ok: boolean;
}

interface Backing {
  item: string;
  importRunId: number;
  storedHash: string;
  sha256: string;
  storedName: string;
}

async function reparse(
  landingDirectory: string,
  backing: Backing,
  hashOf: (bytes: Uint8Array) => { hash: string } | { error: string },
): Promise<{ reparsedHash: string | null; error: string | null }> {
  try {
    const result = hashOf(
      await readLandedFile(
        landingDirectory,
        backing.storedName,
        backing.sha256,
      ),
    );
    return "hash" in result
      ? { reparsedHash: result.hash, error: null }
      : { reparsedHash: null, error: result.error };
  } catch (cause) {
    return {
      reparsedHash: null,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

/**
 * Re-derives every published S1 month and macro series from its landed
 * source file and compares three digests: the one stored at publish time,
 * one of the published table as it stands, and one of a fresh parse (PRD
 * F10). A difference means the table was altered after publishing, the
 * landed file changed, or the parser no longer reads the file the way it did.
 */
export async function checkRebuild(
  sqlite: Database.Database,
  landingDirectory: string,
): Promise<RebuildResult[]> {
  const months = sqlite
    .prepare(
      `SELECT m.record_date AS item, m.import_run_id AS importRunId,
              m.content_hash AS storedHash, f.sha256 AS sha256,
              f.stored_name AS storedName
         FROM ownership_months m
         JOIN import_runs r ON r.id = m.import_run_id
         JOIN source_files f ON f.sha256 = r.file_sha256
        ORDER BY m.record_date`,
    )
    .all() as Backing[];
  const readRows = sqlite.prepare(
    `SELECT row_number AS rowNumber, share_code AS shareCode,
            issuer_name AS issuerName, investor_name AS investorName,
            investor_type AS investorType, local_foreign AS localForeign,
            nationality, domicile, shares_scripless AS sharesScripless,
            shares_scrip AS sharesScrip, shares_total AS sharesTotal,
            percent_hundredths AS percentHundredths
       FROM ownership_holdings WHERE record_date = ?`,
  );

  const results: RebuildResult[] = [];
  for (const month of months) {
    const tableHash = contentHash(
      month.item,
      readRows.all(month.item) as HashableHolding[],
    );
    const { reparsedHash, error } = await reparse(
      landingDirectory,
      month,
      (bytes) => {
        const parsed = parseS1Xlsx(bytes);
        return parsed.ok
          ? { hash: contentHash(parsed.recordDate, parsed.rows) }
          : { error: parsed.error };
      },
    );
    results.push({
      ...month,
      kind: "s1",
      tableHash,
      reparsedHash,
      error,
      ok:
        error === null &&
        tableHash === month.storedHash &&
        reparsedHash === month.storedHash,
    });
  }

  const series = sqlite
    .prepare(
      `SELECT m.series_id AS item, m.import_run_id AS importRunId,
              m.content_hash AS storedHash, f.sha256 AS sha256,
              f.stored_name AS storedName
         FROM macro_series m
         JOIN import_runs r ON r.id = m.import_run_id
         JOIN source_files f ON f.sha256 = r.file_sha256
        ORDER BY m.series_id`,
    )
    .all() as Backing[];
  const readObservations = sqlite.prepare(
    "SELECT period, value FROM macro_observations WHERE series_id = ? ORDER BY period",
  );
  for (const backing of series) {
    const id = backing.item as SeriesId;
    const tableHash = seriesHash(id, readObservations.all(id) as Observation[]);
    const { reparsedHash, error } = await reparse(
      landingDirectory,
      backing,
      (bytes) => {
        const parsed = FEEDS[feedOf(id)].parse(bytes);
        return parsed.ok
          ? { hash: seriesHash(id, parsed.series.get(id) ?? []) }
          : { error: parsed.error };
      },
    );
    results.push({
      ...backing,
      kind: "macro",
      tableHash,
      reparsedHash,
      error,
      ok:
        error === null &&
        tableHash === backing.storedHash &&
        reparsedHash === backing.storedHash,
    });
  }
  return results;
}
