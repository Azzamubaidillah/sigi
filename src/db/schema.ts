import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/** Failed-login counters per scope (an address, or the global ceiling). */
export const loginAttempts = sqliteTable("login_attempts", {
  scope: text("scope").primaryKey(),
  failureCount: integer("failure_count").notNull(),
  firstFailureAt: integer("first_failure_at").notNull(),
  lockedUntil: integer("locked_until"),
  updatedAt: integer("updated_at").notNull(),
});

/**
 * Every uploaded source file, once. The bytes live in the landing directory
 * under their SHA-256 and are never modified or deleted: published tables are
 * derived from them and can be rebuilt from them (PRD F10).
 */
export const sourceFiles = sqliteTable("source_files", {
  sha256: text("sha256").primaryKey(),
  sourceId: text("source_id").notNull(),
  originalName: text("original_name").notNull(),
  byteSize: integer("byte_size").notNull(),
  storedName: text("stored_name").notNull(),
  /** Where the owner downloaded it; required for the citation (S1). */
  sourceUrl: text("source_url").notNull(),
  /** YYYY-MM-DD the owner downloaded it; required for the citation (S1). */
  accessedOn: text("accessed_on").notNull(),
  uploadedAt: integer("uploaded_at").notNull(),
});

export const importOutcomes = [
  "rejected",
  "held",
  "published",
  "superseded",
] as const;
export type ImportOutcome = (typeof importOutcomes)[number];

/** One attempt to turn a landed file into a published month. */
export const importRuns = sqliteTable(
  "import_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: text("source_id").notNull(),
    fileSha256: text("file_sha256")
      .notNull()
      .references(() => sourceFiles.sha256),
    parserVersion: text("parser_version").notNull(),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at").notNull(),
    outcome: text("outcome", { enum: importOutcomes }).notNull(),
    /** Set when the file could not be parsed at all; gates did not run. */
    parseError: text("parse_error"),
    recordDate: text("record_date"),
    rowCount: integer("row_count"),
    issuerCount: integer("issuer_count"),
    holderCount: integer("holder_count"),
    contentHash: text("content_hash"),
    /** The owner declared this file a correction of an already-published month. */
    correction: integer("correction", { mode: "boolean" }).notNull(),
  },
  (table) => [
    index("import_runs_source_idx").on(table.sourceId, table.id),
    index("import_runs_file_idx").on(table.fileSha256),
  ],
);

export const gateResults = sqliteTable(
  "gate_results",
  {
    importRunId: integer("import_run_id")
      .notNull()
      .references(() => importRuns.id),
    gate: text("gate").notNull(),
    /** "pass", "fail", or "hold" (passes the hard checks but needs review). */
    verdict: text("verdict", { enum: ["pass", "fail", "hold"] }).notNull(),
    detail: text("detail").notNull(),
  },
  (table) => [primaryKey({ columns: [table.importRunId, table.gate] })],
);

const holdingColumns = {
  rowNumber: integer("row_number").notNull(),
  shareCode: text("share_code").notNull(),
  issuerName: text("issuer_name").notNull(),
  investorName: text("investor_name").notNull(),
  investorType: text("investor_type"),
  localForeign: text("local_foreign"),
  nationality: text("nationality"),
  domicile: text("domicile"),
  sharesScripless: integer("shares_scripless").notNull(),
  sharesScrip: integer("shares_scrip").notNull(),
  sharesTotal: integer("shares_total").notNull(),
  /** The published percentage times 100, e.g. 41,10% is 4110. */
  percentHundredths: integer("percent_hundredths").notNull(),
};

/** Parsed rows of one import run, kept whatever the gates decided. */
export const s1StagedRows = sqliteTable(
  "s1_staged_rows",
  {
    importRunId: integer("import_run_id")
      .notNull()
      .references(() => importRuns.id),
    ...holdingColumns,
  },
  (table) => [primaryKey({ columns: [table.importRunId, table.rowNumber] })],
);

/** The published months; exactly one import run backs each. */
export const ownershipMonths = sqliteTable("ownership_months", {
  recordDate: text("record_date").primaryKey(),
  importRunId: integer("import_run_id")
    .notNull()
    .references(() => importRuns.id),
  publishedAt: integer("published_at").notNull(),
  contentHash: text("content_hash").notNull(),
  rowCount: integer("row_count").notNull(),
  issuerCount: integer("issuer_count").notNull(),
  holderCount: integer("holder_count").notNull(),
});

export const ownershipHoldings = sqliteTable(
  "ownership_holdings",
  {
    recordDate: text("record_date")
      .notNull()
      .references(() => ownershipMonths.recordDate),
    ...holdingColumns,
  },
  // No CHECK that total = scripless + scrip: rows are stored exactly as
  // published, and the publisher's own file breaks that identity (the
  // 2026-02-27 file has one such row). The gate holds such a month for the
  // owner's review instead, and the ticker page flags the row (D-015).
  (table) => [
    primaryKey({ columns: [table.recordDate, table.rowNumber] }),
    index("ownership_holdings_code_idx").on(table.shareCode, table.recordDate),
  ],
);

/** Every change to what the public sees, with the reason when one is required. */
export const publishAudit = sqliteTable("publish_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  at: integer("at").notNull(),
  action: text("action", {
    enum: ["publish", "supersede", "approve", "reject"],
  }).notNull(),
  recordDate: text("record_date"),
  importRunId: integer("import_run_id")
    .notNull()
    .references(() => importRuns.id),
  replacedImportRunId: integer("replaced_import_run_id").references(
    () => importRuns.id,
  ),
  reason: text("reason"),
});
