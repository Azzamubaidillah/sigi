import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "./client";
import { migrateDatabase } from "./migrate";

/**
 * Migrations, and the one property the deploy depends on: the container
 * start runs `scripts/migrate.ts` before the web process and stops if it
 * fails. That is only worth anything if a failed migration actually fails.
 */

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function makeDatabase() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-migrate-"));
  directories.push(directory);
  return openDatabase(path.join(directory, "sigi.db"));
}

describe("migrations", () => {
  it("brings an empty database up to the current schema", () => {
    const { sqlite, db } = makeDatabase();

    migrateDatabase(db);

    const tables = sqlite
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table'
           AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .pluck()
      .all() as string[];

    // The tables published data lives in, rather than a count that changes
    // with every migration.
    for (const table of [
      "source_files",
      "import_runs",
      "gate_results",
      "ownership_months",
      "ownership_holdings",
      "publish_audit",
    ]) {
      expect(tables).toContain(table);
    }
    sqlite.close();
  });

  it("applies every migration file, and records each one", () => {
    const { sqlite, db } = makeDatabase();

    migrateDatabase(db);

    const applied = sqlite
      .prepare("SELECT count(*) FROM __drizzle_migrations")
      .pluck()
      .get() as number;
    const files = fs
      .readdirSync(path.resolve(process.cwd(), "drizzle"))
      .filter((file) => file.endsWith(".sql")).length;

    // A migration present on disk but unapplied is how a deploy ends up
    // serving new code against an old schema.
    expect(applied).toBe(files);
    sqlite.close();
  });

  it("is safe to run twice", () => {
    const { sqlite, db } = makeDatabase();

    migrateDatabase(db);
    const first = sqlite
      .prepare("SELECT count(*) FROM __drizzle_migrations")
      .pluck()
      .get();
    migrateDatabase(db);

    expect(
      sqlite.prepare("SELECT count(*) FROM __drizzle_migrations").pluck().get(),
    ).toBe(first);
    sqlite.close();
  });

  it("reports what it did about statistics, and analyzes only when it must", () => {
    const { sqlite, db } = makeDatabase();

    // Applied migrations change the schema the statistics describe.
    const fresh = migrateDatabase(db);
    expect(fresh.appliedMigrations).toBeGreaterThan(0);
    expect(fresh.statistics).toBe("analyze");
    expect(fresh.analyzeReason).toBe("migrations-applied");

    // Nothing to apply, but `sqlite_stat1` has no rows: nothing for the
    // planner to go on.
    sqlite.exec("DELETE FROM sqlite_stat1");
    const empty = migrateDatabase(db);
    expect(empty.appliedMigrations).toBe(0);
    expect(empty.statistics).toBe("analyze");
    expect(empty.analyzeReason).toBe("statistics-missing");

    // A restored database with no statistics table at all.
    sqlite.exec("DROP TABLE sqlite_stat1");
    const restored = migrateDatabase(db);
    expect(restored.statistics).toBe("analyze");
    expect(restored.analyzeReason).toBe("statistics-missing");
    expect(
      sqlite
        .prepare(
          "SELECT count(*) FROM sqlite_master WHERE name = 'sqlite_stat1'",
        )
        .pluck()
        .get(),
    ).toBe(1);

    // Current schema, statistics present: only `PRAGMA optimize`, which
    // leaves existing statistics alone rather than rescanning every table.
    sqlite.exec(
      `CREATE TABLE stat_probe (a INTEGER);
       CREATE INDEX stat_probe_a ON stat_probe (a);
       INSERT INTO stat_probe VALUES (1), (2), (3);
       ANALYZE`,
    );
    const before = sqlite
      .prepare("SELECT tbl, idx, stat FROM sqlite_stat1 ORDER BY tbl, idx")
      .all();
    expect(before.length).toBeGreaterThan(0);
    const current = migrateDatabase(db);
    expect(current.appliedMigrations).toBe(0);
    expect(current.statistics).toBe("optimize");
    expect(current.analyzeReason).toBeUndefined();
    expect(
      sqlite
        .prepare("SELECT tbl, idx, stat FROM sqlite_stat1 ORDER BY tbl, idx")
        .all(),
    ).toEqual(before);
    sqlite.close();
  });

  it("throws rather than reporting success when the migrations are missing", () => {
    // This is what the deploy gate rests on. Drizzle resolves the folder from
    // the working directory, so a runner started from the wrong place finds
    // nothing — and silently "succeeding" there would be the worst outcome of
    // the three, since the database would stay behind while the deploy said it
    // had moved.
    const { sqlite, db } = makeDatabase();

    expect(() =>
      migrateDatabase(db, path.join(os.tmpdir(), "sigi-no-such-folder")),
    ).toThrow();

    expect(
      sqlite
        .prepare(
          `SELECT count(*) FROM sqlite_master WHERE type = 'table'
             AND name = 'ownership_holdings'`,
        )
        .pluck()
        .get(),
    ).toBe(0);
    sqlite.close();
  });
});
