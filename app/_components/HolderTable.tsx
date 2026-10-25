"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { formatPercent } from "@/app/_lib/format";
import type { Lang } from "@/src/i18n/lang";
import type { holdersMessages } from "@/src/i18n/messages/holders";
import { typeLabel } from "@/src/ownership/investor-classes";
import type { HolderSummary } from "@/src/views/holders";

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
      <input
        className="filter"
        type="search"
        placeholder={labels.filterPlaceholder}
        aria-label={labels.filterLabel}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="muted">
        {shown.length} {labels.of} {holders.length} {labels.holders}
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">{labels.holder}</th>
              <th scope="col">{labels.type}</th>
              <th scope="col" className="num">
                {labels.companies}
              </th>
              <th scope="col">{labels.largest}</th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 500).map((holder) => (
              <tr key={holder.slug}>
                <td>
                  <Link href={`/holders/${holder.slug}`}>{holder.name}</Link>
                </td>
                <td>{holder.types.map(typeLabel).join(", ")}</td>
                <td className="num">{holder.companies}</td>
                <td>
                  <Link
                    href={`/t/${holder.largest.shareCode}`}
                    className="mono"
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
      {shown.length > 500 ? <p className="muted">{labels.truncated}</p> : null}
    </>
  );
}
