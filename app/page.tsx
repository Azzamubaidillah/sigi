import Link from "next/link";

import { S1Citation } from "@/app/_components/Citation";
import { TradingViewWidget } from "@/app/_components/TradingViewWidget";
import { formatDate, formatHhi, formatPercent } from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import {
  ABSENCE_TEXT,
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

function ScreenForm({
  filters,
  typeOptions,
}: {
  filters: ScreenFilters;
  typeOptions: { key: string; label: string }[];
}) {
  return (
    <form className="screen" method="get" action="/">
      <label>
        Code or name
        <input
          name="q"
          defaultValue={filters.query}
          placeholder="e.g. BBCA or bank"
        />
      </label>
      <label>
        Free float bound at least (%)
        <input
          name="floatMin"
          inputMode="decimal"
          defaultValue={percentValue(filters.floatMin)}
        />
      </label>
      <label>
        Free float bound below (%)
        <input
          name="floatMax"
          inputMode="decimal"
          defaultValue={percentValue(filters.floatMax)}
        />
      </label>
      <label>
        Largest holder at least (%)
        <input
          name="topMin"
          inputMode="decimal"
          defaultValue={percentValue(filters.topMin)}
        />
      </label>
      <label>
        Has a holder of type
        <select name="type" defaultValue={filters.type ?? ""}>
          <option value="">Any</option>
          {typeOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sort
        <select name="sort" defaultValue={filters.sort}>
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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
        Has a foreign holder above 1%
      </label>
      <label className="check">
        <input
          type="checkbox"
          name="changed"
          value="1"
          defaultChecked={filters.changed}
        />
        Holders changed since the previous month
      </label>
      <div className="actions">
        <button className="button" type="submit">
          Apply
        </button>
        <Link className="button secondary" href="/">
          Reset
        </Link>
      </div>
    </form>
  );
}

function moves(company: CompanyFigures): string {
  if (!company.changes) return "—";
  const { entered, exited, increased, decreased } = company.changes;
  const parts = [
    entered.length ? `${entered.length} new` : "",
    exited.length ? `${exited.length} gone` : "",
    increased.length ? `${increased.length} up` : "",
    decreased.length ? `${decreased.length} down` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "none";
}

export default async function MarketPage({ searchParams }: Props) {
  const filters = parseScreenFilters(await searchParams);
  const screen = loadCompanyScreen(loadConfig().databasePath, filters);
  return (
    <>
      <div className="page-header">
        <h1>Who owns Indonesia&apos;s listed companies</h1>
        <p className="lede">
          Every holder above 1% of every listed company, from the monthly
          register, screened on Sigi&apos;s own figures. Prices and charts are
          TradingView&apos;s, shown as embedded.
        </p>
      </div>

      <section className="panel">
        <h2>IHSG (Jakarta Composite)</h2>
        <TradingViewWidget
          title="IHSG daily chart by TradingView"
          script="embed-widget-advanced-chart.js"
          height={420}
          config={{
            autosize: true,
            symbol: "IDX:COMPOSITE",
            interval: "D",
            timezone: "Asia/Jakarta",
            style: "1",
            locale: "en",
            allow_symbol_change: false,
            hide_side_toolbar: true,
            support_host: "https://www.tradingview.com",
          }}
        />
      </section>

      <section className="panel">
        <h2>Ownership screen</h2>
        {screen.kind === "absent" ? (
          <p className="absent">{ABSENCE_TEXT[screen.reason]}</p>
        ) : (
          <>
            <ScreenForm filters={filters} typeOptions={screen.typeOptions} />
            <p className="muted spaced">
              As of {formatDate(screen.month.recordDate)}
              {screen.previous
                ? `, changes against ${formatDate(screen.previous.recordDate)}`
                : ", no earlier month to compare"}
              . {screen.companies.length} of {screen.total} companies shown
              {screen.excluded.length > 0
                ? `; excluded: ${screen.excluded.map((e) => `${e.count} (${e.reason})`).join("; ")}`
                : "; none excluded"}
              .
            </p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Company</th>
                    <th className="num">Holders above 1%</th>
                    <th className="num">Largest holder</th>
                    <th className="num">Free float bound</th>
                    <th className="num">HHI</th>
                    <th>Since last month</th>
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
                        {formatPercent(company.topHundredths)}
                      </td>
                      <td className="num">
                        {company.registerIncomplete ? (
                          <span
                            className="muted"
                            title="Register lists under 15% above 1%"
                          >
                            incomplete
                          </span>
                        ) : (
                          formatPercent(company.freeFloatUpperBoundHundredths)
                        )}
                      </td>
                      <td className="num">{formatHhi(company.hhi)}</td>
                      <td>{moves(company)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="citation">
              Free float bound: 100% minus holders of 5% or more; the official
              figure is this or lower (
              <Link href="/investability#methodology">methodology</Link>).
            </p>
            <S1Citation month={screen.month} />
          </>
        )}
      </section>

      <section className="panel">
        <h2>Prices and fundamentals screener</h2>
        <TradingViewWidget
          title="Indonesia stock screener by TradingView"
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
            locale: "en",
          }}
        />
      </section>
    </>
  );
}
