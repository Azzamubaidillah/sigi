import { INVESTOR_TYPES, type InvestorType } from "../ownership/gates";
import {
  compareMonths,
  type Concentration,
  concentration,
  freeFloatUpperBoundHundredths,
  heldBelowOnePercentHundredths,
  LOW_COVERAGE_HUNDREDTHS,
  type MonthChanges,
} from "../ownership/metrics";
import {
  type CompanyMonth,
  loadSnapshot,
  type PublishedHolding,
  type PublishedMonth,
  type Snapshot,
} from "./snapshot";

export type { PublishedHolding, PublishedMonth } from "./snapshot";

/** Why a section has nothing to show. Pages render these, never a zero. */
export type OwnershipAbsence =
  "no_published_month" | "not_in_register" | "no_previous_month";

export const ABSENCE_TEXT: Record<OwnershipAbsence, string> = {
  no_published_month: "No month of the >1% register has been published yet.",
  not_in_register:
    "This code has no holder above 1% in the latest published month, or is not a listed share.",
  no_previous_month:
    "No earlier month is published, so there is nothing to compare against.",
};

export function loadLatestMonth(databasePath: string): PublishedMonth | null {
  return loadSnapshot(databasePath)?.months[0] ?? null;
}

export interface CompanyFigures {
  shareCode: string;
  issuerName: string;
  holders: number;
  topHundredths: number;
  hhi: number;
  sumHundredths: number;
  freeFloatUpperBoundHundredths: number;
  heldBelowOneHundredths: number;
  /** The register lists too little above 1% to support a float figure (D-019). */
  registerIncomplete: boolean;
  /** Holders above 1% classed as foreign, together. */
  foreignHundredths: number;
  types: string[];
  /** Null when the company is not in the previous month, or there is none. */
  changes: Pick<
    MonthChanges,
    "entered" | "exited" | "increased" | "decreased"
  > | null;
}

export function companyFigures(
  company: CompanyMonth,
  previous: CompanyMonth | undefined,
): CompanyFigures {
  const totals: Concentration = concentration(company.holdings);
  return {
    shareCode: company.shareCode,
    issuerName: company.issuerName,
    holders: totals.holders,
    topHundredths: totals.topHundredths,
    hhi: totals.hhi,
    sumHundredths: totals.sumHundredths,
    freeFloatUpperBoundHundredths: freeFloatUpperBoundHundredths(
      company.holdings,
    ),
    heldBelowOneHundredths: heldBelowOnePercentHundredths(company.holdings),
    registerIncomplete: totals.sumHundredths < LOW_COVERAGE_HUNDREDTHS,
    foreignHundredths: company.holdings
      .filter((holding) => holding.localForeign === "A")
      .reduce((total, holding) => total + holding.percentHundredths, 0),
    types: [
      ...new Set(
        company.holdings.flatMap((h) =>
          h.investorType ? [h.investorType] : [],
        ),
      ),
    ],
    changes: previous
      ? compareMonths(company.holdings, previous.holdings)
      : null,
  };
}

export const SORTS = {
  code: "Code",
  "float-asc": "Free float bound, lowest first",
  "top-desc": "Largest holder, highest first",
  "hhi-desc": "Concentration (HHI), highest first",
  "holders-desc": "Holders above 1%, most first",
} as const;
export type ScreenSort = keyof typeof SORTS;

export interface ScreenFilters {
  query: string;
  /** Bounds on the free-float upper bound, hundredths of a percent. */
  floatMin: number | null;
  floatMax: number | null;
  topMin: number | null;
  type: InvestorType | null;
  foreign: boolean;
  changed: boolean;
  sort: ScreenSort;
}

type SearchParams = Record<string, string | string[] | undefined>;

function single(params: SearchParams, name: string): string {
  const value = params[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function percentParam(params: SearchParams, name: string): number | null {
  const text = single(params, name);
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
  const value = Math.round(Number(text) * 100);
  return value <= 10_000 ? value : null;
}

/** Filters from the URL; anything malformed is ignored rather than guessed. */
export function parseScreenFilters(params: SearchParams): ScreenFilters {
  const type = single(params, "type");
  const sort = single(params, "sort");
  return {
    query: single(params, "q").slice(0, 80),
    floatMin: percentParam(params, "floatMin"),
    floatMax: percentParam(params, "floatMax"),
    topMin: percentParam(params, "topMin"),
    type: (INVESTOR_TYPES as readonly string[]).includes(type)
      ? (type as InvestorType)
      : null,
    foreign: single(params, "foreign") === "1",
    changed: single(params, "changed") === "1",
    sort: sort in SORTS ? (sort as ScreenSort) : "code",
  };
}

export interface ScreenExclusion {
  reason: string;
  count: number;
}

export type CompanyScreen =
  | { kind: "absent"; reason: OwnershipAbsence }
  | {
      kind: "list";
      month: PublishedMonth;
      previous: PublishedMonth | null;
      total: number;
      excluded: ScreenExclusion[];
      companies: CompanyFigures[];
    };

/** Figures for every company in the latest month, against the month before. */
export function latestFigures(snapshot: Snapshot): {
  month: PublishedMonth;
  previous: PublishedMonth | null;
  figures: CompanyFigures[];
} | null {
  const [month, previous] = snapshot.months;
  if (!month) return null;
  const now =
    snapshot.companies.get(month.recordDate) ?? new Map<string, CompanyMonth>();
  const before = previous
    ? snapshot.companies.get(previous.recordDate)
    : undefined;
  return {
    month,
    previous: previous ?? null,
    figures: [...now.values()].map((company) =>
      companyFigures(company, before?.get(company.shareCode)),
    ),
  };
}

const sorters: Record<
  ScreenSort,
  (a: CompanyFigures, b: CompanyFigures) => number
> = {
  code: (a, b) => a.shareCode.localeCompare(b.shareCode),
  "float-asc": (a, b) =>
    a.freeFloatUpperBoundHundredths - b.freeFloatUpperBoundHundredths ||
    a.shareCode.localeCompare(b.shareCode),
  "top-desc": (a, b) =>
    b.topHundredths - a.topHundredths || a.shareCode.localeCompare(b.shareCode),
  "hhi-desc": (a, b) => b.hhi - a.hhi || a.shareCode.localeCompare(b.shareCode),
  "holders-desc": (a, b) =>
    b.holders - a.holders || a.shareCode.localeCompare(b.shareCode),
};

/** The market page's ownership screen (PRD F9): our own data only. */
export function loadCompanyScreen(
  databasePath: string,
  filters: ScreenFilters,
): CompanyScreen {
  const snapshot = loadSnapshot(databasePath);
  const latest = snapshot ? latestFigures(snapshot) : null;
  if (!latest) return { kind: "absent", reason: "no_published_month" };

  const usesFloat =
    filters.floatMin !== null ||
    filters.floatMax !== null ||
    filters.sort === "float-asc";
  const query = filters.query.toUpperCase();
  let incomplete = 0;
  let noPrevious = 0;
  const companies = latest.figures.filter((company) => {
    if (
      query &&
      !company.shareCode.includes(query) &&
      !company.issuerName.toUpperCase().includes(query)
    ) {
      return false;
    }
    if (filters.topMin !== null && company.topHundredths < filters.topMin)
      return false;
    if (filters.type && !company.types.includes(filters.type)) return false;
    if (filters.foreign && company.foreignHundredths === 0) return false;
    if (filters.changed) {
      if (!company.changes) {
        noPrevious += 1;
        return false;
      }
      const { entered, exited, increased, decreased } = company.changes;
      if (
        entered.length + exited.length + increased.length + decreased.length ===
        0
      )
        return false;
    }
    if (usesFloat && company.registerIncomplete) {
      incomplete += 1;
      return false;
    }
    if (
      filters.floatMin !== null &&
      company.freeFloatUpperBoundHundredths < filters.floatMin
    ) {
      return false;
    }
    if (
      filters.floatMax !== null &&
      company.freeFloatUpperBoundHundredths >= filters.floatMax
    ) {
      return false;
    }
    return true;
  });
  companies.sort(sorters[filters.sort]);
  const excluded: ScreenExclusion[] = [];
  if (incomplete > 0) {
    excluded.push({
      reason:
        "register incomplete: holders above 1% total under 15%, so no float figure",
      count: incomplete,
    });
  }
  if (noPrevious > 0) {
    excluded.push({
      reason: latest.previous
        ? "not in the previous month's register, so no change to compare"
        : "no previous month is published",
      count: noPrevious,
    });
  }
  return {
    kind: "list",
    month: latest.month,
    previous: latest.previous,
    total: latest.figures.length,
    excluded,
    companies,
  };
}

export type ChangesSlice =
  | { kind: "absent"; reason: OwnershipAbsence }
  | { kind: "changes"; previous: PublishedMonth; changes: MonthChanges };

export type TickerOwnership =
  | { kind: "absent"; reason: OwnershipAbsence; month: PublishedMonth | null }
  | {
      kind: "ownership";
      month: PublishedMonth;
      figures: CompanyFigures;
      holdings: PublishedHolding[];
      changes: ChangesSlice;
    };

/** The ticker page's ownership section (PRD F2, F3). */
export function loadTickerOwnership(
  databasePath: string,
  shareCode: string,
): TickerOwnership {
  const snapshot = loadSnapshot(databasePath);
  const [month, previous] = snapshot?.months ?? [];
  if (!snapshot || !month) {
    return { kind: "absent", reason: "no_published_month", month: null };
  }
  const company = snapshot.companies.get(month.recordDate)?.get(shareCode);
  if (!company) return { kind: "absent", reason: "not_in_register", month };
  const before = previous
    ? snapshot.companies.get(previous.recordDate)?.get(shareCode)
    : undefined;
  return {
    kind: "ownership",
    month,
    figures: companyFigures(company, before),
    holdings: company.holdings,
    // A company absent from the previous register (a new listing, or one
    // whose holders were all below 1%) shows every holder as new.
    changes: previous
      ? {
          kind: "changes",
          previous,
          changes: compareMonths(company.holdings, before?.holdings ?? []),
        }
      : { kind: "absent", reason: "no_previous_month" },
  };
}
