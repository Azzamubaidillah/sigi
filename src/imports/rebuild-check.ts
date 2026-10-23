import type Database from "better-sqlite3";

import { contentHash, type HashableHolding } from "../ownership/content-hash";
import { parseS1Xlsx } from "../ownership/s1-xlsx";
import { readLandedFile } from "./landing";

export interface RebuildMonth {
  recordDate: string;
  importRunId: number;
  /** Recorded when the month was published. */
  storedHash: string;
  /** Of the rows the public pages read now. */
  tableHash: string;
  /** Of a fresh parse of the landed file; null when it could not be parsed. */
  reparsedHash: string | null;
  error: string | null;
  ok: boolean;
}

/**
 * Re-derives every published month from its landed source file and compares
 * three digests: the one stored at publish time, one of the published table as
 * it stands, and one of a fresh parse (PRD F10). A difference means the table
 * was altered after publishing, the landed file changed, or the parser no
 * longer reads the file the way it did.
 */
export async function checkRebuild(
  sqlite: Database.Database,
  landingDirectory: string,
): Promise<RebuildMonth[]> {
  const months = sqlite
    .prepare(
      `SELECT m.record_date AS recordDate, m.import_run_id AS importRunId,
              m.content_hash AS storedHash, f.sha256 AS sha256,
              f.stored_name AS storedName
         FROM ownership_months m
         JOIN import_runs r ON r.id = m.import_run_id
         JOIN source_files f ON f.sha256 = r.file_sha256
        ORDER BY m.record_date`,
    )
    .all() as {
    recordDate: string;
    importRunId: number;
    storedHash: string;
    sha256: string;
    storedName: string;
  }[];
  const readRows = sqlite.prepare(
    `SELECT row_number AS rowNumber, share_code AS shareCode,
            issuer_name AS issuerName, investor_name AS investorName,
            investor_type AS investorType, local_foreign AS localForeign,
            nationality, domicile, shares_scripless AS sharesScripless,
            shares_scrip AS sharesScrip, shares_total AS sharesTotal,
            percent_hundredths AS percentHundredths
       FROM ownership_holdings WHERE record_date = ?`,
  );

  const results: RebuildMonth[] = [];
  for (const month of months) {
    const tableHash = contentHash(
      month.recordDate,
      readRows.all(month.recordDate) as HashableHolding[],
    );
    let reparsedHash: string | null = null;
    let error: string | null = null;
    try {
      const bytes = await readLandedFile(
        landingDirectory,
        month.storedName,
        month.sha256,
      );
      const parsed = parseS1Xlsx(bytes);
      if (parsed.ok) reparsedHash = contentHash(parsed.recordDate, parsed.rows);
      else error = parsed.error;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    results.push({
      recordDate: month.recordDate,
      importRunId: month.importRunId,
      storedHash: month.storedHash,
      tableHash,
      reparsedHash,
      error,
      ok:
        error === null &&
        tableHash === month.storedHash &&
        reparsedHash === month.storedHash,
    });
  }
  return results;
}
