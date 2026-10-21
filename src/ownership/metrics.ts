/**
 * Figures derived from one issuer's >1% holders (PRD F2). Percentages are the
 * publisher's, in hundredths of a percent, so every sum here is exact.
 */

export interface Holding {
  rowNumber: number;
  investorName: string;
  investorType: string | null;
  localForeign: string | null;
  sharesScripless: number;
  sharesScrip: number;
  sharesTotal: number;
  percentHundredths: number;
}

export interface Concentration {
  holders: number;
  /** Largest single holder, hundredths of a percent. */
  topHundredths: number;
  /** Three largest holders together, hundredths of a percent. */
  topThreeHundredths: number;
  /** All >1% holders together, hundredths of a percent. */
  sumHundredths: number;
  /**
   * Herfindahl–Hirschman index over the >1% holders, in percent squared
   * (0–10,000). Holders under 1% are invisible to the source, so this is a
   * lower bound on the index across all shareholders.
   */
  hhi: number;
}

export function concentration(holdings: readonly Holding[]): Concentration {
  const percents = holdings
    .map((holding) => holding.percentHundredths)
    .sort((a, b) => b - a);
  const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);
  return {
    holders: percents.length,
    topHundredths: percents[0] ?? 0,
    topThreeHundredths: sum(percents.slice(0, 3)),
    sumHundredths: sum(percents),
    // (h / 100)² summed, computed as Σh² / 10⁴ so the sum stays in integers.
    hhi: sum(percents.map((value) => value * value)) / 10_000,
  };
}

/**
 * The share of the company held by holders below 1%: what the register leaves
 * unaccounted for. It is an estimate of free float, not the official figure,
 * which also excludes controllers, affiliates, directors and treasury shares
 * that may sit below 1% (PRD F2). Never negative: rounding can take the sum of
 * published percentages a little past 100.
 */
export function floatEstimateHundredths(holdings: readonly Holding[]): number {
  return Math.max(0, 10_000 - concentration(holdings).sumHundredths);
}

export interface HolderChange {
  investorName: string;
  investorType: string | null;
  beforeShares: number | null;
  afterShares: number | null;
  beforeHundredths: number | null;
  afterHundredths: number | null;
}

export interface MonthChanges {
  entered: HolderChange[];
  exited: HolderChange[];
  increased: HolderChange[];
  decreased: HolderChange[];
  unchanged: number;
}

interface Position {
  investorType: string | null;
  shares: number;
  hundredths: number;
}

/**
 * Positions keyed by the holder's name exactly as published. A name that
 * appears twice for one issuer (separate accounts) is one holder here.
 */
function byName(holdings: readonly Holding[]): Map<string, Position> {
  const positions = new Map<string, Position>();
  for (const holding of holdings) {
    const position = positions.get(holding.investorName);
    if (position) {
      position.shares += holding.sharesTotal;
      position.hundredths += holding.percentHundredths;
    } else {
      positions.set(holding.investorName, {
        investorType: holding.investorType,
        shares: holding.sharesTotal,
        hundredths: holding.percentHundredths,
      });
    }
  }
  return positions;
}

/**
 * Month-over-month movement among >1% holders. Matching is by exact name, so
 * a holder the publisher respells shows as one exit and one entry; a holder
 * crossing 1% in either direction shows the same way, because the source
 * cannot see below it.
 */
export function compareMonths(
  current: readonly Holding[],
  previous: readonly Holding[],
): MonthChanges {
  const after = byName(current);
  const before = byName(previous);
  const changes: MonthChanges = {
    entered: [],
    exited: [],
    increased: [],
    decreased: [],
    unchanged: 0,
  };
  for (const [name, position] of after) {
    const prior = before.get(name);
    const change: HolderChange = {
      investorName: name,
      investorType: position.investorType,
      beforeShares: prior?.shares ?? null,
      afterShares: position.shares,
      beforeHundredths: prior?.hundredths ?? null,
      afterHundredths: position.hundredths,
    };
    if (!prior) changes.entered.push(change);
    else if (position.shares > prior.shares) changes.increased.push(change);
    else if (position.shares < prior.shares) changes.decreased.push(change);
    else changes.unchanged += 1;
  }
  for (const [name, position] of before) {
    if (after.has(name)) continue;
    changes.exited.push({
      investorName: name,
      investorType: position.investorType,
      beforeShares: position.shares,
      afterShares: null,
      beforeHundredths: position.hundredths,
      afterHundredths: null,
    });
  }
  const bySize = (a: HolderChange, b: HolderChange) =>
    Math.abs((b.afterShares ?? 0) - (b.beforeShares ?? 0)) -
    Math.abs((a.afterShares ?? 0) - (a.beforeShares ?? 0));
  changes.entered.sort(bySize);
  changes.exited.sort(bySize);
  changes.increased.sort(bySize);
  changes.decreased.sort(bySize);
  return changes;
}
