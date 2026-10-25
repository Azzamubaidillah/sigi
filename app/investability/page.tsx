import type { Metadata } from "next";
import Link from "next/link";

import { S1Citation } from "@/app/_components/Citation";
import { formatDate, formatPercent } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { possibleDeadlines, trancheDeadlines } from "@/app/_lib/labels";
import { loadConfig } from "@/src/config";
import { localise } from "@/src/i18n/define";
import { commonMessages } from "@/src/i18n/messages/common";
import { investabilityMessages } from "@/src/i18n/messages/investability";
import {
  RULE_SOURCES,
  TIMELINE,
  TRANCHES,
  type Tranche,
} from "@/src/investability/rule";
import { loadInvestability } from "@/src/views/investability";

export async function generateMetadata(): Promise<Metadata> {
  return { title: investabilityMessages[await getLang()].metaTitle };
}

function Source({
  url,
  publisher,
  kind,
  pressReport,
}: {
  url: string;
  publisher: string;
  kind: string;
  pressReport: string;
}) {
  return (
    <a href={url} rel="noreferrer">
      {publisher}
      {kind === "secondary" ? pressReport : ""}
    </a>
  );
}

export default async function InvestabilityPage() {
  const lang = await getLang();
  const m = investabilityMessages[lang];
  const view = loadInvestability(loadConfig().databasePath);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div className="page-header">
        <h1>{m.title}</h1>
        <p className="lede">{m.lede}</p>
      </div>

      {view.kind === "absent" ? (
        <section className="panel">
          <p className="absent">
            {commonMessages[lang].ownershipAbsence.no_published_month}
          </p>
        </section>
      ) : (
        <>
          <section className="panel">
            <h2>{m.counts.heading}</h2>
            <dl className="figures">
              <div>
                <dt>
                  {m.counts.sigi(formatDate(view.month.recordDate, lang))}
                </dt>
                <dd>{view.belowMinimum.length}</dd>
              </div>
              <div>
                <dt>
                  {m.counts.exchangeNearest(
                    formatDate(view.official.asOf, lang),
                  )}
                </dt>
                <dd>
                  {view.official.belowMinimum}
                  {view.official.listed
                    ? m.counts.ofListed(view.official.listed)
                    : ""}
                </dd>
              </div>
              {view.latestOfficial !== view.official ? (
                <div>
                  <dt>
                    {m.counts.exchangeLatest(
                      formatDate(view.latestOfficial.asOf, lang),
                    )}
                  </dt>
                  <dd>
                    {view.latestOfficial.belowMinimum}
                    {view.latestOfficial.listed
                      ? m.counts.ofListed(view.latestOfficial.listed)
                      : ""}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>{m.counts.incomplete}</dt>
                <dd>{view.incomplete.length}</dd>
              </div>
            </dl>
            <p className="citation">
              {m.counts.citation}
              <Source {...view.official.source} pressReport={m.pressReport} />
              {view.official !== view.latestOfficial ? (
                <>
                  {m.counts.and}
                  <Source
                    {...view.latestOfficial.source}
                    pressReport={m.pressReport}
                  />
                </>
              ) : null}
              {m.counts.end}
            </p>
          </section>

          <section className="panel">
            <h2>{m.bands.heading}</h2>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">{m.bands.bound}</th>
                    <th scope="col" className="num">
                      {m.bands.companies}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.bands.map((band) => (
                    <tr key={band.id}>
                      <td>
                        <Link href={`/?${band.screenQuery}`}>
                          {m.bands.labels[band.id]}
                        </Link>
                      </td>
                      <td className="num">{band.count}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>{m.bands.noFigure}</td>
                    <td className="num">{view.incomplete.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {view.incomplete.length > 0 ? (
              <p className="citation">
                {m.bands.incompleteBefore}
                {view.incomplete.map((c) => c.shareCode).join(", ")}
                {m.bands.incompleteAfter}
              </p>
            ) : null}
            <S1Citation month={view.month} lang={lang} />
          </section>

          <section className="panel">
            <h2>{m.below.heading(view.belowMinimum.length)}</h2>
            <p className="muted">
              {m.below.intro}
              {view.previous
                ? m.below.moved(
                    formatDate(view.previous.recordDate, lang),
                    view.crossedUp.length,
                    view.crossedUp.join(", ") || m.below.none,
                    view.crossedDown.length,
                    view.crossedDown.join(", ") || m.below.none,
                  )
                : m.below.noPrevious}
            </p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">{m.below.code}</th>
                    <th scope="col">{m.below.company}</th>
                    <th scope="col" className="num">
                      {m.below.bound}
                    </th>
                    <th scope="col" className="num">
                      {m.below.before}
                    </th>
                    <th scope="col">{m.below.deadlines}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.belowMinimum.map((row) => (
                    <tr key={row.shareCode}>
                      <td className="mono">
                        <Link href={`/t/${row.shareCode}`}>
                          {row.shareCode}
                        </Link>
                      </td>
                      <td>{row.issuerName}</td>
                      <td className="num">
                        {formatPercent(row.upperBoundHundredths, lang)}
                      </td>
                      <td className="num">
                        {row.previousUpperBoundHundredths === null
                          ? "—"
                          : formatPercent(
                              row.previousUpperBoundHundredths,
                              lang,
                            )}
                      </td>
                      <td>
                        {possibleDeadlines(row.possibleTranches, lang).join(
                          "; ",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="panel">
        <h2>{m.timeline.heading}</h2>
        <div className="table-wrap">
          <table className="data">
            <tbody>
              {TIMELINE.map((event) => (
                <tr key={`${event.date}-${event.label.en}`}>
                  <td className="mono">{event.date}</td>
                  <td>
                    {localise(event.label, lang)}
                    {event.date < today ? (
                      <span className="muted">{m.timeline.passed}</span>
                    ) : null}
                  </td>
                  <td>
                    <Source {...event.source} pressReport={m.pressReport} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="citation">
          {m.timeline.tranches}
          {(Object.keys(TRANCHES) as Tranche[])
            .map(
              (tranche) =>
                `${localise(TRANCHES[tranche].label, lang)}: ${trancheDeadlines(tranche, lang)}`,
            )
            .join(m.timeline.trancheJoin)}
          {m.timeline.ruleBefore}
          {RULE_SOURCES.map((source, index) => (
            <span key={source.url}>
              {index > 0 ? m.timeline.sourceJoin : ""}
              <Source {...source} pressReport={m.pressReport} />
            </span>
          ))}
          {m.timeline.ruleAfter}
        </p>
      </section>

      <section className="panel" id="methodology">
        <h2>{m.method.heading}</h2>
        <div className="stack prose">
          {m.method.paragraphs.map((paragraph) => (
            <p key={paragraph.lead}>
              <strong>{paragraph.lead}</strong> {paragraph.body}
            </p>
          ))}
        </div>
      </section>
    </>
  );
}
