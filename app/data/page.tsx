import type { Metadata } from "next";

import { GateList } from "@/app/_components/GateList";
import { formatDate, formatMonth, formatTimestamp } from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import { SOURCES, STATUS_LABELS } from "@/src/sources/register";
import { loadImportRuns, loadS1Health } from "@/src/views/data-health";

export const metadata: Metadata = { title: "Data & sources" };

const outcomeText = {
  published: "Published",
  superseded: "Superseded",
  held: "Held for review",
  rejected: "Rejected",
} as const;

export default function DataPage() {
  const { databasePath } = loadConfig();
  const health = loadS1Health(databasePath);
  const runs = loadImportRuns(databasePath);
  return (
    <>
      <div className="page-header">
        <h1>Data &amp; sources</h1>
        <p className="lede">
          Where every figure comes from, when it was last imported, and what
          each import&apos;s checks found. A month is published only when all of
          its checks pass, or when the owner approves one held for review, with
          the reason recorded.
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
                  <th>Record date</th>
                  <th className="num">Rows</th>
                  <th>Outcome</th>
                  <th>Checks</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="mono">#{run.id}</td>
                    <td>{formatTimestamp(run.startedAt)}</td>
                    <td>
                      {run.originalName}
                      <br />
                      <span className="mono muted" title={run.sha256}>
                        sha256 {run.sha256.slice(0, 12)}…
                      </span>
                    </td>
                    <td>{run.recordDate ? formatDate(run.recordDate) : "—"}</td>
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
