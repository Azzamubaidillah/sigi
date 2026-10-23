import { holderKind } from "./investor-classes";
import type { S1Row } from "./s1-xlsx";

/** Absolute bounds on rows per month; the files so far have 7,154–7,257. */
export const ROW_COUNT_BAND = { min: 3_000, max: 15_000 } as const;
/** Allowed change in total rows against the previous published month. */
export const ROW_COUNT_MAX_CHANGE = 0.25;
/** Issuers whose count of >1% holders moves by more than this are noted. */
export const HOLDER_COUNT_MAX_CHANGE = 5;
/**
 * Rows whose total differs from scripless + scrip that are published with a
 * note (the publisher's own files have one, some months). More than this is
 * treated as a misread file rather than a few typos at the source.
 */
export const SHARES_MISMATCH_LIMIT = 5;

/**
 * "fail" rejects the file and keeps the previous month live. "warn" publishes
 * it with the finding shown on the data page: nobody reviews imports, so a
 * finding either blocks or is disclosed (D-021).
 */
export type GateVerdict = "pass" | "warn" | "fail";

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
  /** The file replaces a published month (the exchange re-issued it). */
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
  if (!previous) return { gate, verdict: "pass", detail: `${count} rows` };
  const change = Math.abs(count - previous.rowCount) / previous.rowCount;
  return change > ROW_COUNT_MAX_CHANGE
    ? {
        gate,
        verdict: "fail",
        detail: `${count} rows against ${previous.rowCount} on ${previous.recordDate}; more than ${ROW_COUNT_MAX_CHANGE * 100}% change`,
      }
    : {
        gate,
        verdict: "pass",
        detail: `${count} rows (${previous.rowCount} on ${previous.recordDate})`,
      };
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
 * Each issuer's holder percentages may not exceed 100%. Every figure is
 * rounded to hundredths, so the sum may overshoot by up to half a hundredth
 * per holder; that much is allowed and no more.
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
    verdict: bad.length <= SHARES_MISMATCH_LIMIT ? "warn" : "fail",
    detail: `${bad.length} ${bad.length === 1 ? "row" : "rows"} where the source's total is not scripless + scrip, published as is: ${examples(bad)}`,
  };
}

/**
 * Investor types Sigi cannot place. They are published as is, but such a
 * holder never gets a page, since it might be a person (PRD C6).
 */
function classificationGate({ rows }: GateInput): GateResult {
  const unknown = new Map<string, number>();
  for (const row of rows) {
    if (holderKind(row.investorType) === "unknown") {
      unknown.set(row.investorType!, (unknown.get(row.investorType!) ?? 0) + 1);
    }
  }
  const unclassified = rows.filter((row) => row.investorType === null).length;
  return unknown.size === 0
    ? {
        gate: "classification",
        verdict: "pass",
        detail: `every type recognised; ${unclassified} rows unclassified at the source`,
      }
    : {
        gate: "classification",
        verdict: "warn",
        detail: `unrecognised types, treated as possibly individual: ${examples([...unknown].map(([type, n]) => `"${type}" (${n})`))}`,
      };
}

/**
 * Months are published oldest first. A file for a published month replaces
 * it only as a correction, which the fetcher declares when the exchange
 * re-issues a month under a new file.
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
          detail: `a correction, but ${recordDate} is not a published month`,
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
    detail: `${recordDate} is not newer than the published ${latestPublished}`,
  };
}

function holderCountGate({ rows, previous }: GateInput): GateResult {
  const gate = "holder_count_change";
  if (!previous)
    return { gate, verdict: "pass", detail: "no earlier month to compare" };
  const current = new Map<string, number>();
  for (const row of rows)
    current.set(row.shareCode, (current.get(row.shareCode) ?? 0) + 1);
  const moved: string[] = [];
  for (const code of [
    ...new Set([...current.keys(), ...previous.holdersByCode.keys()]),
  ].sort()) {
    const before = previous.holdersByCode.get(code) ?? 0;
    const after = current.get(code) ?? 0;
    if (Math.abs(after - before) > HOLDER_COUNT_MAX_CHANGE)
      moved.push(`${code} ${before} → ${after}`);
  }
  return moved.length === 0
    ? {
        gate,
        verdict: "pass",
        detail: `no issuer's holder count moved by more than ${HOLDER_COUNT_MAX_CHANGE}`,
      }
    : {
        gate,
        verdict: "warn",
        detail: `${moved.length} ${moved.length === 1 ? "issuer" : "issuers"} moved by more than ${HOLDER_COUNT_MAX_CHANGE} holders: ${examples(moved)}`,
      };
}

/** Every gate, in the order the data page lists them. */
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
): "rejected" | "published" {
  return results.some((result) => result.verdict === "fail")
    ? "rejected"
    : "published";
}
