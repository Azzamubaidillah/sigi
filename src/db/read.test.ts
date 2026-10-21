import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { closeReadDatabases, readDatabase } from "./read";

const directories: string[] = [];

afterEach(() => {
  closeReadDatabases();
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function makeDatabase(directory: string, value: number): string {
  const databasePath = path.join(directory, "sigi.db");
  const writer = new Database(databasePath);
  writer.pragma("journal_mode = WAL");
  writer.exec("CREATE TABLE t (n INTEGER)");
  writer.prepare("INSERT INTO t VALUES (?)").run(value);
  writer.close();
  return databasePath;
}

function scratch(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-read-"));
  directories.push(directory);
  return directory;
}

const count = (sqlite: Database.Database) =>
  sqlite.prepare("SELECT count(*) FROM t").pluck().get() as number;

describe("readDatabase", () => {
  it("returns null without a database, and finds it once it exists", () => {
    const directory = scratch();
    const databasePath = path.join(directory, "sigi.db");
    expect(readDatabase(databasePath, count)).toBeNull();

    makeDatabase(directory, 1);
    expect(readDatabase(databasePath, count)).toBe(1);

    fs.rmSync(databasePath);
    expect(readDatabase(databasePath, count)).toBeNull();
  });

  it("sees what the worker commits between calls, and does not block its checkpoint", () => {
    const directory = scratch();
    const databasePath = makeDatabase(directory, 1);
    expect(readDatabase(databasePath, count)).toBe(1);

    const writer = new Database(databasePath);
    writer.pragma("journal_mode = WAL");
    writer.prepare("INSERT INTO t VALUES (2)").run();
    // A reader holding a snapshot open would leave WAL frames it still needs,
    // and the checkpoint could not truncate the log.
    const [checkpoint] = writer.pragma("wal_checkpoint(TRUNCATE)") as Array<{
      busy: number;
    }>;
    writer.close();

    expect(checkpoint.busy).toBe(0);
    expect(readDatabase(databasePath, count)).toBe(2);
  });

  it("reads the replacement when the file is swapped underneath it", () => {
    const directory = scratch();
    const databasePath = makeDatabase(directory, 1);
    expect(readDatabase(databasePath, count)).toBe(1);

    // A restore replaces the file: same path, different inode.
    fs.rmSync(databasePath);
    fs.rmSync(`${databasePath}-wal`, { force: true });
    fs.rmSync(`${databasePath}-shm`, { force: true });
    const replacement = makeDatabase(scratch(), 7);
    fs.copyFileSync(replacement, databasePath);
    const writer = new Database(databasePath);
    writer.prepare("INSERT INTO t VALUES (8)").run();
    writer.close();

    expect(readDatabase(databasePath, count)).toBe(2);
  });

  it("recovers on the next call after a read throws", () => {
    const directory = scratch();
    const databasePath = makeDatabase(directory, 1);

    expect(() =>
      readDatabase(databasePath, (sqlite) =>
        sqlite.prepare("SELECT * FROM nope"),
      ),
    ).toThrow(/no such table/);
    expect(readDatabase(databasePath, count)).toBe(1);
  });

  it("lets a read call another loader on the same database", () => {
    const directory = scratch();
    const databasePath = makeDatabase(directory, 1);

    const result = readDatabase(databasePath, (outer) => {
      expect(() =>
        readDatabase(databasePath, (inner) =>
          inner.prepare("SELECT * FROM nope"),
        ),
      ).toThrow(/no such table/);
      // The inner failure must not close the connection the outer is using.
      return count(outer);
    });
    expect(result).toBe(1);
  });

  it("cannot write", () => {
    const directory = scratch();
    const databasePath = makeDatabase(directory, 1);
    expect(() =>
      readDatabase(databasePath, (sqlite) =>
        sqlite.prepare("INSERT INTO t VALUES (9)").run(),
      ),
    ).toThrow(/readonly/i);
  });
});
