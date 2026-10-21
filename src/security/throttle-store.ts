import fs from "node:fs";

import DatabaseConstructor from "better-sqlite3";
import type Database from "better-sqlite3";

import {
  ADDRESS_POLICY,
  clearFailures,
  evaluateThrottle,
  GLOBAL_POLICY,
  OPEN_STATE,
  registerFailure,
  type ThrottlePolicy,
  type ThrottleState,
} from "./throttle";

const GLOBAL_SCOPE = "global";

function addressScope(address: string): string {
  return `address:${address}`;
}

function readState(sqlite: Database.Database, scope: string): ThrottleState {
  const row = sqlite
    .prepare(
      `SELECT failure_count AS failureCount,
        first_failure_at AS firstFailureAt,
        locked_until AS lockedUntil
       FROM login_attempts WHERE scope = ?`,
    )
    .get(scope) as ThrottleState | undefined;
  return row ?? OPEN_STATE;
}

function writeState(
  sqlite: Database.Database,
  scope: string,
  state: ThrottleState,
  now: number,
): void {
  sqlite
    .prepare(
      `INSERT INTO login_attempts
        (scope, failure_count, first_failure_at, locked_until, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (scope) DO UPDATE SET
         failure_count = excluded.failure_count,
         first_failure_at = excluded.first_failure_at,
         locked_until = excluded.locked_until,
         updated_at = excluded.updated_at`,
    )
    .run(
      scope,
      state.failureCount,
      state.firstFailureAt,
      state.lockedUntil,
      now,
    );
}

export interface ThrottleVerdict {
  allowed: boolean;
  /** Seconds to report in Retry-After; zero when allowed. */
  retryAfterSeconds: number;
}

/**
 * Whether this attempt may proceed, checking the address and the global limit.
 *
 * Checked before the passcode is compared, so a locked-out caller learns
 * nothing about whether their guess was right.
 */
export function checkLoginAllowed(
  sqlite: Database.Database,
  address: string,
  now: number,
): ThrottleVerdict {
  const scopes = [addressScope(address), GLOBAL_SCOPE];
  let retryAfterMs = 0;
  for (const scope of scopes) {
    const decision = evaluateThrottle(readState(sqlite, scope), now);
    if (!decision.allowed) {
      retryAfterMs = Math.max(retryAfterMs, decision.retryAfterMs);
    }
  }
  return retryAfterMs > 0
    ? { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1_000) }
    : { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(
  sqlite: Database.Database,
  address: string,
  now: number,
): void {
  const apply = (scope: string, policy: ThrottlePolicy) => {
    writeState(
      sqlite,
      scope,
      registerFailure(readState(sqlite, scope), policy, now),
      now,
    );
  };
  sqlite
    .transaction(() => {
      apply(addressScope(address), ADDRESS_POLICY);
      apply(GLOBAL_SCOPE, GLOBAL_POLICY);
    })
    .immediate();
}

/**
 * Clears this address on success, and the global counter with it.
 *
 * The global row exists to slow an attack spread across addresses. A correct
 * passcode is the strongest possible evidence that what it was counting was
 * not an attack, and leaving it to decay would let one bad evening of typos
 * keep the owner near a global lock they cannot see.
 */
export function recordLoginSuccess(
  sqlite: Database.Database,
  address: string,
  now: number,
): void {
  sqlite
    .transaction(() => {
      writeState(sqlite, addressScope(address), clearFailures(), now);
      writeState(sqlite, GLOBAL_SCOPE, clearFailures(), now);
    })
    .immediate();
}

/**
 * Opens the database for a login attempt, or null when there is none yet.
 *
 * Not through `openDatabase`, and that is forced rather than careless. This
 * runs in the login route, which is compiled into the web bundle, and
 * `openDatabase` imports the Drizzle schema with worker-style `.js` specifiers
 * that Turbopack cannot resolve. Routing it through the shared opener was
 * tried and breaks the build outright.
 *
 * What it does owe the rest of the application is the same pragmas, so they
 * are set here explicitly rather than left to differ:
 *
 *  - `foreign_keys` because every other writable connection enforces them, and
 *    `login_attempts` having none today is not a reason for this connection to
 *    be the one that would not notice if it gained some.
 *  - `busy_timeout` because the worker writes every minute, and a login must
 *    wait for a write lock rather than fail the sign-in attempt outright.
 *
 * WAL and `synchronous` are deliberately absent: the journal mode is a
 * property of the database file and is already set, and the stricter default
 * `synchronous` is the safer side for the handful of writes a login makes.
 */
export function openThrottleDatabase(
  databasePath: string,
): Database.Database | null {
  if (!fs.existsSync(databasePath)) return null;
  const sqlite = new DatabaseConstructor(databasePath, { fileMustExist: true });
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return sqlite;
}

/**
 * The caller's address, as far as it can be trusted.
 *
 * `X-Forwarded-For` is attacker-controlled: anyone can send one, and believing
 * it unconditionally would let a single client mint a fresh rate-limit bucket
 * per request simply by varying the header. It is read only when the owner has
 * declared that a reverse proxy sits in front, and then only the rightmost
 * entry -- the one that proxy appended itself. Entries to the left of it may
 * have been supplied by the client.
 *
 * With no trusted proxy every caller shares one bucket. That is coarse, and
 * deliberately so: it throttles rather than fails open.
 */
export function clientAddress(
  forwardedFor: string | null,
  trustProxy: boolean,
): string {
  if (!trustProxy) return "direct";
  const entries = (forwardedFor ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.at(-1) ?? "unknown";
}
