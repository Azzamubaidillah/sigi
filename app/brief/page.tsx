import type { Metadata } from "next";
import Link from "next/link";

import {
  Notice,
  PageHeader,
  Pill,
  Section,
  SourceNote,
} from "@/app/_components/ui";
import { formatDate, formatTimestamp } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { type BriefContext, CONTEXT_SECTIONS } from "@/src/brief/files";
import { loadConfig } from "@/src/config";
import type { Lang } from "@/src/i18n/lang";
import { briefMessages } from "@/src/i18n/messages/brief";
import { loadBrief, type PassedOver } from "@/src/views/brief";

import "../styles/brief.css";

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
      <span className="br-key" key={key}>
        {index > 0 ? ", " : ""}
        {href === null ? (
          key
        ) : href.startsWith("/") ? (
          <Link href={href}>{key}</Link>
        ) : (
          <a href={href} rel="noopener noreferrer nofollow">
            {key}
          </a>
        )}
      </span>
    );
  });
}

/** The brief's own text is English by decision D-026; mark it so on the Indonesian page. */
function contentLang(lang: Lang): "en" | undefined {
  return lang === "id" ? "en" : undefined;
}

function TextList({
  items,
  empty,
  lang,
}: {
  items: string[];
  empty: string;
  lang: Lang;
}) {
  return items.length === 0 ? (
    <p className="absent">{empty}</p>
  ) : (
    <ul className="br-list">
      {items.map((item) => (
        <li key={item} lang={contentLang(lang)}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Withdrawn({ items, lang }: { items: PassedOver[]; lang: Lang }) {
  return items.map((item) => (
    <Notice tone="negative" key={item.file}>
      {briefMessages[lang].withdrawn(
        formatDate(item.file.slice(0, 10), lang),
        item.reason,
      )}
    </Notice>
  ));
}

function Inputs({ context, lang }: { context: BriefContext; lang: Lang }) {
  const m = briefMessages[lang];
  const absent = new Map(context.absent.map((a) => [a.section, a.reason]));
  const built = CONTEXT_SECTIONS.filter((name) => context[name]).length;
  return (
    <details className="br-fold">
      <summary>{m.inputsFold(built, CONTEXT_SECTIONS.length)}</summary>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{m.input}</th>
              <th scope="col">{m.asOf}</th>
              <th scope="col" className="hide-sm">
                {m.source}
              </th>
              <th scope="col" className="hide-md">
                {m.worth}
              </th>
            </tr>
          </thead>
          <tbody>
            {CONTEXT_SECTIONS.map((name) => {
              const section = context[name];
              return (
                <tr key={name}>
                  <th scope="row">{m.sections[name]}</th>
                  {section ? (
                    <>
                      <td>{section.asOf}</td>
                      <td className="hide-sm">{section.source}</td>
                      <td className="hide-md">{section.evidenceStatus}</td>
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
    </details>
  );
}

export default async function BriefPage() {
  const lang = await getLang();
  const m = briefMessages[lang];
  const config = loadConfig();
  const brief = loadBrief(config.dataDirectory);
  const en = contentLang(lang);
  return (
    <>
      <PageHeader title={m.heading} lede={m.lede} />
      <Notice>{m.notice}</Notice>
      <Withdrawn items={brief.withdrawn} lang={lang} />

      {brief.status === "missing" ? (
        <Section id="today" title={m.today}>
          <p className="absent">{m.missing}</p>
        </Section>
      ) : brief.status === "unreadable" ? (
        <Section id="today" title={m.today}>
          <Notice tone="negative">{m.unreadable(brief.reason)}</Notice>
        </Section>
      ) : (
        <>
          {brief.stale ? (
            <Notice tone="warn">
              {m.stale(
                formatTimestamp(Date.parse(brief.analysis.generatedAt), lang),
              )}
            </Notice>
          ) : null}
          {brief.rejected ? (
            <Notice tone="warn">
              {m.rejected(brief.rejected.file, brief.rejected.reason)}
            </Notice>
          ) : null}

          <Section id="today" title={formatDate(brief.analysis.date, lang)}>
            <p className="br-stance">
              <Pill
                tone={
                  brief.analysis.stance === "watch"
                    ? "warn"
                    : brief.analysis.stance === "notable"
                      ? "info"
                      : undefined
                }
              >
                {m.stance[brief.analysis.stance]}
              </Pill>
            </p>
            <p className="br-headline" lang={en}>
              {brief.analysis.headline}
            </p>
            <SourceNote summary={m.howSummary}>
              <p>{m.how}</p>
              <p>
                {m.written(
                  formatTimestamp(Date.parse(brief.analysis.generatedAt), lang),
                  formatTimestamp(Date.parse(brief.context.generatedAt), lang),
                )}
              </p>
            </SourceNote>
          </Section>

          <Section id="look-at" title={m.lookAt}>
            {brief.analysis.lookAt.length === 0 ? (
              <p className="absent">{m.nothingToday}</p>
            ) : (
              <ol className="br-looks">
                {brief.analysis.lookAt.map((item) => (
                  <li key={`${item.kind} ${item.subject}`}>
                    <div className="br-subject" lang={en}>
                      <strong>{item.subject}</strong>
                      <span>{item.kind}</span>
                    </div>
                    <div>
                      <p lang={en}>{item.reason}</p>
                      <details className="br-fold">
                        <summary>
                          {m.evidence(item.evidenceKeys.length)}
                        </summary>
                        <p>
                          <Evidence
                            keys={item.evidenceKeys}
                            context={brief.context}
                          />
                        </p>
                      </details>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section id="changes" title={m.changes}>
            <TextList
              items={brief.analysis.changesSinceYesterday}
              empty={m.noneNoted}
              lang={lang}
            />
          </Section>

          <Section id="risks" title={m.risks}>
            <TextList
              items={brief.analysis.risks}
              empty={m.noneNoted}
              lang={lang}
            />
          </Section>

          <Section id="set-aside" title={m.setAside}>
            <TextList
              items={brief.analysis.setAside}
              empty={m.nothing}
              lang={lang}
            />
          </Section>

          <Section id="web-sources" title={m.webSources}>
            {brief.analysis.sources.length === 0 ? (
              <p className="absent">{m.noWebSources}</p>
            ) : (
              <ul className="br-list">
                {brief.analysis.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      lang={en}
                      rel="noopener noreferrer nofollow"
                    >
                      {source.title}
                    </a>
                    {source.publisher ? `, ${source.publisher}` : ""}
                    {source.date ? `, ${formatDate(source.date, lang)}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="inputs" title={m.inputs} note={m.inputsNote}>
            <Inputs context={brief.context} lang={lang} />
          </Section>
        </>
      )}
    </>
  );
}
