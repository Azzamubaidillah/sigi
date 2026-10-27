import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { S1Citation } from "@/app/_components/Citation";
import {
  cssVars,
  Figures,
  Icon,
  PageHeader,
  Pill,
  Section,
  SourceNote,
} from "@/app/_components/ui";
import { formatDate, formatPercent } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { pageMetadata } from "@/app/_lib/seo";
import { possibleDeadlines, trancheDeadlines } from "@/app/_lib/labels";
import { loadConfig } from "@/src/config";
import { localise } from "@/src/i18n/define";
import { commonMessages } from "@/src/i18n/messages/common";
import { investabilityMessages } from "@/src/i18n/messages/investability";
import { seoMessages } from "@/src/i18n/messages/seo";
import {
  FREE_FLOAT_MINIMUM_HUNDREDTHS,
  RULE_SOURCES,
  TIMELINE,
  TRANCHES,
  type Tranche,
} from "@/src/investability/rule";
import {
  BANDS,
  type BelowMinimumRow,
  loadInvestability,
} from "@/src/views/investability";

import "../styles/investability.css";

/** How many of the companies below the line the page lists; the register has the rest. */
const LISTED = 25;

/** The register filtered to every company below the line, lowest bound first. */
const BELOW_REGISTER = "/?sort=float-asc&floatMax=15#register";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMetadata({
    lang,
    title: investabilityMessages[lang].metaTitle,
    description: seoMessages[lang].investability,
    path: "/investability",
  });
}

function Source({
  url,
  publisher,
  suffix,
}: {
  url: string;
  publisher: string;
  suffix: string;
}) {
  return (
    <a href={url} rel="noreferrer">
      {publisher}
      {suffix}
    </a>
  );
}

/** Consecutive rows that share the same possible tranches share one heading row. */
function groupByTranches(rows: readonly BelowMinimumRow[]) {
  const groups: { tranches: Tranche[]; rows: BelowMinimumRow[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.tranches.join() === row.possibleTranches.join()) {
      last.rows.push(row);
    } else {
      groups.push({ tranches: row.possibleTranches, rows: [row] });
    }
  }
  return groups;
}

function CodeList({ codes, none }: { codes: string[]; none: string }) {
  if (codes.length === 0) return <>{none}</>;
  return (
    <>
      {codes.map((code, index) => (
        <span key={code}>
          {index > 0 ? ", " : ""}
          <Link href={`/t/${code}`}>{code}</Link>
        </span>
      ))}
    </>
  );
}

export default async function InvestabilityPage() {
  const lang = await getLang();
  const m = investabilityMessages[lang];
  const view = loadInvestability(loadConfig().databasePath);
  const today = new Date().toISOString().slice(0, 10);
  const nextEvent = TIMELINE.find((event) => event.date >= today);
  const pressReport = m.pressReport;

  const peak =
    view.kind === "ready"
      ? Math.max(1, ...view.bands.map((band) => band.count))
      : 1;
  const listed =
    view.kind === "ready" ? view.belowMinimum.slice(0, LISTED) : [];

  return (
    <>
      <PageHeader
        title={m.title}
        lede={m.lede}
        aside={
          view.kind === "ready" ? (
            <p className="stamp">
              {m.asOf(formatDate(view.month.recordDate, lang))}
            </p>
          ) : null
        }
      />

      {view.kind === "absent" ? (
        <Section id="count" title={m.counts.heading}>
          <p className="absent">
            {commonMessages[lang].ownershipAbsence.no_published_month}
          </p>
        </Section>
      ) : (
        <>
          <Section id="count" title={m.counts.heading} note={m.counts.note}>
            <Figures
              items={[
                {
                  label: m.counts.sigi(formatDate(view.month.recordDate, lang)),
                  value: view.belowMinimum.length,
                  note: m.counts.sigiNote,
                  lead: true,
                },
                {
                  label: m.counts.exchangeNearest(
                    formatDate(view.official.asOf, lang),
                  ),
                  value: `${view.official.belowMinimum}${
                    view.official.listed
                      ? m.counts.ofListed(view.official.listed)
                      : ""
                  }`,
                  note: m.counts.exchangeNearestNote,
                },
                ...(view.latestOfficial !== view.official
                  ? [
                      {
                        label: m.counts.exchangeLatest(
                          formatDate(view.latestOfficial.asOf, lang),
                        ),
                        value: `${view.latestOfficial.belowMinimum}${
                          view.latestOfficial.listed
                            ? m.counts.ofListed(view.latestOfficial.listed)
                            : ""
                        }`,
                        note: m.counts.exchangeLatestNote,
                      },
                    ]
                  : []),
                ...(nextEvent
                  ? [
                      {
                        label: m.counts.nextDate,
                        value: (
                          <a className="inv-next" href="#timeline">
                            {formatDate(nextEvent.date, lang)}
                          </a>
                        ),
                        note: localise(nextEvent.label, lang),
                      },
                    ]
                  : []),
              ]}
            />
            <SourceNote summary={m.counts.sourceSummary}>
              <p>
                {m.counts.gap}
                <Source
                  {...view.official.source}
                  suffix={
                    view.official.source.kind === "secondary" ? pressReport : ""
                  }
                />
                {view.official !== view.latestOfficial ? (
                  <>
                    {m.counts.and}
                    <Source
                      {...view.latestOfficial.source}
                      suffix={
                        view.latestOfficial.source.kind === "secondary"
                          ? pressReport
                          : ""
                      }
                    />
                  </>
                ) : null}
                {m.counts.end} <a href="#methodology">{m.counts.method}</a>.
              </p>
            </SourceNote>
          </Section>

          <Section
            id="bands"
            title={m.bands.heading}
            note={m.bands.note}
            stamp={m.asOf(formatDate(view.month.recordDate, lang))}
          >
            <div className="table-wrap">
              <table className="tbl inv-bands">
                <thead>
                  <tr>
                    <th scope="col">{m.bands.bound}</th>
                    <th scope="col">{m.bands.companies}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.bands.map((band, index) => {
                    const edge = BANDS[index];
                    return (
                      <FloatBandRow
                        key={band.id}
                        below={
                          edge.max !== null &&
                          edge.max <= FREE_FLOAT_MINIMUM_HUNDREDTHS
                        }
                        line={
                          edge.min === FREE_FLOAT_MINIMUM_HUNDREDTHS
                            ? m.bands.line
                            : null
                        }
                        label={
                          <Link href={`/?${band.screenQuery}`}>
                            {m.bands.labels[band.id]}
                          </Link>
                        }
                        count={band.count}
                        share={(band.count / peak) * 100}
                      />
                    );
                  })}
                  <tr className="inv-none">
                    <th scope="row">{m.bands.noFigure}</th>
                    <td>
                      <span className="inv-meter">
                        <span className="inv-count">
                          {view.incomplete.length}
                        </span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {view.incomplete.length > 0 ? (
              <p className="inv-quiet">
                {m.bands.incompleteBefore}
                {view.incomplete.map((c) => c.shareCode).join(", ")}
                {m.bands.incompleteAfter}
              </p>
            ) : null}
            <S1Citation month={view.month} lang={lang} />
          </Section>

          <Section
            id="below"
            title={m.below.heading(view.belowMinimum.length)}
            stamp={m.below.stamp(listed.length, view.belowMinimum.length)}
            note={m.below.intro}
          >
            {view.previous ? (
              <ul className="inv-moves">
                <li>
                  <Icon name="up" />
                  <span>
                    {m.below.rose(
                      view.crossedUp.length,
                      formatDate(view.previous.recordDate, lang),
                    )}{" "}
                    <CodeList codes={view.crossedUp} none={m.below.none} />
                  </span>
                </li>
                <li>
                  <Icon name="down" />
                  <span>
                    {m.below.fell(
                      view.crossedDown.length,
                      formatDate(view.previous.recordDate, lang),
                    )}{" "}
                    <CodeList codes={view.crossedDown} none={m.below.none} />
                  </span>
                </li>
              </ul>
            ) : (
              <p className="inv-quiet">{m.below.noPrevious}</p>
            )}
            <div className="table-wrap">
              <table className="tbl inv-below">
                <thead>
                  <tr>
                    <th scope="col">{m.below.code}</th>
                    <th scope="col">{m.below.company}</th>
                    <th scope="col" className="num">
                      {m.below.bound}
                    </th>
                    <th scope="col" className="num hide-sm">
                      {m.below.before}
                    </th>
                  </tr>
                </thead>
                {groupByTranches(listed).map((group) => (
                  <tbody key={group.tranches.join()}>
                    <tr className="inv-group">
                      <th scope="rowgroup" colSpan={4}>
                        <span className="inv-group-title">
                          {m.below.deadlines}
                        </span>
                        {possibleDeadlines(group.tranches, lang).map((line) => (
                          <span key={line} className="inv-group-line">
                            {line}
                          </span>
                        ))}
                      </th>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.shareCode}>
                        <td>
                          <Link className="code" href={`/t/${row.shareCode}`}>
                            {row.shareCode}
                          </Link>
                        </td>
                        <td>{row.issuerName}</td>
                        <td className="num">
                          {formatPercent(row.upperBoundHundredths, lang)}
                        </td>
                        <td className="num hide-sm">
                          {row.previousUpperBoundHundredths === null ? (
                            <>
                              <span aria-hidden="true">—</span>
                              <span className="sr-only">
                                {m.below.notInPrior}
                              </span>
                            </>
                          ) : (
                            formatPercent(
                              row.previousUpperBoundHundredths,
                              lang,
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
            {view.belowMinimum.length > listed.length ? (
              <p>
                <Link className="btn btn--quiet" href={BELOW_REGISTER}>
                  {m.below.all(view.belowMinimum.length)}
                </Link>
              </p>
            ) : null}
          </Section>
        </>
      )}

      <Section id="timeline" title={m.timeline.heading} note={m.timeline.note}>
        <div className="table-wrap">
          <table className="tbl inv-timeline">
            <thead>
              <tr>
                <th scope="col">{m.timeline.date}</th>
                <th scope="col">{m.timeline.event}</th>
              </tr>
            </thead>
            <tbody>
              {TIMELINE.map((event) => {
                const past = event.date < today;
                const next = event === nextEvent;
                return (
                  <tr
                    key={`${event.date}-${event.label.en}`}
                    data-state={past ? "past" : next ? "next" : undefined}
                  >
                    <th scope="row">
                      <span className="nowrap">
                        {formatDate(event.date, lang)}
                      </span>
                      {past ? (
                        <Pill>{m.timeline.passed}</Pill>
                      ) : next ? (
                        <Pill tone="info">{m.timeline.next}</Pill>
                      ) : null}
                    </th>
                    <td>
                      <span className="inv-event">
                        {localise(event.label, lang)}
                      </span>
                      <span className="inv-source">
                        {m.timeline.source}
                        <Source
                          {...event.source}
                          suffix={
                            event.source.kind === "primary"
                              ? m.timeline.primary
                              : ""
                          }
                        />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SourceNote summary={m.timeline.foldSummary}>
          <p>
            <strong>{m.timeline.tranches}</strong>
          </p>
          <ul className="inv-tranches">
            {(Object.keys(TRANCHES) as Tranche[]).map((tranche) => (
              <li key={tranche}>
                {localise(TRANCHES[tranche].label, lang)}:{" "}
                {trancheDeadlines(tranche, lang)}
              </li>
            ))}
          </ul>
          <p>
            {m.timeline.ruleBefore}
            {RULE_SOURCES.map((source, index) => (
              <span key={source.url}>
                {index > 0 ? m.timeline.sourceJoin : ""}
                <Source {...source} suffix={pressReport} />
              </span>
            ))}
            {m.timeline.ruleAfter}
          </p>
        </SourceNote>
      </Section>

      <Section id="methodology" title={m.method.heading}>
        <div className="prose">
          {m.method.paragraphs.map((paragraph) => (
            <p key={paragraph.lead}>
              <strong>{paragraph.lead}</strong> {paragraph.body}
            </p>
          ))}
        </div>
      </Section>
    </>
  );
}

/** One band of the chart: its label, a bar sized to its count, the count as text. */
function FloatBandRow({
  below,
  line,
  label,
  count,
  share,
}: {
  below: boolean;
  /** Set on the first band at or above the 15% minimum: the line is drawn above it. */
  line: string | null;
  label: ReactNode;
  count: number;
  share: number;
}) {
  return (
    <>
      {line ? (
        <tr className="inv-line">
          <td colSpan={2}>
            <span>{line}</span>
          </td>
        </tr>
      ) : null}
      <tr data-below={below ? "" : undefined}>
        <th scope="row">{label}</th>
        <td>
          <span className="inv-meter">
            <span
              className="inv-bar"
              aria-hidden="true"
              style={cssVars({ "--share": share })}
            />
            <span className="inv-count">{count}</span>
          </span>
        </td>
      </tr>
    </>
  );
}
