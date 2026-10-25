import type { Metadata } from "next";
import Link from "next/link";

import { formatDate, formatTimestamp } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { type BriefContext, CONTEXT_SECTIONS } from "@/src/brief/files";
import { loadConfig } from "@/src/config";
import type { Lang } from "@/src/i18n/lang";
import { briefMessages } from "@/src/i18n/messages/brief";
import { loadBrief, type PassedOver } from "@/src/views/brief";

export async function generateMetadata(): Promise<Metadata> {
  return { title: briefMessages[await getLang()].metaTitle };
}

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

function Withdrawn({ items, lang }: { items: PassedOver[]; lang: Lang }) {
  return items.map((item) => (
    <p className="notice" key={item.file}>
      {briefMessages[lang].withdrawn(
        formatDate(item.file.slice(0, 10), lang),
        item.reason,
      )}
    </p>
  ));
}

function Inputs({ context, lang }: { context: BriefContext; lang: Lang }) {
  const m = briefMessages[lang];
  const absent = new Map(context.absent.map((a) => [a.section, a.reason]));
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">{m.input}</th>
            <th scope="col">{m.asOf}</th>
            <th scope="col">{m.source}</th>
            <th scope="col">{m.worth}</th>
          </tr>
        </thead>
        <tbody>
          {CONTEXT_SECTIONS.map((name) => {
            const section = context[name];
            return (
              <tr key={name}>
                <td>{m.sections[name]}</td>
                {section ? (
                  <>
                    <td className="mono">{section.asOf}</td>
                    <td>{section.source}</td>
                    <td>{section.evidenceStatus}</td>
                  </>
                ) : (
                  <td colSpan={3} className="absent">
                    {m.absent(absent.get(name) ?? m.notBuilt)}
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

export default async function BriefPage() {
  const lang = await getLang();
  const m = briefMessages[lang];
  const config = loadConfig();
  const brief = loadBrief(config.dataDirectory);
  return (
    <>
      <div className="page-header">
        <h1>{m.heading}</h1>
        <p className="lede">{m.lede}</p>
      </div>
      <p className="notice">{m.notice}</p>
      <Withdrawn items={brief.withdrawn} lang={lang} />

      {brief.status === "missing" ? (
        <section className="panel">
          <h2>{m.today}</h2>
          <p className="absent">{m.missing}</p>
        </section>
      ) : brief.status === "unreadable" ? (
        <section className="panel">
          <h2>{m.today}</h2>
          <p className="notice">{m.unreadable(brief.reason)}</p>
        </section>
      ) : (
        <>
          {brief.stale ? (
            <p className="notice">
              {m.stale(
                formatTimestamp(Date.parse(brief.analysis.generatedAt), lang),
              )}
            </p>
          ) : null}
          {brief.rejected ? (
            <p className="notice">
              {m.rejected(brief.rejected.file, brief.rejected.reason)}
            </p>
          ) : null}
          <section className="panel">
            <h2>
              {formatDate(brief.analysis.date, lang)}{" "}
              <span className="badge">{m.stance[brief.analysis.stance]}</span>
            </h2>
            <p className="lede">{brief.analysis.headline}</p>
            <h3>{m.lookAt}</h3>
            {brief.analysis.lookAt.length === 0 ? (
              <p className="absent">{m.nothingToday}</p>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col">{m.what}</th>
                      <th scope="col">{m.why}</th>
                      <th scope="col">{m.evidence}</th>
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
            <h3>{m.changes}</h3>
            <TextList
              items={brief.analysis.changesSinceYesterday}
              empty={m.noneNoted}
            />
            <h3>{m.risks}</h3>
            <TextList items={brief.analysis.risks} empty={m.noneNoted} />
            <h3>{m.setAside}</h3>
            <TextList items={brief.analysis.setAside} empty={m.nothing} />
            <h3>{m.webSources}</h3>
            {brief.analysis.sources.length === 0 ? (
              <p className="absent">{m.noWebSources}</p>
            ) : (
              <ul>
                {brief.analysis.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} rel="noopener noreferrer nofollow">
                      {source.title}
                    </a>
                    {source.publisher ? `, ${source.publisher}` : ""}
                    {source.date ? `, ${formatDate(source.date, lang)}` : ""}
                  </li>
                ))}
              </ul>
            )}
            <p className="citation">
              {m.written(
                formatTimestamp(Date.parse(brief.analysis.generatedAt), lang),
                formatTimestamp(Date.parse(brief.context.generatedAt), lang),
              )}
            </p>
          </section>
          <section className="panel">
            <h2>{m.inputs}</h2>
            <Inputs context={brief.context} lang={lang} />
          </section>
        </>
      )}
    </>
  );
}
