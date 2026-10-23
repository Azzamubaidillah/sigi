import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { loadConfig } from "@/src/config";
import { validateRequestBoundary } from "@/src/security/request";

function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // No 'strict-dynamic': it makes the browser ignore 'self', and Next
    // emits some chunk scripts without the nonce (Sunrise D-177).
    // TradingView's embed loader (DATA-SOURCES S3); its widgets render in
    // frames from TradingView's own hosts.
    `script-src 'self' 'nonce-${nonce}' https://s3.tradingview.com`,
    "frame-src https://www.tradingview-widget.com https://s.tradingview.com https://www.tradingview.com",
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
 * The site is read-only and has no accounts: every page is public, and only
 * GET and HEAD are served. The host boundary still applies, so the app
 * answers only under its configured origin.
 */
export async function proxy(request: NextRequest) {
  const config = loadConfig();
  const nonce = randomUUID().replaceAll("-", "");
  if (request.method !== "GET" && request.method !== "HEAD") {
    return securityHeaders(
      NextResponse.json(
        { error: "Read-only" },
        { status: 405, headers: { Allow: "GET, HEAD" } },
      ),
      nonce,
    );
  }
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
