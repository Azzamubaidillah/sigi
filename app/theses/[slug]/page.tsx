import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ThesisBody } from "@/app/_components/ThesisBody";
import {
  ConditionTable,
  NotAdvice,
  StatusBadge,
} from "@/app/_components/ThesisParts";
import { formatDate } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { loadConfig } from "@/src/config";
import type { Lang } from "@/src/i18n/lang";
import { thesesMessages } from "@/src/i18n/messages/theses";
import type { DiffResult } from "@/src/theses/diff";
import { loadThesis } from "@/src/views/theses";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function load({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = (await searchParams).version;
  const version = typeof raw === "string" ? raw : null;
  return loadThesis(loadConfig(), slug, version);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [thesis, lang] = await Promise.all([load(props), getLang()]);
  return {
    title: thesis
      ? (thesis.summary.header?.title ?? thesis.summary.slug)
      : thesesMessages[lang].notFoundTitle,
  };
}

function Diff({
  diff,
  from,
  lang,
}: {
  diff: DiffResult;
  from: string;
  lang: Lang;
}) {
  const m = thesesMessages[lang].page;
  if (diff.kind === "too-large") {
    return <p className="absent">{m.diffTooLarge(diff.lines)}</p>;
  }
  if (diff.hunks.length === 0) {
    return <p className="absent">{m.diffNoChange(formatDate(from, lang))}</p>;
  }
  return (
    <>
      <p className="muted">
        {m.diffCounts(diff.added, diff.removed, formatDate(from, lang))}
      </p>
      {diff.hunks.map((hunk, index) => (
        <pre className="diff" key={index} tabIndex={0}>
          {hunk.lines.map((line, lineIndex) => (
            <span className={`diff-${line.kind}`} key={lineIndex}>
              {line.kind === "added"
                ? "+ "
                : line.kind === "removed"
                  ? "- "
                  : "  "}
              {line.text}
              {"\n"}
            </span>
          ))}
        </pre>
      ))}
    </>
  );
}

export default async function ThesisPage(props: Props) {
  const [thesis, lang] = await Promise.all([load(props), getLang()]);
  if (!thesis) notFound();
  const m = thesesMessages[lang].page;
  const { summary } = thesis;
  const header = summary.header;
  return (
    <>
      <div className="page-header">
        <h1>{header?.title ?? summary.slug}</h1>
        {header ? <p className="lede">{header.summary}</p> : null}
      </div>
      <NotAdvice lang={lang} />
      {!thesis.current ? (
        <p className="notice">
          {m.versionOf(formatDate(summary.version, lang))}{" "}
          <Link href={`/theses/${summary.slug}`}>{m.readCurrent}</Link>.
        </p>
      ) : null}

      <section className="panel">
        <h2>{m.summary}</h2>
        {summary.headerError ? (
          <p className="notice">
            {m.headerUnreadable}
            {summary.headerError}
          </p>
        ) : null}
        {header ? (
          <dl className="figures">
            <div>
              <dt>{m.status}</dt>
              <dd>
                <StatusBadge status={header.status} lang={lang} />
              </dd>
            </div>
            <div>
              <dt>{m.tickers}</dt>
              <dd className="mono">
                {header.tickers.map((code, index) => (
                  <span key={code}>
                    {index > 0 ? ", " : ""}
                    <Link href={`/t/${code}`}>{code}</Link>
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt>{m.stance}</dt>
              <dd>{header.stance}</dd>
            </div>
            <div>
              <dt>{m.reviewBy}</dt>
              <dd className="mono">{formatDate(header.review, lang)}</dd>
            </div>
            <div>
              <dt>{m.version}</dt>
              <dd className="mono">{formatDate(summary.version, lang)}</dd>
            </div>
          </dl>
        ) : null}
        {header && header.catalysts.length > 0 ? (
          <>
            <h3>{m.catalysts}</h3>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">{m.date}</th>
                    <th scope="col">{m.catalyst}</th>
                  </tr>
                </thead>
                <tbody>
                  {header.catalysts.map((catalyst) => (
                    <tr key={`${catalyst.date} ${catalyst.text}`}>
                      <td className="mono">
                        {formatDate(catalyst.date, lang)}
                      </td>
                      <td>{catalyst.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="panel">
        <h2>{m.invalidation}</h2>
        {summary.conditions ? (
          <>
            {!thesis.current ? (
              <p className="muted">{m.onlyCurrentChecked}</p>
            ) : null}
            <ConditionTable
              rows={summary.conditions}
              checked={thesis.current}
              lang={lang}
            />
            <p className="citation">
              {m.citationBefore}
              <Link href="/data">{m.citationLink}</Link>
              {m.citationAfter}
            </p>
          </>
        ) : (
          <p className="notice">
            {m.conditionsUnreadable}
            {summary.conditionsError}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>{m.thesis}</h2>
        <ThesisBody blocks={thesis.blocks} lang={lang} />
      </section>

      <section className="panel">
        <h2>{m.history}</h2>
        <ul>
          {summary.versions.map((version) => (
            <li key={version} className="mono">
              {version === summary.version ? (
                <strong>{formatDate(version, lang)}</strong>
              ) : (
                <Link href={`/theses/${summary.slug}?version=${version}`}>
                  {formatDate(version, lang)}
                </Link>
              )}
              {version === summary.versions[0] ? m.current : ""}
            </li>
          ))}
        </ul>
        {thesis.diff && thesis.previous ? (
          <>
            <h3>{m.changesHeading}</h3>
            <Diff diff={thesis.diff} from={thesis.previous} lang={lang} />
          </>
        ) : (
          <p className="absent">{m.firstVersion}</p>
        )}
      </section>
    </>
  );
}
