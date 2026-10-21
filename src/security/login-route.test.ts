import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { openDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import { hashPasscode } from "./passcode";
import { POST } from "../../app/api/auth/login/route";

/**
 * The login route, which had no test of its own.
 *
 * It is the only door into the application and the only place the passcode is
 * checked, so what matters here is not that a correct passcode works — it is
 * what happens on the paths nobody exercises by hand: a request with no CSRF
 * token, a limiter that cannot be opened, and the sixth wrong guess.
 */

const directories: string[] = [];
const PASSCODE = "correct-horse-battery";
const CSRF = "csrf-token-value";

let previousEnvironment: NodeJS.ProcessEnv;

beforeEach(() => {
  previousEnvironment = { ...process.env };
});

afterEach(() => {
  process.env = previousEnvironment;
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** A data directory, with a migrated database in it unless asked otherwise. */
function makeDataDirectory(options: { withDatabase: boolean }): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-login-"));
  directories.push(directory);
  const dataDirectory = path.join(directory, "data");
  fs.mkdirSync(dataDirectory, { recursive: true });
  if (options.withDatabase) {
    const connection = openDatabase(path.join(dataDirectory, "sigi.db"));
    migrateDatabase(connection.db);
    connection.sqlite.close();
  }
  return dataDirectory;
}

async function configure(options: { withDatabase: boolean }): Promise<void> {
  process.env.SIGI_DATA_DIR = makeDataDirectory(options);
  process.env.SIGI_PASSCODE_HASH = await hashPasscode(PASSCODE);
  process.env.SIGI_SESSION_SECRET = "s".repeat(48);
  delete process.env.SIGI_PUBLIC_ORIGIN;
  delete process.env.SIGI_TRUST_PROXY_HEADERS;
}

function login(body: unknown, options: { csrf: boolean } = { csrf: true }) {
  return POST(
    new NextRequest("http://127.0.0.1:3210/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      headers: options.csrf
        ? {
            "content-type": "application/json",
            cookie: `sigi_csrf=${CSRF}`,
            "x-csrf-token": CSRF,
          }
        : { "content-type": "application/json" },
    }),
  );
}

describe("login route", () => {
  it("refuses a request without a CSRF token", async () => {
    await configure({ withDatabase: true });

    const response = await login({ passcode: PASSCODE }, { csrf: false });

    expect(response.status).toBe(403);
    expect(response.cookies.get("sigi_session")).toBeUndefined();
  });

  it("opens a session for the right passcode", async () => {
    await configure({ withDatabase: true });

    const response = await login({ passcode: PASSCODE });

    expect(response.status).toBe(200);
    const cookie = response.cookies.get("sigi_session");
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("strict");
    // No Max-Age unless the browser was to be remembered, so the session ends
    // with the browser as well as at the token's own expiry.
    expect(cookie?.maxAge).toBeUndefined();
  });

  it("refuses the right passcode when the limiter cannot be opened", async () => {
    // The limiter lives in the database file. When it is absent the route used
    // to carry on without one — every check was written `if (throttle)` — so
    // the form accepted unlimited guesses. The correct passcode is used here
    // deliberately: the point is that the route stops before comparing it, so
    // there is no reply that distinguishes a right guess from a wrong one.
    await configure({ withDatabase: false });

    const response = await login({ passcode: PASSCODE });

    expect(response.status).toBe(503);
    expect(response.cookies.get("sigi_session")).toBeUndefined();
  });

  it("locks out once the wrong passcode passes the limit", async () => {
    await configure({ withDatabase: true });

    // Five failures are free; the sixth is what sets the lock, so it is still
    // answered 401 and the seventh attempt is the one refused.
    for (let attempt = 1; attempt <= 6; attempt++) {
      const response = await login({ passcode: "wrong-passcode" });
      expect(response.status).toBe(401);
    }

    const locked = await login({ passcode: "wrong-passcode" });
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("Retry-After"))).toBeGreaterThan(0);

    // And the lockout is not a filter on wrong guesses only: the right
    // passcode is refused too, or the reply would say which one was right.
    const correct = await login({ passcode: PASSCODE });
    expect(correct.status).toBe(429);
    expect(correct.cookies.get("sigi_session")).toBeUndefined();
  });

  it("forgets earlier failures once a login succeeds", async () => {
    await configure({ withDatabase: true });

    for (let attempt = 1; attempt <= 4; attempt++) {
      expect((await login({ passcode: "wrong-passcode" })).status).toBe(401);
    }
    expect((await login({ passcode: PASSCODE })).status).toBe(200);

    // Without the reset, four more would trip a limit the owner had already
    // cleared by proving who they are.
    for (let attempt = 1; attempt <= 4; attempt++) {
      expect((await login({ passcode: "wrong-passcode" })).status).toBe(401);
    }
  });
});
