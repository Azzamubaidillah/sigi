import fs from "node:fs";

import DatabaseConstructor from "better-sqlite3";
import type Database from "better-sqlite3";

interface CachedConnection {
  sqlite: Database.Database;
  /** Identity of the file this was opened on, to notice a replacement. */
  dev: number;
  ino: number;
  /** Reads currently running on it; a nested `readDatabase` shares the outer's. */
  depth: number;
  /** Set when a read threw: the connection is closed once it is idle. */
  broken: boolean;
}

/**
 * A handful is enough: production has one database. The bound exists so a test
 * that makes a fresh database per case cannot leak a descriptor per case.
 */
const MAX_CONNECTIONS = 8;

/**
 * Held on `globalThis` so a duplicated module instance (a second server
 * bundle, or a dev-server reload) shares the one connection instead of
 * stacking another beside it.
 */
const cacheKey = Symbol.for("sigi.readDatabase.connections");
const cache: Map<string, CachedConnection> = ((
  globalThis as Record<symbol, unknown>
)[cacheKey] ??= new Map<string, CachedConnection>()) as Map<
  string,
  CachedConnection
>;

function discard(databasePath: string, entry: CachedConnection): void {
  if (cache.get(databasePath) === entry) cache.delete(databasePath);
  try {
    entry.sqlite.close();
  } catch {
    // Already unusable; there is nothing further to release.
  }
}

/**
 * The connection for this path, opened on first use and kept.
 *
 * Absence is never cached: the stat runs on every call, so a database that
 * appears later is picked up, one that vanishes yields null, and one replaced
 * by a restore (a different inode) is reopened rather than read through a
 * descriptor that still points at the old file.
 */
function connectionFor(databasePath: string): CachedConnection | null {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(databasePath);
  } catch {
    const stale = cache.get(databasePath);
    if (stale && stale.depth === 0) discard(databasePath, stale);
    return null;
  }

  const cached = cache.get(databasePath);
  if (cached) {
    // A read in flight owns the connection whatever happened to the file.
    if (cached.depth > 0) return cached;
    if (
      !cached.broken &&
      cached.sqlite.open &&
      cached.dev === stat.dev &&
      cached.ino === stat.ino
    ) {
      return cached;
    }
    discard(databasePath, cached);
  }

  if (cache.size >= MAX_CONNECTIONS) {
    for (const [oldPath, oldEntry] of cache) {
      if (oldEntry.depth === 0) {
        discard(oldPath, oldEntry);
        break;
      }
    }
  }

  const sqlite = new DatabaseConstructor(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  // The worker writes every minute. Without this a reader throws the instant
  // it meets a write lock rather than waiting the moment out.
  sqlite.pragma("busy_timeout = 5000");
  // Reads through a memory map instead of copying each page out of the OS page
  // cache. Measured on a copy of production (2.8 GB) it cut the CPU the
  // dashboard loaders spend by 10-25%; `cache_size` (64-256 MB) did nothing
  // measurable. Safe here because nothing shrinks the live file in place --
  // an mmap'd file truncated under a reader is a SIGBUS. Backups use `VACUUM
  // INTO` and `restoreBackup` refuses an existing destination.
  sqlite.pragma("mmap_size = 1073741824");
  const entry: CachedConnection = {
    sqlite,
    dev: stat.dev,
    ino: stat.ino,
    depth: 0,
    broken: false,
  };
  cache.set(databasePath, entry);
  return entry;
}

/**
 * A read-only connection for one query, shared with the next.
 *
 * Thirteen `load*` functions carried their own copy of this: exists-check,
 * open, pragma, try/finally, close. They had drifted — each set a slightly
 * different subset of pragmas from the one `openDatabase` sets for writers —
 * and nothing would have failed if one had forgotten `busy_timeout` entirely.
 * It would simply have thrown SQLITE_BUSY under a write instead of waiting.
 *
 * The connection is opened once per database file and reused, because one
 * Overview render made about ten of these calls and each used to open, prepare
 * and close its own. The rule that makes reuse safe: `read` must finish every
 * statement it starts. `.all()` and `.get()` do; an `.iterate()` abandoned
 * half-way, or a transaction left open, would pin a read snapshot and stop the
 * worker's WAL checkpoints for as long as the connection lives. No reader does
 * either, and a new one must not. If `read` throws, the connection is dropped
 * and the next call opens a fresh one.
 *
 * Returns null rather than throwing when there is no database yet, because a
 * fresh install genuinely has nothing to read and every caller treats that as
 * "no data" rather than as an error.
 */
export function readDatabase<T>(
  databasePath: string,
  read: (sqlite: Database.Database) => T,
): T | null {
  const entry = connectionFor(databasePath);
  if (!entry) return null;
  entry.depth += 1;
  try {
    return read(entry.sqlite);
  } catch (error) {
    entry.broken = true;
    throw error;
  } finally {
    entry.depth -= 1;
    if (entry.depth === 0 && entry.broken) discard(databasePath, entry);
  }
}

/** Closes every shared connection. For tests and orderly shutdown. */
export function closeReadDatabases(): void {
  for (const [databasePath, entry] of cache) {
    if (entry.depth === 0) discard(databasePath, entry);
  }
}
