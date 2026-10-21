import type Database from "better-sqlite3";

import type { ImportOutcome } from "../db/schema";
import { contentHash } from "../ownership/content-hash";
import {
  type GateResult,
  outcomeOf,
  type PreviousMonth,
  recordDateGate,
  runGates,
} from "../ownership/gates";
import { parseS1Pdf, S1_PARSER_VERSION, type S1Row } from "../ownership/s1-pdf";
import { landFile } from "./landing";

export const S1_SOURCE_ID = "S1";

export interface S1Upload {
  bytes: Uint8Array;
  originalName: string;
  sourceUrl: string;
  /** YYYY-MM-DD */
  accessedOn: string;
  correction: boolean;
}

export type S1ImportResult =
  | {
      kind: "duplicate";
      sha256: string;
      /** The earliest run of this file that was not rejected. */
      importRunId: number;
    }
  | {
      kind: "imported";
      sha256: string;
      importRunId: number;
      outcome: ImportOutcome;
      parseError: string | null;
      recordDate: string | null;
      gates: GateResult[];
    };

const holdingColumns = `share_code, issuer_name, investor_name, investor_type,
  local_foreign, nationality, domicile, shares_scripless, shares_scrip,
  shares_total, percent_hundredths`;

function publishedState(sqlite: Database.Database, recordDate: string) {
  return {
    latestPublished:
      (sqlite
        .prepare("SELECT max(record_date) FROM ownership_months")
        .pluck()
        .get() as string | null) ?? null,
    recordDatePublished:
      sqlite
        .prepare("SELECT 1 FROM ownership_months WHERE record_date = ?")
        .get(recordDate) !== undefined,
  };
}

function previousMonth(
  sqlite: Database.Database,
  recordDate: string,
): PreviousMonth | null {
  const month = sqlite
    .prepare(
      `SELECT record_date AS recordDate, row_count AS rowCount
         FROM ownership_months WHERE record_date < ?
        ORDER BY record_date DESC LIMIT 1`,
    )
    .get(recordDate) as { recordDate: string; rowCount: number } | undefined;
  if (!month) return null;
  const counts = sqlite
    .prepare(
      `SELECT share_code AS code, count(*) AS holders FROM ownership_holdings
        WHERE record_date = ? GROUP BY share_code`,
    )
    .all(month.recordDate) as { code: string; holders: number }[];
  return {
    ...month,
    holdersByCode: new Map(counts.map((row) => [row.code, row.holders])),
  };
}

/**
 * Makes a held or freshly gated run the published month for its record date,
 * replacing (and marking superseded) whatever run published that date before.
 * Runs inside the caller's transaction.
 */
function publishRun(
  sqlite: Database.Database,
  runId: number,
  at: number,
  action: "publish" | "approve",
  reason: string | null,
): void {
  const run = sqlite
    .prepare(
      `SELECT record_date AS recordDate, row_count AS rowCount,
              issuer_count AS issuerCount, holder_count AS holderCount,
              content_hash AS contentHash
         FROM import_runs WHERE id = ?`,
    )
    .get(runId) as {
    recordDate: string;
    rowCount: number;
    issuerCount: number;
    holderCount: number;
    contentHash: string;
  };
  const replaced = sqlite
    .prepare("SELECT import_run_id FROM ownership_months WHERE record_date = ?")
    .pluck()
    .get(run.recordDate) as number | undefined;
  if (replaced !== undefined) {
    sqlite
      .prepare("DELETE FROM ownership_holdings WHERE record_date = ?")
      .run(run.recordDate);
    sqlite
      .prepare("DELETE FROM ownership_months WHERE record_date = ?")
      .run(run.recordDate);
    sqlite
      .prepare("UPDATE import_runs SET outcome = 'superseded' WHERE id = ?")
      .run(replaced);
    sqlite
      .prepare(
        `INSERT INTO publish_audit
           (at, action, record_date, import_run_id, replaced_import_run_id, reason)
         VALUES (?, 'supersede', ?, ?, ?, ?)`,
      )
      .run(at, run.recordDate, runId, replaced, reason);
  }
  sqlite
    .prepare(
      `INSERT INTO ownership_months
         (record_date, import_run_id, published_at, content_hash, row_count,
          issuer_count, holder_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      run.recordDate,
      runId,
      at,
      run.contentHash,
      run.rowCount,
      run.issuerCount,
      run.holderCount,
    );
  sqlite
    .prepare(
      `INSERT INTO ownership_holdings (record_date, row_number, ${holdingColumns})
       SELECT ?, row_number, ${holdingColumns}
         FROM s1_staged_rows WHERE import_run_id = ?`,
    )
    .run(run.recordDate, runId);
  sqlite
    .prepare("UPDATE import_runs SET outcome = 'published' WHERE id = ?")
    .run(runId);
  sqlite
    .prepare(
      `INSERT INTO publish_audit (at, action, record_date, import_run_id, reason)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(at, action, run.recordDate, runId, reason);
}

function stageRows(
  sqlite: Database.Database,
  runId: number,
  rows: readonly S1Row[],
): void {
  const insert = sqlite.prepare(
    `INSERT INTO s1_staged_rows (import_run_id, row_number, ${holdingColumns})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const row of rows) {
    insert.run(
      runId,
      row.rowNumber,
      row.shareCode,
      row.issuerName,
      row.investorName,
      row.investorType,
      row.localForeign,
      row.nationality,
      row.domicile,
      row.sharesScripless,
      row.sharesScrip,
      row.sharesTotal,
      row.percentHundredths,
    );
  }
}

/**
 * Lands, parses, gates and (only if every gate passes) publishes one monthly
 * >1% holders file (PRD F1). The same bytes uploaded twice are a no-op.
 */
export async function importS1File(
  sqlite: Database.Database,
  landingDirectory: string,
  upload: S1Upload,
  now: () => number = Date.now,
): Promise<S1ImportResult> {
  const startedAt = now();
  const landed = await landFile(landingDirectory, upload.bytes, "pdf");
  // Same bytes again: a no-op, unless every earlier run of them was rejected.
  // A rejection can depend on state (no "correction" tick, an older month not
  // yet published), so a rejected file may be gated again.
  const live = sqlite
    .prepare(
      `SELECT min(id) FROM import_runs
        WHERE file_sha256 = ? AND source_id = ? AND outcome != 'rejected'`,
    )
    .pluck()
    .get(landed.sha256, S1_SOURCE_ID) as number | null;
  if (live !== null) {
    return { kind: "duplicate", sha256: landed.sha256, importRunId: live };
  }

  const parsed = await parseS1Pdf(upload.bytes);
  const finishedAt = now();
  const gates = parsed.ok
    ? runGates({
        recordDate: parsed.recordDate,
        rows: parsed.rows,
        previous: previousMonth(sqlite, parsed.recordDate),
        ...publishedState(sqlite, parsed.recordDate),
        correction: upload.correction,
      })
    : [];
  const outcome: ImportOutcome = parsed.ok ? outcomeOf(gates) : "rejected";

  const runId = sqlite
    .transaction((): number => {
      // Provenance is the first upload's: the file is the same file.
      sqlite
        .prepare(
          `INSERT INTO source_files
           (sha256, source_id, original_name, byte_size, stored_name,
            source_url, accessed_on, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (sha256) DO NOTHING`,
        )
        .run(
          landed.sha256,
          S1_SOURCE_ID,
          upload.originalName,
          upload.bytes.byteLength,
          landed.storedName,
          upload.sourceUrl,
          upload.accessedOn,
          startedAt,
        );
      const rows = parsed.ok ? parsed.rows : [];
      const id = Number(
        sqlite
          .prepare(
            `INSERT INTO import_runs
             (source_id, file_sha256, parser_version, started_at, finished_at,
              outcome, parse_error, record_date, row_count, issuer_count,
              holder_count, content_hash, correction)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            S1_SOURCE_ID,
            landed.sha256,
            S1_PARSER_VERSION,
            startedAt,
            finishedAt,
            // Recorded as gated; publishRun flips it once the month is live.
            outcome === "published" ? "held" : outcome,
            parsed.ok ? null : parsed.error,
            parsed.ok ? parsed.recordDate : null,
            parsed.ok ? rows.length : null,
            parsed.ok ? new Set(rows.map((row) => row.shareCode)).size : null,
            parsed.ok
              ? new Set(rows.map((row) => row.investorName)).size
              : null,
            parsed.ok ? contentHash(parsed.recordDate, rows) : null,
            upload.correction ? 1 : 0,
          ).lastInsertRowid,
      );
      const insertGate = sqlite.prepare(
        `INSERT INTO gate_results (import_run_id, gate, verdict, detail)
       VALUES (?, ?, ?, ?)`,
      );
      for (const gate of gates) {
        insertGate.run(id, gate.gate, gate.verdict, gate.detail);
      }
      stageRows(sqlite, id, rows);
      if (outcome === "published")
        publishRun(sqlite, id, finishedAt, "publish", null);
      return id;
    })
    .immediate();

  return {
    kind: "imported",
    sha256: landed.sha256,
    importRunId: runId,
    outcome,
    parseError: parsed.ok ? null : parsed.error,
    recordDate: parsed.ok ? parsed.recordDate : null,
    gates,
  };
}

export type ReviewResult =
  | { ok: true; outcome: "published" | "rejected" }
  | { ok: false; error: string };

/**
 * The owner's decision on a held month: publish it, or reject it. Either way
 * the reason is kept in the audit trail. Approval re-checks the record date
 * against what is published now, since another month may have gone live while
 * this one waited.
 */
export function reviewHeldRun(
  sqlite: Database.Database,
  runId: number,
  decision: "approve" | "reject",
  reason: string,
  now: () => number = Date.now,
): ReviewResult {
  return sqlite
    .transaction((): ReviewResult => {
      const run = sqlite
        .prepare(
          `SELECT outcome, record_date AS recordDate, correction
           FROM import_runs WHERE id = ? AND source_id = ?`,
        )
        .get(runId, S1_SOURCE_ID) as
        | { outcome: string; recordDate: string | null; correction: number }
        | undefined;
      if (!run) return { ok: false, error: `no import run ${runId}` };
      if (run.outcome !== "held" || run.recordDate === null) {
        return { ok: false, error: `run ${runId} is ${run.outcome}, not held` };
      }
      const at = now();
      if (decision === "reject") {
        sqlite
          .prepare("UPDATE import_runs SET outcome = 'rejected' WHERE id = ?")
          .run(runId);
        sqlite
          .prepare(
            `INSERT INTO publish_audit (at, action, record_date, import_run_id, reason)
           VALUES (?, 'reject', ?, ?, ?)`,
          )
          .run(at, run.recordDate, runId, reason);
        return { ok: true, outcome: "rejected" };
      }
      const gate = recordDateGate({
        recordDate: run.recordDate,
        ...publishedState(sqlite, run.recordDate),
        correction: run.correction === 1,
      });
      if (gate.verdict !== "pass") {
        return { ok: false, error: `cannot publish now: ${gate.detail}` };
      }
      publishRun(sqlite, runId, at, "approve", reason);
      return { ok: true, outcome: "published" };
    })
    .immediate();
}
