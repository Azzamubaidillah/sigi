/**
 * The worker: checks the exchange's ownership-data page on a schedule and
 * imports every new >1% holder workbook it lists (PRD F1). No one uploads or
 * approves anything; a file either passes its gates and is published, or is
 * rejected with the reason shown on /data.
 *
 *   tsx scripts/worker.ts          run forever (the worker container)
 *   tsx scripts/worker.ts --once   one check now, then exit (non-zero on failure)
 *
 * The schedule lives in `fetch_runs`: the next check is due one interval after
 * the last run finished, or three hours after a failed one, so a restart or a
 * deploy neither skips a check nor repeats one. A stop signal ends the wait;
 * a check in progress is not interrupted, and each import is one transaction,
 * so a kill mid-check leaves nothing half-published.
 */
import type Database from "better-sqlite3";
import { setTimeout as sleep } from "node:timers/promises";

import { loadConfig } from "../src/config";
import { openDatabase } from "../src/db/client";
import { pendingMigrationCount } from "../src/db/migrate";
import { openIdxSession } from "../src/fetch/idx-browser";
import { runS1Fetch } from "../src/fetch/s1-fetch";
import { createLogger } from "../src/logger";

const RETRY_AFTER_FAILURE_MS = 3 * 3_600_000;
const SCHEMA_POLL_MS = 10_000;

const config = loadConfig();
const logger = createLogger("sigi-worker", config);
const once = process.argv.includes("--once");
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

function nextDue(sqlite: Database.Database): number {
  const last = sqlite
    .prepare(
      "SELECT finished_at AS finishedAt, outcome FROM fetch_runs ORDER BY id DESC LIMIT 1",
    )
    .get() as { finishedAt: number; outcome: "ok" | "failed" } | undefined;
  if (!last) return Date.now();
  return (
    last.finishedAt +
    (last.outcome === "ok" ? config.fetchIntervalMs : RETRY_AFTER_FAILURE_MS)
  );
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
  while (!stop.signal.aborted) {
    const wait = nextDue(sqlite) - Date.now();
    if (!once && wait > 0) {
      logger.info(
        { nextCheck: new Date(Date.now() + wait).toISOString() },
        "waiting",
      );
      await pause(wait);
      continue;
    }
    const summary = await runS1Fetch(sqlite, config.landingDirectory, () =>
      openIdxSession(config.chromePath, logger),
    );
    logger[summary.outcome === "ok" ? "info" : "error"](
      summary,
      "checked the ownership-data page",
    );
    if (once) {
      exitCode = summary.outcome === "ok" ? 0 : 1;
      break;
    }
  }
} finally {
  sqlite.close();
}
process.exit(exitCode);
