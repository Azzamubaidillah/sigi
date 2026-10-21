import { NextRequest, NextResponse } from "next/server";

import { loadConfig } from "@/src/config";
import {
  csrfCookieName,
  csrfHeaderName,
  csrfTokensMatch,
} from "@/src/security/csrf";
import { sessionCookieName } from "@/src/security/session";

export async function POST(request: NextRequest) {
  if (
    !csrfTokensMatch(
      request.cookies.get(csrfCookieName)?.value,
      request.headers.get(csrfHeaderName),
    )
  ) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "strict",
    // Must match the attributes the cookie was set with. A browser treats a
    // Secure and a non-Secure cookie of the same name as different cookies,
    // so clearing with the wrong flag can leave the session cookie in place.
    secure: loadConfig().secureCookies,
    path: "/",
    maxAge: 0,
  });
  return response;
}
