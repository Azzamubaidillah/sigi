import {
  FREE_FLOAT_MINIMUM_HUNDREDTHS,
  INTERIM_MINIMUM_HUNDREDTHS,
  OFFICIAL_COUNTS,
  type OfficialCount,
  possibleTranches,
  type Tranche,
} from "../investability/rule";
import {
  type CompanyFigures,
  companyFigures,
  latestFigures,
} from "./ownership";
import { loadSnapshot, type PublishedMonth } from "./snapshot";

/** Bands of the free-float upper bound, in hundredths; `max` is exclusive. */
export const BANDS = [
  { id: "under-5", min: 0, max: 500 },
  {
    id: "5-to-12.5",
    min: 500,
    max: INTERIM_MINIMUM_HUNDREDTHS,
  },
  {
    id: "12.5-to-15",
    min: INTERIM_MINIMUM_HUNDREDTHS,
    max: FREE_FLOAT_MINIMUM_HUNDREDTHS,
  },
  {
    id: "15-to-25",
    min: FREE_FLOAT_MINIMUM_HUNDREDTHS,
    max: 2_500,
  },
  { id: "25-to-50", min: 2_500, max: 5_000 },
  { id: "50-up", min: 5_000, max: null },
] as const;

export interface BandCount {
  id: (typeof BANDS)[number]["id"];
  count: number;
  /** The market page's screen for this band. */
  screenQuery: string;
}

export interface BelowMinimumRow {
  shareCode: string;
  issuerName: string;
  upperBoundHundredths: number;
  possibleTranches: Tranche[];
  /** The bound a month earlier, when the company was in that register. */
  previousUpperBoundHundredths: number | null;
}

export type Investability =
  | { kind: "absent" }
  | {
      kind: "ready";
      month: PublishedMonth;
      previous: PublishedMonth | null;
      companies: number;
      /** Registers listing under 15% above 1%: no float figure is given (D-019). */
      incomplete: CompanyFigures[];
      bands: BandCount[];
      /** Complete registers whose bound is under 15%: certainly below the minimum. */
      belowMinimum: BelowMinimumRow[];
      /** Crossed the 15% line between the two months, in either direction. */
      crossedUp: string[];
      crossedDown: string[];
      /** The official count dated nearest the record date. */
      official: OfficialCount;
      /** The latest official count of any date (may be the same one). */
      latestOfficial: OfficialCount;
    };

function bandOf(upperBound: number): BandCount["id"] {
  return (
    BANDS.find((band) => band.max === null || upperBound < band.max) ??
    BANDS[BANDS.length - 1]
  ).id;
}

/** floatMin/floatMax for the market page's screen, in percent. */
function screenQuery(band: (typeof BANDS)[number]): string {
  const params = new URLSearchParams({ sort: "float-asc" });
  if (band.min > 0) params.set("floatMin", String(band.min / 100));
  if (band.max !== null) params.set("floatMax", String(band.max / 100));
  return params.toString();
}

export function loadInvestability(databasePath: string): Investability {
  const snapshot = loadSnapshot(databasePath);
  const latest = snapshot ? latestFigures(snapshot) : null;
  if (!snapshot || !latest) return { kind: "absent" };

  const incomplete = latest.figures.filter((c) => c.registerIncomplete);
  const complete = latest.figures.filter((c) => !c.registerIncomplete);
  const counts = new Map<string, number>();
  for (const company of complete) {
    const id = bandOf(company.freeFloatUpperBoundHundredths);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const priorCompanies = latest.previous
    ? snapshot.companies.get(latest.previous.recordDate)
    : undefined;
  const before = priorCompanies
    ? new Map(
        [...priorCompanies.values()].map((c) => [
          c.shareCode,
          companyFigures(c, undefined),
        ]),
      )
    : null;
  const belowMinimum = complete
    .filter(
      (c) => c.freeFloatUpperBoundHundredths < FREE_FLOAT_MINIMUM_HUNDREDTHS,
    )
    .map((c) => ({
      shareCode: c.shareCode,
      issuerName: c.issuerName,
      upperBoundHundredths: c.freeFloatUpperBoundHundredths,
      possibleTranches: possibleTranches(c.freeFloatUpperBoundHundredths),
      previousUpperBoundHundredths:
        before?.get(c.shareCode)?.freeFloatUpperBoundHundredths ?? null,
    }))
    .sort(
      (a, b) =>
        a.upperBoundHundredths - b.upperBoundHundredths ||
        a.shareCode.localeCompare(b.shareCode),
    );

  const crossedUp: string[] = [];
  const crossedDown: string[] = [];
  if (before) {
    for (const company of complete) {
      const prior = before.get(company.shareCode);
      if (!prior || prior.registerIncomplete) continue;
      const was =
        prior.freeFloatUpperBoundHundredths < FREE_FLOAT_MINIMUM_HUNDREDTHS;
      const is =
        company.freeFloatUpperBoundHundredths < FREE_FLOAT_MINIMUM_HUNDREDTHS;
      if (was && !is) crossedUp.push(company.shareCode);
      if (!was && is) crossedDown.push(company.shareCode);
    }
  }

  const dated = [...OFFICIAL_COUNTS].sort((a, b) =>
    b.asOf.localeCompare(a.asOf),
  );
  const distance = (count: OfficialCount) =>
    Math.abs(Date.parse(count.asOf) - Date.parse(latest.month.recordDate));
  const nearest = dated.reduce((best, count) =>
    distance(count) < distance(best) ? count : best,
  );
  return {
    kind: "ready",
    month: latest.month,
    previous: latest.previous,
    companies: latest.figures.length,
    incomplete,
    bands: BANDS.map((band) => ({
      id: band.id,
      count: counts.get(band.id) ?? 0,
      screenQuery: screenQuery(band),
    })),
    belowMinimum,
    crossedUp,
    crossedDown,
    official: nearest,
    latestOfficial: dated[0],
  };
}
