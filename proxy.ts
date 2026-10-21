import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { loadConfig } from "@/src/config";
import { requiresSession } from "@/src/security/admin-paths";
import { validateRequestBoundary } from "@/src/security/request";
import { sessionCookieName, verifySessionToken } from "@/src/security/session";

function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // No 'strict-dynamic': it makes the browser ignore 'self', and Next
    // emits some chunk scripts without the nonce (Sunrise D-177).
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function securityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

/**
 * Every page is public except the owner's admin area. The host and origin
 * boundary applies to all requests; the session gate only to `/admin` and
 * `/api/admin`, whose handlers check the session again themselves.
 */
export async function proxy(request: NextRequest) {
  const config = loadConfig();
  const pathname = request.nextUrl.pathname;
  const nonce = randomUUID().replaceAll("-", "");
  const boundary = validateRequestBoundary(
    {
      method: request.method,
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
    },
    config.expectedHost,
    config.origin,
  );
  if (!boundary.accepted) {
    return securityHeaders(
      NextResponse.json(
        { error: `Rejected ${boundary.reason}` },
        { status: boundary.status },
      ),
      nonce,
    );
  }

  const gated = requiresSession(pathname);
  if (gated || pathname === "/login") {
    const authenticated = await verifySessionToken(
      request.cookies.get(sessionCookieName)?.value,
      config.sessionSecret,
    );
    if (gated && !authenticated) {
      return securityHeaders(
        pathname.startsWith("/api/")
          ? NextResponse.json({ error: "Sign in first" }, { status: 401 })
          : NextResponse.redirect(new URL("/login", config.origin)),
        nonce,
      );
    }
    if (pathname === "/login" && authenticated) {
      return securityHeaders(
        NextResponse.redirect(new URL("/admin", config.origin)),
        nonce,
      );
    }
  }

  // Next reads the nonce from the request's CSP header and puts it on its own
  // inline scripts. Without it they are refused, the RSC payload never
  // arrives, and the page never hydrates: forms then submit natively.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  return securityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
