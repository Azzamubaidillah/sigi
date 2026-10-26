import { formatDate } from "@/app/_lib/format";
import type { Lang } from "@/src/i18n/lang";
import { commonMessages } from "@/src/i18n/messages/common";
import type { PublishedMonth } from "@/src/views/ownership";

import { SourceNote } from "./ui";

/**
 * The attribution DATA-SOURCES S1 requires, with record and access dates: one
 * line under a section, the full citation behind it.
 */
export function S1Citation({
  month,
  lang,
}: {
  month: PublishedMonth;
  lang: Lang;
}) {
  const m = commonMessages[lang].citationS1;
  return (
    <SourceNote summary={m.short(formatDate(month.recordDate, lang))}>
      <p>
        {m.source}
        <cite>{m.title}</cite>
        {m.via}
        {formatDate(month.recordDate, lang)}
        {m.accessed}
        {formatDate(month.accessedOn, lang)},{" "}
        <a href={month.sourceUrl} rel="noreferrer">
          {month.sourceUrl}
        </a>
        .
      </p>
    </SourceNote>
  );
}
