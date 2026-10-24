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
import { loadConfig } from "@/src/config";
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
  const thesis = await load(props);
  return {
    title: thesis
      ? (thesis.summary.header?.title ?? thesis.summary.slug)
      : "Not found",
  };
}

function Diff({ diff, from }: { diff: DiffResult; from: string }) {
  if (diff.kind === "too-large") {
    return (
      <p className="absent">
        The versions are too long to compare here ({diff.lines} lines).
      </p>
    );
  }
  if (diff.hunks.length === 0) {
    return (
      <p className="absent">No change in the text from {formatDate(from)}.</p>
    );
  }
  return (
    <>
      <p className="muted">
        {diff.added} line{diff.added === 1 ? "" : "s"} added, {diff.removed}{" "}
        removed since {formatDate(from)}.
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
  const thesis = await load(props);
  if (!thesis) notFound();
  const { summary } = thesis;
  const header = summary.header;
  return (
    <>
      <div className="page-header">
        <h1>{header?.title ?? summary.slug}</h1>
        {header ? <p className="lede">{header.summary}</p> : null}
      </div>
      <NotAdvice />
      {!thesis.current ? (
        <p className="notice">
          This is the version of {formatDate(summary.version)}.{" "}
          <Link href={`/theses/${summary.slug}`}>Read the current version</Link>
          .
        </p>
      ) : null}

      <section className="panel">
        <h2>Summary</h2>
        {summary.headerError ? (
          <p className="notice">Header unreadable: {summary.headerError}</p>
        ) : null}
        {header ? (
          <dl className="figures">
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={header.status} />
              </dd>
            </div>
            <div>
              <dt>Tickers</dt>
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
              <dt>Stance</dt>
              <dd>{header.stance}</dd>
            </div>
            <div>
              <dt>Review by</dt>
              <dd className="mono">{formatDate(header.review)}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd className="mono">{formatDate(summary.version)}</dd>
            </div>
          </dl>
        ) : null}
        {header && header.catalysts.length > 0 ? (
          <>
            <h3>Catalysts</h3>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Catalyst</th>
                  </tr>
                </thead>
                <tbody>
                  {header.catalysts.map((catalyst) => (
                    <tr key={`${catalyst.date} ${catalyst.text}`}>
                      <td className="mono">{formatDate(catalyst.date)}</td>
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
        <h2>Invalidation conditions</h2>
        {summary.conditions ? (
          <>
            {!thesis.current ? (
              <p className="muted">
                Only the current version&rsquo;s conditions are checked.
              </p>
            ) : null}
            <ConditionTable
              rows={summary.conditions}
              checked={thesis.current}
            />
            <p className="citation">
              Checked against Sigi&rsquo;s own published data: ownership and
              float from the latest monthly register, macro from the latest
              published value. Prices are not stored (C1), so price levels are a
              manual check. See <Link href="/data">Data &amp; sources</Link>.
            </p>
          </>
        ) : (
          <p className="notice">
            Conditions unreadable: {summary.conditionsError}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Thesis</h2>
        <ThesisBody blocks={thesis.blocks} />
      </section>

      <section className="panel">
        <h2>History</h2>
        <ul>
          {summary.versions.map((version) => (
            <li key={version} className="mono">
              {version === summary.version ? (
                <strong>{formatDate(version)}</strong>
              ) : (
                <Link href={`/theses/${summary.slug}?version=${version}`}>
                  {formatDate(version)}
                </Link>
              )}
              {version === summary.versions[0] ? " (current)" : ""}
            </li>
          ))}
        </ul>
        {thesis.diff && thesis.previous ? (
          <>
            <h3>Changes from the previous version</h3>
            <Diff diff={thesis.diff} from={thesis.previous} />
          </>
        ) : (
          <p className="absent">This is the first version.</p>
        )}
      </section>
    </>
  );
}
