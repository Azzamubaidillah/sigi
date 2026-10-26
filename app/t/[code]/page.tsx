import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { S1Citation } from "@/app/_components/Citation";
import { HolderName } from "@/app/_components/HolderName";
import { OwnershipBar } from "@/app/_components/OwnershipBar";
import { TradingViewWidget } from "@/app/_components/TradingViewWidget";
import {
  Figures,
  Icon,
  Notice,
  PageHeader,
  Pill,
  Section,
} from "@/app/_components/ui";
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
import {
  type HolderChange,
  MAJOR_HOLDER_HUNDREDTHS,
  positionsOf,
} from "@/src/ownership/metrics";
import { loadEvents } from "@/src/views/events";
import { loadHolderLinks } from "@/src/views/holders";
import {
  type ChangesSlice,
  type CompanyFigures,
  loadTickerOwnership,
  type OwnershipAbsence,
  type PublishedHolding,
} from "@/src/views/ownership";
import { thesesForTicker } from "@/src/views/theses";

import "../../styles/ticker.css";

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

function Move({ delta, lang }: { delta: number; lang: Lang }) {
  return (
    <span className="move">
      {delta === 0 ? null : <Icon name={delta > 0 ? "up" : "down"} />}
      {formatPercentChange(delta, lang)}
    </span>
  );
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
      <h3 className="sub">{title}</h3>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{m.holder}</th>
              <th scope="col" className="num">
                {m.before}
              </th>
              <th scope="col" className="num">
                {m.after}
              </th>
              <th scope="col" className="num hide-sm">
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
                <td className="num hide-sm">
                  {formatSharesChange(
                    (row.afterShares ?? 0) - (row.beforeShares ?? 0),
                    lang,
                  )}
                </td>
                <td className="num">
                  <Move
                    delta={
                      (row.afterHundredths ?? 0) - (row.beforeHundredths ?? 0)
                    }
                    lang={lang}
                  />
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
    <>
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
    </>
  );
}

/** The company's holders as one bar: holders of 5% or more, then the lit float. */
function HoldingBar({
  holdings,
  figures,
  m,
  lang,
}: {
  holdings: PublishedHolding[];
  figures: CompanyFigures;
  m: Messages["ownership"]["bar"];
  lang: Lang;
}) {
  const controllers = positionsOf(holdings)
    .filter((position) => position.hundredths >= MAJOR_HOLDER_HUNDREDTHS)
    .sort((a, b) => b.hundredths - a.hundredths)
    .map((position) => ({
      key: position.key,
      label: position.investorName,
      value: formatPercent(position.hundredths, lang),
      hundredths: position.hundredths,
    }));
  const float = figures.freeFloatUpperBoundHundredths;
  const held = controllers.map((c) => `${c.label} ${c.value}`).join(", ");
  return (
    <OwnershipBar
      size="lg"
      controllers={controllers}
      float={{
        label: m.float,
        value: formatPercent(float, lang),
        hundredths: float,
      }}
      minimumLabel={m.minimum}
      summary={m.summary(held || m.none, formatPercent(float, lang))}
    />
  );
}

function FreeFloatVerdict({
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
      <Notice tone="warn">
        <p>
          {m.incompleteBefore(formatPercent(figures.sumHundredths, lang))}
          <Link href="/data">{m.incompleteLink}</Link>
          {m.incompleteAfter}
        </p>
      </Notice>
    );
  }
  const bound = figures.freeFloatUpperBoundHundredths;
  if (bound < FREE_FLOAT_MINIMUM_HUNDREDTHS) {
    return (
      <Notice tone="negative">
        <p>
          <strong>{m.belowStrong}</strong>
          {m.below(
            formatPercent(bound, lang),
            possibleDeadlines(possibleTranches(bound), lang).join("; "),
          )}
        </p>
      </Notice>
    );
  }
  return <p className="verdict">{m.notBelow}</p>;
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
    <Section id="dates" title={m.heading} note={m.lede}>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{m.date}</th>
              <th scope="col">{m.event}</th>
              <th scope="col" className="hide-sm">
                {m.source}
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={`${event.date} ${event.label.en}`}>
                <td className="nowrap">
                  {formatDate(event.date, lang)}
                  {event.past ? (
                    <>
                      {" "}
                      <Pill>{m.past}</Pill>
                    </>
                  ) : null}
                </td>
                <td>{localise(event.label, lang)}</td>
                <td className="hide-sm">
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
      <p>
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
    </Section>
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
    <Section id="theses" title={m.heading}>
      {theses.length === 0 ? (
        <p className="absent">{m.none(code)}</p>
      ) : (
        <ul className="thesis-list">
          {theses.map((thesis) => (
            <li key={thesis.slug}>
              <Link href={`/theses/${thesis.slug}`}>{thesis.title}</Link>{" "}
              <Pill tone={thesis.status === "active" ? "positive" : undefined}>
                {status[thesis.status]}
              </Pill>{" "}
              <span className="muted">{thesis.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
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
    <Section id="tradingview" title={heading.heading} note={heading.lede}>
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
    </Section>
  );
}

/** Why the ownership figures are missing, in the page's language. */
function absenceText(reason: OwnershipAbsence, lang: Lang): string {
  return commonMessages[lang].ownershipAbsence[reason];
}

function BackLink({ m }: { m: Messages }) {
  return (
    <Link className="back" href="/">
      <Icon name="back" />
      {m.allCompanies}
    </Link>
  );
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
        <PageHeader
          title={<span className="ticker-code">{code}</span>}
          aside={<BackLink m={m} />}
        />
        <Section id="ownership" title={m.ownership.heading}>
          <p className="absent">{absenceText(ownership.reason, lang)}</p>
          {ownership.month ? (
            <S1Citation month={ownership.month} lang={lang} />
          ) : null}
        </Section>
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
      <PageHeader
        title={
          <span className="ticker-title">
            <span className="ticker-code">{figures.shareCode}</span>{" "}
            <span className="ticker-name">{figures.issuerName}</span>
          </span>
        }
        lede={m.lede(formatDate(ownership.month.recordDate, lang))}
        aside={<BackLink m={m} />}
      />

      <Section id="ownership" title={m.ownership.heading}>
        <FreeFloatVerdict figures={figures} m={m.freeFloat} lang={lang} />
        {figures.registerIncomplete ? null : (
          <HoldingBar
            holdings={ownership.holdings}
            figures={figures}
            m={m.ownership.bar}
            lang={lang}
          />
        )}
        <Figures
          items={[
            // The bar and its legend already give the float; without a bar
            // the figure says why there is none.
            ...(figures.registerIncomplete
              ? [
                  {
                    label: m.ownership.freeFloat,
                    value: m.ownership.notGiven,
                  },
                ]
              : []),
            {
              label: m.ownership.largest,
              value: formatPercent(figures.topHundredths, lang),
            },
            {
              label: m.ownership.heldBelow,
              value: formatPercent(figures.heldBelowOneHundredths, lang),
            },
            {
              label: m.ownership.hhi,
              value: formatHhi(figures.hhi, lang),
            },
            { label: m.ownership.holders, value: figures.holders },
          ]}
        />
        <p className="muted method">
          {m.freeFloat.method}
          <Link href="/investability#methodology">
            {m.freeFloat.methodLink}
          </Link>
          .
        </p>
      </Section>

      <Section id="holders" title={m.holdersTable.heading}>
        {mismatched.length > 0 ? (
          <Notice tone="warn">
            <p>{m.holdersTable.mismatch(mismatched.length)}</p>
          </Notice>
        ) : null}
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{m.holdersTable.holder}</th>
                <th scope="col">{m.holdersTable.type}</th>
                <th scope="col" className="hide-sm">
                  {m.holdersTable.localForeign}
                </th>
                <th scope="col" className="hide-md">
                  {m.holdersTable.domicile}
                </th>
                <th scope="col" className="num hide-md">
                  {m.holdersTable.scripless}
                </th>
                <th scope="col" className="num hide-md">
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
                    <td className="hide-sm">
                      {localForeignLabel(holding.localForeign, lang)}
                    </td>
                    <td className="hide-md">{holding.domicile ?? "—"}</td>
                    <td className="num hide-md">
                      {formatShares(holding.sharesScripless, lang)}
                    </td>
                    <td className="num hide-md">
                      {formatShares(holding.sharesScrip, lang)}
                    </td>
                    <td className="num">
                      {formatShares(holding.sharesTotal, lang)}
                      {inconsistent ? (
                        <>
                          {" "}
                          <span title={m.holdersTable.asPublishedTitle}>
                            <Pill tone="warn">
                              {m.holdersTable.asPublished}
                            </Pill>
                          </span>
                        </>
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
      </Section>

      <Section id="changes" title={m.changes.heading}>
        <Changes
          slice={ownership.changes}
          links={links}
          m={m.changes}
          lang={lang}
        />
      </Section>

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
