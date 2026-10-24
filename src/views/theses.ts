import type Database from "better-sqlite3";

import type { SigiConfig } from "../config";
import { SERIES } from "../macro/series";
import { holderKey } from "../ownership/holder-names";
import type { SourceId } from "../sources/register";
import type { CheckStatus, Condition } from "../theses/conditions";
import { diffLines, type DiffResult } from "../theses/diff";
import {
  parseThesis,
  readThesisMarkdown,
  thesisSlugs,
  thesisVersions,
  VERSION_PATTERN,
} from "../theses/folder";
import type { ThesisHeader } from "../theses/header";
import type { ThesisBlock } from "../theses/markdown";
import { readDatabase } from "../db/read";
import { loadHolderLinks } from "./holders";

/**
 * Theses (PRD F7): the files in `theses/`, with the worker's latest check of
 * each condition. Pages show the stored checks; nothing is evaluated per
 * request, so what a page shows is what the worker recorded, with its date.
 */

export interface ConditionCheck {
  status: CheckStatus;
  detail: string;
  checkedOn: string;
  /** First day of the current unbroken run of "met"; null unless met. */
  metSince: string | null;
}

export interface ConditionRow {
  condition: Condition;
  /** The latest recorded check; null before the worker has checked it. */
  check: ConditionCheck | null;
  /** Register entry of the figure the condition reads. */
  source: SourceId | null;
  /** The holder's page, for an ownership condition naming an institution. */
  holderSlug: string | null;
}

export interface ThesisSummary {
  slug: string;
  /** The version shown (the newest unless one was asked for). */
  version: string;
  /** Newest first. */
  versions: string[];
  header: ThesisHeader | null;
  headerError: string | null;
  /** Checks are attached only to the current version's conditions. */
  conditions: ConditionRow[] | null;
  conditionsError: string | null;
}

export interface ConditionHit {
  slug: string;
  title: string;
  condition: Condition;
  detail: string;
  metSince: string;
}

export interface ThesesIndex {
  theses: ThesisSummary[];
  /** Met conditions of active theses, newest first: the head of the page. */
  hits: ConditionHit[];
  /** The latest day any condition was checked, or null if never. */
  lastCheckedOn: string | null;
}

export interface ThesisDetail {
  summary: ThesisSummary;
  current: boolean;
  blocks: ThesisBlock[];
  /** The version before the one shown, and the diff from it. */
  previous: string | null;
  diff: DiffResult | null;
}

function sourceOf(condition: Condition): SourceId | null {
  switch (condition.kind) {
    case "ownership":
    case "float":
      return "S1";
    case "macro":
      return SERIES[condition.seriesId].source;
    case "date":
    case "price":
      return null;
  }
}

interface CheckRow {
  condition: string;
  status: CheckStatus;
  detail: string;
  checkedOn: string;
  lastOther: string | null;
}

function latestChecks(
  sqlite: Database.Database,
  slug: string,
): Map<string, ConditionCheck> {
  const rows = sqlite
    .prepare(
      `SELECT t.condition, t.status, t.detail, t.checked_on AS checkedOn,
              (SELECT MAX(o.checked_on) FROM thesis_checks o
                WHERE o.slug = t.slug AND o.condition = t.condition
                  AND o.status <> 'met') AS lastOther
         FROM thesis_checks t
        WHERE t.slug = ?
          AND t.checked_on = (SELECT MAX(l.checked_on) FROM thesis_checks l
                               WHERE l.slug = t.slug AND l.condition = t.condition)`,
    )
    .all(slug) as CheckRow[];
  const firstMetStatement = sqlite.prepare(
    `SELECT MIN(checked_on) AS day FROM thesis_checks
      WHERE slug = ? AND condition = ? AND status = 'met' AND checked_on > ?`,
  );
  const firstMet = (row: CheckRow): string => {
    // An aggregate always returns one row; better-sqlite3 leaves it untyped.
    const found = firstMetStatement.get(
      slug,
      row.condition,
      row.lastOther ?? "",
    ) as { day: string | null };
    return found.day ?? row.checkedOn;
  };
  return new Map(
    rows.map((row) => [
      row.condition,
      {
        status: row.status,
        detail: row.detail,
        checkedOn: row.checkedOn,
        metSince: row.status === "met" ? firstMet(row) : null,
      },
    ]),
  );
}

function summaryOf(
  config: SigiConfig,
  slug: string,
  versions: string[],
  version: string,
  holderLinks: ReadonlyMap<string, string>,
): { summary: ThesisSummary; blocks: ThesisBlock[] } | null {
  const markdown = readThesisMarkdown(config.thesesDirectory, slug, version);
  if (markdown === null) return null;
  const parsed = parseThesis(markdown);
  const current = version === versions[0];
  const checks = current
    ? (readDatabase(config.databasePath, (sqlite) =>
        latestChecks(sqlite, slug),
      ) ?? new Map<string, ConditionCheck>())
    : new Map<string, ConditionCheck>();
  return {
    summary: {
      slug,
      version,
      versions,
      header: parsed.header,
      headerError: parsed.headerError,
      conditions:
        parsed.conditions?.map((condition) => ({
          condition,
          check: checks.get(condition.text) ?? null,
          source: sourceOf(condition),
          holderSlug:
            condition.kind === "ownership"
              ? (holderLinks.get(holderKey(condition.holder)) ?? null)
              : null,
        })) ?? null,
      conditionsError: parsed.conditionsError,
    },
    blocks: parsed.blocks,
  };
}

export function loadTheses(config: SigiConfig): ThesesIndex {
  const holderLinks = loadHolderLinks(config.databasePath);
  const theses: ThesisSummary[] = [];
  for (const slug of thesisSlugs(config.thesesDirectory)) {
    const versions = thesisVersions(config.thesesDirectory, slug);
    const read = summaryOf(config, slug, versions, versions[0]!, holderLinks);
    if (read) theses.push(read.summary);
  }
  const hits: ConditionHit[] = theses
    .flatMap((thesis) => {
      const header = thesis.header;
      if (header?.status !== "active") return [];
      return (thesis.conditions ?? []).flatMap(({ condition, check }) =>
        check?.status === "met"
          ? [
              {
                slug: thesis.slug,
                title: header.title,
                condition,
                detail: check.detail,
                metSince: check.metSince ?? check.checkedOn,
              },
            ]
          : [],
      );
    })
    .sort(
      (a, b) =>
        b.metSince.localeCompare(a.metSince) || a.slug.localeCompare(b.slug),
    );
  const days = theses.flatMap((thesis) =>
    (thesis.conditions ?? []).flatMap((row) =>
      row.check ? [row.check.checkedOn] : [],
    ),
  );
  return {
    theses,
    hits,
    lastCheckedOn: days.length > 0 ? days.sort().reverse()[0]! : null,
  };
}

/**
 * One version of one thesis, or null for an unknown slug or version. Neither
 * is used to build a path before it has matched its pattern and been found in
 * the folder listing.
 */
export function loadThesis(
  config: SigiConfig,
  slug: string,
  version: string | null,
): ThesisDetail | null {
  const versions = thesisVersions(config.thesesDirectory, slug);
  if (versions.length === 0) return null;
  const shown = version ?? versions[0]!;
  if (!VERSION_PATTERN.test(shown) || !versions.includes(shown)) return null;
  const read = summaryOf(
    config,
    slug,
    versions,
    shown,
    loadHolderLinks(config.databasePath),
  );
  if (!read) return null;
  const previous = versions[versions.indexOf(shown) + 1] ?? null;
  const before =
    previous === null
      ? null
      : readThesisMarkdown(config.thesesDirectory, slug, previous);
  const after = readThesisMarkdown(config.thesesDirectory, slug, shown);
  return {
    summary: read.summary,
    current: shown === versions[0],
    blocks: read.blocks,
    previous,
    diff: before !== null && after !== null ? diffLines(before, after) : null,
  };
}

export interface TickerThesis {
  slug: string;
  title: string;
  status: ThesisHeader["status"];
  summary: string;
}

/** Readable theses naming a ticker, for its page (PRD F8). */
export function thesesForTicker(
  config: SigiConfig,
  shareCode: string,
): TickerThesis[] {
  const out: TickerThesis[] = [];
  for (const slug of thesisSlugs(config.thesesDirectory)) {
    const version = thesisVersions(config.thesesDirectory, slug)[0]!;
    const markdown = readThesisMarkdown(config.thesesDirectory, slug, version);
    const header = markdown === null ? null : parseThesis(markdown).header;
    if (header?.tickers.includes(shareCode)) {
      out.push({
        slug,
        title: header.title,
        status: header.status,
        summary: header.summary,
      });
    }
  }
  return out;
}
