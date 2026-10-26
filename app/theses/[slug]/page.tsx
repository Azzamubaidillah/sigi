import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ThesisBody } from "@/app/_components/ThesisBody";
import {
  ConditionTable,
  countConditions,
  distanceFromToday,
  NotAdvice,
  StatusPill,
  TickerLinks,
} from "@/app/_components/ThesisParts";
import {
  type FigureItem,
  Figures,
  Icon,
  Notice,
  PageHeader,
  Section,
  SourceNote,
} from "@/app/_components/ui";
import { formatDate } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { loadConfig } from "@/src/config";
import type { Lang } from "@/src/i18n/lang";
import { thesesMessages } from "@/src/i18n/messages/theses";
import type { DiffResult } from "@/src/theses/diff";
import { loadThesis } from "@/src/views/theses";

import "../../styles/theses.css";

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
        <pre className="th-diff" key={index} tabIndex={0}>
          {hunk.lines.map((line, lineIndex) => (
            <span className={`th-${line.kind}`} key={lineIndex}>
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
  const counts = summary.conditions
    ? countConditions(summary.conditions)
    : null;

  const figures: FigureItem[] = counts
    ? [
        {
          label: (
            <>
              <Icon name="alert" /> {m.figureHit}
            </>
          ),
          value: (
            <span className={counts.hit > 0 ? "tone-warn" : undefined}>
              {counts.hit}
            </span>
          ),
          lead: true,
        },
        {
          label: (
            <>
              <Icon name="check" /> {m.figureHolding}
            </>
          ),
          value: counts.holding,
        },
        ...(counts.manual > 0
          ? [
              {
                label: (
                  <>
                    <Icon name="search" /> {m.figureManual}
                  </>
                ),
                value: counts.manual,
              },
            ]
          : []),
        ...(counts.unknown > 0
          ? [
              {
                label: (
                  <>
                    <Icon name="info" /> {m.figureUnknown}
                  </>
                ),
                value: counts.unknown,
              },
            ]
          : []),
        ...(counts.unchecked > 0
          ? [{ label: m.figureUnchecked, value: counts.unchecked }]
          : []),
      ]
    : [];

  const dates = header
    ? [
        { date: header.review, text: m.review, review: true },
        ...header.catalysts.map((catalyst) => ({
          date: catalyst.date,
          text: catalyst.text,
          review: false,
        })),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <>
      <PageHeader
        title={header?.title ?? summary.slug}
        lede={header?.stance}
        aside={
          header ? (
            <div className="th-aside">
              <StatusPill status={header.status} lang={lang} />
              <TickerLinks codes={header.tickers} />
              <span className="stamp">
                {m.versionStamp(formatDate(summary.version, lang))}
              </span>
            </div>
          ) : null
        }
      />
      <NotAdvice lang={lang} />
      {!thesis.current ? (
        <Notice>
          {m.versionOf(formatDate(summary.version, lang))}{" "}
          <Link href={`/theses/${summary.slug}`}>{m.readCurrent}</Link>.
        </Notice>
      ) : null}
      {summary.headerError ? (
        <Notice tone="warn">
          {m.headerUnreadable}
          {summary.headerError}
        </Notice>
      ) : null}

      {counts ? (
        <Section
          id="standing"
          title={m.standingHeading}
          stamp={
            thesis.current && counts.checkedOn
              ? m.standingStamp(formatDate(counts.checkedOn, lang))
              : undefined
          }
          note={
            thesis.current && counts.checkedOn
              ? m.standingNote(counts.hit, counts.total)
              : undefined
          }
        >
          {!thesis.current ? (
            <p className="absent">{m.standingOlder}</p>
          ) : counts.checkedOn ? (
            <Figures items={figures} />
          ) : (
            <p className="absent">{m.standingNone}</p>
          )}
        </Section>
      ) : null}

      <Section
        id="conditions"
        title={m.invalidation}
        note={summary.conditions ? m.invalidationNote : undefined}
      >
        {summary.conditions ? (
          <>
            <ConditionTable
              rows={summary.conditions}
              checked={thesis.current}
              lang={lang}
            />
            <SourceNote summary={m.sourceSummary}>
              <p>
                {m.citationBefore}
                <Link href="/data">{m.citationLink}</Link>
                {m.citationAfter}
              </p>
            </SourceNote>
          </>
        ) : (
          <Notice tone="warn">
            {m.conditionsUnreadable}
            {summary.conditionsError}
          </Notice>
        )}
      </Section>

      {dates.length > 0 ? (
        <Section id="dates" title={m.datesHeading} note={m.datesNote}>
          <ul className="th-dates">
            {dates.map((item) => (
              <li key={`${item.date} ${item.text}`}>
                <time dateTime={item.date}>{formatDate(item.date, lang)}</time>
                <span className={item.review ? "th-review" : undefined}>
                  {item.text}
                </span>
                <span className="th-away">
                  {distanceFromToday(item.date, lang)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        id="thesis"
        title={m.thesis}
        note={header ? header.summary : undefined}
      >
        <ThesisBody blocks={thesis.blocks} lang={lang} />
      </Section>

      <Section id="history" title={m.history}>
        <details className="th-fold">
          <summary>{m.versionsFold(summary.versions.length)}</summary>
          <ul className="th-plain">
            {summary.versions.map((version) => (
              <li key={version}>
                {version === summary.version ? (
                  <strong>{formatDate(version, lang)}</strong>
                ) : (
                  <Link href={`/theses/${summary.slug}?version=${version}`}>
                    {formatDate(version, lang)}
                  </Link>
                )}
                {version === summary.versions[0] ? ` (${m.current})` : ""}
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
        </details>
      </Section>
    </>
  );
}
