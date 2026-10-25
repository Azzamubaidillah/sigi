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
import { getLang } from "@/app/_lib/lang";
import { loadConfig } from "@/src/config";
import { commonMessages } from "@/src/i18n/messages/common";
import { holdersMessages } from "@/src/i18n/messages/holders";
import { typeLabel } from "@/src/ownership/investor-classes";
import { loadHolder } from "@/src/views/holders";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const holder = loadHolder(loadConfig().databasePath, (await params).slug);
  return {
    title: holder
      ? holder.name
      : holdersMessages[await getLang()].page.notFound,
  };
}

export default async function HolderPage({ params }: Params) {
  const lang = await getLang();
  const m = holdersMessages[lang].page;
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
            : ""}. <Link href="/holders">{m.allHolders}</Link>
        </p>
      </div>

      <section className="panel">
        <h2>
          {m.holdings(
            formatDate(holder.month.recordDate, lang),
            holder.positions.length,
          )}
        </h2>
        {holder.positions.length === 0 ? (
          <p className="absent">{m.noHolding}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">{m.code}</th>
                  <th scope="col">{m.company}</th>
                  <th scope="col" className="num">
                    {m.shares}
                  </th>
                  <th scope="col" className="num">
                    {m.percent}
                  </th>
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
                    <td className="num">
                      {formatShares(position.shares, lang)}
                    </td>
                    <td className="num">
                      {formatPercent(position.hundredths, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {holder.spellings.length > 1 ? (
          <p className="citation">
            {m.publishedAs}
            {holder.spellings.map((spelling) => `“${spelling}”`).join(", ")}
          </p>
        ) : null}
        <S1Citation month={holder.month} lang={lang} />
      </section>

      <section className="panel">
        <h2>{m.changes}</h2>
        {holder.moves === null || holder.previous === null ? (
          <p className="absent">
            {commonMessages[lang].ownershipAbsence.no_previous_month}
          </p>
        ) : holder.moves.length === 0 ? (
          <p className="muted">
            {m.noChange(formatDate(holder.previous.recordDate, lang))}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">{m.code}</th>
                  <th scope="col">{m.company}</th>
                  <th scope="col" className="num">
                    {formatDate(holder.previous.recordDate, lang)}
                  </th>
                  <th scope="col" className="num">
                    {formatDate(holder.month.recordDate, lang)}
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
                        : formatPercent(move.beforeHundredths, lang)}
                    </td>
                    <td className="num">
                      {move.afterHundredths === null
                        ? "—"
                        : formatPercent(move.afterHundredths, lang)}
                    </td>
                    <td className="num">
                      {formatSharesChange(
                        (move.afterShares ?? 0) - (move.beforeShares ?? 0),
                        lang,
                      )}
                    </td>
                    <td className="num">
                      {formatPercentChange(
                        (move.afterHundredths ?? 0) -
                          (move.beforeHundredths ?? 0),
                        lang,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="citation">{m.dash}</p>
      </section>
    </>
  );
}
