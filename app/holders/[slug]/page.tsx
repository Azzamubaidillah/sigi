import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { S1Citation } from "@/app/_components/Citation";
import { holderTypeLabels } from "@/app/_components/holder-types";
import { Icon, PageHeader, Section } from "@/app/_components/ui";
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
import { loadHolder } from "@/src/views/holders";

import "../../styles/holders.css";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const holder = loadHolder(loadConfig().databasePath, (await params).slug);
  return {
    title: holder
      ? holder.name
      : holdersMessages[await getLang()].page.notFound,
  };
}

/** A figure that is not in a month's file: a dash for the eye, words for a screen reader. */
function NotReported({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </>
  );
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
      <Link className="holders-back" href="/holders">
        <Icon name="back" />
        {m.allHolders}
      </Link>
      <PageHeader
        title={holder.name}
        lede={m.about(
          holderTypeLabels(holder.types),
          holder.domiciles.join(", "),
        )}
      />

      <Section
        id="positions"
        title={m.holdings(
          formatDate(holder.month.recordDate, lang),
          holder.positions.length,
        )}
      >
        {holder.positions.length === 0 ? (
          <p className="absent">{m.noHolding}</p>
        ) : (
          <div className="table-wrap">
            <table className="tbl holders-positions">
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
                    <td>
                      <Link className="code" href={`/t/${position.shareCode}`}>
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
          <p className="holders-note">
            {m.publishedAs}
            {holder.spellings.map((spelling) => `“${spelling}”`).join(", ")}
          </p>
        ) : null}
        <S1Citation month={holder.month} lang={lang} />
      </Section>

      <Section id="changes" title={m.changes}>
        {holder.moves === null || holder.previous === null ? (
          <p className="absent">
            {commonMessages[lang].ownershipAbsence.no_previous_month}
          </p>
        ) : holder.moves.length === 0 ? (
          <p className="absent">
            {m.noChange(formatDate(holder.previous.recordDate, lang))}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="tbl holders-moves">
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
                  <th scope="col" className="num hide-md">
                    {m.shares}
                  </th>
                  <th scope="col" className="num">
                    {m.change}
                  </th>
                </tr>
              </thead>
              <tbody>
                {holder.moves.map((move) => {
                  const delta =
                    (move.afterHundredths ?? 0) - (move.beforeHundredths ?? 0);
                  return (
                    <tr key={move.shareCode}>
                      <td>
                        <Link className="code" href={`/t/${move.shareCode}`}>
                          {move.shareCode}
                        </Link>
                      </td>
                      <td>{move.issuerName}</td>
                      <td className="num">
                        {move.beforeHundredths === null ? (
                          <NotReported label={m.notReported} />
                        ) : (
                          formatPercent(move.beforeHundredths, lang)
                        )}
                      </td>
                      <td className="num">
                        {move.afterHundredths === null ? (
                          <NotReported label={m.notReported} />
                        ) : (
                          formatPercent(move.afterHundredths, lang)
                        )}
                      </td>
                      <td className="num hide-md">
                        {formatSharesChange(
                          (move.afterShares ?? 0) - (move.beforeShares ?? 0),
                          lang,
                        )}
                      </td>
                      <td className="num">
                        <span className="holders-move">
                          {delta === 0 ? null : (
                            <Icon name={delta > 0 ? "up" : "down"} />
                          )}
                          {formatPercentChange(delta, lang)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="holders-note">{m.dash}</p>
      </Section>
    </>
  );
}
