import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { S1Citation } from "@/app/_components/Citation";
import { HolderName } from "@/app/_components/HolderName";
import {
  formatDate,
  formatHhi,
  formatPercent,
  formatPercentChange,
  formatShares,
  formatSharesChange,
} from "@/app/_lib/format";
import { localForeignLabel, possibleDeadlines } from "@/app/_lib/labels";
import { loadConfig } from "@/src/config";
import { typeLabel } from "@/src/ownership/investor-classes";
import {
  FREE_FLOAT_MINIMUM_HUNDREDTHS,
  possibleTranches,
} from "@/src/investability/rule";
import type { HolderChange } from "@/src/ownership/metrics";
import { loadHolderLinks } from "@/src/views/holders";
import {
  ABSENCE_TEXT,
  type ChangesSlice,
  type CompanyFigures,
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

type Links = ReadonlyMap<string, string>;

function ChangeTable({
  title,
  rows,
  links,
}: {
  title: string;
  rows: HolderChange[];
  links: Links;
}) {
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
              <tr key={row.key}>
                <td>
                  <HolderName name={row.investorName} links={links} />
                </td>
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

function Changes({ slice, links }: { slice: ChangesSlice; links: Links }) {
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
        are matched by name as published (see{" "}
        <Link href="/investability#methodology">methodology</Link>); crossing 1%
        shows as new or gone.
      </p>
      {moved > 0 ? (
        <>
          <ChangeTable
            title="New above 1%"
            rows={changes.entered}
            links={links}
          />
          <ChangeTable
            title="No longer above 1%"
            rows={changes.exited}
            links={links}
          />
          <ChangeTable
            title="Increased"
            rows={changes.increased}
            links={links}
          />
          <ChangeTable
            title="Decreased"
            rows={changes.decreased}
            links={links}
          />
        </>
      ) : null}
    </div>
  );
}

function FreeFloat({ figures }: { figures: CompanyFigures }) {
  if (figures.registerIncomplete) {
    return (
      <p className="notice">
        The register lists only {formatPercent(figures.sumHundredths)} above 1%
        for this company, too little to be complete: a known controlling holder
        is missing for every company like this in the files checked so far. No
        free-float figure is given; see{" "}
        <Link href="/data">Data &amp; sources</Link>.
      </p>
    );
  }
  const bound = figures.freeFloatUpperBoundHundredths;
  const tranches = possibleTranches(bound);
  return (
    <div className="stack">
      {bound < FREE_FLOAT_MINIMUM_HUNDREDTHS ? (
        <p className="notice">
          <strong>Below the 15% minimum.</strong> Even counted generously, free
          float is at most {formatPercent(bound)}. Its deadline depends on
          market capitalisation, which Sigi does not have, so it is one of:{" "}
          {possibleDeadlines(tranches).join("; ")}.
        </p>
      ) : (
        <p className="muted">
          The register does not show this company below the 15% minimum. The
          official figure can still be lower than the bound shown here.
        </p>
      )}
      <p className="citation">
        Free float upper bound: 100% minus every holder of 5% or more, the
        exchange&apos;s definition as far as the register can see. The official
        figure also excludes shares below 5% held by the controller&apos;s
        affiliates, directors, commissioners, treasury and lock-ups, so it is
        this figure or lower.{" "}
        <Link href="/investability#methodology">Methodology</Link>.
      </p>
    </div>
  );
}

export default async function TickerPage({ params }: Params) {
  const code = shareCodeOf((await params).code);
  if (!code) notFound();
  const { databasePath } = loadConfig();
  const ownership = loadTickerOwnership(databasePath, code);

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
          Holders above 1% on {formatDate(ownership.month.recordDate)}.{" "}
          <Link href="/">All companies</Link>
        </p>
      </div>

      <section className="panel">
        <h2>Ownership and free float</h2>
        <dl className="figures">
          <div>
            <dt>Free float, upper bound</dt>
            <dd>
              {figures.registerIncomplete
                ? "not given"
                : formatPercent(figures.freeFloatUpperBoundHundredths)}
            </dd>
          </div>
          <div>
            <dt>Largest holder</dt>
            <dd>{formatPercent(figures.topHundredths)}</dd>
          </div>
          <div>
            <dt>Held below 1%</dt>
            <dd>{formatPercent(figures.heldBelowOneHundredths)}</dd>
          </div>
          <div>
            <dt>HHI, holders above 1%</dt>
            <dd>{formatHhi(figures.hhi)}</dd>
          </div>
          <div>
            <dt>Holders above 1%</dt>
            <dd>{figures.holders}</dd>
          </div>
        </dl>
        <div className="spaced">
          <FreeFloat figures={figures} />
        </div>
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
                    <td>
                      <HolderName name={holding.investorName} links={links} />
                    </td>
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
        <Changes slice={ownership.changes} links={links} />
      </section>
    </>
  );
}
