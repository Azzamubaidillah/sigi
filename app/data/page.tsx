import type { Metadata } from "next";

import { GateList } from "@/app/_components/GateList";
import { formatDate, formatMonth, formatTimestamp } from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import { S1_PAGE_URL } from "@/src/fetch/idx-listing";
import { FEEDS, type FeedId, S1_FEED } from "@/src/macro/feeds";
import { SOURCES, STATUS_LABELS } from "@/src/sources/register";
import {
  loadFeedStatus,
  loadImportRuns,
  loadS1Health,
} from "@/src/views/data-health";
import { formatPeriod } from "@/src/views/macro";

const FEED_LIST = [S1_FEED, ...(Object.keys(FEEDS) as FeedId[])];

function feedLabel(feed: string): {
  title: string;
  source: string;
  url: string;
} {
  if (feed === S1_FEED) {
    return {
      title: "Holders above 1%, monthly files",
      source: "S1",
      url: S1_PAGE_URL,
    };
  }
  const definition = FEEDS[feed as FeedId];
  return {
    title: definition.title,
    source: definition.source,
    url: definition.pageUrl,
  };
}

export const metadata: Metadata = { title: "Data & sources" };

const outcomeText = {
  published: "Published",
  superseded: "Superseded",
  rejected: "Rejected",
} as const;

export default function DataPage() {
  const { databasePath } = loadConfig();
  const health = loadS1Health(databasePath);
  const runs = loadImportRuns(databasePath);
  const feeds = loadFeedStatus(databasePath, FEED_LIST);
  return (
    <>
      <div className="page-header">
        <h1>Data &amp; sources</h1>
        <p className="lede">
          Where every figure comes from, when it was last fetched, and what each
          import&apos;s checks found. Files are fetched and imported
          automatically; nobody reviews them by hand. A file that fails a check
          is not published, and what was published before stays live. A file
          with a warning is published, and the warning is shown here.
        </p>
      </div>

      <section className="panel">
        <h2>Holders above 1% (S1)</h2>
        {health.latest ? (
          <dl className="figures">
            <div>
              <dt>Published month</dt>
              <dd>{formatDate(health.latest.recordDate)}</dd>
            </div>
            <div>
              <dt>Published at</dt>
              <dd>{formatTimestamp(health.latest.publishedAt)}</dd>
            </div>
            <div>
              <dt>Rows · companies</dt>
              <dd>
                {health.latest.rowCount.toLocaleString("en-US")} ·{" "}
                {health.latest.issuerCount}
              </dd>
            </div>
            {health.next ? (
              <div>
                <dt>
                  Next file (end of {formatMonth(health.next.recordMonth)})
                </dt>
                <dd>expected by {formatDate(health.next.expectedBy)}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="absent">No month published yet.</p>
        )}
        {health.overdue ? (
          <p className="notice spaced">
            The next monthly file is past its usual publication date and has not
            been imported. Figures on this site are as of the month above.
          </p>
        ) : null}
      </section>

      <section className="panel">
        <h2>Checks of each source</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Feed</th>
                <th>Source</th>
                <th>Last checked</th>
                <th>Outcome</th>
                <th>Last new data</th>
              </tr>
            </thead>
            <tbody>
              {feeds.map((status) => {
                const label = feedLabel(status.feed);
                return (
                  <tr key={status.feed}>
                    <td>
                      <a href={label.url} rel="noreferrer">
                        {label.title}
                      </a>
                    </td>
                    <td className="mono">{label.source}</td>
                    <td>
                      {status.last
                        ? formatTimestamp(status.last.startedAt)
                        : "Not yet"}
                    </td>
                    <td>
                      {!status.last ? (
                        "—"
                      ) : status.last.outcome === "ok" ? (
                        status.last.fetched > 0 ? (
                          `OK, ${status.last.fetched} imported`
                        ) : (
                          "OK, nothing new"
                        )
                      ) : (
                        <span className="tone-negative">
                          Failed: {status.last.error}
                        </span>
                      )}
                    </td>
                    <td>
                      {status.lastImportAt
                        ? formatTimestamp(status.lastImportAt)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="citation">
          A worker checks every source once a day. The exchange&apos;s{" "}
          <a href={S1_PAGE_URL} rel="noreferrer">
            share-ownership data page
          </a>{" "}
          is read in a browser and every monthly file of holders above 1% not
          yet imported is taken, oldest first (D-021). Bank Indonesia&apos;s
          tables are exported as a reader would export them (D-023); the World
          Bank and FRED files are downloaded as published. A failed check is
          retried three hours later.
        </p>
      </section>

      <section className="panel">
        <h2>Imports</h2>
        {runs.length === 0 ? (
          <p className="absent">No file has been imported yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Imported</th>
                  <th>File</th>
                  <th>Latest period</th>
                  <th className="num">Rows</th>
                  <th>Outcome</th>
                  <th>Checks</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="mono">
                      #{run.id} {run.sourceId}
                    </td>
                    <td>{formatTimestamp(run.startedAt)}</td>
                    <td>
                      <a href={run.sourceUrl} rel="noreferrer">
                        {run.originalName}
                      </a>
                      <br />
                      <span className="mono muted" title={run.sha256}>
                        sha256 {run.sha256.slice(0, 12)}…
                      </span>
                    </td>
                    <td>
                      {run.recordDate ? formatPeriod(run.recordDate) : "—"}
                    </td>
                    <td className="num">
                      {run.rowCount?.toLocaleString("en-US") ?? "—"}
                    </td>
                    <td>
                      {outcomeText[run.outcome]}
                      {run.correction ? (
                        <span className="muted"> (correction)</span>
                      ) : null}
                    </td>
                    <td>
                      {run.parseError ? (
                        <span className="tone-negative">
                          Unreadable: {run.parseError}
                        </span>
                      ) : (
                        <GateList gates={run.gates} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="citation">
          Published months are rebuilt from the stored source files and compared
          by content hash, in CI on synthetic files and on the server with{" "}
          <span className="mono">pnpm rebuild:check</span>.
        </p>
      </section>

      <section className="panel">
        <h2>Sources and licences</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Source</th>
                <th>Status</th>
                <th>Terms</th>
                <th>In use</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SOURCES).map(([id, source]) => (
                <tr key={id}>
                  <td className="mono">{id}</td>
                  <td>
                    <a href={source.url} rel="noreferrer">
                      {source.name}
                    </a>
                    <br />
                    <span className="muted">{source.publisher}</span>
                  </td>
                  <td>{STATUS_LABELS[source.status]}</td>
                  <td>{source.terms}</td>
                  <td>{source.live ? "Yes" : "Not yet"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
