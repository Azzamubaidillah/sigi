import { describe, expect, it } from "vitest";

import { decodeJwt } from "jose";

import {
  createSessionToken,
  DEFAULT_SESSION_LIFETIME,
  verifySessionToken,
} from "./session";

describe("local sessions", () => {
  const secret = "a-local-session-secret-that-is-long-enough";

  it("signs session and remembered-browser tokens", async () => {
    const session = await createSessionToken(secret, false);
    const remembered = await createSessionToken(secret, true);

    // A plain session gets no Max-Age on purpose, so it also ends when the
    // browser does; the token's own expiry is the outer bound, not the only.
    expect(session.maxAge).toBeUndefined();
    expect(remembered.maxAge).toBe(DEFAULT_SESSION_LIFETIME.rememberedSeconds);
    await expect(verifySessionToken(session.token, secret)).resolves.toBe(true);
  });

  it("expires in hours, not half a day, now the login page is public", () => {
    // These were 12h and 30d, sized for a form only reachable at the machine.
    // A session cookie is a bearer token that cannot be revoked once issued,
    // so its lifetime is the whole of the containment story.
    expect(DEFAULT_SESSION_LIFETIME.sessionSeconds).toBe(2 * 60 * 60);
    expect(DEFAULT_SESSION_LIFETIME.rememberedSeconds).toBe(7 * 24 * 60 * 60);
  });

  it("stamps the token's own expiry, not only the cookie's", async () => {
    // The cookie is client-side and trivially edited; the signed expiry is
    // what actually ends the session, so it has to carry the same window.
    const before = Math.floor(Date.now() / 1000);
    const remembered = await createSessionToken(secret, true);

    const { exp } = decodeJwt(remembered.token);
    expect(exp).toBeGreaterThanOrEqual(
      before + DEFAULT_SESSION_LIFETIME.rememberedSeconds,
    );
    expect(exp).toBeLessThanOrEqual(
      before + DEFAULT_SESSION_LIFETIME.rememberedSeconds + 5,
    );
  });

  it("honours a configured lifetime", async () => {
    const short = await createSessionToken(secret, false, {
      sessionSeconds: 900,
      rememberedSeconds: 86_400,
    });

    const { exp, iat } = decodeJwt(short.token);
    expect(exp! - iat!).toBe(900);
  });

  it("rejects tokens signed with another secret", async () => {
    const session = await createSessionToken(secret, false);

    await expect(
      verifySessionToken(session.token, "another-secret-that-is-long-enough!!"),
    ).resolves.toBe(false);
  });
});
