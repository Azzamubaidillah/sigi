import { createHash } from "node:crypto";

import {
  holderKey,
  holderSlug,
  mayHaveHolderPage,
} from "../ownership/holder-names";
import { positionsOf } from "../ownership/metrics";
import { loadSnapshot, type PublishedMonth, type Snapshot } from "./snapshot";

export interface HolderPosition {
  shareCode: string;
  issuerName: string;
  hundredths: number;
  shares: number;
}

interface HolderRecord {
  key: string;
  types: Set<string | null>;
  domiciles: Set<string>;
  spellings: Set<string>;
  /** Per month (record date), positions by share code. */
  months: Map<string, Map<string, HolderPosition>>;
}

interface HolderRegistry {
  records: Map<string, HolderRecord>;
  /** Only holders that may have a page (PRD C6). */
  slugs: Map<string, string>;
  keysBySlug: Map<string, string>;
}

const registries = new WeakMap<Snapshot, HolderRegistry>();

function registryOf(snapshot: Snapshot): HolderRegistry {
  const cached = registries.get(snapshot);
  if (cached) return cached;
  const records = new Map<string, HolderRecord>();
  for (const [recordDate, companies] of snapshot.companies) {
    for (const company of companies.values()) {
      for (const holding of company.holdings) {
        const key = holderKey(holding.investorName);
        let record = records.get(key);
        if (!record) {
          records.set(
            key,
            (record = {
              key,
              types: new Set(),
              domiciles: new Set(),
              spellings: new Set(),
              months: new Map(),
            }),
          );
        }
        record.types.add(holding.investorType);
        if (holding.domicile) record.domiciles.add(holding.domicile);
        record.spellings.add(holding.investorName);
      }
      for (const position of positionsOf(company.holdings)) {
        const record = records.get(position.key)!;
        let month = record.months.get(recordDate);
        if (!month) record.months.set(recordDate, (month = new Map()));
        month.set(company.shareCode, {
          shareCode: company.shareCode,
          issuerName: company.issuerName,
          hundredths: position.hundredths,
          shares: position.shares,
        });
      }
    }
  }
  // Two keys can share a readable slug ("A&B" and "A B"); then both get a
  // short hash so neither page can shadow the other.
  const bySlug = new Map<string, string[]>();
  for (const record of records.values()) {
    if (!mayHaveHolderPage(record.types)) continue;
    const slug = holderSlug(record.key) || "holder";
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), record.key]);
  }
  const slugs = new Map<string, string>();
  for (const [slug, keys] of bySlug) {
    for (const key of keys) {
      slugs.set(
        key,
        keys.length === 1
          ? slug
          : `${slug}-${createHash("sha256").update(key).digest("hex").slice(0, 6)}`,
      );
    }
  }
  const registry = {
    records,
    slugs,
    keysBySlug: new Map([...slugs].map(([key, slug]) => [slug, key])),
  };
  registries.set(snapshot, registry);
  return registry;
}

/** Holder key to page slug, for linking names on company pages. */
export function loadHolderLinks(
  databasePath: string,
): ReadonlyMap<string, string> {
  const snapshot = loadSnapshot(databasePath);
  return snapshot ? registryOf(snapshot).slugs : new Map();
}

export interface HolderSummary {
  slug: string;
  name: string;
  types: string[];
  companies: number;
  largest: HolderPosition;
}

export type HolderIndex =
  | { kind: "absent" }
  | {
      kind: "index";
      month: PublishedMonth;
      holders: HolderSummary[];
      /** Holders in the month without a page: individuals or unclassified. */
      withheld: number;
    };

function firstSpelling(record: HolderRecord): string {
  return [...record.spellings][0] ?? record.key;
}

export function loadHolderIndex(databasePath: string): HolderIndex {
  const snapshot = loadSnapshot(databasePath);
  const month = snapshot?.months[0];
  if (!snapshot || !month) return { kind: "absent" };
  const registry = registryOf(snapshot);
  const holders: HolderSummary[] = [];
  let withheld = 0;
  for (const record of registry.records.values()) {
    const positions = record.months.get(month.recordDate);
    if (!positions) continue;
    const slug = registry.slugs.get(record.key);
    if (!slug) {
      withheld += 1;
      continue;
    }
    const list = [...positions.values()];
    holders.push({
      slug,
      name: firstSpelling(record),
      types: [...record.types].filter((type): type is string => type !== null),
      companies: list.length,
      largest: list.reduce((a, b) => (b.hundredths > a.hundredths ? b : a)),
    });
  }
  holders.sort(
    (a, b) => b.companies - a.companies || a.name.localeCompare(b.name),
  );
  return { kind: "index", month, holders, withheld };
}

export interface HolderMove {
  shareCode: string;
  issuerName: string;
  beforeHundredths: number | null;
  afterHundredths: number | null;
  beforeShares: number | null;
  afterShares: number | null;
}

export interface HolderPage {
  month: PublishedMonth;
  previous: PublishedMonth | null;
  name: string;
  spellings: string[];
  types: string[];
  domiciles: string[];
  positions: HolderPosition[];
  /** Against the previous month; null when there is none. */
  moves: HolderMove[] | null;
}

/** A holder's page, or null when no page exists for the slug (404). */
export function loadHolder(
  databasePath: string,
  slug: string,
): HolderPage | null {
  const snapshot = loadSnapshot(databasePath);
  const [month, previous] = snapshot?.months ?? [];
  if (!snapshot || !month) return null;
  const registry = registryOf(snapshot);
  const key = registry.keysBySlug.get(slug);
  const record = key ? registry.records.get(key) : undefined;
  if (!record) return null;
  const now =
    record.months.get(month.recordDate) ?? new Map<string, HolderPosition>();
  const before = previous
    ? (record.months.get(previous.recordDate) ??
      new Map<string, HolderPosition>())
    : null;
  let moves: HolderMove[] | null = null;
  if (before) {
    moves = [];
    for (const code of new Set([...now.keys(), ...before.keys()])) {
      const after = now.get(code);
      const prior = before.get(code);
      if (after && prior && after.shares === prior.shares) continue;
      moves.push({
        shareCode: code,
        issuerName: (after ?? prior)!.issuerName,
        beforeHundredths: prior?.hundredths ?? null,
        afterHundredths: after?.hundredths ?? null,
        beforeShares: prior?.shares ?? null,
        afterShares: after?.shares ?? null,
      });
    }
    moves.sort((a, b) => a.shareCode.localeCompare(b.shareCode));
  }
  return {
    month,
    previous: previous ?? null,
    name: firstSpelling(record),
    spellings: [...record.spellings].sort(),
    types: [...record.types].filter((type): type is string => type !== null),
    domiciles: [...record.domiciles].sort(),
    positions: [...now.values()].sort((a, b) => b.hundredths - a.hundredths),
    moves,
  };
}
