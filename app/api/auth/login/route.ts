import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { loadConfig } from "@/src/config";
import {
  csrfCookieName,
  csrfHeaderName,
  csrfTokensMatch,
} from "@/src/security/csrf";
import { verifyPasscode } from "@/src/security/passcode";
import { createSessionToken, sessionCookieName } from "@/src/security/session";
import {
  checkLoginAllowed,
  clientAddress,
  openThrottleDatabase,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/src/security/throttle-store";

const bodySchema = z.object({
  passcode: z.string().min(1).max(1024),
  rememberBrowser: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  if (
    !csrfTokensMatch(
      request.cookies.get(csrfCookieName)?.value,
      request.headers.get(csrfHeaderName),
    )
  ) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const config = loadConfig();
  if (!config.passcodeHash || !config.sessionSecret) {
    return NextResponse.json(
      { error: "Local passcode is not configured" },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid login request" },
      { status: 400 },
    );
  }

  const now = Date.now();
  const address = clientAddress(
    request.headers.get("x-forwarded-for"),
    config.trustProxyHeaders,
  );
  const throttle = openThrottleDatabase(config.databasePath);
  if (!throttle) {
    // No store, no attempt. `openThrottleDatabase` returns null when the
    // database file is absent, and this used to carry on without a limiter —
    // every check was written `if (throttle)`, so a missing file turned the
    // login form into unmetered guessing. Rate limiting is the only thing
    // between a public form and an offline-speed search: scrypt makes a guess
    // cost about a tenth of a second, which is slow for one attempt and no
    // obstacle at all to days of them.
    //
    // Refusing costs nothing real. Without that file there is no ledger to
    // read, so a session would open onto an empty application; the import
    // routes already answer 503 for the same reason.
    return NextResponse.json(
      { error: "Sigi database is not ready" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    // Checked before the passcode is compared, so a locked-out caller cannot
    // tell a correct guess from an incorrect one by the reply they get.
    const verdict = checkLoginAllowed(throttle, address, now);
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(verdict.retryAfterSeconds),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (!(await verifyPasscode(parsed.data.passcode, config.passcodeHash))) {
      recordLoginFailure(throttle, address, now);
      return NextResponse.json(
        { error: "Passcode is incorrect" },
        { status: 401 },
      );
    }

    recordLoginSuccess(throttle, address, now);
  } finally {
    throttle.close();
  }

  const session = await createSessionToken(
    config.sessionSecret,
    parsed.data.rememberBrowser,
    config.sessionLifetime,
  );
  const response = NextResponse.json({ authenticated: true });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(sessionCookieName, session.token, {
    httpOnly: true,
    sameSite: "strict",
    // True whenever the configured origin is https. Hard-coding false was safe
    // only while the sole origin was loopback; over a public origin it would
    // let the session cookie ride a downgraded request in clear text.
    secure: config.secureCookies,
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
