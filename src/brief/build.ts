import type Database from "better-sqlite3";

import { jakartaDate } from "../fetch/s1-fetch";
import {
  FREE_FLOAT_MINIMUM_HUNDREDTHS,
  TIMELINE,
  TRANCHES,
} from "../investability/rule";
import { FEEDS, S1_FEED } from "../macro/feeds";
import { NEWS_FEED } from "../news/feeds";
import { compareMonths } from "../ownership/metrics";
import { holderKey } from "../ownership/holder-names";
import {
  parseThesis,
  readThesisMarkdown,
  thesisSlugs,
  thesisVersions,
} from "../theses/folder";
import { loadFeedStatus, loadS1Health } from "../views/data-health";
import { loadHolderLinks } from "../views/holders";
import { loadInvestability } from "../views/investability";
import { loadMacro } from "../views/macro";
import { latestFigures } from "../views/ownership";
import { loadSnapshot } from "../views/snapshot";
import type { BriefContext, ContextSectionName } from "./files";

/**
 * Sigi's readings for the daily brief (PRD F12), from its own published data
 * only. Every citable item carries an evidence `key`. Individual holders are
 * never named: only holders that may have a page (institutions, C6) appear by
 * name, and the rest are counted (D-007). A section that cannot be built is
 * listed in `absent` with its reason.
 */

export interface BuildOptions {
  databasePath: string;
  thesesDirectory: string;
  now: number;
}

const DAY_MS = 86_400_000;
const TOP_COMPANIES = 40;
const MOVES_PER_COMPANY = 5;
const RELEASED_WITHIN_MS = 30 * 3_600_000;
const NEWS_WITHIN_MS = 3 * DAY_MS;

const percent = (hundredths: number | null) =>
  hundredths === null ? null : (hundredths / 100).toFixed(2);

function daysFrom(today: string, date: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      DAY_MS,
  );
}

function ownershipSection(
  options: BuildOptions,
): NonNullable<BriefContext["ownership"]> | string {
  const snapshot = loadSnapshot(options.databasePath);
  const latest = snapshot?.months[0];
  if (!snapshot || !latest) return "No ownership month is published yet.";
  const previous = snapshot.months[1] ?? null;
  if (!previous) {
    return `Only one month (${latest.recordDate}) is published, so there are no changes to report.`;
  }
  const now = snapshot.companies.get(latest.recordDate)!;
  const before = snapshot.companies.get(previous.recordDate)!;
  const named = loadHolderLinks(options.databasePath);
  const companies: NonNullable<BriefContext["ownership"]>["companies"] = [];
  let compared = 0;
  const scored: { size: number; entry: (typeof companies)[number] }[] = [];
  for (const company of now.values()) {
    const prior = before.get(company.shareCode);
    if (!prior) continue;
    compared += 1;
    const changes = compareMonths(company.holdings, prior.holdings);
    const all = (
      ["entered", "exited", "increased", "decreased"] as const
    ).flatMap((kind) => changes[kind].map((change) => ({ kind, change })));
    if (all.length === 0) continue;
    const size = all.reduce(
      (total, { change }) =>
        total +
        Math.abs(
          (change.afterHundredths ?? 0) - (change.beforeHundredths ?? 0),
        ),
      0,
    );
    const visible = all
      .filter(({ change }) => named.has(holderKey(change.investorName)))
      .sort(
        (a, b) =>
          Math.abs(
            (b.change.afterHundredths ?? 0) - (b.change.beforeHundredths ?? 0),
          ) -
          Math.abs(
            (a.change.afterHundredths ?? 0) - (a.change.beforeHundredths ?? 0),
          ),
      );
    scored.push({
      size,
      entry: {
        key: `own:${company.shareCode}`,
        code: company.shareCode,
        issuer: company.issuerName,
        entered: changes.entered.length,
        exited: changes.exited.length,
        increased: changes.increased.length,
        decreased: changes.decreased.length,
        unnamedMoves: all.length - visible.length,
        moves: visible
          .slice(0, MOVES_PER_COMPANY)
          .map(({ kind, change }, i) => ({
            key: `own:${company.shareCode}:${i + 1}`,
            holder: change.investorName,
            change: kind,
            beforePercent: percent(change.beforeHundredths),
            afterPercent: percent(change.afterHundredths),
          })),
      },
    });
  }
  scored.sort(
    (a, b) => b.size - a.size || a.entry.code.localeCompare(b.entry.code),
  );
  companies.push(...scored.slice(0, TOP_COMPANIES).map(({ entry }) => entry));
  return {
    key: "own",
    asOf: latest.recordDate,
    source: "S1",
    evidenceStatus:
      "Published register of holders above 1%, compared month on month. A holder crossing 1% shows as entered or exited; the register cannot see below 1%.",
    previous: previous.recordDate,
    companiesCompared: compared,
    companiesWithChanges: scored.length,
    companies,
  };
}

function floatSection(
  options: BuildOptions,
  today: string,
): NonNullable<BriefContext["float"]> | string {
  const investability = loadInvestability(options.databasePath);
  const snapshot = loadSnapshot(options.databasePath);
  const latest = snapshot ? latestFigures(snapshot) : null;
  if (investability.kind !== "ready" || !latest) {
    return "No ownership month is published yet.";
  }
  const bound = new Map(
    latest.figures.map((figures) => [
      figures.shareCode,
      figures.freeFloatUpperBoundHundredths,
    ]),
  );
  const company = (code: string) => ({
    key: `float:${code}`,
    code,
    boundPercent: percent(bound.get(code) ?? 0)!,
  });
  const official = investability.latestOfficial;
  const deadlines = [
    ...new Map(
      Object.values(TRANCHES).flatMap((tranche) =>
        tranche.deadlines.map((deadline) => [
          `${deadline.date}:${deadline.requiredHundredths}`,
          {
            date: deadline.date,
            label: `${tranche.label}: ${deadline.requiredHundredths / 100}% by ${deadline.date}`,
          },
        ]),
      ),
    ).values(),
  ]
    .map((deadline) => ({
      ...deadline,
      inDays: daysFrom(today, deadline.date),
    }))
    .filter((deadline) => deadline.inDays >= 0 && deadline.inDays <= 90)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((deadline, i) => ({
      key: `deadline:${deadline.date}:${i + 1}`,
      ...deadline,
    }));
  return {
    key: "float",
    asOf: investability.month.recordDate,
    source: "S1",
    evidenceStatus: `Free float is an upper bound under the exchange's definition (100% minus holders of 5% or more); the official figure is this or lower, so "certainly below ${FREE_FLOAT_MINIMUM_HUNDREDTHS / 100}%" is a floor on the official count. Registers listing under 15% above 1% get no figure.`,
    certainlyBelow15: investability.belowMinimum.length,
    companies: investability.companies,
    official: {
      asOf: official.asOf,
      belowMinimum: official.belowMinimum,
      listed: official.listed,
      publisher: official.source.publisher,
    },
    crossedBelow: investability.crossedDown.map(company),
    crossedAbove: investability.crossedUp.map(company),
    deadlines,
  };
}

function macroSection(
  options: BuildOptions,
): NonNullable<BriefContext["macro"]> | string {
  const cards = loadMacro(options.databasePath, options.now).flatMap(
    (group) => group.cards,
  );
  const published = cards.flatMap((card) =>
    card.kind === "series" ? [card] : [],
  );
  if (published.length === 0) return "No macro series is published yet.";
  const today = jakartaDate(options.now);
  return {
    key: "macro",
    asOf: today,
    source: "S6, S7, S8",
    evidenceStatus:
      "Values as published by Bank Indonesia, the World Bank and FRED. A release date is when Sigi first saw the value, at the resolution of a daily check; expected dates come from each source's usual cadence and are not announcements.",
    released: published
      .filter((card) => options.now - card.latestSeenAt <= RELEASED_WITHIN_MS)
      .map((card) => ({
        key: `macro:${card.id}:${card.latest.period}`,
        series: card.id,
        name: card.definition.name,
        unit: card.definition.unit,
        period: card.latest.period,
        value: card.latest.value.toFixed(card.definition.decimals),
        previousValue:
          card.previous?.value.toFixed(card.definition.decimals) ?? null,
        firstSeenAt: new Date(card.latestSeenAt).toISOString(),
        source: card.definition.source,
      })),
    scheduled: published
      .filter((card) => {
        const inDays = daysFrom(today, card.nextRelease.date);
        return inDays >= 0 && inDays <= 7;
      })
      .map((card) => ({
        key: `macro-next:${card.id}`,
        series: card.id,
        name: card.definition.name,
        expectedOn: card.nextRelease.date,
        approximate: card.nextRelease.approximate,
      })),
  };
}

interface CheckRow {
  condition: string;
  status: "met" | "not-met" | "unknown" | "manual";
  detail: string;
  checkedOn: string;
}

function thesesSection(
  sqlite: Database.Database,
  options: BuildOptions,
  today: string,
): NonNullable<BriefContext["theses"]> | string {
  const slugs = thesisSlugs(options.thesesDirectory);
  if (slugs.length === 0) return "No thesis is published yet.";
  const checks = sqlite.prepare(
    `SELECT condition, status, detail, checked_on AS checkedOn FROM thesis_checks
      WHERE slug = ? AND condition = ? ORDER BY checked_on DESC LIMIT 2`,
  );
  const lastOther = sqlite
    .prepare(
      `SELECT MAX(checked_on) FROM thesis_checks
        WHERE slug = ? AND condition = ? AND status <> 'met'`,
    )
    .pluck();
  const firstMet = sqlite
    .prepare(
      `SELECT MIN(checked_on) FROM thesis_checks
        WHERE slug = ? AND condition = ? AND status = 'met' AND checked_on > ?`,
    )
    .pluck();
  let lastChecked: string | null = null;
  const items = slugs.map((slug) => {
    const version = thesisVersions(options.thesesDirectory, slug)[0]!;
    const markdown = readThesisMarkdown(options.thesesDirectory, slug, version);
    const thesis = markdown === null ? null : parseThesis(markdown);
    const header = thesis?.header ?? null;
    const conditions = (thesis?.conditions ?? []).map((condition, i) => {
      // better-sqlite3 rows are untyped; the columns are fixed by the query.
      const rows = checks.all(slug, condition.text) as CheckRow[];
      const latest = rows[0] ?? null;
      if (latest && (lastChecked === null || latest.checkedOn > lastChecked)) {
        lastChecked = latest.checkedOn;
      }
      const since =
        latest?.status === "met"
          ? ((firstMet.get(
              slug,
              condition.text,
              (lastOther.get(slug, condition.text) as string | null) ?? "",
            ) as string | null) ?? latest.checkedOn)
          : null;
      return {
        key: `cond:${slug}:${i + 1}`,
        text: condition.text,
        status: latest?.status ?? null,
        detail: latest?.detail ?? null,
        checkedOn: latest?.checkedOn ?? null,
        metSince: since,
        changedToday:
          latest !== null &&
          latest.checkedOn === today &&
          rows[1] !== undefined &&
          rows[1].status !== latest.status,
      };
    });
    return {
      key: `thesis:${slug}`,
      slug,
      title: header?.title ?? null,
      tickers: header?.tickers ?? [],
      status: header?.status ?? null,
      review: header?.review ?? null,
      reviewDue: header !== null && daysFrom(today, header.review) <= 7,
      unreadable: thesis?.headerError ?? thesis?.conditionsError ?? null,
      conditions,
    };
  });
  return {
    key: "theses",
    asOf: lastChecked ?? "not checked yet",
    source:
      "Theses in the repository; conditions checked by the worker against S1, S6, S7 and S8",
    evidenceStatus:
      "The author's own theses. Each condition is the worker's daily check against Sigi's published data: met, not met, unknown with its reason, or a manual check for prices.",
    items,
  };
}

function eventsSection(
  today: string,
): NonNullable<BriefContext["events"]> | string {
  const items = TIMELINE.map((event) => ({
    date: event.date,
    label: event.label,
    publisher: `${event.source.publisher}${event.source.kind === "secondary" ? " (secondary report)" : ""}`,
    inDays: daysFrom(today, event.date),
  }))
    .filter((event) => event.inDays >= -7 && event.inDays <= 90)
    .map((event, i) => ({ key: `event:${event.date}:${i + 1}`, ...event }));
  return {
    key: "events",
    asOf: today,
    source:
      "Sigi's rule and calendar timeline (src/investability/rule.ts), each date with its source",
    evidenceStatus:
      "Dated rule deadlines and index-provider dates from the past week and the next 90 days.",
    items,
  };
}

function healthSection(options: BuildOptions): BriefContext["dataHealth"] {
  const feeds = [S1_FEED, ...Object.keys(FEEDS), NEWS_FEED];
  const s1 = loadS1Health(options.databasePath, options.now);
  return {
    key: "health",
    asOf: new Date(options.now).toISOString(),
    source: "The worker's fetch log (fetch_runs)",
    evidenceStatus:
      "Whether each source was reached on its last check. A failed check is retried after three hours; the previous data stays published.",
    feeds: loadFeedStatus(options.databasePath, feeds).map((status) => ({
      key: `health:${status.feed}`,
      feed: status.feed,
      lastCheck: status.last
        ? new Date(status.last.startedAt).toISOString()
        : null,
      outcome: status.last?.outcome ?? null,
      error: status.last?.error ?? null,
    })),
    ownershipMonth: s1.latest?.recordDate ?? null,
    nextOwnershipFileBy: s1.next?.expectedBy ?? null,
    ownershipOverdue: s1.overdue,
  };
}

interface NewsRow {
  id: number;
  title: string;
  publisher: string;
  publishedAt: number;
  url: string;
}

function newsSection(
  sqlite: Database.Database,
  options: BuildOptions,
  theses: NonNullable<BriefContext["theses"]> | string,
): NonNullable<BriefContext["news"]> | string {
  if (typeof theses === "string") {
    return "No thesis is published, so no headline is matched to a thesis ticker.";
  }
  const tickers = [
    ...new Set(
      theses.items
        .filter((item) => item.status === "active")
        .flatMap((item) => item.tickers),
    ),
  ];
  if (tickers.length === 0) {
    return "No active thesis names a ticker to match headlines against.";
  }
  const rows = sqlite
    .prepare(
      `SELECT id, title, publisher, published_at AS publishedAt, url FROM news_items
        WHERE published_at >= ? ORDER BY published_at DESC`,
    )
    .all(options.now - NEWS_WITHIN_MS) as NewsRow[];
  const items = rows.flatMap((row) => {
    const matched = tickers.filter((code) =>
      new RegExp(`(?<![A-Za-z0-9])${code}(?![A-Za-z0-9])`).test(row.title),
    );
    return matched.length === 0
      ? []
      : [
          {
            key: `news:${row.id}`,
            tickers: matched,
            title: row.title,
            publisher: row.publisher,
            publishedAt: new Date(row.publishedAt).toISOString(),
            url: row.url,
          },
        ];
  });
  return {
    key: "news",
    asOf: new Date(options.now).toISOString(),
    source:
      "S10: publisher RSS headlines (headline, publisher, time and link only)",
    evidenceStatus:
      "Headlines from the last three days whose title names a ticker of an active thesis. A headline is a pointer, not evidence: confirm on the linked page.",
    items,
  };
}

/** The context document, for `scripts/brief-context.ts` and the tests. */
export function buildBriefContext(
  sqlite: Database.Database,
  options: BuildOptions,
): BriefContext {
  const today = jakartaDate(options.now);
  const absent: BriefContext["absent"] = [];
  const keep = <T>(name: ContextSectionName, built: T | string): T | null => {
    if (typeof built === "string") {
      absent.push({ section: name, reason: built });
      return null;
    }
    return built;
  };
  const theses = thesesSection(sqlite, options, today);
  return {
    version: 1,
    generatedAt: new Date(options.now).toISOString(),
    timezone: "Asia/Jakarta",
    today,
    absent,
    ownership: keep("ownership", ownershipSection(options)),
    float: keep("float", floatSection(options, today)),
    macro: keep("macro", macroSection(options)),
    theses: keep("theses", theses),
    events: keep("events", eventsSection(today)),
    dataHealth: healthSection(options),
    news: keep("news", newsSection(sqlite, options, theses)),
  };
}
