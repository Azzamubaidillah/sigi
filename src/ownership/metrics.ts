import { holderKey } from "./holder-names";

/**
 * Figures derived from one issuer's >1% holders (PRD F2, F3). Percentages are
 * the publisher's, in hundredths of a percent, so every sum here is exact.
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

/** One holder's position in one issuer: its rows summed under `holderKey`. */
export interface Position {
  key: string;
  /** The first spelling published for this holder in this issuer. */
  investorName: string;
  investorType: string | null;
  shares: number;
  hundredths: number;
}

/**
 * Rows grouped by holder. A holder published on two rows of one issuer
 * (separate accounts, or two spellings merged by a reviewed alias) is one
 * position, because ownership thresholds apply to the holder, not the row.
 */
export function positionsOf(holdings: readonly Holding[]): Position[] {
  const positions = new Map<string, Position>();
  for (const holding of holdings) {
    const key = holderKey(holding.investorName);
    const position = positions.get(key);
    if (position) {
      position.shares += holding.sharesTotal;
      position.hundredths += holding.percentHundredths;
    } else {
      positions.set(key, {
        key,
        investorName: holding.investorName,
        investorType: holding.investorType,
        shares: holding.sharesTotal,
        hundredths: holding.percentHundredths,
      });
    }
  }
  return [...positions.values()];
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
  const percents = positionsOf(holdings)
    .map((position) => position.hundredths)
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

/** The threshold at and above which a holder's shares are never free float. */
export const MAJOR_HOLDER_HUNDREDTHS = 500;

/**
 * Free float under the exchange's definition, as far as the register can see:
 * 100% minus every holder of 5% or more (Peraturan Bursa I-A). The official
 * figure also excludes shares below 5% held by the controller's affiliates,
 * directors, commissioners, treasury and lock-ups, which the register does not
 * identify. So the official figure is this or lower: an upper bound (D-017).
 */
export function freeFloatUpperBoundHundredths(
  holdings: readonly Holding[],
): number {
  const major = positionsOf(holdings)
    .filter((position) => position.hundredths >= MAJOR_HOLDER_HUNDREDTHS)
    .reduce((total, position) => total + position.hundredths, 0);
  return Math.max(0, 10_000 - major);
}

/**
 * What holders below 1% hold together: what the register leaves unaccounted
 * for. Not a free-float figure (holders of 1–5% count as free float unless
 * they are insiders), but the dispersed part of the register.
 */
export function heldBelowOnePercentHundredths(
  holdings: readonly Holding[],
): number {
  return Math.max(0, 10_000 - concentration(holdings).sumHundredths);
}

/**
 * Below this total for all >1% holders, the register is treated as incomplete
 * for the company: in the 2026-02-27 file every company under it (BBRI, ADHI,
 * BBNI, BBTN, NCKL) is missing a known controlling holder (D-019).
 */
export const LOW_COVERAGE_HUNDREDTHS = 1_500;

export interface HolderChange {
  key: string;
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

/**
 * Month-over-month movement among >1% holders, matched by `holderKey`. A
 * holder crossing 1% in either direction shows as entered or exited, because
 * the source cannot see below it.
 */
export function compareMonths(
  current: readonly Holding[],
  previous: readonly Holding[],
): MonthChanges {
  const after = new Map(positionsOf(current).map((p) => [p.key, p]));
  const before = new Map(positionsOf(previous).map((p) => [p.key, p]));
  const changes: MonthChanges = {
    entered: [],
    exited: [],
    increased: [],
    decreased: [],
    unchanged: 0,
  };
  for (const [key, position] of after) {
    const prior = before.get(key);
    const change: HolderChange = {
      key,
      investorName: position.investorName,
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
  for (const [key, position] of before) {
    if (after.has(key)) continue;
    changes.exited.push({
      key,
      investorName: position.investorName,
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
