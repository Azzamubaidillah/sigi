import { describe, expect, it } from "vitest";

import {
  HOLDER_ALIASES,
  holderKey,
  holderSlug,
  mayHaveHolderPage,
  normaliseHolderName,
} from "./holder-names";

describe("holder identity", () => {
  it("folds only case, full stops, commas and spacing", () => {
    expect(normaliseHolderName(" PT.Grid  One Media ")).toBe(
      "PT GRID ONE MEDIA",
    );
    expect(normaliseHolderName("FURUKAWA ELECTRIC CO.,LTD.")).toBe(
      "FURUKAWA ELECTRIC CO LTD",
    );
    // Word order is never touched: these stay two holders unless an alias says otherwise.
    expect(holderKey("MANDIRI INVESTASI BERSAMA PT")).not.toBe(
      holderKey("PT INVESTASI BERSAMA MANDIRI"),
    );
  });

  it("merges a reviewed alias into its canonical spelling", () => {
    expect(holderKey("Barito Pacific Tbk")).toBe("PT BARITO PACIFIC TBK");
  });

  it("keeps the alias table resolvable in one step", () => {
    const aliases = new Set(HOLDER_ALIASES.map((row) => row.alias));
    for (const row of HOLDER_ALIASES) {
      // Stored already normalised, never chained, never a self-alias.
      expect(normaliseHolderName(row.alias)).toBe(row.alias);
      expect(normaliseHolderName(row.canonical)).toBe(row.canonical);
      expect(aliases.has(row.canonical)).toBe(false);
      expect(row.alias).not.toBe(row.canonical);
      expect(row.reason.length).toBeGreaterThan(20);
    }
    expect(aliases.size).toBe(HOLDER_ALIASES.length);
  });

  it("gives a page only when every published row is an institution", () => {
    expect(mayHaveHolderPage(["CP", "PF"])).toBe(true);
    expect(mayHaveHolderPage(["CP", "ID"])).toBe(false);
    expect(mayHaveHolderPage(["CP", null])).toBe(false);
    expect(mayHaveHolderPage([])).toBe(false);
  });

  it("makes URL-safe slugs", () => {
    expect(holderSlug("DBS BANK LTD S/A ALBIZIA ASEAN")).toBe(
      "dbs-bank-ltd-s-a-albizia-asean",
    );
  });
});
