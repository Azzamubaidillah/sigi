import type { Metadata } from "next";
import Link from "next/link";

import { formatDate, formatTimestamp } from "@/app/_lib/format";
import {
  type BriefContext,
  type BriefStance,
  CONTEXT_SECTIONS,
  type ContextSectionName,
} from "@/src/brief/files";
import { loadConfig } from "@/src/config";
import { loadBrief, type PassedOver } from "@/src/views/brief";

export const metadata: Metadata = { title: "Daily brief" };

const STANCE_LABELS: Record<BriefStance, string> = {
  quiet: "Quiet",
  notable: "Notable",
  watch: "Watch",
};

const SECTION_TITLES: Record<ContextSectionName, string> = {
  ownership: "Ownership changes",
  float: "Float tracker",
  macro: "Macro releases",
  theses: "Thesis conditions",
  events: "Rule and index dates",
  dataHealth: "Data health",
  news: "News for thesis tickers",
};

/** Where an evidence key leads on this site; null when it has no page. */
function evidenceHref(key: string, context: BriefContext): string | null {
  const [kind, first] = key.split(":");
  switch (kind) {
    case "own":
    case "float":
      return first && /^[A-Z]{4}$/.test(first)
        ? `/t/${first}`
        : "/investability";
    case "deadline":
    case "event":
      return "/investability";
    case "macro":
    case "macro-next":
      return "/macro";
    case "thesis":
    case "cond":
      return first ? `/theses/${first}` : "/theses";
    case "health":
      return "/data";
    case "news":
      return context.news?.items.find((item) => item.key === key)?.url ?? null;
    default:
      return null;
  }
}

function Evidence({
  keys,
  context,
}: {
  keys: string[];
  context: BriefContext;
}) {
  return keys.map((key, index) => {
    const href = evidenceHref(key, context);
    return (
      <span key={key}>
        {index > 0 ? ", " : ""}
        {href === null ? (
          <code>{key}</code>
        ) : href.startsWith("/") ? (
          <Link href={href}>
            <code>{key}</code>
          </Link>
        ) : (
          <a href={href} rel="noopener noreferrer nofollow">
            <code>{key}</code>
          </a>
        )}
      </span>
    );
  });
}

function TextList({ items, empty }: { items: string[]; empty: string }) {
  return items.length === 0 ? (
    <p className="absent">{empty}</p>
  ) : (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Withdrawn({ items }: { items: PassedOver[] }) {
  return items.map((item) => (
    <p className="notice" key={item.file}>
      The brief of {formatDate(item.file.slice(0, 10))} was withdrawn:{" "}
      {item.reason}
    </p>
  ));
}

function Inputs({ context }: { context: BriefContext }) {
  const absent = new Map(context.absent.map((a) => [a.section, a.reason]));
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Input</th>
            <th scope="col">As of</th>
            <th scope="col">Source</th>
            <th scope="col">What it is worth</th>
          </tr>
        </thead>
        <tbody>
          {CONTEXT_SECTIONS.map((name) => {
            const section = context[name];
            return (
              <tr key={name}>
                <td>{SECTION_TITLES[name]}</td>
                {section ? (
                  <>
                    <td className="mono">{section.asOf}</td>
                    <td>{section.source}</td>
                    <td>{section.evidenceStatus}</td>
                  </>
                ) : (
                  <td colSpan={3} className="absent">
                    Absent: {absent.get(name) ?? "not built"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BriefPage() {
  const config = loadConfig();
  const brief = loadBrief(config.dataDirectory);
  return (
    <>
      <div className="page-header">
        <h1>Daily brief</h1>
        <p className="lede">
          What changed in the data Sigi tracks, and what is worth a closer look.
          An AI agent writes it each morning from Sigi&rsquo;s own readings;
          every item cites the readings it rests on, and a file that cites
          anything else is not shown.
        </p>
      </div>
      <p className="notice">
        Written by an AI agent from Sigi&rsquo;s published data and linked
        sources. It is not investment advice, recommends no transaction, and can
        be wrong: check each item against the pages it links to.
      </p>
      <Withdrawn items={brief.withdrawn} />

      {brief.status === "missing" ? (
        <section className="panel">
          <h2>Today</h2>
          <p className="absent">
            No brief has been written yet. The agent runs each morning at about
            06:00 WIB.
          </p>
        </section>
      ) : brief.status === "unreadable" ? (
        <section className="panel">
          <h2>Today</h2>
          <p className="notice">No brief can be shown: {brief.reason}</p>
        </section>
      ) : (
        <>
          {brief.stale ? (
            <p className="notice">
              Stale: this brief was written{" "}
              {formatTimestamp(Date.parse(brief.analysis.generatedAt))}, more
              than 30 hours ago, and no newer brief passed its checks.
            </p>
          ) : null}
          {brief.rejected ? (
            <p className="notice">
              A newer file ({brief.rejected.file}) was not shown:{" "}
              {brief.rejected.reason}.
            </p>
          ) : null}
          <section className="panel">
            <h2>
              {formatDate(brief.analysis.date)}{" "}
              <span className="badge">
                {STANCE_LABELS[brief.analysis.stance]}
              </span>
            </h2>
            <p className="lede">{brief.analysis.headline}</p>
            <h3>Worth a closer look</h3>
            {brief.analysis.lookAt.length === 0 ? (
              <p className="absent">Nothing today.</p>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col">What</th>
                      <th scope="col">Why</th>
                      <th scope="col">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brief.analysis.lookAt.map((item) => (
                      <tr key={`${item.kind} ${item.subject}`}>
                        <td>
                          <strong>{item.subject}</strong>
                          <div className="muted">{item.kind}</div>
                        </td>
                        <td>{item.reason}</td>
                        <td>
                          <Evidence
                            keys={item.evidenceKeys}
                            context={brief.context}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <h3>Changes since yesterday</h3>
            <TextList
              items={brief.analysis.changesSinceYesterday}
              empty="None noted."
            />
            <h3>Risks to this reading</h3>
            <TextList items={brief.analysis.risks} empty="None noted." />
            <h3>Set aside, and why</h3>
            <TextList items={brief.analysis.setAside} empty="Nothing." />
            <h3>Web sources</h3>
            {brief.analysis.sources.length === 0 ? (
              <p className="absent">
                None: every figure came from Sigi&rsquo;s own readings.
              </p>
            ) : (
              <ul>
                {brief.analysis.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} rel="noopener noreferrer nofollow">
                      {source.title}
                    </a>
                    {source.publisher ? `, ${source.publisher}` : ""}
                    {source.date ? `, ${formatDate(source.date)}` : ""}
                  </li>
                ))}
              </ul>
            )}
            <p className="citation">
              Written {formatTimestamp(Date.parse(brief.analysis.generatedAt))}{" "}
              from Sigi&rsquo;s readings of{" "}
              {formatTimestamp(Date.parse(brief.context.generatedAt))}.
            </p>
          </section>
          <section className="panel">
            <h2>Inputs</h2>
            <Inputs context={brief.context} />
          </section>
        </>
      )}
    </>
  );
}
