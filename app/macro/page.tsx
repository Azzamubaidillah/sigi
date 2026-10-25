import type { Metadata } from "next";
import Link from "next/link";

import { Sparkline } from "@/app/_components/Sparkline";
import { TradingViewWidget } from "@/app/_components/TradingViewWidget";
import { formatDate, formatTimestamp } from "@/app/_lib/format";
import { getLang } from "@/app/_lib/lang";
import { loadConfig } from "@/src/config";
import { localise } from "@/src/i18n/define";
import type { Lang } from "@/src/i18n/lang";
import { dataMessages } from "@/src/i18n/messages/data";
import { macroMessages } from "@/src/i18n/messages/macro";
import type { SeriesDefinition } from "@/src/macro/series";
import { SOURCES } from "@/src/sources/register";
import {
  formatPeriod,
  loadMacro,
  type SeriesCard,
  type SeriesFigures,
} from "@/src/views/macro";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: macroMessages[lang].metaTitle };
}

function number(value: number, decimals: number, lang: Lang): string {
  return value.toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** A change in the series' unit; percentage rates change in points. */
function change(
  value: number,
  definition: SeriesDefinition,
  lang: Lang,
): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  const unit = definition.unit === "%" ? macroMessages[lang].pointsSuffix : "";
  return `${sign}${number(Math.abs(value), definition.decimals, lang)}${unit}`;
}

function Citation({
  definition,
  figures,
  lang,
}: {
  definition: SeriesDefinition;
  figures: SeriesFigures;
  lang: Lang;
}) {
  const m = macroMessages[lang];
  const accessed = m.accessed(formatDate(figures.accessedOn, lang));
  const link = (
    <a href={figures.sourceUrl} rel="noreferrer">
      {new URL(figures.sourceUrl).hostname}
    </a>
  );
  const kind =
    definition.source === "S6" || definition.source === "S7"
      ? definition.source
      : "S8";
  return (
    <>
      {m.citation.source}
      {m.citation[kind].publisher}
      <i>{definition.sourceName}</i>
      {m.citation[kind].after(accessed)}
      {link}.
    </>
  );
}

function Card({ card, lang }: { card: SeriesCard; lang: Lang }) {
  const m = macroMessages[lang];
  const { definition } = card;
  const name = localise(definition.name, lang);
  const licence =
    dataMessages[lang].sourceStatus[SOURCES[definition.source].status];
  if (card.kind === "absent") {
    return (
      <article className="macro-card">
        <h3>{name}</h3>
        <p className="absent">
          {m.absence[card.reason]}
          {card.detail ? ` (${card.detail})` : ""}
        </p>
        <p className="citation">
          {localise(SOURCES[definition.source].name, lang)}; {licence}.
        </p>
      </article>
    );
  }
  const values = card.history.map((o) => o.value);
  const next = card.nextRelease;
  return (
    <article className="macro-card">
      <h3>{name}</h3>
      <p className="macro-value">
        <span className="badge published" title={m.publishedTitle}>
          {m.lede.published}
        </span>{" "}
        <strong>{number(card.latest.value, definition.decimals, lang)}</strong>{" "}
        <span className="muted">
          {m.units[definition.unit] ?? definition.unit}
        </span>
        <br />
        <span className="muted">{formatPeriod(card.latest.period, lang)}</span>
      </p>
      <dl className="macro-facts">
        {card.previous ? (
          <div>
            <dt>
              {m.previous}
              {formatPeriod(card.previous.period, lang)}
            </dt>
            <dd>{number(card.previous.value, definition.decimals, lang)}</dd>
          </div>
        ) : null}
        {card.change !== null ? (
          <div>
            <dt>
              {m.change}{" "}
              <span className="badge derived" title={m.derivedTitle}>
                {m.lede.sigi}
              </span>
            </dt>
            {/* No green or red: a higher rupiah rate or oil price is good for
                some sectors and bad for others. */}
            <dd>{change(card.change, definition, lang)}</dd>
          </div>
        ) : null}
        {card.yoy ? (
          <div>
            <dt>
              {m.on}
              {formatPeriod(card.yoy.against, lang)}{" "}
              <span className="badge derived" title={m.derivedTitle}>
                {m.lede.sigi}
              </span>
            </dt>
            <dd>
              {card.yoy.percent > 0 ? "+" : card.yoy.percent < 0 ? "−" : "±"}
              {number(Math.abs(card.yoy.percent), 1, lang)}%
            </dd>
          </div>
        ) : null}
      </dl>
      <Sparkline
        points={card.history}
        steps={definition.frequency === "meeting"}
        label={m.sparklineLabel(name)}
      />
      {values.length > 1 ? (
        <p className="macro-range muted">
          {m.pastYear(
            number(Math.min(...values), definition.decimals, lang),
            number(Math.max(...values), definition.decimals, lang),
          )}
        </p>
      ) : null}
      <p className="citation">
        <Citation definition={definition} figures={card} lang={lang} />{" "}
        {licence}
        {m.seen(formatTimestamp(card.latestSeenAt, lang))}
        {next.approximate ? m.around : ""}
        {formatDate(next.date, lang)}
        {next.late ? <span className="tone-negative">{m.late}</span> : null}.
      </p>
      <details>
        <summary>{m.why}</summary>
        <ul className="sector-links">
          {definition.sectors.map((link) => (
            <li key={link.sector}>
              <strong>{link.sector}.</strong> {localise(link.rationale, lang)}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export default async function MacroPage() {
  const lang = await getLang();
  const m = macroMessages[lang];
  const groups = loadMacro(loadConfig().databasePath);
  return (
    <>
      <div className="page-header">
        <h1>{m.heading}</h1>
        <p className="lede">
          {m.lede.intro}
          <span className="badge published">{m.lede.published}</span>
          {m.lede.middle}
          <span className="badge derived">{m.lede.sigi}</span>
          {m.lede.afterSigi}
          <Link href="/data">{m.lede.dataLink}</Link>
          {m.lede.end}
        </p>
      </div>
      {groups.map((group) => (
        <section className="panel" key={group.id}>
          <h2>{localise(group.title, lang)}</h2>
          <div className="macro-grid">
            {group.cards.map((card) => (
              <Card key={card.id} card={card} lang={lang} />
            ))}
          </div>
          <div className="macro-indices">
            {group.sectorIndices.map((symbol) => (
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
        </section>
      ))}
    </>
  );
}
