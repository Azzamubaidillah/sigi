import Link from "next/link";

import {
  Icon,
  type IconName,
  Notice,
  Pill,
  type Tone,
} from "@/app/_components/ui";
import { formatDate } from "@/app/_lib/format";
import { localise } from "@/src/i18n/define";
import type { Lang } from "@/src/i18n/lang";
import { commonMessages } from "@/src/i18n/messages/common";
import { thesesMessages } from "@/src/i18n/messages/theses";
import { SERIES } from "@/src/macro/series";
import { SOURCES } from "@/src/sources/register";
import type { CheckStatus, Condition } from "@/src/theses/conditions";
import type { ThesisStatus } from "@/src/theses/header";
import type { ConditionRow } from "@/src/views/theses";

/** On every thesis page and list (PRD F7, R3). */
export function NotAdvice({ lang }: { lang: Lang }) {
  return <Notice>{thesesMessages[lang].notAdvice}</Notice>;
}

const CHECK_TONE: Record<CheckStatus, Tone | undefined> = {
  met: "warn",
  "not-met": "positive",
  manual: undefined,
  unknown: "info",
};

const CHECK_ICON: Record<CheckStatus, IconName> = {
  met: "alert",
  "not-met": "check",
  manual: "search",
  unknown: "info",
};

/** A condition's state as a word with an icon; the tint is never the only signal. */
export function CheckPill({
  status,
  lang,
}: {
  status: CheckStatus;
  lang: Lang;
}) {
  return (
    <Pill tone={CHECK_TONE[status]}>
      <Icon name={CHECK_ICON[status]} />
      {thesesMessages[lang].checkStatus[status]}
    </Pill>
  );
}

export function StatusPill({
  status,
  lang,
}: {
  status: ThesisStatus;
  lang: Lang;
}) {
  return (
    <Pill tone={status === "active" ? "positive" : undefined}>
      {commonMessages[lang].thesisStatus[status]}
    </Pill>
  );
}

export function TickerLinks({ codes }: { codes: readonly string[] }) {
  return (
    <span className="th-tickers">
      {codes.map((code) => (
        <Link key={code} href={`/t/${code}`}>
          {code}
        </Link>
      ))}
    </span>
  );
}

export interface ConditionCounts {
  hit: number;
  holding: number;
  manual: number;
  unknown: number;
  unchecked: number;
  total: number;
  /** The latest day any of them was checked, or null if none was. */
  checkedOn: string | null;
}

export function countConditions(
  rows: readonly ConditionRow[],
): ConditionCounts {
  const counts: ConditionCounts = {
    hit: 0,
    holding: 0,
    manual: 0,
    unknown: 0,
    unchecked: 0,
    total: rows.length,
    checkedOn: null,
  };
  for (const { check } of rows) {
    if (!check) {
      counts.unchecked += 1;
      continue;
    }
    if (counts.checkedOn === null || check.checkedOn > counts.checkedOn) {
      counts.checkedOn = check.checkedOn;
    }
    switch (check.status) {
      case "met":
        counts.hit += 1;
        break;
      case "not-met":
        counts.holding += 1;
        break;
      case "manual":
        counts.manual += 1;
        break;
      case "unknown":
        counts.unknown += 1;
        break;
    }
  }
  return counts;
}

/** "1 hit, 3 holding, 1 to check by hand": only the states that occur. */
export function countsInWords(counts: ConditionCounts, lang: Lang): string {
  const m = thesesMessages[lang].counts;
  return [
    counts.hit > 0 ? m.hit(counts.hit) : null,
    counts.holding > 0 ? m.holding(counts.holding) : null,
    counts.manual > 0 ? m.manual(counts.manual) : null,
    counts.unknown > 0 ? m.unknown(counts.unknown) : null,
    counts.unchecked > 0 ? m.unchecked(counts.unchecked) : null,
  ]
    .filter((part) => part !== null)
    .join(", ");
}

const DAY_MS = 86_400_000;

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    Date.now(),
  );
}

/** How far a date is from today in Jakarta, in words: "in 3 months", "2 days ago". */
export function distanceFromToday(isoDate: string, lang: Lang): string {
  const m = thesesMessages[lang].distance;
  const days = Math.round(
    (Date.parse(`${isoDate}T00:00:00Z`) -
      Date.parse(`${jakartaToday()}T00:00:00Z`)) /
      DAY_MS,
  );
  if (days === 0) return m.today;
  const away = Math.abs(days);
  const span =
    away < 60
      ? m.days(away)
      : away < 730
        ? m.months(Math.round(away / 30.44))
        : m.years(Math.round(away / 365.25));
  return days > 0 ? m.future(span) : m.past(span);
}

function number(value: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
    maximumFractionDigits: 6,
  }).format(value);
}

function hundredthsOf(hundredths: number, lang: Lang): string {
  return `${number(hundredths / 100, lang)}%`;
}

/** A typed condition in words: what is read, and the threshold it is held to. */
export function describeCondition(
  condition: Condition,
  lang: Lang,
): { subject: string; threshold: string } {
  const m = thesesMessages[lang].conditions;
  const side = (direction: "below" | "above") =>
    direction === "below" ? m.below : m.above;
  switch (condition.kind) {
    case "ownership":
      return {
        subject: m.ownership(condition.holder, condition.shareCode),
        threshold: `${side(condition.direction)} ${hundredthsOf(condition.hundredths, lang)}`,
      };
    case "float": {
      const level = `${m.below} ${hundredthsOf(condition.hundredths, lang)}`;
      return {
        subject: m.float(condition.shareCode),
        threshold: condition.from
          ? `${level}, ${m.from(formatDate(condition.from, lang))}`
          : level,
      };
    }
    case "macro": {
      const series = SERIES[condition.seriesId];
      const unit = series.unit === "%" ? "%" : ` ${series.unit}`;
      return {
        subject: localise(series.name, lang),
        threshold: `${side(condition.direction)} ${number(condition.value, lang)}${unit}`,
      };
    }
    case "date":
      return {
        subject: m.date(condition.note),
        threshold: formatDate(condition.date, lang),
      };
    case "price":
      return {
        subject: m.price(condition.shareCode),
        threshold: `${side(condition.direction)} ${condition.level}`,
      };
  }
}

function ConditionCell({ row, lang }: { row: ConditionRow; lang: Lang }) {
  const m = thesesMessages[lang].conditions;
  const words = describeCondition(row.condition, lang);
  return (
    <>
      <strong>{words.subject}</strong>
      <span className="th-inline-threshold"> {words.threshold}</span>
      {row.holderSlug ? (
        <>
          {" "}
          <Link href={`/holders/${row.holderSlug}`}>{m.holderPage}</Link>
        </>
      ) : null}
      {row.source ? (
        <span className="th-source">
          {m.source(localise(SOURCES[row.source].name, lang))}
        </span>
      ) : null}
    </>
  );
}

/**
 * The conditions with the worker's latest check. `checked` is false for an
 * older version, whose conditions are shown but not checked.
 */
export function ConditionTable({
  rows,
  checked,
  lang,
}: {
  rows: ConditionRow[];
  checked: boolean;
  lang: Lang;
}) {
  const m = thesesMessages[lang].conditions;
  return (
    <div className="table-wrap">
      <table className="tbl th-conditions">
        <thead>
          <tr>
            <th scope="col">{m.condition}</th>
            <th scope="col" className="hide-sm">
              {m.threshold}
            </th>
            {checked ? (
              <>
                <th scope="col">{m.reading}</th>
                <th scope="col">{m.status}</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.condition.text}>
              <td>
                <ConditionCell row={row} lang={lang} />
              </td>
              <td className="hide-sm">
                {describeCondition(row.condition, lang).threshold}
              </td>
              {checked ? (
                row.check ? (
                  <>
                    <td>
                      {row.check.detail}
                      <span className="th-source">
                        {m.asOf(formatDate(row.check.checkedOn, lang))}
                      </span>
                    </td>
                    <td>
                      <CheckPill status={row.check.status} lang={lang} />
                      {row.check.metSince ? (
                        <span className="th-source">
                          {m.since(formatDate(row.check.metSince, lang))}
                        </span>
                      ) : null}
                    </td>
                  </>
                ) : (
                  <td colSpan={2} className="absent">
                    {m.notChecked}
                  </td>
                )
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
