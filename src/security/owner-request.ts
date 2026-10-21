import type { NextRequest } from "next/server";

import type { SigiConfig } from "../config";
import { csrfCookieName, csrfHeaderName, csrfTokensMatch } from "./csrf";
import { sessionCookieName, verifySessionToken } from "./session";

/**
 * The check every state-changing admin handler makes before doing anything:
 * a valid owner session and a matching CSRF pair. The proxy gates these paths
 * too; this is the handler's own boundary, so a matcher mistake in the proxy
 * cannot open them.
 */
export async function rejectUnlessOwner(
  request: NextRequest,
  config: Pick<SigiConfig, "sessionSecret">,
): Promise<{ status: 401 | 403; error: string } | null> {
  const session = await verifySessionToken(
    request.cookies.get(sessionCookieName)?.value,
    config.sessionSecret,
  );
  if (!session) return { status: 401, error: "Sign in first" };
  if (
    !csrfTokensMatch(
      request.cookies.get(csrfCookieName)?.value,
      request.headers.get(csrfHeaderName),
    )
  ) {
    return { status: 403, error: "Invalid CSRF token" };
  }
  return null;
}
