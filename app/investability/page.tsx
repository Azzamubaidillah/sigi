import type { Metadata } from "next";
import Link from "next/link";

import { S1Citation } from "@/app/_components/Citation";
import { formatDate, formatPercent } from "@/app/_lib/format";
import { possibleDeadlines, trancheDeadlines } from "@/app/_lib/labels";
import { loadConfig } from "@/src/config";
import {
  RULE_SOURCES,
  TIMELINE,
  TRANCHES,
  type Tranche,
} from "@/src/investability/rule";
import { loadInvestability } from "@/src/views/investability";

export const metadata: Metadata = { title: "Investability" };

function Source({
  url,
  publisher,
  kind,
}: {
  url: string;
  publisher: string;
  kind: string;
}) {
  return (
    <a href={url} rel="noreferrer">
      {publisher}
      {kind === "secondary" ? " (press report)" : ""}
    </a>
  );
}

export default function InvestabilityPage() {
  const view = loadInvestability(loadConfig().databasePath);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div className="page-header">
        <h1>Investability: the 15% free-float rule</h1>
        <p className="lede">
          The exchange&apos;s minimum free float rose to 15% on 31 March 2026,
          with staged deadlines to 2029, while MSCI weighs moving Indonesia to
          Standalone status. This page counts which companies the monthly
          register shows below the line. It is Sigi&apos;s estimate, never the
          official count, which is shown beside it.
        </p>
      </div>

      {view.kind === "absent" ? (
        <section className="panel">
          <p className="absent">
            No month of the &gt;1% register has been published yet.
          </p>
        </section>
      ) : (
        <>
          <section className="panel">
            <h2>Below 15%: Sigi&apos;s count and the exchange&apos;s</h2>
            <dl className="figures">
              <div>
                <dt>
                  Sigi, {formatDate(view.month.recordDate)}: certainly below 15%
                </dt>
                <dd>{view.belowMinimum.length}</dd>
              </div>
              <div>
                <dt>
                  Exchange, {formatDate(view.official.asOf)} (nearest to
                  Sigi&apos;s month)
                </dt>
                <dd>
                  {view.official.belowMinimum}
                  {view.official.listed ? ` of ${view.official.listed}` : ""}
                </dd>
              </div>
              {view.latestOfficial !== view.official ? (
                <div>
                  <dt>
                    Exchange, {formatDate(view.latestOfficial.asOf)} (latest
                    reported)
                  </dt>
                  <dd>
                    {view.latestOfficial.belowMinimum}
                    {view.latestOfficial.listed
                      ? ` of ${view.latestOfficial.listed}`
                      : ""}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Companies with no float figure (register incomplete)</dt>
                <dd>{view.incomplete.length}</dd>
              </div>
            </dl>
            <p className="citation">
              Sigi counts a company only when even its upper bound is under 15%,
              so its count is a floor: the exchange also removes affiliates,
              insiders, treasury and locked-up shares below 5%, which the
              register cannot see. The exchange counts all listed companies from
              its own records, so the gap is the definition, the date and the
              source together. Exchange figures as reported by{" "}
              <Source {...view.official.source} />
              {view.official !== view.latestOfficial ? (
                <>
                  {" "}
                  and <Source {...view.latestOfficial.source} />
                </>
              ) : null}
              .
            </p>
          </section>

          <section className="panel">
            <h2>Companies by free-float bound</h2>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Upper bound on free float</th>
                    <th className="num">Companies</th>
                  </tr>
                </thead>
                <tbody>
                  {view.bands.map((band) => (
                    <tr key={band.id}>
                      <td>
                        <Link href={`/?${band.screenQuery}`}>{band.label}</Link>
                      </td>
                      <td className="num">{band.count}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>No figure: register incomplete</td>
                    <td className="num">{view.incomplete.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {view.incomplete.length > 0 ? (
              <p className="citation">
                Register incomplete (
                {view.incomplete.map((c) => c.shareCode).join(", ")}): holders
                above 1% total under 15%, and in every such case checked a known
                controlling holder is missing from the file.
              </p>
            ) : null}
            <S1Citation month={view.month} />
          </section>

          <section className="panel">
            <h2>Certainly below 15% ({view.belowMinimum.length})</h2>
            <p className="muted">
              The deadline depends on market capitalisation, which Sigi does not
              have (it stores no prices), so each company shows the tranches
              still possible given its bound.
              {view.previous
                ? ` Since ${formatDate(view.previous.recordDate)}: ${view.crossedUp.length} rose above 15% (${view.crossedUp.join(", ") || "none"}), ${view.crossedDown.length} fell below (${view.crossedDown.join(", ") || "none"}).`
                : " No earlier month is published, so there is no movement to show yet."}
            </p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Company</th>
                    <th className="num">Bound</th>
                    <th className="num">Month before</th>
                    <th>Possible deadlines</th>
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
                        {formatPercent(row.upperBoundHundredths)}
                      </td>
                      <td className="num">
                        {row.previousUpperBoundHundredths === null
                          ? "—"
                          : formatPercent(row.previousUpperBoundHundredths)}
                      </td>
                      <td>
                        {possibleDeadlines(row.possibleTranches).join("; ")}
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
        <h2>Timeline</h2>
        <div className="table-wrap">
          <table className="data">
            <tbody>
              {TIMELINE.map((event) => (
                <tr key={`${event.date}-${event.label}`}>
                  <td className="mono">{event.date}</td>
                  <td>
                    {event.label}
                    {event.date < today ? (
                      <span className="muted"> (passed)</span>
                    ) : null}
                  </td>
                  <td>
                    <Source {...event.source} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="citation">
          Deadlines by tranche:{" "}
          {(Object.keys(TRANCHES) as Tranche[])
            .map(
              (tranche) =>
                `${TRANCHES[tranche].label}: ${trancheDeadlines(tranche)}`,
            )
            .join(". ")}
          . The rule as reported by{" "}
          {RULE_SOURCES.map((source, index) => (
            <span key={source.url}>
              {index > 0 ? " and " : ""}
              <Source {...source} />
            </span>
          ))}
          ; the rule text itself (revised Peraturan Bursa I-A) was not read in
          full.
        </p>
      </section>

      <section className="panel" id="methodology">
        <h2>Methodology</h2>
        <div className="stack prose">
          <p>
            <strong>The official definition.</strong> Free float is the shares
            held by shareholders who each hold less than 5% and are not the
            controller or its affiliates, a director or commissioner, and not
            treasury or locked-up shares (Peraturan Bursa I-A, as reported).
          </p>
          <p>
            <strong>What the register shows.</strong> Every holder of more than
            1%, with type, local or foreign, and shares, as of the month&apos;s
            last trading day. It does not say who is an affiliate or an insider,
            and shows nothing below 1%.
          </p>
          <p>
            <strong>Sigi&apos;s figure: an upper bound.</strong> 100% minus
            every holder of 5% or more, with a holder&apos;s rows added together
            first. Everything the register cannot see only lowers the official
            figure, so the official free float is this bound or lower. A company
            whose bound is under 15% is therefore certainly below the minimum;
            one above it may still be below.
          </p>
          <p>
            <strong>Why the counts differ.</strong> Sigi&apos;s count is a floor
            on the exchange&apos;s. It also uses an older or newer month than
            the exchange&apos;s count, and the exchange uses its own records,
            not this register.
          </p>
          <p>
            <strong>Incomplete registers.</strong> When a company&apos;s holders
            above 1% add up to less than 15%, Sigi gives no float figure. In the
            27 February 2026 file that is BBRI, BBNI, BBTN, ADHI and NCKL, each
            missing a known controlling holder.
          </p>
          <p>
            <strong>Holders.</strong> A holder&apos;s rows are matched across
            companies and months by name, after removing case, full stops and
            commas; other spellings are merged only by a reviewed alias list.
            Holders who are individuals, or whose type is unclassified, never
            get their own page.
          </p>
        </div>
      </section>
    </>
  );
}
