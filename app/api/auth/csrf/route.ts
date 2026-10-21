import { NextResponse } from "next/server";

import { loadConfig } from "@/src/config";
import { createCsrfToken, csrfCookieName } from "@/src/security/csrf";

export const dynamic = "force-dynamic";

export function GET() {
  const csrfToken = createCsrfToken();
  const response = NextResponse.json({ csrfToken });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(csrfCookieName, csrfToken, {
    // Readable by the client script on purpose: this is the double-submit
    // half of the CSRF pair, and the header it is echoed into is what proves
    // same-origin. Only the session cookie must stay httpOnly.
    httpOnly: false,
    sameSite: "strict",
    // Follows the configured origin for the same reason the session cookie
    // does: over a public origin a non-secure cookie can ride a downgraded
    // request in clear text.
    secure: loadConfig().secureCookies,
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
