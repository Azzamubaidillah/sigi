"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { formatPercent, formatShares } from "@/app/_lib/format";
import type { Lang } from "@/src/i18n/lang";
import type { holdersMessages } from "@/src/i18n/messages/holders";
import type { HolderSummary } from "@/src/views/holders";

import { holderTypeLabels } from "./holder-types";
import { Icon } from "./ui";

const ROW_LIMIT = 100;

export function HolderTable({
  holders,
  lang,
  labels,
}: {
  holders: HolderSummary[];
  lang: Lang;
  labels: (typeof holdersMessages)["en"]["table"];
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toUpperCase());
  const shown = deferred
    ? holders.filter((holder) => holder.name.toUpperCase().includes(deferred))
    : holders;
  return (
    <>
      <div className="holders-find">
        <div className="field">
          <label htmlFor="holders-q">{labels.filterLabel}</label>
          <div className="holders-search">
            <Icon name="search" />
            <input
              id="holders-q"
              type="search"
              autoComplete="off"
              placeholder={labels.filterPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <p className="holders-count" role="status">
          {formatShares(shown.length, lang)} {labels.of}{" "}
          {formatShares(holders.length, lang)} {labels.holders}
        </p>
      </div>
      <div className="table-wrap">
        <table className="tbl holders-table">
          <thead>
            <tr>
              <th scope="col">{labels.holder}</th>
              <th scope="col" className="hide-sm">
                {labels.type}
              </th>
              <th scope="col" className="num">
                {labels.companies}
              </th>
              <th scope="col">{labels.largest}</th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, ROW_LIMIT).map((holder) => (
              <tr key={holder.slug}>
                <td>
                  <Link
                    className="holders-name"
                    href={`/holders/${holder.slug}`}
                  >
                    {holder.name}
                  </Link>
                </td>
                <td className="hide-sm">{holderTypeLabels(holder.types)}</td>
                <td className="num">{holder.companies}</td>
                <td className="nowrap">
                  <Link
                    className="code"
                    href={`/t/${holder.largest.shareCode}`}
                  >
                    {holder.largest.shareCode}
                  </Link>{" "}
                  {formatPercent(holder.largest.hundredths, lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > ROW_LIMIT ? (
        <p className="holders-note">{labels.truncated}</p>
      ) : null}
    </>
  );
}
