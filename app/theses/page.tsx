import type { Metadata } from "next";
import Link from "next/link";

import {
  CheckBadge,
  NotAdvice,
  StatusBadge,
} from "@/app/_components/ThesisParts";
import { formatDate } from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import { loadTheses } from "@/src/views/theses";

export const metadata: Metadata = { title: "Theses" };

export default function ThesesPage() {
  const { theses, hits, lastCheckedOn } = loadTheses(loadConfig());
  return (
    <>
      <div className="page-header">
        <h1>Theses</h1>
        <p className="lede">
          Research notes on listed companies, each with the conditions that
          would show it wrong. The worker checks every ownership, float, macro
          and date condition each day against Sigi&rsquo;s own published data.
        </p>
      </div>
      <NotAdvice />

      <section className="panel">
        <h2>Conditions hit</h2>
        {hits.length === 0 ? (
          <p className="absent">
            {theses.length === 0
              ? "No thesis is published yet."
              : lastCheckedOn
                ? `No condition of an active thesis is met (checked ${formatDate(lastCheckedOn)}).`
                : "The conditions have not been checked yet; the worker checks them daily."}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Thesis</th>
                  <th scope="col">Condition</th>
                  <th scope="col">What was compared</th>
                  <th scope="col">Met since</th>
                </tr>
              </thead>
              <tbody>
                {hits.map((hit) => (
                  <tr key={`${hit.slug} ${hit.condition.text}`}>
                    <td>
                      <Link href={`/theses/${hit.slug}`}>{hit.title}</Link>
                    </td>
                    <td>
                      <code>{hit.condition.text}</code>{" "}
                      <CheckBadge status="met" />
                    </td>
                    <td>{hit.detail}</td>
                    <td className="mono">{formatDate(hit.metSince)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>All theses</h2>
        {theses.length === 0 ? (
          <p className="absent">No thesis is published yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Thesis</th>
                  <th scope="col">Tickers</th>
                  <th scope="col">Status</th>
                  <th scope="col">Stance</th>
                  <th scope="col">Review</th>
                  <th scope="col">Version</th>
                </tr>
              </thead>
              <tbody>
                {theses.map((thesis) => (
                  <tr key={thesis.slug}>
                    <td>
                      <Link href={`/theses/${thesis.slug}`}>
                        {thesis.header?.title ?? thesis.slug}
                      </Link>
                      {thesis.headerError ? (
                        <div className="muted">
                          Header unreadable: {thesis.headerError}
                        </div>
                      ) : null}
                      {thesis.conditionsError ? (
                        <div className="muted">
                          Conditions unreadable: {thesis.conditionsError}
                        </div>
                      ) : null}
                    </td>
                    <td className="mono">
                      {thesis.header?.tickers.map((code, index) => (
                        <span key={code}>
                          {index > 0 ? ", " : ""}
                          <Link href={`/t/${code}`}>{code}</Link>
                        </span>
                      ))}
                    </td>
                    <td>
                      {thesis.header ? (
                        <StatusBadge status={thesis.header.status} />
                      ) : null}
                    </td>
                    <td>{thesis.header?.stance}</td>
                    <td className="mono">
                      {thesis.header ? formatDate(thesis.header.review) : null}
                    </td>
                    <td className="mono">
                      {formatDate(thesis.version)}
                      {thesis.versions.length > 1
                        ? ` (${thesis.versions.length} versions)`
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
