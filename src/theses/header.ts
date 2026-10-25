import { recommendationLanguage } from "../safety/recommendation";

/**
 * The `thesis` block at the top of a thesis file (PRD F7, D-024): one
 * `key: value` per line, read under a strict grammar. Blank lines and `#`
 * comments are ignored; anything else makes the whole header unreadable with a
 * reason naming the line. Nothing is guessed.
 */

export const THESIS_STATUSES = ["active", "invalidated", "closed"] as const;
export type ThesisStatus = (typeof THESIS_STATUSES)[number];

export interface Catalyst {
  date: string;
  text: string;
}

export interface ThesisHeader {
  title: string;
  /** Exchange codes, in the order written. */
  tickers: string[];
  /** A description of the view, never a recommendation. */
  stance: string;
  /** The thesis in one line. */
  summary: string;
  status: ThesisStatus;
  /** When the owner means to re-read the thesis. */
  review: string;
  /** In date order. */
  catalysts: Catalyst[];
}

export type HeaderResult =
  { header: ThesisHeader; error: null } | { header: null; error: string };

export const SHARE_CODE = /^[A-Z]{4}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const LIMITS = { title: 120, stance: 160, summary: 240, catalyst: 160 };

/** A real calendar date written YYYY-MM-DD. */
export function isCalendarDate(text: string): boolean {
  if (!DATE.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

type Single = "title" | "tickers" | "stance" | "summary" | "status" | "review";
const SINGLE: readonly Single[] = [
  "title",
  "tickers",
  "stance",
  "summary",
  "status",
  "review",
];

function isSingle(key: string): key is Single {
  return (SINGLE as readonly string[]).includes(key);
}

function isStatus(value: string): value is ThesisStatus {
  return (THESIS_STATUSES as readonly string[]).includes(value);
}

function tickersOf(value: string): string[] {
  return value.split(",").map((code) => code.trim());
}

function checkValue(key: Single, value: string): string | null {
  switch (key) {
    case "title":
    case "summary":
      return value.length > LIMITS[key]
        ? `${key} is over ${LIMITS[key]} characters`
        : null;
    case "stance": {
      if (value.length > LIMITS.stance) {
        return `stance is over ${LIMITS.stance} characters`;
      }
      const word = recommendationLanguage(value);
      return word
        ? `stance describes a view and may not recommend; "${word}" reads as a recommendation`
        : null;
    }
    case "tickers": {
      const codes = tickersOf(value);
      const bad = codes.find((code) => !SHARE_CODE.test(code));
      if (bad !== undefined) {
        return `"${bad}" is not an exchange code (four capital letters, separated by commas)`;
      }
      return new Set(codes).size === codes.length
        ? null
        : "a ticker is listed twice";
    }
    case "status":
      return isStatus(value)
        ? null
        : `status is one of ${THESIS_STATUSES.join(", ")}, found "${value}"`;
    case "review":
      return isCalendarDate(value)
        ? null
        : `review is a date written YYYY-MM-DD, found "${value}"`;
  }
}

export function parseHeader(text: string): HeaderResult {
  const values = new Map<Single, string>();
  let status: ThesisStatus | null = null;
  const catalysts: Catalyst[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (line === "" || line.startsWith("#")) continue;
    const fail = (problem: string): HeaderResult => ({
      header: null,
      error: `Line ${index + 1} of the thesis block: ${problem}.`,
    });
    const colon = line.indexOf(":");
    if (colon < 0) return fail(`expected "key: value", found "${line}"`);
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (value === "") return fail(`${key} has no value`);
    if (key === "catalyst") {
      const [date = "", ...rest] = value.split(/\s+/);
      const what = rest.join(" ");
      if (!isCalendarDate(date)) {
        return fail(
          `a catalyst starts with its date as YYYY-MM-DD, found "${date}"`,
        );
      }
      if (what === "") return fail("the catalyst has a date but no text");
      if (what.length > LIMITS.catalyst) {
        return fail(`the catalyst is over ${LIMITS.catalyst} characters`);
      }
      catalysts.push({ date, text: what });
      continue;
    }
    if (!isSingle(key)) {
      return fail(`unknown key "${key}"; use ${SINGLE.join(", ")} or catalyst`);
    }
    if (values.has(key)) return fail(`a second ${key}`);
    const problem = checkValue(key, value);
    if (problem) return fail(problem);
    values.set(key, value);
    if (key === "status" && isStatus(value)) status = value;
  }
  const missing = SINGLE.filter((key) => !values.has(key));
  if (missing.length > 0 || status === null) {
    return {
      header: null,
      error: `The thesis block is missing ${missing.join(", ")}.`,
    };
  }
  return {
    header: {
      title: values.get("title")!,
      tickers: tickersOf(values.get("tickers")!),
      stance: values.get("stance")!,
      summary: values.get("summary")!,
      status,
      review: values.get("review")!,
      catalysts: catalysts.sort((a, b) => a.date.localeCompare(b.date)),
    },
    error: null,
  };
}
