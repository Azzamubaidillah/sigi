import type { Metadata } from "next";
import Link from "next/link";

import {
  CheckBadge,
  NotAdvice,
  StatusBadge,
} from "@/app/_components/ThesisParts";
import { formatDate } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { loadConfig } from "@/src/config";
import { thesesMessages } from "@/src/i18n/messages/theses";
import { loadTheses } from "@/src/views/theses";

export async function generateMetadata(): Promise<Metadata> {
  return { title: thesesMessages[await getLang()].metaTitle };
}

export default async function ThesesPage() {
  const lang = await getLang();
  const m = thesesMessages[lang].list;
  const { theses, hits, lastCheckedOn } = loadTheses(loadConfig());
  return (
    <>
      <div className="page-header">
        <h1>{m.heading}</h1>
        <p className="lede">{m.lede}</p>
      </div>
      <NotAdvice lang={lang} />

      <section className="panel">
        <h2>{m.hitsHeading}</h2>
        {hits.length === 0 ? (
          <p className="absent">
            {theses.length === 0
              ? m.none
              : lastCheckedOn
                ? m.noneMet(formatDate(lastCheckedOn, lang))
                : m.notCheckedYet}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">{m.thesis}</th>
                  <th scope="col">{m.condition}</th>
                  <th scope="col">{m.compared}</th>
                  <th scope="col">{m.metSince}</th>
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
                      <CheckBadge status="met" lang={lang} />
                    </td>
                    <td>{hit.detail}</td>
                    <td className="mono">{formatDate(hit.metSince, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>{m.allHeading}</h2>
        {theses.length === 0 ? (
          <p className="absent">{m.none}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">{m.thesis}</th>
                  <th scope="col">{m.tickers}</th>
                  <th scope="col">{m.status}</th>
                  <th scope="col">{m.stance}</th>
                  <th scope="col">{m.review}</th>
                  <th scope="col">{m.version}</th>
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
                          {m.headerUnreadable}
                          {thesis.headerError}
                        </div>
                      ) : null}
                      {thesis.conditionsError ? (
                        <div className="muted">
                          {m.conditionsUnreadable}
                          {thesis.conditionsError}
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
                        <StatusBadge
                          status={thesis.header.status}
                          lang={lang}
                        />
                      ) : null}
                    </td>
                    <td>{thesis.header?.stance}</td>
                    <td className="mono">
                      {thesis.header
                        ? formatDate(thesis.header.review, lang)
                        : null}
                    </td>
                    <td className="mono">
                      {formatDate(thesis.version, lang)}
                      {thesis.versions.length > 1
                        ? m.versions(thesis.versions.length)
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
