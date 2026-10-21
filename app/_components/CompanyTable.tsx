"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { formatPercent } from "@/app/_lib/format";
import type { CompanyRow } from "@/src/views/ownership";

export function CompanyTable({ companies }: { companies: CompanyRow[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toUpperCase());
  const shown = deferred
    ? companies.filter(
        (company) =>
          company.shareCode.includes(deferred) ||
          company.issuerName.toUpperCase().includes(deferred),
      )
    : companies;
  return (
    <>
      <input
        className="filter"
        type="search"
        placeholder="Filter by code or name"
        aria-label="Filter companies by code or name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="muted">
        {shown.length} of {companies.length} companies
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Company</th>
              <th className="num">Holders above 1%</th>
              <th className="num">Largest holder</th>
              <th className="num">Float estimate</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((company) => (
              <tr key={company.shareCode}>
                <td className="mono">
                  <Link href={`/t/${company.shareCode}`}>
                    {company.shareCode}
                  </Link>
                </td>
                <td>{company.issuerName}</td>
                <td className="num">{company.holders}</td>
                <td className="num">{formatPercent(company.topHundredths)}</td>
                <td className="num">
                  {formatPercent(company.floatEstimateHundredths)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
