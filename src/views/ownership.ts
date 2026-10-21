import type Database from "better-sqlite3";

import { readDatabase } from "../db/read";
import {
  compareMonths,
  type Concentration,
  concentration,
  floatEstimateHundredths,
  type Holding,
  type MonthChanges,
} from "../ownership/metrics";

/** Why a section has nothing to show. Pages render these, never a zero. */
export type OwnershipAbsence =
  "no_published_month" | "not_in_register" | "no_previous_month";

export const ABSENCE_TEXT: Record<OwnershipAbsence, string> = {
  no_published_month: "No month of the >1% register has been published yet.",
  not_in_register:
    "This code has no holder above 1% in the latest published month, or is not a listed share.",
  no_previous_month:
    "No earlier month is published, so there is nothing to compare against.",
};

export interface PublishedMonth {
  recordDate: string;
  importRunId: number;
  publishedAt: number;
  rowCount: number;
  issuerCount: number;
  holderCount: number;
  /** Where and when the owner downloaded the file, for the citation (S1). */
  sourceUrl: string;
  accessedOn: string;
}

const monthSelect = `SELECT m.record_date AS recordDate, m.import_run_id AS importRunId,
        m.published_at AS publishedAt, m.row_count AS rowCount,
        m.issuer_count AS issuerCount, m.holder_count AS holderCount,
        f.source_url AS sourceUrl, f.accessed_on AS accessedOn
   FROM ownership_months m
   JOIN import_runs r ON r.id = m.import_run_id
   JOIN source_files f ON f.sha256 = r.file_sha256`;

function latestMonth(sqlite: Database.Database): PublishedMonth | null {
  return (
    (sqlite
      .prepare(`${monthSelect} ORDER BY m.record_date DESC LIMIT 1`)
      .get() as PublishedMonth | undefined) ?? null
  );
}

function monthBefore(
  sqlite: Database.Database,
  recordDate: string,
): PublishedMonth | null {
  return (
    (sqlite
      .prepare(
        `${monthSelect} WHERE m.record_date < ? ORDER BY m.record_date DESC LIMIT 1`,
      )
      .get(recordDate) as PublishedMonth | undefined) ?? null
  );
}

export function loadLatestMonth(databasePath: string): PublishedMonth | null {
  return readDatabase(databasePath, latestMonth) ?? null;
}

export interface CompanyRow {
  shareCode: string;
  issuerName: string;
  holders: number;
  topHundredths: number;
  floatEstimateHundredths: number;
}

export type CompanyList =
  | { kind: "absent"; reason: OwnershipAbsence }
  | { kind: "list"; month: PublishedMonth; companies: CompanyRow[] };

export function loadCompanyList(databasePath: string): CompanyList {
  const result = readDatabase(databasePath, (sqlite): CompanyList => {
    const month = latestMonth(sqlite);
    if (!month) return { kind: "absent", reason: "no_published_month" };
    const rows = sqlite
      .prepare(
        `SELECT share_code AS shareCode, min(issuer_name) AS issuerName,
                count(*) AS holders, max(percent_hundredths) AS topHundredths,
                sum(percent_hundredths) AS sumHundredths
           FROM ownership_holdings WHERE record_date = ?
          GROUP BY share_code ORDER BY share_code`,
      )
      .all(month.recordDate) as (Omit<CompanyRow, "floatEstimateHundredths"> & {
      sumHundredths: number;
    })[];
    return {
      kind: "list",
      month,
      companies: rows.map(({ sumHundredths, ...row }) => ({
        ...row,
        floatEstimateHundredths: Math.max(0, 10_000 - sumHundredths),
      })),
    };
  });
  return result ?? { kind: "absent", reason: "no_published_month" };
}

export interface PublishedHolding extends Holding {
  nationality: string | null;
  domicile: string | null;
}

export type ChangesSlice =
  | { kind: "absent"; reason: OwnershipAbsence }
  | { kind: "changes"; previous: PublishedMonth; changes: MonthChanges };

export type TickerOwnership =
  | { kind: "absent"; reason: OwnershipAbsence; month: PublishedMonth | null }
  | {
      kind: "ownership";
      month: PublishedMonth;
      shareCode: string;
      issuerName: string;
      holdings: PublishedHolding[];
      concentration: Concentration;
      floatEstimateHundredths: number;
      changes: ChangesSlice;
    };

const holdingSelect = `SELECT row_number AS rowNumber,
        investor_name AS investorName, investor_type AS investorType,
        local_foreign AS localForeign, nationality, domicile,
        shares_scripless AS sharesScripless, shares_scrip AS sharesScrip,
        shares_total AS sharesTotal, percent_hundredths AS percentHundredths
   FROM ownership_holdings WHERE record_date = ? AND share_code = ?
  ORDER BY percent_hundredths DESC, row_number`;

/** The ticker page's ownership section (PRD F2). */
export function loadTickerOwnership(
  databasePath: string,
  shareCode: string,
): TickerOwnership {
  const result = readDatabase(databasePath, (sqlite): TickerOwnership => {
    const month = latestMonth(sqlite);
    if (!month)
      return { kind: "absent", reason: "no_published_month", month: null };
    const holdings = sqlite
      .prepare(holdingSelect)
      .all(month.recordDate, shareCode) as PublishedHolding[];
    if (holdings.length === 0)
      return { kind: "absent", reason: "not_in_register", month };
    const previous = monthBefore(sqlite, month.recordDate);
    return {
      kind: "ownership",
      month,
      shareCode,
      issuerName: sqlite
        .prepare(
          "SELECT issuer_name FROM ownership_holdings WHERE record_date = ? AND share_code = ? LIMIT 1",
        )
        .pluck()
        .get(month.recordDate, shareCode) as string,
      holdings,
      concentration: concentration(holdings),
      floatEstimateHundredths: floatEstimateHundredths(holdings),
      changes: previous
        ? {
            kind: "changes",
            previous,
            changes: compareMonths(
              holdings,
              sqlite
                .prepare(holdingSelect)
                .all(previous.recordDate, shareCode) as PublishedHolding[],
            ),
          }
        : { kind: "absent", reason: "no_previous_month" },
    };
  });
  return (
    result ?? { kind: "absent", reason: "no_published_month", month: null }
  );
}
