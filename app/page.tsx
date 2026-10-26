import Link from "next/link";

import { OwnershipBar } from "@/app/_components/OwnershipBar";
import { S1Citation } from "@/app/_components/Citation";
import { TradingViewWidget } from "@/app/_components/TradingViewWidget";
import { Figures, Icon, PageHeader, Pill, Section } from "@/app/_components/ui";
import { formatDate, formatHhi, formatPercent } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { loadConfig } from "@/src/config";
import { localise } from "@/src/i18n/define";
import type { Lang } from "@/src/i18n/lang";
import { briefMessages } from "@/src/i18n/messages/brief";
import { commonMessages } from "@/src/i18n/messages/common";
import { marketMessages } from "@/src/i18n/messages/market";
import { FREE_FLOAT_MINIMUM_HUNDREDTHS } from "@/src/investability/rule";
import { readBrief } from "@/src/views/brief";
import { loadEvents } from "@/src/views/events";
import { loadInvestability } from "@/src/views/investability";
import {
  type CompanyFigures,
  loadCompanyScreen,
  parseScreenFilters,
  type ScreenFilters,
  SORTS,
} from "@/src/views/ownership";

import "./styles/market.css";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Messages = (typeof marketMessages)["en"];

const PAGE_SIZE = 50;

function percentValue(hundredths: number | null): string {
  return hundredths === null ? "" : String(hundredths / 100);
}

function pageParam(
  params: Record<string, string | string[] | undefined>,
): number {
  const raw = params.page;
  const page = Number.parseInt((Array.isArray(raw) ? raw[0] : raw) ?? "", 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** The screen's address for a page of results; filters survive paging. */
function screenHref(filters: ScreenFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.floatMin !== null)
    params.set("floatMin", percentValue(filters.floatMin));
  if (filters.floatMax !== null)
    params.set("floatMax", percentValue(filters.floatMax));
  if (filters.topMin !== null)
    params.set("topMin", percentValue(filters.topMin));
  if (filters.type) params.set("type", filters.type);
  if (filters.foreign) params.set("foreign", "1");
  if (filters.changed) params.set("changed", "1");
  if (filters.sort !== "code") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}#register` : "/#register";
}

function activeFilters(filters: ScreenFilters): number {
  return [
    filters.query !== "",
    filters.floatMin !== null,
    filters.floatMax !== null,
    filters.topMin !== null,
    filters.type !== null,
    filters.foreign,
    filters.changed,
  ].filter(Boolean).length;
}

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
    <form className="filters" method="get" action="/#register">
      <div className="field">
        <label htmlFor="f-q">{m.query}</label>
        <input
          id="f-q"
          name="q"
          defaultValue={filters.query}
          placeholder={m.queryPlaceholder}
        />
      </div>
      <div className="field">
        <label htmlFor="f-min">{m.floatMin}</label>
        <input
          id="f-min"
          name="floatMin"
          inputMode="decimal"
          defaultValue={percentValue(filters.floatMin)}
        />
      </div>
      <div className="field">
        <label htmlFor="f-max">{m.floatMax}</label>
        <input
          id="f-max"
          name="floatMax"
          inputMode="decimal"
          defaultValue={percentValue(filters.floatMax)}
        />
      </div>
      <div className="field">
        <label htmlFor="f-top">{m.topMin}</label>
        <input
          id="f-top"
          name="topMin"
          inputMode="decimal"
          defaultValue={percentValue(filters.topMin)}
        />
      </div>
      <div className="field">
        <label htmlFor="f-type">{m.type}</label>
        <select id="f-type" name="type" defaultValue={filters.type ?? ""}>
          <option value="">{m.anyType}</option>
          {typeOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-sort">{m.sort}</label>
        <select id="f-sort" name="sort" defaultValue={filters.sort}>
          {SORTS.map((value) => (
            <option key={value} value={value}>
              {m.sorts[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="field field--check">
        <input
          id="f-foreign"
          type="checkbox"
          name="foreign"
          value="1"
          defaultChecked={filters.foreign}
        />
        <label htmlFor="f-foreign">{m.foreign}</label>
      </div>
      <div className="field field--check">
        <input
          id="f-changed"
          type="checkbox"
          name="changed"
          value="1"
          defaultChecked={filters.changed}
        />
        <label htmlFor="f-changed">{m.changed}</label>
      </div>
      <div className="form-actions">
        <button className="btn" type="submit">
          {m.apply}
        </button>
        <Link className="btn btn--quiet" href="/#register">
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

/** The row's bar: the largest holder, the other holders of 5% or more, the lit float. */
function RowBar({
  company,
  m,
  lang,
}: {
  company: CompanyFigures;
  m: Messages;
  lang: Lang;
}) {
  const float = company.freeFloatUpperBoundHundredths;
  const controlled = 10_000 - float;
  const largest = Math.min(company.topHundredths, controlled);
  const others = controlled - largest;
  return (
    <OwnershipBar
      size="sm"
      minimumLabel={m.register.legend.line}
      summary={m.table.barSummary(
        formatPercent(largest, lang),
        formatPercent(others, lang),
        formatPercent(float, lang),
      )}
      controllers={[
        {
          key: "largest",
          label: m.register.legend.largest,
          value: formatPercent(largest, lang),
          hundredths: largest,
        },
        {
          key: "others",
          label: m.register.legend.others,
          value: formatPercent(others, lang),
          hundredths: others,
        },
      ]}
      float={{
        label: m.register.legend.float,
        value: formatPercent(float, lang),
        hundredths: float,
      }}
    />
  );
}

export default async function MarketPage({ searchParams }: Props) {
  const lang = await getLang();
  const m = marketMessages[lang];
  const params = await searchParams;
  const filters = parseScreenFilters(params);
  const config = loadConfig();
  const screen = loadCompanyScreen(config.databasePath, filters);
  const investability = loadInvestability(config.databasePath);
  const brief = readBrief(config.dataDirectory, Date.now());
  const nextEvent = loadEvents().find((event) => !event.past);

  const total = screen.kind === "list" ? screen.companies.length : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageParam(params), pages);
  const first = (page - 1) * PAGE_SIZE;

  return (
    <>
      <PageHeader
        title={m.title}
        lede={m.lede}
        aside={
          screen.kind === "list" ? (
            <p className="stamp">
              {m.status.asOf(formatDate(screen.month.recordDate, lang))}
            </p>
          ) : null
        }
      />

      <form
        className="home-search"
        role="search"
        action="/search"
        method="get"
        aria-label={m.hero.searchLabel}
      >
        <label className="sr-only" htmlFor="home-q">
          {m.hero.searchLabel}
        </label>
        <Icon name="search" />
        <input
          id="home-q"
          name="q"
          type="search"
          maxLength={80}
          autoComplete="off"
          placeholder={m.hero.searchPlaceholder}
        />
        <button className="btn" type="submit">
          {m.hero.searchButton}
        </button>
      </form>

      {investability.kind === "ready" ? (
        <div className="home-figures">
          <Figures
            items={[
              {
                label: m.figures.below,
                value: (
                  <Link href="/investability">
                    {investability.belowMinimum.length}
                  </Link>
                ),
                note: m.figures.belowNote,
                lead: true,
              },
              {
                label: m.figures.companies,
                value: investability.companies,
                note: m.status.asOf(
                  formatDate(investability.month.recordDate, lang),
                ),
              },
              ...(investability.previous
                ? [
                    {
                      label: m.figures.crossed,
                      value:
                        investability.crossedUp.length +
                        investability.crossedDown.length,
                      note: m.figures.crossedNote(
                        investability.crossedUp.length,
                        investability.crossedDown.length,
                      ),
                    },
                  ]
                : []),
              ...(nextEvent
                ? [
                    {
                      label: m.figures.next,
                      value: formatDate(nextEvent.date, lang),
                      note: localise(nextEvent.label, lang),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ) : null}

      {brief.status === "ok" ? (
        <aside className="today" aria-label={m.today.label}>
          <div>
            <p className="today-meta">
              <Pill tone={brief.analysis.stance === "watch" ? "warn" : "info"}>
                {briefMessages[lang].stance[brief.analysis.stance]}
              </Pill>{" "}
              {m.today.label}, {formatDate(brief.analysis.date, lang)}
            </p>
            <p className="today-headline" lang="en">
              {brief.analysis.headline}
            </p>
          </div>
          <Link className="btn btn--quiet" href="/brief">
            {m.today.read}
          </Link>
        </aside>
      ) : null}

      <Section
        id="register"
        title={m.register.heading}
        note={
          screen.kind === "list" ? (
            <>
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
            </>
          ) : undefined
        }
      >
        {screen.kind === "absent" ? (
          <p className="absent">
            {commonMessages[lang].ownershipAbsence[screen.reason]}
          </p>
        ) : (
          <>
            <details className="filterbox" open={activeFilters(filters) > 0}>
              <summary>
                {m.screen.summary}
                {activeFilters(filters) > 0 ? (
                  <Pill tone="info">
                    {m.screen.active(activeFilters(filters))}
                  </Pill>
                ) : null}
              </summary>
              <ScreenForm
                filters={filters}
                typeOptions={screen.typeOptions}
                m={m.screen}
              />
            </details>

            <ul className="obar-legend register-legend">
              <li>
                <span className="sw" data-tone="1" />
                {m.register.legend.largest}
              </li>
              <li>
                <span className="sw" data-tone="2" />
                {m.register.legend.others}
              </li>
              <li>
                <span className="sw" data-tone="float" />
                {m.register.legend.float}
              </li>
              <li>
                <span className="sw sw--line" />
                {m.register.legend.line}
              </li>
            </ul>

            {total === 0 ? (
              <p className="absent">{m.table.empty}</p>
            ) : (
              <div className="table-wrap">
                <table className="tbl register">
                  <thead>
                    <tr>
                      <th scope="col">{m.table.code}</th>
                      <th scope="col">{m.table.company}</th>
                      <th scope="col" className="bar-col">
                        {m.table.ownership}
                      </th>
                      <th scope="col" className="num">
                        {m.table.freeFloat}
                      </th>
                      <th scope="col" className="num hide-sm">
                        {m.table.largest}
                      </th>
                      <th scope="col" className="num hide-md">
                        {m.table.holders}
                      </th>
                      <th scope="col" className="num hide-md">
                        {m.table.hhi}
                      </th>
                      <th scope="col" className="hide-sm">
                        {m.table.since}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {screen.companies
                      .slice(first, first + PAGE_SIZE)
                      .map((company) => {
                        const below =
                          !company.registerIncomplete &&
                          company.freeFloatUpperBoundHundredths <
                            FREE_FLOAT_MINIMUM_HUNDREDTHS;
                        return (
                          <tr key={company.shareCode}>
                            <td>
                              <Link
                                className="code"
                                href={`/t/${company.shareCode}`}
                              >
                                {company.shareCode}
                              </Link>
                            </td>
                            <td>{company.issuerName}</td>
                            <td className="bar-col">
                              {company.registerIncomplete ? null : (
                                <RowBar company={company} m={m} lang={lang} />
                              )}
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
                                <span className={below ? "tone-negative" : ""}>
                                  {below ? (
                                    <>
                                      <Icon name="down" />
                                      <span className="sr-only">
                                        {m.table.belowLine}:{" "}
                                      </span>
                                    </>
                                  ) : null}
                                  {formatPercent(
                                    company.freeFloatUpperBoundHundredths,
                                    lang,
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="num hide-sm">
                              {formatPercent(company.topHundredths, lang)}
                            </td>
                            <td className="num hide-md">{company.holders}</td>
                            <td className="num hide-md">
                              {formatHhi(company.hhi, lang)}
                            </td>
                            <td className="hide-sm">
                              {moves(company, m.moves)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {pages > 1 ? (
              <nav className="pager" aria-label={m.pager.label}>
                <p className="count">
                  {m.pager.range(
                    first + 1,
                    Math.min(first + PAGE_SIZE, total),
                    total,
                  )}
                </p>
                <div className="pager-links">
                  {page > 1 ? (
                    <Link
                      href={screenHref(filters, page - 1)}
                      rel="prev"
                      scroll={false}
                    >
                      {m.pager.previous}
                    </Link>
                  ) : (
                    <span aria-disabled="true">{m.pager.previous}</span>
                  )}
                  {page < pages ? (
                    <Link
                      href={screenHref(filters, page + 1)}
                      rel="next"
                      scroll={false}
                    >
                      {m.pager.next}
                    </Link>
                  ) : (
                    <span aria-disabled="true">{m.pager.next}</span>
                  )}
                </div>
              </nav>
            ) : null}

            <p className="muted bound-note">
              {m.bound.before}
              <Link href="/investability#methodology">{m.bound.link}</Link>
              {m.bound.after}
            </p>
            <S1Citation month={screen.month} lang={lang} />
          </>
        )}
      </Section>

      <Section
        id="markets"
        title={m.markets.heading}
        note={commonMessages[lang].thirdParty.lede}
      >
        <h3>{m.chart.heading}</h3>
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
        <h3>{m.screener.heading}</h3>
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
      </Section>
    </>
  );
}
