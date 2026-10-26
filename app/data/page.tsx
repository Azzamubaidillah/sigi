import type { Metadata } from "next";

import { GateList } from "@/app/_components/GateList";
import {
  Figures,
  Icon,
  type Tone,
  Notice,
  PageHeader,
  Pill,
  Section,
  SourceNote,
} from "@/app/_components/ui";
import { formatDate, formatMonth, formatTimestamp } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { loadConfig } from "@/src/config";
import { S1_PAGE_URL } from "@/src/fetch/idx-listing";
import { FEEDS, type FeedId, S1_FEED } from "@/src/macro/feeds";
import { NEWS_FEED, NEWS_SOURCE } from "@/src/news/feeds";
import { localise } from "@/src/i18n/define";
import type { Lang } from "@/src/i18n/lang";
import { dataMessages } from "@/src/i18n/messages/data";
import { type SourceStatus, SOURCES } from "@/src/sources/register";
import {
  loadFeedStatus,
  loadImportRuns,
  loadS1Health,
} from "@/src/views/data-health";
import { formatPeriod } from "@/src/views/macro";

import "../styles/data.css";

const FEED_LIST = [S1_FEED, ...(Object.keys(FEEDS) as FeedId[]), NEWS_FEED];

/** The worker retries a failed check this long after it (scripts/worker.ts). */
const RETRY_AFTER_FAILURE_MS = 3 * 3_600_000;

const SOURCE_TONES: Record<SourceStatus, Tone | undefined> = {
  cleared: "positive",
  "cleared-portfolio": "info",
  withheld: "warn",
  excluded: undefined,
};

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
  const { databasePath, fetchIntervalMs } = loadConfig();
  const health = loadS1Health(databasePath);
  const runs = loadImportRuns(databasePath);
  const feeds = loadFeedStatus(databasePath, FEED_LIST);

  const passed = feeds.filter((s) => s.last?.outcome === "ok").length;
  const failed = feeds.filter((s) => s.last?.outcome === "failed").length;
  const never = feeds.filter((s) => s.last === null).length;
  const overall: { tone: Tone | undefined; text: string } =
    failed > 0
      ? { tone: "negative", text: m.status.failed(failed, feeds.length) }
      : health.overdue
        ? { tone: "warn", text: m.status.overdue }
        : never === feeds.length
          ? { tone: undefined, text: m.status.unchecked }
          : { tone: "positive", text: m.status.allOk(feeds.length) };

  return (
    <>
      <PageHeader
        title={m.heading}
        lede={m.lede}
        aside={<Pill tone={overall.tone}>{overall.text}</Pill>}
      />

      <Section id="s1" title={m.s1.heading} stamp={m.s1.stamp}>
        {health.latest ? (
          <Figures
            items={[
              {
                label: m.s1.publishedMonth,
                value: formatDate(health.latest.recordDate, lang),
                note: m.s1.publishedAt(
                  formatTimestamp(health.latest.publishedAt, lang),
                ),
                lead: true,
              },
              { label: m.s1.rows, value: integer(health.latest.rowCount) },
              {
                label: m.s1.companies,
                value: integer(health.latest.issuerCount),
              },
              ...(health.next
                ? [
                    {
                      label: m.s1.nextFile,
                      value: formatDate(health.next.expectedBy, lang),
                      note: m.s1.nextFileNote(
                        formatMonth(health.next.recordMonth, lang),
                      ),
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <p className="absent">{m.s1.none}</p>
        )}
        {health.overdue ? <Notice tone="warn">{m.s1.overdue}</Notice> : null}
      </Section>

      <Section
        id="feeds"
        title={m.feeds.heading}
        note={m.feeds.summary(feeds.length, passed, failed, never)}
      >
        <div className="table-wrap">
          <table className="tbl tbl--stack tbl--feeds">
            <thead>
              <tr>
                <th scope="col">{m.feeds.feed}</th>
                <th scope="col">{m.feeds.status}</th>
                <th scope="col">{m.feeds.lastChecked}</th>
                <th scope="col">{m.feeds.outcome}</th>
                <th scope="col">{m.feeds.nextCheck}</th>
                <th scope="col" className="hide-md">
                  {m.feeds.lastNew}
                </th>
              </tr>
            </thead>
            <tbody>
              {feeds.map((status) => {
                const label = feedLabel(status.feed, lang);
                const { last } = status;
                return (
                  <tr key={status.feed}>
                    <th scope="row">
                      <a href={label.url} rel="noreferrer">
                        {label.title}
                      </a>
                      <span className="sub-line">{label.source}</span>
                    </th>
                    <td data-label={m.feeds.status}>
                      {last === null ? (
                        <Pill>{m.feeds.statusNone}</Pill>
                      ) : last.outcome === "ok" ? (
                        <Pill tone="positive">
                          <Icon name="check" />
                          {m.feeds.statusOk}
                        </Pill>
                      ) : (
                        <Pill tone="negative">
                          <Icon name="alert" />
                          {m.feeds.statusFailed}
                        </Pill>
                      )}
                    </td>
                    <td className="when" data-label={m.feeds.lastChecked}>
                      {last ? formatTimestamp(last.startedAt, lang) : "—"}
                    </td>
                    <td data-label={m.feeds.outcome}>
                      {last === null
                        ? "—"
                        : last.outcome === "ok"
                          ? last.fetched > 0
                            ? m.feeds.imported(last.fetched)
                            : m.feeds.nothingNew
                          : last.error}
                    </td>
                    <td className="when" data-label={m.feeds.nextCheck}>
                      {last
                        ? m.feeds.due(
                            formatTimestamp(
                              last.startedAt +
                                (last.outcome === "ok"
                                  ? fetchIntervalMs
                                  : RETRY_AFTER_FAILURE_MS),
                              lang,
                            ),
                          )
                        : m.feeds.nextPass}
                    </td>
                    <td className="when hide-md" data-label={m.feeds.lastNew}>
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
        <SourceNote summary={m.feeds.noteSummary}>
          <p>
            {m.feeds.noteBefore}
            <a href={S1_PAGE_URL} rel="noreferrer">
              {m.feeds.noteLink}
            </a>
            {m.feeds.noteAfter}
          </p>
        </SourceNote>
      </Section>

      <Section id="imports" title={m.imports.heading} note={m.imports.note}>
        {runs.length === 0 ? (
          <p className="absent">{m.imports.none}</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl tbl--stack">
              <thead>
                <tr>
                  <th scope="col">{m.imports.imported}</th>
                  <th scope="col">{m.imports.file}</th>
                  <th scope="col" className="hide-md">
                    {m.imports.period}
                  </th>
                  <th scope="col" className="num hide-md">
                    {m.imports.rows}
                  </th>
                  <th scope="col">{m.imports.outcome}</th>
                  <th scope="col">{m.imports.checks}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <th scope="row" className="when">
                      {formatTimestamp(run.startedAt, lang)}
                      <span className="sub-line">
                        {m.imports.run(run.id, run.sourceId)}
                      </span>
                    </th>
                    <td data-label={m.imports.file}>
                      <a href={run.sourceUrl} rel="noreferrer">
                        {run.originalName}
                      </a>
                      <span className="sub-line" title={run.sha256}>
                        sha256 {run.sha256.slice(0, 12)}…
                      </span>
                    </td>
                    <td className="hide-md" data-label={m.imports.period}>
                      {run.recordDate
                        ? formatPeriod(run.recordDate, lang)
                        : "—"}
                    </td>
                    <td className="num hide-md" data-label={m.imports.rows}>
                      {run.rowCount === null ? "—" : integer(run.rowCount)}
                    </td>
                    <td data-label={m.imports.outcome}>
                      <Pill
                        tone={
                          run.outcome === "published"
                            ? "positive"
                            : run.outcome === "rejected"
                              ? "negative"
                              : undefined
                        }
                      >
                        {m.imports.outcomes[run.outcome]}
                      </Pill>
                      {run.correction ? (
                        <span className="sub-line">{m.imports.correction}</span>
                      ) : null}
                    </td>
                    <td data-label={m.imports.checks}>
                      {run.parseError ? (
                        <span className="tone-negative">
                          <Icon name="alert" />
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
        <SourceNote summary={m.imports.verifySummary}>
          <p>
            {m.imports.verifyBefore}
            <code>pnpm rebuild:check</code>
            {m.imports.verifyAfter}
          </p>
        </SourceNote>
      </Section>

      <Section id="sources" title={m.sources.heading} note={m.sources.note}>
        <div className="table-wrap">
          <table className="tbl tbl--stack">
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
                  <th scope="row">{id}</th>
                  <td data-label={m.sources.source}>
                    <a href={source.url} rel="noreferrer">
                      {localise(source.name, lang)}
                    </a>
                    <span className="sub-line">{source.publisher}</span>
                  </td>
                  <td data-label={m.sources.status}>
                    <Pill tone={SOURCE_TONES[source.status]}>
                      {m.sourceStatus[source.status]}
                    </Pill>
                  </td>
                  <td className="terms" data-label={m.sources.terms}>
                    {localise(source.terms, lang)}
                  </td>
                  <td data-label={m.sources.inUse}>
                    {source.live ? m.sources.yes : m.sources.notYet}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
