/**
 * The worker: checks every source on a schedule and imports what is new.
 * No one uploads or approves anything; a file either passes its gates and is
 * published, or is rejected with the reason shown on /data.
 *
 * Feeds:
 * - `idx-s1`: the exchange's ownership-data page, through Chrome (D-021);
 * - the macro feeds of `src/macro/feeds.ts`, over plain HTTP (PRD F6, D-023).
 *
 *   tsx scripts/worker.ts               run forever (the worker container)
 *   tsx scripts/worker.ts --once        check every feed now, then exit
 *   tsx scripts/worker.ts --once FEED…  check only the named feeds
 * With --once the exit code is non-zero if any check failed.
 *
 * The schedule lives in `fetch_runs`: a feed is due one interval after its
 * last run finished, or three hours after a failed one, so a restart or a
 * deploy neither skips a check nor repeats one. A stop signal ends the wait;
 * a check in progress is not interrupted, and each import is one transaction,
 * so a kill mid-check leaves nothing half-published.
 */
import { setTimeout as sleep } from "node:timers/promises";

import type Database from "better-sqlite3";

import { loadConfig } from "../src/config";
import { openDatabase } from "../src/db/client";
import { pendingMigrationCount } from "../src/db/migrate";
import { openIdxSession } from "../src/fetch/idx-browser";
import { runMacroFeed } from "../src/fetch/macro-fetch";
import { fetchMacroFeed } from "../src/fetch/macro-http";
import { runS1Fetch } from "../src/fetch/s1-fetch";
import { createLogger } from "../src/logger";
import { FEEDS, type FeedId, S1_FEED } from "../src/macro/feeds";

const RETRY_AFTER_FAILURE_MS = 3 * 3_600_000;
const SCHEMA_POLL_MS = 10_000;

const config = loadConfig();
const logger = createLogger("sigi-worker", config);
const args = process.argv.slice(2);
const once = args.includes("--once");
type Feed = typeof S1_FEED | FeedId;
const ALL_FEEDS: Feed[] = [S1_FEED, ...(Object.keys(FEEDS) as FeedId[])];
const named = args.filter((arg) => !arg.startsWith("--"));
const unknown = named.filter((name) => !(ALL_FEEDS as string[]).includes(name));
if (unknown.length > 0) {
  logger.error({ unknown, feeds: ALL_FEEDS }, "unknown feed");
  process.exit(2);
}
const feeds: Feed[] = named.length > 0 ? (named as Feed[]) : ALL_FEEDS;

const stop = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "stopping");
    stop.abort();
  });
}

async function pause(ms: number): Promise<void> {
  await sleep(ms, undefined, { signal: stop.signal }).catch(() => undefined);
}

function nextDue(sqlite: Database.Database, feed: Feed): number {
  const last = sqlite
    .prepare(
      "SELECT finished_at AS finishedAt, outcome FROM fetch_runs WHERE feed = ? ORDER BY id DESC LIMIT 1",
    )
    .get(feed) as { finishedAt: number; outcome: "ok" | "failed" } | undefined;
  if (!last) return Date.now();
  return (
    last.finishedAt +
    (last.outcome === "ok" ? config.fetchIntervalMs : RETRY_AFTER_FAILURE_MS)
  );
}

/** Checks one feed; true when the check succeeded. */
async function check(sqlite: Database.Database, feed: Feed): Promise<boolean> {
  if (feed === S1_FEED) {
    const summary = await runS1Fetch(sqlite, config.landingDirectory, () =>
      openIdxSession(config.chromePath, logger),
    );
    logger[summary.outcome === "ok" ? "info" : "error"](
      { feed, ...summary },
      "checked",
    );
    return summary.outcome === "ok";
  }
  const summary = await runMacroFeed(
    sqlite,
    config.landingDirectory,
    feed,
    fetchMacroFeed,
  );
  logger[summary.outcome === "ok" ? "info" : "error"](summary, "checked");
  return summary.outcome === "ok";
}

const { sqlite } = openDatabase(config.databasePath);
let exitCode = 0;
try {
  while (!stop.signal.aborted) {
    const pending = pendingMigrationCount(sqlite);
    if (pending === 0) break;
    logger.info(
      { pending },
      "waiting for the web container to migrate the database",
    );
    await pause(SCHEMA_POLL_MS);
  }
  if (once) {
    for (const feed of feeds) {
      if (stop.signal.aborted) break;
      if (!(await check(sqlite, feed))) exitCode = 1;
    }
  } else {
    while (!stop.signal.aborted) {
      for (const feed of feeds) {
        if (stop.signal.aborted) break;
        if (nextDue(sqlite, feed) <= Date.now()) await check(sqlite, feed);
      }
      const wait =
        Math.min(...feeds.map((feed) => nextDue(sqlite, feed))) - Date.now();
      if (wait > 0) {
        logger.info(
          { nextCheck: new Date(Date.now() + wait).toISOString() },
          "waiting",
        );
        await pause(wait);
      }
    }
  }
} finally {
  sqlite.close();
}
process.exit(exitCode);
