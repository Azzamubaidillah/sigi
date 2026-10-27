import type { Metadata } from "next";
import Link from "next/link";

import {
  CheckPill,
  countConditions,
  countsInWords,
  describeCondition,
  distanceFromToday,
  NotAdvice,
  StatusPill,
  TickerLinks,
} from "@/app/_components/ThesisParts";
import { PageHeader, Pill, Section } from "@/app/_components/ui";
import { formatDate } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { pageMetadata } from "@/app/_lib/seo";
import { loadConfig } from "@/src/config";
import type { Lang } from "@/src/i18n/lang";
import { thesesMessages } from "@/src/i18n/messages/theses";
import { seoMessages } from "@/src/i18n/messages/seo";
import { loadTheses, type ThesisSummary } from "@/src/views/theses";

import "../styles/theses.css";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMetadata({
    lang,
    title: thesesMessages[lang].metaTitle,
    description: seoMessages[lang].theses,
    path: "/theses",
  });
}

/** The worked example's lines as a file would write them; code, so the same in both languages. */
const EXAMPLE_LINES = [
  'ownership ABCD "PT CONTOH INDUK" below 50%',
  "float ABCD below 12.5% from 2027-03-31",
  "macro bi-rate above 6.25",
  "date 2027-06-30 no placement by then",
  "price ABCD below 3500",
];

function Empty({ lang }: { lang: Lang }) {
  const m = thesesMessages[lang].list;
  return (
    <>
      <Section id="held" title={m.heldHeading}>
        <p className="absent">{m.none}</p>
      </Section>

      <Section id="what" title={m.whatHeading} note={m.whatNote}>
        <dl className="th-defs">
          <div>
            <dt>{m.whatTickers}</dt>
            <dd>{m.whatTickersText}</dd>
          </div>
          <div>
            <dt>{m.whatStance}</dt>
            <dd>{m.whatStanceText}</dd>
          </div>
          <div>
            <dt>{m.whatReview}</dt>
            <dd>{m.whatReviewText}</dd>
          </div>
          <div>
            <dt>{m.whatCatalysts}</dt>
            <dd>{m.whatCatalystsText}</dd>
          </div>
          <div>
            <dt>{m.whatConditions}</dt>
            <dd>{m.whatConditionsText}</dd>
          </div>
        </dl>
        <p>{m.whatVersions}</p>
      </Section>

      <Section id="example" title={m.exampleHeading}>
        <Pill tone="info">{m.exampleLabel}</Pill>
        <p>{m.exampleNote}</p>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{m.exampleWritten}</th>
                <th scope="col">{m.exampleReads}</th>
                <th scope="col" className="hide-md">
                  {m.exampleChecked}
                </th>
              </tr>
            </thead>
            <tbody>
              {m.exampleRows.map((row, index) => (
                <tr key={EXAMPLE_LINES[index]}>
                  <th scope="row" className="th-written">
                    {EXAMPLE_LINES[index]}
                  </th>
                  <td>{row.reads}</td>
                  <td className="hide-md">{row.checked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="states" title={m.statesHeading} note={m.statesNote}>
        <dl className="th-defs">
          <div>
            <dt>
              <CheckPill status="not-met" lang={lang} />
            </dt>
            <dd>{m.stateHolding}</dd>
          </div>
          <div>
            <dt>
              <CheckPill status="met" lang={lang} />
            </dt>
            <dd>{m.stateHit}</dd>
          </div>
          <div>
            <dt>
              <CheckPill status="manual" lang={lang} />
            </dt>
            <dd>{m.stateManual}</dd>
          </div>
          <div>
            <dt>
              <CheckPill status="unknown" lang={lang} />
            </dt>
            <dd>{m.stateUnknown}</dd>
          </div>
        </dl>
        <p>
          <Link href="/data">{m.dataLink}</Link>
        </p>
      </Section>
    </>
  );
}

function ThesisRows({
  rows,
  lang,
  showCheck,
}: {
  rows: ThesisSummary[];
  lang: Lang;
  showCheck: boolean;
}) {
  const m = thesesMessages[lang].list;
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th scope="col">{m.thesis}</th>
            <th scope="col">{m.status}</th>
            <th scope="col" className="hide-md">
              {m.review}
            </th>
            {showCheck ? (
              <th scope="col" className="hide-md">
                {m.latestCheck}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((thesis) => {
            const header = thesis.header;
            if (!header) return null;
            const counts = thesis.conditions
              ? countConditions(thesis.conditions)
              : null;
            return (
              <tr key={thesis.slug}>
                <td>
                  <Link className="th-title" href={`/theses/${thesis.slug}`}>
                    {header.title}
                  </Link>
                  <span className="th-line">
                    <TickerLinks codes={header.tickers} />
                  </span>
                  <span className="th-line">{header.stance}</span>
                  <span className="th-line">
                    {m.version}: {formatDate(thesis.version, lang)}
                    {thesis.versions.length > 1
                      ? `, ${m.versions(thesis.versions.length)}`
                      : ""}
                  </span>
                  <span className="th-line th-compact">
                    {m.review}: {formatDate(header.review, lang)},{" "}
                    {distanceFromToday(header.review, lang)}
                  </span>
                  {showCheck && counts ? (
                    <span className="th-line th-compact">
                      {countsInWords(counts, lang)}
                    </span>
                  ) : null}
                  {thesis.conditionsError ? (
                    <span className="th-line">
                      {m.conditionsUnreadable}
                      {thesis.conditionsError}
                    </span>
                  ) : null}
                </td>
                <td>
                  <StatusPill status={header.status} lang={lang} />
                </td>
                <td className="hide-md">
                  {formatDate(header.review, lang)}
                  <span className="th-line">
                    {distanceFromToday(header.review, lang)}
                  </span>
                </td>
                {showCheck ? (
                  <td className="hide-md">
                    {counts ? (
                      <>
                        {countsInWords(counts, lang)}
                        <span className="th-line">
                          {counts.checkedOn
                            ? m.checked(formatDate(counts.checkedOn, lang))
                            : m.notChecked}
                        </span>
                      </>
                    ) : (
                      <span className="absent">{m.noConditions}</span>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function ThesesPage() {
  const lang = await getLang();
  const m = thesesMessages[lang].list;
  const { theses, hits, lastCheckedOn } = loadTheses(loadConfig());

  const readable = theses.filter((thesis) => thesis.header);
  const unreadable = theses.filter((thesis) => !thesis.header);
  const reviewOf = (thesis: ThesisSummary) => thesis.header?.review ?? "";
  const held = readable
    .filter((thesis) => thesis.header?.status === "active")
    .sort((a, b) => reviewOf(a).localeCompare(reviewOf(b)));
  const former = readable
    .filter((thesis) => thesis.header?.status !== "active")
    .sort((a, b) => reviewOf(b).localeCompare(reviewOf(a)));

  return (
    <>
      <PageHeader title={m.heading} lede={m.lede} />
      <NotAdvice lang={lang} />

      {theses.length === 0 ? (
        <Empty lang={lang} />
      ) : (
        <>
          <Section
            id="hits"
            title={m.hitsHeading}
            stamp={
              lastCheckedOn
                ? m.hitsStamp(formatDate(lastCheckedOn, lang))
                : undefined
            }
          >
            {hits.length === 0 ? (
              <p className="absent">
                {lastCheckedOn
                  ? m.noneMet(formatDate(lastCheckedOn, lang))
                  : m.notCheckedYet}
              </p>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th scope="col">{m.hitThesis}</th>
                      <th scope="col">{m.hitCondition}</th>
                      <th scope="col" className="hide-sm">
                        {m.hitReading}
                      </th>
                      <th scope="col">{m.hitSince}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hits.map((hit) => {
                      const words = describeCondition(hit.condition, lang);
                      return (
                        <tr key={`${hit.slug} ${hit.condition.text}`}>
                          <td>
                            <Link href={`/theses/${hit.slug}`}>
                              {hit.title}
                            </Link>
                          </td>
                          <td>
                            <CheckPill status="met" lang={lang} />
                            <span className="th-line">
                              {words.subject}: {words.threshold}
                            </span>
                          </td>
                          <td className="hide-sm">{hit.detail}</td>
                          <td>{formatDate(hit.metSince, lang)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {held.length > 0 ? (
            <Section id="held" title={m.heldHeading} note={m.heldNote}>
              <ThesisRows rows={held} lang={lang} showCheck />
            </Section>
          ) : null}

          {former.length > 0 ? (
            <Section id="former" title={m.closedHeading} note={m.closedNote}>
              <ThesisRows rows={former} lang={lang} showCheck={false} />
            </Section>
          ) : null}

          {unreadable.length > 0 ? (
            <Section
              id="unreadable"
              title={m.unreadableHeading}
              note={m.unreadableNote}
            >
              <ul className="th-plain">
                {unreadable.map((thesis) => (
                  <li key={thesis.slug}>
                    <Link href={`/theses/${thesis.slug}`}>{thesis.slug}</Link>
                    <span className="th-line">
                      {m.headerUnreadable}
                      {thesis.headerError}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      )}
    </>
  );
}
