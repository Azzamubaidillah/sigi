import { jwtVerify, SignJWT } from "jose";

export const sessionCookieName = "sigi_session";
const issuer = "sigi-owner";
const audience = "sigi-web";

export interface SessionLifetime {
  /** Seconds a plain session survives. */
  sessionSeconds: number;
  /** Seconds a "remember this browser" session survives. */
  rememberedSeconds: number;
}

/**
 * Sized for a login page anyone can reach, not a laptop on a desk.
 *
 * These were twelve hours and thirty days, which was reasonable while the only
 * way to the form was to be at the machine. A session cookie is a bearer
 * token: whoever holds it is the owner until it expires, and nothing here can
 * revoke one early — the token is self-contained, so the only way to cut a
 * live session short is to rotate SIGI_SESSION_SECRET, which signs
 * everyone out everywhere. Shortening the window is therefore the whole of the
 * containment story, which argues for hours rather than days.
 *
 * Two hours covers a sitting. Seven days covers "don't ask me every time I
 * open my phone" while still expiring inside the time it would take to notice
 * a laptop had gone missing.
 */
export const DEFAULT_SESSION_LIFETIME: SessionLifetime = {
  sessionSeconds: 2 * 60 * 60,
  rememberedSeconds: 7 * 24 * 60 * 60,
};

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  secret: string,
  rememberBrowser: boolean,
  lifetime: SessionLifetime = DEFAULT_SESSION_LIFETIME,
): Promise<{ token: string; maxAge?: number }> {
  const seconds = rememberBrowser
    ? lifetime.rememberedSeconds
    : lifetime.sessionSeconds;
  // A remembered session gets a cookie Max-Age so it outlives the browser
  // being closed. A plain one deliberately does not: it should also end when
  // the browser does, so the token's own expiry is the outer bound, not the
  // only one.
  const maxAge = rememberBrowser ? seconds : undefined;
  const token = await new SignJWT({ scope: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("local-owner")
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(secretKey(secret));

  return { token, maxAge };
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!token || !secret) return false;

  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      issuer,
      audience,
      subject: "local-owner",
    });
    return payload.scope === "owner";
  } catch {
    return false;
  }
}
