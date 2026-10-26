import { localise } from "@/src/i18n/define";
import type { Lang } from "@/src/i18n/lang";
import { TRANCHES, type Tranche } from "@/src/investability/rule";

import { formatDate } from "./format";

const LOCAL_FOREIGN = {
  en: { L: "Local", F: "Foreign", none: "Unclassified" },
  id: { L: "Lokal", F: "Asing", none: "Tidak terklasifikasi" },
} as const;

/** "L" or "F" as published; February 2026's file wrote foreign as "A", normalised on import. */
export function localForeignLabel(value: string | null, lang: Lang): string {
  const words = LOCAL_FOREIGN[lang];
  return value === "L" ? words.L : value === "F" ? words.F : words.none;
}

/** A required share such as 12.5, written for the language. */
function requiredPercent(hundredths: number, lang: Lang): string {
  const text = String(hundredths / 100);
  return lang === "id" ? text.replace(".", ",") : text;
}

/** "12.5% by 31 Mar 2027, 15% by 31 Mar 2028" for one tranche. */
export function trancheDeadlines(tranche: Tranche, lang: Lang): string {
  const by = lang === "id" ? "paling lambat" : "by";
  return TRANCHES[tranche].deadlines
    .map(
      (deadline) =>
        `${requiredPercent(deadline.requiredHundredths, lang)}% ${by} ${formatDate(deadline.date, lang)}`,
    )
    .join(", ");
}

/** "If Rp5T or more: 12.5% by 31 Mar 2027, 15% by 31 Mar 2028" per tranche. */
export function possibleDeadlines(
  tranches: readonly Tranche[],
  lang: Lang,
): string[] {
  return tranches.map(
    (tranche) =>
      `${localise(TRANCHES[tranche].short, lang)}: ${trancheDeadlines(tranche, lang)}`,
  );
}
