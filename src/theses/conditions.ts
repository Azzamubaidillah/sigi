import { type SeriesId, SERIES } from "../macro/series";
import { holderKey } from "../ownership/holder-names";
import {
  freeFloatUpperBoundHundredths,
  LOW_COVERAGE_HUNDREDTHS,
  concentration,
  positionsOf,
} from "../ownership/metrics";
import type { SourceId } from "../sources/register";
import type { CompanyMonth } from "../views/snapshot";
import { isCalendarDate, SHARE_CODE } from "./header";

/**
 * The `conditions` block of a thesis (PRD F7, D-024): what would show the
 * thesis wrong, one typed condition per line. Blank lines and `#` comments are
 * ignored. One malformed line makes the whole block unreadable, with a reason
 * naming the line; no condition is ever guessed at.
 *
 *   ownership BBRI "PT EXAMPLE HOLDER" below 50%
 *   float BBTN below 12.5% [from 2027-03-31]
 *   macro bi-rate above 6.25
 *   date 2027-06-30 no catalyst by then
 *   price BBRI below 3500
 */

export type Direction = "below" | "above";

export type Condition = { text: string } & (
  | {
      kind: "ownership";
      shareCode: string;
      /** As written; matched through `holderKey`. */
      holder: string;
      direction: Direction;
      hundredths: number;
    }
  | {
      kind: "float";
      shareCode: string;
      hundredths: number;
      /** Checked only on registers dated on or after this. */
      from: string | null;
    }
  | { kind: "macro"; seriesId: SeriesId; direction: Direction; value: number }
  | { kind: "date"; date: string; note: string }
  | { kind: "price"; shareCode: string; direction: Direction; level: string }
);

export type ConditionKind = Condition["kind"];

export type ConditionsResult =
  | { conditions: Condition[]; error: null }
  | { conditions: null; error: string };

/** A percentage with at most two decimals, above 0 and at most 100, as hundredths. */
function percentHundredths(text: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?%$/.exec(text);
  if (!match) return null;
  const hundredths =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return hundredths > 0 && hundredths <= 10_000 ? hundredths : null;
}

const NUMBER = /^-?\d+(?:\.\d+)?$/;
const PRICE = /^\d+(?:\.\d+)?$/;

type LineResult = { condition: Condition } | { problem: string };
function isSeriesId(id: string): id is SeriesId {
  return Object.hasOwn(SERIES, id);
}

function direction(word: string | undefined): Direction | null {
  return word === "below" || word === "above" ? word : null;
}

function readOwnership(text: string, rest: string): LineResult {
  const match = /^([A-Z0-9]+)\s+"([^"]+)"\s+(\S+)\s+(\S+)$/.exec(rest);
  if (!match) {
    return {
      problem:
        'ownership is written: ownership CODE "HOLDER NAME" below|above N%',
    };
  }
  const [, shareCode = "", holder = "", word, percent = ""] = match;
  if (!SHARE_CODE.test(shareCode)) {
    return { problem: `"${shareCode}" is not an exchange code` };
  }
  const which = direction(word);
  if (!which) return { problem: `expected below or above, found "${word}"` };
  const hundredths = percentHundredths(percent);
  if (hundredths === null) {
    return {
      problem: `"${percent}" is not a percentage such as 50% or 12.5%`,
    };
  }
  return {
    condition: {
      kind: "ownership",
      text,
      shareCode,
      holder: holder.trim(),
      direction: which,
      hundredths,
    },
  };
}

function readFloat(text: string, words: string[]): LineResult {
  const [shareCode = "", word, percent = "", fromWord, from, ...extra] = words;
  if (
    words.length < 3 ||
    extra.length > 0 ||
    (fromWord !== undefined && (fromWord !== "from" || from === undefined))
  ) {
    return {
      problem: "float is written: float CODE below N% [from YYYY-MM-DD]",
    };
  }
  if (!SHARE_CODE.test(shareCode)) {
    return { problem: `"${shareCode}" is not an exchange code` };
  }
  if (word !== "below") {
    return {
      problem:
        "float takes only below: the register gives an upper bound, so it can show a float is below a level but never that it is above one",
    };
  }
  const hundredths = percentHundredths(percent);
  if (hundredths === null) {
    return {
      problem: `"${percent}" is not a percentage such as 15% or 12.5%`,
    };
  }
  if (from !== undefined && !isCalendarDate(from)) {
    return { problem: `"${from}" is not a date written YYYY-MM-DD` };
  }
  return {
    condition: {
      kind: "float",
      text,
      shareCode,
      hundredths,
      from: from ?? null,
    },
  };
}

function readMacro(text: string, words: string[]): LineResult {
  const [series = "", word, value = "", ...extra] = words;
  if (words.length < 3 || extra.length > 0) {
    return { problem: "macro is written: macro SERIES below|above NUMBER" };
  }
  if (!isSeriesId(series)) {
    return {
      problem: `unknown series "${series}"; the series are ${Object.keys(SERIES).join(", ")}`,
    };
  }
  const which = direction(word);
  if (!which) return { problem: `expected below or above, found "${word}"` };
  if (!NUMBER.test(value)) {
    return {
      problem: `"${value}" is not a plain number in the series' unit (no %, commas or units)`,
    };
  }
  return {
    condition: {
      kind: "macro",
      text,
      seriesId: series,
      direction: which,
      value: Number(value),
    },
  };
}

function readDate(text: string, words: string[]): LineResult {
  const [date = "", ...note] = words;
  if (!isCalendarDate(date)) {
    return {
      problem: "date is written: date YYYY-MM-DD what is expected by then",
    };
  }
  if (note.length === 0) {
    return {
      problem: "the date needs a few words on what is expected by then",
    };
  }
  return { condition: { kind: "date", text, date, note: note.join(" ") } };
}

function readPrice(text: string, words: string[]): LineResult {
  const [shareCode = "", word, level = "", ...extra] = words;
  if (words.length < 3 || extra.length > 0) {
    return { problem: "price is written: price CODE below|above LEVEL" };
  }
  if (!SHARE_CODE.test(shareCode)) {
    return { problem: `"${shareCode}" is not an exchange code` };
  }
  const which = direction(word);
  if (!which) return { problem: `expected below or above, found "${word}"` };
  if (!PRICE.test(level)) {
    return { problem: `"${level}" is not a plain price in rupiah` };
  }
  return {
    condition: { kind: "price", text, shareCode, direction: which, level },
  };
}

function readLine(line: string): LineResult {
  const text = line.replace(/\s+/g, " ");
  const [kind = "", ...words] = text.split(" ");
  const rest = words.join(" ");
  switch (kind) {
    case "ownership":
      return readOwnership(text, rest);
    case "float":
      return readFloat(text, words);
    case "macro":
      return readMacro(text, words);
    case "date":
      return readDate(text, words);
    case "price":
      return readPrice(text, words);
    default:
      return {
        problem: `unknown condition "${kind}"; use ownership, float, macro, date or price`,
      };
  }
}

export function parseConditions(text: string): ConditionsResult {
  const conditions: Condition[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (line === "" || line.startsWith("#")) continue;
    const read = readLine(line);
    const fail = (problem: string): ConditionsResult => ({
      conditions: null,
      error: `Line ${index + 1} of the conditions block: ${problem}.`,
    });
    if ("problem" in read) return fail(read.problem);
    if (seen.has(read.condition.text)) return fail("the same condition twice");
    seen.add(read.condition.text);
    conditions.push(read.condition);
  }
  if (conditions.length === 0) {
    return {
      conditions: null,
      error: "The conditions block has no condition.",
    };
  }
  return { conditions, error: null };
}

// ---- Evaluation --------------------------------------------------------------

export const CHECK_STATUSES = ["met", "not-met", "unknown", "manual"] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export interface Evaluation {
  status: CheckStatus;
  /** What was compared, in words, with the as-of date of the figure. */
  detail: string;
  /** The register entry of the figure compared, if one was. */
  source: SourceId | null;
}

/** What the conditions are checked against: Sigi's own published data only. */
export interface Readings {
  /** YYYY-MM-DD in Jakarta. */
  today: string;
  /** The latest published ownership month, or null before the first. */
  ownership: {
    recordDate: string;
    companies: ReadonlyMap<string, CompanyMonth>;
    /** Every holder key published in any month. */
    knownHolders: ReadonlySet<string>;
    /** Holder keys that may be named (PRD C6): institutions only. */
    institutions: ReadonlySet<string>;
  } | null;
  /** The latest published observation of each series that has one. */
  macro: ReadonlyMap<string, { period: string; value: number }>;
}

function percent(hundredths: number): string {
  return `${(hundredths / 100).toFixed(2)}%`;
}

function evaluateOwnership(
  condition: Extract<Condition, { kind: "ownership" }>,
  readings: Readings,
): Evaluation {
  const fromS1 = (status: CheckStatus, detail: string): Evaluation => ({
    status,
    detail,
    source: "S1",
  });
  const month = readings.ownership;
  if (!month) return fromS1("unknown", "No ownership month is published yet.");
  const key = holderKey(condition.holder);
  if (!month.knownHolders.has(key)) {
    return fromS1(
      "unknown",
      "This holder is in no published month; check the spelling against the register.",
    );
  }
  if (!month.institutions.has(key)) {
    return fromS1(
      "unknown",
      "Sigi checks institutional holders only; this name has rows typed as an individual or with no type (C6).",
    );
  }
  const company = month.companies.get(condition.shareCode);
  if (!company) {
    return fromS1(
      "unknown",
      `${condition.shareCode} is not in the ${month.recordDate} register.`,
    );
  }
  const position = positionsOf(company.holdings).find((p) => p.key === key);
  const threshold = `${condition.direction} ${percent(condition.hundredths)}`;
  if (!position) {
    // The register lists only holdings above 1%.
    if (condition.hundredths <= 100) {
      return fromS1(
        "unknown",
        `Not listed in ${condition.shareCode} on ${month.recordDate}, so under 1%; the register cannot show a threshold of ${percent(condition.hundredths)}.`,
      );
    }
    return fromS1(
      condition.direction === "below" ? "met" : "not-met",
      `Not listed in ${condition.shareCode} on ${month.recordDate}, so under 1% (condition: ${threshold}).`,
    );
  }
  const met =
    condition.direction === "below"
      ? position.hundredths < condition.hundredths
      : position.hundredths > condition.hundredths;
  return fromS1(
    met ? "met" : "not-met",
    `Holds ${percent(position.hundredths)} of ${condition.shareCode} on ${month.recordDate} (condition: ${threshold}).`,
  );
}

function evaluateFloat(
  condition: Extract<Condition, { kind: "float" }>,
  readings: Readings,
): Evaluation {
  const fromS1 = (status: CheckStatus, detail: string): Evaluation => ({
    status,
    detail,
    source: "S1",
  });
  const month = readings.ownership;
  if (!month) return fromS1("unknown", "No ownership month is published yet.");
  const company = month.companies.get(condition.shareCode);
  if (!company) {
    return fromS1(
      "unknown",
      `${condition.shareCode} is not in the ${month.recordDate} register.`,
    );
  }
  if (condition.from !== null && month.recordDate < condition.from) {
    return fromS1(
      "not-met",
      `Checked from ${condition.from}; the latest register is dated ${month.recordDate}.`,
    );
  }
  if (concentration(company.holdings).sumHundredths < LOW_COVERAGE_HUNDREDTHS) {
    return fromS1(
      "unknown",
      `The ${month.recordDate} register lists under 15% above 1% for ${condition.shareCode}, so it gives no float figure (D-019).`,
    );
  }
  const bound = freeFloatUpperBoundHundredths(company.holdings);
  return bound < condition.hundredths
    ? fromS1(
        "met",
        `The free float is at most ${percent(bound)} on ${month.recordDate}, below ${percent(condition.hundredths)}.`,
      )
    : fromS1(
        "not-met",
        `The register's upper bound is ${percent(bound)} on ${month.recordDate}; the official figure can be lower, so this cannot show it below ${percent(condition.hundredths)}.`,
      );
}

function evaluateMacro(
  condition: Extract<Condition, { kind: "macro" }>,
  readings: Readings,
): Evaluation {
  const definition = SERIES[condition.seriesId];
  const latest = readings.macro.get(condition.seriesId);
  if (!latest) {
    return {
      status: "unknown",
      detail: `${definition.name.en} has no published value yet.`,
      source: definition.source,
    };
  }
  const met =
    condition.direction === "below"
      ? latest.value < condition.value
      : latest.value > condition.value;
  return {
    status: met ? "met" : "not-met",
    detail: `${definition.name.en} is ${latest.value.toFixed(definition.decimals)} (${definition.unit}) for ${latest.period}, as published (condition: ${condition.direction} ${condition.value}).`,
    source: definition.source,
  };
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

export function evaluateCondition(
  condition: Condition,
  readings: Readings,
): Evaluation {
  switch (condition.kind) {
    case "ownership":
      return evaluateOwnership(condition, readings);
    case "float":
      return evaluateFloat(condition, readings);
    case "macro":
      return evaluateMacro(condition, readings);
    case "date": {
      const days = daysBetween(readings.today, condition.date);
      const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
      if (days > 0) {
        return {
          status: "not-met",
          detail: `${plural(days)} to ${condition.date}.`,
          source: null,
        };
      }
      return {
        status: "met",
        detail:
          days === 0
            ? `${condition.date} is today.`
            : `${condition.date} was ${plural(-days)} ago.`,
        source: null,
      };
    }
    case "price":
      return {
        status: "manual",
        detail:
          "Sigi stores no prices (C1), so this level is checked by hand on the chart.",
        source: null,
      };
  }
}
