import { createHash } from "node:crypto";

import type Database from "better-sqlite3";

import type { ImportOutcome } from "../db/schema";
import { type GateResult, outcomeOf } from "../imports/gate-result";
import { landFile } from "../imports/landing";
import { FEEDS, type FeedId } from "./feeds";
import type { Observation } from "./parse";
import { SERIES, type SeriesId } from "./series";

export interface FetchedFile {
  bytes: Uint8Array;
  originalName: string;
  sourceUrl: string;
  /** YYYY-MM-DD, Jakarta time. */
  accessedOn: string;
}

export type MacroImportResult =
  | {
      /**
       * Nothing to do: the file holds what is published already, or what an
       * earlier rejected run already judged. Nothing is landed or recorded.
       */
      kind: "unchanged";
    }
  | {
      kind: "imported";
      importRunId: number;
      outcome: ImportOutcome;
      parseError: string | null;
      gates: GateResult[];
    };

/** Fewest observations a file must carry for a series, by its frequency. */
const MINIMUM_OBSERVATIONS = { daily: 20, monthly: 12, meeting: 5 } as const;
/** A file may hold no fewer than this share of the published observations. */
const HISTORY_KEPT = 0.9;
/** Revisions to values older than this, before the latest period, are reported. */
const OLD_REVISION_MONTHS = 12;

/** SHA-256 over a series' observations in a fixed text form. */
export function seriesHash(
  series: SeriesId,
  observations: readonly Observation[],
): string {
  const hash = createHash("sha256").update(`${series}\n`);
  for (const { period, value } of observations)
    hash.update(`${period},${value}\n`);
  return hash.digest("hex");
}

interface Published {
  importRunId: number;
  contentHash: string;
  latestPeriod: string;
  latestSeenAt: number;
  observations: Map<string, number>;
}

function published(
  sqlite: Database.Database,
  series: SeriesId,
): Published | null {
  const row = sqlite
    .prepare(
      `SELECT import_run_id AS importRunId, content_hash AS contentHash,
              latest_period AS latestPeriod, latest_seen_at AS latestSeenAt
         FROM macro_series WHERE series_id = ?`,
    )
    .get(series) as Omit<Published, "observations"> | undefined;
  if (!row) return null;
  const observations = new Map(
    (
      sqlite
        .prepare(
          "SELECT period, value FROM macro_observations WHERE series_id = ?",
        )
        .all(series) as Observation[]
    ).map((o) => [o.period, o.value]),
  );
  return { ...row, observations };
}

/** The period `months` before a YYYY-MM or YYYY-MM-DD period, in the same form. */
function monthsBefore(period: string, months: number): string {
  const [year, month, day] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 - months, day ?? 1));
  const shifted = date.toISOString().slice(0, 10);
  return day === undefined ? shifted.slice(0, 7) : shifted;
}

function examples(items: string[]): string {
  return items.length > 4
    ? `${items.slice(0, 4).join("; ")}; and ${items.length - 4} more`
    : items.join("; ");
}

function runGates(
  parsed: Map<SeriesId, Observation[]>,
  current: Map<SeriesId, Published | null>,
  expected: readonly SeriesId[],
): GateResult[] {
  const missing: string[] = [];
  const outOfRange: string[] = [];
  const older: string[] = [];
  const shrunk: string[] = [];
  const revised: string[] = [];
  for (const series of expected) {
    const definition = SERIES[series];
    const observations = parsed.get(series) ?? [];
    const minimum = MINIMUM_OBSERVATIONS[definition.frequency];
    if (observations.length < minimum) {
      missing.push(
        `${series}: ${observations.length} observations, at least ${minimum} expected`,
      );
      continue;
    }
    for (const o of observations) {
      if (
        o.value < definition.plausible.min ||
        o.value > definition.plausible.max
      ) {
        outOfRange.push(`${series} ${o.period}: ${o.value} ${definition.unit}`);
      }
    }
    const before = current.get(series);
    if (!before) continue;
    const latest = observations[observations.length - 1].period;
    if (latest < before.latestPeriod) {
      older.push(
        `${series}: latest ${latest}, published ${before.latestPeriod}`,
      );
    }
    if (observations.length < before.observations.size * HISTORY_KEPT) {
      shrunk.push(
        `${series}: ${observations.length} observations against ${before.observations.size}`,
      );
    }
    const cutoff = monthsBefore(latest, OLD_REVISION_MONTHS);
    const changed = observations.filter((o) => {
      const was = before.observations.get(o.period);
      return (
        o.period < cutoff && was !== undefined && Math.abs(was - o.value) > 1e-9
      );
    });
    if (changed.length > 0) {
      revised.push(
        `${series}: ${changed.length} older values changed, e.g. ${changed[0].period} ${before.observations.get(changed[0].period)} → ${changed[0].value}`,
      );
    }
  }
  return [
    missing.length === 0
      ? {
          gate: "series_present",
          verdict: "pass",
          detail: `${expected.length} series, each with enough observations`,
        }
      : { gate: "series_present", verdict: "fail", detail: examples(missing) },
    outOfRange.length === 0
      ? {
          gate: "value_range",
          verdict: "pass",
          detail: "every value within its plausible band",
        }
      : { gate: "value_range", verdict: "fail", detail: examples(outOfRange) },
    older.length === 0
      ? {
          gate: "not_older",
          verdict: "pass",
          detail: "no series ends earlier than what is published",
        }
      : { gate: "not_older", verdict: "fail", detail: examples(older) },
    shrunk.length === 0
      ? {
          gate: "history_kept",
          verdict: "pass",
          detail: `no series lost more than ${Math.round((1 - HISTORY_KEPT) * 100)}% of its history`,
        }
      : { gate: "history_kept", verdict: "fail", detail: examples(shrunk) },
    revised.length === 0
      ? {
          gate: "old_revisions",
          verdict: "pass",
          detail: `no value older than ${OLD_REVISION_MONTHS} months changed`,
        }
      : {
          gate: "old_revisions",
          verdict: "warn",
          detail: `published with the source's revisions: ${examples(revised)}`,
        },
  ];
}

/**
 * Imports one fetched macro file (PRD F6): parse, gate, and, unless a gate
 * fails, replace its series whole in one transaction. A file whose series
 * are what is published already is a no-op and leaves no trace: the sources
 * re-export the same figures every day.
 */
export async function importMacroFile(
  sqlite: Database.Database,
  landingDirectory: string,
  feedId: FeedId,
  file: FetchedFile,
  now: () => number = Date.now,
): Promise<MacroImportResult> {
  const feed = FEEDS[feedId];
  const startedAt = now();
  const parsed = feed.parse(file.bytes);
  const current = new Map(
    feed.series.map((series) => [series, published(sqlite, series)]),
  );
  const hashes = parsed.ok
    ? new Map(
        feed.series.map((series) => [
          series,
          seriesHash(series, parsed.series.get(series) ?? []),
        ]),
      )
    : null;
  const fileHash = hashes
    ? createHash("sha256")
        .update([...hashes.values()].join("\n"))
        .digest("hex")
    : null;
  if (
    hashes &&
    feed.series.every(
      (series) => current.get(series)?.contentHash === hashes.get(series),
    )
  ) {
    return { kind: "unchanged" };
  }
  if (
    fileHash &&
    sqlite
      .prepare(
        "SELECT 1 FROM import_runs WHERE content_hash = ? AND outcome = 'rejected' LIMIT 1",
      )
      .get(fileHash) !== undefined
  ) {
    return { kind: "unchanged" };
  }

  const gates = parsed.ok ? runGates(parsed.series, current, feed.series) : [];
  const outcome: ImportOutcome = parsed.ok ? outcomeOf(gates) : "rejected";
  const landed = await landFile(landingDirectory, file.bytes, feed.extension);
  const finishedAt = now();
  const observations = parsed.ok
    ? feed.series.map((series) => parsed.series.get(series) ?? [])
    : [];
  const latest = observations
    .map((list) => list[list.length - 1]?.period)
    .filter((period): period is string => period !== undefined)
    .sort()
    .at(-1);

  const importRunId = sqlite
    .transaction((): number => {
      sqlite
        .prepare(
          `INSERT INTO source_files
             (sha256, source_id, original_name, byte_size, stored_name,
              source_url, accessed_on, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (sha256) DO NOTHING`,
        )
        .run(
          landed.sha256,
          feed.source,
          file.originalName,
          file.bytes.byteLength,
          landed.storedName,
          file.sourceUrl,
          file.accessedOn,
          startedAt,
        );
      const id = Number(
        sqlite
          .prepare(
            `INSERT INTO import_runs
               (source_id, file_sha256, parser_version, started_at, finished_at,
                outcome, parse_error, record_date, row_count, content_hash, correction)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          )
          .run(
            feed.source,
            landed.sha256,
            feed.parserVersion,
            startedAt,
            finishedAt,
            outcome,
            parsed.ok ? null : parsed.error,
            latest ?? null,
            parsed.ok
              ? observations.reduce((total, list) => total + list.length, 0)
              : null,
            fileHash,
          ).lastInsertRowid,
      );
      const insertGate = sqlite.prepare(
        "INSERT INTO gate_results (import_run_id, gate, verdict, detail) VALUES (?, ?, ?, ?)",
      );
      for (const gate of gates)
        insertGate.run(id, gate.gate, gate.verdict, gate.detail);
      if (outcome === "published" && parsed.ok)
        publish(sqlite, id, parsed.series, current, feed.series, finishedAt);
      return id;
    })
    .immediate();

  return {
    kind: "imported",
    importRunId,
    outcome,
    parseError: parsed.ok ? null : parsed.error,
    gates,
  };
}

function publish(
  sqlite: Database.Database,
  importRunId: number,
  parsed: Map<SeriesId, Observation[]>,
  current: Map<SeriesId, Published | null>,
  seriesIds: readonly SeriesId[],
  at: number,
): void {
  const replaced = new Set<number>();
  const insert = sqlite.prepare(
    "INSERT INTO macro_observations (series_id, period, value) VALUES (?, ?, ?)",
  );
  for (const series of seriesIds) {
    const observations = parsed.get(series)!;
    const latestPeriod = observations[observations.length - 1].period;
    const before = current.get(series);
    if (before) replaced.add(before.importRunId);
    sqlite
      .prepare("DELETE FROM macro_observations WHERE series_id = ?")
      .run(series);
    sqlite
      .prepare(
        `INSERT INTO macro_series
           (series_id, import_run_id, published_at, content_hash, observation_count,
            latest_period, latest_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (series_id) DO UPDATE SET
           import_run_id = excluded.import_run_id, published_at = excluded.published_at,
           content_hash = excluded.content_hash, observation_count = excluded.observation_count,
           latest_period = excluded.latest_period, latest_seen_at = excluded.latest_seen_at`,
      )
      .run(
        series,
        importRunId,
        at,
        seriesHash(series, observations),
        observations.length,
        latestPeriod,
        before && before.latestPeriod === latestPeriod
          ? before.latestSeenAt
          : at,
      );
    for (const o of observations) insert.run(series, o.period, o.value);
  }
  for (const old of replaced) {
    sqlite
      .prepare("UPDATE import_runs SET outcome = 'superseded' WHERE id = ?")
      .run(old);
    sqlite
      .prepare(
        `INSERT INTO publish_audit (at, action, import_run_id, replaced_import_run_id, reason)
         VALUES (?, 'supersede', ?, ?, 'a newer file of the same series')`,
      )
      .run(at, importRunId, old);
  }
  sqlite
    .prepare(
      "INSERT INTO publish_audit (at, action, import_run_id) VALUES (?, 'publish', ?)",
    )
    .run(at, importRunId);
}
