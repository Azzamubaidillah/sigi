import type { Metadata } from "next";
import Link from "next/link";

import { Sparkline } from "@/app/_components/Sparkline";
import { TradingViewWidget } from "@/app/_components/TradingViewWidget";
import {
  Icon,
  PageHeader,
  Pill,
  Section,
  SourceNote,
} from "@/app/_components/ui";
import { formatDate, formatTimestamp } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { pageMetadata } from "@/app/_lib/seo";
import { loadConfig } from "@/src/config";
import { localise } from "@/src/i18n/define";
import type { Lang } from "@/src/i18n/lang";
import { dataMessages } from "@/src/i18n/messages/data";
import { macroMessages } from "@/src/i18n/messages/macro";
import { seoMessages } from "@/src/i18n/messages/seo";
import { SOURCES } from "@/src/sources/register";
import { formatPeriod, loadMacro, type SeriesCard } from "@/src/views/macro";

import "../styles/macro.css";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMetadata({
    lang,
    title: macroMessages[lang].metaTitle,
    description: seoMessages[lang].macro,
    path: "/macro",
  });
}

function number(value: number, decimals: number, lang: Lang): string {
  return value.toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

type Direction = "up" | "down" | "flat";

/** The way a value moved, judged on the digits that are shown: +0.00 is unchanged. */
function direction(value: number, decimals: number): Direction {
  if (Number(Math.abs(value).toFixed(decimals)) === 0) return "flat";
  return value > 0 ? "up" : "down";
}

const SIGNS = { up: "+", down: "−", flat: "±" } as const;

/** One tile of the dashboard: a series' name, latest value, move, year and provenance. */
function Tile({ card, lang }: { card: SeriesCard; lang: Lang }) {
  const m = macroMessages[lang];
  const { definition } = card;
  const name = localise(definition.name, lang);
  const licence =
    dataMessages[lang].sourceStatus[SOURCES[definition.source].status];
  if (card.kind === "absent") {
    return (
      <article className="tile">
        <h3>{name}</h3>
        <p className="absent">
          {m.absence[card.reason]}
          {card.detail ? ` (${card.detail})` : ""}
        </p>
        <SourceNote
          summary={m.sourceSummary(
            localise(SOURCES[definition.source].name, lang),
          )}
        >
          <p>
            {localise(SOURCES[definition.source].name, lang)}. {m.licence}
            {licence}.
          </p>
        </SourceNote>
      </article>
    );
  }
  const { decimals } = definition;
  const values = card.history.map((o) => o.value);
  const next = card.nextRelease;
  const kind =
    definition.source === "S6" ||
    definition.source === "S7" ||
    definition.source === "S11"
      ? definition.source
      : "S8";
  const citation = m.citation[kind];
  const move = card.change === null ? null : direction(card.change, decimals);
  const yoy = card.yoy === null ? null : direction(card.yoy.percent, 1);
  return (
    <article className="tile">
      <h3>{name}</h3>
      <p className="tile-value">
        <strong>{number(card.latest.value, decimals, lang)}</strong>{" "}
        <span>{m.units[definition.unit] ?? definition.unit}</span>
      </p>
      <p className="tile-line">
        <Pill>{m.lede.published}</Pill>
        {m.asOf(formatPeriod(card.latest.period, lang))}
        {next.late ? <Pill tone="warn">{m.late}</Pill> : null}
      </p>
      {card.change !== null && card.previous && move ? (
        // No green or red: a higher rupiah rate or oil price is good for some
        // sectors and bad for others.
        <div className="tile-move">
          <p className="tile-line">
            <Icon name={move} />
            <strong>
              {SIGNS[move]}
              {number(Math.abs(card.change), decimals, lang)}
              {definition.unit === "%" ? m.pointsSuffix : ""}
            </strong>
            {m.moved[move]}
            <Pill>{m.lede.sigi}</Pill>
          </p>
          <p className="tile-sub">
            {m.from(
              number(card.previous.value, decimals, lang),
              formatPeriod(card.previous.period, lang),
            )}
          </p>
        </div>
      ) : null}
      {card.yoy && yoy ? (
        <p className="tile-line">
          <strong>
            {SIGNS[yoy]}
            {number(Math.abs(card.yoy.percent), 1, lang)}%
          </strong>
          {m.against}
          {formatPeriod(card.yoy.against, lang)}
          <Pill>{m.lede.sigi}</Pill>
        </p>
      ) : null}
      <div className="tile-chart">
        <Sparkline
          points={card.history}
          steps={definition.frequency === "meeting"}
          label={m.sparklineLabel(name)}
        />
        {values.length > 1 ? (
          <p className="tile-range">
            {m.pastYear(
              number(Math.min(...values), decimals, lang),
              number(Math.max(...values), decimals, lang),
            )}
          </p>
        ) : null}
      </div>
      <div className="tile-folds">
        <SourceNote summary={m.sourceSummary(citation.name)}>
          <p>
            {m.citation.source}
            {citation.publisher}
            <i>{definition.sourceName}</i>
            {citation.after(m.accessed(formatDate(card.accessedOn, lang)))}
            <a href={card.sourceUrl} rel="noreferrer">
              {new URL(card.sourceUrl).hostname}
            </a>
            .
          </p>
          <p>
            {m.licence}
            {licence}.
          </p>
          <p>{m.seen(formatTimestamp(card.latestSeenAt, lang))}</p>
          <p>{m.next(next.approximate, formatDate(next.date, lang))}</p>
        </SourceNote>
        <details className="src">
          <summary>
            <Icon name="info" />
            {m.why}
          </summary>
          <ul className="src-body tile-sectors">
            {definition.sectors.map((link) => (
              <li key={link.sector}>
                <strong>{link.sector}.</strong> {localise(link.rationale, lang)}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}

export default async function MacroPage() {
  const lang = await getLang();
  const m = macroMessages[lang];
  const groups = loadMacro(loadConfig().databasePath);
  const indices = groups.flatMap((group) => group.sectorIndices);
  return (
    <>
      <PageHeader
        title={m.heading}
        lede={
          <>
            {m.lede.intro}
            <Pill>{m.lede.published}</Pill>
            {m.lede.middle}
            <Pill>{m.lede.sigi}</Pill>
            {m.lede.afterSigi}
            <Link href="/data">{m.lede.dataLink}</Link>
            {m.lede.end}
          </>
        }
      />
      {groups.map((group) => (
        <Section
          key={group.id}
          id={group.id}
          title={localise(group.title, lang)}
        >
          <div className="tiles">
            {group.cards.map((card) => (
              <Tile key={card.id} card={card} lang={lang} />
            ))}
          </div>
        </Section>
      ))}
      <Section
        id="indices"
        title={m.indices.heading}
        stamp={m.indices.stamp}
        note={m.indices.note}
      >
        <div className="indices">
          {indices.map((symbol) => (
            <TradingViewWidget
              key={symbol}
              script="embed-widget-mini-symbol-overview.js"
              height={190}
              title={m.chart(symbol)}
              lang={lang}
              config={{
                symbol,
                width: "100%",
                height: "100%",
                dateRange: "12M",
                isTransparent: false,
                autosize: true,
              }}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
