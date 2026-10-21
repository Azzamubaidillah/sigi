import path from "node:path";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import type { SigiDatabase } from "./client";

export interface MigrationOutcome {
  /** Migrations this call applied; zero when the database was already current. */
  appliedMigrations: number;
  /**
   * What was done about planner statistics. `analyze` is a full pass over every
   * table; `optimize` is `PRAGMA optimize`, which only re-analyzes what SQLite
   * itself judges stale.
   */
  statistics: "analyze" | "optimize";
  /** Why a full `ANALYZE` ran. Absent when `statistics` is `optimize`. */
  analyzeReason?: "migrations-applied" | "statistics-missing";
  durationMs: number;
}

function migrationCount(database: SigiDatabase): number {
  const client = database.$client;
  // Drizzle creates its journal on the first `migrate`, so on a new database
  // the table is not there to count yet.
  const journal = client
    .prepare(
      `SELECT 1 FROM sqlite_master
        WHERE type = 'table' AND name = '__drizzle_migrations'`,
    )
    .pluck()
    .get();
  if (!journal) return 0;
  return client
    .prepare("SELECT count(*) FROM __drizzle_migrations")
    .pluck()
    .get() as number;
}

/**
 * Whether the planner has anything to go on. `ANALYZE` on empty tables writes
 * no rows, so an empty `sqlite_stat1` also means "nothing was ever analyzed
 * with data present" -- exactly the case (fresh install, restored database
 * from before statistics) that must be analyzed before serving.
 */
function hasStatistics(database: SigiDatabase): boolean {
  const client = database.$client;
  const table = client
    .prepare(
      `SELECT 1 FROM sqlite_master
        WHERE type = 'table' AND name = 'sqlite_stat1'`,
    )
    .pluck()
    .get();
  if (!table) return false;
  return (
    client.prepare("SELECT 1 FROM sqlite_stat1 LIMIT 1").get() !== undefined
  );
}

export function migrateDatabase(
  database: SigiDatabase,
  migrationsFolder = path.resolve(process.cwd(), "drizzle"),
): MigrationOutcome {
  const startedAt = Date.now();
  const before = migrationCount(database);
  migrate(database, { migrationsFolder });
  const appliedMigrations = migrationCount(database) - before;

  /**
   * Statistics, immediately, because an index without them can be worse than
   * no index at all.
   *
   * Adding `price_snapshots (source_id, observed_at)` took the health check
   * from 114ms to 0 and, on the same deploy, took the Bitget dashboard from
   * 144ms to 6,094ms. Without `sqlite_stat1` the planner guesses at
   * selectivity, and it guessed that the new index served
   * `source_id = ? AND asset_id = ? AND quote_asset_id = ? AND observed_at > ?`
   * better than the pair index that actually fits it — a seek became a scan of
   * every Bitget row plus a temp B-tree, once per holding.
   *
   * `ANALYZE` is what tells it otherwise, and it belongs here rather than in a
   * migration file: a deploy that changes the schema, and a database restored
   * without statistics, get them before anything is served.
   *
   * It is not run on every call. The container start runs this once as the
   * deploy gate and the worker runs it again a moment later, and on the
   * production file (about 3 GB) each full `ANALYZE` is a scan of every index:
   * minutes, twice per deploy, for statistics that had not changed in between.
   * Statistics are also refreshed daily by the worker's integrity task, so a
   * call that found the schema current and statistics present only needs
   * `PRAGMA optimize`, which re-analyzes a table only when SQLite decides the
   * existing numbers no longer describe it.
   */
  const client = database.$client;
  const analyzeReason: MigrationOutcome["analyzeReason"] =
    appliedMigrations > 0
      ? "migrations-applied"
      : hasStatistics(database)
        ? undefined
        : "statistics-missing";

  if (analyzeReason) {
    client.exec("ANALYZE");
  } else {
    client.exec("PRAGMA optimize");
  }

  return {
    appliedMigrations,
    statistics: analyzeReason ? "analyze" : "optimize",
    ...(analyzeReason ? { analyzeReason } : {}),
    durationMs: Date.now() - startedAt,
  };
}
