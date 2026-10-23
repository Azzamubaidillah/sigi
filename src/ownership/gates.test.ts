import { describe, expect, it } from "vitest";

import {
  type GateResult,
  type GateInput,
  HOLDER_COUNT_MAX_CHANGE,
  outcomeOf,
  recordDateGate,
  runGates,
  SHARES_MISMATCH_LIMIT,
} from "./gates";
import type { S1Row } from "./s1-xlsx";

function row(overrides: Partial<S1Row> = {}): S1Row {
  return {
    rowNumber: 1,
    recordDate: "2026-02-27",
    shareCode: "AAAA",
    issuerName: "CONTOH Tbk",
    investorName: "PT CONTOH",
    investorType: "CP",
    localForeign: "L",
    nationality: null,
    domicile: "INDONESIA",
    sharesScripless: 100,
    sharesScrip: 0,
    sharesTotal: 100,
    percentHundredths: 500,
    ...overrides,
  };
}

/** `count` rows spread over issuers of four holders, 5% each. */
function month(
  count: number,
  overrides: (index: number) => Partial<S1Row> = () => ({}),
) {
  const letter = (n: number) => String.fromCharCode(65 + (n % 26));
  return Array.from({ length: count }, (_, index) => {
    const issuer = Math.floor(index / 4);
    return row({
      rowNumber: index + 1,
      shareCode: `A${letter(issuer / 676)}${letter(issuer / 26)}${letter(issuer)}`,
      investorName: `HOLDER ${index}`,
      ...overrides(index),
    });
  });
}

function input(overrides: Partial<GateInput> = {}): GateInput {
  return {
    recordDate: "2026-02-27",
    rows: month(4_000),
    previous: null,
    latestPublished: null,
    recordDatePublished: false,
    correction: false,
    ...overrides,
  };
}

function verdict(results: GateResult[], gate: string) {
  return results.find((result) => result.gate === gate)?.verdict;
}

describe("S1 gates", () => {
  it("publishes a clean first month", () => {
    const results = runGates(input());
    expect(results.every((result) => result.verdict === "pass")).toBe(true);
    expect(outcomeOf(results)).toBe("published");
  });

  it("rejects a row count outside the band, or far from last month's", () => {
    expect(verdict(runGates(input({ rows: month(2_999) })), "row_count")).toBe(
      "fail",
    );
    const previous = {
      recordDate: "2026-01-30",
      rowCount: 5_000,
      holdersByCode: new Map<string, number>(),
    };
    expect(
      verdict(runGates(input({ rows: month(3_749), previous })), "row_count"),
    ).toBe("fail");
    expect(
      verdict(runGates(input({ rows: month(3_750), previous })), "row_count"),
    ).toBe("pass");
  });

  it("allows rounding past 100% per issuer, and nothing beyond it", () => {
    // Four holders may overshoot by two hundredths (half a hundredth each).
    const atAllowance = month(4_000, (index) => ({
      percentHundredths: index < 4 ? 2_500 + (index < 2 ? 1 : 0) : 500,
    }));
    expect(verdict(runGates(input({ rows: atAllowance })), "percent_sum")).toBe(
      "pass",
    );
    const beyond = month(4_000, (index) => ({
      percentHundredths: index < 4 ? 2_501 : 500,
    }));
    expect(verdict(runGates(input({ rows: beyond })), "percent_sum")).toBe(
      "fail",
    );
  });

  it("rejects a percentage of zero or above 100", () => {
    const zero = month(4_000, (index) =>
      index === 7 ? { percentHundredths: 0 } : {},
    );
    expect(verdict(runGates(input({ rows: zero })), "percent_range")).toBe(
      "fail",
    );
  });

  it("publishes a few source rows whose shares do not add up with a warning, and rejects many", () => {
    const mismatched = (count: number) =>
      month(4_000, (index) => (index < count ? { sharesTotal: 99 } : {}));
    const few = runGates(input({ rows: mismatched(SHARES_MISMATCH_LIMIT) }));
    expect(verdict(few, "shares_identity")).toBe("warn");
    expect(outcomeOf(few)).toBe("published");
    const many = runGates(
      input({ rows: mismatched(SHARES_MISMATCH_LIMIT + 1) }),
    );
    expect(verdict(many, "shares_identity")).toBe("fail");
    expect(outcomeOf(many)).toBe("rejected");
  });

  it("accepts both taxonomies and unclassified rows, and warns on an unknown type", () => {
    const mixed = month(4_000, (index) =>
      index === 1
        ? { investorType: "MUTUAL FUNDS" }
        : index === 2
          ? { investorType: "Sole proprietorship" }
          : index === 3
            ? { investorType: null, localForeign: "L" }
            : {},
    );
    expect(verdict(runGates(input({ rows: mixed })), "classification")).toBe(
      "pass",
    );
    const unknown = runGates(
      input({
        rows: month(4_000, (index) =>
          index === 3 ? { investorType: "Space Agency" } : {},
        ),
      }),
    );
    expect(verdict(unknown, "classification")).toBe("warn");
    expect(outcomeOf(unknown)).toBe("published");
  });

  it("rejects a share code that is not four letters", () => {
    const rows = month(4_000, (index) =>
      index === 0 ? { shareCode: "AB1" } : {},
    );
    expect(verdict(runGates(input({ rows })), "share_code")).toBe("fail");
  });

  it("warns when an issuer's holder count jumps", () => {
    const previous = (holders: number) => ({
      recordDate: "2026-01-30",
      rowCount: 4_000,
      holdersByCode: new Map([["AAAA", holders]]),
    });
    const rows = month(4_000);
    const aaaa = rows.filter((r) => r.shareCode === "AAAA").length;
    expect(
      verdict(
        runGates(
          input({ rows, previous: previous(aaaa + HOLDER_COUNT_MAX_CHANGE) }),
        ),
        "holder_count_change",
      ),
    ).toBe("pass");
    expect(
      verdict(
        runGates(
          input({
            rows,
            previous: previous(aaaa + HOLDER_COUNT_MAX_CHANGE + 1),
          }),
        ),
        "holder_count_change",
      ),
    ).toBe("warn");
  });

  it("rejects when any gate fails, whatever else warns", () => {
    expect(
      outcomeOf([
        { gate: "a", verdict: "warn", detail: "" },
        { gate: "b", verdict: "fail", detail: "" },
      ]),
    ).toBe("rejected");
  });
});

describe("record date gate", () => {
  const base = {
    recordDate: "2026-03-31",
    latestPublished: "2026-03-31",
    recordDatePublished: true,
    correction: false,
  };

  it("requires a month newer than the latest published one", () => {
    expect(recordDateGate(base).verdict).toBe("fail");
    expect(
      recordDateGate({
        ...base,
        recordDate: "2026-02-27",
        recordDatePublished: false,
      }).verdict,
    ).toBe("fail");
    expect(
      recordDateGate({
        ...base,
        recordDate: "2026-04-30",
        recordDatePublished: false,
      }).verdict,
    ).toBe("pass");
  });

  it("lets a re-issued file replace a published month, and only a published one", () => {
    expect(recordDateGate({ ...base, correction: true }).verdict).toBe("pass");
    expect(
      recordDateGate({
        ...base,
        recordDate: "2026-02-27",
        recordDatePublished: false,
        correction: true,
      }).verdict,
    ).toBe("fail");
  });
});
