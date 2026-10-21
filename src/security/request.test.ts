import { describe, expect, it } from "vitest";

import { validateRequestBoundary } from "./request";

const expectedHost = "127.0.0.1:3210";
const expectedOrigin = "http://127.0.0.1:3210";

describe("localhost request boundary", () => {
  it("accepts the configured loopback host", () => {
    expect(
      validateRequestBoundary(
        { method: "GET", host: expectedHost, origin: null },
        expectedHost,
        expectedOrigin,
      ),
    ).toEqual({ accepted: true });
  });

  it("rejects DNS-rebinding host headers", () => {
    expect(
      validateRequestBoundary(
        { method: "GET", host: "attacker.example", origin: null },
        expectedHost,
        expectedOrigin,
      ),
    ).toEqual({ accepted: false, status: 421, reason: "host" });
  });

  it("rejects mutations without the exact local origin", () => {
    expect(
      validateRequestBoundary(
        {
          method: "POST",
          host: expectedHost,
          origin: "https://attacker.example",
        },
        expectedHost,
        expectedOrigin,
      ),
    ).toEqual({ accepted: false, status: 403, reason: "origin" });
    expect(
      validateRequestBoundary(
        { method: "POST", host: expectedHost, origin: null },
        expectedHost,
        expectedOrigin,
      ),
    ).toEqual({ accepted: false, status: 403, reason: "origin" });
  });
});
