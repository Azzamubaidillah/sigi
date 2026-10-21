import { describe, expect, it } from "vitest";

import { hashPasscode, verifyPasscode } from "./passcode";

describe("passcode hashing", () => {
  it("verifies the correct passcode without storing it", async () => {
    const encoded = await hashPasscode("correct horse battery staple");

    expect(encoded).not.toContain("correct horse battery staple");
    await expect(
      verifyPasscode("correct horse battery staple", encoded),
    ).resolves.toBe(true);
    await expect(verifyPasscode("wrong passcode", encoded)).resolves.toBe(
      false,
    );
  });

  it("rejects short passcodes and malformed hashes", async () => {
    await expect(hashPasscode("short")).rejects.toThrow("at least eight");
    await expect(verifyPasscode("anything", "invalid")).resolves.toBe(false);
  });
});
