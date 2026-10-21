import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

export interface OpenDatabaseOptions {
  readonly?: boolean;
  fileMustExist?: boolean;
}

export type SigiDatabase = BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};

export interface OpenedDatabase {
  sqlite: Database.Database;
  db: SigiDatabase;
}

export function openDatabase(
  databasePath: string,
  options: OpenDatabaseOptions = {},
): OpenedDatabase {
  if (!options.readonly) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
  }

  const sqlite = new Database(databasePath, {
    readonly: options.readonly ?? false,
    fileMustExist: options.fileMustExist ?? false,
  });
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  if (!options.readonly) {
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
  }

  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
  };
}
