import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { S1Citation } from "@/app/_components/Citation";
import { HolderName } from "@/app/_components/HolderName";
import { TradingViewWidget } from "@/app/_components/TradingViewWidget";
import {
  formatDate,
  formatHhi,
  formatPercent,
  formatPercentChange,
  formatShares,
  formatSharesChange,
} from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { localForeignLabel, possibleDeadlines } from "@/app/_lib/labels";
import { loadConfig } from "@/src/config";
import { localise } from "@/src/i18n/define";
import type { Lang } from "@/src/i18n/lang";
import { commonMessages } from "@/src/i18n/messages/common";
import { tickerMessages } from "@/src/i18n/messages/ticker";
import {
  FREE_FLOAT_MINIMUM_HUNDREDTHS,
  possibleTranches,
} from "@/src/investability/rule";
import { typeLabel } from "@/src/ownership/investor-classes";
import type { HolderChange } from "@/src/ownership/metrics";
import { loadEvents } from "@/src/views/events";
import { loadHolderLinks } from "@/src/views/holders";
import {
  type ChangesSlice,
  type CompanyFigures,
  loadTickerOwnership,
  type OwnershipAbsence,
} from "@/src/views/ownership";
import { thesesForTicker } from "@/src/views/theses";

type Params = { params: Promise<{ code: string }> };
type Messages = (typeof tickerMessages)["en"];
type Links = ReadonlyMap<string, string>;

function shareCodeOf(raw: string): string | null {
  const code = decodeURIComponent(raw).toUpperCase();
  return /^[A-Z]{4}$/.test(code) ? code : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const m = tickerMessages[await getLang()];
  const code = shareCodeOf((await params).code);
  return { title: code ? m.metaTitle(code) : m.notFound };
}

function ChangeTable({
  title,
  rows,
  links,
  m,
  lang,
}: {
  title: string;
  rows: HolderChange[];
  links: Links;
  m: Messages["changes"];
  lang: Lang;
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <h3>{title}</h3>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">{m.holder}</th>
              <th scope="col" className="num">
                {m.before}
              </th>
              <th scope="col" className="num">
                {m.after}
              </th>
              <th scope="col" className="num">
                {m.shares}
              </th>
              <th scope="col" className="num">
                {m.change}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <HolderName name={row.investorName} links={links} />
                </td>
                <td className="num">
                  {row.beforeHundredths === null
                    ? "—"
                    : formatPercent(row.beforeHundredths, lang)}
                </td>
                <td className="num">
                  {row.afterHundredths === null
                    ? "—"
                    : formatPercent(row.afterHundredths, lang)}
                </td>
                <td className="num">
                  {formatSharesChange(
                    (row.afterShares ?? 0) - (row.beforeShares ?? 0),
                    lang,
                  )}
                </td>
                <td className="num">
                  {formatPercentChange(
                    (row.afterHundredths ?? 0) - (row.beforeHundredths ?? 0),
                    lang,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Changes({
  slice,
  links,
  m,
  lang,
}: {
  slice: ChangesSlice;
  links: Links;
  m: Messages["changes"];
  lang: Lang;
}) {
  if (slice.kind === "absent") {
    return (
      <p className="absent">
        {commonMessages[lang].ownershipAbsence[slice.reason]}
      </p>
    );
  }
  const { changes, previous } = slice;
  const moved =
    changes.entered.length +
    changes.exited.length +
    changes.increased.length +
    changes.decreased.length;
  return (
    <div className="stack">
      <p className="muted">
        {m.summaryBefore(
          formatDate(previous.recordDate, lang),
          changes.entered.length,
          changes.exited.length,
          changes.increased.length,
          changes.decreased.length,
          changes.unchanged,
        )}
        <Link href="/investability#methodology">{m.methodologyLink}</Link>
        {m.summaryAfter}
      </p>
      {moved > 0 ? (
        <>
          <ChangeTable
            title={m.entered}
            rows={changes.entered}
            links={links}
            m={m}
            lang={lang}
          />
          <ChangeTable
            title={m.exited}
            rows={changes.exited}
            links={links}
            m={m}
            lang={lang}
          />
          <ChangeTable
            title={m.increased}
            rows={changes.increased}
            links={links}
            m={m}
            lang={lang}
          />
          <ChangeTable
            title={m.decreased}
            rows={changes.decreased}
            links={links}
            m={m}
            lang={lang}
          />
        </>
      ) : null}
    </div>
  );
}

function FreeFloat({
  figures,
  m,
  lang,
}: {
  figures: CompanyFigures;
  m: Messages["freeFloat"];
  lang: Lang;
}) {
  if (figures.registerIncomplete) {
    return (
      <p className="notice">
        {m.incompleteBefore(formatPercent(figures.sumHundredths, lang))}
        <Link href="/data">{m.incompleteLink}</Link>
        {m.incompleteAfter}
      </p>
    );
  }
  const bound = figures.freeFloatUpperBoundHundredths;
  const tranches = possibleTranches(bound);
  return (
    <div className="stack">
      {bound < FREE_FLOAT_MINIMUM_HUNDREDTHS ? (
        <p className="notice">
          <strong>{m.belowStrong}</strong>
          {m.below(
            formatPercent(bound, lang),
            possibleDeadlines(tranches, lang).join("; "),
          )}
        </p>
      ) : (
        <p className="muted">{m.notBelow}</p>
      )}
      <p className="citation">
        {m.method}
        <Link href="/investability#methodology">{m.methodLink}</Link>.
      </p>
    </div>
  );
}

function EventsSection({
  code,
  figures,
  m,
  lang,
}: {
  code: string;
  /** Null when the code is not in the register. */
  figures: CompanyFigures | null;
  m: Messages["events"];
  lang: Lang;
}) {
  const events = loadEvents();
  const tranches =
    figures && !figures.registerIncomplete
      ? possibleTranches(figures.freeFloatUpperBoundHundredths)
      : [];
  return (
    <section className="panel">
      <h2>{m.heading}</h2>
      <p className="muted">{m.lede}</p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">{m.date}</th>
              <th scope="col">{m.event}</th>
              <th scope="col">{m.source}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={`${event.date} ${event.label.en}`}>
                <td className="mono">
                  {formatDate(event.date, lang)}
                  {event.past ? (
                    <span className="badge flag">{m.past}</span>
                  ) : null}
                </td>
                <td>{localise(event.label, lang)}</td>
                <td>
                  <a href={event.source.url} rel="noopener noreferrer nofollow">
                    {event.source.publisher}
                  </a>
                  {event.source.kind === "secondary" ? ` (${m.secondary})` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="spaced">
        {figures === null ? (
          m.companyNoRegister(code)
        ) : tranches.length > 0 ? (
          <>
            {m.companyBefore(code)}
            {possibleDeadlines(tranches, lang).join("; ")}.
          </>
        ) : (
          m.companyNone(code)
        )}
      </p>
    </section>
  );
}

function ThesesSection({
  code,
  m,
  lang,
}: {
  code: string;
  m: Messages["theses"];
  lang: Lang;
}) {
  const theses = thesesForTicker(loadConfig(), code);
  const status = commonMessages[lang].thesisStatus;
  return (
    <section className="panel">
      <h2>{m.heading}</h2>
      {theses.length === 0 ? (
        <p className="absent">{m.none(code)}</p>
      ) : (
        <ul>
          {theses.map((thesis) => (
            <li key={thesis.slug}>
              <Link href={`/theses/${thesis.slug}`}>{thesis.title}</Link>{" "}
              <span
                className={thesis.status === "active" ? "badge pass" : "badge"}
              >
                {status[thesis.status]}
              </span>{" "}
              <span className="muted">{thesis.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** TradingView's own sections, apart from Sigi's and labelled as theirs (PRD F8, S3). */
function TradingViewSections({
  code,
  m,
  lang,
}: {
  code: string;
  m: Messages["tradingView"];
  lang: Lang;
}) {
  const symbol = `IDX:${code}`;
  const common = {
    symbol,
    isTransparent: false,
    support_host: "https://www.tradingview.com",
  };
  const heading = commonMessages[lang].thirdParty;
  return (
    <section className="panel third-party" aria-labelledby="tradingview">
      <h2 id="tradingview">{heading.heading}</h2>
      <p className="muted">{heading.lede}</p>
      <h3>{m.chart}</h3>
      <TradingViewWidget
        lang={lang}
        title={m.chartTitle(code)}
        script="embed-widget-advanced-chart.js"
        height={420}
        config={{
          ...common,
          autosize: true,
          interval: "D",
          timezone: "Asia/Jakarta",
          style: "1",
          allow_symbol_change: false,
          hide_side_toolbar: true,
        }}
      />
      <h3>{m.fundamentals}</h3>
      <TradingViewWidget
        lang={lang}
        title={m.fundamentalsTitle(code)}
        script="embed-widget-financials.js"
        height={480}
        config={{
          ...common,
          displayMode: "regular",
          width: "100%",
          height: "100%",
        }}
      />
      <h3>{m.profile}</h3>
      <TradingViewWidget
        lang={lang}
        title={m.profileTitle(code)}
        script="embed-widget-symbol-profile.js"
        height={300}
        config={{ ...common, width: "100%", height: "100%" }}
      />
      <h3>{m.stories}</h3>
      <TradingViewWidget
        lang={lang}
        title={m.storiesTitle(code)}
        script="embed-widget-timeline.js"
        height={420}
        config={{
          ...common,
          feedMode: "symbol",
          displayMode: "regular",
          width: "100%",
          height: "100%",
        }}
      />
    </section>
  );
}

/** Why the ownership figures are missing, in the page's language. */
function absenceText(reason: OwnershipAbsence, lang: Lang): string {
  return commonMessages[lang].ownershipAbsence[reason];
}

export default async function TickerPage({ params }: Params) {
  const code = shareCodeOf((await params).code);
  if (!code) notFound();
  const lang = await getLang();
  const m = tickerMessages[lang];
  const { databasePath } = loadConfig();
  const ownership = loadTickerOwnership(databasePath, code);

  if (ownership.kind === "absent") {
    return (
      <>
        <div className="page-header">
          <h1 className="mono">{code}</h1>
        </div>
        <section className="panel">
          <h2>{m.ownership.heading}</h2>
          <p className="absent">{absenceText(ownership.reason, lang)}</p>
          {ownership.month ? (
            <S1Citation month={ownership.month} lang={lang} />
          ) : null}
        </section>
        <EventsSection code={code} figures={null} m={m.events} lang={lang} />
        <ThesesSection code={code} m={m.theses} lang={lang} />
        <TradingViewSections code={code} m={m.tradingView} lang={lang} />
      </>
    );
  }

  const { figures } = ownership;
  const links = loadHolderLinks(databasePath);
  const mismatched = ownership.holdings.filter(
    (holding) =>
      holding.sharesTotal !== holding.sharesScripless + holding.sharesScrip,
  );
  return (
    <>
      <div className="page-header">
        <h1>
          <span className="mono">{figures.shareCode}</span> ·{" "}
          {figures.issuerName}
        </h1>
        <p className="lede">
          {m.lede(formatDate(ownership.month.recordDate, lang))}{" "}
          <Link href="/">{m.allCompanies}</Link>
        </p>
      </div>

      <section className="panel">
        <h2>{m.ownership.heading}</h2>
        <dl className="figures">
          <div>
            <dt>{m.ownership.freeFloat}</dt>
            <dd>
              {figures.registerIncomplete
                ? m.ownership.notGiven
                : formatPercent(figures.freeFloatUpperBoundHundredths, lang)}
            </dd>
          </div>
          <div>
            <dt>{m.ownership.largest}</dt>
            <dd>{formatPercent(figures.topHundredths, lang)}</dd>
          </div>
          <div>
            <dt>{m.ownership.heldBelow}</dt>
            <dd>{formatPercent(figures.heldBelowOneHundredths, lang)}</dd>
          </div>
          <div>
            <dt>{m.ownership.hhi}</dt>
            <dd>{formatHhi(figures.hhi, lang)}</dd>
          </div>
          <div>
            <dt>{m.ownership.holders}</dt>
            <dd>{figures.holders}</dd>
          </div>
        </dl>
        <div className="spaced">
          <FreeFloat figures={figures} m={m.freeFloat} lang={lang} />
        </div>
      </section>

      <section className="panel">
        <h2>{m.holdersTable.heading}</h2>
        {mismatched.length > 0 ? (
          <p className="notice">{m.holdersTable.mismatch(mismatched.length)}</p>
        ) : null}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{m.holdersTable.holder}</th>
                <th scope="col">{m.holdersTable.type}</th>
                <th scope="col">{m.holdersTable.localForeign}</th>
                <th scope="col">{m.holdersTable.domicile}</th>
                <th scope="col" className="num">
                  {m.holdersTable.scripless}
                </th>
                <th scope="col" className="num">
                  {m.holdersTable.scrip}
                </th>
                <th scope="col" className="num">
                  {m.holdersTable.total}
                </th>
                <th scope="col" className="num">
                  {m.holdersTable.percent}
                </th>
              </tr>
            </thead>
            <tbody>
              {ownership.holdings.map((holding) => {
                const inconsistent =
                  holding.sharesTotal !==
                  holding.sharesScripless + holding.sharesScrip;
                return (
                  <tr key={holding.rowNumber}>
                    <td>
                      <HolderName name={holding.investorName} links={links} />
                    </td>
                    <td>{typeLabel(holding.investorType)}</td>
                    <td>{localForeignLabel(holding.localForeign, lang)}</td>
                    <td>{holding.domicile ?? "—"}</td>
                    <td className="num">
                      {formatShares(holding.sharesScripless, lang)}
                    </td>
                    <td className="num">
                      {formatShares(holding.sharesScrip, lang)}
                    </td>
                    <td className="num">
                      {formatShares(holding.sharesTotal, lang)}
                      {inconsistent ? (
                        <span
                          className="badge hold flag"
                          title={m.holdersTable.asPublishedTitle}
                        >
                          {m.holdersTable.asPublished}
                        </span>
                      ) : null}
                    </td>
                    <td className="num">
                      {formatPercent(holding.percentHundredths, lang)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <S1Citation month={ownership.month} lang={lang} />
      </section>

      <section className="panel">
        <h2>{m.changes.heading}</h2>
        <Changes
          slice={ownership.changes}
          links={links}
          m={m.changes}
          lang={lang}
        />
      </section>

      <EventsSection
        code={figures.shareCode}
        figures={figures}
        m={m.events}
        lang={lang}
      />
      <ThesesSection code={figures.shareCode} m={m.theses} lang={lang} />
      <TradingViewSections
        code={figures.shareCode}
        m={m.tradingView}
        lang={lang}
      />
    </>
  );
}
