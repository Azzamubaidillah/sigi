import type { S1Row } from "./s1-pdf";

/** KSEI investor-type codes, in the order the KSEI files list them. */
export const INVESTOR_TYPES = [
  "IS",
  "CP",
  "PF",
  "IB",
  "ID",
  "MF",
  "SC",
  "FD",
  "OT",
] as const;
export type InvestorType = (typeof INVESTOR_TYPES)[number];

export const INVESTOR_TYPE_LABELS: Record<InvestorType, string> = {
  IS: "Insurance",
  CP: "Corporate",
  PF: "Pension fund",
  IB: "Financial institution",
  ID: "Individual",
  MF: "Mutual fund",
  SC: "Securities company",
  FD: "Foundation",
  OT: "Other",
};

const investorTypes = new Set<string>(INVESTOR_TYPES);

/** Absolute bounds on rows per month; the first file had 7,257. */
export const ROW_COUNT_BAND = { min: 3_000, max: 15_000 } as const;
/** Allowed change in total rows against the previous published month. */
export const ROW_COUNT_MAX_CHANGE = 0.25;
/**
 * Issuers whose count of >1% holders moves by more than this hold the month
 * for review. A placeholder until a few months of history exist to set it from.
 */
export const HOLDER_COUNT_MAX_CHANGE = 5;
/**
 * Rows whose total differs from scripless + scrip that the owner may accept
 * after review (the publisher's own file has one). More than this is treated
 * as a misread file rather than a few typos at the source.
 */
export const SHARES_MISMATCH_REVIEW_LIMIT = 5;

export type GateVerdict = "pass" | "fail" | "hold";

export interface GateResult {
  gate: string;
  verdict: GateVerdict;
  detail: string;
}

export interface PreviousMonth {
  recordDate: string;
  rowCount: number;
  /** Count of >1% holders per share code. */
  holdersByCode: ReadonlyMap<string, number>;
}

export interface GateInput {
  recordDate: string;
  rows: readonly S1Row[];
  /** The latest published month older than this file's record date. */
  previous: PreviousMonth | null;
  /** The latest published record date of any age, if any. */
  latestPublished: string | null;
  /** Whether a month with this file's record date is published now. */
  recordDatePublished: boolean;
  /** The owner declared this file a correction of a published month. */
  correction: boolean;
}

const MAX_EXAMPLES = 5;

function examples(items: string[]): string {
  const shown = items.slice(0, MAX_EXAMPLES).join("; ");
  return items.length > MAX_EXAMPLES
    ? `${shown}; and ${items.length - MAX_EXAMPLES} more`
    : shown;
}

function where(row: S1Row): string {
  return `row ${row.rowNumber} (${row.shareCode})`;
}

function rowCountGate({ rows, previous }: GateInput): GateResult {
  const gate = "row_count";
  const count = rows.length;
  if (count < ROW_COUNT_BAND.min || count > ROW_COUNT_BAND.max) {
    return {
      gate,
      verdict: "fail",
      detail: `${count} rows; expected ${ROW_COUNT_BAND.min}–${ROW_COUNT_BAND.max}`,
    };
  }
  if (previous) {
    const change = Math.abs(count - previous.rowCount) / previous.rowCount;
    if (change > ROW_COUNT_MAX_CHANGE) {
      return {
        gate,
        verdict: "fail",
        detail: `${count} rows against ${previous.rowCount} on ${previous.recordDate}; more than ${ROW_COUNT_MAX_CHANGE * 100}% change`,
      };
    }
    return {
      gate,
      verdict: "pass",
      detail: `${count} rows (${previous.rowCount} on ${previous.recordDate})`,
    };
  }
  return { gate, verdict: "pass", detail: `${count} rows` };
}

function shareCodeGate({ rows }: GateInput): GateResult {
  const bad = rows
    .filter((row) => !/^[A-Z]{4}$/.test(row.shareCode))
    .map((row) => `${where(row)} "${row.shareCode}"`);
  return bad.length === 0
    ? { gate: "share_code", verdict: "pass", detail: "all four-letter codes" }
    : { gate: "share_code", verdict: "fail", detail: examples(bad) };
}

function percentRangeGate({ rows }: GateInput): GateResult {
  const bad = rows
    .filter(
      (row) => row.percentHundredths <= 0 || row.percentHundredths > 10_000,
    )
    .map((row) => `${where(row)} ${row.percentHundredths / 100}%`);
  return bad.length === 0
    ? { gate: "percent_range", verdict: "pass", detail: "all in (0, 100]" }
    : { gate: "percent_range", verdict: "fail", detail: examples(bad) };
}

/**
 * Each issuer's holder percentages may not exceed 100%. Every published
 * figure is rounded to two decimals, so the sum may legitimately overshoot by
 * up to half a hundredth per holder; that much is allowed and no more.
 */
function percentSumGate({ rows }: GateInput): GateResult {
  const sums = new Map<string, { hundredths: number; holders: number }>();
  for (const row of rows) {
    const entry = sums.get(row.shareCode) ?? { hundredths: 0, holders: 0 };
    entry.hundredths += row.percentHundredths;
    entry.holders += 1;
    sums.set(row.shareCode, entry);
  }
  const bad = [...sums]
    .filter(([, sum]) => sum.hundredths > 10_000 + sum.holders * 0.5)
    .map(([code, sum]) => `${code} ${sum.hundredths / 100}%`);
  return bad.length === 0
    ? {
        gate: "percent_sum",
        verdict: "pass",
        detail: `${sums.size} issuers, each at most 100%`,
      }
    : { gate: "percent_sum", verdict: "fail", detail: examples(bad) };
}

function sharesIdentityGate({ rows }: GateInput): GateResult {
  const gate = "shares_identity";
  const bad = rows
    .filter((row) => row.sharesTotal !== row.sharesScripless + row.sharesScrip)
    .map(
      (row) =>
        `${where(row)}: ${row.sharesScripless} + ${row.sharesScrip} ≠ ${row.sharesTotal}`,
    );
  if (bad.length === 0) {
    return {
      gate,
      verdict: "pass",
      detail: "total = scripless + scrip on every row",
    };
  }
  return {
    gate,
    verdict: bad.length <= SHARES_MISMATCH_REVIEW_LIMIT ? "hold" : "fail",
    detail: `${bad.length} ${bad.length === 1 ? "row" : "rows"} where the source's total is not scripless + scrip: ${examples(bad)}`,
  };
}

/**
 * Investor type and local/foreign. The publisher leaves both empty for scrip
 * held in KSEI's special accounts, whose owner is not yet classified (cover
 * letter, note 4), so empty is valid only when both are empty together.
 */
function classificationGate({ rows }: GateInput): GateResult {
  const bad = rows
    .filter((row) => {
      if (row.investorType === null && row.localForeign === null) return false;
      return (
        row.investorType === null ||
        !investorTypes.has(row.investorType) ||
        (row.localForeign !== "L" && row.localForeign !== "A")
      );
    })
    .map(
      (row) =>
        `${where(row)} type "${row.investorType ?? ""}" local/foreign "${row.localForeign ?? ""}"`,
    );
  const unclassified = rows.filter((row) => row.investorType === null).length;
  return bad.length === 0
    ? {
        gate: "classification",
        verdict: "pass",
        detail: `known type and L/A on every row; ${unclassified} unclassified scrip rows`,
      }
    : { gate: "classification", verdict: "fail", detail: examples(bad) };
}

/**
 * Months are published in order, oldest first, so history is loaded
 * chronologically. Replacing a published month needs the owner to say so.
 */
export function recordDateGate({
  recordDate,
  latestPublished,
  recordDatePublished,
  correction,
}: Pick<
  GateInput,
  "recordDate" | "latestPublished" | "recordDatePublished" | "correction"
>): GateResult {
  const gate = "record_date";
  if (correction) {
    return recordDatePublished
      ? {
          gate,
          verdict: "pass",
          detail: `corrects the published month ${recordDate}`,
        }
      : {
          gate,
          verdict: "fail",
          detail: `marked as a correction, but ${recordDate} is not a published month`,
        };
  }
  if (latestPublished === null || recordDate > latestPublished) {
    return {
      gate,
      verdict: "pass",
      detail: latestPublished
        ? `${recordDate} is newer than ${latestPublished}`
        : `${recordDate}; first month`,
    };
  }
  return {
    gate,
    verdict: "fail",
    detail: `${recordDate} is not newer than the published ${latestPublished}; tick "correction" to replace a published month`,
  };
}

function holderCountGate({ rows, previous }: GateInput): GateResult {
  const gate = "holder_count_change";
  if (!previous) {
    return { gate, verdict: "pass", detail: "no earlier month to compare" };
  }
  const current = new Map<string, number>();
  for (const row of rows) {
    current.set(row.shareCode, (current.get(row.shareCode) ?? 0) + 1);
  }
  const codes = new Set([...current.keys(), ...previous.holdersByCode.keys()]);
  const moved: string[] = [];
  for (const code of [...codes].sort()) {
    const before = previous.holdersByCode.get(code) ?? 0;
    const after = current.get(code) ?? 0;
    if (Math.abs(after - before) > HOLDER_COUNT_MAX_CHANGE) {
      moved.push(`${code} ${before} → ${after}`);
    }
  }
  return moved.length === 0
    ? {
        gate,
        verdict: "pass",
        detail: `no issuer's holder count moved by more than ${HOLDER_COUNT_MAX_CHANGE}`,
      }
    : {
        gate,
        verdict: "hold",
        detail: `${moved.length} issuers moved by more than ${HOLDER_COUNT_MAX_CHANGE} holders: ${examples(moved)}`,
      };
}

/** Every gate, in the order the data health page lists them. */
export function runGates(input: GateInput): GateResult[] {
  return [
    recordDateGate(input),
    rowCountGate(input),
    shareCodeGate(input),
    percentRangeGate(input),
    percentSumGate(input),
    sharesIdentityGate(input),
    classificationGate(input),
    holderCountGate(input),
  ];
}

export function outcomeOf(
  results: readonly GateResult[],
): "rejected" | "held" | "published" {
  if (results.some((result) => result.verdict === "fail")) return "rejected";
  if (results.some((result) => result.verdict === "hold")) return "held";
  return "published";
}
