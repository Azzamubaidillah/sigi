"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { formatPercent } from "@/app/_lib/format";
import { typeLabel } from "@/app/_lib/labels";
import type { HolderSummary } from "@/src/views/holders";

export function HolderTable({ holders }: { holders: HolderSummary[] }) {
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
        placeholder="Filter by name"
        aria-label="Filter holders by name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="muted">
        {shown.length} of {holders.length} holders
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Holder</th>
              <th>Type</th>
              <th className="num">Companies</th>
              <th>Largest position</th>
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
                  {formatPercent(holder.largest.hundredths)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > 500 ? (
        <p className="muted">
          Showing the first 500; filter to narrow the list.
        </p>
      ) : null}
    </>
  );
}
