import { jakartaDate } from "../fetch/s1-fetch";
import { type SourcedFact, TIMELINE } from "../investability/rule";
import type { Text } from "../i18n/define";

export interface EventRow {
  date: string;
  label: Text;
  source: SourcedFact;
  /** The date is before today in Jakarta. */
  past: boolean;
}

/** The rule and index dates, oldest first, each marked past or not as of now. */
export function loadEvents(now = Date.now()): EventRow[] {
  const today = jakartaDate(now);
  return [...TIMELINE]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => ({
      date: event.date,
      label: event.label,
      source: event.source,
      past: event.date < today,
    }));
}
