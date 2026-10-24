import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Every fetched source file, once. The bytes live in the landing directory
 * under their SHA-256 and are never modified or deleted: published tables are
 * derived from them and can be rebuilt from them (PRD F10).
 */
export const sourceFiles = sqliteTable("source_files", {
  sha256: text("sha256").primaryKey(),
  sourceId: text("source_id").notNull(),
  originalName: text("original_name").notNull(),
  byteSize: integer("byte_size").notNull(),
  storedName: text("stored_name").notNull(),
  /** The exchange's URL for the file; part of the citation (S1). */
  sourceUrl: text("source_url").notNull(),
  /** YYYY-MM-DD the worker fetched it, in Jakarta time; part of the citation. */
  accessedOn: text("accessed_on").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
});

export const importOutcomes = ["rejected", "published", "superseded"] as const;
export type ImportOutcome = (typeof importOutcomes)[number];

/**
 * One check of one source by the worker: `idx-s1` for the exchange's
 * ownership-data page, or a macro feed (`src/macro/feeds.ts`).
 */
export const fetchRuns = sqliteTable(
  "fetch_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    feed: text("feed").notNull(),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at").notNull(),
    outcome: text("outcome", { enum: ["ok", "failed"] }).notNull(),
    /** Files the source offered (monthly >1% files; 1 for a macro feed). */
    listed: integer("listed").notNull(),
    /** Files downloaded and imported in this run; 0 when nothing changed. */
    fetched: integer("fetched").notNull(),
    error: text("error"),
  },
  (table) => [index("fetch_runs_feed_idx").on(table.feed, table.id)],
);

/** One attempt to turn a landed file into published data (a month of S1, or macro series). */
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
    /** The file re-issues an already-published month, which it then replaces. */
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
    /** "pass"; "warn" publishes with the finding shown; "fail" rejects (D-021). */
    verdict: text("verdict", { enum: ["pass", "warn", "fail"] }).notNull(),
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
  // published, and the publisher's own files break that identity (one row in
  // each of 2026-02-27 and 2026-03-31). The gate publishes up to a few such
  // rows with a warning, and the ticker page flags the row (D-015, D-021).
  (table) => [
    primaryKey({ columns: [table.recordDate, table.rowNumber] }),
    index("ownership_holdings_code_idx").on(table.shareCode, table.recordDate),
  ],
);

/**
 * The published state of each macro series (PRD F6): the import run whose
 * file backs it. A series is replaced whole by each published file.
 */
export const macroSeries = sqliteTable("macro_series", {
  seriesId: text("series_id").primaryKey(),
  importRunId: integer("import_run_id")
    .notNull()
    .references(() => importRuns.id),
  publishedAt: integer("published_at").notNull(),
  contentHash: text("content_hash").notNull(),
  observationCount: integer("observation_count").notNull(),
  latestPeriod: text("latest_period").notNull(),
  /**
   * When Sigi first saw an observation for `latestPeriod`: the release date
   * as far as Sigi can tell, at the resolution of its daily check.
   */
  latestSeenAt: integer("latest_seen_at").notNull(),
});

export const macroObservations = sqliteTable(
  "macro_observations",
  {
    seriesId: text("series_id")
      .notNull()
      .references(() => macroSeries.seriesId),
    /** YYYY-MM-DD, or YYYY-MM for a monthly series. */
    period: text("period").notNull(),
    /** As published; nothing derived is stored. */
    value: real("value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.seriesId, table.period] })],
);

/** Every change to what the public sees, with the reason when one is required. */
export const publishAudit = sqliteTable("publish_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  at: integer("at").notNull(),
  action: text("action", { enum: ["publish", "supersede"] }).notNull(),
  recordDate: text("record_date"),
  importRunId: integer("import_run_id")
    .notNull()
    .references(() => importRuns.id),
  replacedImportRunId: integer("replaced_import_run_id").references(
    () => importRuns.id,
  ),
  reason: text("reason"),
});
