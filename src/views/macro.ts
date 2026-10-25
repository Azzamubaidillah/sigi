import { readDatabase } from "../db/read";
import type { Text } from "../i18n/define";
import type { Lang } from "../i18n/lang";
import { feedOf } from "../macro/feeds";
import type { Observation } from "../macro/parse";
import {
  GROUPS,
  type GroupId,
  type ReleaseRule,
  SERIES,
  type SeriesDefinition,
  type SeriesId,
} from "../macro/series";

export type MacroAbsence = "not_fetched" | "fetch_failed" | "rejected";

export interface NextRelease {
  /** YYYY-MM-DD; always an expectation from the usual cadence, never an announcement. */
  date: string;
  /** "around" for releases with no fixed day. */
  approximate: boolean;
  /** The expected date has passed and nothing newer has been seen. */
  late: boolean;
}

export interface SeriesFigures {
  latest: Observation;
  previous: Observation | null;
  /** latest − previous, in the series' unit: Sigi's calculation. */
  change: number | null;
  /** Percentage change on the observation a year earlier: Sigi's calculation. */
  yoy: { percent: number; against: string } | null;
  /** The last year of observations, for the chart. */
  history: Observation[];
  latestSeenAt: number;
  sourceUrl: string;
  accessedOn: string;
  nextRelease: NextRelease;
}

export type SeriesCard = { id: SeriesId; definition: SeriesDefinition } & (
  | { kind: "absent"; reason: MacroAbsence; detail: string | null }
  | ({ kind: "series" } & SeriesFigures)
);

export interface MacroGroup {
  id: GroupId;
  title: Text;
  sectorIndices: readonly string[];
  cards: SeriesCard[];
}

const iso = (date: Date): string => date.toISOString().slice(0, 10);

function jakartaToday(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    now,
  );
}

/** The first day of the month `months` after a YYYY-MM(-DD) period. */
function monthStart(period: string, months: number): Date {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1));
}

function isWeekday(date: Date): boolean {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * When the next value should appear, from the source's usual cadence
 * (holidays ignored, so always labelled as expected).
 */
export function nextRelease(
  rule: ReleaseRule,
  latestPeriod: string,
  now: number,
): NextRelease {
  const today = jakartaToday(now);
  const todayDate = new Date(`${today}T00:00:00Z`);
  let date: Date;
  let approximate = false;
  switch (rule.kind) {
    case "business-daily": {
      date = addDays(todayDate, 1);
      while (!isWeekday(date)) date = addDays(date, 1);
      return { date: iso(date), approximate: false, late: false };
    }
    case "weekly": {
      date = addDays(todayDate, 1);
      while (date.getUTCDay() !== rule.weekday) date = addDays(date, 1);
      return { date: iso(date), approximate: false, late: false };
    }
    case "meeting": {
      // About a month after the last decision.
      const [year, month, day] = latestPeriod.split("-").map(Number);
      date = new Date(Date.UTC(year, month, day));
      approximate = true;
      break;
    }
    case "monthly": {
      // The period after the latest is released in the month after it.
      const releaseMonth = monthStart(latestPeriod, 2);
      if ("businessDay" in rule) {
        date = releaseMonth;
        let counted = isWeekday(date) ? 1 : 0;
        while (counted < rule.businessDay) {
          date = addDays(date, 1);
          if (isWeekday(date)) counted += 1;
        }
      } else {
        date = new Date(
          Date.UTC(
            releaseMonth.getUTCFullYear(),
            releaseMonth.getUTCMonth(),
            rule.aroundDay,
          ),
        );
        approximate = true;
      }
      break;
    }
  }
  return { date: iso(date), approximate, late: iso(date) < today };
}

/** The observation a year before `latest`: the same month, or the last day on or before. */
function yearEarlier(
  observations: readonly Observation[],
  latest: Observation,
): Observation | null {
  const [year, month, day] = latest.period.split("-");
  const target =
    day === undefined
      ? `${Number(year) - 1}-${month}`
      : `${Number(year) - 1}-${month}-${day}`;
  if (day === undefined)
    return observations.find((o) => o.period === target) ?? null;
  const found = [...observations].reverse().find((o) => o.period <= target);
  // A daily series with a gap of more than a week there has no comparable point.
  if (!found) return null;
  const gap =
    (Date.parse(`${target}T00:00:00Z`) -
      Date.parse(`${found.period}T00:00:00Z`)) /
    86_400_000;
  return gap <= 7 ? found : null;
}

/** Figures for one series from its observations, oldest first. */
export function seriesFigures(
  definition: SeriesDefinition,
  observations: readonly Observation[],
  context: {
    latestSeenAt: number;
    sourceUrl: string;
    accessedOn: string;
    now: number;
  },
): SeriesFigures {
  const latest = observations[observations.length - 1];
  const previous =
    observations.length > 1 ? observations[observations.length - 2] : null;
  const earlier =
    definition.derived === "yoy" ? yearEarlier(observations, latest) : null;
  const [year, month, day] = latest.period.split("-");
  const windowStart =
    day === undefined
      ? `${Number(year) - 1}-${month}`
      : `${Number(year) - 1}-${month}-${day}`;
  return {
    latest,
    previous,
    change: previous ? latest.value - previous.value : null,
    yoy:
      earlier && earlier.value !== 0
        ? {
            percent: (latest.value / earlier.value - 1) * 100,
            against: earlier.period,
          }
        : null,
    history: observations.filter((o) => o.period >= windowStart),
    latestSeenAt: context.latestSeenAt,
    sourceUrl: context.sourceUrl,
    accessedOn: context.accessedOn,
    nextRelease: nextRelease(definition.release, latest.period, context.now),
  };
}

/** Every group with a card per series: figures, or the typed reason there are none. */
export function loadMacro(
  databasePath: string,
  now = Date.now(),
): MacroGroup[] {
  const cards =
    readDatabase(databasePath, (sqlite) => {
      const published = sqlite.prepare(
        `SELECT m.latest_seen_at AS latestSeenAt, f.source_url AS sourceUrl, f.accessed_on AS accessedOn
           FROM macro_series m
           JOIN import_runs r ON r.id = m.import_run_id
           JOIN source_files f ON f.sha256 = r.file_sha256
          WHERE m.series_id = ?`,
      );
      const observations = sqlite.prepare(
        "SELECT period, value FROM macro_observations WHERE series_id = ? ORDER BY period",
      );
      const lastRun = sqlite.prepare(
        "SELECT outcome, error FROM fetch_runs WHERE feed = ? ORDER BY id DESC LIMIT 1",
      );
      return (Object.entries(SERIES) as [SeriesId, SeriesDefinition][]).map(
        ([id, definition]): SeriesCard => {
          const row = published.get(id) as
            | { latestSeenAt: number; sourceUrl: string; accessedOn: string }
            | undefined;
          if (row) {
            return {
              id,
              definition,
              kind: "series",
              ...seriesFigures(
                definition,
                observations.all(id) as Observation[],
                { ...row, now },
              ),
            };
          }
          const feed = feedOf(id);
          const run = lastRun.get(feed) as
            { outcome: string; error: string | null } | undefined;
          if (!run)
            return {
              id,
              definition,
              kind: "absent",
              reason: "not_fetched",
              detail: null,
            };
          if (run.outcome === "failed")
            return {
              id,
              definition,
              kind: "absent",
              reason: "fetch_failed",
              detail: run.error,
            };
          return {
            id,
            definition,
            kind: "absent",
            reason: "rejected",
            detail: null,
          };
        },
      );
    }) ?? [];
  const byId = new Map(cards.map((card) => [card.id, card]));
  return (Object.entries(GROUPS) as [GroupId, (typeof GROUPS)[GroupId]][]).map(
    ([id, group]) => ({
      id,
      title: group.title,
      sectorIndices: group.sectorIndices,
      cards: (Object.keys(SERIES) as SeriesId[])
        .filter((series) => SERIES[series].group === id)
        .map(
          (series) =>
            byId.get(series) ?? {
              id: series,
              definition: SERIES[series],
              kind: "absent" as const,
              reason: "not_fetched" as const,
              detail: null,
            },
        ),
    }),
  );
}

/** "2026-09" → "Sep 2026"; "2026-10-21" → "21 Oct 2026" (Indonesian: "Sep 2026", "21 Okt 2026"). */
export function formatPeriod(period: string, lang: Lang = "en"): string {
  const [year, month, day] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day ?? 1));
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    timeZone: "UTC",
    ...(day === undefined ? {} : { day: "numeric" }),
    month: "short",
    year: "numeric",
  }).format(date);
}
