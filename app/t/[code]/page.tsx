import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { S1Citation } from "@/app/_components/Citation";
import {
  formatDate,
  formatHhi,
  formatPercent,
  formatPercentChange,
  formatShares,
  formatSharesChange,
} from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import { INVESTOR_TYPE_LABELS, type InvestorType } from "@/src/ownership/gates";
import type { HolderChange } from "@/src/ownership/metrics";
import {
  ABSENCE_TEXT,
  type ChangesSlice,
  loadTickerOwnership,
} from "@/src/views/ownership";

type Params = { params: Promise<{ code: string }> };

function shareCodeOf(raw: string): string | null {
  const code = decodeURIComponent(raw).toUpperCase();
  return /^[A-Z]{4}$/.test(code) ? code : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const code = shareCodeOf((await params).code);
  return { title: code ? `${code} ownership` : "Not found" };
}

function typeLabel(type: string | null): string {
  if (type === null) return "Unclassified (scrip)";
  return INVESTOR_TYPE_LABELS[type as InvestorType] ?? type;
}

function localForeignLabel(value: string | null): string {
  return value === "L" ? "Local" : value === "A" ? "Foreign" : "Unclassified";
}

function ChangeTable({ title, rows }: { title: string; rows: HolderChange[] }) {
  if (rows.length === 0) return null;
  return (
    <>
      <h3>{title}</h3>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Holder</th>
              <th className="num">Before</th>
              <th className="num">After</th>
              <th className="num">Shares</th>
              <th className="num">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.investorName}>
                <td>{row.investorName}</td>
                <td className="num">
                  {row.beforeHundredths === null
                    ? "—"
                    : formatPercent(row.beforeHundredths)}
                </td>
                <td className="num">
                  {row.afterHundredths === null
                    ? "—"
                    : formatPercent(row.afterHundredths)}
                </td>
                <td className="num">
                  {formatSharesChange(
                    (row.afterShares ?? 0) - (row.beforeShares ?? 0),
                  )}
                </td>
                <td className="num">
                  {formatPercentChange(
                    (row.afterHundredths ?? 0) - (row.beforeHundredths ?? 0),
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

function Changes({ slice }: { slice: ChangesSlice }) {
  if (slice.kind === "absent") {
    return <p className="absent">{ABSENCE_TEXT[slice.reason]}</p>;
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
        Against {formatDate(previous.recordDate)}: {changes.entered.length} new,{" "}
        {changes.exited.length} gone, {changes.increased.length} up,{" "}
        {changes.decreased.length} down, {changes.unchanged} unchanged. Holders
        are matched by name as published; crossing 1% shows as new or gone.
      </p>
      {moved > 0 ? (
        <>
          <ChangeTable title="New above 1%" rows={changes.entered} />
          <ChangeTable title="No longer above 1%" rows={changes.exited} />
          <ChangeTable title="Increased" rows={changes.increased} />
          <ChangeTable title="Decreased" rows={changes.decreased} />
        </>
      ) : null}
    </div>
  );
}

export default async function TickerPage({ params }: Params) {
  const code = shareCodeOf((await params).code);
  if (!code) notFound();
  const ownership = loadTickerOwnership(loadConfig().databasePath, code);

  if (ownership.kind === "absent") {
    return (
      <>
        <div className="page-header">
          <h1 className="mono">{code}</h1>
        </div>
        <section className="panel">
          <h2>Ownership</h2>
          <p className="absent">{ABSENCE_TEXT[ownership.reason]}</p>
          {ownership.month ? <S1Citation month={ownership.month} /> : null}
        </section>
      </>
    );
  }

  const { concentration } = ownership;
  const mismatched = ownership.holdings.filter(
    (holding) =>
      holding.sharesTotal !== holding.sharesScripless + holding.sharesScrip,
  );
  return (
    <>
      <div className="page-header">
        <h1>
          <span className="mono">{ownership.shareCode}</span> ·{" "}
          {ownership.issuerName}
        </h1>
        <p className="lede">
          Holders above 1% on {formatDate(ownership.month.recordDate)}.{" "}
          <Link href="/">All companies</Link>
        </p>
      </div>

      <section className="panel">
        <h2>Ownership</h2>
        <dl className="figures">
          <div>
            <dt>Float estimate</dt>
            <dd>{formatPercent(ownership.floatEstimateHundredths)}</dd>
          </div>
          <div>
            <dt>Largest holder</dt>
            <dd>{formatPercent(concentration.topHundredths)}</dd>
          </div>
          <div>
            <dt>Three largest</dt>
            <dd>{formatPercent(concentration.topThreeHundredths)}</dd>
          </div>
          <div>
            <dt>HHI, holders above 1%</dt>
            <dd>{formatHhi(concentration.hhi)}</dd>
          </div>
          <div>
            <dt>Holders above 1%</dt>
            <dd>{concentration.holders}</dd>
          </div>
        </dl>
        <p className="citation">
          Float estimate from the &gt;1% register, not the official free-float
          figure: the official definition also excludes controllers, affiliates,
          directors and treasury shares, some of which may sit below 1%. It is
          also only as complete as the register, which has been seen to omit
          large holders; see <Link href="/data">Data &amp; sources</Link>.
        </p>
      </section>

      <section className="panel">
        <h2>Holders above 1%</h2>
        {mismatched.length > 0 ? (
          <p className="notice">
            In the source file,{" "}
            {mismatched.length === 1
              ? "one row's"
              : `${mismatched.length} rows'`}{" "}
            total shares differ from scripless plus scrip. They are shown
            exactly as published and marked below.
          </p>
        ) : null}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Holder</th>
                <th>Type</th>
                <th>Local / foreign</th>
                <th>Domicile</th>
                <th className="num">Scripless</th>
                <th className="num">Scrip</th>
                <th className="num">Total shares</th>
                <th className="num">%</th>
              </tr>
            </thead>
            <tbody>
              {ownership.holdings.map((holding) => {
                const inconsistent =
                  holding.sharesTotal !==
                  holding.sharesScripless + holding.sharesScrip;
                return (
                  <tr key={holding.rowNumber}>
                    <td>{holding.investorName}</td>
                    <td>{typeLabel(holding.investorType)}</td>
                    <td>{localForeignLabel(holding.localForeign)}</td>
                    <td>{holding.domicile ?? "—"}</td>
                    <td className="num">
                      {formatShares(holding.sharesScripless)}
                    </td>
                    <td className="num">{formatShares(holding.sharesScrip)}</td>
                    <td className="num">
                      {formatShares(holding.sharesTotal)}
                      {inconsistent ? (
                        <span
                          className="badge hold flag"
                          title="Total differs from scripless + scrip in the source"
                        >
                          as published
                        </span>
                      ) : null}
                    </td>
                    <td className="num">
                      {formatPercent(holding.percentHundredths)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <S1Citation month={ownership.month} />
      </section>

      <section className="panel">
        <h2>Changes since the previous month</h2>
        <Changes slice={ownership.changes} />
      </section>
    </>
  );
}
