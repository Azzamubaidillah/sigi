import type Database from "better-sqlite3";

import { describeError } from "../fetch/errors";
import { NEWS_FEED, NEWS_RETENTION_DAYS, NEWS_SOURCE } from "./feeds";
import { parseRss } from "./rss";

export interface NewsFetchSummary {
  runId: number;
  feed: typeof NEWS_FEED;
  outcome: "ok" | "failed";
  listed: number;
  added: number;
  error: string | null;
}

/**
 * One check of the news feed: read its headlines, keep the new ones, delete
 * those past retention, and record the run in `fetch_runs` whatever happened.
 */
export async function runNewsFeed(
  sqlite: Database.Database,
  fetchText: (url: string) => Promise<string>,
  now: () => number = Date.now,
): Promise<NewsFetchSummary> {
  const startedAt = now();
  let listed = 0;
  let added = 0;
  let error: string | null = null;
  try {
    const headlines = parseRss(await fetchText(NEWS_SOURCE.url));
    listed = headlines.length;
    const insert = sqlite.prepare(
      `INSERT INTO news_items (url, publisher, title, published_at, fetched_at)
       VALUES (?, ?, ?, ?, ?) ON CONFLICT (url) DO NOTHING`,
    );
    sqlite.transaction(() => {
      for (const headline of headlines) {
        added += insert.run(
          headline.url,
          NEWS_SOURCE.publisher,
          headline.title,
          headline.publishedAt,
          startedAt,
        ).changes;
      }
      sqlite
        .prepare("DELETE FROM news_items WHERE published_at < ?")
        .run(startedAt - NEWS_RETENTION_DAYS * 86_400_000);
    })();
  } catch (cause) {
    error = describeError(cause);
  }
  const outcome = error === null ? "ok" : "failed";
  const runId = Number(
    sqlite
      .prepare(
        `INSERT INTO fetch_runs (feed, started_at, finished_at, outcome, listed, fetched, error)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(NEWS_FEED, startedAt, now(), outcome, listed, added, error)
      .lastInsertRowid,
  );
  return { runId, feed: NEWS_FEED, outcome, listed, added, error };
}
