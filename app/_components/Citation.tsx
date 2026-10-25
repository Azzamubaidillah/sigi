import { formatDate } from "@/app/_lib/format";
import type { Lang } from "@/src/i18n/lang";
import { commonMessages } from "@/src/i18n/messages/common";
import type { PublishedMonth } from "@/src/views/ownership";

/** The attribution DATA-SOURCES S1 requires, with record and access dates. */
export function S1Citation({
  month,
  lang,
}: {
  month: PublishedMonth;
  lang: Lang;
}) {
  const m = commonMessages[lang].citationS1;
  return (
    <p className="citation">
      {m.source}
      <i>{m.title}</i>
      {m.via}
      {formatDate(month.recordDate, lang)}
      {m.accessed}
      {formatDate(month.accessedOn, lang)},{" "}
      <a href={month.sourceUrl} rel="noreferrer">
        {month.sourceUrl}
      </a>
      .
    </p>
  );
}
