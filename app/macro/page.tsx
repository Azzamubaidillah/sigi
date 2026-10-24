import type { Metadata } from "next";
import Link from "next/link";

import { Sparkline } from "@/app/_components/Sparkline";
import { TradingViewWidget } from "@/app/_components/TradingViewWidget";
import { formatDate, formatTimestamp } from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import type { SeriesDefinition } from "@/src/macro/series";
import { SOURCES, STATUS_LABELS } from "@/src/sources/register";
import {
  formatPeriod,
  loadMacro,
  MACRO_ABSENCE_TEXT,
  type SeriesCard,
  type SeriesFigures,
} from "@/src/views/macro";

export const metadata: Metadata = { title: "Macro" };

function number(value: number, decimals: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** A change in the series' unit; percentage rates change in points. */
function change(value: number, definition: SeriesDefinition): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  const unit = definition.unit === "%" ? " pp" : "";
  return `${sign}${number(Math.abs(value), definition.decimals)}${unit}`;
}

function Citation({
  definition,
  figures,
}: {
  definition: SeriesDefinition;
  figures: SeriesFigures;
}) {
  const accessed = `accessed ${formatDate(figures.accessedOn)}`;
  const link = (
    <a href={figures.sourceUrl} rel="noreferrer">
      {new URL(figures.sourceUrl).hostname}
    </a>
  );
  switch (definition.source) {
    case "S6":
      return (
        <>
          Source: Bank Indonesia, <i>{definition.sourceName}</i>, {accessed},{" "}
          {link}.
        </>
      );
    case "S7":
      return (
        <>
          Source: World Bank Commodity Price Data (The Pink Sheet),{" "}
          <i>{definition.sourceName}</i>, CC BY 4.0, {accessed}, {link}.
        </>
      );
    default:
      return (
        <>
          Source: Board of Governors of the Federal Reserve System (US),{" "}
          <i>{definition.sourceName}</i>, retrieved from FRED, Federal Reserve
          Bank of St. Louis, {accessed}, {link}.
        </>
      );
  }
}

function Card({ card }: { card: SeriesCard }) {
  const { definition } = card;
  const licence = STATUS_LABELS[SOURCES[definition.source].status];
  if (card.kind === "absent") {
    return (
      <article className="macro-card">
        <h3>{definition.name}</h3>
        <p className="absent">
          {MACRO_ABSENCE_TEXT[card.reason]}
          {card.detail ? ` (${card.detail})` : ""}
        </p>
        <p className="citation">
          {SOURCES[definition.source].name}; {licence}.
        </p>
      </article>
    );
  }
  const values = card.history.map((o) => o.value);
  const next = card.nextRelease;
  return (
    <article className="macro-card">
      <h3>{definition.name}</h3>
      <p className="macro-value">
        <span className="badge published" title="As the source publishes it">
          published
        </span>{" "}
        <strong>{number(card.latest.value, definition.decimals)}</strong>{" "}
        <span className="muted">{definition.unit}</span>
        <br />
        <span className="muted">{formatPeriod(card.latest.period)}</span>
      </p>
      <dl className="macro-facts">
        {card.previous ? (
          <div>
            <dt>Previous, {formatPeriod(card.previous.period)}</dt>
            <dd>{number(card.previous.value, definition.decimals)}</dd>
          </div>
        ) : null}
        {card.change !== null ? (
          <div>
            <dt>
              Change{" "}
              <span
                className="badge derived"
                title="Calculated by Sigi from the published values"
              >
                Sigi
              </span>
            </dt>
            {/* No green or red: a higher rupiah rate or oil price is good for
                some sectors and bad for others. */}
            <dd>{change(card.change, definition)}</dd>
          </div>
        ) : null}
        {card.yoy ? (
          <div>
            <dt>
              On {formatPeriod(card.yoy.against)}{" "}
              <span
                className="badge derived"
                title="Calculated by Sigi from the published values"
              >
                Sigi
              </span>
            </dt>
            <dd>
              {card.yoy.percent > 0 ? "+" : card.yoy.percent < 0 ? "−" : "±"}
              {number(Math.abs(card.yoy.percent), 1)}%
            </dd>
          </div>
        ) : null}
      </dl>
      <Sparkline
        points={card.history}
        steps={definition.frequency === "meeting"}
        label={`${definition.name} over the past year`}
      />
      {values.length > 1 ? (
        <p className="macro-range muted">
          Past year: {number(Math.min(...values), definition.decimals)} to{" "}
          {number(Math.max(...values), definition.decimals)}
        </p>
      ) : null}
      <p className="citation">
        <Citation definition={definition} figures={card} /> {licence}. First
        seen by Sigi {formatTimestamp(card.latestSeenAt)}. Next release expected{" "}
        {next.approximate ? "around " : ""}
        {formatDate(next.date)}
        {next.late ? <span className="tone-negative"> (late)</span> : null}.
      </p>
      <details>
        <summary>Why it matters for IDX sectors</summary>
        <ul className="sector-links">
          {definition.sectors.map((link) => (
            <li key={link.sector}>
              <strong>{link.sector}.</strong> {link.rationale}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export default function MacroPage() {
  const groups = loadMacro(loadConfig().databasePath);
  return (
    <>
      <div className="page-header">
        <h1>Macro</h1>
        <p className="lede">
          The rates, prices and currencies that move Indonesian listed
          companies, with the sectors each one bears on and why. Values marked{" "}
          <span className="badge published">published</span> are as the source
          publishes them; values marked{" "}
          <span className="badge derived">Sigi</span> are Sigi&apos;s own
          calculations from them. The sector links are Sigi&apos;s reading, not
          the sources&apos;. Every source is fetched automatically once a day;
          see <Link href="/data">Data &amp; sources</Link>.
        </p>
      </div>
      {groups.map((group) => (
        <section className="panel" key={group.id}>
          <h2>{group.title}</h2>
          <div className="macro-grid">
            {group.cards.map((card) => (
              <Card key={card.id} card={card} />
            ))}
          </div>
          <div className="macro-indices">
            {group.sectorIndices.map((symbol) => (
              <TradingViewWidget
                key={symbol}
                script="embed-widget-mini-symbol-overview.js"
                height={190}
                title={`${symbol} chart by TradingView`}
                config={{
                  symbol,
                  width: "100%",
                  height: "100%",
                  dateRange: "12M",
                  isTransparent: false,
                  autosize: true,
                  locale: "en",
                }}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
