import type Database from "better-sqlite3";

import { readDatabase } from "../db/read";
import type { Holding } from "../ownership/metrics";

export interface PublishedMonth {
  recordDate: string;
  importRunId: number;
  publishedAt: number;
  rowCount: number;
  issuerCount: number;
  holderCount: number;
  /** Where and when the worker downloaded the file, for the citation (S1). */
  sourceUrl: string;
  accessedOn: string;
}

export interface PublishedHolding extends Holding {
  nationality: string | null;
  domicile: string | null;
}

export interface CompanyMonth {
  shareCode: string;
  issuerName: string;
  /** Largest first, then in publisher order. */
  holdings: PublishedHolding[];
}

/** Everything published, read once per publish rather than once per page. */
export interface Snapshot {
  /** Newest first. */
  months: PublishedMonth[];
  companies: Map<string, Map<string, CompanyMonth>>;
}

function signatureOf(sqlite: Database.Database): string {
  return (
    (sqlite
      .prepare(
        `SELECT group_concat(record_date || ':' || import_run_id || ':' || published_at, ',')
           FROM (SELECT * FROM ownership_months ORDER BY record_date)`,
      )
      .pluck()
      .get() as string | null) ?? ""
  );
}

function readSnapshot(sqlite: Database.Database): Snapshot {
  const months = sqlite
    .prepare(
      `SELECT m.record_date AS recordDate, m.import_run_id AS importRunId,
              m.published_at AS publishedAt, m.row_count AS rowCount,
              m.issuer_count AS issuerCount, m.holder_count AS holderCount,
              f.source_url AS sourceUrl, f.accessed_on AS accessedOn
         FROM ownership_months m
         JOIN import_runs r ON r.id = m.import_run_id
         JOIN source_files f ON f.sha256 = r.file_sha256
        ORDER BY m.record_date DESC`,
    )
    .all() as PublishedMonth[];
  const rows = sqlite
    .prepare(
      `SELECT record_date AS recordDate, share_code AS shareCode,
              issuer_name AS issuerName, row_number AS rowNumber,
              investor_name AS investorName, investor_type AS investorType,
              local_foreign AS localForeign, nationality, domicile,
              shares_scripless AS sharesScripless, shares_scrip AS sharesScrip,
              shares_total AS sharesTotal, percent_hundredths AS percentHundredths
         FROM ownership_holdings
        ORDER BY record_date, share_code, percent_hundredths DESC, row_number`,
    )
    .all() as (PublishedHolding & {
    recordDate: string;
    shareCode: string;
    issuerName: string;
  })[];
  const companies = new Map<string, Map<string, CompanyMonth>>();
  for (const { recordDate, shareCode, issuerName, ...holding } of rows) {
    let month = companies.get(recordDate);
    if (!month) companies.set(recordDate, (month = new Map()));
    let company = month.get(shareCode);
    if (!company)
      month.set(shareCode, (company = { shareCode, issuerName, holdings: [] }));
    company.holdings.push(holding);
  }
  return { months, companies };
}

const cacheKey = Symbol.for("sigi.snapshot");
const cache: Map<string, { signature: string; snapshot: Snapshot }> = ((
  globalThis as Record<symbol, unknown>
)[cacheKey] ??= new Map()) as Map<
  string,
  { signature: string; snapshot: Snapshot }
>;

/**
 * The published data, rebuilt only when a publish, supersede or approval has
 * changed `ownership_months` since the last read. Null when there is no
 * database yet. The returned object is shared; callers must not modify it.
 */
export function loadSnapshot(databasePath: string): Snapshot | null {
  return readDatabase(databasePath, (sqlite) => {
    const signature = signatureOf(sqlite);
    const cached = cache.get(databasePath);
    if (cached?.signature === signature) return cached.snapshot;
    const snapshot = readSnapshot(sqlite);
    cache.set(databasePath, { signature, snapshot });
    return snapshot;
  });
}
