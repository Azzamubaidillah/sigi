import { describe, expect, it } from "vitest";

import {
  compareMonths,
  concentration,
  freeFloatUpperBoundHundredths,
  heldBelowOnePercentHundredths,
  type Holding,
} from "./metrics";

function holding(
  name: string,
  hundredths: number,
  shares = hundredths * 1_000,
): Holding {
  return {
    rowNumber: 0,
    investorName: name,
    investorType: "CP",
    localForeign: "L",
    sharesScripless: shares,
    sharesScrip: 0,
    sharesTotal: shares,
    percentHundredths: hundredths,
  };
}

describe("concentration", () => {
  it("ranks by percentage whatever the publisher's row order", () => {
    const result = concentration([
      holding("C", 583),
      holding("A", 4_110),
      holding("D", 438),
      holding("B", 1_537),
    ]);
    expect(result).toEqual({
      holders: 4,
      topHundredths: 4_110,
      topThreeHundredths: 4_110 + 1_537 + 583,
      sumHundredths: 6_668,
      // 41.10² + 15.37² + 5.83² + 4.38²
      hhi: 1_689.21 + 236.2369 + 33.9889 + 19.1844,
    });
  });

  it("reports an issuer with no holder above 1% as zeros, not an error", () => {
    expect(concentration([])).toMatchObject({
      holders: 0,
      topHundredths: 0,
      hhi: 0,
    });
  });
});

describe("held below 1%", () => {
  it("is what the >1% holders leave, never negative after rounding", () => {
    expect(
      heldBelowOnePercentHundredths([holding("A", 7_968), holding("B", 218)]),
    ).toBe(1_814);
    expect(
      heldBelowOnePercentHundredths([holding("A", 5_001), holding("B", 5_001)]),
    ).toBe(0);
  });
});

describe("free float upper bound", () => {
  it("removes holders of 5% or more and keeps those below 5", () => {
    // 5.00% exactly is a major holder; 4.99% is free float by definition.
    expect(
      freeFloatUpperBoundHundredths([
        holding("A", 6_000),
        holding("B", 500),
        holding("C", 499),
      ]),
    ).toBe(3_500);
  });

  it("adds a holder's rows together before applying the 5% line", () => {
    // Two accounts of 3% each are one 6% holder, and not free float.
    expect(
      freeFloatUpperBoundHundredths([holding("A", 300), holding("A", 300)]),
    ).toBe(9_400);
  });

  it("treats spellings that differ only in case, stops and commas as one holder", () => {
    expect(
      freeFloatUpperBoundHundredths([
        holding("PT. Contoh Jaya", 300),
        holding("PT CONTOH JAYA", 300),
      ]),
    ).toBe(9_400);
  });
});

describe("month-over-month changes", () => {
  it("sorts holders into entered, exited, increased, decreased and unchanged", () => {
    const before = [
      holding("STAYS", 1_000),
      holding("GROWS", 500),
      holding("SHRINKS", 900),
      holding("LEAVES", 300),
    ];
    const after = [
      holding("STAYS", 1_000),
      holding("GROWS", 700),
      holding("SHRINKS", 400),
      holding("JOINS", 150),
    ];
    const changes = compareMonths(after, before);
    expect(changes.entered.map((c) => c.investorName)).toEqual(["JOINS"]);
    expect(changes.exited.map((c) => c.investorName)).toEqual(["LEAVES"]);
    expect(changes.increased).toEqual([
      expect.objectContaining({
        investorName: "GROWS",
        beforeHundredths: 500,
        afterHundredths: 700,
      }),
    ]);
    expect(changes.decreased.map((c) => c.investorName)).toEqual(["SHRINKS"]);
    expect(changes.unchanged).toBe(1);
  });

  it("treats one name on two rows as one holder", () => {
    const changes = compareMonths(
      [holding("TWICE", 200, 2_000), holding("TWICE", 300, 3_000)],
      [holding("TWICE", 500, 5_000)],
    );
    expect(changes.unchanged).toBe(1);
    expect(changes.entered).toEqual([]);
  });
});
