import { describe, expect, it } from "vitest";

import { resolveLang, safeNext } from "./lang";

describe("language choice", () => {
  it("prefers the visitor's cookie, then Accept-Language by weight, then English", () => {
    expect(resolveLang("id", "en-GB,en;q=0.9")).toBe("id");
    expect(resolveLang("en", "id-ID")).toBe("en");
    expect(resolveLang(undefined, "id-ID,id;q=0.9,en;q=0.8")).toBe("id");
    expect(resolveLang(undefined, "en;q=0.5, id;q=0.9")).toBe("id");
    expect(resolveLang(undefined, "fr, id;q=0.4, en;q=0.2")).toBe("id");
    expect(resolveLang(undefined, "in")).toBe("id");
    expect(resolveLang(undefined, "id;q=0, en")).toBe("en");
    expect(resolveLang(undefined, "fr-FR, de")).toBe("en");
    expect(resolveLang(undefined, null)).toBe("en");
    expect(resolveLang("fr", null)).toBe("en");
  });

  it("returns the visitor only to a path on this site", () => {
    expect(safeNext("/macro?group=indonesia")).toBe("/macro?group=indonesia");
    expect(safeNext("/t/BBRI#holders")).toBe("/t/BBRI#holders");
    for (const bad of [
      null,
      "",
      "macro",
      "//evil.example/x",
      "https://evil.example/",
      "/\\evil.example",
      "/ok\r\nSet-Cookie: x=1",
    ]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});
