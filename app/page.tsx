import Link from "next/link";

import { S1Citation } from "@/app/_components/Citation";
import { TradingViewWidget } from "@/app/_components/TradingViewWidget";
import { formatDate, formatHhi, formatPercent } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { loadConfig } from "@/src/config";
import { commonMessages } from "@/src/i18n/messages/common";
import { marketMessages } from "@/src/i18n/messages/market";
import {
  type CompanyFigures,
  loadCompanyScreen,
  parseScreenFilters,
  type ScreenFilters,
  SORTS,
} from "@/src/views/ownership";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function percentValue(hundredths: number | null): string {
  return hundredths === null ? "" : String(hundredths / 100);
}

type Messages = (typeof marketMessages)["en"];

function ScreenForm({
  filters,
  typeOptions,
  m,
}: {
  filters: ScreenFilters;
  typeOptions: { key: string; label: string }[];
  m: Messages["screen"];
}) {
  return (
    <form className="screen" method="get" action="/">
      <label>
        {m.query}
        <input
          name="q"
          defaultValue={filters.query}
          placeholder={m.queryPlaceholder}
        />
      </label>
      <label>
        {m.floatMin}
        <input
          name="floatMin"
          inputMode="decimal"
          defaultValue={percentValue(filters.floatMin)}
        />
      </label>
      <label>
        {m.floatMax}
        <input
          name="floatMax"
          inputMode="decimal"
          defaultValue={percentValue(filters.floatMax)}
        />
      </label>
      <label>
        {m.topMin}
        <input
          name="topMin"
          inputMode="decimal"
          defaultValue={percentValue(filters.topMin)}
        />
      </label>
      <label>
        {m.type}
        <select name="type" defaultValue={filters.type ?? ""}>
          <option value="">{m.anyType}</option>
          {typeOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {m.sort}
        <select name="sort" defaultValue={filters.sort}>
          {SORTS.map((value) => (
            <option key={value} value={value}>
              {m.sorts[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          name="foreign"
          value="1"
          defaultChecked={filters.foreign}
        />
        {m.foreign}
      </label>
      <label className="check">
        <input
          type="checkbox"
          name="changed"
          value="1"
          defaultChecked={filters.changed}
        />
        {m.changed}
      </label>
      <div className="actions">
        <button className="button" type="submit">
          {m.apply}
        </button>
        <Link className="button secondary" href="/">
          {m.reset}
        </Link>
      </div>
    </form>
  );
}

function moves(company: CompanyFigures, m: Messages["moves"]): string {
  if (!company.changes) return "—";
  const { entered, exited, increased, decreased } = company.changes;
  const parts = [
    entered.length ? m.added(entered.length) : "",
    exited.length ? m.gone(exited.length) : "",
    increased.length ? m.up(increased.length) : "",
    decreased.length ? m.down(decreased.length) : "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : m.none;
}

export default async function MarketPage({ searchParams }: Props) {
  const lang = await getLang();
  const m = marketMessages[lang];
  const filters = parseScreenFilters(await searchParams);
  const screen = loadCompanyScreen(loadConfig().databasePath, filters);
  return (
    <>
      <div className="page-header">
        <h1>{m.title}</h1>
        <p className="lede">{m.lede}</p>
      </div>

      <section className="panel">
        <h2>{m.chart.heading}</h2>
        <TradingViewWidget
          title={m.chart.title}
          lang={lang}
          script="embed-widget-advanced-chart.js"
          height={420}
          config={{
            autosize: true,
            symbol: "IDX:COMPOSITE",
            interval: "D",
            timezone: "Asia/Jakarta",
            style: "1",
            allow_symbol_change: false,
            hide_side_toolbar: true,
            support_host: "https://www.tradingview.com",
          }}
        />
      </section>

      <section className="panel">
        <h2>{m.screen.heading}</h2>
        {screen.kind === "absent" ? (
          <p className="absent">
            {commonMessages[lang].ownershipAbsence[screen.reason]}
          </p>
        ) : (
          <>
            <ScreenForm
              filters={filters}
              typeOptions={screen.typeOptions}
              m={m.screen}
            />
            <p className="muted spaced">
              {m.status.asOf(formatDate(screen.month.recordDate, lang))}
              {screen.previous
                ? m.status.changesAgainst(
                    formatDate(screen.previous.recordDate, lang),
                  )
                : m.status.noEarlier}
              {m.status.shown(screen.companies.length, screen.total)}
              {screen.excluded.length > 0
                ? m.status.excludedPrefix +
                  screen.excluded
                    .map((e) =>
                      m.status.excludedItem(
                        e.count,
                        m.status.reasons[e.reason],
                      ),
                    )
                    .join(m.status.excludedJoin)
                : m.status.noneExcluded}
              {m.status.end}
            </p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">{m.table.code}</th>
                    <th scope="col">{m.table.company}</th>
                    <th scope="col" className="num">
                      {m.table.holders}
                    </th>
                    <th scope="col" className="num">
                      {m.table.largest}
                    </th>
                    <th scope="col" className="num">
                      {m.table.freeFloat}
                    </th>
                    <th scope="col" className="num">
                      {m.table.hhi}
                    </th>
                    <th scope="col">{m.table.since}</th>
                  </tr>
                </thead>
                <tbody>
                  {screen.companies.map((company) => (
                    <tr key={company.shareCode}>
                      <td className="mono">
                        <Link href={`/t/${company.shareCode}`}>
                          {company.shareCode}
                        </Link>
                      </td>
                      <td>{company.issuerName}</td>
                      <td className="num">{company.holders}</td>
                      <td className="num">
                        {formatPercent(company.topHundredths, lang)}
                      </td>
                      <td className="num">
                        {company.registerIncomplete ? (
                          <span
                            className="muted"
                            title={m.table.incompleteTitle}
                          >
                            {m.table.incomplete}
                          </span>
                        ) : (
                          formatPercent(
                            company.freeFloatUpperBoundHundredths,
                            lang,
                          )
                        )}
                      </td>
                      <td className="num">{formatHhi(company.hhi, lang)}</td>
                      <td>{moves(company, m.moves)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="citation">
              {m.bound.before}
              <Link href="/investability#methodology">{m.bound.link}</Link>
              {m.bound.after}
            </p>
            <S1Citation month={screen.month} lang={lang} />
          </>
        )}
      </section>

      <section className="panel">
        <h2>{m.screener.heading}</h2>
        <TradingViewWidget
          title={m.screener.title}
          lang={lang}
          script="embed-widget-screener.js"
          height={520}
          config={{
            width: "100%",
            height: 520,
            // Valuation columns rather than "overview", whose technical
            // buy/sell ratings would read as advice on this page.
            defaultColumn: "valuation",
            defaultScreen: "general",
            market: "indonesia",
            showToolbar: true,
          }}
        />
      </section>
    </>
  );
}
