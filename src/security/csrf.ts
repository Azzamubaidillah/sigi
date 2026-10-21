import { randomBytes, timingSafeEqual } from "node:crypto";

export const csrfCookieName = "sigi_csrf";
export const csrfHeaderName = "x-csrf-token";

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function csrfTokensMatch(
  cookieToken: string | undefined,
  headerToken: string | null,
): boolean {
  if (!cookieToken || !headerToken) return false;
  const cookie = Buffer.from(cookieToken);
  const header = Buffer.from(headerToken);
  return cookie.length === header.length && timingSafeEqual(cookie, header);
}
