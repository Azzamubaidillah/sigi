import type { Metadata } from "next";

import { getLang } from "@/app/_lib/lang";
import { GateList } from "@/app/_components/GateList";
import { formatDate, formatMonth, formatTimestamp } from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import { S1_PAGE_URL } from "@/src/fetch/idx-listing";
import { FEEDS, type FeedId, S1_FEED } from "@/src/macro/feeds";
import { NEWS_FEED, NEWS_SOURCE } from "@/src/news/feeds";
import { localise } from "@/src/i18n/define";
import type { Lang } from "@/src/i18n/lang";
import { dataMessages } from "@/src/i18n/messages/data";
import { SOURCES } from "@/src/sources/register";
import {
  loadFeedStatus,
  loadImportRuns,
  loadS1Health,
} from "@/src/views/data-health";
import { formatPeriod } from "@/src/views/macro";

const FEED_LIST = [S1_FEED, ...(Object.keys(FEEDS) as FeedId[]), NEWS_FEED];

function feedLabel(
  feed: string,
  lang: Lang,
): {
  title: string;
  source: string;
  url: string;
} {
  if (feed === S1_FEED) {
    return {
      title: dataMessages[lang].s1.feedTitle,
      source: "S1",
      url: S1_PAGE_URL,
    };
  }
  if (feed === NEWS_FEED) {
    return { title: NEWS_SOURCE.title, source: "S10", url: NEWS_SOURCE.url };
  }
  const definition = FEEDS[feed as FeedId];
  return {
    title: definition.title,
    source: definition.source,
    url: definition.pageUrl,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: dataMessages[lang].metaTitle };
}

export default async function DataPage() {
  const lang = await getLang();
  const m = dataMessages[lang];
  const integer = (value: number) =>
    value.toLocaleString(lang === "id" ? "id-ID" : "en-US");
  const { databasePath } = loadConfig();
  const health = loadS1Health(databasePath);
  const runs = loadImportRuns(databasePath);
  const feeds = loadFeedStatus(databasePath, FEED_LIST);
  return (
    <>
      <div className="page-header">
        <h1>{m.heading}</h1>
        <p className="lede">{m.lede}</p>
      </div>

      <section className="panel">
        <h2>{m.s1.heading}</h2>
        {health.latest ? (
          <dl className="figures">
            <div>
              <dt>{m.s1.publishedMonth}</dt>
              <dd>{formatDate(health.latest.recordDate, lang)}</dd>
            </div>
            <div>
              <dt>{m.s1.publishedAt}</dt>
              <dd>{formatTimestamp(health.latest.publishedAt, lang)}</dd>
            </div>
            <div>
              <dt>{m.s1.rowsCompanies}</dt>
              <dd>
                {integer(health.latest.rowCount)} · {health.latest.issuerCount}
              </dd>
            </div>
            {health.next ? (
              <div>
                <dt>
                  {m.s1.nextFile(formatMonth(health.next.recordMonth, lang))}
                </dt>
                <dd>
                  {m.s1.expectedBy(formatDate(health.next.expectedBy, lang))}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="absent">{m.s1.none}</p>
        )}
        {health.overdue ? (
          <p className="notice spaced">{m.s1.overdue}</p>
        ) : null}
      </section>

      <section className="panel">
        <h2>{m.feeds.heading}</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{m.feeds.feed}</th>
                <th scope="col">{m.feeds.source}</th>
                <th scope="col">{m.feeds.lastChecked}</th>
                <th scope="col">{m.feeds.outcome}</th>
                <th scope="col">{m.feeds.lastNew}</th>
              </tr>
            </thead>
            <tbody>
              {feeds.map((status) => {
                const label = feedLabel(status.feed, lang);
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
                        ? formatTimestamp(status.last.startedAt, lang)
                        : m.feeds.notYet}
                    </td>
                    <td>
                      {!status.last ? (
                        "—"
                      ) : status.last.outcome === "ok" ? (
                        status.last.fetched > 0 ? (
                          m.feeds.okImported(status.last.fetched)
                        ) : (
                          m.feeds.okNothing
                        )
                      ) : (
                        <span className="tone-negative">
                          {m.feeds.failed}
                          {status.last.error}
                        </span>
                      )}
                    </td>
                    <td>
                      {status.lastImportAt
                        ? formatTimestamp(status.lastImportAt, lang)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="citation">
          {m.feeds.noteBefore}
          <a href={S1_PAGE_URL} rel="noreferrer">
            {m.feeds.noteLink}
          </a>
          {m.feeds.noteAfter}
        </p>
      </section>

      <section className="panel">
        <h2>{m.imports.heading}</h2>
        {runs.length === 0 ? (
          <p className="absent">{m.imports.none}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">{m.imports.run}</th>
                  <th scope="col">{m.imports.imported}</th>
                  <th scope="col">{m.imports.file}</th>
                  <th scope="col">{m.imports.latestPeriod}</th>
                  <th scope="col" className="num">
                    {m.imports.rows}
                  </th>
                  <th scope="col">{m.imports.outcome}</th>
                  <th scope="col">{m.imports.checks}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="mono">
                      #{run.id} {run.sourceId}
                    </td>
                    <td>{formatTimestamp(run.startedAt, lang)}</td>
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
                      {run.recordDate
                        ? formatPeriod(run.recordDate, lang)
                        : "—"}
                    </td>
                    <td className="num">
                      {run.rowCount === null ? "—" : integer(run.rowCount)}
                    </td>
                    <td>
                      {m.imports.outcomes[run.outcome]}
                      {run.correction ? (
                        <span className="muted">{m.imports.correction}</span>
                      ) : null}
                    </td>
                    <td>
                      {run.parseError ? (
                        <span className="tone-negative">
                          {m.imports.unreadable}
                          {run.parseError}
                        </span>
                      ) : (
                        <GateList gates={run.gates} lang={lang} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="citation">
          {m.imports.noteBefore}
          <span className="mono">pnpm rebuild:check</span>
          {m.imports.noteAfter}
        </p>
      </section>

      <section className="panel">
        <h2>{m.sources.heading}</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{m.sources.id}</th>
                <th scope="col">{m.sources.source}</th>
                <th scope="col">{m.sources.status}</th>
                <th scope="col">{m.sources.terms}</th>
                <th scope="col">{m.sources.inUse}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SOURCES).map(([id, source]) => (
                <tr key={id}>
                  <td className="mono">{id}</td>
                  <td>
                    <a href={source.url} rel="noreferrer">
                      {localise(source.name, lang)}
                    </a>
                    <br />
                    <span className="muted">{source.publisher}</span>
                  </td>
                  <td>{m.sourceStatus[source.status]}</td>
                  <td>{localise(source.terms, lang)}</td>
                  <td>{source.live ? m.sources.yes : m.sources.notYet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
