import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import {
  ADDRESS_POLICY,
  evaluateThrottle,
  OPEN_STATE,
  registerFailure,
  type ThrottleState,
} from "./throttle";
import {
  checkLoginAllowed,
  clientAddress,
  openThrottleDatabase,
  recordLoginFailure,
  recordLoginSuccess,
} from "./throttle-store";

const directories: string[] = [];
const now = 1_789_700_000_000;

afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function makeDatabase() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-throttle-"));
  directories.push(directory);
  const databasePath = path.join(directory, "sigi.db");
  const connection = openDatabase(databasePath);
  migrateDatabase(connection.db);
  return { ...connection, databasePath };
}

/**
 * Applies `count` failures at one instant.
 *
 * The same moment for each, so a lock's duration can be asserted against `now`
 * directly rather than against whichever tick happened to cross the limit.
 */
function failTimes(count: number, from: ThrottleState = OPEN_STATE) {
  let state = from;
  for (let index = 0; index < count; index += 1) {
    state = registerFailure(state, ADDRESS_POLICY, now);
  }
  return state;
}

describe("login throttle policy", () => {
  it("allows the attempts inside the limit without locking", () => {
    const state = failTimes(ADDRESS_POLICY.failureLimit);

    expect(state.lockedUntil).toBeNull();
    expect(evaluateThrottle(state, now).allowed).toBe(true);
  });

  it("locks once the limit is passed", () => {
    const state = failTimes(ADDRESS_POLICY.failureLimit + 1);

    expect(state.lockedUntil).not.toBeNull();
    const decision = evaluateThrottle(state, now);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBeGreaterThan(0);
  });

  it("doubles each further lock rather than charging a flat penalty", () => {
    // A fixed penalty is a cost an attacker can budget for. Doubling reaches
    // hours within a dozen attempts while costing a typo about a minute.
    const first = failTimes(ADDRESS_POLICY.failureLimit + 1);
    const second = registerFailure(first, ADDRESS_POLICY, now);
    const third = registerFailure(second, ADDRESS_POLICY, now);

    expect(first.lockedUntil! - now).toBe(ADDRESS_POLICY.baseLockMs);
    expect(second.lockedUntil! - now).toBe(ADDRESS_POLICY.baseLockMs * 2);
    expect(third.lockedUntil! - now).toBe(ADDRESS_POLICY.baseLockMs * 4);
  });

  it("never exceeds the ceiling", () => {
    let state = failTimes(ADDRESS_POLICY.failureLimit + 1);
    for (let index = 0; index < 60; index += 1) {
      state = registerFailure(state, ADDRESS_POLICY, now);
    }

    expect(state.lockedUntil! - now).toBe(ADDRESS_POLICY.maximumLockMs);
  });

  it("forgets failures once the window has passed", () => {
    // A typo last week must not count toward a lock today.
    const stale = failTimes(ADDRESS_POLICY.failureLimit);
    const later = registerFailure(
      stale,
      ADDRESS_POLICY,
      now + ADDRESS_POLICY.windowMs + 1,
    );

    expect(later.failureCount).toBe(1);
    expect(later.lockedUntil).toBeNull();
  });

  it("keeps escalating for a caller who retries the moment each lock lifts", () => {
    // Every other test in this file fires its failures at one instant, which is
    // why this was invisible: only a lock makes time pass. The locks spend
    // window time — 60 + 120 + 240 + 480 seconds is the whole fifteen-minute
    // window — so measured from the first failure the window had always
    // elapsed by the ninth, and the tenth started again at a count of 1.
    let state = failTimes(ADDRESS_POLICY.failureLimit + 1);
    let at = now;
    const locks: number[] = [state.lockedUntil! - at];

    for (let index = 0; index < 20; index += 1) {
      at = state.lockedUntil!; // wait exactly as long as Retry-After said
      state = registerFailure(state, ADDRESS_POLICY, at);
      locks.push(state.lockedUntil! - at);
    }

    // Never back to square one, and the ceiling is actually reached.
    expect(state.failureCount).toBe(ADDRESS_POLICY.failureLimit + 21);
    expect(locks.at(-1)).toBe(ADDRESS_POLICY.maximumLockMs);
    expect(Math.min(...locks)).toBe(ADDRESS_POLICY.baseLockMs);
    // Monotonic: each lock is at least as long as the one before it.
    for (let index = 1; index < locks.length; index += 1) {
      expect(locks[index]).toBeGreaterThanOrEqual(locks[index - 1]!);
    }
  });

  it("still forgives a caller who goes quiet for the window after a lock", () => {
    // The owner's case. Escalation must not mean a typo is remembered for ever
    // — the window runs from the end of the lock, so quiet still clears it.
    const locked = failTimes(ADDRESS_POLICY.failureLimit + 1);
    const later = registerFailure(
      locked,
      ADDRESS_POLICY,
      locked.lockedUntil! + ADDRESS_POLICY.windowMs + 1,
    );

    expect(later.failureCount).toBe(1);
    expect(later.lockedUntil).toBeNull();
  });

  it("does not forgive while the lock is still running", () => {
    // A lock longer than the window would otherwise expire the count it was
    // imposed for, which is the same defect seen from the other side.
    const locked = failTimes(ADDRESS_POLICY.failureLimit + 12);
    expect(locked.lockedUntil! - now).toBeGreaterThan(ADDRESS_POLICY.windowMs);

    const during = registerFailure(
      locked,
      ADDRESS_POLICY,
      now + ADDRESS_POLICY.windowMs + 1,
    );

    expect(during.failureCount).toBe(ADDRESS_POLICY.failureLimit + 13);
  });

  it("opens again once the lock expires", () => {
    const locked = failTimes(ADDRESS_POLICY.failureLimit + 1);

    expect(evaluateThrottle(locked, locked.lockedUntil! + 1).allowed).toBe(
      true,
    );
  });
});

describe("login throttle storage", () => {
  it("survives a restart, because the counters are not in memory", () => {
    const { sqlite, databasePath } = makeDatabase();
    for (let index = 0; index <= ADDRESS_POLICY.failureLimit; index += 1) {
      recordLoginFailure(sqlite, "203.0.113.7", now);
    }
    expect(checkLoginAllowed(sqlite, "203.0.113.7", now).allowed).toBe(false);
    sqlite.close();

    // Re-opening the same file stands in for the process restarting. An
    // in-memory counter would hand an attacker a reset via anything that exits
    // the process, so the lock has to still be there on the way back up.
    const reopened = openThrottleDatabase(databasePath)!;
    expect(checkLoginAllowed(reopened, "203.0.113.7", now).allowed).toBe(false);
    reopened.close();
  });

  it("locks one address without locking another", () => {
    const { sqlite } = makeDatabase();
    for (let index = 0; index <= ADDRESS_POLICY.failureLimit; index += 1) {
      recordLoginFailure(sqlite, "203.0.113.7", now + index);
    }

    expect(checkLoginAllowed(sqlite, "203.0.113.7", now).allowed).toBe(false);
    expect(checkLoginAllowed(sqlite, "198.51.100.4", now).allowed).toBe(true);
    sqlite.close();
  });

  it("clears the record when the passcode is finally right", () => {
    const { sqlite } = makeDatabase();
    recordLoginFailure(sqlite, "203.0.113.7", now);
    recordLoginFailure(sqlite, "203.0.113.7", now + 1);

    recordLoginSuccess(sqlite, "203.0.113.7", now + 2);

    for (let index = 0; index < ADDRESS_POLICY.failureLimit; index += 1) {
      recordLoginFailure(sqlite, "203.0.113.7", now + 10 + index);
    }
    // Still open: the earlier two were forgotten, so these are the first five
    // rather than the sixth through tenth.
    expect(checkLoginAllowed(sqlite, "203.0.113.7", now + 20).allowed).toBe(
      true,
    );
    sqlite.close();
  });

  it("reports how long to wait", () => {
    const { sqlite } = makeDatabase();
    for (let index = 0; index <= ADDRESS_POLICY.failureLimit; index += 1) {
      recordLoginFailure(sqlite, "203.0.113.7", now);
    }

    const verdict = checkLoginAllowed(sqlite, "203.0.113.7", now);
    expect(verdict.retryAfterSeconds).toBeGreaterThan(0);
    expect(verdict.retryAfterSeconds).toBeLessThanOrEqual(
      ADDRESS_POLICY.baseLockMs / 1_000,
    );
    sqlite.close();
  });

  it("still throttles an attack spread across many addresses", () => {
    const { sqlite } = makeDatabase();
    // Each address stays under its own limit, so only the global ceiling can
    // catch this. Without it, a botnet bypasses the per-address limit entirely.
    for (let index = 0; index < 60; index += 1) {
      recordLoginFailure(sqlite, `198.51.100.${index}`, now + index);
    }

    expect(checkLoginAllowed(sqlite, "203.0.113.200", now + 100).allowed).toBe(
      false,
    );
    sqlite.close();
  });
});

describe("client address", () => {
  it("ignores X-Forwarded-For unless a proxy is trusted", () => {
    // Anyone can send this header. Believing it would let one client mint a
    // fresh rate-limit bucket per request by varying it.
    expect(clientAddress("203.0.113.7", false)).toBe("direct");
    expect(clientAddress("1.1.1.1, 2.2.2.2", false)).toBe("direct");
  });

  it("takes the entry the trusted proxy appended, not one the client supplied", () => {
    // The client can prepend anything; the rightmost entry is the peer address
    // the proxy itself observed.
    expect(clientAddress("evil-spoof, 203.0.113.7", true)).toBe("203.0.113.7");
  });

  it("falls back to one shared bucket rather than failing open", () => {
    expect(clientAddress(null, true)).toBe("unknown");
    expect(clientAddress("", true)).toBe("unknown");
  });
});
