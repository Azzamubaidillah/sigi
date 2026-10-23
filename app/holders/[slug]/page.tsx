import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { S1Citation } from "@/app/_components/Citation";
import {
  formatDate,
  formatPercent,
  formatPercentChange,
  formatShares,
  formatSharesChange,
} from "@/app/_lib/format";
import { typeLabel } from "@/app/_lib/labels";
import { loadConfig } from "@/src/config";
import { loadHolder } from "@/src/views/holders";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const holder = loadHolder(loadConfig().databasePath, (await params).slug);
  return { title: holder ? holder.name : "Not found" };
}

export default async function HolderPage({ params }: Params) {
  const holder = loadHolder(loadConfig().databasePath, (await params).slug);
  // No page for unknown slugs, and none for individuals or unclassified
  // holders: the view returns null for both (PRD C6).
  if (!holder) notFound();
  return (
    <>
      <div className="page-header">
        <h1>{holder.name}</h1>
        <p className="lede">
          {holder.types.map(typeLabel).join(", ")}
          {holder.domiciles.length
            ? ` · ${holder.domiciles.join(", ")}`
            : ""}. <Link href="/holders">All holders</Link>
        </p>
      </div>

      <section className="panel">
        <h2>
          Holdings above 1% on {formatDate(holder.month.recordDate)} (
          {holder.positions.length})
        </h2>
        {holder.positions.length === 0 ? (
          <p className="absent">
            No holding above 1% in the latest month; earlier months are below.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Company</th>
                  <th className="num">Shares</th>
                  <th className="num">%</th>
                </tr>
              </thead>
              <tbody>
                {holder.positions.map((position) => (
                  <tr key={position.shareCode}>
                    <td className="mono">
                      <Link href={`/t/${position.shareCode}`}>
                        {position.shareCode}
                      </Link>
                    </td>
                    <td>{position.issuerName}</td>
                    <td className="num">{formatShares(position.shares)}</td>
                    <td className="num">
                      {formatPercent(position.hundredths)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {holder.spellings.length > 1 ? (
          <p className="citation">
            Published as:{" "}
            {holder.spellings.map((spelling) => `“${spelling}”`).join(", ")}
          </p>
        ) : null}
        <S1Citation month={holder.month} />
      </section>

      <section className="panel">
        <h2>Changes since the previous month</h2>
        {holder.moves === null || holder.previous === null ? (
          <p className="absent">
            No earlier month is published, so there is nothing to compare
            against.
          </p>
        ) : holder.moves.length === 0 ? (
          <p className="muted">
            No change against {formatDate(holder.previous.recordDate)}.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Company</th>
                  <th className="num">
                    {formatDate(holder.previous.recordDate)}
                  </th>
                  <th className="num">{formatDate(holder.month.recordDate)}</th>
                  <th className="num">Shares</th>
                  <th className="num">Change</th>
                </tr>
              </thead>
              <tbody>
                {holder.moves.map((move) => (
                  <tr key={move.shareCode}>
                    <td className="mono">
                      <Link href={`/t/${move.shareCode}`}>
                        {move.shareCode}
                      </Link>
                    </td>
                    <td>{move.issuerName}</td>
                    <td className="num">
                      {move.beforeHundredths === null
                        ? "—"
                        : formatPercent(move.beforeHundredths)}
                    </td>
                    <td className="num">
                      {move.afterHundredths === null
                        ? "—"
                        : formatPercent(move.afterHundredths)}
                    </td>
                    <td className="num">
                      {formatSharesChange(
                        (move.afterShares ?? 0) - (move.beforeShares ?? 0),
                      )}
                    </td>
                    <td className="num">
                      {formatPercentChange(
                        (move.afterHundredths ?? 0) -
                          (move.beforeHundredths ?? 0),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="citation">
          A dash means the holding was at or below 1%, where the register does
          not report it, or that the holder was not in that month&apos;s file.
        </p>
      </section>
    </>
  );
}
