import type { Lang } from "@/src/i18n/lang";

/**
 * Number and date formats follow the page's language (PRD F11): Indonesian
 * writes 1.234.567 and 41,10%, and its month names. Every function takes the
 * language last and defaults to English, so a caller that has none is still
 * right. Figures themselves are never changed, only how they are written.
 */
const LOCALES = { en: "en-GB", id: "id-ID" } as const;

const numberFormats = new Map<Lang, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(lang: Lang): Intl.NumberFormat {
  let format = numberFormats.get(lang);
  if (!format) {
    format = new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
      maximumFractionDigits: 0,
    });
    numberFormats.set(lang, format);
  }
  return format;
}

function dateFormat(
  lang: Lang,
  kind: "date" | "month" | "timestamp",
): Intl.DateTimeFormat {
  const key = `${lang}:${kind}`;
  let format = dateFormats.get(key);
  if (!format) {
    const options: Intl.DateTimeFormatOptions =
      kind === "date"
        ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
        : kind === "month"
          ? { month: "long", year: "numeric", timeZone: "UTC" }
          : {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
              timeZone: "Asia/Jakarta",
            };
    format = new Intl.DateTimeFormat(LOCALES[lang], options);
    dateFormats.set(key, format);
  }
  return format;
}

/** Two digits after the separator: 4110 → "41.10" or "41,10". */
function hundredthsText(value: number, lang: Lang): string {
  const separator = lang === "id" ? "," : ".";
  return `${Math.floor(value / 100)}${separator}${String(value % 100).padStart(2, "0")}`;
}

/** Hundredths of a percent, exactly as published: 4110 → "41.10%". */
export function formatPercent(hundredths: number, lang: Lang = "en"): string {
  const sign = hundredths < 0 ? "−" : "";
  return `${sign}${hundredthsText(Math.abs(hundredths), lang)}%`;
}

/** A change in hundredths of a percent, signed: 120 → "+1.20 pp". */
export function formatPercentChange(
  hundredths: number,
  lang: Lang = "en",
): string {
  if (hundredths === 0) return `${hundredthsText(0, lang)} pp`;
  const sign = hundredths > 0 ? "+" : "−";
  return `${sign}${hundredthsText(Math.abs(hundredths), lang)} pp`;
}

export function formatShares(value: number, lang: Lang = "en"): string {
  return numberFormat(lang).format(value);
}

export function formatSharesChange(value: number, lang: Lang = "en"): string {
  return value > 0
    ? `+${numberFormat(lang).format(value)}`
    : value < 0
      ? `−${numberFormat(lang).format(-value)}`
      : "0";
}

export function formatHhi(value: number, lang: Lang = "en"): string {
  return numberFormat(lang).format(value);
}

/** "2026-02-27" → "27 Feb 2026" (Indonesian: "27 Feb 2026", "25 Okt 2026"). */
export function formatDate(isoDate: string, lang: Lang = "en"): string {
  return dateFormat(lang, "date").format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2026-10" → "October 2026" (Indonesian: "Oktober 2026"). */
export function formatMonth(isoMonth: string, lang: Lang = "en"): string {
  return dateFormat(lang, "month").format(new Date(`${isoMonth}-01T00:00:00Z`));
}

/** Epoch ms, in Jakarta time: "1 Oct 2026, 14:03 WIB". */
export function formatTimestamp(epochMs: number, lang: Lang = "en"): string {
  return `${dateFormat(lang, "timestamp").format(new Date(epochMs))} WIB`;
}
