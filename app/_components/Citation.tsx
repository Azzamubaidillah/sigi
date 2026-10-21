import { formatDate } from "@/app/_lib/format";
import type { PublishedMonth } from "@/src/views/ownership";

/** The attribution DATA-SOURCES S1 requires, with record and access dates. */
export function S1Citation({ month }: { month: PublishedMonth }) {
  return (
    <p className="citation">
      Source: <i>Data Kepemilikan Saham Perusahaan Terbuka di atas 1%</i>, KSEI
      via PT Bursa Efek Indonesia, record date {formatDate(month.recordDate)},
      accessed {formatDate(month.accessedOn)},{" "}
      <a href={month.sourceUrl} rel="noreferrer">
        {month.sourceUrl}
      </a>
      .
    </p>
  );
}
