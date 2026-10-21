import { describe, expect, it } from "vitest";

import { createCsrfToken, csrfTokensMatch } from "./csrf";

describe("CSRF tokens", () => {
  it("accepts only an exact cookie/header pair", () => {
    const token = createCsrfToken();

    expect(csrfTokensMatch(token, token)).toBe(true);
    expect(csrfTokensMatch(token, `${token}x`)).toBe(false);
    expect(csrfTokensMatch(undefined, token)).toBe(false);
  });
});
